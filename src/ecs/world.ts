import { createWorld, addEntity, addComponent, World } from "bitecs";
import {
  Position,
  Rotation,
  PhysicsBody,
  Trolley,
  RopeLink,
  ClawHinge,
  ClawController,
  Toy,
  Wall,
  HingeConstraint,
} from "./components";

export type GameConfig = {
  width: number;
  height: number;
  wellLeft: number;
  wellRight: number;
  wellTop: number;
  wellBottom: number;
  dropZoneWidth: number;
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
    width: 800,
    height: 600,
    wellLeft: 160,
    wellRight: 780,
    wellTop: 80,
    wellBottom: 580,
    dropZoneWidth: 140,
    trolleyY: 50,
    ropeLinks: 32,
    linkLength: 12,
    clawRadius: 12,
    clawSpread: 35,
    trolleySpeed: 4,
  };
  return world;
};

export const createTrolley = (
  world: GameWorld,
  x: number,
  y: number,
  bodyId: number
): number => {
  const eid = addEntity(world);
  addComponent(world, eid, Position);
  addComponent(world, eid, PhysicsBody);
  addComponent(world, eid, Trolley);
  addComponent(world, eid, ClawController);

  Position.x[eid] = x;
  Position.y[eid] = y;
  PhysicsBody.bodyId[eid] = bodyId;
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
  index: number,
  bodyId: number
): number => {
  const eid = addEntity(world);
  addComponent(world, eid, Position);
  addComponent(world, eid, Rotation);
  addComponent(world, eid, PhysicsBody);
  addComponent(world, eid, RopeLink);

  Position.x[eid] = x;
  Position.y[eid] = y;
  Rotation.angle[eid] = 0;
  PhysicsBody.bodyId[eid] = bodyId;
  RopeLink.index[eid] = index;

  return eid;
};

export const createClawHinge = (
  world: GameWorld,
  x: number,
  y: number,
  side: -1 | 1,
  bodyId: number,
  constraintId: number
): number => {
  const eid = addEntity(world);
  addComponent(world, eid, Position);
  addComponent(world, eid, PhysicsBody);
  addComponent(world, eid, ClawHinge);
  addComponent(world, eid, HingeConstraint);

  Position.x[eid] = x;
  Position.y[eid] = y;
  PhysicsBody.bodyId[eid] = bodyId;
  ClawHinge.side[eid] = side;
  HingeConstraint.constraintId[eid] = constraintId;

  return eid;
};

export const createToy = (
  world: GameWorld,
  x: number,
  y: number,
  sides: number,
  bodyId: number
): number => {
  const eid = addEntity(world);
  addComponent(world, eid, Position);
  addComponent(world, eid, Rotation);
  addComponent(world, eid, PhysicsBody);
  addComponent(world, eid, Toy);

  Position.x[eid] = x;
  Position.y[eid] = y;
  Rotation.angle[eid] = 0;
  PhysicsBody.bodyId[eid] = bodyId;
  Toy.sides[eid] = sides;

  return eid;
};

export const createWall = (
  world: GameWorld,
  x: number,
  y: number,
  bodyId: number
): number => {
  const eid = addEntity(world);
  addComponent(world, eid, Position);
  addComponent(world, eid, PhysicsBody);
  addComponent(world, eid, Wall);

  Position.x[eid] = x;
  Position.y[eid] = y;
  PhysicsBody.bodyId[eid] = bodyId;

  return eid;
};
