import { DropdownChoice } from '@companion-module/base'
import { times } from 'lodash/fp'

import { midiValueToEqFrequency, midiValueToHpfFrequency } from './utils/index.js'

// Companion config
export const DEFAULT_MIDI_TCP_PORT = 51328
export const MIN_TCP_PORT = 1
export const MAX_TCP_PORT = 65535
export const DEFAULT_MIDI_CHANNEL = 0
export const DEFAULT_TARGET_IP = '192.168.1.70'

// dLive constants
export const INPUT_CHANNEL_COUNT = 128
export const MONO_GROUP_COUNT = 62
export const STEREO_GROUP_COUNT = 31
export const MONO_AUX_COUNT = 62
export const STEREO_AUX_COUNT = 32
export const MONO_MATRIX_COUNT = 62
export const STEREO_MATRIX_COUNT = 31
export const MONO_FX_SEND_COUNT = 16
export const STEREO_FX_SEND_COUNT = 16
export const FX_RETURN_COUNT = 16
export const MAIN_COUNT = 6
export const STEREO_UFX_SEND_COUNT = 8
export const STEREO_UFX_RETURN_COUNT = 8

export const DCA_COUNT = 24
export const MUTE_GROUP_COUNT = 8

export const SCENE_COUNT = 500
export const CUE_LIST_COUNT = 1999
export const SCENES_PER_BANK = 128
export const CUE_LISTS_PER_BANK = 128

export const FADER_STEP_COUNT = 128
export const GAIN_STEP_COUNT = 128

export const SOCKET_PREAMP_COUNT = 128
export const MIXRACK_SOCKET_COUNT = 64
export const MIXRACK_DX_SOCKET_COUNT = 32

export const PREAMP_MINIMUM_GAIN = 5
export const PREAMP_MAXIMUM_GAIN = 60

export const EQ_MINIMUM_FREQUENCY = 20
export const EQ_MAXIMUM_FREQUENCY = 20000
export const EQ_MINIMUM_WIDTH = 0.1
export const EQ_MAXIMUM_WIDTH = 1.5
export const EQ_MINIMUM_GAIN = -15
export const EQ_MAXIMUM_GAIN = 15
export const HPF_MINIMUM_FREQUENCY = 20
export const HPF_MAXIMUM_FREQUENCY = 2000

export const CHANNEL_TYPES: Readonly<ChannelType[]> = [
	'input',
	'mono_group',
	'stereo_group',
	'mono_aux',
	'stereo_aux',
	'mono_matrix',
	'stereo_matrix',
	'mono_fx_send',
	'stereo_fx_send',
	'fx_return',
	'main',
	'mute_group',
	'stereo_ufx_send',
	'stereo_ufx_return',
	'dca',
]

export const SOCKET_TYPES: Readonly<SocketType[]> = [
	'mixrack_sockets_1_to_64',
	'mixrack_dx_1_to_2',
	'mixrack_dx_3_to_4',
]

export const CHANNEL_COLOURS: Readonly<ChannelColour[]> = [
	'off',
	'red',
	'green',
	'yellow',
	'blue',
	'purple',
	'light_blue',
	'white',
]

export const EQ_TYPES: Readonly<EqType[]> = ['bell', 'lf_shelf', 'hf_shelf', 'low_pass', 'high_pass']

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

// Refer to the above table
export const CHANNEL_MIDI_CHANNEL_OFFSETS: Record<ChannelType, number> = {
	input: 0x00,
	mono_group: 0x01,
	stereo_group: 0x01,
	mono_aux: 0x02,
	stereo_aux: 0x02,
	mono_matrix: 0x03,
	stereo_matrix: 0x03,
	mono_fx_send: 0x04,
	stereo_fx_send: 0x04,
	fx_return: 0x04,
	main: 0x04,
	dca: 0x04,
	mute_group: 0x04,
	stereo_ufx_send: 0x04,
	stereo_ufx_return: 0x04,
}

// Refer to the above table
export const CHANNEL_MIDI_NOTE_OFFSETS: Record<ChannelType, number> = {
	input: 0x00,
	mono_group: 0x00,
	stereo_group: 0x40,
	mono_aux: 0x00,
	stereo_aux: 0x40,
	mono_matrix: 0x00,
	stereo_matrix: 0x40,
	mono_fx_send: 0x00,
	stereo_fx_send: 0x10,
	fx_return: 0x20,
	main: 0x30,
	dca: 0x36,
	mute_group: 0x4e,
	stereo_ufx_send: 0x56,
	stereo_ufx_return: 0x5e,
}

export const SOCKET_MIDI_NOTE_OFFSETS: Record<SocketType, number> = {
	mixrack_sockets_1_to_64: 0x00,
	mixrack_dx_1_to_2: 0x40,
	mixrack_dx_3_to_4: 0x60,
}

export const SYSEX_HEADER = [0xf0, 0x00, 0x00, 0x1a, 0x50, 0x10, 0x01, 0x00]

export const CHANNEL_TYPE_CHOICES: { label: string; id: ChannelType }[] = [
	{ label: 'Input', id: 'input' },
	{ label: 'Mono Group', id: 'mono_group' },
	{ label: 'Stereo Group', id: 'stereo_group' },
	{ label: 'Mono Aux', id: 'mono_aux' },
	{ label: 'Stereo Aux', id: 'stereo_aux' },
	{ label: 'Mono Matrix', id: 'mono_matrix' },
	{ label: 'Stereo Matrix', id: 'stereo_matrix' },
	{ label: 'Mono FX Send', id: 'mono_fx_send' },
	{ label: 'Stereo FX Send', id: 'stereo_fx_send' },
	{ label: 'FX Return', id: 'fx_return' },
	{ label: 'Main', id: 'main' },
	{ label: 'DCA', id: 'dca' },
	{ label: 'Mute Group', id: 'mute_group' },
	{ label: 'Stereo UFX Send', id: 'stereo_ufx_send' },
	{ label: 'Stereo UFX Return', id: 'stereo_ufx_return' },
]

