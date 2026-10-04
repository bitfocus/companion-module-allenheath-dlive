import type { CompanionBooleanFeedbackDefinition, CompanionFeedbackBooleanEvent } from '@companion-module/base'
import { noop } from 'lodash/fp'

import { INPUT_CHANNEL_COUNT } from '../src/constants.js'
import { FeedbackHandler } from '../src/FeedbackHandler.js'
import { UpdateFeedbacks } from '../src/feedbacks.js'
import { ModuleInstance } from '../src/main.js'
import { MockModuleInstance } from './utils/MockModuleInstance.js'

jest.mock('@companion-module/base', () => {
	class MockInstanceBase {}

	return {
		...jest.requireActual('@companion-module/base'),
		runEntrypoint: noop,
		InstanceBase: MockInstanceBase,
	}
})

describe('feedbacks', () => {
	let moduleInstance: MockModuleInstance
	let feedbackHandler: FeedbackHandler
	let checkFeedbacksByIdSpy: jest.SpyInstance
	let logSpy: jest.SpyInstance

	beforeAll(() => {
		moduleInstance = new MockModuleInstance({})
		feedbackHandler = new FeedbackHandler(moduleInstance as unknown as ModuleInstance)
		moduleInstance.feedbackHandler = feedbackHandler
		checkFeedbacksByIdSpy = jest.spyOn(moduleInstance, 'checkFeedbacksById')
		logSpy = jest.spyOn(moduleInstance, 'log')
		UpdateFeedbacks(moduleInstance as unknown as ModuleInstance)
	})

	beforeEach(() => {
		jest.clearAllMocks()
		feedbackHandler.clear()
	})

	const baseChannelOptions = {
		input: 0,
		monoGroup: 0,
		stereoGroup: 0,
		monoAux: 0,
		stereoAux: 0,
		monoMatrix: 0,
		stereoMatrix: 0,
		monoFxSend: 0,
		stereoFxSend: 0,
		fxReturn: 0,
		main: 0,
		dca: 0,
		muteGroup: 0,
		stereoUfxSend: 0,
		stereoUfxReturn: 0,
	}

	const makeMuteEvent = (overrides: Record<string, number | string> = {}): CompanionFeedbackBooleanEvent =>
		({
			type: 'boolean',
			id: 'feedback1',
			feedbackId: 'channel_muted',
			controlId: 'control1',
			options: {
				channelType: 'input',
				...baseChannelOptions,
				...overrides,
			},
		}) as unknown as CompanionFeedbackBooleanEvent

	const getMuteDefinition = (): CompanionBooleanFeedbackDefinition =>
		moduleInstance.feedbackDefinitions.channel_muted as CompanionBooleanFeedbackDefinition

	it('reports mute state for the subscribed channel', () => {
		const definition = getMuteDefinition()
		const event = makeMuteEvent()

		void definition.subscribe?.(event, {} as never)
		expect(definition.callback(event, {} as never)).toBe(false)

		// Console reports input 1 muted: Note On, note 0x00, velocity 0x7F (+ running status Note Off)
		feedbackHandler.processMidiData(Buffer.from([0x90, 0x00, 0x7f, 0x00, 0x00]))

		expect(checkFeedbacksByIdSpy).toHaveBeenCalledWith('feedback1')
		expect(definition.callback(event, {} as never)).toBe(true)
	})

	it('follows the new channel when options are edited without a re-subscribe (input 128)', () => {
		const definition = getMuteDefinition()

		// Feedback initially created for input 1 (channel index 0)
		void definition.subscribe?.(makeMuteEvent(), {} as never)

		// The user edits the feedback to input 128. Companion does NOT call subscribe again
		// on an options edit - it only re-runs the callback with the new options.
		const editedEvent = makeMuteEvent({ input: 127 })
		expect(definition.callback(editedEvent, {} as never)).toBe(false)

		// Console reports input 128 muted: Note On, note 0x7F, velocity 0x7F (+ running status Note Off)
		checkFeedbacksByIdSpy.mockClear()
		feedbackHandler.processMidiData(Buffer.from([0x90, 0x7f, 0x7f, 0x7f, 0x00]))

		// The feedback must be re-checked (this was the reported bug: the variable updated
		// but the button state did not, because the feedback was still mapped to input 1)
		expect(checkFeedbacksByIdSpy).toHaveBeenCalledWith('feedback1')
		expect(definition.callback(editedEvent, {} as never)).toBe(true)
	})

	it('logs an error and reports false when the feedback options are invalid', () => {
		const definition = getMuteDefinition()
		const event = makeMuteEvent({ input: INPUT_CHANNEL_COUNT }) // Out of range (0-based)

		void definition.subscribe?.(event, {} as never)
		expect(definition.callback(event, {} as never)).toBe(false)

		expect(logSpy).toHaveBeenCalledWith('error', expect.stringContaining('Invalid channel_muted feedback feedback1'))
		expect(feedbackHandler['feedbackMap']).toEqual({})
	})

	it('reports the fader level condition for the subscribed channel', () => {
		const definition = moduleInstance.feedbackDefinitions.fader_level as CompanionBooleanFeedbackDefinition
		const event = {
			type: 'boolean',
			id: 'feedback1',
			feedbackId: 'fader_level',
			controlId: 'control1',
			options: { channelType: 'input', ...baseChannelOptions, condition: 'gte', level: 107 },
		} as unknown as CompanionFeedbackBooleanEvent

		void definition.subscribe?.(event, {} as never)

		// Console reports input 1 fader at 0 dB (MIDI 107), then below it (MIDI 100)
		feedbackHandler.processMidiData(Buffer.from([0xb0, 0x63, 0x00, 0x62, 0x17, 0x06, 0x6b]))
		expect(definition.callback(event, {} as never)).toBe(true)
		feedbackHandler.processMidiData(Buffer.from([0xb0, 0x63, 0x00, 0x62, 0x17, 0x06, 0x64]))
		expect(definition.callback(event, {} as never)).toBe(false)
	})
})
