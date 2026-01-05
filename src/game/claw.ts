import Phaser from "phaser";
import { GameConfig } from "./config";
import { t as _t, StateMachine } from "typescript-fsm";
import { MainScene, MainSceneContext } from "../scenes/MainScene";
import { Body, Vector } from "matter-js";
import type { Body as MatterBody } from "matter-js";

export type ClawState = {
  isDescending: boolean;
  isAscending: boolean;
  isOpen: boolean;
  currentSpread: number;
  fsm: typeof fsm;
};

export type ClawBodies = {
  trolley: MatterJS.BodyType;
  ropeLinks: MatterJS.BodyType[];
  leftHinge: MatterJS.BodyType;
  rightHinge: MatterJS.BodyType;
  leftConstraint: MatterJS.ConstraintType;
  rightConstraint: MatterJS.ConstraintType;
};

type States =
  | "ACTIVE"
  | "DESCENDING"
  | "CLOSING"
  | "ASCEND"
  | "CARRY"
  | "DROP"
  | "RESTORE";
type Events = "CATCH" | "FSM_FORWARD";

const t = _t<States, Events, () => void>;

const transitions = [
  t("ACTIVE", "CATCH", "DESCENDING"),
  t("DESCENDING", "FSM_FORWARD", "CLOSING", justLog),
  t("CLOSING", "FSM_FORWARD", "ASCEND", justLog),
  t("ASCEND", "FSM_FORWARD", "CARRY", justLog),
  t("CARRY", "FSM_FORWARD", "DROP", justLog),
  t("DROP", "FSM_FORWARD", "RESTORE", justLog),
];

const fsm = new StateMachine<States, Events>("ACTIVE", transitions);

function justLog() {
  console.log(fsm.getState());
}

function fsmForward() {
  return fsm.dispatch("FSM_FORWARD");
}

export function clampSpeed(body: MatterBody, maxSpeed: number) {
  const vx = body.velocity.x;
  const vy = body.velocity.y;
  const s = Math.hypot(vx, vy);
  if (s <= maxSpeed) return;

  const k = maxSpeed / s;
  Body.setVelocity(body, { x: vx * k, y: vy * k });
}

export function applyAccel(
  body: MatterBody,
  ax: number,
  ay: number,
  deltaMs: number,
  offset: Vector = { x: 0, y: 0 }
) {
  // scale vs 60fps so it feels stable across frame rates
  const dt = deltaMs / 16.6667;

  // F = m * a (then scaled to Matter's world units)
  const fx = body.mass * ax * 0.0005 * dt;
  const fy = body.mass * ay * 0.0005 * dt;

  Body.applyForce(body, Vector.add(body.position, offset), { x: fx, y: fy });
}

function isBody(b: any): b is Body {
  return b && b.position && b.velocity && typeof b.mass === "number";
}

export const createClawState = (spread: number): ClawState => ({
  isDescending: false,
  isAscending: false,
  isOpen: true,
  currentSpread: spread,
  fsm,
});

export const updateTrolleyMovement = (
  ctx: MainSceneContext,
  delta: number
): void => {
  const { state } = ctx;
  const { bodies, claw, config, wind } = state;
  const trolley = bodies.trolley;

  const leftPressed = ctx.cursors.left.isDown;
  const rightPressed = ctx.cursors.right.isDown;
  const downPressed = ctx.cursors.down.isDown;
  const actionPressed = Phaser.Input.Keyboard.JustDown(ctx.spaceKey);

  if (!isBody(trolley)) return;

  const fsmState = claw.fsm.getState();
  if (fsmState === "ACTIVE") {
    let dx = 0;

    if (rightPressed) applyAccel(trolley, 6, 0, delta);
    if (leftPressed) applyAccel(trolley, -6, 0, delta);
    if (downPressed) applyAccel(trolley, 0, 5, delta);

    // Thrust
    applyAccel(
      trolley,
      0,
      -1 - 100 * Math.pow(trolley.position.y / state.config.view.height / 2, 2),
      delta
    );

    // Wind
    applyAccel(trolley, wind.x, wind.y, delta, { x: 0, y: -5 });

    const newX = trolley.position.x + dx;
    const minX = config.well.left + config.claw.spread + 20;
    const maxX = config.view.width - config.claw.spread - 20;

    if (newX >= minX && newX <= maxX) {
      //ctx.matter.body.setPosition(trolley, {
      //  x: newX,
      //  y: trolley.position.y,
      //});
    }
  } else if (fsmState === "DESCENDING") {
  }
};

export const updateClawSequence = (
  state: ClawState,
  lastLinkY: number,
  config: GameConfig,
  actionPressed: boolean
): void => {
  // Start descent on action press when idle
  if (actionPressed && !state.isDescending && !state.isAscending) {
    state.isDescending = true;
  }

  // Descending: check if reached bottom
  if (state.isDescending) {
    if (lastLinkY >= config.well.bottom - 50) {
      state.isDescending = false;
      state.isAscending = true;
      state.isOpen = false;
    }
  }

  // Ascending: check if reached top
  if (state.isAscending) {
    if (lastLinkY <= config.trolley.y + 80) {
      state.isAscending = false;
      state.isOpen = true;
    }
  }
};

export const updateClawHinges = (
  state: ClawState,
  leftConstraint: MatterJS.ConstraintType,
  rightConstraint: MatterJS.ConstraintType,
  config: GameConfig
): void => {
  const targetSpread = state.isOpen ? config.claw.spread : 5;
  state.currentSpread += (targetSpread - state.currentSpread) * 0.1;

  leftConstraint.pointB = { x: state.currentSpread, y: 0 };
  rightConstraint.pointB = { x: -state.currentSpread, y: 0 };
};
