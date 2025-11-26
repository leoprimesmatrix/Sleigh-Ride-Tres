
import { LevelConfig, PowerupType, DialogueLine } from './types.ts';

export const CANVAS_WIDTH = 1200;
export const CANVAS_HEIGHT = 600;
export const GRAVITY = 0.4;
export const JUMP_STRENGTH = -8;
export const FLIGHT_LIFT = -0.5;
export const BASE_SPEED = 5;

// Powerup Colors
export const POWERUP_COLORS: Record<PowerupType, string> = {
  [PowerupType.SPEED]: '#ef4444', 
  [PowerupType.SNOWBALLS]: '#06b6d4', 
  [PowerupType.BLAST]: '#eab308', 
  [PowerupType.HEALING]: '#22c55e', 
  [PowerupType.TIME_WARP]: '#a855f7', // Purple
};

// 5-Act Structure Thresholds (0% -> 100%)
export const LEVEL_THRESHOLDS = [0, 20, 50, 75, 95];

export const LEVELS: LevelConfig[] = [
  {
    name: "Echoes of North Pole", // Act I
    description: "Something feels... off. The snow is falling upwards.",
    backgroundGradient: ['#1e3a8a', '#172554'], 
    obstacleSpeedMultiplier: 1.0,
    spawnRateMultiplier: 1.0,
    weatherIntensity: 1,
    glitchIntensity: 0.05
  },
  {
    name: "The Clockwork Sky", // Act II
    description: "Massive gears turn in the heavens. Time is leaking.",
    backgroundGradient: ['#3f3f46', '#52525b'], // Zinc/Industrial
    obstacleSpeedMultiplier: 1.1,
    spawnRateMultiplier: 1.2,
    weatherIntensity: 2,
    glitchIntensity: 0.1
  },
  {
    name: "Fractured Reality", // Act III
    description: "The world is breaking apart. Don't touch the voids.",
    backgroundGradient: ['#2e1065', '#4c1d95'], // Deep Purple
    obstacleSpeedMultiplier: 1.3,
    spawnRateMultiplier: 1.3,
    weatherIntensity: 4,
    glitchIntensity: 0.3
  },
  {
    name: "The Timekeeper's Fortress", // Act IV
    description: "He is trying to rewrite history. Stop him.",
    backgroundGradient: ['#000000', '#be123c'], // Red/Black
    obstacleSpeedMultiplier: 1.6,
    spawnRateMultiplier: 1.5,
    weatherIntensity: 0,
    glitchIntensity: 0.5
  },
  {
    name: "The Event Horizon", // Act V
    description: "The end of time.",
    backgroundGradient: ['#ffffff', '#e2e8f0'], // Blinding White
    obstacleSpeedMultiplier: 0, 
    spawnRateMultiplier: 0,
    weatherIntensity: 20,
    glitchIntensity: 0.8
  }
];

export const TOTAL_GAME_TIME_SECONDS = 720; 
export const VICTORY_DISTANCE = 300000; // Longer game for epic feel

// --- Narrative Content ---

export const WISHES = [
  "I don't remember Christmas...",
  "Why is the calendar blank?",
  "I wish I could remember my childhood.",
  "Did we used to have a holiday?",
  "The clock hasn't moved in days.",
  "I saw a man with a red suit in my dreams.",
  "Where did the magic go?",
  "System Error: Joy not found."
];

export const NARRATIVE_LETTERS = [
    { progress: 0.15, message: "ALERT: Chronal anomaly detected in Sector 4. Proceed with caution." },
    { progress: 0.45, message: "To whoever finds this: The Timekeeper lied. Order is not peace." },
    { progress: 0.80, message: "Santa... if you can hear this... we haven't forgotten you yet." }
];

export const STORY_MOMENTS: { progress: number; dialogue: DialogueLine }[] = [
  // Act I
  { progress: 0.01, dialogue: { id: 'act1_start', speaker: 'Rudolph', text: "Santa! The sky... it's glitching! What is happening to the North Pole?" } },
  { progress: 0.05, dialogue: { id: 'act1_santa', speaker: 'Santa', text: "The flow of time is turbulent. Hold steady, old friend." } },
  
  // Act II
  { progress: 0.20, dialogue: { id: 'act2_intro', speaker: 'Timekeeper', text: "Anomaly detected. Subject: Santa Claus. Status: Obsolete." } },
  { progress: 0.25, dialogue: { id: 'act2_santa', speaker: 'Santa', text: "Who are you? Why are you twisting the world like this?" } },
  
  // Act III
  { progress: 0.50, dialogue: { id: 'act3_tk', speaker: 'Timekeeper', text: "Magic is chaotic. Inefficient. I am bringing perfect order." } },
  { progress: 0.55, dialogue: { id: 'act3_rudolph', speaker: 'Rudolph', text: "Inefficient?! It's Joy! It's Hope! You can't just delete it!" } },

  // Act IV
  { progress: 0.75, dialogue: { id: 'act4_tk', speaker: 'Timekeeper', text: "Resistance is futile. History is being overwritten. Goodbye, Claus." } },
  { progress: 0.80, dialogue: { id: 'act4_santa', speaker: 'Santa', text: "History isn't written in ink, Timekeeper. It's written in the heart!" } },

  // Act V
  { progress: 0.95, dialogue: { id: 'act5_finale', speaker: 'Rudolph', text: "We're breaking through! The barrier is shattering!" } },
  { progress: 0.98, dialogue: { id: 'act5_santa', speaker: 'Santa', text: "NOW! Unleash everything we have!" } }
];

export const LANDMARKS = [
    { progress: 0.25, type: 'CLOCK_TOWER', name: "The Infinite Clock" },
    { progress: 0.55, type: 'RUINS', name: "Ruins of Tomorrow" },
    { progress: 0.99, type: 'FINAL_CONSTRUCT', name: "The Temporal Core" }
] as const;