import type {
	CompanionActionContext,
	CompanionActionEvent,
	CompanionFeedbackBooleanEvent,
} from '@companion-module/base'

import { UpdateActions } from '../src/actions.js'
import { FeedbackHandler } from '../src/FeedbackHandler.js'
import { UpdateFeedbacks } from '../src/feedbacks.js'
import { parseMidiHex, protocolDefinitions } from '../src/protocolDefinitions.js'
import { MockModuleInstance } from './utils/MockModuleInstance.js'

jest.mock('@companion-module/base', () => ({
	...jest.requireActual('@companion-module/base'),
	runEntrypoint: jest.fn(),
	InstanceBase: class {},
}))
const header = [0xf0, 0, 0, 0x1a, 0x50, 0x10, 1, 0]
const context = {} as CompanionActionContext
const feedbackContext = { parseVariablesInString: async (text: string) => text }
function setup(target: ConnectionTarget = 'mixrack') {
	const instance = new MockModuleInstance({})
	instance.config = { host: '127.0.0.1', midiChannel: 2, midiPort: 51325, target, useCustomPort: false }
	instance.feedbackHandler = new FeedbackHandler(instance)
	UpdateActions(instance)
	UpdateFeedbacks(instance)
	return instance
}
function defaults(options: { id: string; default?: unknown }[]): Record<string, unknown> {
	return Object.fromEntries(options.map((o) => [o.id, o.default]))
}
function feedbackEvent(options: Record<string, unknown>, feedbackId: string): CompanionFeedbackBooleanEvent {
	return {
		type: 'boolean',
		previousOptions: null,
		id: 'feedback',
		controlId: 'button',
		feedbackId,
		options,
	} as CompanionFeedbackBooleanEvent
}

