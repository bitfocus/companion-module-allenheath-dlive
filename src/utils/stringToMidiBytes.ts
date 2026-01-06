/**
 * Helper function that converts a string to an array of bytes, e.g for sending in a MIDI SysEx message
 * @param value String to convert
 * @returns MIDI byte array
 */
export const stringToMidiBytes = (value: string): number[] => Array.from(value).map((c) => c.charCodeAt(0) & 0x7f)