export const SOCKET_TYPE_CHOICES: { label: string; id: SocketType }[] = [
	{ label: 'MixRack Sockets 1-64', id: 'mixrack_sockets_1_to_64' },
	{ label: 'MixRack DX 1/2', id: 'mixrack_dx_1_to_2' },
	{ label: 'MixRack DX 3/4', id: 'mixrack_dx_3_to_4' },
]

export const CHANNEL_COLOUR_CHOICES: { label: string; id: number }[] = [
	{ label: 'Off', id: 0 },
	{ label: 'Red', id: 1 },
	{ label: 'Green', id: 2 },
	{ label: 'Yellow', id: 3 },
	{ label: 'Blue', id: 4 },
	{ label: 'Purple', id: 5 },
	{ label: 'Light Blue', id: 6 },
	{ label: 'White', id: 7 },
]

export const EQ_TYPE_CHOICES: { label: string; id: EqType }[] = [
	{ label: 'Bell', id: 'bell' },
	{ label: 'Low Shelf', id: 'lf_shelf' },
	{ label: 'High Shelf', id: 'hf_shelf' },
	{ label: 'Low Pass', id: 'low_pass' },
	{ label: 'High Pass', id: 'high_pass' },
]

export const EQ_FREQUENCY_CHOICES: { label: string; id: number }[] = times((n) => {
	const frequency = midiValueToEqFrequency(n)
	const label = frequency < 1000 ? `${frequency} Hz` : `${(frequency / 1000).toFixed(2)} kHz`
	return { label, id: n }
})(128)

export const HPF_FREQUENCY_CHOICES: { label: string; id: number }[] = times((n) => {
	const frequency = midiValueToHpfFrequency(n)
	const label = frequency < 1000 ? `${frequency} Hz` : `${(frequency / 1000).toFixed(2)} kHz`
	return { label, id: n }
})(128)

export const EQ_PARAMETER_MIDI_VALUES_FOR_BANDS: Record<number, EqMidiParameters> = {
	0: { type: 0x1a, frequency: 0x1b, width: 0x1c, gain: 0x1d },
	1: { type: 0x1e, frequency: 0x1f, width: 0x20, gain: 0x21 },
	2: { type: 0x22, frequency: 0x23, width: 0x24, gain: 0x25 },
	3: { type: 0x26, frequency: 0x27, width: 0x28, gain: 0x29 },
}

export const FADER_LEVEL_CHOICES: DropdownChoice[] = times((index: number) => {
	const id = FADER_STEP_COUNT - 1 - index
	const dbLevel = ((id - 107) / 2).toFixed(1)
	const levelString = id === 0 ? '-INF' : dbLevel
	return { label: `${levelString} dB`, id }
})(FADER_STEP_COUNT)

// High Pass Filter Control
export const HPF_CHOICES: DropdownChoice[] = [
	{ label: 'Off', id: 0 },
	{ label: '20 Hz', id: 1 },
	{ label: '25 Hz', id: 2 },
	{ label: '31.5 Hz', id: 3 },
	{ label: '40 Hz', id: 4 },
	{ label: '50 Hz', id: 5 },
	{ label: '63 Hz', id: 6 },
	{ label: '80 Hz', id: 7 },
	{ label: '100 Hz', id: 8 },
	{ label: '125 Hz', id: 9 },
	{ label: '160 Hz', id: 10 },
	{ label: '200 Hz', id: 11 },
	{ label: '250 Hz', id: 12 },
	{ label: '315 Hz', id: 13 },
	{ label: '400 Hz', id: 14 },
]

// UFX Global Key Control
export const UFX_KEY_CHOICES: DropdownChoice[] = [
	{ label: 'C', id: 0x00 },
	{ label: 'C#', id: 0x01 },
	{ label: 'D', id: 0x02 },
	{ label: 'D#', id: 0x03 },
	{ label: 'E', id: 0x04 },
	{ label: 'F', id: 0x05 },
	{ label: 'F#', id: 0x06 },
	{ label: 'G', id: 0x07 },
	{ label: 'G#', id: 0x08 },
	{ label: 'A', id: 0x09 },
	{ label: 'A#', id: 0x0a },
	{ label: 'B', id: 0x0b },
]

// UFX Global Scale Control
export const UFX_SCALE_CHOICES: DropdownChoice[] = [
	{ label: 'Major', id: 0x00 },
	{ label: 'Minor', id: 0x01 },
]

export const MAIN_MIDI_CHANNEL_CHOICES: DropdownChoice[] = [
	{ label: '1 to 5', id: 0 },
	{ label: '2 to 6', id: 1 },
	{ label: '3 to 7', id: 2 },
	{ label: '4 to 8', id: 3 },
	{ label: '5 to 9', id: 4 },
	{ label: '6 to 10', id: 5 },
	{ label: '7 to 11', id: 6 },
	{ label: '8 to 12', id: 7 },
	{ label: '9 to 13', id: 8 },
	{ label: '10 to 14', id: 9 },
	{ label: '11 to 15', id: 10 },
	{ label: '12 to 16', id: 11 },
]