describe('public protocol query actions and feedback', () => {
	it('exposes every query family as an action and monitored feedback', () => {
		const instance = setup()
		const queries = [
			'muteStatus',
			'faderValue',
			'mainAssignment',
			'channelName',
			'channelColour',
			'sendLevel',
			'inputRouting',
			'socketGain',
			'socketPad',
			'socket48v',
			'hpfFrequency',
			'hpfEnabled',
			'peq',
		]
		for (const id of queries) {
			expect(instance.actionDefinitions[`get_${id}`]).toBeDefined()
			expect(instance.feedbackDefinitions[`protocol_${id}`]).toBeDefined()
		}
	})
	it.each(['mixrack', 'surface'] as const)('validates default options for every query on %s', async (target) => {
		const instance = setup(target)
		const send = jest.spyOn(instance, 'sendMidiToDlive')
		for (const d of protocolDefinitions(instance).filter((d) => d.query)) {
			const definition = instance.actionDefinitions[`get_${d.id}`]
			if (!definition) throw new Error('Missing definition')
			const options = defaults(definition.options)
			const before = send.mock.calls.length
			await definition.callback?.(
				{ id: 'action', controlId: 'button', actionId: `get_${d.id}`, options } as CompanionActionEvent,
				context,
			)
			expect(send.mock.calls.length).toBe(before + 1)
			expect(send.mock.calls[send.mock.calls.length - 1]?.[0][0]).toBe(0xf0)
		}
	})
	it('uses channel offsets in query actions and matches received colour', async () => {
		const instance = setup()
		const send = jest.spyOn(instance, 'sendMidiToDlive')
		const action = instance.actionDefinitions.get_channelColour
		if (!action) throw new Error('Missing definition')
		const options = { ...defaults(action.options), channelType: 'stereo_aux', stereoAux: 30 }
		await action.callback?.(
			{ surfaceId: undefined, id: 'a', controlId: 'b', actionId: 'get_channelColour', options } as CompanionActionEvent,
			context,
		)
		expect(send).toHaveBeenLastCalledWith([...header, 4, 4, 0x5e, 0xf7])
		const definition = instance.feedbackDefinitions.protocol_channelColour
		if (!definition) throw new Error('Missing definition')
		if (definition.type !== 'boolean') throw new Error('Expected boolean feedback')
		const event = feedbackEvent({ ...options, expected: 6, condition: 'eq' }, 'protocol_channelColour')
		expect(definition.callback(event, feedbackContext)).toBe(false)
		instance.feedbackHandler?.processMidiData(Buffer.from([...header, 4, 5, 0x5e, 6, 0xf7]))
		expect(definition.callback(event, feedbackContext)).toBe(true)
		void definition.unsubscribe?.(event, feedbackContext)
	})
	it('keeps a disabled boolean unknown until queried and re-queries after editing', () => {
		const instance = setup()
		const send = jest.spyOn(instance, 'sendMidiToDlive')
		const definition = instance.feedbackDefinitions.protocol_hpfEnabled
		if (!definition) throw new Error('Missing definition')
		if (definition.type !== 'boolean') throw new Error('Expected boolean feedback')
		const event = feedbackEvent({ ...defaults(definition.options), expected: false }, 'protocol_hpfEnabled')
		expect(definition.callback(event, feedbackContext)).toBe(false)
		instance.feedbackHandler?.processMidiData(Buffer.from([0xb2, 0x63, 0, 0x62, 0x31, 6, 0]))
		expect(definition.callback(event, feedbackContext)).toBe(true)
		event.options.input = 1
		expect(definition.callback(event, feedbackContext)).toBe(false)
		expect(send).toHaveBeenLastCalledWith([...header, 2, 5, 11, 0x31, 1, 0xf7])
	})
	it('exposes event feedback for assignments, UFX, MMC and MIDI strips without sending invented queries', () => {
		const instance = setup()
		const send = jest.spyOn(instance, 'sendMidiToDlive')
		for (const id of [
			'dcaAssignment',
			'muteGroupAssignment',
			'scene',
			'ufxKey',
			'ufxScale',
			'midiCC',
			'midiNote',
			'mmc',
			'customMidi',
		]) {
			const definition = instance.feedbackDefinitions[`protocol_${id}`]
			if (!definition) throw new Error('Missing definition')
			const event = feedbackEvent(defaults(definition.options), `protocol_${id}`)
			void definition.callback(event, feedbackContext)
		}
		expect(send).not.toHaveBeenCalled()
	})
	it('gates recall feedback by target', () => {
		expect(setup('surface').feedbackDefinitions.protocol_scene).toBeUndefined()
		expect(setup('mixrack').feedbackDefinitions.protocol_cue).toBeUndefined()
	})
	it('initializes existing main-assignment feedback using its documented Get', () => {
		const instance = setup()
		const send = jest.spyOn(instance, 'sendMidiToDlive')
		instance.feedbackHandler?.mapFeedback('main', { channelType: 'input', channelNo: 0, parameter: 'main_assignment' })
		expect(send).toHaveBeenCalledWith([...header, 2, 5, 11, 0x18, 0, 0xf7])
	})
	it('handles explicit Note Off and reserved channels without corrupting legacy mute feedback', () => {
		const instance = setup()
		const path = { channelType: 'input' as const, channelNo: 0, parameter: 'mute' as const }
		instance.feedbackHandler?.mapFeedback('mute', path)
		instance.feedbackHandler?.processMidiData(Buffer.from([0x92, 0, 63, 0x82, 0, 127, 0x91, 0, 127]))
		expect(instance.feedbackHandler?.getValue(path)).toBe(false)
		instance.feedbackHandler?.resetConnection()
		expect(instance.feedbackHandler?.getValue(path)).toBeNull()
	})
	it('sends user-mapped MIDI strip commands exactly', async () => {
		const instance = setup()
		const send = jest.spyOn(instance, 'sendMidiToDlive')
		await instance.actionDefinitions.customMidi?.callback?.(
			{ surfaceId: undefined, id: 'a', controlId: 'b', actionId: 'customMidi', options: { message: 'B1 00 7F' } },
			context,
		)
		expect(send).toHaveBeenCalledWith([0xb1, 0, 127])
	})

	it.each(['90 01 7F', 'B1 0C 55', 'C1 05', 'D1 40', 'E1 00 40', 'F0 7F 7F 06 02 F7'])(
		'matches a supported custom feedback message %s',
		(message) => {
			const instance = setup()
			const definition = instance.feedbackDefinitions.protocol_customMidi
			if (!definition || definition.type !== 'boolean') throw new Error('Missing custom MIDI feedback')
			const event = feedbackEvent({ expected: message }, 'protocol_customMidi')
			expect(definition.callback(event, feedbackContext)).toBe(false)
			instance.feedbackHandler?.processMidiData(Buffer.from(parseMidiHex(message)))
			expect(definition.callback(event, feedbackContext)).toBe(true)
		},
	)
	it.each(['F1 01', 'F2 00 01', 'F3 01', 'F6', 'F8', 'FF'])(
		'rejects an unobservable custom feedback expectation %s',
		(message) => {
			const instance = setup()
			const log = jest.spyOn(instance, 'log')
			const definition = instance.feedbackDefinitions.protocol_customMidi
			if (!definition || definition.type !== 'boolean') throw new Error('Missing custom MIDI feedback')
			instance.feedbackHandler?.processMidiData(Buffer.from([0x90, 1, 127]))
			const event = feedbackEvent({ expected: message }, 'protocol_customMidi')
			expect(definition.callback(event, feedbackContext)).toBe(false)
			expect(log).toHaveBeenCalledWith('error', expect.stringContaining('channel voice and SysEx messages only'))
		},
	)
	it.each(['F1 01', 'F2 00 01', 'F3 01', 'F6', 'F8', 'FF'])(
		'preserves custom action support for sending %s',
		async (message) => {
			const instance = setup()
			const send = jest.spyOn(instance, 'sendMidiToDlive')
			await instance.actionDefinitions.customMidi?.callback?.(
				{ surfaceId: undefined, id: 'a', controlId: 'b', actionId: 'customMidi', options: { message } },
				context,
			)
			expect(send).toHaveBeenCalledWith(parseMidiHex(message))
		},
	)
	it.each(['', 'B1 zz 7F', '0xB1 00 7F', '00 7F', 'B1 0 7F'])('rejects invalid MIDI hex %j', (value) => {
		expect(() => parseMidiHex(value)).toThrow()
	})
})
