import { SYSEX_HEADER } from './constants.js'
import type { ModuleInstance } from './main.js'
import { getChannelInfoFromMidi } from './utils/getChannelInfoFromMidi.js'

export type ProtocolValue = number | boolean | string
export interface ProtocolPath {
	parameter: string
	midiChannel: number
	note?: number
	destinationMidiChannel?: number
	destinationNote?: number
	member?: number
}
export const protocolKey = (path: ProtocolPath): string =>
	[
		path.parameter,
		path.midiChannel,
		path.note ?? '',
		path.destinationMidiChannel ?? '',
		path.destinationNote ?? '',
		path.member ?? '',
	].join('_')

/** Additional protocol readback. Only received messages establish state; a send is not an acknowledgement. */
export class ProtocolState {
	private readonly values = new Map<string, ProtocolValue>()
	private readonly subscriptions = new Map<string, ProtocolPath>()
	private bank: number | undefined
	private readonly resolvers = new Map<string, () => ProtocolPath>()
	constructor(private readonly module: ModuleInstance) {}

	subscribe(id: string, path: ProtocolPath, resolve?: () => ProtocolPath): void {
		if (resolve) this.resolvers.set(id, resolve)
		const old = this.subscriptions.get(id)
		if (old && protocolKey(old) === protocolKey(path)) return
		const alreadySubscribed = Array.from(this.subscriptions.values()).some((p) => protocolKey(p) === protocolKey(path))
		this.subscriptions.set(id, path)
		if (!alreadySubscribed) this.request(path)
	}
	unsubscribe(id: string): void {
		this.subscriptions.delete(id)
		this.resolvers.delete(id)
	}
	get(path: ProtocolPath): ProtocolValue | undefined {
		return this.values.get(protocolKey(path))
	}
	reset(): void {
		this.values.clear()
		this.bank = undefined
		this.module.checkFeedbacksById(...this.subscriptions.keys())
	}
	refresh(): void {
		for (const [id, resolve] of this.resolvers) this.subscriptions.set(id, resolve())
		const paths = new Map(Array.from(this.subscriptions.values()).map((p) => [protocolKey(p), p]))
		for (const path of paths.values()) this.request(path)
	}
	private update(path: ProtocolPath, value: ProtocolValue): void {
		const key = protocolKey(path)
		if (this.values.get(key) === value) return
		this.values.set(key, value)
		const ids = Array.from(this.subscriptions)
			.filter(([, p]) => protocolKey(p) === key)
			.map(([id]) => id)
		if (ids.length) this.module.checkFeedbacksById(...ids)
	}

	request(path: ProtocolPath): void {
		const { parameter, midiChannel, note, destinationMidiChannel, destinationNote } = path
		const nrpn = parameter.startsWith('nrpn:') ? Number(parameter.slice(5)) : undefined
		let body: number[] | undefined
		if (nrpn !== undefined && note !== undefined) body = [0x05, 0x0b, nrpn, note]
		if (parameter === 'mute' && note !== undefined) body = [0x05, 0x09, note]
		if (parameter === 'name' && note !== undefined) body = [0x01, note]
		if (parameter === 'colour' && note !== undefined) body = [0x04, note]
		if (parameter === 'pad' && note !== undefined) body = [0x07, note]
		if (parameter === 'phantom' && note !== undefined) body = [0x0a, note]
		if (parameter === 'gain' && note !== undefined) body = [0x05, 0x0b, 0x19, note]
		if (
			(parameter === 'send' || parameter === 'routing') &&
			note !== undefined &&
			destinationMidiChannel !== undefined &&
			destinationNote !== undefined
		) {
			body = [0x05, 0x0f, parameter === 'send' ? 0x0d : 0x0e, note, destinationMidiChannel, destinationNote]
		}
		if (body) this.module.sendMidiToDlive([...SYSEX_HEADER, midiChannel, ...body, 0xf7])
	}

	private validChannel(midiChannel: number, note: number): boolean {
		return getChannelInfoFromMidi(this.module.baseMidiChannel, midiChannel, note) !== undefined
	}

	processMessage(message: Buffer): void {
		// Synthetic seven-byte NRPNs are internal aggregates, not wire messages.
		if (message.length !== 7 || (message[0] & 0xf0) !== 0xb0)
			this.update({ parameter: 'raw', midiChannel: 0 }, message.toString('hex'))
		const status = message[0]
		const kind = status & 0xf0
		const midiChannel = status & 0x0f
		const base = this.module.baseMidiChannel
		if ((kind === 0x90 || kind === 0x80) && message.length === 3) {
			this.update({ parameter: 'note', midiChannel, note: message[1] }, kind === 0x80 ? 0 : message[2])
			if (kind === 0x90 && message[2] > 0 && this.validChannel(midiChannel, message[1]))
				this.update({ parameter: 'mute', midiChannel, note: message[1] }, message[2] >= 0x40)
		}
		if (kind === 0xb0 && message.length === 3) {
			this.update({ parameter: 'cc', midiChannel, note: message[1] }, message[2])
			if (midiChannel === base && message[1] === 0) this.bank = message[2]
		}
		if (kind === 0xb0 && message.length === 7 && this.validChannel(midiChannel, message[2])) {
			const note = message[2],
				parameter = message[4],
				value = message[6]
			this.update({ parameter: `nrpn:${parameter}`, midiChannel, note }, value)
			if (parameter === 0x40) {
				const member = value & 0x3f
				if (member < 32) this.update({ parameter: 'assignment', midiChannel, note, member }, value >= 0x40)
			}
		}
		if (kind === 0xe0 && midiChannel === base && message.length === 3)
			this.update({ parameter: 'gain', midiChannel, note: message[1] }, message[2])
		if (kind === 0xc0 && midiChannel === base && this.bank !== undefined) {
			const recall = this.bank * 128 + message[1]
			if (this.module.config?.target === 'mixrack' && recall < 500)
				this.update({ parameter: 'scene', midiChannel }, recall + 1)
			if (this.module.config?.target === 'surface' && recall < 2000)
				this.update({ parameter: 'cue', midiChannel }, recall)
		}
		if (status !== 0xf0 || message[message.length - 1] !== 0xf7) return
		if (message.length === 6 && message[1] === 0x7f && message[3] === 0x06)
			this.update({ parameter: 'mmc', midiChannel: 0 }, message[4])
		if (message.length < 12 || !SYSEX_HEADER.every((byte, index) => message[index] === byte)) return
		const channel = message[8],
			command = message[9],
			note = message[10]
		if ((command === 0x08 || command === 0x0b) && channel === base && message.length === 13)
			this.update({ parameter: command === 0x08 ? 'pad' : 'phantom', midiChannel: channel, note }, message[11] >= 0x40)
		if (!this.validChannel(channel, note)) return
		if (command === 0x02)
			this.update(
				{ parameter: 'name', midiChannel: channel, note },
				message
					.subarray(11, -1)
					.toString('ascii')
					.replace(/[^\x20-\x7e]/g, '')
					.trim(),
			)
		if (command === 0x05 && message.length === 13 && message[11] <= 7)
			this.update({ parameter: 'colour', midiChannel: channel, note }, message[11])
		if ((command === 0x0d || command === 0x0e) && message.length === 15 && this.validChannel(message[11], message[12]))
			this.update(
				{
					parameter: command === 0x0d ? 'send' : 'routing',
					midiChannel: channel,
					note,
					destinationMidiChannel: message[11],
					destinationNote: message[12],
				},
				command === 0x0d ? message[13] : message[13] >= 0x40,
			)
	}
}
