import { CompanionActionContext, CompanionActionEvent } from '@companion-module/base'
import { camelCase, noop } from 'lodash/fp'

import { UpdateActions } from '../../src/actions.js'
import {
	FX_RETURN_COUNT,
	INPUT_CHANNEL_COUNT,
	MONO_GROUP_COUNT,
	STEREO_GROUP_COUNT,
	STEREO_UFX_RETURN_COUNT,
} from '../../src/constants.js'
import { ModuleInstance } from '../../src/main.js'
import { getMidiOffsetsForChannelType } from '../../src/utils/index.js'
import { AssignChannelToMainMixAction } from '../../src/validators/index.js'
import { MockModuleInstance } from '../utils/MockModuleInstance.js'

jest.mock('@companion-module/base', () => {
	class MockInstanceBase {}

	return {
		...jest.requireActual('@companion-module/base'),
		runEntrypoint: noop,
		InstanceBase: MockInstanceBase,
	}
})

describe('assignToMainMix action', () => {
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

	// Test cases exclude channels that cannot be assigned to main mix
	const testCases: [ChannelType, number][] = [
		['input', INPUT_CHANNEL_COUNT],
		['mono_group', MONO_GROUP_COUNT],
		['stereo_group', STEREO_GROUP_COUNT],
		['fx_return', FX_RETURN_COUNT],
		['stereo_ufx_return', STEREO_UFX_RETURN_COUNT],
	]

	const testAssignStates = [true, false]

	describe.each(testCases)('should assign %s to main mix', (channelType, channelCount) => {
		// Test first and last channel for each channel type
		const testChannels = [1, channelCount]

		describe.each(testChannels)('channel %s', (channelNo: number) => {
			it.each(testAssignStates)('assign=%s', (assign) => {
				const channelIndex = channelNo - 1

				const assignAction: AssignChannelToMainMixAction = {
					...baseAction,
					options: {
						...baseAction.options,
						channelType,
						assign,
						[camelCase(channelType)]: channelIndex,
					},
				}

				void moduleInstance.actionDefinitions.assignToMainMix?.callback?.(
					assignAction as CompanionActionEvent,
					{} as CompanionActionContext,
				)

				const { midiChannelOffset, midiNoteOffset } = getMidiOffsetsForChannelType(channelType)

				expect(sendMidiToDliveSpy).toHaveBeenCalledTimes(1)
				expect(sendMidiToDliveSpy).toHaveBeenCalledWith([
					0xb0 + midiChannelOffset,
					0x63,
					channelIndex + midiNoteOffset,
					0x62,
					0x18,
					0x06,
					assign ? 0x7f : 0x3f,
				])
			})
		})
	})
})
