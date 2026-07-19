import {
	CompanionActionDefinitions,
	CompanionFeedbackDefinitions,
	CompanionPresetDefinitions,
	CompanionVariableDefinition,
	CompanionVariableValues,
	TCPHelper,
} from '@companion-module/base'

import { ModuleInstance } from '../../src/main.js'

export class MockModuleInstance extends ModuleInstance {
	actionDefinitions: CompanionActionDefinitions = {}
	feedbackDefinitions: CompanionFeedbackDefinitions = {}
	presetDefinitions: CompanionPresetDefinitions = {}

	constructor(internal: unknown) {
		super(internal)
		this.midiSocket = { send: jest.fn() } as unknown as TCPHelper
	}

	setActionDefinitions(actionDefinitions: CompanionActionDefinitions): void {
		this.actionDefinitions = actionDefinitions
	}

	setFeedbackDefinitions(feedbackDefinitions: CompanionFeedbackDefinitions): void {
		this.feedbackDefinitions = feedbackDefinitions
	}

	setPresetDefinitions(presetDefinitions: CompanionPresetDefinitions): void {
		this.presetDefinitions = presetDefinitions
	}

	setVariableDefinitions(_variableDefinitions: CompanionVariableDefinition[]): void {
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
