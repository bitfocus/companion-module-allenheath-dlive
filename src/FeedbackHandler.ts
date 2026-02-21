import type { CompanionVariableDefinition } from '@companion-module/base'
import type { ModuleInstance } from './main.js'

/**
 * Supported value types that can be received from the dLive console
 */
export type DLiveValueType = number | boolean | string

/**
 * Represents a parameter path for subscribing to dLive values
 * Format: "channelType:channelNo:parameter"
 * Note: channelNo is 0-based internally (0 = channel 1 on console)
 * Examples:
 *   - "input:0:mute" (input channel 1 mute status)
 *   - "input:0:fader" (input channel 1 fader level)
 *   - "main:0:fader" (main mix 1 fader level)
 */
export type DLiveParameterPath = string

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
	usages: number
}

/**
 * Parsed MIDI message from dLive console
 */
export interface ParsedMidiMessage {
	type: 'note' | 'control_change' | 'program_change' | 'sysex' | 'unknown'
	channelType?: ChannelType
	channelNo?: number
	parameter?: string
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
	 * Holds a local cache of all subscribed values mapped to their path
	 */
	private readonly valueCache: Record<DLiveParameterPath, DLiveValueType> = {}
	private readonly subscriptions: Record<DLiveParameterPath, SubscriptionEntry> = {}

	/**
	 * Tracks which channels we've requested names for (to avoid duplicate requests)
	 * Format: "channelType:channelNo" -> true
	 */
	private readonly channelNameSubscriptions: Set<string> = new Set()

	/**
	 * Buffer for accumulating MIDI messages that may be split across TCP packets
	 * or use MIDI running status
	 */
	private midiBuffer: Buffer = Buffer.alloc(0)

	/**
	 * Last MIDI status byte for running status support
	 */
	private lastStatusByte: number = 0

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
		const existingFeedback = this.feedbackMap[id]

		// If feedback already exists with a different path, unsubscribe from old path first
		if (existingFeedback && existingFeedback.path !== path) {
			this.module.log('debug', `Feedback ${id} changing from ${existingFeedback.path} to ${path}`)
			this.removeFeedback(id, existingFeedback.path)
		} else if (this.feedbackMap[id]) {
			// Already subscribed to the same path
			this.module.log('debug', `Feedback ${id} already subscribed to ${path}`)
			return
		}

		this.feedbackMap[id] = { path }

		const subscription = this.subscriptions[path]
		if (subscription && subscription.usages > 0) {
			subscription.usages++
			return
		}

		// Not yet subscribed - request value from console
		this.subscribeToParameter(path)
		this.subscriptions[path] = { usages: 1 }
		this.updateVariables()
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

		delete this.feedbackMap[id]
		const subscription = this.subscriptions[actualPath]
		if (!subscription) {
			this.module.log('warn', `No subscription found for ${actualPath} but expected one`)
			return
		}

		subscription.usages--
		if (subscription.usages === 0) {
			delete this.subscriptions[actualPath]
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
		const subscription = this.subscriptions[path]
		if (subscription && subscription.usages > 0) {
			// Already subscribed
			return
		}

		// Create internal subscription (using special ID prefix to distinguish from user feedbacks)
		const internalId = `__action_${path}`
		this.mapFeedback(internalId, path)
	}

	/**
	 * Gets a cached value for a parameter path
	 * @param path Parameter path
	 * @returns The cached value or null if not available
	 */
	getValue(path: DLiveParameterPath): DLiveValueType | null {
		const value = this.valueCache[path]
		if (typeof value === 'undefined') return null
		return value
	}

