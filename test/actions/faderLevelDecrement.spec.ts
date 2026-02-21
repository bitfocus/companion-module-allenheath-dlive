import { CompanionActionContext, CompanionActionEvent } from '@companion-module/base'
import { camelCase, noop } from 'lodash/fp'

import { UpdateActions } from '../../src/actions.js'
import { FeedbackHandler } from '../../src/FeedbackHandler.js'
import { ModuleInstance } from '../../src/main.js'
import { FaderLevelDecrementAction } from '../../src/validators/index.js'
import { MockModuleInstance } from '../utils/MockModuleInstance.js'

jest.mock('@companion-module/base', () => {
	class MockInstanceBase {}

	return {
		...jest.requireActual('@companion-module/base'),
		runEntrypoint: noop,
		InstanceBase: MockInstanceBase,
	}
})

describe('faderLevelDecrement action', () => {
	let moduleInstance: MockModuleInstance
	let sendMidiToDliveSpy: jest.SpyInstance
	let feedbackHandler: FeedbackHandler

	beforeAll(() => {
		moduleInstance = new MockModuleInstance({})
		sendMidiToDliveSpy = jest.spyOn(moduleInstance, 'sendMidiToDlive')
		feedbackHandler = new FeedbackHandler(moduleInstance as unknown as ModuleInstance)
		moduleInstance.feedbackHandler = feedbackHandler
		UpdateActions(moduleInstance as unknown as ModuleInstance)
	})

	beforeEach(() => {
		jest.clearAllMocks()
		feedbackHandler.clear()
	})

	const baseAction = {
		options: {
			dca: 0,
			fxReturn: 0,
			input: 0,
			main: 0,
			monoAux: 0,
			stereoAux: 0,
			monoFxSend: 0,
			stereoFxSend: 0,
			monoGroup: 0,
			stereoGroup: 0,
			stereoMatrix: 0,
			monoMatrix: 0,
			muteGroup: 0,
			stereoUfxReturn: 0,
			stereoUfxSend: 0,
		},
		actionId: '',
		controlId: '',
		id: '',
	}

	it('should decrement fader level by 1.0 dB from -10 dB', () => {
		// Setup: Current fader at -10 dB (MIDI value ~89)
		const channelType: ChannelType = 'input'
		const channelNo = 0
		const path = 'input:0:fader'

		// Subscribe to the path and set current value to -10 dB (MIDI ~89)
		feedbackHandler.mapFeedback('test_feedback', path)
		feedbackHandler['valueCache'][path] = 89 // -10 dB ≈ MIDI 89

		// Clear mocks after setup (mapFeedback requests channel name)
		jest.clearAllMocks()

		const faderLevelDecrementAction: FaderLevelDecrementAction = {
			...baseAction,
			options: {
				...baseAction.options,
				channelType,
				decrement: 1.0,
				[camelCase(channelType)]: channelNo,
			},
		}

		void moduleInstance.actionDefinitions.faderLevelDecrement?.callback?.(
			faderLevelDecrementAction as CompanionActionEvent,
			{} as CompanionActionContext,
		)

		expect(sendMidiToDliveSpy).toHaveBeenCalledTimes(1)
		// New value should be approximately MIDI 87 (-11 dB)
		const calledWithArgs = sendMidiToDliveSpy.mock.calls[0][0]
		expect(calledWithArgs[6]).toBeLessThan(89) // Should decrease
		expect(calledWithArgs[6]).toBeGreaterThanOrEqual(86) // Should be around 87
	})

	it('should decrement fader level by 2.5 dB from 0 dB', () => {
		// Setup: Current fader at 0 dB (MIDI value 107)
		const channelType: ChannelType = 'input'
		const channelNo = 0
		const path = 'input:0:fader'

		feedbackHandler.mapFeedback('test_feedback', path)
		feedbackHandler['valueCache'][path] = 107 // 0 dB = MIDI 107

		// Clear mocks after setup (mapFeedback requests channel name)
		jest.clearAllMocks()

		const faderLevelDecrementAction: FaderLevelDecrementAction = {
			...baseAction,
			options: {
				...baseAction.options,
				channelType,
				decrement: 2.5,
				[camelCase(channelType)]: channelNo,
			},
		}

		void moduleInstance.actionDefinitions.faderLevelDecrement?.callback?.(
			faderLevelDecrementAction as CompanionActionEvent,
			{} as CompanionActionContext,
		)

		expect(sendMidiToDliveSpy).toHaveBeenCalledTimes(1)
		// New value should be approximately MIDI 102 (-2.5 dB)
		const calledWithArgs = sendMidiToDliveSpy.mock.calls[0][0]
		expect(calledWithArgs[6]).toBeLessThan(107) // Should decrease
		expect(calledWithArgs[6]).toBeGreaterThanOrEqual(101) // Should be around 102
	})

	it('should clamp at minimum when decrementing below -inf', () => {
		// Setup: Current fader at -52 dB (MIDI value ~4)
		const channelType: ChannelType = 'input'
		const channelNo = 0
		const path = 'input:0:fader'

		feedbackHandler.mapFeedback('test_feedback', path)
		feedbackHandler['valueCache'][path] = 4 // ~-52 dB

		// Clear mocks after setup (mapFeedback requests channel name)
		jest.clearAllMocks()

		const faderLevelDecrementAction: FaderLevelDecrementAction = {
			...baseAction,
			options: {
				...baseAction.options,
				channelType,
				decrement: 3.0,
				[camelCase(channelType)]: channelNo,
			},
		}

		void moduleInstance.actionDefinitions.faderLevelDecrement?.callback?.(
			faderLevelDecrementAction as CompanionActionEvent,
			{} as CompanionActionContext,
		)

		expect(sendMidiToDliveSpy).toHaveBeenCalledTimes(1)
		// Should be clamped at 0 (min MIDI value, -inf)
		const calledWithArgs = sendMidiToDliveSpy.mock.calls[0][0]
		expect(calledWithArgs[6]).toBe(0)
	})

	it('should request fader level when current value is unavailable', () => {
		const channelType: ChannelType = 'input'
		const channelNo = 0

		// Don't set up feedback - no current value available

		const faderLevelDecrementAction: FaderLevelDecrementAction = {
			...baseAction,
			options: {
				...baseAction.options,
				channelType,
				decrement: 1.0,
				[camelCase(channelType)]: channelNo,
			},
		}

		void moduleInstance.actionDefinitions.faderLevelDecrement?.callback?.(
			faderLevelDecrementAction as CompanionActionEvent,
			{} as CompanionActionContext,
		)

		// Should send 2 SysEx Get commands: 1 for channel name, 1 for fader level
		expect(sendMidiToDliveSpy).toHaveBeenCalledTimes(2)

		// First call should be Get Channel Name
		const channelNameCall = sendMidiToDliveSpy.mock.calls[0][0]
		expect(channelNameCall[9]).toBe(0x01) // Get channel name command

		// Second call should be Get Fader Level
		const faderLevelCall = sendMidiToDliveSpy.mock.calls[1][0]
		// SysEx format: Header, 0N, 05, 0B, 17, CH, F7
		expect(faderLevelCall[0]).toBe(0xf0) // SysEx start
		expect(faderLevelCall[8]).toBe(0x00) // MIDI channel offset (0 for input)
		expect(faderLevelCall[9]).toBe(0x05) // Get command
		expect(faderLevelCall[10]).toBe(0x0b) // Fader parameter
		expect(faderLevelCall[11]).toBe(0x17) // Fader sub-parameter
		expect(faderLevelCall[12]).toBe(channelNo) // Channel number
		expect(faderLevelCall[13]).toBe(0xf7) // SysEx end
	})
})
