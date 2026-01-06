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
	SYSEX_HEADER,
} from '../../src/constants.js'
import { ModuleInstance } from '../../src/main.js'
import { getMidiOffsetsForChannelType } from '../../src/utils/index.js'
import { AuxFXMatrixSendLevelAction } from '../../src/validators/index.js'
import { MockModuleInstance } from '../utils/MockModuleInstance.js'

jest.mock('@companion-module/base', () => {
	class MockInstanceBase {}

	return {
		...jest.requireActual('@companion-module/base'),
		runEntrypoint: noop,
		InstanceBase: MockInstanceBase,
	}
})

describe('auxFxMatrixSendLevel action', () => {
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
			destinationDca: 0,
			destinationFxReturn: 0,
			destinationInput: 0,
			destinationMain: 0,
			destinationMonoAux: 0,
			destinationStereoAux: 0,
			destinationMonoFxSend: 0,
			destinationStereoFxSend: 0,
			destinationMonoGroup: 0,
			destinationStereoGroup: 0,
			destinationStereoMatrix: 0,
			destinationMonoMatrix: 0,
			destinationMuteGroup: 0,
			destinationStereoUfxReturn: 0,
			destinationStereoUfxSend: 0,
		},
		actionId: '',
		controlId: '',
		id: '',
	}

	// Test source channel types (excluding aux/fx/matrix which can't send)
	const sourceChannelTestCases: [ChannelType, number][] = [
		['input', INPUT_CHANNEL_COUNT],
		['mono_group', MONO_GROUP_COUNT],
		['stereo_group', STEREO_GROUP_COUNT],
		['fx_return', FX_RETURN_COUNT],
		['main', MAIN_COUNT],
		['dca', DCA_COUNT],
		['mute_group', MUTE_GROUP_COUNT],
		['stereo_ufx_send', STEREO_UFX_SEND_COUNT],
		['stereo_ufx_return', STEREO_UFX_RETURN_COUNT],
	]

	// Test destination channel types (only aux/fx/matrix can receive)
	const destinationChannelTestCases: [ChannelType, number][] = [
		['mono_aux', MONO_AUX_COUNT],
		['stereo_aux', STEREO_AUX_COUNT],
		['mono_fx_send', MONO_FX_SEND_COUNT],
		['stereo_fx_send', STEREO_FX_SEND_COUNT],
		['mono_matrix', MONO_MATRIX_COUNT],
		['stereo_matrix', STEREO_MATRIX_COUNT],
	]

	const testLevels = [0, 64, 127]

	describe.each(sourceChannelTestCases)('source channel %s', (sourceChannelType, sourceChannelCount) => {
		describe.each(destinationChannelTestCases)('destination channel %s', (destinationChannelType) => {
			// Test first and last channel for source
			const testSourceChannels = [1, sourceChannelCount]
			// Test first channel for destination
			const testDestinationChannels = [1]

			describe.each(testSourceChannels)('source channel %s', (sourceChannelNo: number) => {
				describe.each(testDestinationChannels)('destination channel %s', (destinationChannelNo: number) => {
					it.each(testLevels)('level=%s', (level) => {
						const sourceChannelIndex = sourceChannelNo - 1
						const destinationChannelIndex = destinationChannelNo - 1

						const auxFxMatrixSendLevelAction: AuxFXMatrixSendLevelAction = {
							...baseAction,
							options: {
								...baseAction.options,
								channelType: sourceChannelType,
								destinationChannelType,
								level,
								[camelCase(sourceChannelType)]: sourceChannelIndex,
								[camelCase(`destination_${destinationChannelType}`)]: destinationChannelIndex,
							},
						}

						void moduleInstance.actionDefinitions.auxFxMatrixSendLevel?.callback?.(
							auxFxMatrixSendLevelAction as CompanionActionEvent,
							{} as CompanionActionContext,
						)

						const { midiChannelOffset, midiNoteOffset } = getMidiOffsetsForChannelType(sourceChannelType)
						const { midiChannelOffset: destinationMidiChannelOffset, midiNoteOffset: destinationMidiNoteOffset } =
							getMidiOffsetsForChannelType(destinationChannelType)

						expect(sendMidiToDliveSpy).toHaveBeenCalledTimes(1)
						expect(sendMidiToDliveSpy).toHaveBeenCalledWith([
							...SYSEX_HEADER,
							midiChannelOffset,
							0xd,
							sourceChannelIndex + midiNoteOffset,
							destinationMidiChannelOffset,
							destinationChannelIndex + destinationMidiNoteOffset,
							level,
							0xf7,
						])
					})
				})
			})
		})
	})
})
