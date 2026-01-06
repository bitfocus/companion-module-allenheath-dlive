# Allen & Heath dLive Module for Companion

## Getting started

Install the dependencies:

```bash
yarn install
```

For development, run the Typescript compiler in watch mode:

```bash
yarn dev
```

To run the test suite using Jest in watch mode:

```bash
yarn test
```

To make the development module visible in the Companion modules list, set up a development folder as detailed in [the Companion documentation](https://companion.free/for-developers/module-development/local-modules) and copy this entire project into it.

## Actions

The module implements every control action in the Allen & Heath dLive MIDI over TCP/IP protocol V2.0 apart from the "get" actions (e.g. "get fader level"), which may be added in a future release. This can be found [here](https://www.allen-heath.com/content/uploads/2024/06/dLive-MIDI-Over-TCP-Protocol-V2.0.pdf) and is also included in the `support` folder of this repository.

A full list of the actions included in this module can be found in `companion/HELP.md`.

The commands in `main.ts` are named based on the corresponding commands in the dLive MIDI specification. This should aid debugging for any engineer with the MIDI spec to hand, as every switch case directly maps to a MIDI command in the spec. It does unfortunately lead to some inconsistencies in naming (for example there are two commands for assigning a channel to the main mix: `channel_assignment_to_main_mix_on`/`channel_assignment_to_main_mix_off` but only one command for enabling/disabling an aux send: `input_to_group_aux_on`), but this is probably an acceptable compromise.

## Code style

This project uses Typescript and enforces the eslint rules provided by the `@companion-module/tools` package. Please ensure any contributions comply with these rules, and don't use `any` or `@ts-expect-error` directives as a workaround for improper typing.

Functional programming style (pure functions, immutability, declarative syntax) is preferred, and use of `lodash/fp` utility functions is encouraged for readability and conciseness.

The project uses `zod` to enforce runtime type validation for values coming from Companion. This serves two purposes:

- ensures incoming values are typed
- guards against user errors in the companion action definitions

Zod schemas and their derived types should live inside `src/validators/validators.ts`.

Each action should have a corresponding test in the `test` folder, and unit tests should be added for any new utility functions.

## Thanks

Thanks to Andrew Broughton, Jeffrey Davidsz and anyone else who contributed to the original dLive/iLive companion module. The work served as a great starting point.
