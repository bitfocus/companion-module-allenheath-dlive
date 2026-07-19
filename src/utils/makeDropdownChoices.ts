import { DropdownChoice } from '@companion-module/base'
import { compact, times } from 'lodash/fp'

const DEFAULT_OPTIONS = {
	startIndex: 0,
	labelOffset: 0,
}

interface MakeDropdownChoicesOptions {
	/** The index to start at */
	startIndex?: number
	/** The offset to add to the label */
	labelOffset?: number
}

/**
 * Helper function for making a set of choices to use in a Companion action dropdown
 * @param labelPrefix The string to prefix each label with, e.g. 'Channel, 'DCA' etc
 * @param labelCount The number of labels to create
 * @param options Options as defined in MakeDropdownChoicesOptions
 * @returns An array of dropdown choices, e.g [{ id: 0, label: 'Channel 1' }, etc...]
 */
export const makeDropdownChoices = (
	labelPrefix: string,
	labelCount: number,
	options?: MakeDropdownChoicesOptions,
): DropdownChoice[] => {
	const { startIndex, labelOffset } = { ...DEFAULT_OPTIONS, ...options }

	return compact(
		times((id: number) => {
			if (id < startIndex) {
				return
			}
			return { label: `${labelPrefix} ${id + 1 + labelOffset}`, id }
		})(labelCount),
	)
}
