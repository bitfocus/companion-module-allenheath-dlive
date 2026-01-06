import { includes } from 'lodash/fp'

import { CHANNEL_TYPE_CHOICES } from '../../constants.js'
import { getChannelSelectOptions, prependPrefix } from '../getChannelSelectOptions.js'

describe('prependPrefix', () => {
	it('should correctly prepend the prefix if provided', () => {
		expect(prependPrefix('someString', 'prefix')).toEqual('prefixSomeString')
	})

	it('should return the original string if no prefix is provided', () => {
		expect(prependPrefix('someString')).toEqual('someString')
	})
})

describe('getChannelSelectOptions', () => {
	it('should return the correct options when no args provided', () => {
		expect(getChannelSelectOptions()).toStrictEqual([
			{
				type: 'dropdown',
				label: 'Channel Type',
				id: 'channelType',
				default: 'input',
				choices: CHANNEL_TYPE_CHOICES,
				minChoicesForSearch: 0,
			},
			...CHANNEL_INPUT_FIELDS,
		])
	})

	it('should prepend each options with the prefix provided', () => {
		expect(getChannelSelectOptions({ prefix: 'destination' })).toStrictEqual(
			expect.arrayContaining([
				{
					type: 'dropdown',
					label: 'Destination Channel Type',
					id: 'destinationChannelType',
					default: 'input',
					choices: CHANNEL_TYPE_CHOICES,
					minChoicesForSearch: 0,
				},
				{
					type: 'dropdown',
					label: 'Input Channel',
					id: 'destinationInput',
					default: 0,
					choices: expect.arrayContaining([{ label: 'Input Channel 1', id: 0 }]),
					minChoicesForSearch: 0,
					isVisibleExpression: `$(options:destinationChannelType) == "input"`,
				},
				// etc...
			]),
		)
	})

	it('should limit the options in the channelType drowdown to only the included channel types', () => {
		const include: ChannelType[] = ['input', 'mono_fx_send']
		expect(getChannelSelectOptions({ include })).toStrictEqual([
			{
				type: 'dropdown',
				label: 'Channel Type',
				id: 'channelType',
				default: 'input',
				choices: CHANNEL_TYPE_CHOICES.filter(({ id }) => includes(id, include)),
				minChoicesForSearch: 0,
			},
			...CHANNEL_INPUT_FIELDS,
		])
	})

	it('should exclude any channel types in the exclude array from the options in the channelType dropdown', () => {
		const exclude: ChannelType[] = ['input', 'mono_fx_send']
		expect(getChannelSelectOptions({ exclude })).toStrictEqual([
			{
				type: 'dropdown',
				label: 'Channel Type',
				id: 'channelType',
				default: 'mono_group',
				choices: CHANNEL_TYPE_CHOICES.filter(({ id }) => !includes(id, exclude)),
				minChoicesForSearch: 0,
			},
			...CHANNEL_INPUT_FIELDS,
		])
	})
})

