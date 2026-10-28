import type { CompanionVariableDefinition } from '@companion-module/base'

import type { ModuleInstance } from './main.js'
import { MidiStreamDecoder } from './MidiStreamDecoder.js'
import { getChannelInfoFromMidi } from './utils/getChannelInfoFromMidi.js'
import { faderMidiValueToDb } from './utils/index.js'

/**
 * Supported value types that can be received from the dLive console
 */
export type DLiveValueType = number | boolean | string

/**
 * Channel parameters that can be subscribed to on the dLive console
 */
export type DLiveParameter = 'mute' | 'fader' | 'main_assignment'

/**
 * Represents a parameter path for subscribing to dLive values
 * Note: channelNo is 0-based internally (0 = channel 1 on console)
 */
export interface DLiveParameterPath {
	channelType: ChannelType
	channelNo: number
	parameter: DLiveParameter
}

/**
 * Generates the key used to index values and subscriptions for a parameter path
 * Format: "channelType:channelNo:parameter"
 * Examples:
 *   - "input:0:mute" (input channel 1 mute status)
 *   - "input:0:fader" (input channel 1 fader level)
 *   - "main:0:fader" (main mix 1 fader level)
 * @param path Parameter path
 * @returns Key for the parameter path
 */
export const pathKey = (path: DLiveParameterPath): string => `${path.channelType}:${path.channelNo}:${path.parameter}`

/**
 * Feedback entry mapping feedback ID to parameter path
 */
interface FeedbackEntry {
	path: DLiveParameterPath
}

/**
 * Subscription entry tracking usage count for a parameter
 */
interface SubscriptionEntry {
	path: DLiveParameterPath
	usages: number
}

/**
 * Parsed MIDI message from dLive console
 */
export interface ParsedMidiMessage {
	type: 'note' | 'control_change' | 'program_change' | 'sysex' | 'unknown'
	channelType?: ChannelType
	channelNo?: number
	parameter?: DLiveParameter | 'name' | 'scene' | 'unknown'
	value?: DLiveValueType
	raw: Buffer
}

/**
 * FeedbackHandler manages subscriptions to dLive console parameters
 * and notifies Companion about value changes received via MIDI.
 *
 * This class:
 * - Maintains a local cache of subscribed parameter values
 * - Tracks which feedbacks are subscribed to which parameters
 * - Parses incoming MIDI messages from the console
 * - Updates Companion feedbacks and variables when values change
 */
export class FeedbackHandler {
	private readonly module: ModuleInstance
	private readonly feedbackMap: Record<string, FeedbackEntry> = {}

	/**
	 * Holds a local cache of all subscribed values mapped to their path key (see pathKey)
	 */
	private readonly valueCache: Record<string, DLiveValueType> = {}
	private readonly subscriptions: Record<string, SubscriptionEntry> = {}

	/**
	 * Tracks which channels we've requested names for (to avoid duplicate requests)
	 * Format: "channelType:channelNo" -> true
	 */
	private readonly channelNameSubscriptions: Set<string> = new Set()

	/**
	 * Pending waiters for values requested from the console, mapped to their path key (see waitForValue)
	 */
	private readonly valueWaiters: Map<string, Array<(value: DLiveValueType | null) => void>> = new Map()

	/**
	 * Buffer for accumulating MIDI messages that may be split across TCP packets
	 * or use MIDI running status
	 */
	private readonly decoder = new MidiStreamDecoder()

	/**
	 * Listens for value changes on dLive console and notifies
	 * Companion about those changes
	 */
	constructor(module: ModuleInstance) {
		this.module = module
	}

