import type { ModuleInstance } from '../src/main.js'
import { MidiStreamDecoder } from '../src/MidiStreamDecoder.js'
import { type ProtocolPath, ProtocolState } from '../src/ProtocolState.js'

const header = [0xf0, 0, 0, 0x1a, 0x50, 0x10, 1, 0]
const path = (parameter: string, extra: Partial<ProtocolPath> = {}): ProtocolPath => ({
	parameter,
	midiChannel: 2,
	note: 0,
	...extra,
})
function setup(target: ConnectionTarget = 'mixrack') {
	const module = {
		baseMidiChannel: 2,
		config: { target },
		sendMidiToDlive: jest.fn(),
		checkFeedbacksById: jest.fn(),
	} as unknown as jest.Mocked<ModuleInstance>
	const state = new ProtocolState(module)
	const decoder = new MidiStreamDecoder()
	const receive = (bytes: number[]): void => {
		for (const byte of bytes) for (const message of decoder.push(Buffer.from([byte]))) state.processMessage(message)
	}
	return { module, state, receive }
}

describe('documented Get byte sequences (nonzero base MIDI channel)', () => {
	it.each<[ProtocolPath, number[]]>([
		[path('mute'), [2, 5, 9, 0]],
		[path('nrpn:23'), [2, 5, 11, 0x17, 0]],
		[path('nrpn:24'), [2, 5, 11, 0x18, 0]],
		[path('name'), [2, 1, 0]],
		[path('colour'), [2, 4, 0]],
		[path('gain', { note: 0x60 }), [2, 5, 11, 0x19, 0x60]],
		[path('pad', { note: 0x40 }), [2, 7, 0x40]],
		[path('phantom', { note: 127 }), [2, 10, 127]],
		[path('send', { destinationMidiChannel: 4, destinationNote: 0x40 }), [2, 5, 15, 13, 0, 4, 0x40]],
		[path('routing', { destinationMidiChannel: 3, destinationNote: 0 }), [2, 5, 15, 14, 0, 3, 0]],
		[path('nrpn:48'), [2, 5, 11, 0x30, 0]],
		[path('nrpn:49'), [2, 5, 11, 0x31, 0]],
		...Array.from({ length: 16 }, (_, i): [ProtocolPath, number[]] => [
			path(`nrpn:${0x1a + i}`),
			[2, 5, 11, 0x1a + i, 0],
		]),
	])('requests %j', (parameter, body) => {
		const { module, state } = setup()
		state.request(parameter)
		expect(module.sendMidiToDlive).toHaveBeenCalledWith([...header, ...body, 0xf7])
	})
	it('never invents queries for event-only parameters', () => {
		const { module, state } = setup()
		for (const parameter of ['assignment', 'scene', 'cue', 'cc', 'note', 'mmc', 'raw']) state.request(path(parameter))
		expect(module.sendMidiToDlive).not.toHaveBeenCalled()
	})
})