const CHANNEL_INPUT_FIELDS = [
	{
		type: 'dropdown',
		label: 'Input Channel',
		id: 'input',
		default: 0,
		choices: expect.arrayContaining([{ label: 'Input Channel 1', id: 0 }]),
		minChoicesForSearch: 0,
		isVisibleExpression: `$(options:channelType) == "input"`,
	},
	{
		type: 'dropdown',
		label: 'Mono Group',
		id: 'monoGroup',
		default: 0,
		choices: expect.arrayContaining([{ label: 'Mono Group 1', id: 0 }]),
		minChoicesForSearch: 0,
		isVisibleExpression: `$(options:channelType) == "mono_group"`,
	},
	{
		type: 'dropdown',
		label: 'Stereo Group',
		id: 'stereoGroup',
		default: 0,
		choices: expect.arrayContaining([{ label: 'Stereo Group 1', id: 0 }]),
		minChoicesForSearch: 0,
		isVisibleExpression: `$(options:channelType) == "stereo_group"`,
	},
	{
		type: 'dropdown',
		label: 'Mono Aux',
		id: 'monoAux',
		default: 0,
		choices: expect.arrayContaining([{ label: 'Mono Aux 1', id: 0 }]),
		minChoicesForSearch: 0,
		isVisibleExpression: `$(options:channelType) == "mono_aux"`,
	},
	{
		type: 'dropdown',
		label: 'Stereo Aux',
		id: 'stereoAux',
		default: 0,
		choices: expect.arrayContaining([{ label: 'Stereo Aux 1', id: 0 }]),
		minChoicesForSearch: 0,
		isVisibleExpression: `$(options:channelType) == "stereo_aux"`,
	},
	{
		type: 'dropdown',
		label: 'Mono Matrix',
		id: 'monoMatrix',
		default: 0,
		choices: expect.arrayContaining([{ label: 'Mono Matrix 1', id: 0 }]),
		minChoicesForSearch: 0,
		isVisibleExpression: `$(options:channelType) == "mono_matrix"`,
	},
	{
		type: 'dropdown',
		label: 'Stereo Matrix',
		id: 'stereoMatrix',
		default: 0,
		choices: expect.arrayContaining([{ label: 'Stereo Matrix 1', id: 0 }]),
		minChoicesForSearch: 0,
		isVisibleExpression: `$(options:channelType) == "stereo_matrix"`,
	},
	{
		type: 'dropdown',
		label: 'Mono FX Send',
		id: 'monoFxSend',
		default: 0,
		choices: expect.arrayContaining([{ label: 'Mono FX Send 1', id: 0 }]),
		minChoicesForSearch: 0,
		isVisibleExpression: `$(options:channelType) == "mono_fx_send"`,
	},
	{
		type: 'dropdown',
		label: 'Stereo FX Send',
		id: 'stereoFxSend',
		default: 0,
		choices: expect.arrayContaining([{ label: 'Stereo FX Send 1', id: 0 }]),
		minChoicesForSearch: 0,
		isVisibleExpression: `$(options:channelType) == "stereo_fx_send"`,
	},
	{
		type: 'dropdown',
		label: 'FX Return',
		id: 'fxReturn',
		default: 0,
		choices: expect.arrayContaining([{ label: 'FX Return 1', id: 0 }]),
		minChoicesForSearch: 0,
		isVisibleExpression: `$(options:channelType) == "fx_return"`,
	},
	{
		type: 'dropdown',
		label: 'Main',
		id: 'main',
		default: 0,
		choices: expect.arrayContaining([{ label: 'Main 1', id: 0 }]),
		minChoicesForSearch: 0,
		isVisibleExpression: `$(options:channelType) == "main"`,
	},
	{
		type: 'dropdown',
		label: 'DCA',
		id: 'dca',
		default: 0,
		choices: expect.arrayContaining([{ label: 'DCA 1', id: 0 }]),
		minChoicesForSearch: 0,
		isVisibleExpression: `$(options:channelType) == "dca"`,
	},
	{
		type: 'dropdown',
		label: 'Mute Group',
		id: 'muteGroup',
		default: 0,
		choices: expect.arrayContaining([{ label: 'Mute Group 1', id: 0 }]),
		minChoicesForSearch: 0,
		isVisibleExpression: `$(options:channelType) == "mute_group"`,
	},
	{
		type: 'dropdown',
		label: 'Stereo UFX Send',
		id: 'stereoUfxSend',
		default: 0,
		choices: expect.arrayContaining([{ label: 'Stereo UFX Send 1', id: 0 }]),
		minChoicesForSearch: 0,
		isVisibleExpression: `$(options:channelType) == "stereo_ufx_send"`,
	},
	{
		type: 'dropdown',
		label: 'Stereo UFX Return',
		id: 'stereoUfxReturn',
		default: 0,
		choices: expect.arrayContaining([{ label: 'Stereo UFX Return 1', id: 0 }]),
		minChoicesForSearch: 0,
		isVisibleExpression: `$(options:channelType) == "stereo_ufx_return"`,
	},
]
