
export enum GameState {
  MENU,
  HELP,
  INTRO,
  PLAYING,
  GAME_OVER,
  VICTORY
}

export enum GameMode {
  STORY,
  ENDLESS
}

export enum PowerupType {
  SPEED = 'SPEED',           // Red
  SNOWBALLS = 'SNOWBALLS',   // Cyan
  BLAST = 'BLAST',           // Gold
  HEALING = 'HEALING',       // Green
  TIME_WARP = 'TIME_WARP'    // Purple (New: Slows time)
}

export interface Entity {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  markedForDeletion: boolean;
}

export interface Player extends Entity {
  vy: number;
  lives: number;
  snowballs: number;
  isInvincible: boolean;
  invincibleTimer: number;
  healingTimer: number;
  speedTimer: number;
  timeWarpTimer: number; // New: Duration of time freeze
  angle: number; 
}

export interface Obstacle extends Entity {
  type: 'TREE' | 'BIRD' | 'SNOWMAN' | 'BUILDING' | 'CLOUD' | 'GEAR' | 'GLITCH_BLOCK';
  rotation?: number; 
}

export interface Landmark extends Entity {
  type: 'CLOCK_TOWER' | 'PORTAL' | 'RUINS' | 'FINAL_CONSTRUCT';
  name: string;
}

export interface Powerup extends Entity {
  type: PowerupType;
  floatOffset: number;
}

export interface Letter extends Entity {
  message: string;
  floatOffset: number;
  isGolden?: boolean; 
  isGlitched?: boolean; // New: Text changes on hover/collect
}

export interface Projectile extends Entity {
  vx: number;
  trail: {x: number, y: number}[]; 
}

export enum ParticleType {
  SNOW,
  SPARKLE,
  DEBRIS,
  SMOKE,
  GLOW,
  SHOCKWAVE,
  FIRE,
  LIFE,
  GLITCH // New: Square digital particles
}

export interface Particle {
  id: number;
  type: ParticleType;
  x: number;
  y: number;
  radius: number;
  vx: number;
  vy: number;
  alpha: number;
  color: string;
  life: number;
  maxLife: number;
  growth: number; 
}

export interface LevelConfig {
  name: string;
  description: string;
  backgroundGradient: [string, string];
  obstacleSpeedMultiplier: number;
  spawnRateMultiplier: number;
  weatherIntensity: number;
  glitchIntensity: number; // 0 to 1, how often screen glitches
}

export interface BackgroundLayer {
  points: number[];
  color: string;
  speedModifier: number;
  offset: number;
}

export interface DialogueLine {
  id: string;
  speaker: 'Santa' | 'Rudolph' | 'Timekeeper' | 'System' | '???';
  text: string;
}