/** MIDI framing is independent of TCP packet boundaries. NRPN state is per MIDI channel. */
export class MidiStreamDecoder {
	private status = 0
	private data: number[] = []
	private sysex: number[] | undefined
	private readonly nrpn = new Map<number, { channel?: number; parameter?: number }>()

	reset(): void {
		this.status = 0
		this.data = []
		this.sysex = undefined
		this.nrpn.clear()
	}

	push(bytes: Buffer): Buffer[] {
		const messages: Buffer[] = []
		for (const byte of bytes) {
			// Realtime bytes may interrupt any message, including SysEx, without changing running status.
			if (byte >= 0xf8) continue
			if (byte & 0x80) {
				if (byte === 0xf7 && this.sysex) {
					messages.push(Buffer.from([...this.sysex, byte]))
					this.sysex = undefined
				} else {
					this.sysex = byte === 0xf0 ? [byte] : undefined
				}
				this.status = byte < 0xf0 ? byte : 0
				this.data = []
				continue
			}
			if (this.sysex) {
				this.sysex.push(byte)
				if (this.sysex.length > 1024) this.sysex = undefined
				continue
			}
			if (!this.status) continue
			this.data.push(byte)
			const kind = this.status & 0xf0
			const size = kind === 0xc0 || kind === 0xd0 ? 1 : 2
			if (this.data.length !== size) continue
			const message = Buffer.from([this.status, ...this.data])
			this.data = []
			messages.push(message)
			if (kind !== 0xb0) continue
			const midiChannel = this.status & 0x0f
			const selection = this.nrpn.get(midiChannel) ?? {}
			if (message[1] === 0x63) {
				selection.channel = message[2]
				selection.parameter = undefined
			} else if (message[1] === 0x62) {
				selection.parameter = message[2]
			} else if (message[1] === 0x65 || message[1] === 0x64) {
				// RPN selection cancels the active NRPN.
				selection.channel = undefined
				selection.parameter = undefined
			} else if (message[1] === 0x06 && selection.channel !== undefined && selection.parameter !== undefined) {
				messages.push(Buffer.from([this.status, 0x63, selection.channel, 0x62, selection.parameter, 0x06, message[2]]))
			}
			this.nrpn.set(midiChannel, selection)
		}
		return messages
	}
}
