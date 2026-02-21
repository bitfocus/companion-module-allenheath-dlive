import { CompanionActionEvent } from '@companion-module/base'
import { z } from 'zod'

import {
	CHANNEL_COLOURS,
	CHANNEL_TYPES,
	CUE_LIST_COUNT,
	DCA_COUNT,
	EQ_MAXIMUM_GAIN,
	EQ_MAXIMUM_WIDTH,
	EQ_MINIMUM_GAIN,
	EQ_MINIMUM_WIDTH,
	EQ_TYPES,
	FX_RETURN_COUNT,
	INPUT_CHANNEL_COUNT,
	MAIN_COUNT,
	MAX_TCP_PORT,
	MIN_TCP_PORT,
	MIXRACK_DX_SOCKET_COUNT,
	MIXRACK_SOCKET_COUNT,
	MONO_AUX_COUNT,
	MONO_FX_SEND_COUNT,
	MONO_GROUP_COUNT,
	MONO_MATRIX_COUNT,
	MUTE_GROUP_COUNT,
	PREAMP_MAXIMUM_GAIN,
	PREAMP_MINIMUM_GAIN,
	SCENE_COUNT,
	SOCKET_TYPES,
	STEREO_AUX_COUNT,
	STEREO_FX_SEND_COUNT,
	STEREO_GROUP_COUNT,
	STEREO_MATRIX_COUNT,
	STEREO_UFX_RETURN_COUNT,
	STEREO_UFX_SEND_COUNT,
	UFX_KEY_CHOICES,
	UFX_SCALE_CHOICES,
} from '../constants.js'

/**
 * Type helper that prepends a prefix to each key of a Zod shape using camel case
 */
type PrefixedShape<S extends z.ZodRawShape, P extends string> = {
	[K in keyof S as P extends '' ? K : `${P}${Capitalize<string & K>}`]: S[K]
}

export const prefixShape = <S extends z.ZodRawShape, P extends string>(shape: S, prefix: P): PrefixedShape<S, P> =>
	Object.fromEntries(
		Object.entries(shape).map(([k, v]) => [prefix ? prefix + k.charAt(0).toUpperCase() + k.slice(1) : k, v]),
	) as PrefixedShape<S, P>

/**
 * Schema representing the CompanionActionEvent interface, the base for all actions coming from Companion
 */
const InputValueSchema = z.union([z.number(), z.string(), z.boolean(), z.array(z.union([z.string(), z.number()]))])

const CompanionActionEventBaseSchema = z.object({
	surfaceId: z.string().optional(),
	id: z.string(),
	controlId: z.string(),
	actionId: z.string(),
	options: z.record(z.string(), InputValueSchema.optional()),
})

/**
 * Object representing the options the getChannelSelectOptions function adds to a Companion action
 */
const channelOptions = {
	channelType: z.enum(CHANNEL_TYPES),
	input: z
		.number()
		.int()
		.min(0)
		.max(INPUT_CHANNEL_COUNT - 1),
	monoGroup: z
		.number()
		.int()
		.min(0)
		.max(MONO_GROUP_COUNT - 1),
	stereoGroup: z
		.number()
		.int()
		.min(0)
		.max(STEREO_GROUP_COUNT - 1),
	monoAux: z
		.number()
		.int()
		.min(0)
		.max(MONO_AUX_COUNT - 1),
	stereoAux: z
		.number()
		.int()
		.min(0)
		.max(STEREO_AUX_COUNT - 1),
	monoMatrix: z
		.number()
		.int()
		.min(0)
		.max(MONO_MATRIX_COUNT - 1),
	stereoMatrix: z
		.number()
		.int()
		.min(0)
		.max(STEREO_MATRIX_COUNT - 1),
	monoFxSend: z
		.number()
		.int()
		.min(0)
		.max(MONO_FX_SEND_COUNT - 1),
	stereoFxSend: z
		.number()
		.int()
		.min(0)
		.max(STEREO_FX_SEND_COUNT - 1),
	fxReturn: z
		.number()
		.int()
		.min(0)
		.max(FX_RETURN_COUNT - 1),
	main: z
		.number()
		.int()
		.min(0)
		.max(MAIN_COUNT - 1),
	dca: z
		.number()
		.int()
		.min(0)
		.max(DCA_COUNT - 1),
	muteGroup: z
		.number()
		.int()
		.min(0)
		.max(MUTE_GROUP_COUNT - 1),
	stereoUfxSend: z
		.number()
		.int()
		.min(0)
		.max(STEREO_UFX_SEND_COUNT - 1),
	stereoUfxReturn: z
		.number()
		.int()
		.min(0)
		.max(STEREO_UFX_RETURN_COUNT - 1),
} as const