	/**
	 * Maps a feedback ID to a parameter path and subscribes to that parameter
	 * If the feedback was previously mapped to a different path, unsubscribes from the old path first
	 * @param id Feedback ID
	 * @param path Parameter path to subscribe to
	 */
	mapFeedback(id: string, path: DLiveParameterPath): void {
		const key = pathKey(path)
		const existingFeedback = this.feedbackMap[id]

		// If feedback already exists with a different path, unsubscribe from old path first
		if (existingFeedback && pathKey(existingFeedback.path) !== key) {
			this.module.log('debug', `Feedback ${id} changing from ${pathKey(existingFeedback.path)} to ${key}`)
			this.removeFeedback(id, existingFeedback.path)
		} else if (this.feedbackMap[id]) {
			// Already subscribed to the same path
			this.module.log('debug', `Feedback ${id} already subscribed to ${key}`)
			return
		}

		this.feedbackMap[id] = { path }

		const subscription = this.subscriptions[key]
		if (subscription && subscription.usages > 0) {
			subscription.usages++
			return
		}

		// Not yet subscribed - register the subscription, then request the value from the console.
		// The subscription must be registered before subscribeToParameter so that the variable
		// definitions it creates include this parameter.
		this.subscriptions[key] = { path, usages: 1 }
		this.subscribeToParameter(path)
	}

	/**
	 * Removes a feedback mapping and unsubscribes if no longer needed
	 * @param id Feedback ID
	 * @param path Parameter path (optional - if not provided, will look up from feedbackMap)
	 */
	removeFeedback(id: string, path?: DLiveParameterPath): void {
		// If path not provided, look it up from the feedback map
		const actualPath = path ?? this.feedbackMap[id]?.path

		if (!actualPath) {
			this.module.log('warn', `No path found for feedback ${id}`)
			return
		}

		const key = pathKey(actualPath)
		delete this.feedbackMap[id]
		const subscription = this.subscriptions[key]
		if (!subscription) {
			this.module.log('warn', `No subscription found for ${key} but expected one`)
			return
		}

		subscription.usages--
		if (subscription.usages === 0) {
			delete this.subscriptions[key]
			this.unsubscribeFromParameter(actualPath)
			this.updateVariables()
		}
	}

	/**
	 * Ensures a parameter is subscribed (for use by actions that need current values)
	 * This creates an internal subscription if one doesn't exist
	 * @param path Parameter path to ensure subscription for
	 */
	ensureSubscription(path: DLiveParameterPath): void {
		const key = pathKey(path)
		const subscription = this.subscriptions[key]
		if (subscription && subscription.usages > 0) {
			// Already subscribed
			return
		}

		// Create internal subscription (using special ID prefix to distinguish from user feedbacks)
		const internalId = `__action_${key}`
		this.mapFeedback(internalId, path)
	}

	/**
	 * Gets a cached value for a parameter path
	 * @param path Parameter path
	 * @returns The cached value or null if not available
	 */
	getValue(path: DLiveParameterPath): DLiveValueType | null {
		const value = this.valueCache[pathKey(path)]
		if (typeof value === 'undefined') return null
		return value
	}

	/**
	 * Waits for a value to become available for a parameter path.
	 * Resolves immediately if a value is already cached, otherwise resolves when the next
	 * value for the path arrives from the console, or with null on timeout.
	 * @param path Parameter path
	 * @param timeoutMs Maximum time to wait for a value
	 * @returns The value, or null if none arrived within the timeout
	 */
	async waitForValue(path: DLiveParameterPath, timeoutMs = 1000): Promise<DLiveValueType | null> {
		const existing = this.getValue(path)
		if (existing !== null) {
			return existing
		}

		const key = pathKey(path)
		return new Promise((resolve) => {
			const waiter = (value: DLiveValueType | null): void => {
				clearTimeout(timeout)
				resolve(value)
			}
			const timeout = setTimeout(() => {
				this.removeWaiter(key, waiter)
				resolve(this.getValue(path))
			}, timeoutMs)
			// Don't let a pending wait hold the process open
			timeout.unref?.()
			const waiters = this.valueWaiters.get(key) ?? []
			waiters.push(waiter)
			this.valueWaiters.set(key, waiters)
		})
	}

