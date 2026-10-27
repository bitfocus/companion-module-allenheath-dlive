import type {
	CompanionActionContext,
	CompanionFeedbackBooleanEvent,
	CompanionOptionValues,
	CompanionPresetOptionValues,
} from '@companion-module/base'

import { UpdateActions } from '../src/actions.js'
import { FeedbackHandler } from '../src/FeedbackHandler.js'
import { UpdateFeedbacks } from '../src/feedbacks.js'
import { UpdatePresets } from '../src/presets.js'
import { MockModuleInstance } from './utils/MockModuleInstance.js'

jest.mock('@companion-module/base', () => ({ ...jest.requireActual('@companion-module/base'), InstanceBase: class {} }))

// These are the documented MIDI addresses, independent of the module's lookup table.
const channelTypes: [ChannelType, string, number, number, number][] = [
	['input', 'input', 128, 0, 0],
	['mono_group', 'monoGroup', 62, 1, 0],
	['stereo_group', 'stereoGroup', 31, 1, 0x40],
	['mono_aux', 'monoAux', 62, 2, 0],
	['stereo_aux', 'stereoAux', 32, 2, 0x40],
	['mono_matrix', 'monoMatrix', 62, 3, 0],
	['stereo_matrix', 'stereoMatrix', 31, 3, 0x40],
	['mono_fx_send', 'monoFxSend', 16, 4, 0],
	['stereo_fx_send', 'stereoFxSend', 16, 4, 0x10],
	['fx_return', 'fxReturn', 16, 4, 0x20],
	['main', 'main', 6, 4, 0x30],
	['dca', 'dca', 24, 4, 0x36],
	['stereo_ufx_send', 'stereoUfxSend', 8, 4, 0x56],
	['stereo_ufx_return', 'stereoUfxReturn', 8, 4, 0x5e],
]

/** Model the host's documented evaluation boundary: callbacks receive computed numeric options. */
function resolveChannel(
	options: CompanionPresetOptionValues<CompanionOptionValues>,
	channel: number,
): CompanionOptionValues {
	return Object.fromEntries(
		Object.entries(options).map(([id, value]): [string, string | number] => {
			if (value && typeof value === 'object' && 'isExpression' in value && value.isExpression === true) {
				expect(value).toEqual({ isExpression: true, value: '$(local:channel) - 1' })
				return [id, channel - 1]
			}
			if (typeof value === 'number' || typeof value === 'string') return [id, value]
			throw new Error(`Unexpected mute preset option: ${id}`)
		}),
	)
}

const actionContext: CompanionActionContext = { type: 'action', setCustomVariableValue: jest.fn() }
const feedbackContext = { type: 'feedback' as const }

describe('single-channel-variable mute presets', () => {
	it.each(channelTypes)(
		'%s follows one human-facing channel setting',
		async (type, field, count, offset, noteOffset) => {
			const instance = new MockModuleInstance({})
			instance.feedbackHandler = new FeedbackHandler(instance)
			UpdateActions(instance)
			UpdateFeedbacks(instance)
			UpdatePresets(instance)
			const preset = instance.presetDefinitions[`mute_button_${type}`]
			if (!preset) throw new Error('Missing mute preset')
			expect(preset.localVariables).toHaveLength(1)
			expect(preset.localVariables?.[0]).toMatchObject({
				variableType: 'simple',
				variableName: 'channel',
				startupValue: 1,
			})
			expect(preset.style.text).toContain(`dlive_${type}_$(local:channel)_name`)
			const action = instance.actionDefinitions.muteToggle
			const feedback = instance.feedbackDefinitions.channel_muted
			if (!action || !feedback || feedback.type !== 'boolean') throw new Error('Missing mute definition')
			const send = jest.spyOn(instance, 'sendMidiToDlive')
			const variables = jest.spyOn(instance, 'setVariableValues')
			const presetAction = preset.steps[0].down[0]
			const presetFeedback = preset.feedbacks[0]
			// Reassign the same button twice, covering both ends of each channel range.
			for (const channel of [1, count]) {
				const options = resolveChannel(presetFeedback.options, channel)
				expect(options[field]).toBe(channel - 1)
				const event: CompanionFeedbackBooleanEvent = {
					id: 'mute',
					controlId: 'button',
					feedbackId: 'channel_muted',
					type: 'boolean',
					previousOptions: null,
					options,
				}
				await feedback.callback(event, feedbackContext)
				const note = noteOffset + channel - 1
				instance.feedbackHandler.processMidiData(Buffer.from([0x90 + offset, note, 63]))
				expect(await feedback.callback(event, feedbackContext)).toBe(false)
				// A changed channel name feeds the same nested variable reference as the action/feedback.
				instance.feedbackHandler.processMidiData(
					Buffer.from([0xf0, 0, 0, 0x1a, 0x50, 0x10, 1, 0, offset, 2, note, 86, 111, 120, 0xf7]),
				)
				expect(variables).toHaveBeenCalledWith({ [`dlive_${type}_${channel}_name`]: 'Vox' })
				await action.callback(
					{
						id: 'action',
						controlId: 'button',
						surfaceId: undefined,
						actionId: 'muteToggle',
						options: resolveChannel(presetAction.options, channel),
					},
					actionContext,
				)
				expect(send).toHaveBeenLastCalledWith([0x90 + offset, note, 127, note, 0])
				expect(await feedback.callback(event, feedbackContext)).toBe(true)
			}
		},
	)
	it('keeps every preset registered in a stable section with no API 1 category fields', () => {
		const instance = new MockModuleInstance({})
		UpdatePresets(instance)
		const referenced = instance.presetStructure.flatMap((section) =>
			section.definitions.map((definition) => {
				if (typeof definition === 'string') return definition
				if (definition.type !== 'template') throw new Error('Expected a mute template group')
				expect(definition.templateVariableName).toBe('channel')
				expect(definition.templateValues[0].value).toBe(1)
				return definition.presetId
			}),
		)
		expect(new Set(referenced)).toEqual(new Set(Object.keys(instance.presetDefinitions)))
		for (const preset of Object.values(instance.presetDefinitions)) {
			expect(preset?.type).toBe('simple')
			expect(preset).not.toHaveProperty('category')
		}
	})
})
