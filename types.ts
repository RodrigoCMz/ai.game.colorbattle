export enum PlayerId {
  P1 = 1,
  P2 = 2,
}

export enum ToolType {
  CANNON = 'CANNON',
  MACHINE_GUN = 'MACHINE_GUN',
  METEOR = 'METEOR',
  TANK = 'TANK',
}

export type PlayerType = 'PLAYER' | 'CPU';

export interface ToolConfig {
  id: ToolType;
  name: string;
  cost: number;
  description: string;
  icon: string;
  cooldown: number; // Frames between shots
  hp: number; // Max Health for units
}

export interface Entity {
  id: number;
  x: number;
  y: number;
  owner: PlayerId;
  markedForDeletion: boolean;
}

export interface Projectile extends Entity {
  vx: number;
  vy: number;
  type: ToolType;
  radius: number;
  bounces: number; // For Machine Gun
  age: number;
  maxAge?: number; // For Meteor fuse
}

export interface Unit extends Entity {
  type: ToolType;
  hp: number;
  maxHp: number;
  cooldownTimer: number;
  moveDir: number; // 1 or -1
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
}

export interface GameState {
  grid: number[][]; // 0=Empty(Unused), 1=P1, 2=P2
  p1Energy: number;
  p2Energy: number;
  timeRemaining: number; // Seconds
  winner: PlayerId | null;
  isRunning: boolean;
}