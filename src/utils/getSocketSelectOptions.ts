import { SomeCompanionActionInputField } from '@companion-module/base'

import { MIXRACK_DX_SOCKET_COUNT, MIXRACK_SOCKET_COUNT, SOCKET_TYPE_CHOICES } from '../constants.js'
import { makeDropdownChoices } from './makeDropdownChoices.js'

/**
 * Helper to create a set of fields for a Companion action that allow selection of a socket type and number.
 * These appear in the Companion UI as two dropdowns: one for choosing the socket type, e.g.
 * 'MixRack Sockets 1-64' and another for choosing the socket, e.g. 'Socket 1'
 * @returns Array of Companion action input fields
 */
export const getSocketSelectOptions = (): SomeCompanionActionInputField[] => [
	{
		type: 'dropdown',
		label: 'Socket Type',
		id: 'socketType',
		default: SOCKET_TYPE_CHOICES[0].id,
		choices: SOCKET_TYPE_CHOICES,
		minChoicesForSearch: 0,
	},
	{
		type: 'dropdown',
		label: 'Mixrack Sockets 1-64',
		id: 'mixrackSockets1To64',
		default: 0,
		choices: makeDropdownChoices('Socket', MIXRACK_SOCKET_COUNT),
		minChoicesForSearch: 0,
		isVisibleExpression: `$(options:socketType) == "mixrack_sockets_1_to_64"`,
	},
	{
		type: 'dropdown',
		label: 'Mixrack DX 1/2 1-32',
		id: 'mixrackDx1To2',
		default: 0,
		choices: makeDropdownChoices('Socket', MIXRACK_DX_SOCKET_COUNT),
		minChoicesForSearch: 0,
		isVisibleExpression: `$(options:socketType) == "mixrack_dx_1_to_2"`,
	},
	{
		type: 'dropdown',
		label: 'Mixrack DX 3/4 1-32',
		id: 'mixrackDx3To4',
		default: 0,
		choices: makeDropdownChoices('Socket', MIXRACK_DX_SOCKET_COUNT),
		minChoicesForSearch: 0,
		isVisibleExpression: `$(options:socketType) == "mixrack_dx_3_to_4"`,
	},
]
