import {
	EQ_MAXIMUM_FREQUENCY,
	EQ_MAXIMUM_GAIN,
	EQ_MINIMUM_FREQUENCY,
	EQ_MINIMUM_GAIN,
	HPF_MAXIMUM_FREQUENCY,
	HPF_MINIMUM_FREQUENCY,
	PREAMP_MAXIMUM_GAIN,
	PREAMP_MINIMUM_GAIN,
} from '../../constants.js'
import {
	eqGainToMidiValue,
	eqWidthToMidiValue,
	midiValueToEqFrequency,
	midiValueToHpfFrequency,
	preampGainToMidiValue,
} from '../midiValueConverters.js'

describe('preampGainToMidiValue', () => {
	it('should convert the minimum gain to MIDI 0', () => {
		expect(preampGainToMidiValue(PREAMP_MINIMUM_GAIN)).toEqual(0)
	})

	it('should convert the maximum gain to MIDI 127', () => {
		expect(preampGainToMidiValue(PREAMP_MAXIMUM_GAIN)).toEqual(0x7f)
	})
})

describe('eqGainToMidiValue', () => {
	it('should convert the minimum gain to MIDI 0', () => {
		expect(eqGainToMidiValue(EQ_MINIMUM_GAIN)).toEqual(0)
	})

	it('should convert the maximum gain to MIDI 127', () => {
		expect(eqGainToMidiValue(EQ_MAXIMUM_GAIN)).toEqual(0x7f)
	})
})

describe('eqWidthToMidiValue', () => {
	it.each([
		[1.51, 0],
		[1.11, 4],
		[0.51, 15],
		[0.1, 24],
		[0, 24],
	])('should convert width %s to MIDI value %s', (rawWidth, expectedMidiValue) => {
		expect(eqWidthToMidiValue(rawWidth)).toEqual(expectedMidiValue)
	})
})

describe('midiValueToEqFrequency', () => {
	it.each([
		[0, EQ_MINIMUM_FREQUENCY],
		[72, 1004],
		[127, EQ_MAXIMUM_FREQUENCY],
	])('should convert MIDI value %s to frequency %sHz', (midiValue, expectedFrequency) => {
		expect(midiValueToEqFrequency(midiValue)).toEqual(expectedFrequency)
	})
})

describe('midiValueToHpfFrequency', () => {
	it.each([
		[0, HPF_MINIMUM_FREQUENCY],
		[100, 751],
		[127, HPF_MAXIMUM_FREQUENCY],
	])('should convert MIDI value %s to frequency %sHz', (midiValue, expectedFrequency) => {
		expect(midiValueToHpfFrequency(midiValue)).toEqual(expectedFrequency)
	})
})
