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
  const { wellLeft, wellRight, wellTop, wellBottom, dropZoneWidth, width } =
    world.config;

  const wallOptions = {
    isStatic: true,
    friction: 0.3,
    restitution: 0.2,
    label: "wall",
  };

  // Basin floor
  const floor = matter.add.rectangle(
    (wellLeft + wellRight) / 2,
    wellBottom,
    wellRight - wellLeft,
    20,
    wallOptions
  );
  registerBody(world, floor, wellLeft + (wellRight - wellLeft) / 2, wellBottom);
  createWall(world, floor.position.x, floor.position.y, floor.id);

  // Basin left wall
  const leftWall = matter.add.rectangle(
    wellLeft,
    (wellTop + wellBottom) / 2,
    20,
    wellBottom - wellTop + 20,
    wallOptions
  );
  registerBody(world, leftWall, wellLeft, (wellTop + wellBottom) / 2);
  createWall(world, leftWall.position.x, leftWall.position.y, leftWall.id);

  // Basin right wall
  const rightWall = matter.add.rectangle(
    wellRight,
    (wellTop + wellBottom) / 2,
    20,
    wellBottom - wellTop + 20,
    wallOptions
  );
  registerBody(world, rightWall, wellRight, (wellTop + wellBottom) / 2);
  createWall(world, rightWall.position.x, rightWall.position.y, rightWall.id);

  // Drop zone floor
  const dropFloor = matter.add.rectangle(
    dropZoneWidth / 2,
    wellBottom,
    dropZoneWidth,
    20,
    { ...wallOptions, label: "dropzone" }
  );
  registerBody(world, dropFloor, dropZoneWidth / 2, wellBottom);
  createWall(world, dropFloor.position.x, dropFloor.position.y, dropFloor.id);

  // Drop zone left wall
  const dropLeftWall = matter.add.rectangle(
    10,
    (wellTop + wellBottom) / 2,
    20,
    wellBottom - wellTop + 20,
    wallOptions
  );
  registerBody(world, dropLeftWall, 10, (wellTop + wellBottom) / 2);
  createWall(
    world,
    dropLeftWall.position.x,
    dropLeftWall.position.y,
    dropLeftWall.id
  );

  // Separator (partial wall)
  const separator = matter.add.rectangle(
    dropZoneWidth + 10,
    wellBottom - 80,
    20,
    180,
    wallOptions
  );
  registerBody(world, separator, dropZoneWidth + 10, wellBottom - 80);
  createWall(world, separator.position.x, separator.position.y, separator.id);
};

export const createClawPhysics = (
  matter: Phaser.Physics.Matter.MatterPhysics,
  world: GameWorld
): void => {
  const {
    trolleyY,
    wellLeft,
    wellRight,
    ropeLinks,
    linkLength,
    clawRadius,
    clawSpread,
  } = world.config;
  const trolleyX = (wellLeft + wellRight) / 2;

  // Create trolley (kinematic - we control it directly)
  const trolleyBody = matter.add.rectangle(trolleyX, trolleyY, 60, 20, {
    isStatic: true,
    label: "trolley",
  });
  registerBody(world, trolleyBody, trolleyX, trolleyY);
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
    registerBody(world, link, trolleyX, linkY);
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
  registerBody(world, leftHinge, trolleyX - clawSpread, hingeY);

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
  registerBody(world, rightHinge, trolleyX + clawSpread, hingeY);

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
  const { wellLeft, wellRight, wellBottom } = world.config;

  for (let i = 0; i < count; i++) {
    const sides = 4 + Math.floor(Math.random() * 3); // 4, 5, or 6 sides
    const radius = 15 + Math.random() * 15;
    const x = wellLeft + 40 + Math.random() * (wellRight - wellLeft - 80);
    const y = wellBottom - 60 - Math.random() * 200;

    const toy = matter.add.polygon(x, y, sides, radius, {
      friction: 0.5,
      restitution: 0.3,
      density: 0.002,
      label: `toy-${i}`,
    });
    registerBody(world, toy, x, y);
    createToy(world, x, y, sides, toy.id);
  }
};

const registerBody = (
  world: GameWorld,
  body: MatterJS.BodyType,
  _x: number,
  _y: number
): void => {
  world.physics.bodies.set(body.id, body);
};

const registerConstraint = (
  world: GameWorld,
  constraint: MatterJS.ConstraintType
): void => {
  world.constraints.items.set(constraint.id, constraint);
};
