import type { CompanionButtonPresetDefinition, CompanionPresetDefinitions } from '@companion-module/base'
import type { ModuleInstance } from './main.js'

/**
 * Channel type configuration for preset generation
 */
interface ChannelTypeConfig {
	channelType: string
	optionKey: string
	displayName: string
	variablePrefix: string
	category: string
}

/**
 * All channel types that support rotary knob presets
 */
const CHANNEL_TYPES: ChannelTypeConfig[] = [
	{ channelType: 'input', optionKey: 'input', displayName: 'Input', variablePrefix: 'input', category: 'Inputs' },
	{ channelType: 'mono_group', optionKey: 'monoGroup', displayName: 'Mono Group', variablePrefix: 'mono_group', category: 'Groups' },
	{ channelType: 'stereo_group', optionKey: 'stereoGroup', displayName: 'Stereo Group', variablePrefix: 'stereo_group', category: 'Groups' },
	{ channelType: 'mono_aux', optionKey: 'monoAux', displayName: 'Mono Aux', variablePrefix: 'mono_aux', category: 'Auxes' },
	{ channelType: 'stereo_aux', optionKey: 'stereoAux', displayName: 'Stereo Aux', variablePrefix: 'stereo_aux', category: 'Auxes' },
	{ channelType: 'mono_matrix', optionKey: 'monoMatrix', displayName: 'Mono Matrix', variablePrefix: 'mono_matrix', category: 'Matrices' },
	{ channelType: 'stereo_matrix', optionKey: 'stereoMatrix', displayName: 'Stereo Matrix', variablePrefix: 'stereo_matrix', category: 'Matrices' },
	{ channelType: 'mono_fx_send', optionKey: 'monoFxSend', displayName: 'Mono FX Send', variablePrefix: 'mono_fx_send', category: 'FX' },
	{ channelType: 'stereo_fx_send', optionKey: 'stereoFxSend', displayName: 'Stereo FX Send', variablePrefix: 'stereo_fx_send', category: 'FX' },
	{ channelType: 'fx_return', optionKey: 'fxReturn', displayName: 'FX Return', variablePrefix: 'fx_return', category: 'FX' },
	{ channelType: 'main', optionKey: 'main', displayName: 'Main', variablePrefix: 'main', category: 'Mains' },
	{ channelType: 'dca', optionKey: 'dca', displayName: 'DCA', variablePrefix: 'dca', category: 'DCAs' },
]

/**
 * Creates a base options object with all channel type options set to 0
 */
function createBaseOptions(): Record<string, number> {
	return {
		input: 0,
		monoGroup: 0,
		stereoGroup: 0,
		monoAux: 0,
		stereoAux: 0,
		monoMatrix: 0,
		stereoMatrix: 0,
		monoFxSend: 0,
		stereoFxSend: 0,
		fxReturn: 0,
		main: 0,
		dca: 0,
		muteGroup: 0,
		stereoUfxSend: 0,
		stereoUfxReturn: 0,
	}
}

/**
 * Creates a rotary knob preset for a specific channel type
 */
function createRotaryKnobPreset(config: ChannelTypeConfig): CompanionButtonPresetDefinition {
	const baseOptions = createBaseOptions()

	return {
		type: 'button',
		category: `Rotary Knob - ${config.category}`,
		name: `${config.displayName} Rotary Knob`,
		style: {
			text: `$(dLive:dlive_${config.variablePrefix}_1_name)\\n$(dLive:dlive_${config.variablePrefix}_1_fader)`,
			size: 14,
			color: 0xffffff,
			bgcolor: 0x6e6e6e,
		},
		previewStyle: {
			text: `${config.displayName}\\nFader Level`,
			size: 14,
			color: 0xffffff,
			bgcolor: 0x6e6e6e,
		},
		options: {
			rotaryActions: true,
		},
		steps: [
			{
				down: [
					{
						actionId: 'muteToggle',
						options: {
							channelType: config.channelType,
							...baseOptions,
						},
					},
				],
				up: [],
				rotate_left: [
					{
						actionId: 'faderLevelDecrement',
						options: {
							channelType: config.channelType,
							...baseOptions,
							decrement: 1,
						},
					},
				],
				rotate_right: [
					{
						actionId: 'faderLevelIncrement',
						options: {
							channelType: config.channelType,
							...baseOptions,
							increment: 1,
						},
					},
				],
			},
		],
		feedbacks: [
			{
				feedbackId: 'fader_level',
				options: {
					channelType: config.channelType,
					channelNo: 1,
					condition: 'gte',
					level: 125,
				},
				style: {
					bgcolor: 0xff8000,
					color: 0x000000,
				},
			},
			{
				feedbackId: 'channel_muted',
				options: {
					channelType: config.channelType,
					channelNo: 1,
				},
				style: {
					bgcolor: 0xff0000,
					color: 0xffffff,
				},
			},
		],
	}
}

/**
 * Creates a simple mute button preset for a specific channel type
 */
function createMuteButtonPreset(config: ChannelTypeConfig): CompanionButtonPresetDefinition {
	const baseOptions = createBaseOptions()

	return {
		type: 'button',
		category: `Mute Buttons - ${config.category}`,
		name: `${config.displayName} Mute`,
		style: {
			text: `$(dLive:dlive_${config.variablePrefix}_1_name)\\nMUTE`,
			size: 14,
			color: 0xffffff,
			bgcolor: 0x333333,
		},
		previewStyle: {
			text: `${config.displayName}\\nMUTE`,
			size: 14,
			color: 0xffffff,
			bgcolor: 0x333333,
		},
		steps: [
			{
				down: [
					{
						actionId: 'muteToggle',
						options: {
							channelType: config.channelType,
							...baseOptions,
						},
					},
				],
				up: [],
			},
		],
		feedbacks: [
			{
				feedbackId: 'channel_muted',
				options: {
					channelType: config.channelType,
					channelNo: 1,
				},
				style: {
					bgcolor: 0xff0000,
					color: 0xffffff,
				},
			},
		],
	}
}

/**
 * Updates the preset definitions for the module
 * @param instance Module instance
 */
export function UpdatePresets(instance: ModuleInstance): void {
	const presets: CompanionPresetDefinitions = {}

	// Generate rotary knob presets for each channel type
	for (const config of CHANNEL_TYPES) {
		presets[`rotary_knob_${config.channelType}`] = createRotaryKnobPreset(config)
		presets[`mute_button_${config.channelType}`] = createMuteButtonPreset(config)
	}

	instance.setPresetDefinitions(presets)
}
