import { type DLiveParameterPath, FeedbackHandler } from '../src/FeedbackHandler.js'
import type { ModuleInstance } from '../src/main.js'

const path: DLiveParameterPath = { channelType: 'input', channelNo: 0, parameter: 'fader' }
function setup() {
	const module = {
		baseMidiChannel: 0,
		log: jest.fn(),
		setVariableDefinitions: jest.fn(),
		setVariableValues: jest.fn(),
		checkFeedbacksById: jest.fn(),
		requestChannelName: jest.fn(),
		requestFaderLevel: jest.fn(),
		requestMuteStatus: jest.fn(),
		requestMainAssignment: jest.fn(),
	} as unknown as jest.Mocked<ModuleInstance>
	return { module, handler: new FeedbackHandler(module) }
}
describe('MIDI readback reliability', () => {
	it('accepts explicit-status NRPN across every TCP split', () => {
		const bytes = [0xb0, 0x63, 0, 0xb0, 0x62, 0x17, 0xb0, 6, 107]
		for (let split = 0; split <= bytes.length; split++) {
			const { handler } = setup()
			handler.mapFeedback('fader', path)
			handler.processMidiData(Buffer.from(bytes.slice(0, split)))
			handler.processMidiData(Buffer.from(bytes.slice(split)))
			expect(handler.getValue(path)).toBe(107)
		}
	})
	it('ignores explicit Note Off and unrelated MIDI channels', () => {
		const { handler } = setup()
		const mute = { ...path, parameter: 'mute' as const }
		handler.mapFeedback('mute', mute)
		handler.processMidiData(Buffer.from([0x90, 0, 63, 0x80, 0, 127, 0x9f, 0, 127]))
		expect(handler.getValue(mute)).toBe(false)
	})
	it('initializes main-assignment feedback with its documented Get', () => {
		const { module, handler } = setup()
		handler.mapFeedback('main', { ...path, parameter: 'main_assignment' })
		expect(module.requestMainAssignment).toHaveBeenCalledWith('input', 0)
	})
	it('invalidates cached values and partial messages when a connection resets', () => {
		const { handler } = setup()
		handler.mapFeedback('fader', path)
		handler.processMidiData(Buffer.from([0xb0, 0x63, 0, 0x62, 0x17, 6, 107, 0x90, 0]))
		handler.resetConnection()
		expect(handler.getValue(path)).toBeNull()
		handler.processMidiData(Buffer.from([0x7f]))
		expect(handler.getValue(path)).toBeNull()
	})
})
