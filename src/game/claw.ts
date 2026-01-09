import Phaser, { Scene } from "phaser";
import { GameConfig } from "./config";
import { MainSceneContext } from "../scenes/MainScene";
import { BodyType } from "matter";

const { Body, Vector } = Phaser.Physics.Matter.Matter;

export type ClawState = {
  isDescending: boolean;
  isAscending: boolean;
  isOpen: boolean;
  currentSpread: number;
};

export type ClawBodies = {
  trolley: MatterJS.BodyType;
  ropeLinks: MatterJS.BodyType[];
  leftHinge: MatterJS.BodyType;
  rightHinge: MatterJS.BodyType;
  leftConstraint: MatterJS.ConstraintType;
  rightConstraint: MatterJS.ConstraintType;
};

export function clampSpeed(body: MatterJS.BodyType, maxSpeed: number) {
  const vx = body.velocity.x;
  const vy = body.velocity.y;
  const s = Math.hypot(vx, vy);
  if (s <= maxSpeed) return;

  const k = maxSpeed / s;
  Body.setVelocity(body, { x: vx * k, y: vy * k });
}

export function applyAccel(
  body: MatterJS.BodyType,
  ax: number,
  ay: number,
  deltaMs: number,
  offset: MatterJS.Vector = { x: 0, y: 0 }
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

export class Arm {
  hinges: [proximal: MatterJS.BodyType, distal: MatterJS.BodyType];
  body: Phaser.Physics.Matter.Sprite;
  compound: BodyType;

  constructor(scene: Scene) {
    const r = 7;
    const link = 40;
    const left = scene.matter.bodies.circle(0, 0, r);
    const right = scene.matter.bodies.circle(0, 0, r);
    Body.translate(left, { x: -link / 2, y: 0 });
    Body.translate(right, { x: link / 2, y: 0 });
    this.hinges = [left, right];
    const compound = scene.matter.body.create({
      parts: [left, right],
      frictionAir: 0.02,
      restitution: 0.1,
      friction: 0.6,
      density: 0.002,
    });
    this.compound = compound;
    const obj = scene.add.rectangle(0, 0, 40, 10, 0xff0000);
    const ent = scene.matter.add.gameObject(obj, compound);
    this.body = ent as Phaser.Physics.Matter.Sprite;
  }
}

export class Claw {
  private scene: Scene;
  hinges: [];
  base: BodyType;

  private makeHinge(arm: Arm, isRight: boolean = false) {
    this.scene.matter.add.constraint(this.base, arm.compound, 50, 0.5, {
      pointA: { x: isRight ? 5 : -5, y: 5 },
      pointB: { x: isRight ? 20 : -20, y: 0 },
      angularStiffness: 0.01,
      damping: 0.01,
    });
    this.scene.matter.add.constraint(
      this.base,
      arm.compound,
      50,
      0.5,

      {
        pointA: { x: isRight ? 5 : -5, y: 5 },
        pointB: { x: isRight ? 10 : -10, y: 0 },
        angularStiffness: 0.01,
        damping: 0.01,
      }
    );
  }

  constructor(scene: Scene, x: number, y: number) {
    this.scene = scene;
    this.base = scene.matter.add.rectangle(x, y, 20, 20, { density: 0.01 });

    const leftArm = new Arm(scene);
    leftArm.body.setPosition(
      this.base.position.x - 30,
      this.base.position.y + 50
    );

    const rightArm = new Arm(scene);
    rightArm.body.setPosition(
      this.base.position.x + 30,
      this.base.position.y + 50
    );

    this.makeHinge(rightArm, true);
    this.makeHinge(leftArm);
  }
}

export const createClawState = (spread: number): ClawState => ({
  isDescending: false,
  isAscending: false,
  isOpen: true,
  currentSpread: spread,
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
