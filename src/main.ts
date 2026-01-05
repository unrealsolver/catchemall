import Phaser from "phaser";
import { MainScene } from "./scenes/MainScene";

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  parent: "game-container",
  backgroundColor: "#2d2d44",
  physics: {
    default: "matter",
    matter: {
      positionIterations: 10,
      velocityIterations: 8,
      constraintIterations: 4,
      gravity: { x: 0, y: 1 },
      debug: true,
    },
  },
  scene: [MainScene],
};

new Phaser.Game(config);
