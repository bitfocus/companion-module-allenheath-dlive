import { CompanionActionDefinitions, TCPHelper } from '@companion-module/base'

import { ModuleInstance } from '../../src/main.js'

export class MockModuleInstance extends ModuleInstance {
	actionDefinitions: CompanionActionDefinitions = {}

	constructor(internal: unknown) {
		super(internal)
		this.midiSocket = { send: jest.fn() } as unknown as TCPHelper
	}

	setActionDefinitions(actionDefinitions: CompanionActionDefinitions): void {
		this.actionDefinitions = actionDefinitions
	}

	sendMidiToDlive(_midiData: number[]): void {
		return
	}

	log(): void {
		return
	}
}
