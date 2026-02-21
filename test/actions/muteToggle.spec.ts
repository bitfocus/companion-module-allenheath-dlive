import { CompanionActionContext, CompanionActionEvent } from '@companion-module/base'
import { camelCase, noop } from 'lodash/fp'

import { UpdateActions } from '../../src/actions.js'
import { FeedbackHandler } from '../../src/FeedbackHandler.js'
import { ModuleInstance } from '../../src/main.js'
import { MuteToggleAction } from '../../src/validators/index.js'
import { MockModuleInstance } from '../utils/MockModuleInstance.js'

jest.mock('@companion-module/base', () => {
	class MockInstanceBase {}

	return {
		...jest.requireActual('@companion-module/base'),
		runEntrypoint: noop,
		InstanceBase: MockInstanceBase,
	}
})

describe('muteToggle action', () => {
	let moduleInstance: MockModuleInstance
	let processCommandSpy: jest.SpyInstance
	let feedbackHandler: FeedbackHandler

	beforeAll(() => {
		moduleInstance = new MockModuleInstance({})
		processCommandSpy = jest.spyOn(moduleInstance, 'processCommand')
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

	it('should toggle mute from unmuted to muted', () => {
		// Setup: Current mute state is false (unmuted)
		const channelType: ChannelType = 'input'
		const channelNo = 0
		const path = 'input:0:mute'

		// Subscribe to the path and set current value to false (unmuted)
		feedbackHandler.mapFeedback('test_feedback', path)
		feedbackHandler['valueCache'][path] = false

		const muteToggleAction: MuteToggleAction = {
			...baseAction,
			options: {
				...baseAction.options,
				channelType,
				[camelCase(channelType)]: channelNo,
			},
		}

		void moduleInstance.actionDefinitions.muteToggle?.callback?.(
			muteToggleAction as CompanionActionEvent,
			{} as CompanionActionContext,
		)

		expect(processCommandSpy).toHaveBeenCalledTimes(1)
		expect(processCommandSpy).toHaveBeenCalledWith({
			command: 'mute_on',
			params: {
				channelType: 'input',
				channelNo: 0,
			},
		})
	})

	it('should toggle mute from muted to unmuted', () => {
		// Setup: Current mute state is true (muted)
		const channelType: ChannelType = 'input'
		const channelNo = 0
		const path = 'input:0:mute'

		// Subscribe to the path and set current value to true (muted)
		feedbackHandler.mapFeedback('test_feedback', path)
		feedbackHandler['valueCache'][path] = true

		const muteToggleAction: MuteToggleAction = {
			...baseAction,
			options: {
				...baseAction.options,
				channelType,
				[camelCase(channelType)]: channelNo,
			},
		}

		void moduleInstance.actionDefinitions.muteToggle?.callback?.(
			muteToggleAction as CompanionActionEvent,
			{} as CompanionActionContext,
		)

		expect(processCommandSpy).toHaveBeenCalledTimes(1)
		expect(processCommandSpy).toHaveBeenCalledWith({
			command: 'mute_off',
			params: {
				channelType: 'input',
				channelNo: 0,
			},
		})
	})

	it('should work with different channel types', () => {
		// Test with mono_group channel
		const channelType: ChannelType = 'mono_group'
		const channelNo = 2
		const path = 'mono_group:2:mute'

		feedbackHandler.mapFeedback('test_feedback', path)
		feedbackHandler['valueCache'][path] = false

		const muteToggleAction: MuteToggleAction = {
			...baseAction,
			options: {
				...baseAction.options,
				channelType,
				[camelCase(channelType)]: channelNo,
			},
		}

		void moduleInstance.actionDefinitions.muteToggle?.callback?.(
			muteToggleAction as CompanionActionEvent,
			{} as CompanionActionContext,
		)

		expect(processCommandSpy).toHaveBeenCalledTimes(1)
		expect(processCommandSpy).toHaveBeenCalledWith({
			command: 'mute_on',
			params: {
				channelType: 'mono_group',
				channelNo: 2,
			},
		})
	})

	it('should request mute status when current value is unavailable', () => {
		const channelType: ChannelType = 'input'
		const channelNo = 5

		// Don't set up feedback - no current value available
		feedbackHandler.clear()

		const sendMidiToDliveSpy = jest.spyOn(moduleInstance, 'sendMidiToDlive')

		const muteToggleAction: MuteToggleAction = {
			...baseAction,
			options: {
				...baseAction.options,
				channelType,
				[camelCase(channelType)]: channelNo,
			},
		}

		void moduleInstance.actionDefinitions.muteToggle?.callback?.(
			muteToggleAction as CompanionActionEvent,
			{} as CompanionActionContext,
		)

		// Should not send mute command
		expect(processCommandSpy).not.toHaveBeenCalled()

		// Should send 2 SysEx Get commands: 1 for channel name, 1 for mute status
		expect(sendMidiToDliveSpy).toHaveBeenCalledTimes(2)

		// First call should be Get Channel Name
		const channelNameCall = sendMidiToDliveSpy.mock.calls[0][0]
		expect(channelNameCall[9]).toBe(0x01) // Get channel name command

		// Second call should be Get Mute Status
		const muteStatusCall = sendMidiToDliveSpy.mock.calls[1][0]
		// SysEx format: Header, 0N, 05, 09, CH, F7
		expect(muteStatusCall[0]).toBe(0xf0) // SysEx start
		expect(muteStatusCall[8]).toBe(0x00) // MIDI channel offset (0 for input)
		expect(muteStatusCall[9]).toBe(0x05) // Get command
		expect(muteStatusCall[10]).toBe(0x09) // Mute parameter
		expect(muteStatusCall[11]).toBe(channelNo) // Channel number
		expect(muteStatusCall[12]).toBe(0xf7) // SysEx end
	})
})
