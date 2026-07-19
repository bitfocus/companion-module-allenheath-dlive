import type { CompanionButtonPresetDefinition } from '@companion-module/base'
import { noop } from 'lodash/fp'

import {
	DCA_COUNT,
	FX_RETURN_COUNT,
	INPUT_CHANNEL_COUNT,
	MAIN_COUNT,
	MONO_AUX_COUNT,
	MONO_FX_SEND_COUNT,
	MONO_GROUP_COUNT,
	MONO_MATRIX_COUNT,
	STEREO_AUX_COUNT,
	STEREO_FX_SEND_COUNT,
	STEREO_GROUP_COUNT,
	STEREO_MATRIX_COUNT,
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
		DCA_COUNT

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

	it('creates one mute button preset per channel type', () => {
		const mutePresetIds = Object.keys(moduleInstance.presetDefinitions).filter((id) => id.startsWith('mute_button_'))
		expect(mutePresetIds).toHaveLength(12)
	})
})
