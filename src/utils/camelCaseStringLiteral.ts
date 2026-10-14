import { camelCase } from 'lodash/fp'

/**
 * Converts a snake_case string literal to camelCase, preserving the literal type
 * @param snakeCaseString The snake_case string to convert
 * @returns The camelCase version of the string
 */
export const camelCaseStringLiteral = <const S extends string>(snakeCaseString: S): SnakeToCamel<S> =>
	camelCase(snakeCaseString) as SnakeToCamel<S>
