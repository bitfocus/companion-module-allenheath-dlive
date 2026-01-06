import { InstanceBase, Regex, runEntrypoint, SomeCompanionConfigField, TCPHelper } from '@companion-module/base'
import { indexOf } from 'lodash/fp'

import { UpdateActions } from './actions.js'
import {
	CUE_LISTS_PER_BANK,
	DEFAULT_MIDI_CHANNEL,
	DEFAULT_MIDI_TCP_PORT,
	DEFAULT_TARGET_IP,
	EQ_PARAMETER_MIDI_VALUES_FOR_BANDS,
	EQ_TYPES,
	MAIN_MIDI_CHANNEL_CHOICES,
	MAX_TCP_PORT,
	MIN_TCP_PORT,
	SCENES_PER_BANK,
	SOCKET_MIDI_NOTE_OFFSETS,
	SYSEX_HEADER,
} from './constants.js'
import {
	eqGainToMidiValue,
	eqWidthToMidiValue,
	getMidiOffsetsForChannelType,
	preampGainToMidiValue,
	stringToMidiBytes,
} from './utils/index.js'
import { parseDliveModuleConfig } from './validators/index.js'

export class ModuleInstance extends InstanceBase<DLiveModuleConfig> {
	config?: DLiveModuleConfig
	midiSocket?: TCPHelper

	get baseMidiChannel(): number {
		return this.config?.midiChannel ?? 0
	}

	constructor(internal: unknown) {
		super(internal)
	}

	async init(initialConfig: Record<string, unknown>): Promise<void> {
		this.log('info', `Initialising module from config: ${JSON.stringify(initialConfig)}`)
		try {
			this.config = parseDliveModuleConfig(initialConfig)
		} catch (error) {
			this.log('error', `Unable to parse config object during init method: ${JSON.stringify(error)}`)
		}
		UpdateActions(this)
		this.initialiseMidi()
	}

	async configUpdated(updatedConfig: Record<string, unknown>): Promise<void> {
		this.log('info', `Updating module from config: ${JSON.stringify(updatedConfig)}`)
		try {
			this.config = parseDliveModuleConfig(updatedConfig)
		} catch (error) {
			this.log('error', `Unable to parse config object during configUpdated method: ${JSON.stringify(error)}`)
		}
		this.initialiseMidi()
	}

	async destroy(): Promise<void> {
		this.log('debug', `Destroying module`)

		this.destroyMidiSocket()
	}

	/** Custom methods **/
	/**
	 * Initialises the MIDI TCP connection to the dLive console
	 * Destroys any existing connection before creating a new one
	 */
	initialiseMidi(): void {
		if (!this.config) {
			this.log('error', 'Unable to initialise MIDI, as no config object exists')
			return
		}
		this.destroyMidiSocket()

		const { host, midiPort } = this.config
		this.midiSocket = new TCPHelper(host, midiPort)
			.on('status_change', (status, message) => {
				this.updateStatus(status, message)
			})
			.on('error', (err) => {
				this.log('error', 'MIDI error: ' + err.message)
			})
			.on('connect', () => {
				this.log('debug', `MIDI Connected to ${host}`)
			})
			.on('data', (data) => {
				this.log('debug', `received MIDI data: ${data.toString('hex')}`)
			})
	}

	/**
	 * Sends a MIDI message to the dLive console via TCP
	 * @param midiMessage - Array of MIDI bytes to send
	 */
	sendMidiToDlive(midiMessage: number[]): void {
		if (!this.midiSocket) {
			this.log('error', 'no midi socket')
			return
		}
		this.log('debug', `Sending MIDI: ${midiMessage}`)
		try {
			void this.midiSocket.send(Buffer.from(midiMessage))
		} catch (error) {
			this.log('error', `Error sending MIDI: ${JSON.stringify(error)}`)
		}
	}

	/**
	 * Destroys the MIDI TCP socket connection and cleans up resources
	 */
	destroyMidiSocket(): void {
		this.midiSocket?.destroy()
		delete this.midiSocket
	}

