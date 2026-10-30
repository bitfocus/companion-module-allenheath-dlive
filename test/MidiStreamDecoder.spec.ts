import { MidiStreamDecoder } from '../src/MidiStreamDecoder.js'

const compressed = [0xb0, 0x63, 0, 0x62, 0x17, 0x06, 107]
const explicit = [0xb0, 0x63, 0, 0xb0, 0x62, 0x17, 0xb0, 0x06, 107]
const mixed = [0xb0, 0x63, 0, 0x62, 0x17, 0xb0, 0x06, 107]
const canonical = Buffer.from(compressed)

describe('MIDI framing and NRPN selection', () => {
	it.each([compressed, explicit, mixed].map((bytes) => [bytes]))('decodes every TCP split of %j', (bytes) => {
		for (let split = 0; split <= bytes.length; split++) {
			const decoder = new MidiStreamDecoder()
			const messages = [
				...decoder.push(Buffer.from(bytes.slice(0, split))),
				...decoder.push(Buffer.from(bytes.slice(split))),
			]
			expect(messages.filter((m) => m.length === 7)).toEqual([canonical])
		}
	})
	it('supports one-byte packets and per-channel NRPN selection', () => {
		const decoder = new MidiStreamDecoder()
		const bytes = [0xb0, 0x63, 0, 0x62, 0x17, 0xb1, 0x63, 2, 0x62, 0x18, 0xb0, 0x06, 107, 0xb1, 0x06, 127]
		const messages = bytes.flatMap((byte) => decoder.push(Buffer.from([byte]))).filter((m) => m.length === 7)
		expect(messages).toEqual([canonical, Buffer.from([0xb1, 0x63, 2, 0x62, 0x18, 0x06, 127])])
	})
	it('retains NRPN selection for subsequent data entry and cancels it for RPN', () => {
		const decoder = new MidiStreamDecoder()
		expect(decoder.push(Buffer.from([...compressed, 6, 100])).filter((m) => m.length === 7)).toHaveLength(2)
		expect(decoder.push(Buffer.from([0x65, 0, 6, 80])).filter((m) => m.length === 7)).toHaveLength(0)
	})
	it('allows realtime bytes inside SysEx and channel messages', () => {
		const decoder = new MidiStreamDecoder()
		expect(decoder.push(Buffer.from([0x90, 0, 0xf8, 127, 1, 0xfe, 63, 0xf0, 0, 0xf8, 1, 0xf7]))).toEqual([
			Buffer.from([0x90, 0, 127]),
			Buffer.from([0x90, 1, 63]),
			Buffer.from([0xf0, 0, 1, 0xf7]),
		])
	})
	it('cancels running status for system common and SysEx messages', () => {
		const decoder = new MidiStreamDecoder()
		expect(decoder.push(Buffer.from([0x90, 0, 127, 0xf1, 0, 1, 127, 0xf0, 1, 0xf7, 2, 127]))).toEqual([
			Buffer.from([0x90, 0, 127]),
			Buffer.from([0xf0, 1, 0xf7]),
		])
	})
	it('recovers from interrupted and oversized SysEx and resets partial messages', () => {
		const decoder = new MidiStreamDecoder()
		expect(decoder.push(Buffer.from([0xf0, 1, 0x90, 0, 127]))).toEqual([Buffer.from([0x90, 0, 127])])
		decoder.push(Buffer.from([0xf0, ...Array<number>(1100).fill(1)]))
		expect(decoder.push(Buffer.from([0x90, 1, 63]))).toEqual([Buffer.from([0x90, 1, 63])])
		decoder.push(Buffer.from([0xb0, 0x63, 0]))
		decoder.reset()
		expect(decoder.push(Buffer.from([0x62, 0x17, 6, 107]))).toEqual([])
	})
})
