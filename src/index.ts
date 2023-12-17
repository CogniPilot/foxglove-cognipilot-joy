import { ExtensionContext } from "@foxglove/studio";
import { initCogniPilotJoyPanel } from "./CogniPilotJoy";

export function activate(extensionContext: ExtensionContext): void {
  extensionContext.registerPanel({ name: "CogniPilot Joystick", initPanel: initCogniPilotJoyPanel });
}
