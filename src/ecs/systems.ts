import Phaser from "phaser";
import { query } from "bitecs";
import {
  Position,
  Rotation,
  PhysicsBody,
  Trolley,
  RopeLink,
  ClawHinge,
  ClawController,
  HingeConstraint,
} from "./components";
import { GameWorld } from "./world";

type MatterPhysics = Phaser.Physics.Matter.MatterPhysics;

// Sync physics bodies to ECS position/rotation
export const physicsToEcsSystem = (world: GameWorld): void => {
  const entities = query(world, [Position, PhysicsBody]);
  for (const eid of entities) {
    const bodyId = PhysicsBody.bodyId[eid];
    const body = world.physics.bodies.get(bodyId);
    if (body) {
      Position.x[eid] = body.position.x;
      Position.y[eid] = body.position.y;
    }
  }

  const rotatingEntities = query(world, [Rotation, PhysicsBody]);
  for (const eid of rotatingEntities) {
    const bodyId = PhysicsBody.bodyId[eid];
    const body = world.physics.bodies.get(bodyId);
    if (body) {
      Rotation.angle[eid] = body.angle;
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
    Position,
    PhysicsBody,
    ClawController,
  ]);
  const { trolleySpeed, wellLeft, wellRight, clawSpread } = world.config;

  for (const eid of entities) {
    const bodyId = PhysicsBody.bodyId[eid];
    const body = world.physics.bodies.get(bodyId);
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
      const maxX = wellRight - clawSpread - 20;

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
  actionPressed: boolean,
  matter: MatterPhysics
): void => {
  const trolleyEntities = query(world, [Trolley, PhysicsBody, ClawController]);
  const ropeEntities = query(world, [RopeLink, Position, PhysicsBody]);

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
        lastLinkY = Position.y[ropeEid];
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
export const clawHingeSystem = (
  world: GameWorld,
  matter: MatterPhysics
): void => {
  const trolleyEntities = query(world, [Trolley, ClawController]);
  const hingeEntities = query(world, [ClawHinge, PhysicsBody, HingeConstraint]);

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
      const constraintId = HingeConstraint.constraintId[hingeEid];
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
  physicsToEcsSystem(world);
  trolleyMovementSystem(world, leftPressed, rightPressed, matter);
  clawSequenceSystem(world, actionPressed, matter);
  clawHingeSystem(world, matter);
};
