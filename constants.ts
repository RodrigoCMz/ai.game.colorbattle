import { ToolType, ToolConfig, PlayerId } from './types';

// Grid Dimensions (Low res for retro feel and performance)
export const GRID_W = 80;
export const GRID_H = 45;
export const CELL_SIZE = 12; // Render size multiplier if needed, though we fit to screen

// Game Settings
export const GAME_DURATION = 180; // 3 minutes
export const FPS = 60;
export const ENERGY_RECHARGE_RATE = 1; // Per second
export const MAX_ENERGY = 10;
export const INITIAL_ENERGY = 0;

// Colors
export const COLORS = {
  [PlayerId.P1]: '#ef4444', // Red-500
  [PlayerId.P2]: '#3b82f6', // Blue-500
  GRID_P1: 1,
  GRID_P2: 2,
};

export const TOOLS: Record<ToolType, ToolConfig> = {
  [ToolType.CANNON]: {
    id: ToolType.CANNON,
    name: 'Cannon',
    cost: 4,
    description: 'Fires ink balls. HP: 3',
    icon: 'Bomb', // Represents Cannon ball/explosive
    cooldown: 90, // 1.5s
    hp: 3,
  },
  [ToolType.MACHINE_GUN]: {
    id: ToolType.MACHINE_GUN,
    name: 'Machine Gun',
    cost: 5,
    description: 'Rapid fire. HP: 4',
    icon: 'Crosshair', // Represents targeting/shooting
    cooldown: 10, // Fast fire
    hp: 4,
  },
  [ToolType.METEOR]: {
    id: ToolType.METEOR,
    name: 'Meteor',
    cost: 6,
    description: 'Impact Dmg: 6. Any location.',
    icon: 'Flame',
    cooldown: 200,
    hp: 0,
  },
  [ToolType.TANK]: {
    id: ToolType.TANK,
    name: 'Battle Tank',
    cost: 3,
    description: 'Mobile sprayer. HP: 5',
    icon: 'Shield', // Represents armor/tank
    cooldown: 5, // Spray rate
    hp: 5,
  },
};