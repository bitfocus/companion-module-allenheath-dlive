import { times } from 'lodash/fp'

import { midiValueToEqFrequency, midiValueToHpfFrequency } from './midiValueConverters.js'

const formatFrequencyLabel = (frequency: number): string =>
	frequency < 1000 ? `${frequency} Hz` : `${(frequency / 1000).toFixed(2)} kHz`

export const EQ_FREQUENCY_CHOICES: { label: string; id: number }[] = times((n) => ({
	label: formatFrequencyLabel(midiValueToEqFrequency(n)),
	id: n,
}))(128)

export const HPF_FREQUENCY_CHOICES: { label: string; id: number }[] = times((n) => ({
	label: formatFrequencyLabel(midiValueToHpfFrequency(n)),
	id: n,
}))(128)
