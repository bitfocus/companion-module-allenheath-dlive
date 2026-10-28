/* A development fixture, not an emulator or evidence of hardware interoperability. */
import net from 'node:net'
import { fileURLToPath } from 'node:url'

import { MidiStreamDecoder } from '../dist/MidiStreamDecoder.js'
const header = [0xf0, 0, 0, 0x1a, 0x50, 0x10, 1, 0]

export function createDliveSimulator({ base = 0, fragment = true } = {}) {
	const values = new Map()
	const clients = new Set()
	const sysex = (...body) => [...header, ...body, 0xf7]
	const key = (...parts) => parts.join(':')
	const read = (parts, fallback) => values.get(key(...parts)) ?? fallback
	const nrpn = (channel, note, parameter, value) => [
		0xb0 + channel,
		0x63,
		note,
		0xb0 + channel,
		0x62,
		parameter,
		0xb0 + channel,
		6,
		value,
	]
	const server = net.createServer((socket) => {
		const decoder = new MidiStreamDecoder()
		clients.add(socket)
		const pending = []
		let writing = false
		const pump = () => {
			if (socket.destroyed || !pending.length) {
				writing = false
				return
			}
			writing = true
			socket.write(pending.shift())
			setImmediate(pump)
		}
		const send = (bytes) => {
			const buffer = Buffer.from(bytes)
			if (!fragment) {
				socket.write(buffer)
				return
			}
			for (let i = 0; i < buffer.length; i += 2) pending.push(buffer.subarray(i, i + 2))
			if (!writing) pump()
		}
		socket.simulatorSend = send
		const broadcast = (bytes) => {
			for (const client of clients) client.simulatorSend(bytes)
		}
		socket.on('error', () => {})
		socket.on('close', () => clients.delete(socket))
		socket.on('data', (data) => {
			for (const m of decoder.push(data)) {
				const channel = m[0] & 15,
					kind = m[0] & 0xf0
				if (kind === 0xb0 && m.length === 7) {
					values.set(key('nrpn', channel, m[2], m[4]), m[6])
					broadcast(nrpn(channel, m[2], m[4], m[6]))
				} else if (kind === 0x90 && m[2]) {
					values.set(key('mute', channel, m[1]), m[2] >= 64 ? 127 : 63)
					broadcast([...m])
				} else if (kind === 0xe0) {
					values.set(key('gain', channel, m[1]), m[2])
					broadcast([...m])
				} else if (kind === 0xc0 || (kind === 0xb0 && ![0x63, 0x62, 6].includes(m[1]))) {
					broadcast([...m])
				} else if (m[0] === 0xf0 && header.every((byte, i) => m[i] === byte)) {
					const ch = m[8],
						command = m[9],
						note = m[10]
					if (command === 1) send(sysex(ch, 2, note, ...read(['name', ch, note], Buffer.from(`Channel ${note + 1}`))))
					else if (command === 3) {
						values.set(key('name', ch, note), m.subarray(11, -1))
						broadcast(sysex(ch, 2, note, ...m.subarray(11, -1)))
					} else if (command === 4) send(sysex(ch, 5, note, read(['colour', ch, note], 0)))
					else if (command === 6) {
						values.set(key('colour', ch, note), m[11])
						broadcast(sysex(ch, 5, note, m[11]))
					} else if (command === 7 || command === 10)
						send(sysex(ch, command === 7 ? 8 : 11, note, read([command === 7 ? 'pad' : 'phantom', ch, note], 0)))
					else if (command === 9 || command === 12) {
						const value = m[11] >= 64 ? 127 : 0
						values.set(key(command === 9 ? 'pad' : 'phantom', ch, note), value)
						broadcast(sysex(ch, command === 9 ? 8 : 11, note, value))
					} else if (command === 13 || command === 14) {
						values.set(key(command, ch, note, m[11], m[12]), m[13])
						broadcast([...m])
					} else if (command === 5 && m[10] === 9) send([0x90 + ch, m[11], read(['mute', ch, m[11]], 63)])
					else if (command === 5 && m[10] === 11) {
						const parameter = m[11],
							source = m[12]
						if (parameter === 0x19) send([0xe0 + base, source, read(['gain', base, source], 0)])
						else send(nrpn(ch, source, parameter, read(['nrpn', ch, source, parameter], parameter === 0x17 ? 107 : 0)))
					} else if (command === 5 && m[10] === 15)
						send(sysex(ch, m[11], m[12], m[13], m[14], read([m[11], ch, m[12], m[13], m[14]], 0)))
				} else if (m[0] === 0xf0) broadcast([...m])
			}
		})
	})
	server.on('close', () => {
		for (const client of clients) client.destroy()
	})
	server.disconnectClients = () => {
		for (const client of clients) client.destroy()
	}
	return server
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
	const port = Number(process.env.DLIVE_SIM_PORT ?? 51325)
	const base = Number(process.env.DLIVE_SIM_MIDI_CHANNEL ?? 1) - 1
	if (!Number.isInteger(port) || port < 1 || port > 65535 || !Number.isInteger(base) || base < 0 || base > 11)
		throw new Error('Use port 1–65535 and base MIDI channel 1–12')
	const server = createDliveSimulator({ base })
	server.on('error', (error) => {
		process.stderr.write(`${error.message}\n`)
		process.exitCode = 1
	})
	server.listen(port, '127.0.0.1', () =>
		process.stdout.write(
			`dLive development simulator on 127.0.0.1:${port}, base MIDI channel ${base + 1}. Ctrl+C to stop.\n`,
		),
	)
}
