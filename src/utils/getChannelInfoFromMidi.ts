import {
	CHANNEL_MIDI_CHANNEL_OFFSETS,
	CHANNEL_MIDI_NOTE_OFFSETS,
	CHANNEL_TYPES,
	DCA_COUNT,
	FX_RETURN_COUNT,
	INPUT_CHANNEL_COUNT,
	MAIN_COUNT,
	MONO_AUX_COUNT,
	MONO_FX_SEND_COUNT,
	MONO_GROUP_COUNT,
	MONO_MATRIX_COUNT,
	MUTE_GROUP_COUNT,
	STEREO_AUX_COUNT,
	STEREO_FX_SEND_COUNT,
	STEREO_GROUP_COUNT,
	STEREO_MATRIX_COUNT,
	STEREO_UFX_RETURN_COUNT,
	STEREO_UFX_SEND_COUNT,
} from '../constants.js'

const counts: Record<ChannelType, number> = {
	input: INPUT_CHANNEL_COUNT,
	mono_group: MONO_GROUP_COUNT,
	stereo_group: STEREO_GROUP_COUNT,
	mono_aux: MONO_AUX_COUNT,
	stereo_aux: STEREO_AUX_COUNT,
	mono_matrix: MONO_MATRIX_COUNT,
	stereo_matrix: STEREO_MATRIX_COUNT,
	mono_fx_send: MONO_FX_SEND_COUNT,
	stereo_fx_send: STEREO_FX_SEND_COUNT,
	fx_return: FX_RETURN_COUNT,
	main: MAIN_COUNT,
	dca: DCA_COUNT,
	mute_group: MUTE_GROUP_COUNT,
	stereo_ufx_send: STEREO_UFX_SEND_COUNT,
	stereo_ufx_return: STEREO_UFX_RETURN_COUNT,
}

/** Reject reserved note ranges and MIDI channels outside the console's five-channel block. */
export function getChannelInfoFromMidi(
	base: number,
	midiChannel: number,
	note: number,
): { channelType: ChannelType; channelNo: number } | undefined {
	for (const channelType of CHANNEL_TYPES) {
		const offset = CHANNEL_MIDI_NOTE_OFFSETS[channelType]
		if (
			midiChannel === base + CHANNEL_MIDI_CHANNEL_OFFSETS[channelType] &&
			note >= offset &&
			note < offset + counts[channelType]
		)
			return { channelType, channelNo: note - offset }
	}
	return undefined
}
