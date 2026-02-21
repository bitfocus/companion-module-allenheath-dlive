import type {
	CompanionBooleanFeedbackDefinition,
	CompanionFeedbackDefinitions,
	CompanionFeedbackBooleanEvent,
} from '@companion-module/base'
import type { ModuleInstance } from './main.js'

/**
 * Updates the feedback definitions for the module
 * @param instance Module instance
 */
export function UpdateFeedbacks(instance: ModuleInstance): void {
	const feedbacks: CompanionFeedbackDefinitions = {
		channel_muted: {
			type: 'boolean',
			name: 'Channel Muted',
			description: 'Indicates if a channel is muted',
			defaultStyle: {
				bgcolor: 0xff0000, // Red background when muted
				color: 0xffffff,
			},
			options: [
				{
					type: 'dropdown',
					label: 'Channel Type',
					id: 'channelType',
					default: 'input',
					choices: [
						{ id: 'input', label: 'Input' },
						{ id: 'mono_group', label: 'Mono Group' },
						{ id: 'stereo_group', label: 'Stereo Group' },
						{ id: 'mono_aux', label: 'Mono Aux' },
						{ id: 'stereo_aux', label: 'Stereo Aux' },
						{ id: 'mono_matrix', label: 'Mono Matrix' },
						{ id: 'stereo_matrix', label: 'Stereo Matrix' },
						{ id: 'mono_fx_send', label: 'Mono FX Send' },
						{ id: 'stereo_fx_send', label: 'Stereo FX Send' },
						{ id: 'fx_return', label: 'FX Return' },
						{ id: 'main', label: 'Main' },
						{ id: 'dca', label: 'DCA' },
						{ id: 'mute_group', label: 'Mute Group' },
					],
				},
				{
					type: 'number',
					label: 'Channel Number',
					id: 'channelNo',
					default: 1,
					min: 1,
					max: 128,
				},
			],
			callback: (feedback: CompanionFeedbackBooleanEvent): boolean => {
				const channelType = feedback.options.channelType as ChannelType
				const channelNo = (feedback.options.channelNo as number) - 1 // Convert to 0-based for internal use

				const path = `${channelType}:${channelNo}:mute`
				const value = instance.feedbackHandler?.getValue(path)

				return value === true
			},
			subscribe: (feedback: CompanionFeedbackBooleanEvent): void => {
				const channelType = feedback.options.channelType as ChannelType
				const channelNo = (feedback.options.channelNo as number) - 1 // Convert to 0-based for internal use

				const path = `${channelType}:${channelNo}:mute`
				instance.feedbackHandler?.mapFeedback(feedback.id, path)
			},
			unsubscribe: (feedback: CompanionFeedbackBooleanEvent): void => {
				// Don't pass path - let FeedbackHandler look it up from stored mapping
				// This ensures we unsubscribe from the correct path even if options changed
				instance.feedbackHandler?.removeFeedback(feedback.id)
			},
		} as CompanionBooleanFeedbackDefinition,

		fader_level: {
			type: 'boolean',
			name: 'Fader Level',
			description: 'Indicates if a fader is at or above a specific level',
			defaultStyle: {
				bgcolor: 0x00ff00, // Green background when condition is met
				color: 0x000000,
			},
			options: [
				{
					type: 'dropdown',
					label: 'Channel Type',
					id: 'channelType',
					default: 'input',
					choices: [
						{ id: 'input', label: 'Input' },
						{ id: 'mono_group', label: 'Mono Group' },
						{ id: 'stereo_group', label: 'Stereo Group' },
						{ id: 'mono_aux', label: 'Mono Aux' },
						{ id: 'stereo_aux', label: 'Stereo Aux' },
						{ id: 'mono_matrix', label: 'Mono Matrix' },
						{ id: 'stereo_matrix', label: 'Stereo Matrix' },
						{ id: 'mono_fx_send', label: 'Mono FX Send' },
						{ id: 'stereo_fx_send', label: 'Stereo FX Send' },
						{ id: 'fx_return', label: 'FX Return' },
						{ id: 'main', label: 'Main' },
						{ id: 'dca', label: 'DCA' },
					],
				},
				{
					type: 'number',
					label: 'Channel Number',
					id: 'channelNo',
					default: 1,
					min: 1,
					max: 128,
				},
				{
					type: 'dropdown',
					label: 'Condition',
					id: 'condition',
					default: 'gte',
					choices: [
						{ id: 'eq', label: 'Equal to' },
						{ id: 'gte', label: 'Greater than or equal to' },
						{ id: 'lte', label: 'Less than or equal to' },
						{ id: 'gt', label: 'Greater than' },
						{ id: 'lt', label: 'Less than' },
					],
				},
				{
					type: 'number',
					label: 'Level (0-127)',
					id: 'level',
					default: 100,
					min: 0,
					max: 127,
				},
			],
			callback: (feedback: CompanionFeedbackBooleanEvent): boolean => {
				const channelType = feedback.options.channelType as ChannelType
				const channelNo = (feedback.options.channelNo as number) - 1 // Convert to 0-based for internal use
				const condition = feedback.options.condition as string
				const targetLevel = feedback.options.level as number

				const path = `${channelType}:${channelNo}:fader`
				const value = instance.feedbackHandler?.getValue(path)

				if (typeof value !== 'number') {
					return false
				}

				switch (condition) {
					case 'eq':
						return value === targetLevel
					case 'gte':
						return value >= targetLevel
					case 'lte':
						return value <= targetLevel
					case 'gt':
						return value > targetLevel
					case 'lt':
						return value < targetLevel
					default:
						return false
				}
			},
			subscribe: (feedback: CompanionFeedbackBooleanEvent): void => {
				const channelType = feedback.options.channelType as ChannelType
				const channelNo = (feedback.options.channelNo as number) - 1 // Convert to 0-based for internal use

				const path = `${channelType}:${channelNo}:fader`
				instance.feedbackHandler?.mapFeedback(feedback.id, path)
			},
			unsubscribe: (feedback: CompanionFeedbackBooleanEvent): void => {
				// Don't pass path - let FeedbackHandler look it up from stored mapping
				// This ensures we unsubscribe from the correct path even if options changed
				instance.feedbackHandler?.removeFeedback(feedback.id)
			},
		} as CompanionBooleanFeedbackDefinition,

		main_assignment: {
			type: 'boolean',
			name: 'Main Mix Assignment',
			description: 'Indicates if a channel is assigned to the main mix',
			defaultStyle: {
				bgcolor: 0x0000ff, // Blue background when assigned
				color: 0xffffff,
			},
			options: [
				{
					type: 'dropdown',
					label: 'Channel Type',
					id: 'channelType',
					default: 'input',
					choices: [
						{ id: 'input', label: 'Input' },
						{ id: 'mono_group', label: 'Mono Group' },
						{ id: 'stereo_group', label: 'Stereo Group' },
						{ id: 'mono_aux', label: 'Mono Aux' },
						{ id: 'stereo_aux', label: 'Stereo Aux' },
					],
				},
				{
					type: 'number',
					label: 'Channel Number',
					id: 'channelNo',
					default: 1,
					min: 1,
					max: 128,
				},
			],
			callback: (feedback: CompanionFeedbackBooleanEvent): boolean => {
				const channelType = feedback.options.channelType as ChannelType
				const channelNo = (feedback.options.channelNo as number) - 1 // Convert to 0-based for internal use

				const path = `${channelType}:${channelNo}:main_assignment`
				const value = instance.feedbackHandler?.getValue(path)

				// Assignment value >= 0x40 means assigned
				return typeof value === 'number' && value >= 0x40
			},
			subscribe: (feedback: CompanionFeedbackBooleanEvent): void => {
				const channelType = feedback.options.channelType as ChannelType
				const channelNo = (feedback.options.channelNo as number) - 1 // Convert to 0-based for internal use

				const path = `${channelType}:${channelNo}:main_assignment`
				instance.feedbackHandler?.mapFeedback(feedback.id, path)
			},
			unsubscribe: (feedback: CompanionFeedbackBooleanEvent): void => {
				// Don't pass path - let FeedbackHandler look it up from stored mapping
				// This ensures we unsubscribe from the correct path even if options changed
				instance.feedbackHandler?.removeFeedback(feedback.id)
			},
		} as CompanionBooleanFeedbackDefinition,
	}

	instance.setFeedbackDefinitions(feedbacks)
}
