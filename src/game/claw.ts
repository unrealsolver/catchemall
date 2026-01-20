import Phaser, { Scene } from "phaser";
import { GameConfig } from "./config";
import { MainScene, MainSceneContext } from "../scenes/MainScene";
import { BodyType, ConstraintType } from "matter";
import Matter from "matter-js";

const { Body, Vector } = Phaser.Physics.Matter.Matter;

export type ClawState = {
  isDescending: boolean;
  isAscending: boolean;
  isOpen: boolean;
  currentSpread: number;
};

export type ClawBodies = {
  claw: Claw;
  trolley: BodyType;
  ropeLinks: BodyType[];
  leftHinge: BodyType;
  rightHinge: BodyType;
  leftConstraint: ConstraintType;
  rightConstraint: ConstraintType;
};

export function clampSpeed(body: BodyType, maxSpeed: number) {
  const vx = body.velocity.x;
  const vy = body.velocity.y;
  const s = Math.hypot(vx, vy);
  if (s <= maxSpeed) return;

  const k = maxSpeed / s;
  Body.setVelocity(body, { x: vx * k, y: vy * k });
}

export function clampAngular(body: BodyType, maxSpeed: number) {
  const av = body.angularSpeed;

  if (Math.abs(av) <= maxSpeed) return;

  const k = maxSpeed / av;
  Body.setAngularVelocity(body, av * k);
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

  constructor(scene: Scene, flip = false) {
    const r = 7;
    const link = 40;
    const flipY = flip ? -1 : 1;

    const rotator = scene.matter.bodies.circle(0, 0, r);
    Body.translate(rotator, { x: 0, y: 0 });
    Body.setDensity(rotator, 0.01);

    const left = scene.matter.bodies.circle(0, 0, r);
    left.collisionFilter.mask = 0;
    Body.translate(left, { x: 0, y: link + 5 });
    Body.setDensity(left, 0.0005);

    const right = scene.matter.bodies.circle(0, 0, r);
    right.collisionFilter.mask = 0;
    Body.translate(right, { x: flipY * (link - 10), y: link + 5 });
    Body.setDensity(right, 0.0005);

    this.hinges = [left, right];
    const compound = scene.matter.body.create({
      parts: [rotator, left, right],
      frictionAir: 0.01,
      restitution: 0.1,
      friction: 0.4,
      frictionStatic: 0.4,
    });
    this.compound = compound;
    const obj = scene.add.rectangle(0, 0, 10, 40, 0xff0000);
    const ent = scene.matter.add.gameObject(obj, compound);
    this.body = ent as Phaser.Physics.Matter.Sprite;
  }
}

export class Claw implements WithUpdate {
  private scene: Scene;
  base: BodyType;
  arms: [left: Arm, right: Arm];
  actuator: ConstraintType;
  dampers: [ConstraintType, ConstraintType];
  openWidth = 70;
  closedWidth = 50;
  actuatorStiffness = 0.02;
  damperStiffness = 0.02;
  isClosed: boolean = false;

  private makeHinge(arm: Arm, isRight: boolean = false) {
    this.scene.matter.add.constraint(this.base, arm.compound, 0, 1, {
      pointA: { x: isRight ? 20 : -20, y: 0 },
      pointB: { x: isRight ? 2.5 : -2.5, y: -10 },
      angularStiffness: 0.5,
      stiffness: 1,
      damping: 0.2,
    });
  }

  constructor(scene: Scene, x: number, y: number) {
    this.scene = scene;
    const group = Body.nextGroup(true);
    this.base = scene.matter.add.rectangle(x, y, 50, 15, {
      density: 0.01,
      isStatic: false,
      collisionFilter: { group },
    });

    const leftArm = new Arm(scene);
    leftArm.body.setCollisionGroup(group);
    leftArm.body.setPosition(
      this.base.position.x - 17,
      this.base.position.y + 12
    );

    const rightArm = new Arm(scene, true);
    rightArm.body.setCollisionGroup(group);

    rightArm.body.setPosition(
      this.base.position.x + 17,
      this.base.position.y + 12
    );

    this.makeHinge(rightArm, true);
    this.makeHinge(leftArm);
    this.makeActuator(leftArm, rightArm);
    this.arms = [leftArm, rightArm];
  }

