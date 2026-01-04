// bitECS v0.4 uses plain objects with typed arrays for components
// Components are defined as SoA (Structure of Arrays) for cache efficiency

const MAX_ENTITIES = 250;

// Shape types for Collider
export const ShapeType = {
  NONE: 0,
  RECTANGLE: 1,
  CIRCLE: 2,
  POLYGON: 3,
} as const;

// Transform component - position and rotation (synced FROM Matter.js)
export const Transform = {
  x: new Float32Array(MAX_ENTITIES),
  y: new Float32Array(MAX_ENTITIES),
  rotation: new Float32Array(MAX_ENTITIES),
};

// Collider component - defines physics shape
export const Collider = {
  shapeType: new Uint8Array(MAX_ENTITIES), // ShapeType enum
  width: new Float32Array(MAX_ENTITIES), // rect width OR circle/polygon radius
  height: new Float32Array(MAX_ENTITIES), // rect height (0 for circle/polygon)
  sides: new Uint8Array(MAX_ENTITIES), // polygon sides (0 for rect/circle)
  isStatic: new Uint8Array(MAX_ENTITIES), // 0 = dynamic, 1 = static
  friction: new Float32Array(MAX_ENTITIES),
  restitution: new Float32Array(MAX_ENTITIES),
  density: new Float32Array(MAX_ENTITIES),
};

// Physics reference - links to Matter.js body (added by PhysicsSpawnSystem)
export const PhysicsRef = {
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

// Constraint reference - links to Matter.js constraint
export const ConstraintRef = {
  constraintId: new Uint32Array(MAX_ENTITIES),
};
