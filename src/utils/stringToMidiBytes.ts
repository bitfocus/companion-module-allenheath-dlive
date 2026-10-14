/**
 * Helper function that converts a string to an array of bytes, e.g for sending in a MIDI SysEx message
 * Non-printable and non-ASCII characters are dropped, as the dLive only accepts printable ASCII
 * @param value String to convert
 * @returns MIDI byte array
 */
export const stringToMidiBytes = (value: string): number[] =>
	Array.from(value)
		.map((c) => c.charCodeAt(0))
		.filter((code) => code >= 0x20 && code <= 0x7e)