	/**
	 * Removes a single waiter for a parameter path
	 * @param key Parameter path key (see pathKey)
	 */
	private removeWaiter(key: string, waiter: (value: DLiveValueType | null) => void): void {
		const waiters = this.valueWaiters.get(key)
		if (!waiters) {
			return
		}
		const remaining = waiters.filter((w) => w !== waiter)
		if (remaining.length > 0) {
			this.valueWaiters.set(key, remaining)
		} else {
			this.valueWaiters.delete(key)
		}
	}

	/**
	 * Resolves and removes all waiters for a parameter path
	 * @param key Parameter path key (see pathKey)
	 */
	private resolveWaiters(key: string, value: DLiveValueType | null): void {
		const waiters = this.valueWaiters.get(key)
		if (!waiters) {
			return
		}
		this.valueWaiters.delete(key)
		for (const waiter of waiters) {
			waiter(value)
		}
	}

	/**
	 * Updates a cached value and notifies feedbacks/variables
	 * This should be called when the module sends a command to update the console state
	 * @param path Parameter path
	 * @param value New value
	 */
	updateValue(path: DLiveParameterPath, value: DLiveValueType): void {
		// Only update if we're subscribed to this parameter
		if (!this.subscriptions[pathKey(path)]) {
			return
		}

		this.notifyFeedbacks(path, value)
	}

	/**
	 * Processes incoming MIDI data from the dLive console
	 * Handles MIDI running status and message buffering
	 * @param data MIDI data buffer
	 */
	processMidiData(data: Buffer): void {
		this.module.log('debug', `Processing MIDI feedback: ${data.toString('hex')}`)

		for (const message of this.decoder.push(data)) {
			// Parse and process the complete message
			const parsed = this.parseMidiMessage(message)

			if (parsed.type === 'unknown') {
				this.module.log('debug', `Unknown MIDI message type: ${message.toString('hex')}`)
				continue
			}

			// Handle channel name specially. An empty name is a valid reply (unnamed channel) -
			// updateChannelName falls back to the default placeholder name for it
			if (
				parsed.parameter === 'name' &&
				parsed.channelType &&
				parsed.channelNo !== undefined &&
				parsed.value !== undefined
			) {
				this.updateChannelName(parsed.channelType, parsed.channelNo, parsed.value as string)
				continue
			}

			// Construct parameter path from parsed message
			const path = this.constructParameterPath(parsed)
			if (!path) {
				this.module.log('debug', `Could not construct parameter path from: ${JSON.stringify(parsed)}`)
				continue
			}

			// Only process if we're subscribed to this parameter
			if (!this.subscriptions[pathKey(path)]) {
				this.module.log('debug', `Received value for unsubscribed parameter: ${pathKey(path)}`)
				continue
			}

			if (parsed.value !== undefined) {
				this.notifyFeedbacks(path, parsed.value)
			}
		}
	}

	/**
	 * Notifies feedbacks and updates variables when a value changes
	 * @param path Parameter path
	 * @param newValue New value
	 */
	private notifyFeedbacks(path: DLiveParameterPath, newValue: DLiveValueType): void {
		const key = pathKey(path)

		// Check if value actually changed
		const oldValue = this.valueCache[key]
		if (oldValue === newValue) {
			return
		}

		this.valueCache[key] = newValue
		this.resolveWaiters(key, newValue)

		const updates: string[] = []

		for (const id in this.feedbackMap) {
			const entry = this.feedbackMap[id]
			if (pathKey(entry.path) !== key) {
				continue
			}
			updates.push(id)
		}

		// Update feedback states
		if (updates.length > 0) {
			this.module.checkFeedbacksById(...updates)
		}

		// Update companion variable values
		// Convert fader values to dB for display
		const variableValue = this.formatVariableValue(path, newValue)
		const variableId = this.toVariableId(path)
		this.module.setVariableValues({ [variableId]: variableValue })
	}

