import { CompanionActionContext, CompanionActionEvent } from '@companion-module/base'
import { camelCase, indexOf, noop } from 'lodash/fp'

import { UpdateActions } from '../../src/actions.js'
import {
	CHANNEL_COLOURS,
	FX_RETURN_COUNT,
	INPUT_CHANNEL_COUNT,
	MAIN_COUNT,
	MONO_AUX_COUNT,
	MONO_FX_SEND_COUNT,
	MONO_GROUP_COUNT,
	MONO_MATRIX_COUNT,
	STEREO_AUX_COUNT,
	STEREO_FX_SEND_COUNT,
	STEREO_GROUP_COUNT,
	STEREO_MATRIX_COUNT,
	STEREO_UFX_RETURN_COUNT,
	STEREO_UFX_SEND_COUNT,
	SYSEX_HEADER,
} from '../../src/constants.js'
import { ModuleInstance } from '../../src/main.js'
import { getMidiOffsetsForChannelType } from '../../src/utils/index.js'
import { SetChannelColourAction } from '../../src/validators/index.js'
import { MockModuleInstance } from '../utils/MockModuleInstance.js'

jest.mock('@companion-module/base', () => {
	class MockInstanceBase {}

	return {
		...jest.requireActual('@companion-module/base'),
		runEntrypoint: noop,
		InstanceBase: MockInstanceBase,
	}
})

describe('setChannelColour action', () => {
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
			dca: 0,
			fxReturn: 0,
			input: 0,
			main: 0,
			monoAux: 0,
			stereoAux: 0,
			monoFxSend: 0,
			stereoFxSend: 0,
			monoGroup: 0,
			stereoGroup: 0,
			stereoMatrix: 0,
			monoMatrix: 0,
			muteGroup: 0,
			stereoUfxReturn: 0,
			stereoUfxSend: 0,
		},
		actionId: '',
		controlId: '',
		id: '',
	}

	// Test channel types (all types)
	const testCases: [ChannelType, number][] = [
		['input', INPUT_CHANNEL_COUNT],
		['mono_group', MONO_GROUP_COUNT],
		['stereo_group', STEREO_GROUP_COUNT],
		['mono_aux', MONO_AUX_COUNT],
		['stereo_aux', STEREO_AUX_COUNT],
		['mono_matrix', MONO_MATRIX_COUNT],
		['stereo_matrix', STEREO_MATRIX_COUNT],
		['mono_fx_send', MONO_FX_SEND_COUNT],
		['stereo_fx_send', STEREO_FX_SEND_COUNT],
		['fx_return', FX_RETURN_COUNT],
		['main', MAIN_COUNT],
		['stereo_ufx_send', STEREO_UFX_SEND_COUNT],
		['stereo_ufx_return', STEREO_UFX_RETURN_COUNT],
	]

	// Test first, middle, and last colour
	const testColours: ChannelColour[] = ['off', 'yellow', 'white']

	describe.each(testCases)('channel type %s', (channelType, channelCount) => {
		// Test first and last channel for each channel type
		const testChannels = [1, channelCount]

		describe.each(testChannels)('channel %s', (channelNo: number) => {
			it.each(testColours)('colour=%s', (colour) => {
				const channelIndex = channelNo - 1
				const colourIndex = indexOf(colour, CHANNEL_COLOURS)

				const setChannelColourAction: SetChannelColourAction = {
					...baseAction,
					options: {
						...baseAction.options,
						channelType,
						colour: colourIndex,
						[camelCase(channelType)]: channelIndex,
					},
				}

				void moduleInstance.actionDefinitions.setChannelColour?.callback?.(
					setChannelColourAction as CompanionActionEvent,
					{} as CompanionActionContext,
				)

				const { midiChannelOffset, midiNoteOffset } = getMidiOffsetsForChannelType(channelType)

				expect(sendMidiToDliveSpy).toHaveBeenCalledTimes(1)
				expect(sendMidiToDliveSpy).toHaveBeenCalledWith([
					...SYSEX_HEADER,
					midiChannelOffset,
					0x06,
					channelIndex + midiNoteOffset,
					colourIndex,
					0xf7,
				])
			})
		})
	})
})