/**
 * Object representing the options the getSocketSelectOptions function adds to a Companion action
 */
const socketOptions = {
	socketType: z.enum(SOCKET_TYPES),
	mixrackSockets1To64: z
		.number()
		.int()
		.min(0)
		.max(MIXRACK_SOCKET_COUNT - 1),
	mixrackDx1To2: z
		.number()
		.int()
		.min(0)
		.max(MIXRACK_DX_SOCKET_COUNT - 1),
	mixrackDx3To4: z
		.number()
		.int()
		.min(0)
		.max(MIXRACK_DX_SOCKET_COUNT - 1),
} as const

/**
 * Schemas representing the options for each specific action
 */

const MuteActionSchema = CompanionActionEventBaseSchema.extend({
	options: z.object({
		...channelOptions,
		mute: z.boolean(),
	}),
})

const MuteToggleActionSchema = CompanionActionEventBaseSchema.extend({
	options: z.object({
		...channelOptions,
	}),
})

const FaderLevelActionSchema = CompanionActionEventBaseSchema.extend({
	options: z.object({
		...channelOptions,
		level: z.number().int().min(0).max(127),
	}),
})

const FaderLevelIncrementActionSchema = CompanionActionEventBaseSchema.extend({
	options: z.object({
		...channelOptions,
		increment: z.number().min(0.5).max(3.0),
	}),
})

const FaderLevelDecrementActionSchema = CompanionActionEventBaseSchema.extend({
	options: z.object({
		...channelOptions,
		decrement: z.number().min(0.5).max(3.0),
	}),
})

const AssignChannelToMainMixActionSchema = CompanionActionEventBaseSchema.extend({
	options: z.object({
		...channelOptions,
		assign: z.boolean(),
	}),
})

const AuxFXMatrixSendLevelActionSchema = CompanionActionEventBaseSchema.extend({
	options: z.object({
		...channelOptions,
		...prefixShape(channelOptions, 'destination'),
		level: z.number().int().min(0).max(127),
	}),
})

const InputToGroupAuxOnActionSchema = CompanionActionEventBaseSchema.extend({
	options: z.object({
		...prefixShape(channelOptions, 'destination'),
		input: z
			.number()
			.int()
			.min(0)
			.max(INPUT_CHANNEL_COUNT - 1),
		on: z.boolean(),
	}),
})

const DcaAssignActionSchema = CompanionActionEventBaseSchema.extend({
	options: z.object({
		...channelOptions,
		destinationDca: z
			.number()
			.int()
			.min(0)
			.max(DCA_COUNT - 1),
		assign: z.boolean(),
	}),
})

const MuteGroupAssignActionSchema = CompanionActionEventBaseSchema.extend({
	options: z.object({
		...channelOptions,
		destinationMuteGroup: z
			.number()
			.int()
			.min(0)
			.max(MUTE_GROUP_COUNT - 1),
		assign: z.boolean(),
	}),
})

const SetSocketPreampGainActionSchema = CompanionActionEventBaseSchema.extend({
	options: z.object({
		...socketOptions,
		gain: z.number().min(PREAMP_MINIMUM_GAIN).max(PREAMP_MAXIMUM_GAIN),
	}),
})

const SetSocketPreampPadActionSchema = CompanionActionEventBaseSchema.extend({
	options: z.object({
		...socketOptions,
		pad: z.boolean(),
	}),
})

const SetSocketPreamp48vActionSchema = CompanionActionEventBaseSchema.extend({
	options: z.object({
		...socketOptions,
		phantom: z.boolean(),
	}),
})

const SetChannelNameActionSchema = CompanionActionEventBaseSchema.extend({
	options: z.object({
		...channelOptions,
		name: z.string(),
	}),
})

const SetChannelColourActionSchema = CompanionActionEventBaseSchema.extend({
	options: z.object({
		...channelOptions,
		colour: z
			.number()
			.int()
			.min(0)
			.max(CHANNEL_COLOURS.length - 1),
	}),
})

const RecallSceneActionSchema = CompanionActionEventBaseSchema.extend({
	options: z.object({
		scene: z
			.number()
			.int()
			.min(0)
			.max(SCENE_COUNT - 1),
	}),
})

const RecallCueListActionSchema = CompanionActionEventBaseSchema.extend({
	options: z.object({
		recallId: z
			.number()
			.int()
			.min(0)
			.max(CUE_LIST_COUNT - 1),
	}),
})

const GoNextPreviousActionSchema = CompanionActionEventBaseSchema.extend({
	options: z.object({
		controlNumber: z.number().int().min(0).max(127),
		controlValue: z.number().int().min(0).max(127),
	}),
})