	/**
	 * Formats a value for display in Companion variables
	 * Converts fader MIDI values to dB levels
	 * @param path Parameter path
	 * @param value Raw value
	 * @returns Formatted value for variable display
	 */
	private formatVariableValue(path: DLiveParameterPath, value: DLiveValueType): string | number | boolean {
		// Check if this is a fader parameter
		if (path.parameter === 'fader') {
			if (typeof value === 'number') {
				return this.midiValueToDb(value)
			}
		}

		// For other parameters, return as-is
		return value
	}

	/**
	 * Converts a MIDI fader value (0-127) to dB level string
	 * Based on dLive MIDI protocol: [(Gain+54)/64]*7F
	 * @param midiValue MIDI value (0-127)
	 * @returns dB level as string (e.g., "+10.0", "-15.5", "-inf")
	 */
	private midiValueToDb(midiValue: number): string {
		const gain = faderMidiValueToDb(midiValue)
		if (gain === -Infinity) {
			return '-inf'
		}

		// Round to 1 decimal place
		const gainRounded = Math.round(gain * 10) / 10

		// Format with + sign for positive values
		if (gainRounded > 0) {
			return `+${gainRounded.toFixed(1)}`
		} else {
			return gainRounded.toFixed(1)
		}
	}

	/**
	 * Parses a MIDI message buffer into a structured format
	 * @param data MIDI data buffer
	 * @returns Parsed MIDI message
	 */
	private parseMidiMessage(data: Buffer): ParsedMidiMessage {
		if (data.length === 0) {
			return { type: 'unknown', raw: data }
		}

		const statusByte = data[0]
		const messageType = statusByte & 0xf0
		const midiChannel = statusByte & 0x0f
		if (
			statusByte < 0xf0 &&
			(midiChannel < this.module.baseMidiChannel || midiChannel > this.module.baseMidiChannel + 4)
		) {
			return { type: 'unknown', raw: data }
		}

		// Only Note On establishes mute status. Explicit Note Off is ignored.
		// dLive sends: 9N CH VV 9N CH 00 (Note On with velocity, followed by Note Off)
		if (messageType === 0x90) {
			if (data.length < 3) {
				return { type: 'unknown', raw: data }
			}

			const note = data[1]
			const velocity = data[2]

			// Ignore Note Off messages (velocity 0x00) - we only care about the Note On
			if (velocity === 0x00) {
				return { type: 'unknown', raw: data }
			}

			const channelInfo = this.getChannelInfoFromMidi(midiChannel, note)
			if (!channelInfo) return { type: 'unknown', raw: data }

			return {
				type: 'note',
				channelType: channelInfo.channelType,
				channelNo: channelInfo.channelNo,
				parameter: 'mute',
				value: velocity >= 0x40, // Muted if velocity >= 0x40
				raw: data,
			}
		}

		// Control Change (0xB0) - Used for fader levels, assignments, etc.
		if (messageType === 0xb0) {
			if (data.length < 3) {
				return { type: 'unknown', raw: data }
			}

			const controlNumber = data[1]
			const controlValue = data[2]

			// NRPN messages (0x63, 0x62, 0x06) for fader levels
			if (controlNumber === 0x63 && data.length >= 7) {
				// data[1] = 0x63 (NRPN MSB)
				const channel = data[2]
				// data[3] = 0x62 (NRPN LSB)
				const parameter = data[4]
				// data[5] = 0x06 (Data Entry)
				const value = data[6]

				const channelInfo = this.getChannelInfoFromMidi(midiChannel, channel)
				if (!channelInfo) return { type: 'unknown', raw: data }

				let paramName: ParsedMidiMessage['parameter'] = 'unknown'
				if (parameter === 0x17) {
					paramName = 'fader'
				} else if (parameter === 0x18) {
					paramName = 'main_assignment'
				}

				return {
					type: 'control_change',
					channelType: channelInfo.channelType,
					channelNo: channelInfo.channelNo,
					parameter: paramName,
					value: value,
					raw: data,
				}
			}

			return {
				type: 'control_change',
				value: controlValue,
				raw: data,
			}
		}

		// Program Change (0xC0) - Scene recalls
		if (messageType === 0xc0) {
			if (data.length < 2) {
				return { type: 'unknown', raw: data }
			}

			return {
				type: 'program_change',
				parameter: 'scene',
				value: data[1],
				raw: data,
			}
		}

		// SysEx messages (0xF0)
		if (statusByte === 0xf0) {
			// Check if it's a channel name response: SysEx Header, 0N, 02, CH, Name, F7
			// SysEx Header is 8 bytes: [0xF0, 0x00, 0x00, 0x1A, 0x50, 0x10, 0x01, 0x00]
			if (
				data.length >= 12 &&
				data[0] === 0xf0 &&
				data[1] === 0x00 &&
				data[2] === 0x00 &&
				data[3] === 0x1a &&
				data[4] === 0x50 &&
				data[5] === 0x10 &&
				data[6] === 0x01 &&
				data[7] === 0x00 &&
				data[9] === 0x02 &&
				data[data.length - 1] === 0xf7
			) {
				const midiChannelOffset = data[8]
				const channelNumber = data[10]

				// Extract channel name (ASCII string between CH and F7), keeping printable ASCII only
				const nameBytes = data.subarray(11, data.length - 1)
				const channelName = Array.from(nameBytes)
					.filter((byte) => byte >= 0x20 && byte <= 0x7e)
					.map((byte) => String.fromCharCode(byte))
					.join('')
					.trim()

				const channelInfo = this.getChannelInfoFromMidi(midiChannelOffset, channelNumber)
				if (!channelInfo) return { type: 'unknown', raw: data }

				return {
					type: 'sysex',
					channelType: channelInfo.channelType,
					channelNo: channelInfo.channelNo,
					parameter: 'name',
					value: channelName,
					raw: data,
				}
			}

			// Other SysEx messages not yet implemented
			return {
				type: 'sysex',
				raw: data,
			}
		}

		return { type: 'unknown', raw: data }
	}

