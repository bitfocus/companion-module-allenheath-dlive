import { CompanionActionContext, CompanionActionEvent } from '@companion-module/base'
import { camelCase, noop } from 'lodash/fp'

import { UpdateActions } from '../../src/actions.js'
import {
	MIXRACK_DX_SOCKET_COUNT,
	MIXRACK_SOCKET_COUNT,
	PREAMP_MAXIMUM_GAIN,
	PREAMP_MINIMUM_GAIN,
	SOCKET_MIDI_NOTE_OFFSETS,
} from '../../src/constants.js'
import { ModuleInstance } from '../../src/main.js'
import { preampGainToMidiValue } from '../../src/utils/index.js'
import { SetSocketPreampGainAction } from '../../src/validators/index.js'
import { MockModuleInstance } from '../utils/MockModuleInstance.js'

jest.mock('@companion-module/base', () => {
	class MockInstanceBase {}

	return {
		...jest.requireActual('@companion-module/base'),
		runEntrypoint: noop,
		InstanceBase: MockInstanceBase,
	}
})

describe('setSocketPreampGain action', () => {
	let moduleInstance: MockModuleInstance
	let sendMidiToDliveSpy: jest.SpyInstance

	beforeAll(() => {
		moduleInstance = new MockModuleInstance({})
		sendMidiToDliveSpy = jest.spyOn(moduleInstance, 'sendMidiToDlive')
		UpdateActions(moduleInstance as unknown as ModuleInstance)
	})

	beforeEach(() => {
		jest.clearAllMocks()
	})

	const baseAction = {
		options: {
			mixrackSockets1To64: 0,
			mixrackDx1To2: 0,
			mixrackDx3To4: 0,
		},
		actionId: '',
		controlId: '',
		id: '',
	}

	// Test socket types
	const testCases: [SocketType, number][] = [
		['mixrack_sockets_1_to_64', MIXRACK_SOCKET_COUNT],
		['mixrack_dx_1_to_2', MIXRACK_DX_SOCKET_COUNT],
		['mixrack_dx_3_to_4', MIXRACK_DX_SOCKET_COUNT],
	]

	// Test minimum, middle, and maximum gain values
	const testGains = [PREAMP_MINIMUM_GAIN, 32.5, PREAMP_MAXIMUM_GAIN]

	describe.each(testCases)('socket type %s', (socketType, socketCount) => {
		// Test first and last socket for each socket type
		const testSockets = [1, socketCount]

		describe.each(testSockets)('socket %s', (socketNo: number) => {
			it.each(testGains)('gain=%s', (gain) => {
				const socketIndex = socketNo - 1

				const setSocketPreampGainAction: SetSocketPreampGainAction = {
					...baseAction,
					options: {
						...baseAction.options,
						socketType,
						gain,
						[camelCase(socketType)]: socketIndex,
					},
				}

				void moduleInstance.actionDefinitions.setSocketPreampGain?.callback?.(
					setSocketPreampGainAction as CompanionActionEvent,
					{} as CompanionActionContext,
				)

				const midiNoteOffset = SOCKET_MIDI_NOTE_OFFSETS[socketType]
				const gainMidiValue = preampGainToMidiValue(gain)

				expect(sendMidiToDliveSpy).toHaveBeenCalledTimes(1)
				expect(sendMidiToDliveSpy).toHaveBeenCalledWith([0xe0, socketIndex + midiNoteOffset, gainMidiValue])
			})
		})
	})
})
