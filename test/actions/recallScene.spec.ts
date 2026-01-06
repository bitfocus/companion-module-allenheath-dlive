import { CompanionActionContext, CompanionActionEvent } from '@companion-module/base'
import { noop } from 'lodash/fp'

import { UpdateActions } from '../../src/actions.js'
import { SCENE_COUNT, SCENES_PER_BANK } from '../../src/constants.js'
import { ModuleInstance } from '../../src/main.js'
import { RecallSceneAction } from '../../src/validators/index.js'
import { MockModuleInstance } from '../utils/MockModuleInstance.js'

jest.mock('@companion-module/base', () => {
	class MockInstanceBase {}

	return {
		...jest.requireActual('@companion-module/base'),
		runEntrypoint: noop,
		InstanceBase: MockInstanceBase,
	}
})

describe('recallScene action', () => {
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

	// Test scenes: first, last in first bank, first in second bank, last in second bank, and last overall
	const testScenes = [
		0, // First scene
		SCENES_PER_BANK - 1, // Last scene in first bank (127)
		SCENES_PER_BANK, // First scene in second bank (128)
		SCENES_PER_BANK * 2 - 1, // Last scene in second bank (255)
		SCENE_COUNT - 1, // Last scene overall (499)
	]

	it.each(testScenes)('scene %s', (sceneNo) => {
		const recallSceneAction: RecallSceneAction = {
			...baseAction,
			options: {
				scene: sceneNo,
			},
		}

		void moduleInstance.actionDefinitions.recallScene?.callback?.(
			recallSceneAction as CompanionActionEvent,
			{} as CompanionActionContext,
		)

		const sceneBankNo = Math.floor(sceneNo / SCENES_PER_BANK)
		const sceneNoInBank = sceneNo % SCENES_PER_BANK

		expect(sendMidiToDliveSpy).toHaveBeenCalledTimes(1)
		expect(sendMidiToDliveSpy).toHaveBeenCalledWith([0xb0, 0, sceneBankNo, 0xc0, sceneNoInBank])
	})
})
