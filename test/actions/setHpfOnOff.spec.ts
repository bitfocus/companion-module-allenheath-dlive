import { CompanionActionContext, CompanionActionEvent } from '@companion-module/base'
import { noop } from 'lodash/fp'

import { UpdateActions } from '../../src/actions.js'
import { INPUT_CHANNEL_COUNT } from '../../src/constants.js'
import { ModuleInstance } from '../../src/main.js'
import { getMidiOffsetsForChannelType } from '../../src/utils/index.js'
import { SetHpfOnOffAction } from '../../src/validators/index.js'
import { MockModuleInstance } from '../utils/MockModuleInstance.js'

jest.mock('@companion-module/base', () => {
	class MockInstanceBase {}

	return {
		...jest.requireActual('@companion-module/base'),
		runEntrypoint: noop,
		InstanceBase: MockInstanceBase,
	}
})

describe('setHpfOnOff action', () => {
	let moduleInstance: MockModuleInstance
	let sendMidiToDliveSpy: jest.SpyInstance

	beforeAll(() => {
		moduleInstance = new MockModuleInstance({})
		sendMidiToDliveSpy = jest.spyOn(moduleInstance, 'sendMidiToDlive')
		UpdateActions(moduleInstance as unknown as ModuleInstance)
	})

	beforeEach(() => {
		jest.clearAllMocks()
	})

	const baseAction = {
		options: {},
		actionId: '',
		controlId: '',
		id: '',
	}

	// Test first and last input channel
	const testInputs = [0, INPUT_CHANNEL_COUNT - 1]

	// Test HPF on and off
	const testHpfStates = [true, false]

	describe.each(testInputs)('input %s', (input) => {
		it.each(testHpfStates)('hpf=%s', (hpf) => {
			const setHpfOnOffAction: SetHpfOnOffAction = {
				...baseAction,
				options: {
					input,
					hpf,
				},
			}

			void moduleInstance.actionDefinitions.setHpfOnOff?.callback?.(
				setHpfOnOffAction as CompanionActionEvent,
				{} as CompanionActionContext,
			)

			const { midiChannelOffset, midiNoteOffset } = getMidiOffsetsForChannelType('input')

			expect(sendMidiToDliveSpy).toHaveBeenCalledTimes(1)
			expect(sendMidiToDliveSpy).toHaveBeenCalledWith([
				0xb0 + midiChannelOffset,
				0x63,
				input + midiNoteOffset,
				0x62,
				0x31,
				0x06,
				hpf ? 0x40 : 0x0,
			])
		})
	})
})
