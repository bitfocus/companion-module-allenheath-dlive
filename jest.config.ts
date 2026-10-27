/** @type {require("ts-jest").JestConfigWithTsJest} */
export default {
	testEnvironment: 'node',
	modulePathIgnorePatterns: ['<rootDir>/dist/'],
	coverageDirectory: 'coverage',
	coverageReporters: ['json'],
	transform: {
		'^.+\\.[tj]s$': [
			'ts-jest',
			{
				tsconfig: {
					module: 'CommonJS',
					moduleResolution: 'Node',
					target: 'ES2022',
					allowJs: true,
					paths: {
						'@companion-module/base': ['./node_modules/@companion-module/base/dist/main.d.ts'],
						'lodash/fp': ['./node_modules/@types/lodash/fp.d.ts'],
						'lodash/fp.js': ['./node_modules/@types/lodash/fp.d.ts'],
					},
				},
				diagnostics: true,
			},
		],
	},
	transformIgnorePatterns: ['/node_modules/(?!@companion-module/base/)'],
	moduleNameMapper: {
		// Map JS imports to TS, e.g. "../foo.js" maps to "../foo"
		'^(\\.{1,2}/.*)\\.js$': '$1',
	},
}