	/**
	 * Processes a dLive command and sends the appropriate MIDI message(s)
	 * @param command - The command object containing the command type and parameters
	 */
	processCommand({ command, params }: DLiveCommand): void {
		this.log('debug', `Processing command: ${command} with params ${JSON.stringify(params)}`)

		try {
			switch (command) {
				case 'mute_on': {
					const { channelNo, channelType } = params
					const { midiChannelOffset, midiNoteOffset } = getMidiOffsetsForChannelType(channelType)
					this.sendMidiToDlive([
						0x90 + this.baseMidiChannel + midiChannelOffset,
						channelNo + midiNoteOffset,
						0x7f,
						channelNo + midiNoteOffset,
						0x00,
					])
					break
				}

				case 'mute_off': {
					const { channelNo, channelType } = params
					const { midiChannelOffset, midiNoteOffset } = getMidiOffsetsForChannelType(channelType)
					this.sendMidiToDlive([
						0x90 + this.baseMidiChannel + midiChannelOffset,
						channelNo + midiNoteOffset,
						0x3f,
						channelNo + midiNoteOffset,
						0x00,
					])
					break
				}

				case 'fader_level': {
					const { channelNo, channelType, level } = params
					const { midiChannelOffset, midiNoteOffset } = getMidiOffsetsForChannelType(channelType)
					this.sendMidiToDlive([
						0xb0 + this.baseMidiChannel + midiChannelOffset,
						0x63,
						channelNo + midiNoteOffset,
						0x62,
						0x17,
						0x06,
						level,
					])
					break
				}

				case 'channel_assignment_to_main_mix_on': {
					const { channelNo, channelType } = params
					const { midiChannelOffset, midiNoteOffset } = getMidiOffsetsForChannelType(channelType)
					this.sendMidiToDlive([
						0xb0 + this.baseMidiChannel + midiChannelOffset,
						0x63,
						channelNo + midiNoteOffset,
						0x62,
						0x18,
						0x06,
						0x7f,
					])
					break
				}

				case 'channel_assignment_to_main_mix_off': {
					const { channelNo, channelType } = params
					const { midiChannelOffset, midiNoteOffset } = getMidiOffsetsForChannelType(channelType)
					this.sendMidiToDlive([
						0xb0 + this.baseMidiChannel + midiChannelOffset,
						0x63,
						channelNo + midiNoteOffset,
						0x62,
						0x18,
						0x06,
						0x3f,
					])
					break
				}

				case 'aux_fx_matrix_send_level': {
					const { channelNo, channelType, destinationChannelNo, destinationChannelType, level } = params
					const { midiChannelOffset, midiNoteOffset } = getMidiOffsetsForChannelType(channelType)
					const { midiChannelOffset: destinationMidiChannelOffset, midiNoteOffset: destinationMidiNoteOffset } =
						getMidiOffsetsForChannelType(destinationChannelType)
					this.sendMidiToDlive([
						...SYSEX_HEADER,
						this.baseMidiChannel + midiChannelOffset,
						0x0d,
						channelNo + midiNoteOffset,
						this.baseMidiChannel + destinationMidiChannelOffset,
						destinationChannelNo + destinationMidiNoteOffset,
						level,
						0xf7,
					])
					break
				}

				case 'input_to_group_aux_on': {
					const { channelNo, destinationChannelNo, destinationChannelType, shouldEnable } = params
					const { midiChannelOffset, midiNoteOffset } = getMidiOffsetsForChannelType('input')
					const { midiChannelOffset: destinationMidiChannelOffset, midiNoteOffset: destinationMidiNoteOffset } =
						getMidiOffsetsForChannelType(destinationChannelType)
					this.sendMidiToDlive([
						...SYSEX_HEADER,
						this.baseMidiChannel + midiChannelOffset,
						0x0e,
						channelNo + midiNoteOffset,
						this.baseMidiChannel + destinationMidiChannelOffset,
						destinationChannelNo + destinationMidiNoteOffset,
						shouldEnable ? 0x40 : 0x00,
						0xf7,
					])
					break
				}

				case 'dca_assignment_on': {
					const { channelNo, channelType, dcaNo } = params
					const { midiChannelOffset, midiNoteOffset } = getMidiOffsetsForChannelType(channelType)
					this.sendMidiToDlive([
						0xb0 + this.baseMidiChannel + midiChannelOffset,
						0x63,
						channelNo + midiNoteOffset,
						0x62,
						0x40,
						0x06,
						dcaNo + 0x40,
					])
					break
				}

				case 'dca_assignment_off': {
					const { channelNo, channelType, dcaNo } = params
					const { midiChannelOffset, midiNoteOffset } = getMidiOffsetsForChannelType(channelType)
					this.sendMidiToDlive([
						0xb0 + this.baseMidiChannel + midiChannelOffset,
						0x63,
						channelNo + midiNoteOffset,
						0x62,
						0x40,
						0x06,
						dcaNo,
					])
					break
				}

				case 'mute_group_assignment_on': {
					const { channelNo, channelType, muteGroupNo } = params
					const { midiChannelOffset, midiNoteOffset } = getMidiOffsetsForChannelType(channelType)
					this.sendMidiToDlive([
						0xb0 + this.baseMidiChannel + midiChannelOffset,
						0x63,
						channelNo + midiNoteOffset,
						0x62,
						0x40,
						0x06,
						muteGroupNo + 0x58,
					])
					break
				}

				case 'mute_group_assignment_off': {
					const { channelNo, channelType, muteGroupNo } = params
					const { midiChannelOffset, midiNoteOffset } = getMidiOffsetsForChannelType(channelType)
					this.sendMidiToDlive([
						0xb0 + this.baseMidiChannel + midiChannelOffset,
						0x63,
						channelNo + midiNoteOffset,
						0x62,
						0x40,
						0x06,
						muteGroupNo + 0x18,
					])
					break
				}

				case 'set_socket_preamp_gain': {
					const { socketNo, socketType, gain } = params
					const midiNoteOffset = SOCKET_MIDI_NOTE_OFFSETS[socketType]
					const gainMidiValue = preampGainToMidiValue(gain)
					this.sendMidiToDlive([0xe0 + this.baseMidiChannel, socketNo + midiNoteOffset, gainMidiValue])
					break
				}

				case 'set_socket_preamp_pad': {
					const { socketNo, socketType, shouldEnable } = params
					const midiNoteOffset = SOCKET_MIDI_NOTE_OFFSETS[socketType]
					this.sendMidiToDlive([
						...SYSEX_HEADER,
						this.baseMidiChannel,
						0x09,
						socketNo + midiNoteOffset,
						shouldEnable ? 0x40 : 0x00,
						0xf7,
					])
					break
				}

				case 'set_socket_preamp_48v': {
					const { socketNo, socketType, shouldEnable } = params
					const midiNoteOffset = SOCKET_MIDI_NOTE_OFFSETS[socketType]
					this.sendMidiToDlive([
						...SYSEX_HEADER,
						this.baseMidiChannel,
						0x0c,
						socketNo + midiNoteOffset,
						shouldEnable ? 0x40 : 0x00,
						0xf7,
					])
					break
				}

				case 'set_channel_name': {
					const { channelNo, channelType, name } = params
					const { midiChannelOffset, midiNoteOffset } = getMidiOffsetsForChannelType(channelType)
					this.sendMidiToDlive([
						...SYSEX_HEADER,
						this.baseMidiChannel + midiChannelOffset,
						0x03,
						channelNo + midiNoteOffset,
						...stringToMidiBytes(name),
						0xf7,
					])
					break
				}

				case 'set_channel_colour': {
					const { channelNo, channelType, colour } = params
					const { midiChannelOffset, midiNoteOffset } = getMidiOffsetsForChannelType(channelType)
					this.sendMidiToDlive([
						...SYSEX_HEADER,
						this.baseMidiChannel + midiChannelOffset,
						0x06,
						channelNo + midiNoteOffset,
						colour,
						0xf7,
					])
					break
				}

				case 'scene_recall': {
					const { sceneNo } = params
					const sceneBankNo = Math.floor(sceneNo / SCENES_PER_BANK)
					const sceneNoInBank = sceneNo % SCENES_PER_BANK
					this.sendMidiToDlive([0xb0 + this.baseMidiChannel, 0x00, sceneBankNo, 0xc0, sceneNoInBank])
					break
				}

				case 'cue_list_recall': {
					const { recallId } = params
					const recallBankNo = Math.min(0x0f, Math.floor(recallId / CUE_LISTS_PER_BANK))
					const recallIdInBank = recallId % CUE_LISTS_PER_BANK
					this.sendMidiToDlive([0xb0 + this.baseMidiChannel, 0x00, recallBankNo, 0xc0, recallIdInBank])
					break
				}

				case 'go_next_previous': {
					const { controlNumber, controlValue } = params
					this.sendMidiToDlive([0xb0 + this.baseMidiChannel, controlNumber, controlValue])
					break
				}

				case 'parametric_eq': {
					const { channelNo, channelType, bandNo, frequency, type, gain, width } = params
					const { midiChannelOffset, midiNoteOffset } = getMidiOffsetsForChannelType(channelType)

					const gainMidiValue = eqGainToMidiValue(gain)
					const widthMidiValue = eqWidthToMidiValue(width)
					const typeMidiValue = indexOf(type, EQ_TYPES)

					const parameterMidiValuesForBand = EQ_PARAMETER_MIDI_VALUES_FOR_BANDS[bandNo]

					const messages: number[][] = [
						[
							0xb0 + this.baseMidiChannel + midiChannelOffset,
							0x63,
							channelNo + midiNoteOffset,
							0x62,
							parameterMidiValuesForBand.type,
							0x06,
							typeMidiValue,
						],
						[
							0xb0 + this.baseMidiChannel + midiChannelOffset,
							0x63,
							channelNo + midiNoteOffset,
							0x62,
							parameterMidiValuesForBand.frequency,
							0x06,
							frequency,
						],
						[
							0xb0 + this.baseMidiChannel + midiChannelOffset,
							0x63,
							channelNo + midiNoteOffset,
							0x62,
							parameterMidiValuesForBand.width,
							0x06,
							widthMidiValue,
						],
						[
							0xb0 + this.baseMidiChannel + midiChannelOffset,
							0x63,
							channelNo + midiNoteOffset,
							0x62,
							parameterMidiValuesForBand.gain,
							0x06,
							gainMidiValue,
						],
					]
					messages.forEach((message) => {
						this.sendMidiToDlive(message)
					})
					break
				}

				case 'hpf_frequency': {
					const { channelNo, frequency } = params
					const { midiChannelOffset, midiNoteOffset } = getMidiOffsetsForChannelType('input')
					this.sendMidiToDlive([
						0xb0 + this.baseMidiChannel + midiChannelOffset,
						0x63,
						channelNo + midiNoteOffset,
						0x62,
						0x30,
						0x06,
						frequency,
					])
					break
				}

				case 'set_hpf_on_off': {
					const { channelNo, shouldEnable } = params
					const { midiChannelOffset, midiNoteOffset } = getMidiOffsetsForChannelType('input')
					this.sendMidiToDlive([
						0xb0 + this.baseMidiChannel + midiChannelOffset,
						0x63,
						channelNo + midiNoteOffset,
						0x62,
						0x31,
						0x06,
						shouldEnable ? 0x40 : 0x00,
					])
					break
				}

				case 'set_ufx_global_key': {
					const { key } = params
					this.sendMidiToDlive([0xb0 + this.baseMidiChannel, 0x0c, key])
					break
				}

				case 'set_ufx_global_scale': {
					const { scale } = params
					this.sendMidiToDlive([0xb0 + this.baseMidiChannel, 0x0d, scale])
					break
				}

				case 'set_ufx_unit_parameter': {
					const { midiChannel, controlNumber, value } = params
					this.sendMidiToDlive([0xb0 + this.baseMidiChannel + midiChannel, controlNumber, value])
					break
				}
			}
		} catch (error) {
			this.log('error', `Error sending command: ${JSON.stringify(error)}`)
		}
	}

	getConfigFields(): SomeCompanionConfigField[] {
		return [
			{
				type: 'static-text',
				id: 'info',
				width: 12,
				label: 'Information',
				value: 'This module is for the Allen & Heath dLive mixer',
			},
			{
				type: 'textinput',
				id: 'host',
				label: 'Target IP',
				tooltip: 'Default for surface is 192.168.1.71, default for mixrack is 192.168.1.70',
				width: 6,
				default: DEFAULT_TARGET_IP,
				regex: Regex.IP,
			},
			{
				type: 'number',
				id: 'midiPort',
				label: 'MIDI Port',
				width: 6,
				tooltip: 'Default for surface is 51328, default for mixrack is 51325',
				default: DEFAULT_MIDI_TCP_PORT,
				min: MIN_TCP_PORT,
				max: MAX_TCP_PORT,
			},
			{
				type: 'dropdown',
				id: 'midiChannel',
				label: 'Main MIDI Channels',
				width: 6,
				default: DEFAULT_MIDI_CHANNEL,
				choices: MAIN_MIDI_CHANNEL_CHOICES,
			},
		]
	}
}

runEntrypoint(ModuleInstance, [])