describe('received protocol state', () => {
	it.each<[ProtocolPath, number[], number | boolean | string]>([
		[path('mute'), [0x92, 0, 127], true],
		[path('nrpn:23'), [0xb2, 0x63, 0, 0xb2, 0x62, 0x17, 0xb2, 6, 107], 107],
		[path('nrpn:24'), [0xb2, 0x63, 0, 0x62, 0x18, 6, 63], 63],
		[path('nrpn:48'), [0xb2, 0x63, 0, 0x62, 0x30, 6, 99], 99],
		[path('nrpn:49'), [0xb2, 0x63, 0, 0x62, 0x31, 6, 127], 127],
		[path('gain', { note: 0x60 }), [0xe2, 0x60, 115], 115],
		[path('pad', { note: 0x40 }), [...header, 2, 8, 0x40, 127, 0xf7], true],
		[path('phantom'), [...header, 2, 11, 0, 0, 0xf7], false],
		[path('name'), [...header, 2, 2, 0, 86, 111, 120, 0xf7], 'Vox'],
		[path('colour'), [...header, 2, 5, 0, 6, 0xf7], 6],
		[
			path('send', { destinationMidiChannel: 4, destinationNote: 0x40 }),
			[...header, 2, 13, 0, 4, 0x40, 107, 0xf7],
			107,
		],
		[path('routing', { destinationMidiChannel: 3, destinationNote: 0 }), [...header, 2, 14, 0, 3, 0, 127, 0xf7], true],
		[path('assignment', { member: 23 }), [0xb2, 0x63, 0, 0x62, 0x40, 6, 0x57], true],
		[path('assignment', { member: 31 }), [0xb2, 0x63, 0, 0x62, 0x40, 6, 0x1f], false],
		[path('cc', { midiChannel: 15, note: 12 }), [0xbf, 12, 85], 85],
		[path('note', { midiChannel: 1, note: 32 }), [0x91, 32, 127], 127],
		[{ parameter: 'mmc', midiChannel: 0 }, [0xf0, 0x7f, 0x7f, 6, 2, 0xf7], 2],
		...Array.from({ length: 16 }, (_, i): [ProtocolPath, number[], number] => [
			path(`nrpn:${0x1a + i}`),
			[0xb2, 0x63, 0, 0x62, 0x1a + i, 6, 42],
			42,
		]),
	])('updates subscribed %j from byte-fragmented MIDI', (parameter, bytes, expected) => {
		const { module, state, receive } = setup()
		state.subscribe('feedback', parameter)
		expect(state.get(parameter)).toBeUndefined()
		receive(bytes)
		expect(state.get(parameter)).toEqual(expected)
		expect(module.checkFeedbacksById).toHaveBeenCalledWith('feedback')
	})
	it.each<[ConnectionTarget, number, number, number]>([
		['mixrack', 3, 115, 500],
		['surface', 15, 79, 1999],
	])('tracks banked recall for %s', (target, bank, program, expected) => {
		const { state, receive } = setup(target)
		const parameter = { parameter: target === 'mixrack' ? 'scene' : 'cue', midiChannel: 2 }
		receive([0xc2, program])
		expect(state.get(parameter)).toBeUndefined()
		receive([0xb2, 0, bank, 0xc2, program])
		expect(state.get(parameter)).toBe(expected)
		state.reset()
		receive([0xc2, 0])
		expect(state.get(parameter)).toBeUndefined()
	})
	it('keeps source/destination pairs and group members independent', () => {
		const { state, receive } = setup()
		receive([...header, 2, 13, 0, 4, 0, 90, 0xf7, ...header, 2, 13, 0, 4, 1, 80, 0xf7])
		expect(state.get(path('send', { destinationMidiChannel: 4, destinationNote: 0 }))).toBe(90)
		expect(state.get(path('send', { destinationMidiChannel: 4, destinationNote: 1 }))).toBe(80)
		receive([0xb2, 0x63, 0, 0x62, 0x40, 6, 0x40, 6, 0x41, 6, 0])
		expect(state.get(path('assignment', { member: 0 }))).toBe(false)
		expect(state.get(path('assignment', { member: 1 }))).toBe(true)
	})
	it('deduplicates queries, follows edited paths and refreshes on reconnect', () => {
		const { state, module, receive } = setup()
		let selected = path('colour')
		state.subscribe('a', selected, () => selected)
		state.subscribe('b', selected)
		expect(module.sendMidiToDlive).toHaveBeenCalledTimes(1)
		receive([...header, 2, 5, 0, 6, 0xf7])
		state.reset()
		expect(state.get(selected)).toBeUndefined()
		selected = path('colour', { midiChannel: 3, note: 0x40 })
		state.unsubscribe('b')
		state.refresh()
		expect(module.sendMidiToDlive).toHaveBeenLastCalledWith([...header, 3, 4, 0x40, 0xf7])
	})
	it('rejects reserved notes and unrelated manufacturer SysEx', () => {
		const { state, receive } = setup()
		receive([0xb3, 0x63, 0x3e, 0x62, 0x17, 6, 107])
		expect(state.get(path('nrpn:23', { midiChannel: 3, note: 0x3e }))).toBeUndefined()
		receive([0xf0, 0, 0, 0x1b, 0x50, 0x10, 1, 0, 2, 5, 0, 6, 0xf7])
		expect(state.get(path('colour'))).toBeUndefined()
	})
})
