# TCP MIDI V2.0 action and feedback coverage

Reference: the [Allen & Heath firmware V2.0 protocol](https://www.allen-heath.com/content/uploads/2024/06/dLive-MIDI-Over-TCP-Protocol-V2.0.pdf).

Every named mixer control family has an existing Set action. This branch adds explicit actions for every documented Get family and a custom MIDI action for user-configured MIDI strips. Queryable feedback requests initial state and refreshes on reconnect. Feedback with no documented query is unknown until a matching message is received; the module does not invent query commands or treat a successful send as console confirmation for the new feedbacks.

| Capability                  | Action                                                   | Feedback                                                                      |
| --------------------------- | -------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Mute                        | Mute, Mute Toggle, Get Mute Status                       | Existing Channel Muted; received mute status                                  |
| Fader                       | Fader Level, Increment, Decrement, Get Fader Level       | Existing dB-level condition; raw MIDI comparison                              |
| Main assignment             | Assign to Main Mix, Get Main Mix Assignment              | Existing Main Mix Assignment now initializes with Get                         |
| Aux/FX/matrix sends         | Existing Set; Get Send Level                             | Source/destination level comparison                                           |
| Input to group/aux          | Existing assignment; Get Assignment                      | Source/destination assigned/enabled comparison                                |
| DCA / mute-group assignment | Existing assignment actions                              | Per-member assignment, observed NRPN; no query                                |
| Socket gain                 | Set, Get                                                 | Gain comparison in MIDI units                                                 |
| Socket pad / 48V            | Set, Get                                                 | Enabled/disabled comparison                                                   |
| Channel name                | Set, Get                                                 | Text comparison; existing subscribed-channel name variables                   |
| Channel colour              | Set, Get                                                 | Colour code comparison (0–7)                                                  |
| Scenes                      | Recall Scene (MixRack)                                   | Current scene (1–500), bank-aware; no query                                   |
| Cues                        | Recall Cue List (Surface)                                | Current recall ID (0–1999), bank-aware; no query                              |
| Go/Next/Previous            | Existing configurable CC action                          | Generic last-received MIDI CC comparison; not confirmation of scene execution |
| PEQ                         | Existing four-parameter Set; Get Parametric EQ Parameter | Select any of 16 band parameters and compare received MIDI value              |
| HPF frequency / enable      | Set, Get                                                 | Frequency in MIDI units; enabled/disabled comparison                          |
| UFX global key / scale      | Existing Set actions                                     | Last-received global CC comparison; no query or guaranteed echo               |
| UFX unit parameter          | Existing configurable CC action                          | MIDI CC comparison on the unit's configured channel/controller                |
| MMC                         | Existing MIDI Transport                                  | Last-received MMC command; not playback/record transport state                |
| MIDI strips                 | Send Custom MIDI Message (hexadecimal bytes)             | Last-received CC, note velocity, or exact framed message                      |

For numeric readback feedback, use Equal / At least / At most. Labels explicitly mark MIDI values rather than presenting them as dB or Hz. Name feedback compares trimmed received printable ASCII. Custom-message feedback compares a single normalized channel voice or SysEx message. System Common messages (such as MIDI Time Code quarter frame, Song Position, Song Select and Tune Request) and realtime messages are not observed; unsupported expected statuses are rejected. The custom Send action can still transmit these messages. For supported feedback, compressed channel messages include their reconstructed status. An NRPN consists of three CC messages, so use parameter feedback rather than an entire NRPN string as an exact-message expectation. Queries update their corresponding feedback state but do not display a standalone result dialog.

Assignments are tracked independently by DCA or mute-group member. Routing levels/assignments are keyed by source and destination. Scene/cue feedback waits for a bank select before interpreting Program Change and is cleared on reconnect. Generic CC feedback also supports MIDI strips and UFX unit mappings outside the console's five-channel block. Do not overlap configured UFX MIDI channels with that block.

Existing mute/fader/main-assignment feedback and variable IDs are retained. New feedbacks use the `protocol_` ID prefix; Get actions use `get_`. New parameter feedbacks do not yet create additional Companion variables. Unlike new received-only feedback, the legacy mute/fader/main-assignment cache still updates optimistically after a Set action; disconnect/reconnect clears it.

## Specification and interoperability boundaries

- Plain TCP connection to MixRack and Surface is supported. TLS/authentication remains unsupported; selecting a TLS port as a custom port does not enable encryption. Transport/authentication is separate from action/feedback coverage.
- MMC's all-call SysEx format is an assumption inherited from the module; the PDF lists MMC without describing its byte format. Hardware verification remains necessary.
- The PDF lists stereo aux 1–31 in its channel-selection text but includes channel 32 in the reference table. The existing 32-channel UI is retained.
- PEQ gain conversion is reviewed separately in #45; it is not changed by this readback addition.
- HPF labels and scaling are unchanged in this branch; frequency feedback uses raw MIDI units. The proposed scaling change remains held for console verification.
- The existing input-routing action also offers matrix destinations. The PDF explicitly describes group/aux routing; this compatibility behavior remains unverified for matrices. New routing Get/feedback options use documented group/aux destinations.
- The console is not guaranteed to emit every message it accepts. Event-only feedback reports only what is observed, including messages from external MIDI sources forwarded by the console. A local send alone does not establish that state.

The unit tests cover query encoding, channel addressing, fragmented messages and received state. A development simulator is proposed separately in #44. Hardware acceptance is still required before describing the module as fully interoperable with every firmware/configuration.
