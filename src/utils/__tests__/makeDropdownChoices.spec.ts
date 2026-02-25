import { makeDropdownChoices } from '../makeDropdownChoices.js'

describe('makeDropdownChoices', () => {
	it('should make the dropdown choices', () => {
		expect(makeDropdownChoices('Foo', 3)).toStrictEqual([
			{ id: 0, label: 'Foo 1' },
			{ id: 1, label: 'Foo 2' },
			{ id: 2, label: 'Foo 3' },
		])
	})

	it('should start at startIndex', () => {
		expect(makeDropdownChoices('Foo', 3, { startIndex: 1 })).toStrictEqual([
			{ id: 1, label: 'Foo 2' },
			{ id: 2, label: 'Foo 3' },
		])
	})

	it('should offset the label by labelOffset', () => {
		expect(makeDropdownChoices('Foo', 3, { labelOffset: 1 })).toStrictEqual([
			{ id: 0, label: 'Foo 2' },
			{ id: 1, label: 'Foo 3' },
			{ id: 2, label: 'Foo 4' },
		])
	})
})
