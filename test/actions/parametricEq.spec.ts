import { CompanionActionContext, CompanionActionEvent } from '@companion-module/base'
import { camelCase, noop } from 'lodash/fp'

import { UpdateActions } from '../../src/actions.js'
import {
	EQ_MAXIMUM_GAIN,
	EQ_MINIMUM_GAIN,
	EQ_PARAMETER_MIDI_VALUES_FOR_BANDS,
	EQ_TYPES,
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
} from '../../src/constants.js'
import { ModuleInstance } from '../../src/main.js'
import { eqGainToMidiValue, eqWidthToMidiValue, getMidiOffsetsForChannelType } from '../../src/utils/index.js'
import { ParametricEqAction } from '../../src/validators/index.js'
import { MockModuleInstance } from '../utils/MockModuleInstance.js'

jest.mock('@companion-module/base', () => {
	class MockInstanceBase {}

	return {
		...jest.requireActual('@companion-module/base'),
		runEntrypoint: noop,
		InstanceBase: MockInstanceBase,
	}
})

describe('parametricEq action', () => {
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

	// Test first and last band
	const testBands = [0, 3]

	// Test first and last EQ type
	const testTypes = [EQ_TYPES[0], EQ_TYPES[EQ_TYPES.length - 1]]

	// Test min, middle, and max frequency (MIDI values 0-127)
	const testFrequencies = [0, 63, 127]

	// Test min, middle, and max width
	const testWidths = [0.1, 0.8, 1.5]

	// Test min, middle, and max gain
	const testGains = [EQ_MINIMUM_GAIN, 0, EQ_MAXIMUM_GAIN]

	describe.each(testCases)('channel type %s', (channelType, channelCount) => {
		// Test first and last channel for each channel type
		const testChannels = [1, channelCount]

		describe.each(testChannels)('channel %s', (channelNo: number) => {
			describe.each(testBands)('band %s', (band) => {
				it.each(testTypes)('type=%s', (type) => {
					const channelIndex = channelNo - 1
					const frequency = testFrequencies[0]
					const width = testWidths[0]
					const gain = testGains[0]

					const parametricEqAction: ParametricEqAction = {
						...baseAction,
						options: {
							...baseAction.options,
							channelType,
							band,
							band0Type: type,
							band0Frequency: frequency,
							band0Width: width,
							band0Gain: gain,
							band1Frequency: frequency,
							band1Width: width,
							band1Gain: gain,
							band2Frequency: frequency,
							band2Width: width,
							band2Gain: gain,
							band3Type: type,
							band3Frequency: frequency,
							band3Width: width,
							band3Gain: gain,
							[camelCase(channelType)]: channelIndex,
						},
					}

					void moduleInstance.actionDefinitions.parametricEq?.callback?.(
						parametricEqAction as CompanionActionEvent,
						{} as CompanionActionContext,
					)

					const { midiChannelOffset, midiNoteOffset } = getMidiOffsetsForChannelType(channelType)
					const gainMidiValue = eqGainToMidiValue(gain)
					const widthMidiValue = eqWidthToMidiValue(width)
					const typeMidiValue = EQ_TYPES.indexOf(type)
					const parameterMidiValuesForBand = EQ_PARAMETER_MIDI_VALUES_FOR_BANDS[band]

					expect(sendMidiToDliveSpy).toHaveBeenCalledTimes(4)
					expect(sendMidiToDliveSpy).toHaveBeenNthCalledWith(1, [
						0xb0 + midiChannelOffset,
						0x63,
						channelIndex + midiNoteOffset,
						0x62,
						parameterMidiValuesForBand.type,
						0x06,
						typeMidiValue,
					])
					expect(sendMidiToDliveSpy).toHaveBeenNthCalledWith(2, [
						0xb0 + midiChannelOffset,
						0x63,
						channelIndex + midiNoteOffset,
						0x62,
						parameterMidiValuesForBand.frequency,
						0x06,
						frequency,
					])
					expect(sendMidiToDliveSpy).toHaveBeenNthCalledWith(3, [
						0xb0 + midiChannelOffset,
						0x63,
						channelIndex + midiNoteOffset,
						0x62,
						parameterMidiValuesForBand.width,
						0x06,
						widthMidiValue,
					])
					expect(sendMidiToDliveSpy).toHaveBeenNthCalledWith(4, [
						0xb0 + midiChannelOffset,
						0x63,
						channelIndex + midiNoteOffset,
						0x62,
						parameterMidiValuesForBand.gain,
						0x06,
						gainMidiValue,
					])
				})
			})
		})
	})
})
