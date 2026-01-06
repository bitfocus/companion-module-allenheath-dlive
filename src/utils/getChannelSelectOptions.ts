import { SomeCompanionActionInputField } from '@companion-module/base'
import { capitalize } from 'lodash'
import { includes, join } from 'lodash/fp'

import {
	CHANNEL_TYPE_CHOICES,
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
import { makeDropdownChoices } from './makeDropdownChoices.js'

export const prependPrefix = (text: string, prefix?: string): string =>
	prefix ? prefix + text.charAt(0).toUpperCase() + text.slice(1) : text

interface GetChannelSelectOptionsArgs {
	/** Array of channel types to exclude from the channel type selector dropdown */
	exclude?: ChannelType[]
	/** Array of channel types to include in the channel type selector dropdown */
	include?: ChannelType[]
	/** Prefix to prepend to the channel type, e.g. 'destination', 'source' etc */
	prefix?: string
}

/**
 * Helper to create a set of fields for a Companion action that allow selection of a channel type and number.
 * These appear in the Companion UI as two dropdowns: one for choosing the channel type, e.g. 'Input' and
 * another for choosing the channel, e.g. 'Input 1'
 * @param args Args as defined in GetChannelSelectOptionsArgs interface
 * @returns Array of Companion action input fields
 */
export const getChannelSelectOptions = (args?: GetChannelSelectOptionsArgs): SomeCompanionActionInputField[] => {
	const exclude = args?.exclude ?? []
	const include = args?.include ?? CHANNEL_TYPE_CHOICES.map((c) => c.id)
	const prefix = args?.prefix

	const channelTypeLabel = prefix ? join(' ', [capitalize(prefix), 'Channel Type']) : 'Channel Type'
	const filteredChannelTypeChoices = CHANNEL_TYPE_CHOICES.filter(
		(c) => includes(c.id, include) && !includes(c.id, exclude),
	)

	return [
		{
			type: 'dropdown',
			label: channelTypeLabel,
			id: prependPrefix('channelType', prefix),
			default: filteredChannelTypeChoices[0].id,
			choices: filteredChannelTypeChoices,
			minChoicesForSearch: 0,
		},
		{
			type: 'dropdown',
			label: 'Input Channel',
			id: prependPrefix('input', prefix),
			default: 0,
			choices: makeDropdownChoices('Input Channel', INPUT_CHANNEL_COUNT),
			minChoicesForSearch: 0,
			isVisibleExpression: `$(options:${prependPrefix('channelType', prefix)}) == "input"`,
		},
		{
			type: 'dropdown',
			label: 'Mono Group',
			id: prependPrefix('monoGroup', prefix),
			default: 0,
			choices: makeDropdownChoices('Mono Group', MONO_GROUP_COUNT),
			minChoicesForSearch: 0,
			isVisibleExpression: `$(options:${prependPrefix('channelType', prefix)}) == "mono_group"`,
		},
		{
			type: 'dropdown',
			label: 'Stereo Group',
			id: prependPrefix('stereoGroup', prefix),
			default: 0,
			choices: makeDropdownChoices('Stereo Group', STEREO_GROUP_COUNT),
			minChoicesForSearch: 0,
			isVisibleExpression: `$(options:${prependPrefix('channelType', prefix)}) == "stereo_group"`,
		},
		{
			type: 'dropdown',
			label: 'Mono Aux',
			id: prependPrefix('monoAux', prefix),
			default: 0,
			choices: makeDropdownChoices('Mono Aux', MONO_AUX_COUNT),
			minChoicesForSearch: 0,
			isVisibleExpression: `$(options:${prependPrefix('channelType', prefix)}) == "mono_aux"`,
		},
		{
			type: 'dropdown',
			label: 'Stereo Aux',
			id: prependPrefix('stereoAux', prefix),
			default: 0,
			choices: makeDropdownChoices('Stereo Aux', STEREO_AUX_COUNT),
			minChoicesForSearch: 0,
			isVisibleExpression: `$(options:${prependPrefix('channelType', prefix)}) == "stereo_aux"`,
		},
		{
			type: 'dropdown',
			label: 'Mono Matrix',
			id: prependPrefix('monoMatrix', prefix),
			default: 0,
			choices: makeDropdownChoices('Mono Matrix', MONO_MATRIX_COUNT),
			minChoicesForSearch: 0,
			isVisibleExpression: `$(options:${prependPrefix('channelType', prefix)}) == "mono_matrix"`,
		},
		{
			type: 'dropdown',
			label: 'Stereo Matrix',
			id: prependPrefix('stereoMatrix', prefix),
			default: 0,
			choices: makeDropdownChoices('Stereo Matrix', STEREO_MATRIX_COUNT),
			minChoicesForSearch: 0,
			isVisibleExpression: `$(options:${prependPrefix('channelType', prefix)}) == "stereo_matrix"`,
		},
		{
			type: 'dropdown',
			label: 'Mono FX Send',
			id: prependPrefix('monoFxSend', prefix),
			default: 0,
			choices: makeDropdownChoices('Mono FX Send', MONO_FX_SEND_COUNT),
			minChoicesForSearch: 0,
			isVisibleExpression: `$(options:${prependPrefix('channelType', prefix)}) == "mono_fx_send"`,
		},
		{
			type: 'dropdown',
			label: 'Stereo FX Send',
			id: prependPrefix('stereoFxSend', prefix),
			default: 0,
			choices: makeDropdownChoices('Stereo FX Send', STEREO_FX_SEND_COUNT),
			minChoicesForSearch: 0,
			isVisibleExpression: `$(options:${prependPrefix('channelType', prefix)}) == "stereo_fx_send"`,
		},
		{
			type: 'dropdown',
			label: 'FX Return',
			id: prependPrefix('fxReturn', prefix),
			default: 0,
			choices: makeDropdownChoices('FX Return', FX_RETURN_COUNT),
			minChoicesForSearch: 0,
			isVisibleExpression: `$(options:${prependPrefix('channelType', prefix)}) == "fx_return"`,
		},
		{
			type: 'dropdown',
			label: 'Main',
			id: prependPrefix('main', prefix),
			default: 0,
			choices: makeDropdownChoices('Main', MAIN_COUNT),
			minChoicesForSearch: 0,
			isVisibleExpression: `$(options:${prependPrefix('channelType', prefix)}) == "main"`,
		},
		{
			type: 'dropdown',
			label: 'DCA',
			id: prependPrefix('dca', prefix),
			default: 0,
			choices: makeDropdownChoices('DCA', DCA_COUNT),
			minChoicesForSearch: 0,
			isVisibleExpression: `$(options:${prependPrefix('channelType', prefix)}) == "dca"`,
		},
		{
			type: 'dropdown',
			label: 'Mute Group',
			id: prependPrefix('muteGroup', prefix),
			default: 0,
			choices: makeDropdownChoices('Mute Group', MUTE_GROUP_COUNT),
			minChoicesForSearch: 0,
			isVisibleExpression: `$(options:${prependPrefix('channelType', prefix)}) == "mute_group"`,
		},
		{
			type: 'dropdown',
			label: 'Stereo UFX Send',
			id: prependPrefix('stereoUfxSend', prefix),
			default: 0,
			choices: makeDropdownChoices('Stereo UFX Send', STEREO_UFX_SEND_COUNT),
			minChoicesForSearch: 0,
			isVisibleExpression: `$(options:${prependPrefix('channelType', prefix)}) == "stereo_ufx_send"`,
		},
		{
			type: 'dropdown',
			label: 'Stereo UFX Return',
			id: prependPrefix('stereoUfxReturn', prefix),
			default: 0,
			choices: makeDropdownChoices('Stereo UFX Return', STEREO_UFX_RETURN_COUNT),
			minChoicesForSearch: 0,
			isVisibleExpression: `$(options:${prependPrefix('channelType', prefix)}) == "stereo_ufx_return"`,
		},
	]
}
