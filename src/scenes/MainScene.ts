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
import { Epicycle } from "../game/Epicycle";

export type MainSceneContext = {
  cursors: Phaser.Types.Input.Keyboard.CursorKeys;
  spaceKey: Phaser.Input.Keyboard.Key;
  matter: Phaser.Physics.Matter.World;
  state: GameState;
};

export class MainScene extends Phaser.Scene {
  private state!: GameState;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private spaceKey!: Phaser.Input.Keyboard.Key;
  private graphics!: Phaser.GameObjects.Graphics;

  public ctx!: MainSceneContext;

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
      wind: new Epicycle({ baseAmp: 1.0, baseOmega: 0.9, seed: 13 }),
    };

    this.cursors = this.input.keyboard!.createCursorKeys();
    this.spaceKey = this.input.keyboard!.addKey(
      Phaser.Input.Keyboard.KeyCodes.SPACE
    );

    this.ctx = {
      cursors: this.cursors,
      spaceKey: this.spaceKey,
      matter: this.matter.world,
      state: this.state,
    };

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
    const { view, well, trolley: trolleyConfig, claw: clawConfig } = config;

    // Walls
    // Bottom
    this.createWall(
      view.width / 2,
      view.height - well.bottom,
      view.width + well.wallWidth * 2,
      well.wallWidth
    );

    // Left
    this.createWall(
      well.left,
      (well.top + view.height - well.bottom) / 2,
      well.wallWidth,
      view.height - well.bottom - well.top + 20
    );

    // Right
    this.createWall(
      view.width - well.wallWidth / 2,
      view.height / 2,
      well.wallWidth,
      view.height
    );

    // Left dropzone wall
    this.createWall(
      -well.wallWidth,
      view.height / 2,
      well.wallWidth,
      view.height
    );

    this.createToys(config);

    return {
      ...this.createClaw(config),
    };
  }

  private createClaw(config: GameConfig) {
    const { well, trolley: trolleyConfig, claw: clawConfig } = config;
    const trolleyX = (well.left + config.view.width) / 2;

    //Trolley
    const trolley = this.matter.add.rectangle(
      trolleyX,
      trolleyConfig.y,
      60,
      20,
      {
        isStatic: false,
        density: 10_000,
        frictionAir: 0.15,
        friction: 0.6,
        restitution: 0.1,
      }
    );

    // Rope links
    const ropeLinks: MatterJS.BodyType[] = [];
    let prevBody: MatterJS.BodyType = trolley;

    const linkLength = clawConfig.ropeMinL / clawConfig.ropeLinks;

    const group = this.matter.world.nextGroup(true);

    for (let i = 0; i < clawConfig.ropeLinks; i++) {
      const linkY = trolleyConfig.y + 20 + i * linkLength;
      const link = this.matter.add.rectangle(trolleyX, linkY, 4, linkLength, {
        collisionFilter: { group },
        friction: 0.1,
        frictionAir: 0.035,
        frictionStatic: 0.5,
        restitution: 0.1,
        density: 0.002,
        chamfer: { radius: 2 },
      });

      // Noise to avoid solver edge cases
      this.matter.body.setAngle(link, Phaser.Math.FloatBetween(-0.02, 0.02));

      ropeLinks.push(link);

      this.matter.add.constraint(prevBody, link, 2, 0.85, {
        pointA: { x: 0, y: i === 0 ? 10 : linkLength / 2 },
        pointB: { x: 0, y: -linkLength / 2 },
        damping: 0.1,
      });

      prevBody = link;
    }

    // Claw hinges
    const lastLinkY =
      trolleyConfig.y + 20 + (clawConfig.ropeLinks - 1) * linkLength;

    const hingeY = lastLinkY + linkLength / 2 + clawConfig.hingeRadius;

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
        pointA: { x: 0, y: linkLength / 2 },
        pointB: { x: clawConfig.spread, y: 0 },
      }
    );

    const rightConstraint = this.matter.add.constraint(
      lastLink,
      rightHinge,
      0,
      0.8,
      {
        pointA: { x: 0, y: linkLength / 2 },
        pointB: { x: -clawConfig.spread, y: 0 },
      }
    );

    return {
      trolley,
      leftConstraint,
      rightConstraint,
      leftHinge,
      rightHinge,
      ropeLinks,
    };
  }

  private createToys(config: GameConfig) {
    const { view, well } = config;
    // Toys
    for (let i = 0; i < 8; i++) {
      const sides = 4 + Math.floor(Math.random() * 3);
      const radius = 15 + Math.random() * 15;
      const x =
        well.left + 40 + Math.random() * (config.view.width - well.left - 80);
      const y = view.height - well.bottom - 60 - Math.random() * 200;
      this.matter.add.polygon(x, y, sides, radius, {
        friction: 0.5,
        restitution: 0.3,
        density: 0.002,
      });
    }
  }

  private createWall(x: number, y: number, width: number, height: number) {
    return this.matter.add.rectangle(x, y, width, height, {
      isStatic: true,
      friction: 0.3,
      restitution: 0.2,
    });
  }

  update(_, delta: number): void {
    const { state } = this;
    const { bodies, claw, config, wind } = state;

    const actionPressed = Phaser.Input.Keyboard.JustDown(this.spaceKey);

    wind.step(delta);

    updateTrolleyMovement(this.ctx, delta);

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
    const { view, well, dropzone } = this.state.config;

    const p1 = this.state.bodies.trolley.position;
    const p2 = this.state.wind;

    this.graphics.lineStyle(3, 0xffaa44, 0.5);
    this.graphics.lineBetween(p1.x, p1.y, p1.x + p2.x * 100, p1.y + p2.y * 100);

    // DropZone
    this.graphics.lineStyle(2, 0x44aa44, 0.5);
    this.graphics.strokeRect(
      0,
      view.height - well.bottom - well.wallWidth / 2 - dropzone.height,
      well.left - well.wallWidth / 2,
      dropzone.height
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
