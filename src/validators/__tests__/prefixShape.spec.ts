import { z } from 'zod'

import { prefixShape } from '../index.js'

describe('prefixShape', () => {
	const shape: z.ZodRawShape = {
		foo: z.string(),
		barBaz: z.number(),
		qux: z.boolean(),
	}

	it('should prefix all keys in the shape', () => {
		;['prefixFoo', 'prefixBarBaz', 'prefixQux'].forEach((key) => {
			expect(Object.keys(prefixShape(shape, 'prefix'))).toContain(key)
		})
	})

	it.each([
		[{ prefixFoo: 'a', prefixBarBaz: 1, prefixQux: true }, false],
		[{ prefixFoo: true, prefixBarBaz: 1, prefixQux: true }, true],
		[{ prefixFoo: 'a', prefixBarBaz: true, prefixQux: true }, true],
		[{ prefixFoo: 'a', prefixBarBaz: 1, prefixQux: 'a' }, true],
	])("should throw if the new keys don't validate", (data, shouldThrow) => {
		const schema = z.object(prefixShape(shape, 'prefix'))
		if (shouldThrow) {
			expect(() => schema.parse(data)).toThrow()
		} else {
			expect(() => schema.parse(data)).not.toThrow()
		}
	})
})
