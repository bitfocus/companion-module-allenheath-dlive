import { SOCKET_TYPE_CHOICES } from '../../constants.js'
import { getSocketSelectOptions } from '../getSocketSelectOptions.js'

describe('getChannelSelectOptions', () => {
	it('should return the correct options when no args provided', () => {
		expect(getSocketSelectOptions()).toStrictEqual([
			{
				type: 'dropdown',
				label: 'Socket Type',
				id: 'socketType',
				default: 'mixrack_sockets_1_to_64',
				choices: SOCKET_TYPE_CHOICES,
				minChoicesForSearch: 0,
			},
			...SOCKET_INPUT_FIELDS,
		])
	})
})

const SOCKET_INPUT_FIELDS = [
	{
		type: 'dropdown',
		label: 'Mixrack Sockets 1-64',
		id: 'mixrackSockets1To64',
		default: 0,
		choices: expect.arrayContaining([{ label: 'Socket 1', id: 0 }]),
		minChoicesForSearch: 0,
		isVisibleExpression: `$(options:socketType) == "mixrack_sockets_1_to_64"`,
	},
	{
		type: 'dropdown',
		label: 'Mixrack DX 1/2 1-32',
		id: 'mixrackDx1To2',
		default: 0,
		choices: expect.arrayContaining([{ label: 'Socket 1', id: 0 }]),
		minChoicesForSearch: 0,
		isVisibleExpression: `$(options:socketType) == "mixrack_dx_1_to_2"`,
	},
	{
		type: 'dropdown',
		label: 'Mixrack DX 3/4 1-32',
		id: 'mixrackDx3To4',
		default: 0,
		choices: expect.arrayContaining([{ label: 'Socket 1', id: 0 }]),
		minChoicesForSearch: 0,
		isVisibleExpression: `$(options:socketType) == "mixrack_dx_3_to_4"`,
	},
]