const ParametricEqActionSchema = CompanionActionEventBaseSchema.extend({
	options: z.object({
		...channelOptions,
		band: z.number().int().min(0).max(3),
		band0Type: z.enum(EQ_TYPES),
		band3Type: z.enum(EQ_TYPES),
		band0Frequency: z.number().min(0).max(127),
		band1Frequency: z.number().min(0).max(127),
		band2Frequency: z.number().min(0).max(127),
		band3Frequency: z.number().min(0).max(127),
		band0Width: z.number().min(EQ_MINIMUM_WIDTH).max(EQ_MAXIMUM_WIDTH),
		band1Width: z.number().min(EQ_MINIMUM_WIDTH).max(EQ_MAXIMUM_WIDTH),
		band2Width: z.number().min(EQ_MINIMUM_WIDTH).max(EQ_MAXIMUM_WIDTH),
		band3Width: z.number().min(EQ_MINIMUM_WIDTH).max(EQ_MAXIMUM_WIDTH),
		band0Gain: z.number().min(EQ_MINIMUM_GAIN).max(EQ_MAXIMUM_GAIN),
		band1Gain: z.number().min(EQ_MINIMUM_GAIN).max(EQ_MAXIMUM_GAIN),
		band2Gain: z.number().min(EQ_MINIMUM_GAIN).max(EQ_MAXIMUM_GAIN),
		band3Gain: z.number().min(EQ_MINIMUM_GAIN).max(EQ_MAXIMUM_GAIN),
	}),
})

const HpfFrequencyActionSchema = CompanionActionEventBaseSchema.extend({
	options: z.object({
		input: z
			.number()
			.int()
			.min(0)
			.max(INPUT_CHANNEL_COUNT - 1),
		frequency: z.number().min(0).max(127),
	}),
})

const SetHpfOnOffActionSchema = CompanionActionEventBaseSchema.extend({
	options: z.object({
		input: z
			.number()
			.int()
			.min(0)
			.max(INPUT_CHANNEL_COUNT - 1),
		hpf: z.boolean(),
	}),
})

const SetUfxGlobalKeyActionSchema = CompanionActionEventBaseSchema.extend({
	options: z.object({
		key: z
			.number()
			.int()
			.min(0)
			.max(UFX_KEY_CHOICES.length - 1),
	}),
})

const SetUfxGlobalScaleActionSchema = CompanionActionEventBaseSchema.extend({
	options: z.object({
		scale: z
			.number()
			.int()
			.min(0)
			.max(UFX_SCALE_CHOICES.length - 1),
	}),
})

const SetUfxUnitParameterActionSchema = CompanionActionEventBaseSchema.extend({
	options: z.object({
		midiChannel: z.number().int().min(1).max(16),
		controlNumber: z.number().int().min(0).max(127),
		controlValue: z.number().int().min(0).max(127),
	}),
})

/**
 * Schema representing the DLive module configuration
 */
const DliveModuleConfigSchema = z.object({
	host: z.string(),
	midiChannel: z.number().int().min(0).max(11),
	midiPort: z.number().int().min(MIN_TCP_PORT).max(MAX_TCP_PORT),
})

export type MuteAction = z.infer<typeof MuteActionSchema>

export type MuteToggleAction = z.infer<typeof MuteToggleActionSchema>

export type FaderLevelAction = z.infer<typeof FaderLevelActionSchema>

export type FaderLevelIncrementAction = z.infer<typeof FaderLevelIncrementActionSchema>

export type FaderLevelDecrementAction = z.infer<typeof FaderLevelDecrementActionSchema>

export type AssignChannelToMainMixAction = z.infer<typeof AssignChannelToMainMixActionSchema>

export type AuxFXMatrixSendLevelAction = z.infer<typeof AuxFXMatrixSendLevelActionSchema>

export type InputToGroupAuxOnAction = z.infer<typeof InputToGroupAuxOnActionSchema>

export type DcaAssignAction = z.infer<typeof DcaAssignActionSchema>

export type MuteGroupAssignAction = z.infer<typeof MuteGroupAssignActionSchema>

export type SetSocketPreampGainAction = z.infer<typeof SetSocketPreampGainActionSchema>

export type SetSocketPreampPadAction = z.infer<typeof SetSocketPreampPadActionSchema>

export type SetSocketPreamp48vAction = z.infer<typeof SetSocketPreamp48vActionSchema>

export type SetChannelNameAction = z.infer<typeof SetChannelNameActionSchema>

export type SetChannelColourAction = z.infer<typeof SetChannelColourActionSchema>

export type RecallSceneAction = z.infer<typeof RecallSceneActionSchema>

export type RecallCueListAction = z.infer<typeof RecallCueListActionSchema>

