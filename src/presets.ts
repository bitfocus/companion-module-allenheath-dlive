import type { CompanionPresetDefinitions } from '@companion-module/base'
import type { ModuleInstance } from './main.js'

/**
 * Updates the preset definitions for the module
 * @param instance Module instance
 */
export function UpdatePresets(instance: ModuleInstance): void {
	const presets: CompanionPresetDefinitions = {
		rotary_knob_fader_control: {
			type: 'button',
			category: 'Rotary Knob Controls',
			name: 'Add Rotary Knob',
			style: {
				text: '$(dLive:dlive_input_1_name)\\n$(dLive:dlive_input_1_fader)',
				size: 14,
				color: 0xffffff, // White text
				bgcolor: 0x6e6e6e // Grey background
			},
			previewStyle: {
				text: 'Channel Name\\nFader Level',
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
								channelType: 'input',
								input: 0, // 0-based, will be set by user via options
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
							},
						},
					],
					up: [],
					rotate_left: [
						{
							actionId: 'faderLevelDecrement',
							options: {
								channelType: 'input',
								input: 0, // 0-based, will be set by user via options
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
								decrement: 1, // 1 dB decrement
							},
						},
					],
					rotate_right: [
						{
							actionId: 'faderLevelIncrement',
							options: {
								channelType: 'input',
								input: 0, // 0-based, will be set by user via options
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
								increment: 1, // 1 dB increment
							},
						},
					],
				},
			],
			feedbacks: [
				{
					feedbackId: 'fader_level',
					options: {
						channelType: 'input',
						channelNo: 1, // 1-based for feedbacks
						condition: 'gte',
						level: 125, // +8 dB ≈ MIDI 125
					},
					style: {
						bgcolor: 0xff8000, // Orange when at or above +8 dB
						color: 0x000000,
					},
				},
				{
					feedbackId: 'channel_muted',
					options: {
						channelType: 'input',
						channelNo: 1, // 1-based for feedbacks
					},
					style: {
						bgcolor: 0xff0000, // Red when muted
						color: 0xffffff, // White text
					},
				},
			],
		},
	}

	instance.setPresetDefinitions(presets)
}
