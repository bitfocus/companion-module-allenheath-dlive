# Local development and testing

Use Node 22 (matching Companion's node22 runtime) and the pinned Yarn 4.10.3:

```sh
nvm use
corepack enable
yarn install --immutable
yarn check
```

If Yarn is unavailable, use the pinned CLI:

```sh
npm exec --yes --package=@yarnpkg/cli-dist@4.10.3 -- yarn install --immutable
npm run check
```

`check` builds, runs Jest once and lints. `test` runs Jest in watch mode. Scripts also work with `yarn <script>`.

## Companion development setup

Enable Developer Modules in the Companion launcher's advanced settings. Set the Developer Module Path to the parent directory containing this checkout, then add the dev version of Allen & Heath dLive in Companion. Use a separate test connection/page. Run `npm run dev` while editing for automatic build updates.

See [Bitfocus's developer-folder instructions](https://companion.free/for-developers/module-development/local-modules/) for launcher configuration.

## Local TCP fixture

```sh
npm run simulate
```

This builds the module and listens on `127.0.0.1:51325`. Connect Companion using MixRack, that address and default port, with MIDI channels 1 to 5. Try mute/fader changes and feedback, main assignment, and channel names. Restart the fixture to exercise cache clearing and feedback refresh.

The fixture stores parameter values, replies to implemented Get messages, echoes changes, fragments replies and repeats NRPN status bytes. It does not emulate DSP, physical I/O, console limits, MMC execution or TLS/authentication. Event echoes are useful for exercising the parser but do not prove that a console transmits those events.

Port and base-channel overrides allow running alongside Director:

```sh
DLIVE_SIM_PORT=51330 DLIVE_SIM_MIDI_CHANNEL=6 npm run simulate
```

Use the same custom port and MIDI-channel base in Companion. Stop any other server using the chosen port.

`npm run test:simulator` starts a fixture on an available localhost port, tests set/query/readback through real sockets and closes it. Both endpoints share the decoder; independent byte-vector unit tests remain necessary. This smoke test verifies socket integration, not protocol conformance.

## Director and console acceptance

Director in offline mode can provide an Allen & Heath endpoint for interactive testing. Match its MIDI Send/Receive settings and channel range. Use the correct MixRack/Surface target and configured port. Check changes sent by Companion in Director, then change values in Director and check Companion feedback. Keep Director offline while testing to avoid controlling a connected physical system.

Verify high channel numbers, non-default MIDI bases, scene/cue bank boundaries and reconnect. Physical I/O, audio/DSP behavior and firmware differences require console testing. A successful simulator test alone cannot establish interoperability.