export type GoNextPreviousAction = z.infer<typeof GoNextPreviousActionSchema>

export type ParametricEqAction = z.infer<typeof ParametricEqActionSchema>

export type HpfFrequencyAction = z.infer<typeof HpfFrequencyActionSchema>

export type SetHpfOnOffAction = z.infer<typeof SetHpfOnOffActionSchema>

export type SetUfxGlobalKeyAction = z.infer<typeof SetUfxGlobalKeyActionSchema>

export type SetUfxGlobalScaleAction = z.infer<typeof SetUfxGlobalScaleActionSchema>

export type SetUfxUnitParameterAction = z.infer<typeof SetUfxUnitParameterActionSchema>

export const parseMuteAction = (action: CompanionActionEvent): MuteAction => MuteActionSchema.parse(action)

export const parseMuteToggleAction = (action: CompanionActionEvent): MuteToggleAction =>
	MuteToggleActionSchema.parse(action)

export const parseFaderLevelAction = (action: CompanionActionEvent): FaderLevelAction =>
	FaderLevelActionSchema.parse(action)

export const parseFaderLevelIncrementAction = (action: CompanionActionEvent): FaderLevelIncrementAction =>
	FaderLevelIncrementActionSchema.parse(action)

export const parseFaderLevelDecrementAction = (action: CompanionActionEvent): FaderLevelDecrementAction =>
	FaderLevelDecrementActionSchema.parse(action)

export const parseAssignChannelToMainMixAction = (action: CompanionActionEvent): AssignChannelToMainMixAction =>
	AssignChannelToMainMixActionSchema.parse(action)

export const parseAuxFxMatrixSendLevelAction = (action: CompanionActionEvent): AuxFXMatrixSendLevelAction =>
	AuxFXMatrixSendLevelActionSchema.parse(action)

export const parseInputToGroupAuxOnAction = (action: CompanionActionEvent): InputToGroupAuxOnAction =>
	InputToGroupAuxOnActionSchema.parse(action)

export const parseDcaAssignAction = (action: CompanionActionEvent): DcaAssignAction =>
	DcaAssignActionSchema.parse(action)

export const parseMuteGroupAssignAction = (action: CompanionActionEvent): MuteGroupAssignAction =>
	MuteGroupAssignActionSchema.parse(action)

export const parseSetSocketPreampGainAction = (action: CompanionActionEvent): SetSocketPreampGainAction =>
	SetSocketPreampGainActionSchema.parse(action)

export const parseSetSocketPreampPadAction = (action: CompanionActionEvent): SetSocketPreampPadAction =>
	SetSocketPreampPadActionSchema.parse(action)

export const parseSetSocketPreamp48vAction = (action: CompanionActionEvent): SetSocketPreamp48vAction =>
	SetSocketPreamp48vActionSchema.parse(action)

export const parseSetChannelNameAction = (action: CompanionActionEvent): SetChannelNameAction =>
	SetChannelNameActionSchema.parse(action)

export const parseSetChannelColourAction = (action: CompanionActionEvent): SetChannelColourAction =>
	SetChannelColourActionSchema.parse(action)

export const parseRecallSceneAction = (action: CompanionActionEvent): RecallSceneAction =>
	RecallSceneActionSchema.parse(action)

export const parseRecallCueListAction = (action: CompanionActionEvent): RecallCueListAction =>
	RecallCueListActionSchema.parse(action)

export const parseGoNextPreviousAction = (action: CompanionActionEvent): GoNextPreviousAction =>
	GoNextPreviousActionSchema.parse(action)

export const parseParametricEqAction = (action: CompanionActionEvent): ParametricEqAction =>
	ParametricEqActionSchema.parse(action)

export const parseHpfFrequencyAction = (action: CompanionActionEvent): HpfFrequencyAction =>
	HpfFrequencyActionSchema.parse(action)

export const parseSetHpfOnOffAction = (action: CompanionActionEvent): SetHpfOnOffAction =>
	SetHpfOnOffActionSchema.parse(action)

export const parseSetUfxGlobalKeyAction = (action: CompanionActionEvent): SetUfxGlobalKeyAction =>
	SetUfxGlobalKeyActionSchema.parse(action)

export const parseSetUfxGlobalScaleAction = (action: CompanionActionEvent): SetUfxGlobalScaleAction =>
	SetUfxGlobalScaleActionSchema.parse(action)

export const parseSetUfxUnitParameterAction = (action: CompanionActionEvent): SetUfxUnitParameterAction =>
	SetUfxUnitParameterActionSchema.parse(action)

export const parseDliveModuleConfig = (config: Record<string, unknown>): DLiveModuleConfig =>
	DliveModuleConfigSchema.parse(config)
