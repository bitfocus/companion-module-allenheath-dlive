import { FADER_LEVEL_CHOICES } from '../src/constants.js'
import { faderMidiValueToDb } from '../src/utils/midiValueConverters.js'

describe('fader choice labels', () => {
	it('agrees with reported levels for every stored MIDI value', () => {
		expect(FADER_LEVEL_CHOICES).toHaveLength(128)
		for (const choice of FADER_LEVEL_CHOICES) {
			const id = Number(choice.id)
			const label = id === 0 ? '-INF' : faderMidiValueToDb(id).toFixed(1)
			expect(choice.label).toBe(`${label} dB`)
		}
	})
	it.each([
		[0, '-INF dB'],
		[107, '-0.1 dB'],
		[127, '10.0 dB'],
	])('preserves raw value %s with label %s', (id, label) => {
		expect(FADER_LEVEL_CHOICES.find((choice) => choice.id === id)?.label).toBe(label)
	})
})
