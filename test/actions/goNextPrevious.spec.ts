import { CompanionActionContext, CompanionActionEvent } from '@companion-module/base'
import { noop } from 'lodash/fp'

import { UpdateActions } from '../../src/actions.js'
import { ModuleInstance } from '../../src/main.js'
import { GoNextPreviousAction } from '../../src/validators/index.js'
import { MockModuleInstance } from '../utils/MockModuleInstance.js'

jest.mock('@companion-module/base', () => {
	class MockInstanceBase {}

	return {
		...jest.requireActual('@companion-module/base'),
		runEntrypoint: noop,
		InstanceBase: MockInstanceBase,
	}
})

describe('goNextPrevious action', () => {
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

	// Test control numbers: first, middle, and last
	const testControlNumbers = [0, 63, 127]

	// Test control values: first, middle, and last
	const testControlValues = [0, 63, 127]

	describe.each(testControlNumbers)('control number %s', (controlNumber) => {
		it.each(testControlValues)('control value %s', (controlValue) => {
			const goNextPreviousAction: GoNextPreviousAction = {
				...baseAction,
				options: {
					controlNumber,
					controlValue,
				},
			}

			void moduleInstance.actionDefinitions.goNextPrevious?.callback?.(
				goNextPreviousAction as CompanionActionEvent,
				{} as CompanionActionContext,
			)

			expect(sendMidiToDliveSpy).toHaveBeenCalledTimes(1)
			expect(sendMidiToDliveSpy).toHaveBeenCalledWith([0xb0, controlNumber, controlValue])
		})
	})
})
