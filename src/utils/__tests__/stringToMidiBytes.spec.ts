import { stringToMidiBytes } from '../stringToMidiBytes.js'

describe('stringToMidiBytes', () => {
	it('should convert string to MIDI bytes', () => {
		expect(stringToMidiBytes('foo bar')).toStrictEqual([0x66, 0x6f, 0x6f, 0x20, 0x62, 0x61, 0x72])
	})
})
