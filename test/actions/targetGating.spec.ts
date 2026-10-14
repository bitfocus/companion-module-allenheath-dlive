import { CompanionActionContext, CompanionActionEvent } from '@companion-module/base'
import { noop } from 'lodash/fp'

import { UpdateActions } from '../../src/actions.js'
import { ModuleInstance } from '../../src/main.js'
import { SetMidiTransportAction } from '../../src/validators/index.js'
import { MockModuleInstance } from '../utils/MockModuleInstance.js'

jest.mock('@companion-module/base', () => {
	class MockInstanceBase {}

	return {
		...jest.requireActual('@companion-module/base'),
		runEntrypoint: noop,
		InstanceBase: MockInstanceBase,
	}
})

describe('connection target action gating', () => {
	const makeInstance = (target?: ConnectionTarget): MockModuleInstance => {
		const moduleInstance = new MockModuleInstance({})
		if (target) {
			moduleInstance.config = { host: '192.168.1.70', target, useCustomPort: false, midiPort: 51325, midiChannel: 0 }
		}
		UpdateActions(moduleInstance as unknown as ModuleInstance)
		return moduleInstance
	}

	it('offers all actions when no config is available', () => {
		const moduleInstance = makeInstance()
		expect(moduleInstance.actionDefinitions.recallScene).toBeDefined()
		expect(moduleInstance.actionDefinitions.recallCueList).toBeDefined()
		expect(moduleInstance.actionDefinitions.goNextPrevious).toBeDefined()
	})

	it('offers scene recall but not cue list recall or go/next/previous for a MixRack target', () => {
		const moduleInstance = makeInstance('mixrack')
		expect(moduleInstance.actionDefinitions.recallScene).toBeDefined()
		expect(moduleInstance.actionDefinitions.recallCueList).toBeUndefined()
		expect(moduleInstance.actionDefinitions.goNextPrevious).toBeUndefined()
	})

	it('offers cue list recall and go/next/previous but not scene recall for a Surface target', () => {
		const moduleInstance = makeInstance('surface')
		expect(moduleInstance.actionDefinitions.recallScene).toBeUndefined()
		expect(moduleInstance.actionDefinitions.recallCueList).toBeDefined()
		expect(moduleInstance.actionDefinitions.goNextPrevious).toBeDefined()
	})

	it('offers the MIDI transport action for both targets', () => {
		expect(makeInstance('mixrack').actionDefinitions.midiTransport).toBeDefined()
		expect(makeInstance('surface').actionDefinitions.midiTransport).toBeDefined()
	})
})

describe('midiTransport action', () => {
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

	// Standard MMC command numbers
	const testCommands = [
		[0x01, 'stop'],
		[0x02, 'play'],
		[0x06, 'record strobe'],
	] as const

	it.each(testCommands)('sends an MMC message for command %s (%s)', (transport) => {
		const midiTransportAction: SetMidiTransportAction = {
			...baseAction,
			options: {
				transport,
			},
		}

		void moduleInstance.actionDefinitions.midiTransport?.callback?.(
			midiTransportAction as CompanionActionEvent,
			{} as CompanionActionContext,
		)

		expect(sendMidiToDliveSpy).toHaveBeenCalledTimes(1)
		// Standard MMC: F0 7F <deviceId=7F all-call> 06 <command> F7
		expect(sendMidiToDliveSpy).toHaveBeenCalledWith([0xf0, 0x7f, 0x7f, 0x06, transport, 0xf7])
	})
})
