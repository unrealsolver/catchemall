import Phaser from "phaser";
import { MainScene } from "./scenes/MainScene";

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  parent: "game-container",
  backgroundColor: "#2d2d44",
  dom: { createContainer: true },
  physics: {
    default: "matter",
    matter: {
      enableSleeping: true,
      positionIterations: 16,
      velocityIterations: 10,
      constraintIterations: 6,
      gravity: { x: 0, y: 1 },
      debug: true,
    },
  },
  scene: [MainScene],
};

new Phaser.Game(config);
