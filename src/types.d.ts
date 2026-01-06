type ChannelType =
	| 'input'
	| 'mono_group'
	| 'stereo_group'
	| 'mono_aux'
	| 'stereo_aux'
	| 'mono_matrix'
	| 'stereo_matrix'
	| 'mono_fx_send'
	| 'stereo_fx_send'
	| 'fx_return'
	| 'main'
	| 'dca'
	| 'mute_group'
	| 'stereo_ufx_send'
	| 'stereo_ufx_return'

type SocketType = 'mixrack_sockets_1_to_64' | 'mixrack_dx_1_to_2' | 'mixrack_dx_3_to_4'

type EqType = 'bell' | 'lf_shelf' | 'hf_shelf' | 'low_pass' | 'high_pass'

type ChannelColour = 'off' | 'red' | 'green' | 'yellow' | 'blue' | 'purple' | 'light_blue' | 'white'

type UFXKey = 'C' | 'C#' | 'D' | 'D#' | 'E' | 'F' | 'F#' | 'G' | 'G#' | 'A' | 'A#' | 'B'

type UFXScale = 'major' | 'minor'

type DLiveModuleConfig = {
	host: string
	midiChannel: number
	midiPort: number
}

type DLiveCommand =
	| DLiveMuteOnCommand
	| DLiveMuteOffCommand
	| DLiveFaderLevelCommand
	| DLiveChannelAssignmentToMainMixOnCommand
	| DLiveChannelAssignmentToMainMixOffCommand
	| DLiveAuxFxMatrixSendLevelCommand
	| DLiveInputToGroupAuxOnCommand
	| DLiveDcaAssignmentOnCommand
	| DLiveDcaAssignmentOffCommand
	| DLiveMuteGroupAssignmentOnCommand
	| DLiveMuteGroupAssignmentOffCommand
	| DLiveSetSocketPreampGainCommand
	| DLiveSetSocketPreampPadCommand
	| DLiveSetSocketPreamp48VCommand
	| DLiveSetChannelNameCommand
	| DLiveSetChannelColourCommand
	| DLiveSceneRecallCommand
	| DLiveCueListRecallCommand
	| DLiveGoNextPreviousCommand
	| DLiveParametricEQCommand
	| DLiveHPFFrequencyCommand
	| DLiveSetHPFOnOffCommand
	| DLiveSetUFXGlobalKeyCommand
	| DLiveSetUFXGlobalScaleCommand
	| DLiveSetUFXParameterCommand

type DLiveMuteOnCommand = {
	command: 'mute_on'
	params: {
		channelType: ChannelType
		channelNo: number
	}
}

type DLiveMuteOffCommand = {
	command: 'mute_off'
	params: {
		channelType: ChannelType
		channelNo: number
	}
}

type DLiveFaderLevelCommand = {
	command: 'fader_level'
	params: {
		channelType: ChannelType
		channelNo: number
		level: number
	}
}

type DLiveChannelAssignmentToMainMixOnCommand = {
	command: 'channel_assignment_to_main_mix_on'
	params: {
		channelType: ChannelType
		channelNo: number
	}
}

type DLiveChannelAssignmentToMainMixOffCommand = {
	command: 'channel_assignment_to_main_mix_off'
	params: {
		channelType: ChannelType
		channelNo: number
	}
}

type DLiveAuxFxMatrixSendLevelCommand = {
	command: 'aux_fx_matrix_send_level'
	params: {
		channelType: ChannelType
		channelNo: number
		destinationChannelType: ChannelType
		destinationChannelNo: number
		level: number
	}
}

type DLiveInputToGroupAuxOnCommand = {
	command: 'input_to_group_aux_on'
	params: {
		channelNo: number
		destinationChannelType: ChannelType
		destinationChannelNo: number
		shouldEnable: boolean
	}
}

type DLiveDcaAssignmentOnCommand = {
	command: 'dca_assignment_on'
	params: {
		channelType: ChannelType
		channelNo: number
		dcaNo: number
	}
}

type DLiveDcaAssignmentOffCommand = {
	command: 'dca_assignment_off'
	params: {
		channelType: ChannelType
		channelNo: number
		dcaNo: number
	}
}

type DLiveMuteGroupAssignmentOnCommand = {
	command: 'mute_group_assignment_on'
	params: {
		channelType: ChannelType
		channelNo: number
		muteGroupNo: number
	}
}

type DLiveMuteGroupAssignmentOffCommand = {
	command: 'mute_group_assignment_off'
	params: {
		channelType: ChannelType
		channelNo: number
		muteGroupNo: number
	}
}

type DLiveSetSocketPreampGainCommand = {
	command: 'set_socket_preamp_gain'
	params: {
		socketType: SocketType
		socketNo: number
		gain: number
	}
}

type DLiveSetSocketPreampPadCommand = {
	command: 'set_socket_preamp_pad'
	params: {
		socketType: SocketType
		socketNo: number
		shouldEnable: boolean
	}
}

type DLiveSetSocketPreamp48VCommand = {
	command: 'set_socket_preamp_48v'
	params: {
		socketType: SocketType
		socketNo: number
		shouldEnable: boolean
	}
}

type DLiveSetChannelNameCommand = {
	command: 'set_channel_name'
	params: {
		channelType: ChannelType
		channelNo: number
		name: string
	}
}

type DLiveSetChannelColourCommand = {
	command: 'set_channel_colour'
	params: {
		channelType: ChannelType
		channelNo: number
		colour: number
	}
}

type DLiveSceneRecallCommand = {
	command: 'scene_recall'
	params: {
		sceneNo: number
	}
}

type DLiveCueListRecallCommand = {
	command: 'cue_list_recall'
	params: {
		recallId: number
	}
}

type DLiveGoNextPreviousCommand = {
	command: 'go_next_previous'
	params: {
		controlNumber: number
		controlValue: number
	}
}

type DLiveParametricEQCommand = {
	command: 'parametric_eq'
	params: {
		channelType: ChannelType
		channelNo: number
		bandNo: number
		type: EqType
		frequency: number
		width: number
		gain: number
	}
}

type DLiveHPFFrequencyCommand = {
	command: 'hpf_frequency'
	params: {
		channelNo: number
		frequency: number
	}
}

type DLiveSetHPFOnOffCommand = {
	command: 'set_hpf_on_off'
	params: {
		channelNo: number
		shouldEnable: boolean
	}
}

type DLiveSetUFXGlobalKeyCommand = {
	command: 'set_ufx_global_key'
	params: {
		key: number
	}
}

type DLiveSetUFXGlobalScaleCommand = {
	command: 'set_ufx_global_scale'
	params: {
		scale: number
	}
}

type DLiveSetUFXParameterCommand = {
	command: 'set_ufx_unit_parameter'
	params: {
		midiChannel: number
		controlNumber: number
		value: number
	}
}

type EqMidiParameters = {
	frequency: number
	width: number
	gain: number
	type: number
}

// Type helpers
type SnakeToCamel<S extends string> = S extends `${infer H}_${infer T}` ? `${H}${Capitalize<SnakeToCamel<T>>}` : S

type CamelizeKeys<T extends Record<string, unknown>> = {
	[K in keyof T as SnakeToCamel<string & K>]: T[K]
}