  private setSlacked() {
    this.actuator.stiffness = 0;
    this.dampers[0].stiffness = 0;
    this.dampers[1].stiffness = 0;
  }

  private setNormal() {
    this.actuator.stiffness = this.actuatorStiffness;
    this.dampers[0].stiffness = this.damperStiffness;
    this.dampers[1].stiffness = this.damperStiffness;
  }

  /** radians */
  private angleBetween(a: BodyType, b: BodyType) {
    return Phaser.Math.Angle.Wrap(a.angle - b.angle);
  }

  update(delta: number, ctx: MainSceneContext): void {
    // Stupid twitch mitigations
    clampSpeed(this.arms[0].compound, 4);
    clampSpeed(this.arms[1].compound, 4);
    clampAngular(this.arms[0].compound, 0.05);
    clampAngular(this.arms[1].compound, 0.05);

    // angle between base and arm
    const ang1 = this.angleBetween(this.base, this.arms[0].compound);
    const ang2 = this.angleBetween(this.base, this.arms[1].compound);

    const isLeftBroken = ang1 + Math.PI / 2 < 0;
    const isRightBroken = Math.PI / 2 - ang2 < 0;

    if (isLeftBroken) {
      this.arms[0].compound.torque = -0.3;
      this.setSlacked();
    }

    if (isRightBroken) {
      this.arms[1].compound.torque = 0.3;
      this.setSlacked();
    }

    if (!isLeftBroken && !isRightBroken) {
      this.setNormal();
    }

    const actionPressed = Phaser.Input.Keyboard.JustDown(ctx.spaceKey);
    if (actionPressed) {
      this.isClosed = !this.isClosed;
      this.actuator.length = this.isClosed ? this.closedWidth : this.openWidth;
    }
  }

  private makeActuator(leftArm: Arm, rightArm: Arm) {
    this.actuator = this.scene.matter.add.constraint(
      leftArm.compound,
      rightArm.compound,
      this.openWidth,
      this.actuatorStiffness,
      {
        pointA: { x: 0, y: 10 },
        pointB: { x: 0, y: 10 },
        damping: 0.05,
      }
    );

    const damper1 = this.scene.matter.add.constraint(
      this.base,
      rightArm.compound,
      45,
      this.damperStiffness,
      {
        pointA: { x: -15, y: 0 },
        pointB: { x: 0, y: 10 },
        damping: 0.05,
      }
    );

    const damper2 = this.scene.matter.add.constraint(
      this.base,
      leftArm.compound,
      45,
      this.damperStiffness,
      {
        pointA: { x: 15, y: 0 },
        pointB: { x: 0, y: 10 },
        damping: 0.05,
      }
    );

    this.dampers = [damper1, damper2];
  }
}

export const createClawState = (spread: number): ClawState => ({
  isDescending: false,
  isAscending: false,
  isOpen: true,
  currentSpread: spread,
});

interface WithUpdate {
  update(delta: number, ctx: MainSceneContext): void;
}

export const updateTrolleyMovement = (
  ctx: MainSceneContext,
  delta: number
): void => {
  const { state } = ctx;
  const { bodies, wind } = state;
  const trolley = bodies.trolley;

  const leftPressed = ctx.cursors.left.isDown;
  const rightPressed = ctx.cursors.right.isDown;
  const upPressed = ctx.cursors.up.isDown;
  const downPressed = ctx.cursors.down.isDown;

  if (!isBody(trolley)) return;

  if (rightPressed) applyAccel(trolley, 7, 0, delta);
  if (leftPressed) applyAccel(trolley, -7, 0, delta);
  if (upPressed) applyAccel(trolley, 0, -5, delta);
  // 300 for max vertical depth
  if (downPressed && trolley.position.y < 300) applyAccel(trolley, 0, 3, delta);

  // Thrust
  applyAccel(trolley, 0, -4, delta);

  // Wind
  applyAccel(trolley, wind.x, wind.y, delta, { x: 0, y: -5 });
};
