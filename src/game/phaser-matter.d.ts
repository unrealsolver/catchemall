/// <reference types="vite/client" />

declare global {
  namespace Phaser.Physics.Matter {
    const Matter: typeof MatterJS;
  }
}

export {};
