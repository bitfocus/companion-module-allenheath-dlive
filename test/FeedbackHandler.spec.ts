import { FeedbackHandler } from '../src/FeedbackHandler.js'
import type { ModuleInstance } from '../src/main.js'

describe('FeedbackHandler', () => {
	let feedbackHandler: FeedbackHandler
	let mockModule: jest.Mocked<ModuleInstance>

	beforeEach(() => {
		mockModule = {
			log: jest.fn(),
			checkFeedbacksById: jest.fn(),
			setVariableValues: jest.fn(),
			setVariableDefinitions: jest.fn(),
			sendMidiToDlive: jest.fn(),
			requestChannelName: jest.fn(),
			baseMidiChannel: 0,
		} as unknown as jest.Mocked<ModuleInstance>

		feedbackHandler = new FeedbackHandler(mockModule)
	})

	describe('mapFeedback', () => {
		it('should subscribe to a parameter path', () => {
			feedbackHandler.mapFeedback('feedback1', 'input:0:mute')

			// Should be called once with both parameter and channel name variables
			expect(mockModule.setVariableDefinitions).toHaveBeenCalledTimes(1)
			expect(mockModule.setVariableDefinitions).toHaveBeenCalledWith([
				{ variableId: 'dlive_input_1_mute', name: 'dLive: input:0:mute' },
				{ variableId: 'dlive_input_1_name', name: 'dLive: input:0:name' },
			])
		})

		it('should not subscribe twice to the same path', () => {
			feedbackHandler.mapFeedback('feedback1', 'input:0:mute')
			feedbackHandler.mapFeedback('feedback1', 'input:0:mute')

			expect(mockModule.log).toHaveBeenCalledWith('debug', 'Feedback feedback1 already subscribed to input:0:mute')
		})

		it('should track multiple subscriptions to the same path', () => {
			feedbackHandler.mapFeedback('feedback1', 'input:0:mute')
			feedbackHandler.mapFeedback('feedback2', 'input:0:mute')

			// Should only update variables once (for the first subscription)
			// Second subscription increments usage count but doesn't update variables
			expect(mockModule.setVariableDefinitions).toHaveBeenCalledTimes(1)
		})

		it('should handle feedback path changes (re-subscription)', () => {
			// Subscribe to input 0
			feedbackHandler.mapFeedback('feedback1', 'input:0:mute')

			// Clear mocks to track new calls
			jest.clearAllMocks()

			// Change to input 1 (should unsubscribe from input:0:mute and subscribe to input:1:mute)
			feedbackHandler.mapFeedback('feedback1', 'input:1:mute')

			// Should have logged the change
			expect(mockModule.log).toHaveBeenCalledWith('debug', 'Feedback feedback1 changing from input:0:mute to input:1:mute')

			// Should update variables twice:
			// 1st call: empty array (after removing input:0:mute)
			// 2nd call: input:1:mute + input:1:name (after subscribing to input:1:mute)
			expect(mockModule.setVariableDefinitions).toHaveBeenCalledTimes(2)

			// First call should have empty array (removing input:0:mute)
			expect(mockModule.setVariableDefinitions).toHaveBeenNthCalledWith(1, [])

			// Second call should have the new variables (adding input:1:mute + input:1:name)
			expect(mockModule.setVariableDefinitions).toHaveBeenNthCalledWith(2, [
				{ variableId: 'dlive_input_2_mute', name: 'dLive: input:1:mute' },
				{ variableId: 'dlive_input_2_name', name: 'dLive: input:1:name' },
			])
		})
	})

	describe('removeFeedback', () => {
		it('should unsubscribe when all feedbacks are removed', () => {
			feedbackHandler.mapFeedback('feedback1', 'input:0:mute')
			feedbackHandler.removeFeedback('feedback1', 'input:0:mute')

			// Should update variables twice (once on subscribe with parameter + channel name, once on unsubscribe)
			expect(mockModule.setVariableDefinitions).toHaveBeenCalledTimes(2)
			// Last call should have empty array
			expect(mockModule.setVariableDefinitions).toHaveBeenLastCalledWith([])
		})

		it('should keep subscription if other feedbacks still need it', () => {
			feedbackHandler.mapFeedback('feedback1', 'input:0:mute')
			feedbackHandler.mapFeedback('feedback2', 'input:0:mute')
			feedbackHandler.removeFeedback('feedback1', 'input:0:mute')

			// Should still have both variables defined
			expect(mockModule.setVariableDefinitions).toHaveBeenLastCalledWith([
				{ variableId: 'dlive_input_1_mute', name: 'dLive: input:0:mute' },
				{ variableId: 'dlive_input_1_name', name: 'dLive: input:0:name' },
			])
		})
	})

	describe('getValue', () => {
		it('should return null for non-existent values', () => {
			const value = feedbackHandler.getValue('input:0:mute')
			expect(value).toBeNull()
		})

		it('should return cached value after processing MIDI', () => {
			feedbackHandler.mapFeedback('feedback1', 'input:0:mute')

			// Simulate receiving a mute on message (Note On with velocity >= 0x40)
			const midiData = Buffer.from([0x90, 0x00, 0x7f])
			feedbackHandler.processMidiData(midiData)

			const value = feedbackHandler.getValue('input:0:mute')
			expect(value).toBe(true)
		})
	})

	describe('processMidiData', () => {
		beforeEach(() => {
			feedbackHandler.mapFeedback('feedback1', 'input:0:mute')
		})

		it('should parse Note On message for mute status (muted)', () => {
			const midiData = Buffer.from([0x90, 0x00, 0x7f]) // Note On, channel 1, note 0, velocity 127
			feedbackHandler.processMidiData(midiData)

			expect(mockModule.checkFeedbacksById).toHaveBeenCalledWith('feedback1')
			expect(mockModule.setVariableValues).toHaveBeenCalledWith({
				dlive_input_1_mute: true,
			})
		})

		it('should parse Note On message for mute status (unmuted)', () => {
			const midiData = Buffer.from([0x90, 0x00, 0x3f]) // Note On, channel 1, note 0, velocity 63
			feedbackHandler.processMidiData(midiData)

			expect(mockModule.checkFeedbacksById).toHaveBeenCalledWith('feedback1')
			expect(mockModule.setVariableValues).toHaveBeenCalledWith({
				dlive_input_1_mute: false,
			})
		})

		it('should parse Control Change NRPN for fader level', () => {
			feedbackHandler.mapFeedback('feedback2', 'input:0:fader')

			// NRPN message for fader level (0x64 = 100 decimal = -3.6 dB)
			const midiData = Buffer.from([0xb0, 0x63, 0x00, 0x62, 0x17, 0x06, 0x64])
			feedbackHandler.processMidiData(midiData)

			expect(mockModule.checkFeedbacksById).toHaveBeenCalledWith('feedback2')
			expect(mockModule.setVariableValues).toHaveBeenCalledWith({
				dlive_input_1_fader: '-3.6',
			})
		})

		it('should ignore messages for unsubscribed parameters', () => {
			// Process message for input channel 1 (we're only subscribed to channel 0)
			const midiData = Buffer.from([0x90, 0x01, 0x7f])
			feedbackHandler.processMidiData(midiData)

			expect(mockModule.checkFeedbacksById).not.toHaveBeenCalled()
			expect(mockModule.setVariableValues).not.toHaveBeenCalled()
		})

		it('should not update if value has not changed', () => {
			// First update
			const midiData1 = Buffer.from([0x90, 0x00, 0x7f])
			feedbackHandler.processMidiData(midiData1)

			// Clear mocks
			jest.clearAllMocks()

			// Same value again
			const midiData2 = Buffer.from([0x90, 0x00, 0x7f])
			feedbackHandler.processMidiData(midiData2)

			expect(mockModule.checkFeedbacksById).not.toHaveBeenCalled()
			expect(mockModule.setVariableValues).not.toHaveBeenCalled()
		})

		it('should handle different channel types based on MIDI channel offset', () => {
			// Subscribe to mono group channel 0 (MIDI channel offset 1)
			feedbackHandler.mapFeedback('feedback_group', 'mono_group:0:mute')

			// Mono group is at MIDI channel 1 (base 0 + offset 1)
			const midiData = Buffer.from([0x91, 0x00, 0x7f])
			feedbackHandler.processMidiData(midiData)

			expect(mockModule.checkFeedbacksById).toHaveBeenCalledWith('feedback_group')
			expect(mockModule.setVariableValues).toHaveBeenCalledWith({
				dlive_mono_group_1_mute: true,
			})
		})
	})

	describe('ensureSubscription', () => {
		it('should create subscription if none exists', () => {
			const path = 'input:0:fader'
			feedbackHandler.ensureSubscription(path)

			// Should have created variable definitions (channel name + parameter)
			expect(mockModule.setVariableDefinitions).toHaveBeenCalledTimes(1)
			expect(mockModule.setVariableDefinitions).toHaveBeenCalledWith([
				{ variableId: 'dlive_input_1_fader', name: 'dLive: input:0:fader' },
				{ variableId: 'dlive_input_1_name', name: 'dLive: input:0:name' },
			])
		})

		it('should not create duplicate subscription if already subscribed', () => {
			const path = 'input:0:fader'

			// First subscription
			feedbackHandler.mapFeedback('feedback1', path)
			jest.clearAllMocks()

			// Ensure subscription should not create another
			feedbackHandler.ensureSubscription(path)

			// Should not have called setVariableDefinitions again
			expect(mockModule.setVariableDefinitions).not.toHaveBeenCalled()
		})
	})

	describe('clear', () => {
		it('should clear all subscriptions and cached values', () => {
			feedbackHandler.mapFeedback('feedback1', 'input:0:mute')
			feedbackHandler.mapFeedback('feedback2', 'input:1:fader')

			feedbackHandler.clear()

			expect(mockModule.setVariableDefinitions).toHaveBeenLastCalledWith([])
			expect(feedbackHandler.getValue('input:0:mute')).toBeNull()
			expect(feedbackHandler.getValue('input:1:fader')).toBeNull()
		})
	})

	describe('fader dB conversion', () => {
		it('should convert MIDI 0 to -inf', () => {
			feedbackHandler.mapFeedback('feedback1', 'input:0:fader')
			const midiData = Buffer.from([0xb0, 0x63, 0x00, 0x62, 0x17, 0x06, 0x00])
			feedbackHandler.processMidiData(midiData)

			expect(mockModule.setVariableValues).toHaveBeenCalledWith({
				dlive_input_1_fader: '-inf',
			})
		})

		it('should convert MIDI 127 to +10.0 dB', () => {
			feedbackHandler.mapFeedback('feedback1', 'input:0:fader')
			const midiData = Buffer.from([0xb0, 0x63, 0x00, 0x62, 0x17, 0x06, 0x7f])
			feedbackHandler.processMidiData(midiData)

			expect(mockModule.setVariableValues).toHaveBeenCalledWith({
				dlive_input_1_fader: '+10.0',
			})
		})

		it('should convert MIDI 107 (nominally 0 dB) correctly', () => {
			feedbackHandler.mapFeedback('feedback1', 'input:0:fader')
			const midiData = Buffer.from([0xb0, 0x63, 0x00, 0x62, 0x17, 0x06, 0x6b])
			feedbackHandler.processMidiData(midiData)

			// MIDI 107 calculates to -0.1 dB due to rounding in the conversion formula
			expect(mockModule.setVariableValues).toHaveBeenCalledWith({
				dlive_input_1_fader: '-0.1',
			})
		})
	})
})