	/**
	 * Updates a cached value and notifies feedbacks/variables
	 * This should be called when the module sends a command to update the console state
	 * @param path Parameter path
	 * @param value New value
	 */
	updateValue(path: DLiveParameterPath, value: DLiveValueType): void {
		// Only update if we're subscribed to this parameter
		if (!this.subscriptions[path]) {
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

		// Append new data to buffer
		this.midiBuffer = Buffer.concat([this.midiBuffer, data])

		// Process complete messages from buffer
		while (this.midiBuffer.length > 0) {
			const result = this.extractMidiMessage(this.midiBuffer)
			if (!result) {
				// Not enough data for a complete message, wait for more
				break
			}

			const { message, bytesConsumed } = result

			// Remove consumed bytes from buffer
			this.midiBuffer = this.midiBuffer.subarray(bytesConsumed)

			// Parse and process the complete message
			const parsed = this.parseMidiMessage(message)

			if (parsed.type === 'unknown') {
				this.module.log('debug', `Unknown MIDI message type: ${message.toString('hex')}`)
				continue
			}

			// Handle channel name specially
			if (parsed.parameter === 'name' && parsed.channelType && parsed.channelNo !== undefined && parsed.value) {
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
			if (!this.subscriptions[path]) {
				this.module.log('debug', `Received value for unsubscribed parameter: ${path}`)
				continue
			}

			if (parsed.value !== undefined) {
				this.notifyFeedbacks(path, parsed.value)
			}
		}
	}

	/**
	 * Extracts one complete MIDI message from the buffer, handling running status
	 * @param buffer Buffer containing MIDI data
	 * @returns Object with complete message and bytes consumed, or null if incomplete
	 */
	private extractMidiMessage(buffer: Buffer): { message: Buffer; bytesConsumed: number } | null {
		if (buffer.length === 0) {
			return null
		}

		const firstByte = buffer[0]

		// Check if first byte is a status byte (bit 7 = 1)
		const isStatusByte = (firstByte & 0x80) !== 0

		let statusByte: number
		let dataStart: number

		if (isStatusByte) {
			// New status byte
			statusByte = firstByte
			this.lastStatusByte = statusByte
			dataStart = 1
		} else {
			// Running status - use last status byte
			if (this.lastStatusByte === 0) {
				// No previous status, skip this byte
				this.module.log('debug', `Skipping data byte with no previous status: ${firstByte.toString(16)}`)
				return { message: Buffer.alloc(0), bytesConsumed: 1 }
			}
			statusByte = this.lastStatusByte
			dataStart = 0
		}

		const messageType = statusByte & 0xf0

		// Determine expected message length based on message type
		let expectedLength: number

		if (messageType === 0xf0) {
			// SysEx - find F7 terminator
			const endIndex = buffer.indexOf(0xf7, dataStart)
			if (endIndex === -1) {
				// Incomplete SysEx, wait for more data
				return null
			}
			expectedLength = endIndex + 1 - dataStart
		} else if (messageType === 0xc0 || messageType === 0xd0) {
			// Program Change or Channel Pressure - 1 data byte
			expectedLength = 1
		} else if (messageType === 0x80 || messageType === 0x90 || messageType === 0xa0 || messageType === 0xb0 || messageType === 0xe0) {
			// Note Off, Note On, Aftertouch, Control Change, Pitch Bend - 2 data bytes
			expectedLength = 2

			// Special handling for NRPN messages (Control Change with specific pattern)
			if (messageType === 0xb0 && buffer.length >= dataStart + 1) {
				const controlNum = buffer[dataStart]
				if (controlNum === 0x63) {
					// NRPN message: B0 63 CH 62 nn 06 vv (7 bytes total including running status)
					// We need at least 6 data bytes for complete NRPN
					expectedLength = 6
				}
			}

			// Special handling for Note On messages followed by Note Off (mute control)
			// dLive sends: 9N CH VV [9N] CH 00 (Note On + Note Off pair)
			// Check if this is a Note On message followed by running status Note Off
			if (messageType === 0x90 && buffer.length >= dataStart + 4) {
				// Check if bytes after this message look like: CH 00 (running status Note Off)
				const nextByte1 = buffer[dataStart + 2]
				const nextByte2 = buffer[dataStart + 3]
				// If next bytes are data bytes (< 0x80) and second is 0x00, it's likely the Note Off pair
				if ((nextByte1 & 0x80) === 0 && nextByte2 === 0x00) {
					// Include the Note Off pair in this message (total 4 data bytes)
					expectedLength = 4
				}
			}
		} else {
			// Unknown message type
			this.module.log('debug', `Unknown message type: ${messageType.toString(16)}`)
			return { message: Buffer.alloc(0), bytesConsumed: 1 }
		}

		// Check if we have enough data
		if (buffer.length < dataStart + expectedLength) {
			// Incomplete message, wait for more data
			return null
		}

		// Extract the complete message
		let message: Buffer
		if (isStatusByte) {
			// Include status byte in message
			message = buffer.subarray(0, dataStart + expectedLength)
		} else {
			// Prepend status byte for running status
			const dataBytes = buffer.subarray(dataStart, dataStart + expectedLength)
			message = Buffer.concat([Buffer.from([statusByte]), dataBytes])
		}

		return {
			message,
			bytesConsumed: dataStart + expectedLength,
		}
	}

	/**
	 * Notifies feedbacks and updates variables when a value changes
	 * @param path Parameter path
	 * @param newValue New value
	 */
	private notifyFeedbacks(path: DLiveParameterPath, newValue: DLiveValueType): void {
		// Check if value actually changed
		const oldValue = this.valueCache[path]
		if (oldValue === newValue) {
			return
		}

		this.valueCache[path] = newValue
		const updates: string[] = []

		for (const id in this.feedbackMap) {
			const entry = this.feedbackMap[id]
			if (entry.path !== path) {
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
		if (path.endsWith(':fader')) {
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
		if (midiValue === 0) {
			return '-inf'
		}

		// Reverse the formula: gain = (midiValue * 64 / 127) - 54
		const gain = (midiValue * 64) / 127 - 54

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

		// Note On/Off (0x90/0x80) - Used for mute status
		// dLive sends: 9N CH VV 9N CH 00 (Note On with velocity, followed by Note Off)
		if (messageType === 0x90 || messageType === 0x80) {
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

				let paramName = 'unknown'
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
			if (data.length >= 12 &&
				data[0] === 0xf0 &&
				data[1] === 0x00 &&
				data[2] === 0x00 &&
				data[3] === 0x1a &&
				data[4] === 0x50 &&
				data[5] === 0x10 &&
				data[6] === 0x01 &&
				data[7] === 0x00 &&
				data[9] === 0x02 &&
				data[data.length - 1] === 0xf7) {

				const midiChannelOffset = data[8]
				const channelNumber = data[10]

				// Extract channel name (ASCII string between CH and F7)
				const nameBytes = data.subarray(11, data.length - 1)
				// Remove ALL control characters (ASCII 0-31) including null bytes, newlines, tabs, etc.
				const channelName = nameBytes
					.toString('ascii')
					.replace(/[\x00-\x1F]/g, '') // Remove all ASCII control characters (0-31)
					.trim()

				const channelInfo = this.getChannelInfoFromMidi(midiChannelOffset, channelNumber)

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
		noteOrChannel: number
	): { channelType: ChannelType; channelNo: number } {
		const baseMidiChannel = this.module.baseMidiChannel
		const offset = midiChannel - baseMidiChannel

		// Map MIDI channel offsets to channel types based on dLive spec
		// Stereo channel types use note ranges within the same MIDI channel offset
		switch (offset) {
			case 0:
				// Inputs 1-128: Note 0x00-0x7F
				return { channelType: 'input', channelNo: noteOrChannel }
			case 1:
				// Mono Groups 1-62: Note 0x00-0x3D
				// Stereo Groups 1-31: Note 0x40-0x5E
				if (noteOrChannel >= 0x40) {
					return { channelType: 'stereo_group', channelNo: noteOrChannel - 0x40 }
				}
				return { channelType: 'mono_group', channelNo: noteOrChannel }
			case 2:
				// Mono Aux 1-62: Note 0x00-0x3D
				// Stereo Aux 1-31: Note 0x40-0x5E
				if (noteOrChannel >= 0x40) {
					return { channelType: 'stereo_aux', channelNo: noteOrChannel - 0x40 }
				}
				return { channelType: 'mono_aux', channelNo: noteOrChannel }
			case 3:
				// Mono Matrix 1-62: Note 0x00-0x3D
				// Stereo Matrix 1-31: Note 0x40-0x5E
				if (noteOrChannel >= 0x40) {
					return { channelType: 'stereo_matrix', channelNo: noteOrChannel - 0x40 }
				}
				return { channelType: 'mono_matrix', channelNo: noteOrChannel }
			case 4:
				// Mono FX Send 1-16: Note 0x00-0x0F
				// Stereo FX Send 1-16: Note 0x10-0x1F
				// FX Return 1-16: Note 0x20-0x2F
				// Mains 1-6: Note 0x30-0x35
				// DCA 1-24: Note 0x36-0x4D
				// Mute Group 1-8: Note 0x4E-0x55
				// Stereo UFX Send 1-8: Note 0x56-0x5D
				// Stereo UFX Return 1-8: Note 0x5E-0x65
				if (noteOrChannel >= 0x5e && noteOrChannel <= 0x65) {
					return { channelType: 'stereo_ufx_return', channelNo: noteOrChannel - 0x5e }
				}
				if (noteOrChannel >= 0x56 && noteOrChannel <= 0x5d) {
					return { channelType: 'stereo_ufx_send', channelNo: noteOrChannel - 0x56 }
				}
				if (noteOrChannel >= 0x4e && noteOrChannel <= 0x55) {
					return { channelType: 'mute_group', channelNo: noteOrChannel - 0x4e }
				}
				if (noteOrChannel >= 0x36 && noteOrChannel <= 0x4d) {
					return { channelType: 'dca', channelNo: noteOrChannel - 0x36 }
				}
				if (noteOrChannel >= 0x30 && noteOrChannel <= 0x35) {
					return { channelType: 'main', channelNo: noteOrChannel - 0x30 }
				}
				if (noteOrChannel >= 0x20 && noteOrChannel <= 0x2f) {
					return { channelType: 'fx_return', channelNo: noteOrChannel - 0x20 }
				}
				if (noteOrChannel >= 0x10 && noteOrChannel <= 0x1f) {
					return { channelType: 'stereo_fx_send', channelNo: noteOrChannel - 0x10 }
				}
				return { channelType: 'mono_fx_send', channelNo: noteOrChannel }
			default:
				// Default to input
				return { channelType: 'input', channelNo: noteOrChannel }
		}
	}

	/**
	 * Constructs a parameter path from a parsed MIDI message
	 * @param parsed Parsed MIDI message
	 * @returns Parameter path or null if cannot be constructed
	 */
	private constructParameterPath(parsed: ParsedMidiMessage): DLiveParameterPath | null {
		if (!parsed.channelType || parsed.channelNo === undefined || !parsed.parameter) {
			return null
		}

		return `${parsed.channelType}:${parsed.channelNo}:${parsed.parameter}`
	}

	/**
	 * Subscribes to a parameter by sending a MIDI "get" request to the console
	 * @param path Parameter path
	 */
	private subscribeToParameter(path: DLiveParameterPath): void {
		// Parse the path
		const parts = path.split(':')
		if (parts.length !== 3) {
			this.module.log('warn', `Invalid parameter path format: ${path}`)
			return
		}

		const channelType = parts[0] as ChannelType
		const channelNoStr = parts[1]
		const channelNo = parseInt(channelNoStr, 10)

		if (isNaN(channelNo)) {
			this.module.log('warn', `Invalid channel number in path: ${path}`)
			return
		}

		// Request channel name if we haven't already
		this.ensureChannelNameSubscription(channelType, channelNo)

		this.module.log('debug', `Subscribed to parameter: ${path}`)
	}

	/**
	 * Unsubscribes from a parameter
	 * @param path Parameter path
	 */
	private unsubscribeFromParameter(path: DLiveParameterPath): void {
		// Remove from cache
		delete this.valueCache[path]
		this.module.log('debug', `Unsubscribed from parameter: ${path}`)
	}

	/**
	 * Ensures a channel name is subscribed and requested from the console
	 * @param channelType Channel type
	 * @param channelNo Channel number (0-based)
	 */
	private ensureChannelNameSubscription(channelType: ChannelType, channelNo: number): void {
		const channelKey = `${channelType}:${channelNo}`

		if (this.channelNameSubscriptions.has(channelKey)) {
			// Already requested this channel name
			return
		}

		// Mark as subscribed
		this.channelNameSubscriptions.add(channelKey)

		// Request channel name from console
		this.module.requestChannelName(channelType, channelNo)

		// Note: Don't call updateChannelNameVariables() here - it will be called
		// when the parameter subscription is created in subscribeToParameter()

		this.module.log('debug', `Requested channel name for ${channelKey}`)
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

		this.module.setVariableValues({
			[variableId]: name
		})

		this.module.log('debug', `Updated channel name for ${channelType}:${channelNo} to "${name}"`)
	}

	/**
	 * Updates channel name variables based on current subscriptions
	 */
	private updateChannelNameVariables(): void {
		// First, build parameter variables and track which channels are in use
		const parameterVariables: CompanionVariableDefinition[] = []
		const channelsInUse = new Set<string>()

		for (const path in this.subscriptions) {
			parameterVariables.push({
				variableId: this.toVariableId(path),
				name: `dLive: ${path}`
			})

			// Track which channel this parameter belongs to
			const parts = path.split(':')
			if (parts.length === 3) {
				const channelKey = `${parts[0]}:${parts[1]}`
				channelsInUse.add(channelKey)
			}
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
						name: `dLive: ${channelType}:${channelNo}:name`
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
	 * @param path Parameter path (e.g., "input:0:mute")
	 * @returns Variable ID (e.g., "dlive_input_1_mute")
	 */
	private toVariableId(path: DLiveParameterPath): string {
		const parts = path.split(':')
		if (parts.length === 3) {
			const channelType = parts[0]
			const channelNo = parseInt(parts[1], 10)
			const parameter = parts[2]
			// Convert 0-based internal channel number to 1-based for variable name
			return `dlive_${channelType}_${channelNo + 1}_${parameter}`
		}
		// Fallback for unexpected format
		return 'dlive_' + path.replaceAll(':', '_')
	}

	/**
	 * Clears all subscriptions and cached values
	 */
	clear(): void {
		for (const path in this.subscriptions) {
			delete this.subscriptions[path]
		}
		for (const path in this.valueCache) {
			delete this.valueCache[path]
		}
		for (const id in this.feedbackMap) {
			delete this.feedbackMap[id]
		}
		// Clear channel name subscriptions
		this.channelNameSubscriptions.clear()
		// Clear MIDI buffers
		this.midiBuffer = Buffer.alloc(0)
		this.lastStatusByte = 0
		this.updateVariables()
	}
}
