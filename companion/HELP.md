# Allen & Heath dLive Module for Companion

## Connecting to the dLive

The connection accepts three parameters:

#### Target IP

The IP address of the dLive console. By default this is `192.168.1.70` for a MixRack and `192.168.1.71` for a surface.

#### MIDI Port

The MIDI TCP port to connect to. By default this is `51325` for a MixRack and `51328` for a surface.

#### Main MIDI Channels

The MIDI channels used to control the console. By default this is `1 to 5` but can be changed in the console settings.

## Actions

This module implements every control action in the Allen & Heath dLive MIDI over TCP/IP protocol V2.0 apart from the "get" actions (e.g. "get fader level"), which may be added in a future release. This can be found [here](https://www.allen-heath.com/content/uploads/2024/06/dLive-MIDI-Over-TCP-Protocol-V2.0.pdf).

The following actions are supported:
|Action|Description|Parameters|
|---|---|---|
|Mute|Mute or unmute a channel|Channel Type, Channel Number, Mute|
|Mute Toggle|Toggle mute state of a channel **(requires console feedback)**|Channel Type, Channel Number|
|Fader Level|Set the fader level of a channel|Channel Type, Channel Number, Level|
|Fader Level Increment|Increment the fader level by a specific dB amount **(requires console feedback)**|Channel Type, Channel Number, Increment Amount|
|Fader Level Decrement|Decrement the fader level by a specific dB amount **(requires console feedback)**|Channel Type, Channel Number, Decrement Amount|
|Assign to Main Mix|Assign a channel to the main mix|Channel Type, Channel Number, Assign|
|Aux / FX / Matrix Send Level|Set the send level from a channel to an aux / fx send / matrix|Channel Type, Channel Number, Destination Channel Type, Destination Channel Number, Level|
|Input to Group / Aux / Matrix|Send an input to a group / aux / matrix|Input Channel, Destination Channel Type, Destination Channel Number, On|
|Assign to DCA|Assign a channel to a DCA|Channel Type, Channel Number, DCA, Assign|
|Assign to Mute Group|Assign a channel to a mute group|Channel Type, Channel Number, Mute Group, Assign|
|Set Socket Preamp Gain|Set the preamp gain of a MixRack or DX card socket|Socket Type, Socket Number, Gain|
|Set Socket Preamp Pad|Enable or disable the pad of a MixRack or DX card socket|Socket Type, Socket Number, Pad|
|Set Socket Preamp 48v|Enable or disable 48v of a MixRack or DX card socket|Socket Type, Socket Number, 48v|
|Set Channel Name|Set the name of a channel|Channel Type, Channel Number, Name|
|Set Channel Colour|Set the colour of a channel|Channel Type, Channel Number, Colour|
|Recall Scene|Recall a scene|Scene Number|
|Recall Cue List|Recall a cue list|Recall ID|
|Go Next/Previous (Surface Only)|Trigger the Go/Next/Previous action using the MIDI CC messages defined in the console settings|Control Number, Control Value|
|Parametric EQ|Set the type, frequency, width and gain of a parametric EQ band|Channel Type, Channel Number, Band, Type, Frequency, Width, Gain|
|HPF Frequency|Set the high pass filter frequency of an input channel|Input Channel, Frequency|
|Set HPF On/Off|Enable or disable the high pass filter of an input channel|Input Channel, HPF|
|Set UFX Global Key|Set the global key for all UFX units|Key|
|Set UFX Global Scale|Set the global scale for all UFX units|Scale|
|Set UFX Unit Parameter|Set a UFX parameter using the MIDI channel and control message defined in the console settings|MIDI Channel, Control Number, Control Value|

### Important Note: Feedback-Dependent Actions

The **Mute Toggle**, **Fader Level Increment**, and **Fader Level Decrement** actions require knowledge of the current console state to work properly. These actions:

1. **Automatically subscribe** to the parameter when first used
2. **Request the current value** from the console via SysEx "Get" commands if not already cached
3. **Calculate the new value** based on the current state
4. **Work immediately** after connection, with the first press requesting the value and subsequent presses performing the action

**How It Works:**
- On **first press** after connection: The action requests the current value from the console. Press the button again to perform the action.
- On **subsequent presses**: The action performs immediately using the cached value.
- The console responds to "Get" requests within milliseconds, so the second press typically works immediately.

**Alternative:** If you configure a feedback for the parameter (e.g., "Channel Muted" or "Fader Level"), the value will already be cached and the first press will work immediately.

## Feedbacks

The module provides real-time feedback from the console, allowing button states to reflect the current console state. The console must be configured to send MIDI feedback for this to work.

The following feedbacks are supported:

|Feedback|Description|Parameters|
|---|---|---|
|Channel Muted|Indicates if a channel is muted (red background when active)|Channel Type, Channel Number|
|Fader Level|Indicates if a fader meets a specified condition|Channel Type, Channel Number, Condition, Level|
|Main Mix Assignment|Indicates if a channel is assigned to the main mix (blue background when active)|Channel Type, Channel Number|

### How Feedbacks Work

1. The module listens for incoming MIDI messages from the console
2. When a subscribed parameter changes, the module updates the feedback state
3. Button appearances change automatically based on the feedback state
4. Multiple feedbacks can subscribe to the same parameter efficiently

## Variables

**Dynamic Variable Creation**: The module dynamically creates variables based on the configured feedback items. Thus, if you want to display a variable of a mixer value, **make sure to create a feedback item for it first**. Afterward, a new variable will be available in Companion.

### Variable Naming Convention

Variables follow the pattern: `$(this:dlive_channelType_channelNo_parameter)`

The channel numbers in variable names match the dLive console numbering (1-based).

Examples:
- `$(this:dlive_input_1_mute)` - Mute status of input channel 1 (true/false)
- `$(this:dlive_input_1_fader)` - Fader level of input channel 1 (displayed in dB, e.g., "+5.0", "-12.3", "-inf")
- `$(this:dlive_main_1_fader)` - Main mix 1 fader level (displayed in dB)
- `$(this:dlive_input_6_main_assignment)` - Main mix assignment status of input channel 6

### How to Use Variables

1. **Create a feedback** for the parameter you want to monitor (e.g., "Channel Muted" for input channel 1)
2. The module **automatically creates** a corresponding variable
3. Use the variable in button text, triggers, or other Companion features
4. The variable value **updates automatically** when the console state changes

**Important**: Variables are only created for parameters that have at least one feedback configured. When you remove all feedbacks for a parameter, the corresponding variable is automatically removed.

## Tips

- **Test Your Configuration**: Use Companion's module debug logging to verify MIDI communication
- **Console Setup**: Ensure the dLive console is configured to send MIDI feedback messages
- **Feedback Performance**: Multiple feedbacks for the same parameter share a single subscription for efficiency
- **Variable Updates**: Variables update in real-time as the console state changes
