import {
  PanelExtensionContext, RenderState, Topic,
  SettingsTreeAction, SettingsTreeNode, SettingsTreeNodes
} from "@foxglove/studio";
import { useCallback, useLayoutEffect, useEffect, useState } from "react";
import ReactDOM from "react-dom";
import { JoystickManagerOptions, Position } from 'nipplejs';
import nipplejs from 'nipplejs';
import { set } from 'lodash';
import Gamepad from 'react-gamepad'

type PanelState = {
  outmsg?: string;
};

let CURRENT_SCHEME: string = '';

let currentTopic: string = "/cerebri/in/joy"

type Config = {
  topic: string;
};

var joyButtons = Array(8);
var pubCount = 0;
joyButtons = [0, 0, 0, 0, 0, 0, 0, 0];
var joyAxes = Array(4);
joyAxes = [0, 0, 0, 0];
var message = {
  axes: joyAxes,
  buttons: joyButtons,
};

const joyStyles = {
  box: {
    display: "flex",
    "flex-direction": "row",
    "justify-content": "space-between",
    "align-items": "center",
    width: "100%",
    height: "100%",
    margin: "10px",
  },
  button: {
    width: "100px",
    height: "50px",
    "border-radius": "10px",
    margin: "10px",
  },
  control: {
    maxHeight: "100%",
    maxWidth: "100%",
  },
  red: {
    "background-color": "#FF0000",
    "font-weight": "bold"
  },
  green: {
    "background-color": "#00FF00",
    "font-weight": "bold"
  },
  blue: {
    "background-color": "#0000FF",
    "font-weight": "bold"
  },
  yellow: {
    "background-color": "#FFFF00",
    "font-weight": "bold"
  },
  white: {
    "background-color": "#FFFFFF",
    "font-weight": "bold"
  },
  black: {
    "background-color": "#0F0F0F",
    "color": "white",
    "font-weight": "bold"
  }
};

function buildSettingsTree(config: Config, topics: readonly Topic[]): SettingsTreeNodes {
  const general: SettingsTreeNode = {
    label: "General",
    fields: {
      topic: {
        label: "Topic",
        input: "autocomplete",
        value: config.topic,
        items: topics.map((t) => t.name),
      }    
    }
  };

  return { general };
}

