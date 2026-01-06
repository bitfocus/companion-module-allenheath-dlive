import { CompanionActionContext, CompanionActionEvent } from '@companion-module/base'
import { noop } from 'lodash/fp'

import { UpdateActions } from '../../src/actions.js'
import { ModuleInstance } from '../../src/main.js'
import { SetUfxUnitParameterAction } from '../../src/validators/index.js'
import { MockModuleInstance } from '../utils/MockModuleInstance.js'

jest.mock('@companion-module/base', () => {
	class MockInstanceBase {}

	return {
		...jest.requireActual('@companion-module/base'),
		runEntrypoint: noop,
		InstanceBase: MockInstanceBase,
	}
})

describe('setUfxUnitParameter action', () => {
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

	// Test first and last MIDI channel (1-16)
	const testMidiChannels = [1, 16]

	// Test first, middle, and last control number (0-127)
	const testControlNumbers = [0, 63, 127]

	// Test first, middle, and last control value (0-127)
	const testControlValues = [0, 63, 127]

	describe.each(testMidiChannels)('midiChannel=%s', (midiChannel) => {
		it.each(testControlNumbers)('controlNumber=%s, controlValue=0', (controlNumber) => {
			const setUfxUnitParameterAction: SetUfxUnitParameterAction = {
				...baseAction,
				options: {
					midiChannel,
					controlNumber,
					controlValue: 0,
				},
			}

			void moduleInstance.actionDefinitions.setUfxUnitParameter?.callback?.(
				setUfxUnitParameterAction as CompanionActionEvent,
				{} as CompanionActionContext,
			)

			expect(sendMidiToDliveSpy).toHaveBeenCalledTimes(1)
			expect(sendMidiToDliveSpy).toHaveBeenCalledWith([0xb0 + (midiChannel - 1), controlNumber, 0])
		})

		it.each(testControlValues)('controlNumber=0, controlValue=%s', (controlValue) => {
			const setUfxUnitParameterAction: SetUfxUnitParameterAction = {
				...baseAction,
				options: {
					midiChannel,
					controlNumber: 0,
					controlValue,
				},
			}

			void moduleInstance.actionDefinitions.setUfxUnitParameter?.callback?.(
				setUfxUnitParameterAction as CompanionActionEvent,
				{} as CompanionActionContext,
			)

			expect(sendMidiToDliveSpy).toHaveBeenCalledTimes(1)
			expect(sendMidiToDliveSpy).toHaveBeenCalledWith([0xb0 + (midiChannel - 1), 0, controlValue])
		})
	})
})
