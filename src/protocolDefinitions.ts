import type {
	CompanionActionDefinitions,
	CompanionFeedbackDefinitions,
	SomeCompanionFeedbackInputField,
} from '@companion-module/base'

import { SOCKET_MIDI_NOTE_OFFSETS } from './constants.js'
import type { ModuleInstance } from './main.js'
import type { ProtocolPath } from './ProtocolState.js'
import {
	camelCaseStringLiteral,
	getChannelSelectOptions,
	getMidiOffsetsForChannelType,
	getSocketSelectOptions,
} from './utils/index.js'
import {
	channelOptions,
	parseProtocolExpectedNumber,
	parseProtocolMember,
	ProtocolBooleanSchema,
	ProtocolChannelTypeSchema,
	ProtocolConditionSchema,
	ProtocolMidiByteSchema,
	ProtocolMidiChannelSchema,
	ProtocolMidiFeedbackHexSchema,
	ProtocolMidiHexSchema,
	ProtocolPeqParameterSchema,
	ProtocolSocketTypeSchema,
	ProtocolTextSchema,
	socketOptions,
} from './validators/index.js'

type Options = Record<string, unknown>
interface Definition {
	id: string
	name: string
	options: SomeCompanionFeedbackInputField[]
	path: (options: Options) => ProtocolPath
	query?: boolean
	boolean?: boolean
	text?: boolean
	max?: number
	min?: number
	target?: ConnectionTarget
}
const numberField = (id: string, label: string, max = 127, min = 0): SomeCompanionFeedbackInputField => ({
	type: 'number',
	id,
	label,
	default: min,
	min,
	max,
})
const dropdown = (
	id: string,
	label: string,
	choices: { id: string | number; label: string }[],
): SomeCompanionFeedbackInputField => ({ type: 'dropdown', id, label, default: choices[0].id, choices })

function channel(instance: ModuleInstance, options: Options, prefix = ''): { midiChannel: number; note: number } {
	const key = (name: string): string => (prefix ? prefix + name[0].toUpperCase() + name.slice(1) : name)
	const type = ProtocolChannelTypeSchema.parse(options[key('channelType')])
	const field = camelCaseStringLiteral(type)
	const index = channelOptions[field].parse(options[key(field)])
	const offsets = getMidiOffsetsForChannelType(type)
	return { midiChannel: instance.baseMidiChannel + offsets.midiChannelOffset, note: index + offsets.midiNoteOffset }
}
function socket(instance: ModuleInstance, options: Options): { midiChannel: number; note: number } {
	const type = ProtocolSocketTypeSchema.parse(options.socketType)
	const field = camelCaseStringLiteral(type)
	return {
		midiChannel: instance.baseMidiChannel,
		note: socketOptions[field].parse(options[field]) + SOCKET_MIDI_NOTE_OFFSETS[type],
	}
}

