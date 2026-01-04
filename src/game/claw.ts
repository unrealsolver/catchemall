import Phaser from "phaser";
import { GameConfig } from "./config";

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

export const createClawState = (spread: number): ClawState => ({
  isDescending: false,
  isAscending: false,
  isOpen: true,
  currentSpread: spread,
});

export const updateTrolleyMovement = (
  trolley: MatterJS.BodyType,
  state: ClawState,
  config: GameConfig,
  leftPressed: boolean,
  rightPressed: boolean,
  matter: Phaser.Physics.Matter.MatterPhysics
): void => {
  if (state.isDescending || state.isAscending) return;

  let dx = 0;
  if (leftPressed) dx -= config.trolley.speed;
  if (rightPressed) dx += config.trolley.speed;

  const newX = trolley.position.x + dx;
  const minX = config.well.left + config.claw.spread + 20;
  const maxX = config.view.width - config.claw.spread - 20;

  if (newX >= minX && newX <= maxX) {
    matter.body.setPosition(trolley, {
      x: newX,
      y: trolley.position.y,
    });
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
