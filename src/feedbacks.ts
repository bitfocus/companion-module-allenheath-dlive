import type { CompanionFeedbackBooleanEvent, CompanionFeedbackDefinitions } from '@companion-module/base'

import { FADER_LEVEL_CHOICES, FADER_LEVEL_CONDITION_CHOICES } from './constants.js'
import type { DLiveParameter, DLiveParameterPath } from './FeedbackHandler.js'
import type { ModuleInstance } from './main.js'
import { protocolFeedbacks } from './protocolDefinitions.js'
import { camelCaseStringLiteral, getChannelSelectOptions } from './utils/index.js'
import * as validators from './validators/index.js'

/**
 * Channel options created by getChannelSelectOptions, shared by all feedbacks
 */
type ChannelOptions = validators.ChannelMutedFeedback['options']

/**
 * Builds the parameter path for a feedback from its validated channel options
 * @param options Validated feedback options
 * @param parameter Parameter the feedback reports on
 * @returns Parameter path
 */
const getParameterPath = (options: ChannelOptions, parameter: DLiveParameter): DLiveParameterPath => ({
	channelType: options.channelType,
	channelNo: options[camelCaseStringLiteral(options.channelType)],
	parameter,
})

/**
 * Validates a feedback event, logging an error if it is not in the expected shape.
 * Companion only writes errors thrown from feedback callbacks to the console, so they are
 * logged to the module log here instead
 * @param instance Module instance
 * @param feedback Feedback event from Companion
 * @param parse Validator for the feedback
 * @returns The validated feedback, or null if it is invalid
 */
const validateFeedback = <T>(
	instance: ModuleInstance,
	feedback: CompanionFeedbackBooleanEvent,
	parse: (feedback: CompanionFeedbackBooleanEvent) => T,
): T | null => {
	try {
		return parse(feedback)
	} catch (error) {
		instance.log(
			'error',
			`Invalid ${feedback.feedbackId} feedback ${feedback.id}: ${error instanceof Error ? error.message : String(error)}`,
		)
		return null
	}
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
		...protocolFeedbacks(instance),
		channel_muted: {
			type: 'boolean',
			name: 'Channel Muted',
			description: 'Indicates if a channel is muted',
			defaultStyle: {
				bgcolor: 0xff0000, // Red background when muted
				color: 0xffffff,
			},
			options: getChannelSelectOptions(),
			callback: (feedback: CompanionFeedbackBooleanEvent): boolean => {
				const parsed = validateFeedback(instance, feedback, validators.parseChannelMutedFeedback)
				if (!parsed) {
					return false
				}
				const path = getParameterPath(parsed.options, 'mute')

				// Keep the mapping in sync with the current options (see UpdateFeedbacks note)
				instance.feedbackHandler?.mapFeedback(feedback.id, path)

				return instance.feedbackHandler?.getValue(path) === true
			},
			subscribe: (feedback: CompanionFeedbackBooleanEvent): void => {
				const parsed = validateFeedback(instance, feedback, validators.parseChannelMutedFeedback)
				if (parsed) {
					instance.feedbackHandler?.mapFeedback(feedback.id, getParameterPath(parsed.options, 'mute'))
				}
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
				...getChannelSelectOptions({ exclude: ['mute_group'] }),
				{
					type: 'dropdown',
					label: 'Condition',
					id: 'condition',
					default: 'gte',
					choices: FADER_LEVEL_CONDITION_CHOICES,
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
				const parsed = validateFeedback(instance, feedback, validators.parseFaderLevelFeedback)
				if (!parsed) {
					return false
				}
				const { condition, level: targetLevel } = parsed.options
				const path = getParameterPath(parsed.options, 'fader')

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
				}
			},
			subscribe: (feedback: CompanionFeedbackBooleanEvent): void => {
				const parsed = validateFeedback(instance, feedback, validators.parseFaderLevelFeedback)
				if (parsed) {
					instance.feedbackHandler?.mapFeedback(feedback.id, getParameterPath(parsed.options, 'fader'))
				}
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
			}),
			callback: (feedback: CompanionFeedbackBooleanEvent): boolean => {
				const parsed = validateFeedback(instance, feedback, validators.parseMainAssignmentFeedback)
				if (!parsed) {
					return false
				}
				const path = getParameterPath(parsed.options, 'main_assignment')

				// Keep the mapping in sync with the current options (see UpdateFeedbacks note)
				instance.feedbackHandler?.mapFeedback(feedback.id, path)

				const value = instance.feedbackHandler?.getValue(path)

				// Assignment value >= 0x40 means assigned
				return typeof value === 'number' && value >= 0x40
			},
			subscribe: (feedback: CompanionFeedbackBooleanEvent): void => {
				const parsed = validateFeedback(instance, feedback, validators.parseMainAssignmentFeedback)
				if (parsed) {
					instance.feedbackHandler?.mapFeedback(feedback.id, getParameterPath(parsed.options, 'main_assignment'))
				}
			},
			unsubscribe: (feedback: CompanionFeedbackBooleanEvent): void => {
				// Don't pass path - let FeedbackHandler look it up from stored mapping
				instance.feedbackHandler?.removeFeedback(feedback.id)
			},
		},
	}

	instance.setFeedbackDefinitions(feedbacks)
}
