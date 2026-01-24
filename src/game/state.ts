import { GameConfig } from "./config";
import { ClawState, ClawBodies } from "./claw";
import { Epicycle } from "./Epicycle";
import { MainSceneContext } from "../scenes/MainScene";

export type GameState = {
  config: GameConfig;
  claw: ClawState;
  bodies: ClawBodies;
  wind: Epicycle;
  targetToy: Phaser.Physics.Matter.Image | Phaser.Physics.Matter.Sprite;
};