export function protocolDefinitions(instance: ModuleInstance): Definition[] {
	const channelFields = getChannelSelectOptions()
	const socketFields = getSocketSelectOptions()
	const channelParameter = (id: string, name: string, parameter: string, boolean = false, max = 127): Definition => ({
		id,
		name,
		options: getChannelSelectOptions(
			parameter === 'nrpn:48' || parameter === 'nrpn:49'
				? { include: ['input'] }
				: parameter === 'nrpn:23'
					? { exclude: ['mute_group'] }
					: parameter === 'nrpn:24'
						? { include: ['input', 'mono_group', 'stereo_group', 'fx_return', 'stereo_ufx_return'] }
						: undefined,
		),
		path: (o) => ({ ...channel(instance, o), parameter }),
		query: true,
		boolean,
		max,
	})
	const socketParameter = (id: string, name: string, parameter: string, boolean = false): Definition => ({
		id,
		name,
		options: socketFields,
		path: (o) => ({ ...socket(instance, o), parameter }),
		query: true,
		boolean,
	})
	const routing = (id: string, name: string, parameter: string, boolean = false): Definition => ({
		id,
		name,
		boolean,
		query: true,
		options: [
			...getChannelSelectOptions(parameter === 'routing' ? { include: ['input'] } : undefined),
			...getChannelSelectOptions({
				prefix: 'destination',
				include:
					parameter === 'routing'
						? ['mono_group', 'stereo_group', 'mono_aux', 'stereo_aux']
						: [
								'mono_aux',
								'stereo_aux',
								'mono_matrix',
								'stereo_matrix',
								'mono_fx_send',
								'stereo_fx_send',
								'stereo_ufx_send',
							],
			}),
		],
		path: (o) => {
			const source = channel(instance, o),
				destination = channel(instance, o, 'destination')
			return {
				...source,
				parameter,
				destinationMidiChannel: destination.midiChannel,
				destinationNote: destination.note,
			}
		},
	})
	const definitions: Definition[] = [
		channelParameter('muteStatus', 'Mute Status', 'mute', true),
		channelParameter('faderValue', 'Fader Level (MIDI Value)', 'nrpn:23'),
		channelParameter('mainAssignment', 'Main Mix Assignment', 'nrpn:24', true),
		{ ...channelParameter('channelName', 'Channel Name', 'name'), text: true },
		channelParameter('channelColour', 'Channel Colour', 'colour', false, 7),
		routing('sendLevel', 'Aux / FX / Matrix Send Level (MIDI Value)', 'send'),
		routing('inputRouting', 'Input to Group / Aux Assignment', 'routing', true),
		socketParameter('socketGain', 'Socket Preamp Gain (MIDI Value)', 'gain'),
		socketParameter('socketPad', 'Socket Preamp Pad', 'pad', true),
		socketParameter('socket48v', 'Socket Preamp 48V', 'phantom', true),
		channelParameter('hpfFrequency', 'HPF Frequency (MIDI Value)', 'nrpn:48'),
		channelParameter('hpfEnabled', 'HPF Enabled', 'nrpn:49', true),
		{
			id: 'peq',
			name: 'Parametric EQ Parameter (MIDI Value)',
			query: true,
			options: [
				...channelFields,
				dropdown(
					'parameter',
					'Parameter',
					Array.from({ length: 16 }, (_, i) => ({
						id: 0x1a + i,
						label: `Band ${Math.floor(i / 4) + 1} ${['type', 'frequency', 'width', 'gain'][i % 4]}`,
					})),
				),
			],
			path: (o) => ({
				...channel(instance, o),
				parameter: `nrpn:${ProtocolPeqParameterSchema.parse(o.parameter)}`,
			}),
		},
		...(['dca', 'muteGroup'] as const).map(
			(type): Definition => ({
				id: `${type}Assignment`,
				name: type === 'dca' ? 'DCA Assignment' : 'Mute Group Assignment',
				boolean: true,
				options: [
					...getChannelSelectOptions({ exclude: ['dca', 'mute_group'] }),
					numberField('member', type === 'dca' ? 'DCA' : 'Mute Group', type === 'dca' ? 24 : 8, 1),
				],
				path: (o) => ({
					...channel(instance, o),
					parameter: 'assignment',
					member: parseProtocolMember(o.member, type === 'dca' ? 24 : 8) - 1 + (type === 'dca' ? 0 : 24),
				}),
			}),
		),
		{
			id: 'scene',
			name: 'Current Scene',
			options: [],
			path: () => ({ parameter: 'scene', midiChannel: instance.baseMidiChannel }),
			max: 500,
			min: 1,
			target: 'mixrack',
		},
		{
			id: 'cue',
			name: 'Current Cue Recall ID',
			options: [],
			path: () => ({ parameter: 'cue', midiChannel: instance.baseMidiChannel }),
			max: 1999,
			target: 'surface',
		},
		...[
			{ id: 'ufxKey', name: 'UFX Global Key (Last Received)', cc: 0x0c, max: 11 },
			{ id: 'ufxScale', name: 'UFX Global Scale (Last Received)', cc: 0x0d, max: 1 },
		].map(
			({ id, name, cc, max }): Definition => ({
				id,
				name,
				options: [],
				path: () => ({ parameter: 'cc', midiChannel: instance.baseMidiChannel, note: cc }),
				max,
			}),
		),
		{
			id: 'midiCC',
			name: 'MIDI CC / UFX / Go Control (Last Received)',
			options: [numberField('midiChannel', 'MIDI Channel', 16, 1), numberField('controlNumber', 'Control Number')],
			path: (o) => ({
				parameter: 'cc',
				midiChannel: ProtocolMidiChannelSchema.parse(o.midiChannel) - 1,
				note: ProtocolMidiByteSchema.parse(o.controlNumber),
			}),
		},
		{
			id: 'midiNote',
			name: 'MIDI Strip Note (Last Received)',
			options: [numberField('midiChannel', 'MIDI Channel', 16, 1), numberField('note', 'Note')],
			path: (o) => ({
				parameter: 'note',
				midiChannel: ProtocolMidiChannelSchema.parse(o.midiChannel) - 1,
				note: ProtocolMidiByteSchema.parse(o.note),
			}),
		},
		{ id: 'mmc', name: 'MMC Command (Last Received)', options: [], path: () => ({ parameter: 'mmc', midiChannel: 0 }) },
		{
			id: 'customMidi',
			name: 'Custom MIDI Message (Last Received)',
			options: [],
			path: () => ({ parameter: 'raw', midiChannel: 0 }),
			text: true,
		},
	]
	return definitions.filter((d) => !d.target || !instance.config || d.target === instance.config.target)
}

