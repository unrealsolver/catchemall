import Phaser from "phaser";
import { addComponent } from "bitecs";
import {
  createGameWorld,
  GameWorld,
  createWall,
  createTrolley,
  createRopeLink,
  createClawHinge,
  createToy,
  physicsSpawnSystem,
  runGameSystems,
  PhysicsRef,
  ConstraintRef,
} from "../ecs";

export class MainScene extends Phaser.Scene {
  private world!: GameWorld;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private spaceKey!: Phaser.Input.Keyboard.Key;
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

    // 1. Create all ECS entities (declarative - no physics yet)
    const entityIds = this.createEntities();

    // 2. Spawn physics bodies from Collider components
    physicsSpawnSystem(this.world, this.matter);

    // 3. Create constraints (needs bodies to exist)
    this.createConstraints(entityIds);

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
      .text(this.world.config.view.width / 2, 20, "CLAW MACHINE", {
        fontSize: "24px",
        color: "#ffffff",
        fontFamily: "monospace",
      })
      .setOrigin(0.5);

    // Drop zone label
    this.add
      .text(
        this.world.config.wellLeft / 2,
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
        this.world.config.view.width / 2,
        this.world.config.view.height - 15,
        "← → Move   SPACE Drop Claw",
        {
          fontSize: "12px",
          color: "#888888",
          fontFamily: "monospace",
        }
      )
      .setOrigin(0.5);
  }

  private createEntities(): {
    trolleyEid: number;
    linkEids: number[];
    leftHingeEid: number;
    rightHingeEid: number;
  } {
    const {
      wellLeft,
      wallWidth,
      wellTop,
      wellBottom,
      trolleyY,
      ropeLinks,
      linkLength,
      clawRadius,
      clawSpread,
    } = this.world.config;
    const trolleyX = (wellLeft + this.world.config.view.width) / 2;

    // Arena walls
    // Basin floor
    createWall(
      this.world,
      this.world.config.view.width / 2,
      wellBottom,
      this.world.config.view.width + wallWidth * 2,
      wallWidth
    );

    // Basin left wall
    createWall(
      this.world,
      wellLeft,
      (wellTop + wellBottom) / 2,
      20,
      wellBottom - wellTop + 20
    );

    // Basin right wall
    createWall(
      this.world,
      this.world.config.view.width + wallWidth / 2,
      (wellTop + wellBottom) / 2,
      wallWidth,
      wellBottom - wellTop + 20
    );

    // Drop zone left wall
    createWall(
      this.world,
      -wallWidth,
      (wellTop + wellBottom) / 2,
      wallWidth,
      wellBottom - wellTop + 20
    );

    // Trolley
    const trolleyEid = createTrolley(this.world, trolleyX, trolleyY);

    // Rope links
    const linkEids: number[] = [];
    for (let i = 0; i < ropeLinks; i++) {
      const linkY = trolleyY + 20 + i * linkLength;
      const linkEid = createRopeLink(this.world, trolleyX, linkY, i);
      linkEids.push(linkEid);
    }

    // Claw hinges
    const lastLinkY = trolleyY + 20 + (ropeLinks - 1) * linkLength;
    const hingeY = lastLinkY + linkLength / 2 + clawRadius;

    const leftHingeEid = createClawHinge(
      this.world,
      trolleyX - clawSpread,
      hingeY,
      -1
    );
    const rightHingeEid = createClawHinge(
      this.world,
      trolleyX + clawSpread,
      hingeY,
      1
    );

    // Toys
    for (let i = 0; i < 8; i++) {
      const sides = 4 + Math.floor(Math.random() * 3);
      const radius = 15 + Math.random() * 15;
      const x =
        wellLeft +
        40 +
        Math.random() * (this.world.config.view.width - wellLeft - 80);
      const y = wellBottom - 60 - Math.random() * 200;
      createToy(this.world, x, y, sides, radius);
    }

    return { trolleyEid, linkEids, leftHingeEid, rightHingeEid };
  }

  private createConstraints(entityIds: {
    trolleyEid: number;
    linkEids: number[];
    leftHingeEid: number;
    rightHingeEid: number;
  }): void {
    const { trolleyEid, linkEids, leftHingeEid, rightHingeEid } = entityIds;
    const { linkLength, clawSpread } = this.world.config;

    // Get bodies from entity PhysicsRef
    const getBody = (eid: number) =>
      this.world.physics.bodies.get(PhysicsRef.bodyId[eid])!;

    // Connect rope links
    let prevBody = getBody(trolleyEid);
    for (let i = 0; i < linkEids.length; i++) {
      const linkBody = getBody(linkEids[i]);

      const constraint = this.matter.add.constraint(
        prevBody,
        linkBody,
        linkLength * 0.5,
        0.9,
        {
          pointA: { x: 0, y: i === 0 ? 10 : linkLength / 2 },
          pointB: { x: 0, y: -linkLength / 2 },
          damping: 0.1,
        }
      );
      this.world.constraints.items.set(constraint.id, constraint);

      prevBody = linkBody;
    }

    // Connect claw hinges to last rope link
    const lastLinkBody = getBody(linkEids[linkEids.length - 1]);
    const leftHingeBody = getBody(leftHingeEid);
    const rightHingeBody = getBody(rightHingeEid);

    const leftConstraint = this.matter.add.constraint(
      lastLinkBody,
      leftHingeBody,
      0,
      0.8,
      {
        pointA: { x: 0, y: linkLength / 2 },
        pointB: { x: clawSpread, y: 0 },
      }
    );
    this.world.constraints.items.set(leftConstraint.id, leftConstraint);

    // Add ConstraintRef to hinge entity for clawHingeSystem
    addComponent(this.world, leftHingeEid, ConstraintRef);
    ConstraintRef.constraintId[leftHingeEid] = leftConstraint.id;

    const rightConstraint = this.matter.add.constraint(
      lastLinkBody,
      rightHingeBody,
      0,
      0.8,
      {
        pointA: { x: 0, y: linkLength / 2 },
        pointB: { x: -clawSpread, y: 0 },
      }
    );
    this.world.constraints.items.set(rightConstraint.id, rightConstraint);

    addComponent(this.world, rightHingeEid, ConstraintRef);
    ConstraintRef.constraintId[rightHingeEid] = rightConstraint.id;
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
      this.matter
    );

    // Update UI
    this.drawUI();
  }

  private drawUI(): void {
    this.graphics.clear();

    const { wellLeft, wallWidth, wellTop, wellBottom } = this.world.config;

    // Drop zone highlight
    this.graphics.lineStyle(2, 0x44aa44, 0.5);
    this.graphics.strokeRect(
      0,
      wellTop + 5,
      wellLeft - wallWidth / 2,
      wellBottom - wellTop - wallWidth / 2
    );

    // Instructions background
    this.graphics.fillStyle(0x000000, 0.5);
    this.graphics.fillRect(
      0,
      this.world.config.view.height - 30,
      this.world.config.view.width,
      30
    );
  }
}
