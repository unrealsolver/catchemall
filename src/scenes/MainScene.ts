import Phaser from "phaser";
import {
  GameConfig,
  createGameConfig,
  GameState,
  ClawBodies,
  createClawState,
  updateTrolleyMovement,
  updateClawSequence,
  updateClawHinges,
} from "../game";

export class MainScene extends Phaser.Scene {
  private state!: GameState;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private spaceKey!: Phaser.Input.Keyboard.Key;
  private graphics!: Phaser.GameObjects.Graphics;

  constructor() {
    super({ key: "MainScene" });
  }

  preload(): void {}

  create(): void {
    const config = createGameConfig();
    const bodies = this.createPhysicsObjects(config);

    this.state = {
      config,
      claw: createClawState(config.claw.spread),
      bodies,
    };

    this.cursors = this.input.keyboard!.createCursorKeys();
    this.spaceKey = this.input.keyboard!.addKey(
      Phaser.Input.Keyboard.KeyCodes.SPACE
    );

    this.graphics = this.add.graphics();
    this.drawUI();

    this.add
      .text(config.view.width / 2, 20, "CLAW MACHINE", {
        fontSize: "24px",
        color: "#ffffff",
        fontFamily: "monospace",
      })
      .setOrigin(0.5);

    this.add
      .text(config.well.left / 2, config.well.top + 30, "DROP\nZONE", {
        fontSize: "14px",
        color: "#44aa44",
        fontFamily: "monospace",
        align: "center",
      })
      .setOrigin(0.5);

    this.add
      .text(
        config.view.width / 2,
        config.view.height - 15,
        "← → Move   SPACE Drop Claw",
        {
          fontSize: "12px",
          color: "#888888",
          fontFamily: "monospace",
        }
      )
      .setOrigin(0.5);
  }

  private createPhysicsObjects(config: GameConfig): ClawBodies {
    const { well, trolley: trolleyConfig, claw: clawConfig } = config;
    const trolleyX = (well.left + config.view.width) / 2;

    // Walls
    this.createWall(
      config.view.width / 2,
      well.bottom,
      config.view.width + well.wallWidth * 2,
      well.wallWidth
    );
    this.createWall(
      well.left,
      (well.top + well.bottom) / 2,
      20,
      well.bottom - well.top + 20
    );
    this.createWall(
      config.view.width + well.wallWidth / 2,
      (well.top + well.bottom) / 2,
      well.wallWidth,
      well.bottom - well.top + 20
    );
    this.createWall(
      -well.wallWidth,
      (well.top + well.bottom) / 2,
      well.wallWidth,
      well.bottom - well.top + 20
    );

    // Trolley
    const trolley = this.matter.add.rectangle(
      trolleyX,
      trolleyConfig.y,
      60,
      20,
      { isStatic: true, friction: 0.3, restitution: 0.1 }
    );

    // Rope links
    const ropeLinks: MatterJS.BodyType[] = [];
    let prevBody: MatterJS.BodyType = trolley;

    for (let i = 0; i < clawConfig.ropeLinks; i++) {
      const linkY = trolleyConfig.y + 20 + i * clawConfig.linkLength;
      const link = this.matter.add.rectangle(
        trolleyX,
        linkY,
        4,
        clawConfig.linkLength,
        { friction: 0.1, restitution: 0.1, density: 0.001 }
      );
      ropeLinks.push(link);

      this.matter.add.constraint(
        prevBody,
        link,
        clawConfig.linkLength * 0.5,
        0.9,
        {
          pointA: { x: 0, y: i === 0 ? 10 : clawConfig.linkLength / 2 },
          pointB: { x: 0, y: -clawConfig.linkLength / 2 },
          damping: 0.1,
        }
      );

      prevBody = link;
    }

    // Claw hinges
    const lastLinkY =
      trolleyConfig.y + 20 + (clawConfig.ropeLinks - 1) * clawConfig.linkLength;
    const hingeY =
      lastLinkY + clawConfig.linkLength / 2 + clawConfig.hingeRadius;

    const leftHinge = this.matter.add.circle(
      trolleyX - clawConfig.spread,
      hingeY,
      clawConfig.hingeRadius,
      { friction: 0.8, restitution: 0.1, density: 0.002 }
    );

    const rightHinge = this.matter.add.circle(
      trolleyX + clawConfig.spread,
      hingeY,
      clawConfig.hingeRadius,
      { friction: 0.8, restitution: 0.1, density: 0.002 }
    );

    const lastLink = ropeLinks[ropeLinks.length - 1];

    const leftConstraint = this.matter.add.constraint(
      lastLink,
      leftHinge,
      0,
      0.8,
      {
        pointA: { x: 0, y: clawConfig.linkLength / 2 },
        pointB: { x: clawConfig.spread, y: 0 },
      }
    );

    const rightConstraint = this.matter.add.constraint(
      lastLink,
      rightHinge,
      0,
      0.8,
      {
        pointA: { x: 0, y: clawConfig.linkLength / 2 },
        pointB: { x: -clawConfig.spread, y: 0 },
      }
    );

    // Toys
    for (let i = 0; i < 8; i++) {
      const sides = 4 + Math.floor(Math.random() * 3);
      const radius = 15 + Math.random() * 15;
      const x =
        well.left + 40 + Math.random() * (config.view.width - well.left - 80);
      const y = well.bottom - 60 - Math.random() * 200;
      this.matter.add.polygon(x, y, sides, radius, {
        friction: 0.5,
        restitution: 0.3,
        density: 0.002,
      });
    }

    return {
      trolley,
      ropeLinks,
      leftHinge,
      rightHinge,
      leftConstraint,
      rightConstraint,
    };
  }

  private createWall(
    x: number,
    y: number,
    width: number,
    height: number
  ): MatterJS.BodyType {
    return this.matter.add.rectangle(x, y, width, height, {
      isStatic: true,
      friction: 0.3,
      restitution: 0.2,
    });
  }

  update(): void {
    const { state } = this;
    const { bodies, claw, config } = state;

    const leftPressed = this.cursors.left.isDown;
    const rightPressed = this.cursors.right.isDown;
    const actionPressed = Phaser.Input.Keyboard.JustDown(this.spaceKey);

    updateTrolleyMovement(
      bodies.trolley,
      claw,
      config,
      leftPressed,
      rightPressed,
      this.matter
    );

    const lastLink = bodies.ropeLinks[bodies.ropeLinks.length - 1];
    updateClawSequence(claw, lastLink.position.y, config, actionPressed);

    updateClawHinges(
      claw,
      bodies.leftConstraint,
      bodies.rightConstraint,
      config
    );

    this.drawUI();
  }

  private drawUI(): void {
    this.graphics.clear();
    const { well } = this.state.config;

    this.graphics.lineStyle(2, 0x44aa44, 0.5);
    this.graphics.strokeRect(
      0,
      well.top + 5,
      well.left - well.wallWidth / 2,
      well.bottom - well.top - well.wallWidth / 2
    );

    this.graphics.fillStyle(0x000000, 0.5);
    this.graphics.fillRect(
      0,
      this.state.config.view.height - 30,
      this.state.config.view.width,
      30
    );
  }
}
