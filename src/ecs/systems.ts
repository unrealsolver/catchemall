import Phaser from "phaser";
import { query, hasComponent, addComponent } from "bitecs";
import {
  Transform,
  Collider,
  ShapeType,
  PhysicsRef,
  Trolley,
  RopeLink,
  ClawHinge,
  ClawController,
  ConstraintRef,
} from "./components";
import { GameWorld } from "./world";

type MatterPhysics = Phaser.Physics.Matter.MatterPhysics;

// Spawn Matter.js bodies from Collider component
export const physicsSpawnSystem = (
  world: GameWorld,
  matter: MatterPhysics
): void => {
  const entities = query(world, [Collider, Transform]);

  for (const eid of entities) {
    // Skip if already has physics body
    if (hasComponent(world, eid, PhysicsRef)) continue;

    const shapeType = Collider.shapeType[eid];
    if (shapeType === ShapeType.NONE) continue;

    const x = Transform.x[eid];
    const y = Transform.y[eid];

    const options = {
      isStatic: Collider.isStatic[eid] === 1,
      friction: Collider.friction[eid],
      restitution: Collider.restitution[eid],
      density: Collider.density[eid],
    };

    let body: MatterJS.BodyType;

    switch (shapeType) {
      case ShapeType.RECTANGLE:
        body = matter.add.rectangle(
          x,
          y,
          Collider.width[eid],
          Collider.height[eid],
          options
        );
        break;
      case ShapeType.CIRCLE:
        body = matter.add.circle(x, y, Collider.width[eid], options);
        break;
      case ShapeType.POLYGON:
        body = matter.add.polygon(
          x,
          y,
          Collider.sides[eid],
          Collider.width[eid],
          options
        );
        break;
      default:
        continue;
    }

    // Register body and add PhysicsRef
    world.physics.bodies.set(body.id, body);
    addComponent(world, eid, PhysicsRef);
    PhysicsRef.bodyId[eid] = body.id;
  }
};

// Sync Transform from Matter.js bodies (Matter is source of truth)
export const physicsSyncSystem = (world: GameWorld): void => {
  const entities = query(world, [Transform, PhysicsRef]);

  for (const eid of entities) {
    const body = world.physics.bodies.get(PhysicsRef.bodyId[eid]);
    if (body) {
      Transform.x[eid] = body.position.x;
      Transform.y[eid] = body.position.y;
      Transform.rotation[eid] = body.angle;
    }
  }
};

// Handle trolley horizontal movement
export const trolleyMovementSystem = (
  world: GameWorld,
  leftPressed: boolean,
  rightPressed: boolean,
  matter: MatterPhysics
): void => {
  const entities = query(world, [
    Trolley,
    Transform,
    PhysicsRef,
    ClawController,
  ]);
  const { trolleySpeed, wellLeft, clawSpread } = world.config;

  for (const eid of entities) {
    const body = world.physics.bodies.get(PhysicsRef.bodyId[eid]);
    if (!body) continue;

    const isDescending = ClawController.isDescending[eid] === 1;
    const isAscending = ClawController.isAscending[eid] === 1;

    // Only allow movement when not in catching sequence
    if (!isDescending && !isAscending) {
      let dx = 0;
      if (leftPressed) dx -= trolleySpeed;
      if (rightPressed) dx += trolleySpeed;

      const newX = body.position.x + dx;
      const minX = wellLeft + clawSpread + 20;
      const maxX = world.config.view.width - clawSpread - 20;

      if (newX >= minX && newX <= maxX) {
        matter.body.setPosition(body, {
          x: newX,
          y: body.position.y,
        });
      }
    }
  }
};

// Handle claw descent/ascent
export const clawSequenceSystem = (
  world: GameWorld,
  actionPressed: boolean
): void => {
  const trolleyEntities = query(world, [Trolley, PhysicsRef, ClawController]);
  const ropeEntities = query(world, [RopeLink, Transform, PhysicsRef]);

  for (const eid of trolleyEntities) {
    const isDescending = ClawController.isDescending[eid] === 1;
    const isAscending = ClawController.isAscending[eid] === 1;

    // Start descent on action press when idle
    if (actionPressed && !isDescending && !isAscending) {
      ClawController.isDescending[eid] = 1;
    }

    // Find the last rope link to check depth
    let lastLinkY = 0;
    for (const ropeEid of ropeEntities) {
      if (RopeLink.index[ropeEid] === world.config.ropeLinks - 1) {
        lastLinkY = Transform.y[ropeEid];
        break;
      }
    }

    // Descending: check if reached bottom
    if (isDescending) {
      if (lastLinkY >= world.config.wellBottom - 50) {
        ClawController.isDescending[eid] = 0;
        ClawController.isAscending[eid] = 1;
        ClawController.isOpen[eid] = 0; // Close claw
      }
    }

    // Ascending: check if reached top
    if (isAscending) {
      if (lastLinkY <= world.config.trolleyY + 80) {
        ClawController.isAscending[eid] = 0;
        ClawController.isOpen[eid] = 1; // Open claw
      }
    }
  }
};

// Update claw hinge positions based on open/closed state
export const clawHingeSystem = (world: GameWorld): void => {
  const trolleyEntities = query(world, [Trolley, ClawController]);
  const hingeEntities = query(world, [ClawHinge, PhysicsRef, ConstraintRef]);

  for (const trolleyEid of trolleyEntities) {
    const isOpen = ClawController.isOpen[trolleyEid] === 1;
    const targetSpread = isOpen ? world.config.clawSpread : 5;
    const currentSpread = ClawController.clawSpread[trolleyEid];

    // Interpolate spread
    const newSpread = currentSpread + (targetSpread - currentSpread) * 0.1;
    ClawController.clawSpread[trolleyEid] = newSpread;

    // Update hinge constraint positions
    for (const hingeEid of hingeEntities) {
      const side = ClawHinge.side[hingeEid];
      const constraintId = ConstraintRef.constraintId[hingeEid];
      const constraint = world.constraints.items.get(constraintId);

      if (constraint) {
        constraint.pointB = { x: side * newSpread, y: 0 };
      }
    }
  }
};

// Main update function that runs all systems
export const runGameSystems = (
  world: GameWorld,
  leftPressed: boolean,
  rightPressed: boolean,
  actionPressed: boolean,
  matter: MatterPhysics
): void => {
  physicsSyncSystem(world);
  trolleyMovementSystem(world, leftPressed, rightPressed, matter);
  clawSequenceSystem(world, actionPressed);
  clawHingeSystem(world);
};
