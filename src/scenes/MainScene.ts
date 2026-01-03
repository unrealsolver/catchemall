import Phaser from "phaser";

export class MainScene extends Phaser.Scene {
  constructor() {
    super({ key: "MainScene" });
  }

  preload(): void {
    // Load assets here
  }

  create(): void {
    // Create ground
    const ground = this.matter.add.rectangle(400, 580, 800, 40, {
      isStatic: true,
      label: "ground",
    });

    // Create a sample dynamic body
    const ball = this.matter.add.circle(400, 100, 30, {
      restitution: 0.8,
      label: "ball",
    });

    // Add some text
    this.add
      .text(400, 50, "Catch Em All!", {
        fontSize: "32px",
        color: "#ffffff",
      })
      .setOrigin(0.5);

    // Enable pointer input
    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      this.matter.add.circle(pointer.x, pointer.y, 20, {
        restitution: 0.6,
        friction: 0.1,
      });
    });
  }

  update(): void {
    // Game loop logic here
  }
}
