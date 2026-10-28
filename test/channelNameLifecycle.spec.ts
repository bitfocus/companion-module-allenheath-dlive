import { type DLiveParameterPath, FeedbackHandler } from '../src/FeedbackHandler.js'
import type { ModuleInstance } from '../src/main.js'

const input = (channelNo: number, parameter: DLiveParameterPath['parameter'] = 'mute'): DLiveParameterPath => ({
	channelType: 'input',
	channelNo,
	parameter,
})

describe('channel name subscription lifecycle', () => {
	let handler: FeedbackHandler
	let values: Map<string, unknown>
	let definitions: Set<string>
	let requestName: jest.Mock

	beforeEach(() => {
		values = new Map()
		definitions = new Set()
		requestName = jest.fn()
		handler = new FeedbackHandler({
			baseMidiChannel: 0,
			log: jest.fn(),
			checkFeedbacksById: jest.fn(),
			requestChannelName: requestName,
			requestMuteStatus: jest.fn(),
			requestFaderLevel: jest.fn(),
			// Model Companion removing values for undefined variables, on API 1 or API 2.
			setVariableDefinitions: (next: unknown) => {
				definitions = new Set(
					Array.isArray(next)
						? next.map((definition: { variableId: string }) => definition.variableId)
						: Object.keys(next as object),
				)
				for (const id of values.keys()) if (!definitions.has(id)) values.delete(id)
			},
			setVariableValues: (next: Record<string, unknown>) => {
				for (const [id, value] of Object.entries(next)) if (definitions.has(id)) values.set(id, value)
			},
		} as unknown as ModuleInstance)
	})

	const nameId = (channelNo: number): string => `dlive_input_${channelNo + 1}_name`
	const receiveName = (channelNo: number, name: string): void => {
		handler.processMidiData(
			Buffer.from([0xf0, 0, 0, 0x1a, 0x50, 0x10, 1, 0, 0, 2, channelNo, ...Buffer.from(name), 0xf7]),
		)
	}

	it('requests and restores the name after switching channel 1 -> 2 -> 1', () => {
		handler.mapFeedback('button', input(0))
		receiveName(0, 'Kick In')
		expect(values.get(nameId(0))).toBe('Kick In')
		handler.mapFeedback('button', input(1))
		expect(definitions.has(nameId(0))).toBe(false)
		handler.mapFeedback('button', input(0))
		expect(requestName.mock.calls).toEqual([
			['input', 0],
			['input', 1],
			['input', 0],
		])
		expect(values.get(nameId(0))).toBe('IP 1')
		receiveName(0, 'Kick Renamed')
		expect(values.get(nameId(0))).toBe('Kick Renamed')
	})

	it('requests the name again after the last subscription is removed and recreated', () => {
		handler.mapFeedback('original', input(0))
		receiveName(0, 'Kick In')
		handler.removeFeedback('original')
		expect(values.has(nameId(0))).toBe(false)
		handler.mapFeedback('replacement', input(0))
		expect(requestName).toHaveBeenCalledTimes(2)
		expect(values.get(nameId(0))).toBe('IP 1')
		receiveName(0, 'Kick In')
		expect(values.get(nameId(0))).toBe('Kick In')
	})

	it.each(['mute', 'fader'] as const)('retains a shared name while another %s subscription remains', (parameter) => {
		handler.mapFeedback('first', input(0))
		handler.mapFeedback('second', input(0, parameter))
		receiveName(0, 'Kick In')
		handler.mapFeedback('first', input(1))
		expect(values.get(nameId(0))).toBe('Kick In')
		handler.mapFeedback('first', input(0))
		expect(requestName).toHaveBeenCalledTimes(2)
		expect(values.get(nameId(0))).toBe('Kick In')
		handler.removeFeedback('first')
		expect(values.get(nameId(0))).toBe('Kick In')
		handler.removeFeedback('second')
		expect(definitions.has(nameId(0))).toBe(false)
	})

	it('requests subscribed names again when connection state is refreshed', () => {
		handler.mapFeedback('button', input(0))
		receiveName(0, 'Old Name')
		handler.requestAllSubscribedValues()
		expect(requestName).toHaveBeenCalledTimes(2)
		receiveName(0, 'New Name')
		expect(values.get(nameId(0))).toBe('New Name')
	})
})
