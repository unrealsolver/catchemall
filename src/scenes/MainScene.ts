import Phaser from "phaser";
import {
  createGameWorld,
  createArenaPhysics,
  createClawPhysics,
  createToyPhysics,
  runGameSystems,
  GameWorld,
} from "../ecs";

export class MainScene extends Phaser.Scene {
  private world!: GameWorld;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private spaceKey!: Phaser.Input.Keyboard.Key;
  private Matter!: any;
  private graphics!: Phaser.GameObjects.Graphics;

  constructor() {
    super({ key: "MainScene" });
  }

  preload(): void {
    // No assets needed for prototype
  }

  create(): void {
    // Initialize ECS world
    this.world = createGameWorld();

    // Get Matter.js reference
    this.Matter = (this.matter as any).matter;

    // Create physics bodies and register entities
    createArenaPhysics(this.matter, this.world);
    createClawPhysics(this.matter, this.world);
    createToyPhysics(this.matter, this.world, 8);

    // Setup input
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.spaceKey = this.input.keyboard!.addKey(
      Phaser.Input.Keyboard.KeyCodes.SPACE
    );

    // Graphics for UI overlay
    this.graphics = this.add.graphics();
    this.drawUI();

    // Add title
    this.add
      .text(this.world.config.width / 2, 20, "CLAW MACHINE", {
        fontSize: "24px",
        color: "#ffffff",
        fontFamily: "monospace",
      })
      .setOrigin(0.5);

    // Drop zone label
    this.add
      .text(
        this.world.config.dropZoneWidth / 2,
        this.world.config.wellTop + 30,
        "DROP\nZONE",
        {
          fontSize: "14px",
          color: "#44aa44",
          fontFamily: "monospace",
          align: "center",
        }
      )
      .setOrigin(0.5);

    // Instructions
    this.add
      .text(
        this.world.config.width / 2,
        this.world.config.height - 15,
        "← → Move   SPACE Drop Claw",
        {
          fontSize: "12px",
          color: "#888888",
          fontFamily: "monospace",
        }
      )
      .setOrigin(0.5);
  }

  update(_time: number, delta: number): void {
    // Update world time
    this.world.time.delta = delta;
    this.world.time.elapsed += delta;

    // Read input
    const leftPressed = this.cursors.left.isDown;
    const rightPressed = this.cursors.right.isDown;
    const actionPressed = Phaser.Input.Keyboard.JustDown(this.spaceKey);

    // Run ECS systems
    runGameSystems(
      this.world,
      leftPressed,
      rightPressed,
      actionPressed,
      this.Matter
    );

    // Update UI
    this.drawUI();
  }

  private drawUI(): void {
    this.graphics.clear();

    const { dropZoneWidth, wellTop, wellBottom } = this.world.config;

    // Drop zone highlight
    this.graphics.lineStyle(2, 0x44aa44, 0.5);
    this.graphics.strokeRect(
      5,
      wellTop + 5,
      dropZoneWidth - 10,
      wellBottom - wellTop - 10
    );

    // Instructions background
    this.graphics.fillStyle(0x000000, 0.5);
    this.graphics.fillRect(
      0,
      this.world.config.height - 30,
      this.world.config.width,
      30
    );
  }
}
