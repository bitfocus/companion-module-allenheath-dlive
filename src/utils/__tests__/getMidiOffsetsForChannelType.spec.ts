import { getMidiOffsetsForChannelType } from '../getMidiOffsetsForChannelType.js'

const TEST_CASES: [ChannelType, number, number][] = [
	['input', 0, 0],
	['mono_group', 0x01, 0],
	['stereo_group', 0x01, 0x40],
	['mono_aux', 0x02, 0],
	['stereo_aux', 0x02, 0x40],
	['mono_matrix', 0x03, 0],
	['stereo_matrix', 0x03, 0x40],
	['mono_fx_send', 0x04, 0],
	['stereo_fx_send', 0x04, 0x10],
	['fx_return', 0x04, 0x20],
	['main', 0x04, 0x30],
	['mute_group', 0x04, 0x4e],
	['stereo_ufx_send', 0x04, 0x56],
	['stereo_ufx_return', 0x04, 0x5e],
	['dca', 0x04, 0x36],
]

it.each(TEST_CASES)(
	'should return the correct offsets for %s',
	(channelType, expectedMidiChannelOffset, expectedMidiNoteOffset) => {
		expect(getMidiOffsetsForChannelType(channelType)).toEqual({
			midiChannelOffset: expectedMidiChannelOffset,
			midiNoteOffset: expectedMidiNoteOffset,
		})
	},
)
