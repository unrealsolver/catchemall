// bitECS v0.4 uses plain objects with typed arrays for components
// Components are defined as SoA (Structure of Arrays) for cache efficiency

const MAX_ENTITIES = 1000;

// Position component
export const Position = {
  x: new Float32Array(MAX_ENTITIES),
  y: new Float32Array(MAX_ENTITIES),
};

// Rotation component
export const Rotation = {
  angle: new Float32Array(MAX_ENTITIES),
};

// Physics body reference - links to Matter.js body
export const PhysicsBody = {
  bodyId: new Uint32Array(MAX_ENTITIES),
};

// Tag components (empty objects work as tags)
export const Trolley = {};
export const Wall = {};

// Rope link with index
export const RopeLink = {
  index: new Uint8Array(MAX_ENTITIES),
};

// Claw hinge with side indicator
export const ClawHinge = {
  side: new Int8Array(MAX_ENTITIES), // -1 = left, 1 = right
};

// Toy with polygon sides
export const Toy = {
  sides: new Uint8Array(MAX_ENTITIES),
};

// Claw controller state
export const ClawController = {
  isDescending: new Uint8Array(MAX_ENTITIES),
  isAscending: new Uint8Array(MAX_ENTITIES),
  isOpen: new Uint8Array(MAX_ENTITIES),
  clawSpread: new Float32Array(MAX_ENTITIES),
};

// Hinge constraint reference
export const HingeConstraint = {
  constraintId: new Uint32Array(MAX_ENTITIES),
};
