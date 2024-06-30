import type { Config } from '@jest/types'
import { pathsToModuleNameMapper } from 'ts-jest'
import { compilerOptions } from './tsconfig.json'

// console.log(0, {
// 	'\\.(css|less|scss|sass)$': 'identity-obj-proxy',
// 	...pathsToModuleNameMapper(compilerOptions.paths),
// })

const config: Config.InitialOptions = {
	verbose: true,
	rootDir: './tests/server',
	transform: {
		'node_modules/(dateformat|ky)/.+\\.(j|t)sx?$': 'ts-jest',
		'^.+\\.tsx?$': [
			'ts-jest',
			{ tsconfig: './tsconfig.json', diagnostics: { ignoreCodes: ['TS151001'] } },
		],
	},
	transformIgnorePatterns: ['node_modules/(?!(dateformat|ky)/)'],
	moduleNameMapper: {
		'\\.(css|less|scss|sass)$': 'identity-obj-proxy',
		// ...pathsToModuleNameMapper(compilerOptions.paths),
	},
}
export default config
