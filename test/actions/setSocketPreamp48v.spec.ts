import { CompanionActionContext, CompanionActionEvent } from '@companion-module/base'
import { camelCase, noop } from 'lodash/fp'

import { UpdateActions } from '../../src/actions.js'
import {
	MIXRACK_DX_SOCKET_COUNT,
	MIXRACK_SOCKET_COUNT,
	SOCKET_MIDI_NOTE_OFFSETS,
	SYSEX_HEADER,
} from '../../src/constants.js'
import { ModuleInstance } from '../../src/main.js'
import { SetSocketPreamp48vAction } from '../../src/validators/index.js'
import { MockModuleInstance } from '../utils/MockModuleInstance.js'

jest.mock('@companion-module/base', () => {
	class MockInstanceBase {}

	return {
		...jest.requireActual('@companion-module/base'),
		runEntrypoint: noop,
		InstanceBase: MockInstanceBase,
	}
})

describe('setSocketPreamp48v action', () => {
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

	const testPhantomStates = [true, false]

	describe.each(testCases)('socket type %s', (socketType, socketCount) => {
		// Test first and last socket for each socket type
		const testSockets = [1, socketCount]

		describe.each(testSockets)('socket %s', (socketNo: number) => {
			it.each(testPhantomStates)('phantom=%s', (phantom) => {
				const socketIndex = socketNo - 1

				const setSocketPreamp48vAction: SetSocketPreamp48vAction = {
					...baseAction,
					options: {
						...baseAction.options,
						socketType,
						phantom,
						[camelCase(socketType)]: socketIndex,
					},
				}

				void moduleInstance.actionDefinitions.setSocketPreamp48v?.callback?.(
					setSocketPreamp48vAction as CompanionActionEvent,
					{} as CompanionActionContext,
				)

				const midiNoteOffset = SOCKET_MIDI_NOTE_OFFSETS[socketType]

				expect(sendMidiToDliveSpy).toHaveBeenCalledTimes(1)
				expect(sendMidiToDliveSpy).toHaveBeenCalledWith([
					...SYSEX_HEADER,
					0,
					0xc,
					socketIndex + midiNoteOffset,
					phantom ? 0x40 : 0x0,
					0xf7,
				])
			})
		})
	})
})
