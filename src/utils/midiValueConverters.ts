import { EQ_MAXIMUM_GAIN, EQ_MINIMUM_GAIN, PREAMP_MAXIMUM_GAIN, PREAMP_MINIMUM_GAIN } from '../constants.js'

type EqWidthMidiValuePoint = { width: number; midiValue: number }

/**
EQ Width → MIDI Value Mapping
============================

| Width  | Vv (dec) | Vv (hex) |
|--------|----------|----------|
| 1.50   | 0        | 0x00     |
| 1.40   | 1        | 0x01     |
| 1.30   | 2        | 0x02     |
| 1.20   | 3        | 0x03     |
| 1.10   | 4        | 0x04     |
| 1.00   | 5        | 0x05     |
| 0.95   | 6        | 0x06     |
| 0.90   | 7        | 0x07     |
| 0.85   | 8        | 0x08     |
| 0.80   | 9        | 0x09     |
| 0.75   | 10       | 0x0A     |
| 0.70   | 11       | 0x0B     |
| 0.66̅   | 12       | 0x0C     |
| 0.60   | 13       | 0x0D     |
| 0.55   | 14       | 0x0E     |
| 0.50   | 15       | 0x0F     |
| 0.45   | 16       | 0x10     |
| 0.40   | 17       | 0x11     |
| 0.33̅   | 18       | 0x12     |
| 0.30   | 19       | 0x13     |
| 0.25   | 20       | 0x14     |
| 0.20   | 21       | 0x15     |
| 0.16̅   | 22       | 0x16     |
| 0.13   | 23       | 0x17     |
| 0.11̅   | 24       | 0x18     |
 */

const EQ_WIDTH_TO_MIDI_VALUE_MAP: readonly EqWidthMidiValuePoint[] = [
	{ width: 1.5, midiValue: 0x00 },
	{ width: 1.4, midiValue: 0x01 },
	{ width: 1.3, midiValue: 0x02 },
	{ width: 1.2, midiValue: 0x03 },
	{ width: 1.1, midiValue: 0x04 },
	{ width: 1.0, midiValue: 0x05 },
	{ width: 0.95, midiValue: 0x06 },
	{ width: 0.9, midiValue: 0x07 },
	{ width: 0.85, midiValue: 0x08 },
	{ width: 0.8, midiValue: 0x09 },
	{ width: 3 / 4, midiValue: 0x0a }, // 0.75
	{ width: 0.7, midiValue: 0x0b },
	{ width: 2 / 3, midiValue: 0x0c }, // 0.666...
	{ width: 0.6, midiValue: 0x0d },
	{ width: 0.55, midiValue: 0x0e },
	{ width: 0.5, midiValue: 0x0f },
	{ width: 0.45, midiValue: 0x10 },
	{ width: 0.4, midiValue: 0x11 },
	{ width: 1 / 3, midiValue: 0x12 }, // 0.333...
	{ width: 0.3, midiValue: 0x13 },
	{ width: 1 / 4, midiValue: 0x14 }, // 0.25
	{ width: 0.2, midiValue: 0x15 },
	{ width: 1 / 6, midiValue: 0x16 }, // 0.166...
	{ width: 0.13, midiValue: 0x17 },
	{ width: 1 / 9, midiValue: 0x18 }, // 0.111...
] as const

/**
 * Helper function that takes a continuously variable value representing an EQ width and quantises
 * it to one of a finite number of width choices as defined in the dLive MIDI specification
 * @param width Number representing an EQ filter width
 * @returns The MIDI value corresponding to the nearest width point defined in the dLive MIDI specification
 */
export const eqWidthToMidiValue = (width: number): number => {
	let best = EQ_WIDTH_TO_MIDI_VALUE_MAP[0]
	let bestDiff = Math.abs(width - best.width)

	// Use an iterative approach to find the closest MIDI value for the given width
	for (let i = 1; i < EQ_WIDTH_TO_MIDI_VALUE_MAP.length; i++) {
		const midiValuePoint = EQ_WIDTH_TO_MIDI_VALUE_MAP[i]
		const diff = Math.abs(width - midiValuePoint.width)
		if (diff < bestDiff) {
			best = midiValuePoint
			bestDiff = diff
		}
	}

	return best.midiValue
}

/**
 * Helper function to convert dB gain to a MIDI value between 0-127
 * @param gain Gain value in dB
 * @returns The MIDI value from 0-127 value representing the gain
 */
export const dbGainToMidiValue = (gain: number, minGain: number, maxGain: number): number =>
	Math.round(((gain - minGain) / (maxGain - minGain)) * 0x7f)

export const preampGainToMidiValue = (gain: number): number =>
	dbGainToMidiValue(gain, PREAMP_MINIMUM_GAIN, PREAMP_MAXIMUM_GAIN)

export const eqGainToMidiValue = (gain: number): number => dbGainToMidiValue(gain, EQ_MINIMUM_GAIN, EQ_MAXIMUM_GAIN)

/**
 * Helper function to convert a MIDI value to a frequency between 0-20000 Hz
 * @param midiValue MIDI value between 0-127
 * @returns A frequency in Hz
 */
export const midiValueToEqFrequency = (midiValue: number): number => Math.round(20 * Math.pow(1000, midiValue / 0x7f))

/**
 * Helper function to convert a MIDI value to a HPF frequency between 0-1000Hz
 * @param midiValue MIDI value between 0-127
 * @returns A frequency in Hz
 */
export const midiValueToHpfFrequency = (midiValue: number): number => Math.round(20 * Math.pow(100, midiValue / 0x7f))
