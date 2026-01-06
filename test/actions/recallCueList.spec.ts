import { CompanionActionContext, CompanionActionEvent } from '@companion-module/base'
import { noop } from 'lodash/fp'

import { UpdateActions } from '../../src/actions.js'
import { CUE_LIST_COUNT, CUE_LISTS_PER_BANK } from '../../src/constants.js'
import { ModuleInstance } from '../../src/main.js'
import { RecallCueListAction } from '../../src/validators/index.js'
import { MockModuleInstance } from '../utils/MockModuleInstance.js'

jest.mock('@companion-module/base', () => {
	class MockInstanceBase {}

	return {
		...jest.requireActual('@companion-module/base'),
		runEntrypoint: noop,
		InstanceBase: MockInstanceBase,
	}
})

describe('recallCueList action', () => {
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

	// Test cue lists: first, last in first bank, first in second bank, last in bank 15, and last overall
	const testCueLists = [
		0, // First cue list,
		CUE_LISTS_PER_BANK - 1, // Last cue list in first bank (127)
		CUE_LISTS_PER_BANK, // First cue list in second bank (128)
		CUE_LIST_COUNT - 1, // Last cue list overall (1998)
	]

	it.each(testCueLists)('cue list %s', (recallId) => {
		const recallCueListAction: RecallCueListAction = {
			...baseAction,
			options: {
				recallId,
			},
		}

		void moduleInstance.actionDefinitions.recallCueList?.callback?.(
			recallCueListAction as CompanionActionEvent,
			{} as CompanionActionContext,
		)

		const recallBankNo = Math.min(15, Math.floor(recallId / CUE_LISTS_PER_BANK))
		const recallIdInBank = recallId % CUE_LISTS_PER_BANK

		expect(sendMidiToDliveSpy).toHaveBeenCalledTimes(1)
		expect(sendMidiToDliveSpy).toHaveBeenCalledWith([0xb0, 0, recallBankNo, 0xc0, recallIdInBank])
	})
})
