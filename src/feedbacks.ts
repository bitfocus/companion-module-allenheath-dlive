import type {
	CompanionFeedbackBooleanEvent,
	CompanionFeedbackDefinitions,
	SomeCompanionFeedbackInputField,
} from '@companion-module/base'

import { FADER_LEVEL_CHOICES } from './constants.js'
import type { ModuleInstance } from './main.js'
import { camelCaseStringLiteral, getChannelSelectOptions } from './utils/index.js'

/**
 * Reads the selected channel type and (0-based) channel number from feedback options
 * created by getChannelSelectOptions
 */
const getChannelFromOptions = (
	options: CompanionFeedbackBooleanEvent['options'],
): { channelType: ChannelType; channelNo: number } => {
	const channelType = options.channelType as ChannelType
	const channelNo = options[camelCaseStringLiteral(channelType)] as number
	return { channelType, channelNo }
}

/**
 * Updates the feedback definitions for the module
 *
 * Note: Companion only calls a feedback's subscribe callback when the feedback is first
 * created, NOT when its options are edited. Each callback therefore re-registers its
 * mapping via mapFeedback (a no-op when the path is unchanged) so that edits to the
 * channel options re-subscribe to the correct parameter path.
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
			options: getChannelSelectOptions() as unknown as SomeCompanionFeedbackInputField[],
			callback: (feedback: CompanionFeedbackBooleanEvent): boolean => {
				const { channelType, channelNo } = getChannelFromOptions(feedback.options)
				const path = `${channelType}:${channelNo}:mute`

				// Keep the mapping in sync with the current options (see UpdateFeedbacks note)
				instance.feedbackHandler?.mapFeedback(feedback.id, path)

				return instance.feedbackHandler?.getValue(path) === true
			},
			subscribe: (feedback: CompanionFeedbackBooleanEvent): void => {
				const { channelType, channelNo } = getChannelFromOptions(feedback.options)
				instance.feedbackHandler?.mapFeedback(feedback.id, `${channelType}:${channelNo}:mute`)
			},
			unsubscribe: (feedback: CompanionFeedbackBooleanEvent): void => {
				// Don't pass path - let FeedbackHandler look it up from stored mapping
				instance.feedbackHandler?.removeFeedback(feedback.id)
			},
		},

		fader_level: {
			type: 'boolean',
			name: 'Fader Level',
			description: 'Indicates if a fader meets a specified level condition',
			defaultStyle: {
				bgcolor: 0x00ff00, // Green background when condition is met
				color: 0x000000,
			},
			options: [
				...(getChannelSelectOptions({ exclude: ['mute_group'] }) as unknown as SomeCompanionFeedbackInputField[]),
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
					type: 'dropdown',
					label: 'Level',
					id: 'level',
					default: 107, // 0.0 dB
					choices: FADER_LEVEL_CHOICES,
					minChoicesForSearch: 0,
				},
			],
			callback: (feedback: CompanionFeedbackBooleanEvent): boolean => {
				const { channelType, channelNo } = getChannelFromOptions(feedback.options)
				const condition = feedback.options.condition as string
				const targetLevel = feedback.options.level as number

				const path = `${channelType}:${channelNo}:fader`

				// Keep the mapping in sync with the current options (see UpdateFeedbacks note)
				instance.feedbackHandler?.mapFeedback(feedback.id, path)

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
				const { channelType, channelNo } = getChannelFromOptions(feedback.options)
				instance.feedbackHandler?.mapFeedback(feedback.id, `${channelType}:${channelNo}:fader`)
			},
			unsubscribe: (feedback: CompanionFeedbackBooleanEvent): void => {
				// Don't pass path - let FeedbackHandler look it up from stored mapping
				instance.feedbackHandler?.removeFeedback(feedback.id)
			},
		},

		main_assignment: {
			type: 'boolean',
			name: 'Main Mix Assignment',
			description: 'Indicates if a channel is assigned to the main mix',
			defaultStyle: {
				bgcolor: 0x0000ff, // Blue background when assigned
				color: 0xffffff,
			},
			options: getChannelSelectOptions({
				include: ['input', 'mono_group', 'stereo_group', 'fx_return', 'stereo_ufx_return'],
			}) as unknown as SomeCompanionFeedbackInputField[],
			callback: (feedback: CompanionFeedbackBooleanEvent): boolean => {
				const { channelType, channelNo } = getChannelFromOptions(feedback.options)
				const path = `${channelType}:${channelNo}:main_assignment`

				// Keep the mapping in sync with the current options (see UpdateFeedbacks note)
				instance.feedbackHandler?.mapFeedback(feedback.id, path)

				const value = instance.feedbackHandler?.getValue(path)

				// Assignment value >= 0x40 means assigned
				return typeof value === 'number' && value >= 0x40
			},
			subscribe: (feedback: CompanionFeedbackBooleanEvent): void => {
				const { channelType, channelNo } = getChannelFromOptions(feedback.options)
				instance.feedbackHandler?.mapFeedback(feedback.id, `${channelType}:${channelNo}:main_assignment`)
			},
			unsubscribe: (feedback: CompanionFeedbackBooleanEvent): void => {
				// Don't pass path - let FeedbackHandler look it up from stored mapping
				instance.feedbackHandler?.removeFeedback(feedback.id)
			},
		},
	}

	instance.setFeedbackDefinitions(feedbacks)
}