	/**
	 * Determines channel type and number from MIDI channel and note/channel number
	 * @param midiChannel MIDI channel offset
	 * @param noteOrChannel MIDI note or channel number
	 * @returns Channel type and channel number
	 */
	private getChannelInfoFromMidi(
		midiChannel: number,
		noteOrChannel: number,
	): { channelType: ChannelType; channelNo: number } | undefined {
		return getChannelInfoFromMidi(this.module.baseMidiChannel, midiChannel, noteOrChannel)
	}

	/**
	 * Constructs a parameter path from a parsed MIDI message
	 * @param parsed Parsed MIDI message
	 * @returns Parameter path or null if cannot be constructed
	 */
	private constructParameterPath(parsed: ParsedMidiMessage): DLiveParameterPath | null {
		const { channelType, channelNo, parameter } = parsed
		if (
			!channelType ||
			channelNo === undefined ||
			(parameter !== 'mute' && parameter !== 'fader' && parameter !== 'main_assignment')
		) {
			return null
		}

		return { channelType, channelNo, parameter }
	}

	/**
	 * Subscribes to a parameter by sending a MIDI "get" request to the console.
	 * Defines the Companion variables for the parameter (and channel name) BEFORE setting
	 * any values - values set for undefined variables are discarded by Companion.
	 * @param path Parameter path
	 */
	private subscribeToParameter(path: DLiveParameterPath): void {
		const { channelType, channelNo, parameter } = path

		// Track the channel name subscription so the name variable gets defined too
		const channelKey = `${channelType}:${channelNo}`
		const isNewChannelName = !this.channelNameSubscriptions.has(channelKey)
		if (isNewChannelName) {
			this.channelNameSubscriptions.add(channelKey)
		}

		// Define the variables for this parameter and channel name
		this.updateVariables()

		if (isNewChannelName) {
			// Set a default placeholder name until the console responds, then request the real name
			this.updateChannelName(channelType, channelNo, this.getDefaultChannelName(channelType, channelNo))
			this.module.requestChannelName(channelType, channelNo)
		}

		// Request the current value from the console
		this.requestParameterValue(channelType, channelNo, parameter)

		this.module.log('debug', `Subscribed to parameter: ${pathKey(path)}`)
	}