function CogniPilotJoyPanel({ context }: { context: PanelExtensionContext }): JSX.Element {
  const [topics, setTopics] = useState<readonly Topic[]>([]);
  const [renderDone, setRenderDone] = useState<(() => void) | undefined>();
  const { saveState } = context;
  const [colorScheme, setColorScheme] = useState<"dark" | "light">("light");
  const [state, setState] = useState<PanelState>(() => {
    return context.initialState as PanelState;
  });

  const [config, setConfig] = useState<Config>(() => {
    const partialConfig = context.initialState as Config;
    const {
      topic = currentTopic
    } = partialConfig;
    return {
      topic
    };
  });

  const settingsActionHandler = useCallback((action: SettingsTreeAction) => {
    if (action.action !== "update") {
      return;
    }
    setState({ outmsg: action.payload.path.slice(1) + ' ' + action.payload.value });
    setConfig((previous) => {
      const newConfig = { ...previous };
      set(newConfig, action.payload.path.slice(1), action.payload.value);
      if (newConfig.topic !== currentTopic) {
        context.unadvertise?.(currentTopic);
        currentTopic = newConfig.topic;
        context.advertise?.(currentTopic, "sensor_msgs/Joy");
      }
      config.topic = newConfig.topic;
      return newConfig;
    });
  }, []);

  let startPoint: Position;
  let timer: ReturnType<typeof setInterval> | undefined;;

  let cmdJoy = () => {
    message.axes = joyAxes;
    message.buttons = joyButtons;
    context.publish?.(currentTopic, message);
    if (pubCount == 5) {
      joyButtons = [0,0,0,0,0,0,0,0];
      pubCount = 0;
    } else {
      pubCount = pubCount + 1;
    }
  }

  let manager: nipplejs.JoystickManager;
  let init_nipple = (colorScheme: string) => {
    let options: JoystickManagerOptions = {
      zone: document.getElementById('nipple_zone') as HTMLDivElement,
      color: (colorScheme === 'light' ? 'black' : 'white'),
      size: 100,

      restOpacity: 0.8,
      mode: 'static',

      dynamicPage: true,
      position: { left: '50%', top: '60%' },
    };
    timer = setInterval(() => {
        cmdJoy()
      }, 200)
    manager = nipplejs.create(options);
    manager.on('start', (evt, data) => {
      console.log(evt)
      console.log('start')
      console.log(data.position)
      startPoint = data.position
    })
    manager.on('move', (evt, data) => {
      console.log(evt)
      joyAxes[1]=2.0*(startPoint.y - data.position.y) / 100.0;
      joyAxes[3]=2.0*(startPoint.x - data.position.x) / 100.0;
    })
    manager.on('end', (evt, data) => {
      console.log(evt)
      joyAxes[1]=2.0*(startPoint.y - data.position.y) / 100.0;
      joyAxes[3]=2.0*(startPoint.x - data.position.x) / 100.0;
    })
    timer
  }

  const handleGamepadButtonDown = (buttonName: string) => {
    if (buttonName == 'A') {
      joyButtons[0] = 1;
      pubCount = 0;
    } else if (buttonName == 'B') {
      joyButtons[1] = 1;
      pubCount = 0;
    } else if (buttonName == 'X') {
      joyButtons[2] = 1;
      pubCount = 0;
    } else if (buttonName == 'Y') {
      joyButtons[3] = 1;
      pubCount = 0;
    } else if (buttonName == 'LB') {
      joyButtons[7] = 1;
      pubCount = 0;
    } else if (buttonName == 'RB') {
      joyButtons[6] = 1;
      pubCount = 0;
    } else if (buttonName == 'LT') {
      joyButtons[4] = 1;
      pubCount = 0;
    } else if (buttonName == 'RT') {
      joyButtons[5] = 1;
      pubCount = 0;
    }
    console.log(`Button ${buttonName} Pressed`);
  };
  
  const handleGamepadAxisChange = (axisName: string, value: number) => {
    console.log(`Axis ${axisName} value: ${value}`);
    if (axisName == "LeftStickX") {
      joyAxes[4] = -value;
    }
    if (axisName == "LeftStickY") {
      joyAxes[1] = value;
    }
    if (axisName == "RightStickX") {
      joyAxes[3] = -value;
    }
    if (axisName == "RightStickY") {
      joyAxes[2] = value;
    }
  };

  useEffect(() => {
    const tree = buildSettingsTree(config, topics);
    context.updatePanelSettingsEditor({
      actionHandler: settingsActionHandler,
      nodes: tree,
    });
    saveState(config);
  }, [config, context, saveState, settingsActionHandler, topics]);

  useLayoutEffect(() => {
    context.onRender = (renderState: RenderState, done) => {
      setRenderDone(() => done);
      setTopics(renderState.topics ?? []);
      if (renderState.colorScheme) {
        setColorScheme(renderState.colorScheme);
        if (renderState.colorScheme !== CURRENT_SCHEME) {
          CURRENT_SCHEME = renderState.colorScheme
          manager.destroy();
          init_nipple(renderState.colorScheme);
        }
      }
    };
    context.watch("topics");

    context.advertise?.(currentTopic, "sensor_msgs/Joy");

    context.watch("colorScheme");

    if (CURRENT_SCHEME === '') {
      CURRENT_SCHEME = colorScheme
    }
    init_nipple(CURRENT_SCHEME);


  }, [context]);
  useEffect(() => {
    renderDone?.();
  }, [renderDone]);

  return (
    <Gamepad
      onConnect={(gamepadIndex) => console.log(`Gamepad ${gamepadIndex} connected`)}
      onDisconnect={(gamepadIndex) => console.log(`Gamepad ${gamepadIndex} disconnected`)}
      onButtonChange={(buttonName) => handleGamepadButtonDown(buttonName)}
      onAxisChange={(axisName, value) => handleGamepadAxisChange(axisName, value)}
      deadZone={0.2}
    >{
      <div style={{ padding: "1rem" }}>
        {/* <h2>nipple test</h2> */}

        <div id="nipple_zone"></div>

        <div style={joyStyles.box}>
          <button 
            style={{...joyStyles.button, ...joyStyles.green}}
            onClick={() => {
              joyButtons[0]=1;
              pubCount=0;
            }}
          >Manual</button>
          <button 
            style={{...joyStyles.button, ...joyStyles.red}}
            onClick={() => {
              joyButtons[1]=1;
              pubCount=0;
            }}
          >Auto</button>
        </div>
        <div style={joyStyles.box}>
          <button 
            style={{...joyStyles.button, ...joyStyles.blue}}
            onClick={() => {
              joyButtons[2]=1;
              pubCount=0;
            }}
          >cmd_vel</button>
          <button 
            style={{...joyStyles.button, ...joyStyles.yellow}}
            onClick={() => {
              joyButtons[3]=1;
              pubCount=0;
            }}
          >Calibration</button>
        </div>
        <div style={joyStyles.box}>
          <button 
            style={{...joyStyles.button, ...joyStyles.red}}
            onClick={() => {
              joyButtons[7]=1;
              pubCount=0;
            }}
          >Arm</button>
          <button 
            style={{...joyStyles.button, ...joyStyles.green}}
            onClick={() => {
              joyButtons[6]=1;
              pubCount=0;
            }}
          >Disarm</button>
        </div>
        <div style={joyStyles.box}>
          <button 
            style={{...joyStyles.button, ...joyStyles.black}}

            onClick={() => {
              joyButtons[4]=1;
              pubCount=0;
            }}
          >Lights Off</button>
          <button 
            style={{...joyStyles.button, ...joyStyles.white}}
            onClick={() => {
              joyButtons[5]=1;
              pubCount=0;
            }}
          >Lights On</button>
        </div>
        <div>{state.outmsg}</div>
      </div>
    }</Gamepad>
  );
}

export function initCogniPilotJoyPanel(context: PanelExtensionContext): void {
  ReactDOM.render(<CogniPilotJoyPanel context={context} />, context.panelElement);
}
