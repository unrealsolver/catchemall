export type ViewConfig = {
  width: number;
  height: number;
};

export type WellConfig = {
  left: number;
  top: number;
  bottom: number;
  wallWidth: number;
};

export type TrolleyConfig = {
  y: number;
  speed: number;
};

export type ClawConfig = {
  ropeLinks: number;
  linkLength: number;
  hingeRadius: number;
  spread: number;
};

export type GameConfig = {
  view: ViewConfig;
  well: WellConfig;
  trolley: TrolleyConfig;
  claw: ClawConfig;
};

export const createGameConfig = (): GameConfig => ({
  view: { width: 800, height: 600 },
  well: {
    left: 160,
    top: 80,
    bottom: 580,
    wallWidth: 20,
  },
  trolley: {
    y: 50,
    speed: 4,
  },
  claw: {
    ropeLinks: 12,
    linkLength: 8,
    hingeRadius: 12,
    spread: 35,
  },
});
