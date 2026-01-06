import { CompanionActionContext, CompanionActionEvent } from '@companion-module/base'
import { noop } from 'lodash/fp'

import { UpdateActions } from '../../src/actions.js'
import { ModuleInstance } from '../../src/main.js'
import { SetUfxGlobalScaleAction } from '../../src/validators/index.js'
import { MockModuleInstance } from '../utils/MockModuleInstance.js'

jest.mock('@companion-module/base', () => {
	class MockInstanceBase {}

	return {
		...jest.requireActual('@companion-module/base'),
		runEntrypoint: noop,
		InstanceBase: MockInstanceBase,
	}
})

describe('setUfxGlobalScale action', () => {
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

	// Test both scales
	const testScales: [string, number][] = [
		['Major', 0x00],
		['Minor', 0x01],
	]

	it.each(testScales)('scale=%s', (_scaleName, scale) => {
		const setUfxGlobalScaleAction: SetUfxGlobalScaleAction = {
			...baseAction,
			options: {
				scale,
			},
		}

		void moduleInstance.actionDefinitions.setUfxGlobalScale?.callback?.(
			setUfxGlobalScaleAction as CompanionActionEvent,
			{} as CompanionActionContext,
		)

		expect(sendMidiToDliveSpy).toHaveBeenCalledTimes(1)
		expect(sendMidiToDliveSpy).toHaveBeenCalledWith([0xb0, 0x0d, scale])
	})
})
