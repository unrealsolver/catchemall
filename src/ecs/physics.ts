import Phaser from "phaser";
import {
  GameWorld,
  createTrolley,
  createRopeLink,
  createClawHinge,
  createToy,
  createWall,
} from "./world";

let bodyIdCounter = 1;
let constraintIdCounter = 1;

const nextBodyId = () => bodyIdCounter++;
const nextConstraintId = () => constraintIdCounter++;

export const createArenaPhysics = (
  matter: Phaser.Physics.Matter.MatterPhysics,
  world: GameWorld
): void => {
  const { wellLeft, wallWidth, wellTop, wellBottom } = world.config;

  const wallOptions = {
    isStatic: true,
    friction: 0.3,
    restitution: 0.2,
    label: "wall",
  };

  // Basin floor
  const floor = matter.add.rectangle(
    world.config.view.width / 2,
    wellBottom,
    world.config.view.width + wallWidth * 2,
    wallWidth,
    wallOptions
  );
  createWall(world, floor);

  // Basin left wall
  const leftWall = matter.add.rectangle(
    wellLeft,
    (wellTop + wellBottom) / 2,
    20,
    wellBottom - wellTop + 20,
    wallOptions
  );
  createWall(world, leftWall);

  // Basin right wall
  const rightWall = matter.add.rectangle(
    world.config.view.width + wallWidth / 2,
    (wellTop + wellBottom) / 2,
    wallWidth,
    wellBottom - wellTop + 20,
    wallOptions
  );
  createWall(world, rightWall);

  // Drop zone left wall
  const dropLeftWall = matter.add.rectangle(
    -wallWidth,
    (wellTop + wellBottom) / 2,
    wallWidth,
    wellBottom - wellTop + 20,
    wallOptions
  );
  createWall(world, dropLeftWall);
};

export const createClawPhysics = (
  matter: Phaser.Physics.Matter.MatterPhysics,
  world: GameWorld
): void => {
  const { trolleyY, wellLeft, ropeLinks, linkLength, clawRadius, clawSpread } =
    world.config;
  const trolleyX = (wellLeft + world.config.view.width) / 2;

  // Create trolley (kinematic - we control it directly)
  const trolleyBody = matter.add.rectangle(trolleyX, trolleyY, 60, 20, {
    isStatic: true,
    label: "trolley",
  });
  registerBody(world, trolleyBody);
  const trolleyEid = createTrolley(world, trolleyX, trolleyY, trolleyBody.id);

  // Create rope links
  const links: MatterJS.BodyType[] = [];
  let prevBody: MatterJS.BodyType = trolleyBody;

  for (let i = 0; i < ropeLinks; i++) {
    const linkY = trolleyY + 20 + i * linkLength;
    const link = matter.add.rectangle(trolleyX, linkY, 4, linkLength, {
      friction: 0.1,
      frictionAir: 0.02,
      density: 0.001,
      label: `rope-${i}`,
    });
    registerBody(world, link);
    createRopeLink(world, trolleyX, linkY, i, link.id);
    links.push(link);

    // Connect to previous link
    const constraint = matter.add.constraint(
      prevBody,
      link,
      linkLength * 0.5,
      0.9,
      {
        pointA: { x: 0, y: i === 0 ? 10 : linkLength / 2 },
        pointB: { x: 0, y: -linkLength / 2 },
        damping: 0.1,
      }
    );
    registerConstraint(world, constraint);

    prevBody = link;
  }

  // Create claw hinges at the end of the rope
  const lastLink = links[links.length - 1];
  const hingeY = lastLink.position.y + linkLength / 2 + clawRadius;

  // Left hinge
  const leftHinge = matter.add.circle(
    trolleyX - clawSpread,
    hingeY,
    clawRadius,
    {
      friction: 0.8,
      restitution: 0.1,
      density: 0.002,
      label: "claw-left",
    }
  );
  registerBody(world, leftHinge);

  const leftConstraint = matter.add.constraint(lastLink, leftHinge, 0, 0.8, {
    pointA: { x: 0, y: linkLength / 2 },
    pointB: { x: clawSpread, y: 0 },
  });
  registerConstraint(world, leftConstraint);
  createClawHinge(
    world,
    leftHinge.position.x,
    leftHinge.position.y,
    -1,
    leftHinge.id,
    leftConstraint.id
  );

  // Right hinge
  const rightHinge = matter.add.circle(
    trolleyX + clawSpread,
    hingeY,
    clawRadius,
    {
      friction: 0.8,
      restitution: 0.1,
      density: 0.002,
      label: "claw-right",
    }
  );
  registerBody(world, rightHinge);

  const rightConstraint = matter.add.constraint(lastLink, rightHinge, 0, 0.8, {
    pointA: { x: 0, y: linkLength / 2 },
    pointB: { x: -clawSpread, y: 0 },
  });
  registerConstraint(world, rightConstraint);
  createClawHinge(
    world,
    rightHinge.position.x,
    rightHinge.position.y,
    1,
    rightHinge.id,
    rightConstraint.id
  );
};

export const createToyPhysics = (
  matter: Phaser.Physics.Matter.MatterPhysics,
  world: GameWorld,
  count: number
): void => {
  const { wellLeft, wellBottom } = world.config;

  for (let i = 0; i < count; i++) {
    const sides = 4 + Math.floor(Math.random() * 3); // 4, 5, or 6 sides
    const radius = 15 + Math.random() * 15;
    const x =
      wellLeft + 40 + Math.random() * (world.config.view.width - wellLeft - 80);
    const y = wellBottom - 60 - Math.random() * 200;

    const toy = matter.add.polygon(x, y, sides, radius, {
      friction: 0.5,
      restitution: 0.3,
      density: 0.002,
      label: `toy-${i}`,
    });
    registerBody(world, toy);
    createToy(world, x, y, sides, toy.id);
  }
};

const registerBody = (world: GameWorld, body: MatterJS.BodyType): void => {
  world.physics.bodies.set(body.id, body);
};

const registerConstraint = (
  world: GameWorld,
  constraint: MatterJS.ConstraintType
): void => {
  world.constraints.items.set(constraint.id, constraint);
};
