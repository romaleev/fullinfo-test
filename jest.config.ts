import type { Config } from '@jest/types'

const config: Config.InitialOptions = {
	verbose: true,
	rootDir: './tests',
	transform: {
		'node_modules/(dateformat|ky)/.+\\.(j|t)sx?$': 'ts-jest',
		'^.+\\.(j|t)sx?$': [
			'ts-jest',
			{ tsconfig: './tsconfig.json', diagnostics: { ignoreCodes: ['TS151001'] } },
		],
	},
	transformIgnorePatterns: ['node_modules/(?!(dateformat|ky)/)'],
	moduleNameMapper: {
		'\\.(css|less|scss|sass)$': 'identity-obj-proxy',
	},
}
export default config
