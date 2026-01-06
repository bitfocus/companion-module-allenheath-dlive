import { createDefaultPreset } from 'ts-jest'

/** @type {require("ts-jest").JestConfigWithTsJest} */
module.exports = {
	preset: 'ts-jest',
	testEnvironment: 'node',
	modulePathIgnorePatterns: ['<rootDir>/dist/'],
	coverageDirectory: 'coverage',
	coverageReporters: ['json'],
	transform: {
		...createDefaultPreset().transform,
	},
	moduleNameMapper: {
		// Map JS imports to TS, e.g. "../foo.js" maps to "../foo"
		'^(\\.{1,2}/.*)\\.js$': '$1',
	},
}
