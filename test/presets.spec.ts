import type { CompanionButtonPresetDefinition } from '@companion-module/base'
import { noop } from 'lodash/fp'

import {
	CUE_LIST_COUNT,
	DCA_COUNT,
	FX_RETURN_COUNT,
	INPUT_CHANNEL_COUNT,
	MAIN_COUNT,
	MONO_AUX_COUNT,
	MONO_FX_SEND_COUNT,
	MONO_GROUP_COUNT,
	MONO_MATRIX_COUNT,
	SCENE_COUNT,
	STEREO_AUX_COUNT,
	STEREO_FX_SEND_COUNT,
	STEREO_GROUP_COUNT,
	STEREO_MATRIX_COUNT,
	STEREO_UFX_RETURN_COUNT,
	STEREO_UFX_SEND_COUNT,
} from '../src/constants.js'
import { ModuleInstance } from '../src/main.js'
import { UpdatePresets } from '../src/presets.js'
import { MockModuleInstance } from './utils/MockModuleInstance.js'

jest.mock('@companion-module/base', () => {
	class MockInstanceBase {}

	return {
		...jest.requireActual('@companion-module/base'),
		runEntrypoint: noop,
		InstanceBase: MockInstanceBase,
	}
})

describe('presets', () => {
	let moduleInstance: MockModuleInstance

	beforeAll(() => {
		moduleInstance = new MockModuleInstance({})
		UpdatePresets(moduleInstance as unknown as ModuleInstance)
	})

	const totalChannelCount =
		INPUT_CHANNEL_COUNT +
		MONO_GROUP_COUNT +
		STEREO_GROUP_COUNT +
		MONO_AUX_COUNT +
		STEREO_AUX_COUNT +
		MONO_MATRIX_COUNT +
		STEREO_MATRIX_COUNT +
		MONO_FX_SEND_COUNT +
		STEREO_FX_SEND_COUNT +
		FX_RETURN_COUNT +
		MAIN_COUNT +
		DCA_COUNT +
		STEREO_UFX_SEND_COUNT +
		STEREO_UFX_RETURN_COUNT

	it('creates a rotary knob preset for every channel of every channel type', () => {
		const rotaryPresetIds = Object.keys(moduleInstance.presetDefinitions).filter((id) => id.startsWith('rotary_knob_'))
		expect(rotaryPresetIds).toHaveLength(totalChannelCount)
	})

	it('creates a rotary knob preset for a specific channel (input 15)', () => {
		const preset = moduleInstance.presetDefinitions.rotary_knob_input_15 as CompanionButtonPresetDefinition
		expect(preset).toBeDefined()
		expect(preset.name).toBe('Input 15 Rotary Knob')

		// Actions and feedbacks target channel index 14 (0-based)
		expect(preset.steps[0].down[0].options).toMatchObject({ channelType: 'input', input: 14 })
		expect(preset.feedbacks[0].options).toMatchObject({ channelType: 'input', input: 14 })
		expect(preset.feedbacks[1].options).toMatchObject({ channelType: 'input', input: 14 })

		// Button text references the channel 15 variables (1-based)
		expect(preset.style.text).toContain('dlive_input_15_name')
		expect(preset.style.text).toContain('dlive_input_15_fader')
	})

	it('respects the per-type channel counts at the boundaries', () => {
		expect(moduleInstance.presetDefinitions[`rotary_knob_main_${MAIN_COUNT}`]).toBeDefined()
		expect(moduleInstance.presetDefinitions[`rotary_knob_main_${MAIN_COUNT + 1}`]).toBeUndefined()
		expect(moduleInstance.presetDefinitions[`rotary_knob_dca_${DCA_COUNT}`]).toBeDefined()
		expect(moduleInstance.presetDefinitions[`rotary_knob_dca_${DCA_COUNT + 1}`]).toBeUndefined()
	})

	it('creates rotary knob presets for the stereo UFX sends and returns', () => {
		const sendPreset = moduleInstance.presetDefinitions.rotary_knob_stereo_ufx_send_8 as CompanionButtonPresetDefinition
		expect(sendPreset).toBeDefined()
		expect(sendPreset.name).toBe('Stereo UFX Send 8 Rotary Knob')
		expect(sendPreset.steps[0].down[0].options).toMatchObject({ channelType: 'stereo_ufx_send', stereoUfxSend: 7 })
		expect(sendPreset.style.text).toContain('dlive_stereo_ufx_send_8_name')

		const returnPreset = moduleInstance.presetDefinitions
			.rotary_knob_stereo_ufx_return_1 as CompanionButtonPresetDefinition
		expect(returnPreset).toBeDefined()
		expect(returnPreset.steps[0].down[0].options).toMatchObject({
			channelType: 'stereo_ufx_return',
			stereoUfxReturn: 0,
		})
		expect(moduleInstance.presetDefinitions[`rotary_knob_stereo_ufx_send_${STEREO_UFX_SEND_COUNT + 1}`]).toBeUndefined()
		expect(
			moduleInstance.presetDefinitions[`rotary_knob_stereo_ufx_return_${STEREO_UFX_RETURN_COUNT + 1}`],
		).toBeUndefined()
	})

	it('creates one mute button preset per channel type', () => {
		const mutePresetIds = Object.keys(moduleInstance.presetDefinitions).filter((id) => id.startsWith('mute_button_'))
		expect(mutePresetIds).toHaveLength(14)
	})

	it('creates scene recall presets for the recallable scenes (9-500)', () => {
		const scenePresetIds = Object.keys(moduleInstance.presetDefinitions).filter((id) => id.startsWith('scene_recall_'))
		expect(scenePresetIds).toHaveLength(SCENE_COUNT - 8)
		expect(moduleInstance.presetDefinitions.scene_recall_8).toBeUndefined() // Scenes 1-8 are reserved
		const scene9 = moduleInstance.presetDefinitions.scene_recall_9 as CompanionButtonPresetDefinition
		expect(scene9.steps[0].down[0].options).toMatchObject({ scene: 8 })
		expect(moduleInstance.presetDefinitions[`scene_recall_${SCENE_COUNT}`]).toBeDefined()
	})

	it('creates cue recall presets for every recall ID', () => {
		const cuePresetIds = Object.keys(moduleInstance.presetDefinitions).filter((id) => id.startsWith('cue_recall_'))
		expect(cuePresetIds).toHaveLength(CUE_LIST_COUNT)
		const cue0 = moduleInstance.presetDefinitions.cue_recall_0 as CompanionButtonPresetDefinition
		expect(cue0.steps[0].down[0].options).toMatchObject({ recallId: 0 })
	})

	it('creates scene control and MIDI transport presets', () => {
		expect(moduleInstance.presetDefinitions.scene_control_go).toBeDefined()
		expect(moduleInstance.presetDefinitions.scene_control_next).toBeDefined()
		expect(moduleInstance.presetDefinitions.scene_control_previous).toBeDefined()

		const transportIds = Object.keys(moduleInstance.presetDefinitions).filter((id) => id.startsWith('midi_transport_'))
		expect(transportIds).toHaveLength(8)
		const play = moduleInstance.presetDefinitions.midi_transport_2 as CompanionButtonPresetDefinition
		expect(play.steps[0].down[0].options).toMatchObject({ transport: 2 })
	})

	describe('connection target gating', () => {
		const makeInstanceWithTarget = (target: ConnectionTarget): MockModuleInstance => {
			const instance = new MockModuleInstance({})
			instance.config = { host: '192.168.1.70', target, useCustomPort: false, midiPort: 51325, midiChannel: 0 }
			UpdatePresets(instance as unknown as ModuleInstance)
			return instance
		}

		it('only offers scene presets for a MixRack target', () => {
			const instance = makeInstanceWithTarget('mixrack')
			expect(instance.presetDefinitions.scene_recall_9).toBeDefined()
			expect(instance.presetDefinitions.cue_recall_0).toBeUndefined()
			expect(instance.presetDefinitions.scene_control_go).toBeUndefined()
			expect(instance.presetDefinitions.midi_transport_2).toBeDefined()
		})

		it('only offers cue and scene control presets for a Surface target', () => {
			const instance = makeInstanceWithTarget('surface')
			expect(instance.presetDefinitions.scene_recall_9).toBeUndefined()
			expect(instance.presetDefinitions.cue_recall_0).toBeDefined()
			expect(instance.presetDefinitions.scene_control_go).toBeDefined()
			expect(instance.presetDefinitions.midi_transport_2).toBeDefined()
		})
	})
})
