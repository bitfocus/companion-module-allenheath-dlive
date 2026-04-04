import { CompanionActionContext, CompanionActionEvent } from '@companion-module/base'
import { camelCase, noop } from 'lodash/fp'

import { UpdateActions } from '../../src/actions.js'
import { FeedbackHandler } from '../../src/FeedbackHandler.js'
import { ModuleInstance } from '../../src/main.js'
import { FaderLevelIncrementAction } from '../../src/validators/index.js'
import { MockModuleInstance } from '../utils/MockModuleInstance.js'

jest.mock('@companion-module/base', () => {
	class MockInstanceBase {}

	return {
		...jest.requireActual('@companion-module/base'),
		runEntrypoint: noop,
		InstanceBase: MockInstanceBase,
	}
})

describe('faderLevelIncrement action', () => {
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

	it('should increment fader level by 1.0 dB from -10 dB', () => {
		// Setup: Current fader at -10 dB (MIDI value ~89)
		const channelType: ChannelType = 'input'
		const channelNo = 0
		const path = 'input:0:fader'

		// Subscribe to the path and set current value to -10 dB (MIDI ~89)
		feedbackHandler.mapFeedback('test_feedback', path)
		feedbackHandler['valueCache'][path] = 89 // -10 dB ≈ MIDI 89

		// Clear mocks after setup (mapFeedback requests channel name)
		jest.clearAllMocks()

		const faderLevelIncrementAction: FaderLevelIncrementAction = {
			...baseAction,
			options: {
				...baseAction.options,
				channelType,
				increment: 1.0,
				[camelCase(channelType)]: channelNo,
			},
		}

		void moduleInstance.actionDefinitions.faderLevelIncrement?.callback?.(
			faderLevelIncrementAction as CompanionActionEvent,
			{} as CompanionActionContext,
		)

		expect(sendMidiToDliveSpy).toHaveBeenCalledTimes(1)
		// New value should be approximately MIDI 91 (-9 dB)
		const calledWithArgs = sendMidiToDliveSpy.mock.calls[0][0]
		expect(calledWithArgs[6]).toBeGreaterThan(89) // Should increase
		expect(calledWithArgs[6]).toBeLessThanOrEqual(92) // Should be around 91
	})

	it('should increment fader level by 2.5 dB from 0 dB', () => {
		// Setup: Current fader at 0 dB (MIDI value 107)
		const channelType: ChannelType = 'input'
		const channelNo = 0
		const path = 'input:0:fader'

		feedbackHandler.mapFeedback('test_feedback', path)
		feedbackHandler['valueCache'][path] = 107 // 0 dB = MIDI 107

		// Clear mocks after setup (mapFeedback requests channel name)
		jest.clearAllMocks()

		const faderLevelIncrementAction: FaderLevelIncrementAction = {
			...baseAction,
			options: {
				...baseAction.options,
				channelType,
				increment: 2.5,
				[camelCase(channelType)]: channelNo,
			},
		}

		void moduleInstance.actionDefinitions.faderLevelIncrement?.callback?.(
			faderLevelIncrementAction as CompanionActionEvent,
			{} as CompanionActionContext,
		)

		expect(sendMidiToDliveSpy).toHaveBeenCalledTimes(1)
		// New value should be approximately MIDI 112 (+2.5 dB)
		const calledWithArgs = sendMidiToDliveSpy.mock.calls[0][0]
		expect(calledWithArgs[6]).toBeGreaterThan(107) // Should increase
		expect(calledWithArgs[6]).toBeLessThanOrEqual(113) // Should be around 112
	})

	it('should clamp at maximum when incrementing beyond +10 dB', () => {
		// Setup: Current fader at +9 dB (MIDI value ~125)
		const channelType: ChannelType = 'input'
		const channelNo = 0
		const path = 'input:0:fader'

		feedbackHandler.mapFeedback('test_feedback', path)
		feedbackHandler['valueCache'][path] = 125 // ~+9 dB

		// Clear mocks after setup (mapFeedback requests channel name)
		jest.clearAllMocks()

		const faderLevelIncrementAction: FaderLevelIncrementAction = {
			...baseAction,
			options: {
				...baseAction.options,
				channelType,
				increment: 3.0,
				[camelCase(channelType)]: channelNo,
			},
		}

		void moduleInstance.actionDefinitions.faderLevelIncrement?.callback?.(
			faderLevelIncrementAction as CompanionActionEvent,
			{} as CompanionActionContext,
		)

		expect(sendMidiToDliveSpy).toHaveBeenCalledTimes(1)
		// Should be clamped at 127 (max MIDI value, +10 dB)
		const calledWithArgs = sendMidiToDliveSpy.mock.calls[0][0]
		expect(calledWithArgs[6]).toBe(127)
	})

	it('should increment from -inf to a valid dB level', () => {
		// Setup: Current fader at -inf (MIDI value 0)
		const channelType: ChannelType = 'input'
		const channelNo = 0
		const path = 'input:0:fader'

		feedbackHandler.mapFeedback('test_feedback', path)
		feedbackHandler['valueCache'][path] = 0 // -inf

		// Clear mocks after setup (mapFeedback requests channel name)
		jest.clearAllMocks()

		const faderLevelIncrementAction: FaderLevelIncrementAction = {
			...baseAction,
			options: {
				...baseAction.options,
				channelType,
				increment: 1.0,
				[camelCase(channelType)]: channelNo,
			},
		}

		void moduleInstance.actionDefinitions.faderLevelIncrement?.callback?.(
			faderLevelIncrementAction as CompanionActionEvent,
			{} as CompanionActionContext,
		)

		expect(sendMidiToDliveSpy).toHaveBeenCalledTimes(1)
		// Should increment from -54 dB (treating -inf as -54) by 1.0 dB to -53 dB
		// -53 dB in MIDI is approximately 2
		const calledWithArgs = sendMidiToDliveSpy.mock.calls[0][0]
		expect(calledWithArgs[6]).toBeGreaterThan(0) // Should not stay at 0
		expect(calledWithArgs[6]).toBeLessThanOrEqual(3) // Should be around 2
	})

	it('should request fader level when current value is unavailable', () => {
		const channelType: ChannelType = 'input'
		const channelNo = 0

		// Don't set up feedback - no current value available

		const faderLevelIncrementAction: FaderLevelIncrementAction = {
			...baseAction,
			options: {
				...baseAction.options,
				channelType,
				increment: 1.0,
				[camelCase(channelType)]: channelNo,
			},
		}

		void moduleInstance.actionDefinitions.faderLevelIncrement?.callback?.(
			faderLevelIncrementAction as CompanionActionEvent,
			{} as CompanionActionContext,
		)

		// Should send 3 SysEx Get commands:
		// 1. Channel name (from subscribeToParameter)
		// 2. Fader level (from subscribeToParameter)
		// 3. Fader level again (from action callback when value not in cache)
		expect(sendMidiToDliveSpy).toHaveBeenCalledTimes(3)

		// First call should be Get Channel Name
		const channelNameCall = sendMidiToDliveSpy.mock.calls[0][0]
		expect(channelNameCall[9]).toBe(0x01) // Get channel name command

		// Second call should be Get Fader Level (from subscription)
		const faderLevelCall = sendMidiToDliveSpy.mock.calls[1][0]
		// SysEx format: Header, 0N, 05, 0B, 17, CH, F7
		expect(faderLevelCall[0]).toBe(0xf0) // SysEx start
		expect(faderLevelCall[8]).toBe(0x00) // MIDI channel offset (0 for input)
		expect(faderLevelCall[9]).toBe(0x05) // Get command
		expect(faderLevelCall[10]).toBe(0x0b) // Fader parameter
		expect(faderLevelCall[11]).toBe(0x17) // Fader sub-parameter
		expect(faderLevelCall[12]).toBe(channelNo) // Channel number
		expect(faderLevelCall[13]).toBe(0xf7) // SysEx end

		// Third call should also be Get Fader Level (from action callback)
		const faderLevelCall2 = sendMidiToDliveSpy.mock.calls[2][0]
		expect(faderLevelCall2[9]).toBe(0x05) // Get command
		expect(faderLevelCall2[10]).toBe(0x0b) // Fader parameter
	})
})
