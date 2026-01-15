import { BodyType } from "matter";
import Phaser from "phaser";

type Vec2 = { x: number; y: number };
type Hulls = Vec2[][];

type PhysicsEditorFixture = { vertices: Hulls; isSensor?: boolean };
type PhysicsEditorBodyDef = {
  label?: string;
  isStatic?: boolean;
  density?: number;
  restitution?: number;
  friction?: number;
  frictionAir?: number;
  frictionStatic?: number;
  collisionFilter?: { group?: number; category?: number; mask?: number };
  fixtures: PhysicsEditorFixture[];
};

type PhysicsEditorExport = { generator_info?: string; [k: string]: unknown };

type Origin = { x: number; y: number };
type Scale = { x: number; y: number };

type CreateParams = {
  scene: Phaser.Scene;
  x: number;
  y: number;

  texture: string;
  frame?: string | number;

  shapesJsonKey: string;
  shapeName: string;

  // keep origin at 0.5/0.5 for physics sanity unless you *really* need otherwise
  origin?: Origin;
  scale?: Scale;

  overrides?: Partial<MatterJS.IBodyDefinition>;
};

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null;

const asBodyDef = (v: unknown): PhysicsEditorBodyDef => {
  if (!isRecord(v)) throw new Error("Shape entry is not an object");
  const fixtures = v.fixtures as unknown;
  if (!Array.isArray(fixtures) || fixtures.length === 0)
    throw new Error("No fixtures[] in shape entry");
  return v as unknown as PhysicsEditorBodyDef;
};

const flattenHulls = (def: PhysicsEditorBodyDef): Hulls =>
  def.fixtures.flatMap((f) => f.vertices ?? []);

const toMatterOptions = (
  def: PhysicsEditorBodyDef
): MatterJS.IBodyDefinition => ({
  label: def.label,
  isStatic: def.isStatic,
  density: def.density,
  restitution: def.restitution,
  friction: def.friction,
  frictionAir: def.frictionAir,
  frictionStatic: def.frictionStatic,
  collisionFilter: def.collisionFilter,
});

// Determine the untrimmed “source” size.
// For non-atlas images this is just the image dimensions.
// For atlases, this tries sourceSizeW/H first (trim-aware).
const getSourceSize = (obj: any): { w: number; h: number } => {
  const f = obj.frame;
  if (f) {
    const w = f.sourceSizeW ?? f.sourceWidth ?? f.realWidth ?? f.width;
    const h = f.sourceSizeH ?? f.sourceHeight ?? f.realHeight ?? f.height;
    if (typeof w === "number" && typeof h === "number") return { w, h };
  }

  const src = obj.texture?.getSourceImage?.();
  if (src?.width && src?.height) return { w: src.width, h: src.height };

  // last resort
  if (obj.displayWidth && obj.displayHeight)
    return { w: obj.displayWidth, h: obj.displayHeight };

  throw new Error("Could not determine source size for texture/frame");
};

// Polygon centroid (area-weighted). Works well for convex polygons.
const polygonCentroid = (poly: Vec2[]): Vec2 => {
  let a = 0;
  let cx = 0;
  let cy = 0;

  const n = poly.length;
  for (let i = 0; i < n; i++) {
    const p0 = poly[i];
    const p1 = poly[(i + 1) % n];
    const cross = p0.x * p1.y - p1.x * p0.y;
    a += cross;
    cx += (p0.x + p1.x) * cross;
    cy += (p0.y + p1.y) * cross;
  }

  a *= 0.5;
  if (Math.abs(a) < 1e-8) {
    // fallback: simple average (degenerate/very small area)
    const sx = poly.reduce((s, p) => s + p.x, 0);
    const sy = poly.reduce((s, p) => s + p.y, 0);
    return { x: sx / n, y: sy / n };
  }

  return { x: cx / (6 * a), y: cy / (6 * a) };
};

const transformToLocal = (
  hulls: Hulls,
  sourceW: number,
  sourceH: number,
  origin: Origin,
  scale: Scale
): Hulls => {
  const ox = 0; //sourceW * origin.x;
  const oy = 0; //sourceH * origin.y;

  return hulls.map((poly) =>
    poly.map((p) => ({
      x: (p.x - ox) * scale.x,
      y: (p.y - oy) * scale.y,
    }))
  );
};

// Build compound while preserving per-hull offsets.
const buildCompoundPreservingOffsets = (
  x: number,
  y: number,
  hullsLocal: Hulls,
  options: MatterJS.IBodyDefinition
): MatterJS.BodyType => {
  const MatterLib = Phaser.Physics.Matter.Matter;
  const { Bodies, Body } = MatterLib;

  // Create each part centered at its own centroid, then translate to centroid position
  const parts: MatterJS.BodyType[] = hullsLocal.map((poly) => {
    const c = polygonCentroid(poly);
    const centered = poly.map((p) => ({ x: p.x - c.x, y: p.y - c.y }));

    const part = Bodies.fromVertices(
      0,
      0,
      centered as unknown as MatterJS.Vector[],
      {},
      true
    );
    Body.translate(part, c); // restore the intended offset in compound-local space
    return part;
  });

  // Base part helps Matter be happy about compound structure
  const base = Bodies.rectangle(0, 0, 1, 1, { isSensor: true });

  const compound = Body.create({
    ...options,
    parts: [base, ...parts],
  }) as BodyType;

  // Normalize: move compound COM to (0,0) in local space so sprite origin and body align
  Body.translate(compound, {
    x: -compound.position.x,
    y: -compound.position.y,
  });

  // Finally place in world at (x,y)
  Body.setPosition(compound, { x, y });

  return compound;
};

export function createSprite(params: CreateParams) {
  const {
    scene,
    x,
    y,
    texture,
    frame,
    shapesJsonKey,
    shapeName,
    origin = { x: 0.5, y: 0.5 },
    scale = { x: 1, y: 1 },
    overrides = {},
  } = params;

  const raw = scene.cache.json.get(shapesJsonKey) as
    | PhysicsEditorExport
    | undefined;
  if (!raw) throw new Error(`Missing JSON in cache: "${shapesJsonKey}"`);

  const entry = (raw as Record<string, unknown>)[shapeName];
  if (!entry) throw new Error(`No shape "${shapeName}" in "${shapesJsonKey}"`);

  const def = asBodyDef(entry);
  const hulls = flattenHulls(def);

  // Create the render object (Image for no-atlas, Sprite for atlas)
  const obj =
    frame === undefined
      ? scene.matter.add.image(x, y, texture)
      : scene.matter.add.sprite(x, y, texture, frame);

  // Keep origin consistent. (Non-0.5 origins with physics are possible but not worth the pain.)
  obj.setOrigin(origin.x, origin.y);
  obj.setScale(scale.x, scale.y);

  // Transform vertices using *source* (untrimmed) size
  const { w: sourceW, h: sourceH } = getSourceSize(obj);
  const hullsLocal = transformToLocal(hulls, sourceW, sourceH, origin, scale);

  const options: MatterJS.IBodyDefinition = {
    ...toMatterOptions(def),
    ...overrides,
  };

  const body = buildCompoundPreservingOffsets(x, y, hullsLocal, options);

  // Attach: body is already positioned to (x,y) with COM normalized
  obj.setExistingBody(body);
  obj.setPosition(x, y);

  return obj;
}

export const peFactory = {
  createSprite,
};
