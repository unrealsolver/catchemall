# Scaffolding

- Bun runtime
- Phaser engine (web canvas)
- Matter.js for phisics
- Minimal recommended files structure scaffold
- lint-staged with prettier running on commit

# Idea

The game is a single scene that emulates Claw Machine in 2d.

# Requirements

- Arrow keys to move claw right / left
- Space to initiate catching sequence
- The rope should have 32 links
- The claw should be a symmetrical pair of cirlces, that represent hinges. These are the only phisically interactive objects here.
- Claw closing is interpolated as moving of these circular boundries toward each other
- the claw moves down until rope ends
- the rope length is equal of well depth
- The drop area is on the left
- The basin with toys constrained with walls
- The toy objects should be mix of convex n-grams (4 to 6)

# Technical requirements

- Use TypeScript
- Use types not interfaces
- Prefer functional code patterns
- Avoid classes as a mild requirement
- Avoid TS decorators
- Do not write any tests
- Use bitECS for Entity Component System architecture
  - Components store data in typed arrays
  - Systems are pure functions that query and process entities
  - Decouple physics, rendering, and game logic

# Phases

## 1. Gameplay prototype

The game does not have sprites or any graphics, just line-art and debug view.
Gameplay is functional.
