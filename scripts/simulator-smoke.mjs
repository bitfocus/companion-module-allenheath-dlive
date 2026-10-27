import assert from 'node:assert/strict'
import { once } from 'node:events'
import net from 'node:net'

import { MidiStreamDecoder } from '../dist/MidiStreamDecoder.js'
import { createDliveSimulator } from './dlive-simulator.mjs'
const header = [0xf0, 0, 0, 0x1a, 0x50, 0x10, 1, 0]
async function main() {
	const server = createDliveSimulator()
	server.listen(0, '127.0.0.1')
	await once(server, 'listening')
	const client = net.createConnection({ host: '127.0.0.1', port: server.address().port })
	const decoder = new MidiStreamDecoder()
	const messages = []
	client.on('data', (data) => messages.push(...decoder.push(data)))
	try {
		await once(client, 'connect')
		client.write(Buffer.from([0xb0, 0x63, 0, 0x62, 0x17, 6, 91]))
		client.write(Buffer.from([...header, 0, 5, 11, 0x17, 0, 0xf7]))
		client.write(Buffer.from([...header, 0, 4, 0, 0xf7]))
		const deadline = Date.now() + 2000
		while (
			(messages.filter((m) => m.length === 7).length < 2 || !messages.some((m) => m[0] === 0xf0)) &&
			Date.now() < deadline
		)
			await new Promise((resolve) => setTimeout(resolve, 10))
		assert.deepEqual([...messages.filter((m) => m.length === 7).slice(-1)[0]], [0xb0, 0x63, 0, 0x62, 0x17, 6, 91])
		assert(messages.some((m) => m.equals(Buffer.from([...header, 0, 5, 0, 0, 0xf7]))))
		process.stdout.write('Simulator TCP smoke test passed: set/query/readback with fragmented explicit-status NRPN.\n')
	} finally {
		client.destroy()
		server.disconnectClients()
		await new Promise((resolve) => server.close(resolve))
	}
}
main().catch((error) => {
	process.stderr.write(`${error.stack}\n`)
	process.exitCode = 1
})
