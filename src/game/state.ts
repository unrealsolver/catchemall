import { GameConfig } from "./config";
import { ClawState, ClawBodies } from "./claw";

export type GameState = {
  config: GameConfig;
  claw: ClawState;
  bodies: ClawBodies;
};