	/**
	 * Requests a parameter value from the console
	 * @param channelType Channel type
	 * @param channelNo Channel number (0-based)
	 * @param parameter Parameter name (mute, fader, main_assignment)
	 */
	private requestParameterValue(channelType: ChannelType, channelNo: number, parameter: DLiveParameter): void {
		switch (parameter) {
			case 'mute':
				this.module.requestMuteStatus(channelType, channelNo)
				break
			case 'fader':
				this.module.requestFaderLevel(channelType, channelNo)
				break
			case 'main_assignment':
				this.module.requestMainAssignment(channelType, channelNo)
				break
			default:
				this.module.log('debug', `No get command available for parameter: ${parameter}`)
		}
	}

	/**
	 * Requests current values for all subscribed parameters from the console
	 * Call this when the connection is established to sync state
	 */
	requestAllSubscribedValues(): void {
		this.module.log('info', 'Requesting current values for all subscribed parameters')

		for (const { path } of Object.values(this.subscriptions)) {
			const { channelType, channelNo, parameter } = path

			// Request the parameter value
			this.requestParameterValue(channelType, channelNo, parameter)

			// Also request channel name
			this.module.requestChannelName(channelType, channelNo)
		}
	}

	/**
	 * Unsubscribes from a parameter
	 * @param path Parameter path
	 */
	private unsubscribeFromParameter(path: DLiveParameterPath): void {
		// Remove from cache
		delete this.valueCache[pathKey(path)]
		// Names are shared by all parameter subscriptions for a channel. Once the last
		// one goes away, Companion removes the name variable and its value. Forget
		// the name subscription too so returning to this channel initializes it again.
		const stillInUse = Object.values(this.subscriptions).some(
			({ path: other }) => other.channelType === path.channelType && other.channelNo === path.channelNo,
		)
		if (!stillInUse) this.channelNameSubscriptions.delete(`${path.channelType}:${path.channelNo}`)
		this.module.log('debug', `Unsubscribed from parameter: ${pathKey(path)}`)
	}

	/**
	 * Gets a default channel name for display before the console responds
	 * @param channelType Channel type
	 * @param channelNo Channel number (0-based)
	 * @returns Default channel name
	 */
	private getDefaultChannelName(channelType: ChannelType, channelNo: number): string {
		const channelNum = channelNo + 1 // Convert to 1-based for display
		switch (channelType) {
			case 'input':
				return `IP ${channelNum}`
			case 'mono_group':
				return `Grp ${channelNum}`
			case 'stereo_group':
				return `StGrp ${channelNum}`
			case 'mono_aux':
				return `Aux ${channelNum}`
			case 'stereo_aux':
				return `StAux ${channelNum}`
			case 'mono_matrix':
				return `Mtx ${channelNum}`
			case 'stereo_matrix':
				return `StMtx ${channelNum}`
			case 'mono_fx_send':
				return `FX ${channelNum}`
			case 'stereo_fx_send':
				return `StFX ${channelNum}`
			case 'fx_return':
				return `FXRtn ${channelNum}`
			case 'main':
				return `Main ${channelNum}`
			case 'dca':
				return `DCA ${channelNum}`
			case 'mute_group':
				return `MG ${channelNum}`
			case 'stereo_ufx_send':
				return `UFXSnd ${channelNum}`
			case 'stereo_ufx_return':
				return `UFXRtn ${channelNum}`
			default:
				return `Ch ${channelNum}`
		}
	}

