import Phaser from "phaser";
import {
  GameConfig,
  createGameConfig,
  GameState,
  ClawBodies,
  createClawState,
  updateTrolleyMovement,
  updateClawSequence,
  Claw,
} from "../game";
import { Epicycle } from "../game/Epicycle";
import { BodyType } from "matter";
import { createIrregularPolygon } from "../utils";

export type MainSceneContext = {
  cursors: Phaser.Types.Input.Keyboard.CursorKeys;
  spaceKey: Phaser.Input.Keyboard.Key;
  matter: Phaser.Physics.Matter.World;
  state: GameState;
};

export class MainScene extends Phaser.Scene {
  private state!: GameState;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
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

    this.ctx = {
      cursors: this.cursors,
      spaceKey: this.input.keyboard!.addKey(
        Phaser.Input.Keyboard.KeyCodes.SPACE
      ),
      matter: this.matter.world,
      state: this.state,
    };

    this.graphics = this.add.graphics();
    this.drawUI();

    const title = document.createElement("div");

    title.innerHTML = "AI SLOP MASTER 3000 TUNK TUNK SAHUR MACHINE";
    this.add.dom(config.view.width / 2, 20, title).setOrigin(0.5);

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

    const lastLink = ropeLinks[ropeLinks.length - 1];

    const claw = new Claw(
      this,
      lastLink.position.x,
      lastLink.position.y + linkLength
    );

    this.matter.add.constraint(lastLink, claw.base, linkLength / 2, 0.85, {
      pointA: { x: 0, y: linkLength / 2 },
      pointB: { x: 0, y: -10 },
    });

    return {
      trolley,
      ropeLinks,
      claw,
    };
  }

  private createToys({ view, well }: GameConfig): void {
    const TOY_SIZE = 22;
    const TOYS_LIMIT = 20;

    for (let i = 0; i < TOYS_LIMIT - 1; i++) {
      const toysPackSize = 4 + Math.floor(Math.random() * 3); // 4–6 polygons
      const coreSides = 3 + Math.floor(Math.random() * 4); // 3–6 sides
      const coreRadius = TOY_SIZE + Math.random() * 12;

      const corePolygon = createIrregularPolygon(
        coreSides,
        coreRadius,
        coreRadius * 0.65
      );

      // initial core spawn position in world
      const x = well.left + 40 + Math.random() * (view.width - well.left - 140);
      const y = view.height - well.bottom - 60 - Math.random() * 200;

      const core = this.matter.bodies.fromVertices(
        x,
        y,
        [corePolygon],
        { density: 0.3, restitution: 0.002, friction: 0.15 },
        true
      );

      const toys: BodyType[] = [core];
      const surroundToys = toysPackSize - 1;
      const baseRadius = coreRadius + 12;

      for (let p = 0; p < surroundToys; p++) {
        const sides = 3 + Math.floor(Math.random() * 4);
        const radius = TOY_SIZE + Math.random() * 12;
        const polygon = createIrregularPolygon(sides, radius, radius * 0.65);

        // for radial placement, (TODO? randomize it)
        const angle = (p / surroundToys) * Math.PI * 2;
        // position relative to core
        const offsetX = x + Math.cos(angle) * (baseRadius + radius * 0.5);
        const offsetY = y + Math.sin(angle) * (baseRadius + radius * 0.5);

        const toy = this.matter.bodies.fromVertices(
          offsetX,
          offsetY,
          [polygon],
          { density: 0.3, restitution: 0.002, friction: 0.15 },
          true
        );

        toys.push(toy);

        // invisible "rope" between compound core and surround toy
        const stiffness = 0.0002;
        // extra slack for "rope"
        const constraintLength =
          this.getDistance(core, toy) * (1 + Math.random() * 0.15);

        this.matter.add.constraint(core, toy, constraintLength, stiffness, {
          damping: 0,
          render: { visible: false },
        });
      }

      // render toys //
      for (const toy of toys) {
        this.matter.world.add(toy);
      }
    }
  }

  // between two bodies for constraint length
  private getDistance(a: BodyType, b: BodyType) {
    const dx = a.position.x - b.position.x;
    const dy = a.position.y - b.position.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  private createWall(x: number, y: number, width: number, height: number) {
    return this.matter.add.rectangle(x, y, width, height, {
      isStatic: true,
      friction: 0.3,
      restitution: 0.2,
    });
  }

  update(_: never, delta: number): void {
    const { state } = this;
    const { bodies, claw, config, wind } = state;

    wind.step(delta);

    updateTrolleyMovement(this.ctx, delta);
    this.state.bodies.claw.update(delta, this.ctx);

    const lastLink = bodies.ropeLinks[bodies.ropeLinks.length - 1];
    updateClawSequence(claw, lastLink.position.y, config, false);

    //updateClawHinges(
    //  claw,
    //  bodies.leftConstraint,
    //  bodies.rightConstraint,
    //  config
    //);

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
