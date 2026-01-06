import { camelCase, includes } from 'lodash/fp'

import {
	CHANNEL_COLOUR_CHOICES,
	CUE_LIST_COUNT,
	DCA_COUNT,
	EQ_FREQUENCY_CHOICES,
	EQ_MAXIMUM_GAIN,
	EQ_MAXIMUM_WIDTH,
	EQ_MINIMUM_GAIN,
	EQ_MINIMUM_WIDTH,
	EQ_TYPE_CHOICES,
	FADER_LEVEL_CHOICES,
	HPF_FREQUENCY_CHOICES,
	INPUT_CHANNEL_COUNT,
	MUTE_GROUP_COUNT,
	PREAMP_MAXIMUM_GAIN,
	PREAMP_MINIMUM_GAIN,
	SCENE_COUNT,
	UFX_KEY_CHOICES,
	UFX_SCALE_CHOICES,
} from './constants.js'
import { ModuleInstance } from './main.js'
import { getChannelSelectOptions, getSocketSelectOptions, makeDropdownChoices } from './utils/index.js'
import * as validators from './validators/index.js'

const camelCaseStringLiteral = <const S extends string>(snakeCaseString: S): SnakeToCamel<S> =>
	camelCase(snakeCaseString) as SnakeToCamel<S>

export const UpdateActions = (companionModule: ModuleInstance): void => {
	companionModule.setActionDefinitions({
		mute: {
			name: 'Mute',
			description: 'Mute or unmute a channel',
			options: [
				...getChannelSelectOptions(),
				{
					type: 'checkbox',
					label: 'Mute',
					id: 'mute',
					default: true,
				},
			],
			callback: async (action) => {
				const { options } = validators.parseMuteAction(action)
				companionModule.processCommand({
					command: options.mute ? 'mute_on' : 'mute_off',
					params: {
						channelType: options.channelType,
						channelNo: options[camelCaseStringLiteral(options.channelType)],
					},
				})
			},
		},

		faderLevel: {
			name: 'Fader Level',
			description: 'Set the fader level of a channel',
			options: [
				...getChannelSelectOptions({ exclude: ['mute_group'] }),
				{
					type: 'dropdown',
					label: 'Level',
					id: 'level',
					default: 0,
					choices: FADER_LEVEL_CHOICES,
					minChoicesForSearch: 0,
				},
			],
			callback: async (action) => {
				const { options } = validators.parseFaderLevelAction(action)
				companionModule.processCommand({
					command: 'fader_level',
					params: {
						channelType: options.channelType,
						channelNo: options[camelCaseStringLiteral(options.channelType)],
						level: options.level,
					},
				})
			},
		},

		assignToMainMix: {
			name: 'Assign a channel to the main mix',
			options: [
				...getChannelSelectOptions({
					include: ['input', 'mono_group', 'stereo_group', 'fx_return', 'stereo_ufx_return'],
				}),
				{
					type: 'checkbox',
					label: 'Assign to Main Mix',
					id: 'assign',
					default: true,
				},
			],
			callback: async (action) => {
				const { options } = validators.parseAssignChannelToMainMixAction(action)
				companionModule.processCommand({
					command: options.assign ? 'channel_assignment_to_main_mix_on' : 'channel_assignment_to_main_mix_off',
					params: {
						channelType: options.channelType,
						channelNo: options[camelCaseStringLiteral(options.channelType)],
					},
				})
			},
		},

		auxFxMatrixSendLevel: {
			name: 'Aux / FX / Matrix Send Level',
			description: 'Set the send level from a channel to an aux / fx send / matrix',
			options: [
				...getChannelSelectOptions({
					include: ['input', 'mono_group', 'stereo_group', 'fx_return', 'stereo_ufx_return'],
				}),
				...getChannelSelectOptions({
					prefix: 'destination',
					include: [
						'mono_aux',
						'stereo_aux',
						'mono_fx_send',
						'stereo_fx_send',
						'mono_matrix',
						'stereo_matrix',
						'stereo_ufx_send',
					],
				}),
				{
					type: 'dropdown',
					label: 'Level',
					id: 'level',
					default: 0,
					choices: FADER_LEVEL_CHOICES,
					minChoicesForSearch: 0,
				},
			],
			callback: async (action) => {
				const { options } = validators.parseAuxFxMatrixSendLevelAction(action)
				companionModule.processCommand({
					command: 'aux_fx_matrix_send_level',
					params: {
						channelType: options.channelType,
						channelNo: options[camelCaseStringLiteral(options.channelType)],
						destinationChannelType: options.destinationChannelType,
						destinationChannelNo: options[camelCaseStringLiteral(`destination_${options.destinationChannelType}`)],
						level: options.level,
					},
				})
			},
		},

		inputToGroupAuxOn: {
			name: 'Input to Group / Aux / Matrix',
			description: 'Send an input to a group / aux / matrix',
			options: [
				{
					type: 'dropdown',
					label: 'Input Channel',
					id: 'input',
					default: 0,
					choices: makeDropdownChoices('Input Channel', INPUT_CHANNEL_COUNT),
					minChoicesForSearch: 0,
				},
				...getChannelSelectOptions({
					prefix: 'destination',
					include: ['mono_group', 'stereo_group', 'mono_aux', 'stereo_aux', 'mono_matrix', 'stereo_matrix'],
				}),
				{
					type: 'checkbox',
					label: 'On',
					id: 'on',
					default: true,
				},
			],
			callback: async (action) => {
				const { options } = validators.parseInputToGroupAuxOnAction(action)
				companionModule.processCommand({
					command: 'input_to_group_aux_on',
					params: {
						channelNo: options.input,
						destinationChannelType: options.destinationChannelType,
						destinationChannelNo: options[camelCaseStringLiteral(`destination_${options.destinationChannelType}`)],
						shouldEnable: options.on,
					},
				})
			},
		},

		dcaAssign: {
			name: 'Assign to DCA',
			description: 'Assign a channel to a DCA',
			options: [
				...getChannelSelectOptions({
					exclude: ['dca', 'mute_group'],
				}),
				{
					type: 'dropdown',
					label: 'DCA',
					id: 'destinationDca',
					default: 0,
					choices: makeDropdownChoices('DCA', DCA_COUNT),
					minChoicesForSearch: 0,
				},
				{
					type: 'checkbox',
					label: 'Assign to DCA',
					id: 'assign',
					default: true,
				},
			],
			callback: async (action) => {
				const { options } = validators.parseDcaAssignAction(action)
				companionModule.processCommand({
					command: options.assign ? 'dca_assignment_on' : 'dca_assignment_off',
					params: {
						channelType: options.channelType,
						channelNo: options[camelCaseStringLiteral(options.channelType)],
						dcaNo: options.destinationDca,
					},
				})
			},
		},

		muteGroupAssign: {
			name: 'Assign to Mute Group',
			description: 'Assign a channel to a mute group',
			options: [
				...getChannelSelectOptions({
					exclude: ['dca', 'mute_group'],
				}),
				{
					type: 'dropdown',
					label: 'Mute Group',
					id: 'destinationMuteGroup',
					default: 0,
					choices: makeDropdownChoices('Mute Group', MUTE_GROUP_COUNT),
					minChoicesForSearch: 0,
				},
				{
					type: 'checkbox',
					label: 'Assign to Mute Group',
					id: 'assign',
					default: true,
				},
			],
			callback: async (action) => {
				const { options } = validators.parseMuteGroupAssignAction(action)
				companionModule.processCommand({
					command: options.assign ? 'mute_group_assignment_on' : 'mute_group_assignment_off',
					params: {
						channelType: options.channelType,
						channelNo: options[camelCaseStringLiteral(options.channelType)],
						muteGroupNo: options.destinationMuteGroup,
					},
				})
			},
		},

		setSocketPreampGain: {
			name: 'Set Socket Preamp Gain',
			description: 'Set the preamp gain of a MixRack or DX card socket',
			options: [
				...getSocketSelectOptions(),
				{
					type: 'number',
					label: 'Gain',
					id: 'gain',
					default: 5,
					min: PREAMP_MINIMUM_GAIN,
					max: PREAMP_MAXIMUM_GAIN,
					range: true,
					step: 0.5,
				},
			],
			callback: async (action) => {
				const { options } = validators.parseSetSocketPreampGainAction(action)
				companionModule.processCommand({
					command: 'set_socket_preamp_gain',
					params: {
						socketType: options.socketType,
						socketNo: options[camelCaseStringLiteral(options.socketType)],
						gain: options.gain,
					},
				})
			},
		},

		setSocketPreampPad: {
			name: 'Set Socket Preamp Pad',
			description: 'Enable or disable the pad of a MixRack or DX card socket',
			options: [
				...getSocketSelectOptions(),
				{
					type: 'checkbox',
					label: 'Pad',
					id: 'pad',
					default: true,
				},
			],
			callback: async (action) => {
				const { options } = validators.parseSetSocketPreampPadAction(action)
				companionModule.processCommand({
					command: 'set_socket_preamp_pad',
					params: {
						socketType: options.socketType,
						socketNo: options[camelCaseStringLiteral(options.socketType)],
						shouldEnable: options.pad,
					},
				})
			},
		},

		setSocketPreamp48v: {
			name: 'Set Socket Preamp 48v',
			description: 'Enable or disable 48v of a MixRack or DX card socket',
			options: [
				...getSocketSelectOptions(),
				{
					type: 'checkbox',
					label: '48V',
					id: 'phantom',
					default: true,
				},
			],
			callback: async (action) => {
				const { options } = validators.parseSetSocketPreamp48vAction(action)
				companionModule.processCommand({
					command: 'set_socket_preamp_48v',
					params: {
						socketType: options.socketType,
						socketNo: options[camelCaseStringLiteral(options.socketType)],
						shouldEnable: options.phantom,
					},
				})
			},
		},

		setChannelName: {
			name: 'Set Channel Name',
			description: 'Set the name of a channel',
			options: [
				...getChannelSelectOptions(),
				{
					type: 'textinput',
					label: 'Name',
					id: 'name',
					default: '',
				},
			],
			callback: async (action) => {
				const { options } = validators.parseSetChannelNameAction(action)
				companionModule.processCommand({
					command: 'set_channel_name',
					params: {
						channelType: options.channelType,
						channelNo: options[camelCaseStringLiteral(options.channelType)],
						name: options.name,
					},
				})
			},
		},

		setChannelColour: {
			name: 'Set Channel Colour',
			description: 'Set the colour of a channel',
			options: [
				...getChannelSelectOptions({ exclude: ['mute_group'] }),
				{
					type: 'dropdown',
					label: 'Colour',
					id: 'colour',
					default: 0,
					choices: CHANNEL_COLOUR_CHOICES,
				},
			],
			callback: async (action) => {
				const { options } = validators.parseSetChannelColourAction(action)
				companionModule.processCommand({
					command: 'set_channel_colour',
					params: {
						channelType: options.channelType,
						channelNo: options[camelCaseStringLiteral(options.channelType)],
						colour: options.colour,
					},
				})
			},
		},

		recallScene: {
			name: 'Recall Scene',
			description: 'Recall a scene',
			options: [
				{
					type: 'dropdown',
					label: 'Scene',
					id: 'scene',
					default: 0,
					choices: makeDropdownChoices('Scene', SCENE_COUNT, { startIndex: 8 }),
					minChoicesForSearch: 0,
					tooltip: 'Scenes 1-8 are reserved utility scenes and cannot be recalled',
				},
			],
			callback: async (action) => {
				const { options } = validators.parseRecallSceneAction(action)
				companionModule.processCommand({
					command: 'scene_recall',
					params: {
						sceneNo: options.scene,
					},
				})
			},
		},

		recallCueList: {
			name: 'Recall Cue List',
			description: 'Recall a cue list',
			options: [
				{
					type: 'dropdown',
					label: 'Recall ID',
					id: 'recallId',
					default: 0,
					// cue list IDs on the dLive start at 0 not 1 so we need to offset the label by -1
					choices: makeDropdownChoices('ID', CUE_LIST_COUNT, { labelOffset: -1 }),
					minChoicesForSearch: 0,
				},
			],
			callback: async (action) => {
				const { options } = validators.parseRecallCueListAction(action)
				companionModule.processCommand({
					command: 'cue_list_recall',
					params: {
						recallId: options.recallId,
					},
				})
			},
		},

		goNextPrevious: {
			name: 'Go Next/Previous (Surface Only)',
			description: 'Trigger the Go/Next/Previous action using the MIDI CC messages defined in the console settings',
			options: [
				{
					type: 'number',
					min: 0,
					max: 127,
					label: 'Control Number',
					id: 'controlNumber',
					default: 0,
				},
				{
					type: 'number',
					min: 0,
					max: 127,
					label: 'Control Value',
					id: 'controlValue',
					default: 0,
				},
			],
			callback: async (action) => {
				const { options } = validators.parseGoNextPreviousAction(action)
				companionModule.processCommand({
					command: 'go_next_previous',
					params: {
						controlNumber: options.controlNumber,
						controlValue: options.controlValue,
					},
				})
			},
		},

		parametricEq: {
			name: 'Parametric EQ',
			description: 'Set the type, frequency, width and gain of a parametric EQ band',
			options: [
				...getChannelSelectOptions({
					exclude: ['mute_group', 'dca', 'mono_fx_send', 'stereo_fx_send', 'stereo_ufx_send', 'stereo_ufx_return'],
				}),
				{
					type: 'dropdown',
					label: 'Band',
					id: 'band',
					default: 0,
					choices: makeDropdownChoices('Band', 4),
					minChoicesForSearch: 0,
				},
				{
					type: 'dropdown',
					label: 'Type',
					id: 'band0Type',
					default: 'bell',
					choices: EQ_TYPE_CHOICES.filter((choice) => !includes(choice.id, ['hf_shelf', 'low_pass'])),
					minChoicesForSearch: 0,
					isVisibleExpression: `$(options:band) == 0`,
				},
				{
					type: 'dropdown',
					label: 'Type',
					id: 'band3Type',
					default: 'bell',
					choices: EQ_TYPE_CHOICES.filter((choice) => !includes(choice.id, ['lf_shelf', 'high_pass'])),
					minChoicesForSearch: 0,
					isVisibleExpression: `$(options:band) == 3`,
				},
				{
					type: 'dropdown',
					label: 'Frequency',
					id: 'band0Frequency',
					default: 72, // 1kHz
					choices: EQ_FREQUENCY_CHOICES,
					isVisibleExpression: `$(options:band) == 0`,
				},
				{
					type: 'dropdown',
					label: 'Frequency',
					id: 'band1Frequency',
					default: 72, // 1kHz
					choices: EQ_FREQUENCY_CHOICES,
					isVisibleExpression: `$(options:band) == 1`,
				},
				{
					type: 'dropdown',
					label: 'Frequency',
					id: 'band2Frequency',
					default: 72, // 1kHz
					choices: EQ_FREQUENCY_CHOICES,
					isVisibleExpression: `$(options:band) == 2`,
				},
				{
					type: 'dropdown',
					label: 'Frequency',
					id: 'band3Frequency',
					default: 72, // 1kHz
					choices: EQ_FREQUENCY_CHOICES,
					isVisibleExpression: `$(options:band) == 3`,
				},
				{
					type: 'number',
					label: 'Width',
					id: 'band0Width',
					default: 1,
					max: EQ_MAXIMUM_WIDTH,
					min: EQ_MINIMUM_WIDTH,
					step: 0.05,
					range: true,
					isVisibleExpression: `$(options:band) == 0 && $(options:band0Type) == 'bell'`,
				},
				{
					type: 'number',
					label: 'Width',
					id: 'band1Width',
					default: 1,
					max: EQ_MAXIMUM_WIDTH,
					min: EQ_MINIMUM_WIDTH,
					step: 0.05,
					range: true,
					isVisibleExpression: `$(options:band) == 1`,
				},
				{
					type: 'number',
					label: 'Width',
					id: 'band2Width',
					default: 1,
					max: EQ_MAXIMUM_WIDTH,
					min: EQ_MINIMUM_WIDTH,
					step: 0.05,
					range: true,
					isVisibleExpression: `$(options:band) == 2`,
				},
				{
					type: 'number',
					label: 'Width',
					id: 'band3Width',
					default: 1,
					max: EQ_MAXIMUM_WIDTH,
					min: EQ_MINIMUM_WIDTH,
					step: 0.05,
					range: true,
					isVisibleExpression: `$(options:band) == 3 && $(options:band3Type) == 'bell'`,
				},
				{
					type: 'number',
					label: 'Gain',
					id: 'band0Gain',
					default: 0,
					min: EQ_MINIMUM_GAIN,
					max: EQ_MAXIMUM_GAIN,
					range: true,
					step: 0.5,
					isVisibleExpression: `$(options:band) == 0 && $(options:band0Type) !== 'high_pass' && $(options:band0Type) !== 'low_pass'`,
				},
				{
					type: 'number',
					label: 'Gain',
					id: 'band1Gain',
					default: 0,
					min: EQ_MINIMUM_GAIN,
					max: EQ_MAXIMUM_GAIN,
					range: true,
					step: 0.5,
					isVisibleExpression: `$(options:band) == 1`,
				},
				{
					type: 'number',
					label: 'Gain',
					id: 'band2Gain',
					default: 0,
					min: EQ_MINIMUM_GAIN,
					max: EQ_MAXIMUM_GAIN,
					range: true,
					step: 0.5,
					isVisibleExpression: `$(options:band) == 2`,
				},
				{
					type: 'number',
					label: 'Gain',
					id: 'band3Gain',
					default: 0,
					min: EQ_MINIMUM_GAIN,
					max: EQ_MAXIMUM_GAIN,
					range: true,
					step: 0.5,
					isVisibleExpression: `$(options:band) == 3 && $(options:band3Type) != 'high_pass' && $(options:band3Type) != 'low_pass'`,
				},
			],
			callback: async (action) => {
				const { options } = validators.parseParametricEqAction(action)

				// Map band number to corresponding option values
				const typeMap: Record<number, EqType> = {
					0: options.band0Type,
					1: 'bell',
					2: 'bell',
					3: options.band3Type,
				}

				const frequencyMap: Record<number, number> = {
					0: options.band0Frequency,
					1: options.band1Frequency,
					2: options.band2Frequency,
					3: options.band3Frequency,
				}

				const widthMap: Record<number, number> = {
					0: options.band0Width,
					1: options.band1Width,
					2: options.band2Width,
					3: options.band3Width,
				}

				const gainMap: Record<number, number> = {
					0: options.band0Gain,
					1: options.band1Gain,
					2: options.band2Gain,
					3: options.band3Gain,
				}

				companionModule.processCommand({
					command: 'parametric_eq',
					params: {
						channelType: options.channelType,
						channelNo: options[camelCaseStringLiteral(options.channelType)],
						bandNo: options.band,
						type: typeMap[options.band],
						frequency: frequencyMap[options.band],
						width: widthMap[options.band],
						gain: gainMap[options.band],
					},
				})
			},
		},

		hpfFrequency: {
			name: 'HPF Frequency',
			description: 'Set the high pass filter frequency of an input channel',
			options: [
				{
					type: 'dropdown',
					label: 'Input Channel',
					id: 'input',
					default: 0,
					choices: makeDropdownChoices('Input Channel', INPUT_CHANNEL_COUNT),
					minChoicesForSearch: 0,
				},
				{
					type: 'dropdown',
					label: 'Frequency',
					id: 'frequency',
					default: 72, // 1kHz
					choices: HPF_FREQUENCY_CHOICES,
				},
			],
			callback: async (action) => {
				const { options } = validators.parseHpfFrequencyAction(action)
				companionModule.processCommand({
					command: 'hpf_frequency',
					params: {
						channelNo: options.input,
						frequency: options.frequency,
					},
				})
			},
		},

		setHpfOnOff: {
			name: 'Set HPF On/Off',
			description: 'Enable or disable the high pass filter of an input channel',
			options: [
				{
					type: 'dropdown',
					label: 'Input Channel',
					id: 'input',
					default: 0,
					choices: makeDropdownChoices('Input Channel', INPUT_CHANNEL_COUNT),
					minChoicesForSearch: 0,
				},
				{
					type: 'checkbox',
					label: 'HPF',
					id: 'hpf',
					default: true,
				},
			],
			callback: async (action) => {
				const { options } = validators.parseSetHpfOnOffAction(action)
				companionModule.processCommand({
					command: 'set_hpf_on_off',
					params: {
						channelNo: options.input,
						shouldEnable: options.hpf,
					},
				})
			},
		},

		setUfxGlobalKey: {
			name: 'Set UFX Global Key',
			description: 'Set the global key for all UFX units',
			options: [
				{
					type: 'dropdown',
					label: 'Key',
					id: 'key',
					default: 0,
					choices: UFX_KEY_CHOICES,
					minChoicesForSearch: 0,
				},
			],
			callback: async (action) => {
				const { options } = validators.parseSetUfxGlobalKeyAction(action)
				companionModule.processCommand({
					command: 'set_ufx_global_key',
					params: {
						key: options.key,
					},
				})
			},
		},

		setUfxGlobalScale: {
			name: 'Set UFX Global Scale',
			description: 'Set the global scale for all UFX units',
			options: [
				{
					type: 'dropdown',
					label: 'Scale',
					id: 'scale',
					default: 0,
					choices: UFX_SCALE_CHOICES,
					minChoicesForSearch: 0,
				},
			],
			callback: async (action) => {
				const { options } = validators.parseSetUfxGlobalScaleAction(action)
				companionModule.processCommand({
					command: 'set_ufx_global_scale',
					params: {
						scale: options.scale,
					},
				})
			},
		},

		setUfxUnitParameter: {
			name: 'Set UFX Unit Parameter',
			description: 'Set a UFX parameter using the MIDI channel and control message defined in the console settings',
			options: [
				{
					type: 'number',
					min: 1,
					max: 16,
					label: 'MIDI Channel',
					id: 'midiChannel',
					default: 1,
				},
				{
					type: 'number',
					min: 0,
					max: 127,
					label: 'Control Number',
					id: 'controlNumber',
					default: 0,
				},
				{
					type: 'number',
					min: 0,
					max: 127,
					label: 'Control Value',
					id: 'controlValue',
					default: 0,
				},
			],
			callback: async (action) => {
				const { options } = validators.parseSetUfxUnitParameterAction(action)
				companionModule.processCommand({
					command: 'set_ufx_unit_parameter',
					params: {
						midiChannel: options.midiChannel - 1,
						controlNumber: options.controlNumber,
						value: options.controlValue,
					},
				})
			},
		},
	})
}