	/**
	 * Updates a channel name variable value
	 * @param channelType Channel type
	 * @param channelNo Channel number (0-based)
	 * @param name Channel name
	 */
	private updateChannelName(channelType: ChannelType, channelNo: number, name: string): void {
		// Use 1-based channel numbering for variable name
		const variableId = `dlive_${channelType}_${channelNo + 1}_name`

		// If the name is empty, use the default name
		const displayName = name.trim() || this.getDefaultChannelName(channelType, channelNo)

		this.module.setVariableValues({
			[variableId]: displayName,
		})

		this.module.log('debug', `Updated channel name for ${channelType}:${channelNo} to "${displayName}"`)
	}

	/**
	 * Updates channel name variables based on current subscriptions
	 */
	private updateChannelNameVariables(): void {
		// First, build parameter variables and track which channels are in use
		const parameterVariables: CompanionVariableDefinition[] = []
		const channelsInUse = new Set<string>()

		for (const [key, { path }] of Object.entries(this.subscriptions)) {
			parameterVariables.push({
				variableId: this.toVariableId(path),
				name: `dLive: ${key}`,
			})

			// Track which channel this parameter belongs to
			channelsInUse.add(`${path.channelType}:${path.channelNo}`)
		}

		// Only include channel names for channels that have active parameter subscriptions
		const channelNameVariables: CompanionVariableDefinition[] = []
		for (const channelKey of this.channelNameSubscriptions) {
			if (channelsInUse.has(channelKey)) {
				const parts = channelKey.split(':')
				if (parts.length === 2) {
					const channelType = parts[0]
					const channelNo = parseInt(parts[1], 10)
					// Use 1-based channel numbering for variable name
					const variableId = `dlive_${channelType}_${channelNo + 1}_name`
					channelNameVariables.push({
						variableId,
						name: `dLive: ${channelType}:${channelNo}:name`,
					})
				}
			}
		}

		this.module.setVariableDefinitions([...parameterVariables, ...channelNameVariables])
	}

	/**
	 * Updates the available variables based on the current subscriptions
	 */
	private updateVariables(): void {
		// Use the combined update that includes both parameter and channel name variables
		this.updateChannelNameVariables()
	}

	/**
	 * Converts a parameter path to a variable ID
	 * Uses 1-based channel numbering to match dLive console and user expectations
	 * @param path Parameter path (e.g., input channel 1 mute)
	 * @returns Variable ID (e.g., "dlive_input_1_mute")
	 */
	private toVariableId(path: DLiveParameterPath): string {
		// Convert 0-based internal channel number to 1-based for variable name
		return `dlive_${path.channelType}_${path.channelNo + 1}_${path.parameter}`
	}

	resetConnection(): void {
		this.decoder.reset()
		for (const key of Object.keys(this.valueCache)) delete this.valueCache[key]
		for (const key of Array.from(this.valueWaiters.keys())) this.resolveWaiters(key, null)
		this.module.setVariableValues(
			Object.fromEntries(Object.values(this.subscriptions).map(({ path }) => [this.toVariableId(path), ''])),
		)
		this.module.checkFeedbacksById(...Object.keys(this.feedbackMap))
	}

	/**
	 * Clears all subscriptions and cached values
	 */
	clear(): void {
		for (const key in this.subscriptions) {
			delete this.subscriptions[key]
		}
		for (const key in this.valueCache) {
			delete this.valueCache[key]
		}
		for (const id in this.feedbackMap) {
			delete this.feedbackMap[id]
		}
		// Flush any pending value waiters so callers are not left hanging
		for (const key of Array.from(this.valueWaiters.keys())) {
			this.resolveWaiters(key, null)
		}
		// Clear channel name subscriptions
		this.channelNameSubscriptions.clear()
		// Clear MIDI buffers
		this.decoder.reset()
		this.updateVariables()
	}
}
