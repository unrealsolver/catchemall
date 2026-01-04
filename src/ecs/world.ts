import { createWorld, addEntity, addComponent, World } from "bitecs";
import {
  Transform,
  Collider,
  ShapeType,
  Trolley,
  RopeLink,
  ClawHinge,
  ClawController,
  Toy,
  Wall,
} from "./components";

export type GameConfig = {
  view: {
    width: number;
    height: number;
  };
  wellLeft: number;
  wellTop: number;
  wellBottom: number;
  wallWidth: number;
  trolleyY: number;
  ropeLinks: number;
  linkLength: number;
  clawRadius: number;
  clawSpread: number;
  trolleySpeed: number;
};

export type GameWorld = World & {
  time: { delta: number; elapsed: number };
  physics: { bodies: Map<number, MatterJS.BodyType> };
  constraints: { items: Map<number, MatterJS.ConstraintType> };
  config: GameConfig;
};

export const createGameWorld = (): GameWorld => {
  const world = createWorld() as GameWorld;
  world.time = { delta: 0, elapsed: 0 };
  world.physics = { bodies: new Map() };
  world.constraints = { items: new Map() };
  world.config = {
    view: {
      width: 800,
      height: 600,
    },
    wallWidth: 20,
    wellLeft: 160,
    wellTop: 80,
    wellBottom: 580,
    trolleyY: 50,
    ropeLinks: 12,
    linkLength: 8,
    clawRadius: 12,
    clawSpread: 35,
    trolleySpeed: 4,
  };
  return world;
};

export const createTrolley = (
  world: GameWorld,
  x: number,
  y: number
): number => {
  const eid = addEntity(world);

  addComponent(world, eid, Transform);
  Transform.x[eid] = x;
  Transform.y[eid] = y;
  Transform.rotation[eid] = 0;

  addComponent(world, eid, Collider);
  Collider.shapeType[eid] = ShapeType.RECTANGLE;
  Collider.width[eid] = 60;
  Collider.height[eid] = 20;
  Collider.isStatic[eid] = 1;
  Collider.friction[eid] = 0.3;
  Collider.restitution[eid] = 0.1;
  Collider.density[eid] = 0.001;

  addComponent(world, eid, Trolley);
  addComponent(world, eid, ClawController);
  ClawController.isDescending[eid] = 0;
  ClawController.isAscending[eid] = 0;
  ClawController.isOpen[eid] = 1;
  ClawController.clawSpread[eid] = world.config.clawSpread;

  return eid;
};

export const createRopeLink = (
  world: GameWorld,
  x: number,
  y: number,
  index: number
): number => {
  const eid = addEntity(world);

  addComponent(world, eid, Transform);
  Transform.x[eid] = x;
  Transform.y[eid] = y;
  Transform.rotation[eid] = 0;

  addComponent(world, eid, Collider);
  Collider.shapeType[eid] = ShapeType.RECTANGLE;
  Collider.width[eid] = 4;
  Collider.height[eid] = world.config.linkLength;
  Collider.isStatic[eid] = 0;
  Collider.friction[eid] = 0.1;
  Collider.restitution[eid] = 0.1;
  Collider.density[eid] = 0.001;

  addComponent(world, eid, RopeLink);
  RopeLink.index[eid] = index;

  return eid;
};

export const createClawHinge = (
  world: GameWorld,
  x: number,
  y: number,
  side: -1 | 1
): number => {
  const eid = addEntity(world);

  addComponent(world, eid, Transform);
  Transform.x[eid] = x;
  Transform.y[eid] = y;
  Transform.rotation[eid] = 0;

  addComponent(world, eid, Collider);
  Collider.shapeType[eid] = ShapeType.CIRCLE;
  Collider.width[eid] = world.config.clawRadius; // radius
  Collider.isStatic[eid] = 0;
  Collider.friction[eid] = 0.8;
  Collider.restitution[eid] = 0.1;
  Collider.density[eid] = 0.002;

  addComponent(world, eid, ClawHinge);
  ClawHinge.side[eid] = side;

  return eid;
};

export const createToy = (
  world: GameWorld,
  x: number,
  y: number,
  sides: number,
  radius: number
): number => {
  const eid = addEntity(world);

  addComponent(world, eid, Transform);
  Transform.x[eid] = x;
  Transform.y[eid] = y;
  Transform.rotation[eid] = 0;

  addComponent(world, eid, Collider);
  Collider.shapeType[eid] = ShapeType.POLYGON;
  Collider.width[eid] = radius;
  Collider.sides[eid] = sides;
  Collider.isStatic[eid] = 0;
  Collider.friction[eid] = 0.5;
  Collider.restitution[eid] = 0.3;
  Collider.density[eid] = 0.002;

  addComponent(world, eid, Toy);
  Toy.sides[eid] = sides;

  return eid;
};

export const createWall = (
  world: GameWorld,
  x: number,
  y: number,
  width: number,
  height: number
): number => {
  const eid = addEntity(world);

  addComponent(world, eid, Transform);
  Transform.x[eid] = x;
  Transform.y[eid] = y;
  Transform.rotation[eid] = 0;

  addComponent(world, eid, Collider);
  Collider.shapeType[eid] = ShapeType.RECTANGLE;
  Collider.width[eid] = width;
  Collider.height[eid] = height;
  Collider.isStatic[eid] = 1;
  Collider.friction[eid] = 0.3;
  Collider.restitution[eid] = 0.2;
  Collider.density[eid] = 0.001;

  addComponent(world, eid, Wall);

  return eid;
};
