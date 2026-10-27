import {
	CompanionActionDefinition,
	CompanionActionDefinitions,
	CompanionFeedbackDefinition,
	CompanionFeedbackDefinitions,
	CompanionPresetDefinitions,
	CompanionPresetSection,
	CompanionVariableDefinitions,
	CompanionVariableValues,
	TCPHelper,
} from '@companion-module/base'

import { ModuleInstance } from '../../src/main.js'

export class MockModuleInstance extends ModuleInstance {
	actionDefinitions: Record<string, CompanionActionDefinition | undefined> = {}
	feedbackDefinitions: Record<string, CompanionFeedbackDefinition | undefined> = {}
	presetDefinitions: CompanionPresetDefinitions = {}
	presetStructure: CompanionPresetSection[] = []

	constructor(internal: unknown) {
		super(internal)
		this.midiSocket = {
			send: jest.fn().mockReturnValue(true),
			sendAsync: jest.fn().mockResolvedValue(true),
			destroy: jest.fn(),
		} as unknown as TCPHelper
	}

	setActionDefinitions(actionDefinitions: CompanionActionDefinitions): void {
		this.actionDefinitions = Object.fromEntries(
			Object.entries(actionDefinitions).map(([id, definition]) => [id, definition || undefined]),
		)
	}

	setFeedbackDefinitions(feedbackDefinitions: CompanionFeedbackDefinitions): void {
		this.feedbackDefinitions = Object.fromEntries(
			Object.entries(feedbackDefinitions).map(([id, definition]) => [id, definition || undefined]),
		)
	}

	setPresetDefinitions(structure: CompanionPresetSection[], presetDefinitions: CompanionPresetDefinitions): void {
		this.presetStructure = structure
		this.presetDefinitions = presetDefinitions
	}

	setVariableDefinitions(_variableDefinitions: CompanionVariableDefinitions): void {
		return
	}

	setVariableValues(_variableValues: CompanionVariableValues): void {
		return
	}

	checkFeedbacksById(_feedbackId: string): void {
		return
	}

	sendMidiToDlive(_midiData: number[]): void {
		return
	}

	log(): void {
		return
	}
}
