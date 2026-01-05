import { GameConfig } from "./config";
import { ClawState, ClawBodies } from "./claw";
import { Epicycle } from "./Epicycle";

export type GameState = {
  config: GameConfig;
  claw: ClawState;
  bodies: ClawBodies;
  wind: Epicycle;
};
