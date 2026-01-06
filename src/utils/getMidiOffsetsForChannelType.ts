import { CHANNEL_MIDI_CHANNEL_OFFSETS, CHANNEL_MIDI_NOTE_OFFSETS } from '../constants.js'

/**
| Audio Type              | MIDI Channel Offset | Note Number (CH) Range |
|-------------------------|---------------------|------------------------|
| Inputs 1 to 128         | N + 0               | 00 to 7F               |
| Mono Groups 1 to 62     | N + 1               | 00 to 3D               |
| Stereo Groups 1 to 31   | N + 1               | 40 to 5E               |
| Mono Aux 1 to 62        | N + 2               | 00 to 3D               |
| Stereo Aux 1 to 31      | N + 2               | 40 to 5E               |
| Mono Matrix 1 to 62     | N + 3               | 00 to 3D               |
| Stereo Matrix 1 to 31   | N + 3               | 40 to 5E               |
| Mono FX Send 1 to 16    | N + 4               | 00 to 0F               |
| Stereo FX Send 1 to 16  | N + 4               | 10 to 1F               |
| FX Return 1 to 16       | N + 4               | 20 to 2F               |
| Mains 1 to 6            | N + 4               | 30 to 35               |
| DCA 1 to 24             | N + 4               | 36 to 4D               |
| Mute Group 1 to 8       | N + 4               | 4E to 55               |
| Stereo UFX Send 1 to 8  | N + 4               | 56 to 5D               |
| Stereo UFX Return 1 to 8| N + 4               | 5E to 65               |
 */

/**
 * Helper to return the relevant MIDI channel offset and MIDI note offset for
 * the given channel type as described in the dLive MIDI specification.
 * @param channelType The channel type
 * @returns An object containing the MIDI channel offset and MIDI note offset
 */
export const getMidiOffsetsForChannelType = (
	channelType: ChannelType,
): { midiChannelOffset: number; midiNoteOffset: number } => ({
	midiChannelOffset: CHANNEL_MIDI_CHANNEL_OFFSETS[channelType],
	midiNoteOffset: CHANNEL_MIDI_NOTE_OFFSETS[channelType],
})