export function protocolQueryActions(instance: ModuleInstance): CompanionActionDefinitions {
	const actions: CompanionActionDefinitions = {}
	for (const d of protocolDefinitions(instance).filter((d) => d.query)) {
		actions[`get_${d.id}`] = {
			name: `Get ${d.name}`,
			options: d.options,
			callback: async (action) => {
				instance.protocolState.request(d.path(action.options))
			},
		}
	}
	actions.customMidi = {
		name: 'Send Custom MIDI Message',
		description:
			'For user-configured MIDI strips and external MIDI mappings. Enter hexadecimal bytes, including status bytes.',
		options: [{ type: 'textinput', id: 'message', label: 'Hexadecimal MIDI Bytes', default: 'B1 00 7F' }],
		callback: async (action) => {
			instance.sendMidiToDlive(parseMidiHex(action.options.message))
		},
	}
	return actions
}
export function parseMidiHex(input: unknown): number[] {
	const value = ProtocolMidiHexSchema.parse(input)
	const bytes = value.split(/\s+/).map((v) => parseInt(v, 16))
	if (bytes[0] < 0x80) throw new Error('A custom MIDI message must start with a MIDI status byte')
	return bytes
}

export function protocolFeedbacks(instance: ModuleInstance): CompanionFeedbackDefinitions {
	const feedbacks: CompanionFeedbackDefinitions = {}
	for (const d of protocolDefinitions(instance)) {
		const expected = d.boolean
			? { type: 'checkbox' as const, id: 'expected', label: 'Enabled / Assigned', default: true }
			: d.text
				? {
						type: 'textinput' as const,
						id: 'expected',
						label: d.id === 'customMidi' ? 'Expected MIDI Message (channel voice or SysEx)' : 'Expected Text',
						default: d.id === 'customMidi' ? 'B1 00 7F' : '',
					}
				: numberField('expected', 'Expected Value', d.max ?? 127, d.min ?? 0)
		feedbacks[`protocol_${d.id}`] = {
			type: 'boolean',
			name: d.name,
			description:
				d.id === 'customMidi'
					? 'Matches one received channel voice or SysEx message. System Common and realtime messages are not observed.'
					: d.query
						? 'Queries the console on subscription and reconnect. Unknown values do not match.'
						: 'Observes received messages only; no query is defined. Unknown values do not match.',
			defaultStyle: { bgcolor: 0x008000, color: 0xffffff },
			options: [
				...d.options,
				expected,
				...(!d.boolean && !d.text
					? [
							dropdown('condition', 'Condition', [
								{ id: 'eq', label: 'Equal' },
								{ id: 'gte', label: 'At least' },
								{ id: 'lte', label: 'At most' },
							]),
						]
					: []),
			],
			unsubscribe: (feedback) => {
				instance.protocolState.unsubscribe(feedback.id)
			},
			callback: (feedback) => {
				try {
					const customMessage =
						d.id === 'customMidi' ? ProtocolMidiFeedbackHexSchema.parse(feedback.options.expected) : undefined
					const path = d.path(feedback.options)
					instance.protocolState.subscribe(feedback.id, path, () => d.path(feedback.options))
					const value = instance.protocolState.get(path)
					if (value === undefined) return false
					if (d.boolean)
						return (
							(typeof value === 'number' ? value >= 0x40 : value) ===
							ProtocolBooleanSchema.parse(feedback.options.expected)
						)
					if (d.text) {
						const text = customMessage ?? ProtocolTextSchema.parse(feedback.options.expected)
						return value === (d.id === 'customMidi' ? Buffer.from(parseMidiHex(text)).toString('hex') : text)
					}
					const target = parseProtocolExpectedNumber(feedback.options.expected, d.min ?? 0, d.max ?? 127)
					const condition = ProtocolConditionSchema.parse(feedback.options.condition)
					return (
						typeof value === 'number' &&
						(condition === 'gte' ? value >= target : condition === 'lte' ? value <= target : value === target)
					)
				} catch (error) {
					instance.protocolState.unsubscribe(feedback.id)
					instance.log('error', `Invalid ${d.name} feedback: ${String(error)}`)
					return false
				}
			},
		}
	}
	return feedbacks
}
