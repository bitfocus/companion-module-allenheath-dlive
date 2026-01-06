import { CompanionActionContext, CompanionActionEvent } from '@companion-module/base'
import { camelCase, noop } from 'lodash/fp'

import { UpdateActions } from '../../src/actions.js'
import {
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
} from '../../src/constants.js'
import { ModuleInstance } from '../../src/main.js'
import { getMidiOffsetsForChannelType } from '../../src/utils/index.js'
import { MuteAction } from '../../src/validators/index.js'
import { MockModuleInstance } from '../utils/MockModuleInstance.js'

jest.mock('@companion-module/base', () => {
	class MockInstanceBase {}

	return {
		...jest.requireActual('@companion-module/base'),
		runEntrypoint: noop,
		InstanceBase: MockInstanceBase,
	}
})

describe('mute action', () => {
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
		['mute_group', MUTE_GROUP_COUNT],
		['stereo_ufx_send', STEREO_UFX_SEND_COUNT],
		['stereo_ufx_return', STEREO_UFX_RETURN_COUNT],
		['dca', DCA_COUNT],
	]

	describe.each(testCases)('should mute %s', (channelType, channelCount) => {
		// Test first and last channel
		const testChannels = [0, channelCount - 1]

		it.each(testChannels)('channel %s', (channelIndex) => {
			const muteOnAction: MuteAction = {
				...baseAction,
				options: {
					...baseAction.options,
					channelType,
					mute: true,
					[camelCase(channelType)]: channelIndex,
				},
			}

			void moduleInstance.actionDefinitions.mute?.callback?.(
				muteOnAction as CompanionActionEvent,
				{} as CompanionActionContext,
			)

			const { midiChannelOffset, midiNoteOffset } = getMidiOffsetsForChannelType(channelType)

			expect(sendMidiToDliveSpy).toHaveBeenCalledWith([
				0x90 + midiChannelOffset,
				channelIndex + midiNoteOffset,
				0x7f,
				channelIndex + midiNoteOffset,
				0x00,
			])
		})
	})

	describe.each(testCases)('should unmute %s', (channelType, channelCount) => {
		// Test first and last channel
		const testChannels = [0, channelCount - 1]

		it.each(testChannels)('channel %s', (channelIndex) => {
			const muteOnAction: MuteAction = {
				...baseAction,
				options: {
					...baseAction.options,
					channelType,
					mute: false,
					[camelCase(channelType)]: channelIndex,
				},
			}

			void moduleInstance.actionDefinitions.mute?.callback?.(
				muteOnAction as CompanionActionEvent,
				{} as CompanionActionContext,
			)

			const { midiChannelOffset, midiNoteOffset } = getMidiOffsetsForChannelType(channelType)

			expect(sendMidiToDliveSpy).toHaveBeenCalledWith([
				0x90 + midiChannelOffset,
				channelIndex + midiNoteOffset,
				0x3f,
				channelIndex + midiNoteOffset,
				0x00,
			])
		})
	})
})
