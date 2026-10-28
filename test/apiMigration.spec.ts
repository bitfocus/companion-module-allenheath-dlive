import { ModuleInstance, UpgradeScripts } from '../src/main.js'
import { MockModuleInstance } from './utils/MockModuleInstance.js'

jest.mock('@companion-module/base', () => ({ ...jest.requireActual('@companion-module/base'), InstanceBase: class {} }))

describe('API 2 compatibility', () => {
	it('uses the async TCP send API rather than treating a boolean as a promise', () => {
		const instance = new MockModuleInstance({})
		ModuleInstance.prototype.sendMidiToDlive.call(instance, [0x90, 0, 127, 0, 0])
		expect(instance.midiSocket?.sendAsync).toHaveBeenCalledWith(Buffer.from([0x90, 0, 127, 0, 0]))
		expect(instance.midiSocket?.send).not.toHaveBeenCalled()
	})
	it('preserves legacy action/feedback IDs and option values when upgrading an old config', () => {
		const actions = [
			{
				id: 'a',
				controlId: 'b',
				actionId: 'muteToggle',
				options: { input: { isExpression: false as const, value: 14 } },
			},
		]
		const feedbacks = [
			{
				id: 'f',
				controlId: 'b',
				feedbackId: 'channel_muted',
				type: 'boolean' as const,
				options: { input: { isExpression: false as const, value: 14 } },
				isInverted: { isExpression: false as const, value: false },
			},
		]
		const result = UpgradeScripts[0](
			{ currentConfig: {} },
			{ config: { host: '127.0.0.1', midiChannel: 0, midiPort: 51325 }, secrets: null, actions, feedbacks },
		)
		expect(result.updatedConfig).toMatchObject({ target: 'mixrack', useCustomPort: false, midiPort: 51325 })
		expect(result.updatedActions).toEqual([])
		expect(result.updatedFeedbacks).toEqual([])
		expect(actions[0].options.input.value).toBe(14)
		expect(feedbacks[0].options.input.value).toBe(14)
	})
})
