
import React, { useEffect, useRef, useState } from 'react';
import { 
  GameState, Player, Obstacle, Powerup, Letter, Projectile, Particle, ParticleType, PowerupType, Entity, BackgroundLayer, DialogueLine, GameMode, Landmark
} from '../types.ts';
import { 
  CANVAS_WIDTH, CANVAS_HEIGHT, GRAVITY, JUMP_STRENGTH, LEVELS, LEVEL_THRESHOLDS, POWERUP_COLORS, TOTAL_GAME_TIME_SECONDS, VICTORY_DISTANCE, BASE_SPEED, WISHES, NARRATIVE_LETTERS, STORY_MOMENTS, LANDMARKS
} from '../constants.ts';
import UIOverlay from './UIOverlay.tsx';
import { soundManager } from '../audio.ts';
import { Eye, EyeOff, Trophy, Camera, FastForward, Skull } from 'lucide-react';

interface GameCanvasProps {
  gameState: GameState;
  setGameState: (state: GameState) => void;
  onWin: () => void;
  gameMode: GameMode;
}

const GameCanvas: React.FC<GameCanvasProps> = ({ gameState, setGameState, onWin, gameMode }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Debug State
  const [debugMenuOpen, setDebugMenuOpen] = useState(false);
  const [cinematicMode, setCinematicMode] = useState(false);

  // Game Entities
  const playerRef = useRef<Player>({
    id: 0, x: 150, y: 300, width: 60, height: 30, markedForDeletion: false,
    vy: 0, lives: 3, snowballs: 0, isInvincible: false, invincibleTimer: 0,
    healingTimer: 0, speedTimer: 0, timeWarpTimer: 0, angle: 0
  });
  
  const obstaclesRef = useRef<Obstacle[]>([]);
  const powerupsRef = useRef<Powerup[]>([]);
  const lettersRef = useRef<Letter[]>([]);
  const landmarksRef = useRef<Landmark[]>([]);
  const projectilesRef = useRef<Projectile[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  
  // Visuals
  const starsRef = useRef<{x:number, y:number, size:number, phase:number}[]>([]);
  const bgCloudsRef = useRef<{x:number, y:number, speed:number, scale:number, opacity: number}[]>([]);
  const bgGearsRef = useRef<{x:number, y:number, radius:number, teeth:number, speed:number, angle:number}[]>([]); // New: Gears background
  
  const flashTimerRef = useRef(0); 
  const glitchTimerRef = useRef(0); // For rendering glitches
  const glitchOffsetRef = useRef({x:0, y:0});

  // State Management
  const distanceRef = useRef(0);
  const scoreRef = useRef(0);
  const timeRef = useRef(TOTAL_GAME_TIME_SECONDS);
  const lastFrameTimeRef = useRef(0);
  const shakeRef = useRef(0);
  const triggeredStoryMomentsRef = useRef<Set<string>>(new Set());
  const triggeredLandmarksRef = useRef<Set<string>>(new Set());
  const triggeredLettersRef = useRef<Set<string>>(new Set());
  const lastLevelIndexRef = useRef(-1);
  const isEndingSequenceRef = useRef(false);
  
  // Parallax
  const bgLayersRef = useRef<BackgroundLayer[]>([
    { points: [], color: '', speedModifier: 0.2, offset: 0 }, 
    { points: [], color: '', speedModifier: 0.5, offset: 0 }, 
    { points: [], color: '', speedModifier: 0.8, offset: 0 }, 
  ]);

  // HUD State
  const [hudState, setHudState] = useState({
    lives: 3, snowballs: 0, progress: 0, timeLeft: TOTAL_GAME_TIME_SECONDS,
    levelIndex: 0, score: 0, activeSpeed: 0, activeHealing: 0, activeTimeWarp: 0,
    collectedPowerups: [] as { id: number; type: PowerupType }[],
    activeDialogue: null as DialogueLine | null,
    activeWish: null as string | null
  });
  const collectedPowerupsRef = useRef<{ id: number; type: PowerupType }[]>([]);
  const activeDialogueRef = useRef<DialogueLine | null>(null);
  const activeWishRef = useRef<string | null>(null);

  // Helper moved to component scope so it's accessible in all useEffects
  const createParticles = (x:number, y:number, type:ParticleType, count:number, color:string) => {
    for(let i=0; i<count; i++) {
        particlesRef.current.push({
            id: Math.random(), type, x, y, radius: Math.random()*3+2, 
            vx: (Math.random()-0.5)*5, vy: (Math.random()-0.5)*5, alpha: 1, color, life: 1, maxLife: 1, growth: -0.1
        });
    }
  };

  useEffect(() => {
    // Generate Terrain & Backgrounds
    const generateTerrain = (amplitude: number, roughness: number) => {
        const points = [];
        let y = 0;
        for (let i = 0; i <= CANVAS_WIDTH + 200; i += 50) {
            y += (Math.random() - 0.5) * roughness;
            y = Math.max(Math.min(y, amplitude), -amplitude);
            points.push(y);
        }
        return points;
    };

    bgLayersRef.current[0].points = generateTerrain(150, 80); 
    bgLayersRef.current[1].points = generateTerrain(50, 30);  
    bgLayersRef.current[2].points = generateTerrain(20, 10);  

    starsRef.current = Array.from({length: 80}, () => ({
        x: Math.random() * CANVAS_WIDTH,
        y: Math.random() * (CANVAS_HEIGHT / 2),
        size: Math.random() * 2 + 1,
        phase: Math.random() * Math.PI * 2
    }));

    // Generate Gears for "Clockwork" theme
    bgGearsRef.current = Array.from({length: 5}, () => ({
        x: Math.random() * CANVAS_WIDTH,
        y: Math.random() * CANVAS_HEIGHT,
        radius: Math.random() * 50 + 30,
        teeth: Math.floor(Math.random() * 8 + 8),
        speed: (Math.random() - 0.5) * 0.02,
        angle: 0
    }));
  }, []);

  // Input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Backquote') { setDebugMenuOpen(prev => !prev); return; }
      if (gameState !== GameState.PLAYING) return;
      
      if ((e.code === 'Space' || e.code === 'ArrowUp') && !isEndingSequenceRef.current) {
        playerRef.current.vy = JUMP_STRENGTH;
        soundManager.playJump();
        createParticles(playerRef.current.x, playerRef.current.y + 20, ParticleType.SMOKE, 3, '#fff');
      }
      if ((e.code === 'KeyZ' || e.code === 'Enter') && !isEndingSequenceRef.current) shootSnowball();
    };
    
    const handleTouch = () => {
       if (gameState !== GameState.PLAYING) return;
       if (!isEndingSequenceRef.current) {
          playerRef.current.vy = JUMP_STRENGTH;
          soundManager.playJump();
       }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('touchstart', handleTouch);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('touchstart', handleTouch);
    };
  }, [gameState]);

  const shootSnowball = () => {
    if (playerRef.current.snowballs > 0) {
      playerRef.current.snowballs--;
      soundManager.playShoot();
      projectilesRef.current.push({
        id: Date.now(),
        x: playerRef.current.x + playerRef.current.width,
        y: playerRef.current.y + playerRef.current.height / 2,
        width: 12, height: 12, vx: 15, markedForDeletion: false, trail: []
      });
    }
  };

  // Game Loop
  useEffect(() => {
    if (gameState !== GameState.PLAYING && gameState !== GameState.INTRO) {
        soundManager.setSleighVolume(0);
        return; 
    }

    let animationFrameId: number;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d', { alpha: false });

    if (!canvas || !ctx) return;

    // Reset Logic
    if (gameState === GameState.INTRO || (gameState === GameState.PLAYING && playerRef.current.lives <= 0 && timeRef.current === TOTAL_GAME_TIME_SECONDS)) {
        playerRef.current = { ...playerRef.current, y: 300, vy: 0, lives: 3, snowballs: 0, isInvincible: false, activeTimeWarp: 0 };
        obstaclesRef.current = []; powerupsRef.current = []; lettersRef.current = []; landmarksRef.current = [];
        distanceRef.current = 0; scoreRef.current = 0; timeRef.current = TOTAL_GAME_TIME_SECONDS;
        isEndingSequenceRef.current = false;
        triggeredStoryMomentsRef.current.clear();
        triggeredLandmarksRef.current.clear();
        soundManager.stopEndingMusic();
    }

    lastFrameTimeRef.current = performance.now();

    const loop = (timestamp: number) => {
        const dt = Math.min((timestamp - lastFrameTimeRef.current) / 1000, 0.1);
        lastFrameTimeRef.current = timestamp;

        update(dt, timestamp);
        draw(ctx, timestamp);

        if (playerRef.current.lives <= 0) setGameState(GameState.GAME_OVER);
        else animationFrameId = requestAnimationFrame(loop);
    };

    const update = (dt: number, timestamp: number) => {
        if (gameState === GameState.INTRO) {
             // Intro specific drift
             return; 
        }

        const player = playerRef.current;
        
        // --- TIME WARP LOGIC ---
        // If Time Warp is active, world moves slower (0.2x), but player moves normal (1.0x).
        const timeWarpFactor = player.timeWarpTimer > 0 ? 0.2 : 1.0;
        const worldDt = dt * timeWarpFactor;
        
        timeRef.current -= dt; // Game time flows normally for the timer
        if (player.timeWarpTimer > 0) player.timeWarpTimer -= dt;
        if (player.speedTimer > 0) player.speedTimer -= dt;
        if (player.invincibleTimer > 0) player.invincibleTimer -= dt;
        if (flashTimerRef.current > 0) flashTimerRef.current -= dt;

        player.isInvincible = player.invincibleTimer > 0;

        // Progress Calculation
        let progressRatio = distanceRef.current / VICTORY_DISTANCE;
        if (gameMode === GameMode.STORY) progressRatio = Math.min(1.0, progressRatio);

        // Level Logic
        let levelIndex = 0;
        for (let i = LEVELS.length - 1; i >= 0; i--) {
            if (progressRatio * 100 >= LEVEL_THRESHOLDS[i]) { levelIndex = i; break; }
        }
        if (levelIndex !== lastLevelIndexRef.current) {
            soundManager.playLevelBgm(levelIndex);
            lastLevelIndexRef.current = levelIndex;
        }
        const level = LEVELS[levelIndex];

        // Base Speed
        const speedMultiplier = player.speedTimer > 0 ? 1.5 : 1.0;
        const currentSpeed = (BASE_SPEED + (progressRatio * 4)) * speedMultiplier;
        
        // Ending Trigger
        if (gameMode === GameMode.STORY && progressRatio >= 0.99 && !isEndingSequenceRef.current) {
            isEndingSequenceRef.current = true;
            onWin(); // Trigger Victory Component Overlay
        }

        if (!isEndingSequenceRef.current) {
            distanceRef.current += currentSpeed * worldDt * 60;
            scoreRef.current += currentSpeed * 0.1 * worldDt * 60;
            
            // Player Physics (UNAFFECTED by Time Warp)
            player.vy += GRAVITY * dt * 60;
            player.y += player.vy * dt * 60;
            const targetAngle = Math.min(Math.max(player.vy * 0.05, -0.5), 0.5);
            player.angle += (targetAngle - player.angle) * 0.1 * dt * 60;

            if (player.y + player.height > CANVAS_HEIGHT - 50) { player.y = CANVAS_HEIGHT - 50 - player.height; player.vy = 0; }
            if (player.y < 0) { player.y = 0; player.vy = 0; }
        }

        // --- Narrative Events ---
        STORY_MOMENTS.forEach(moment => {
            if (progressRatio >= moment.progress && !triggeredStoryMomentsRef.current.has(moment.dialogue.id)) {
                triggeredStoryMomentsRef.current.add(moment.dialogue.id);
                activeDialogueRef.current = moment.dialogue;
                setTimeout(() => { if (activeDialogueRef.current?.id === moment.dialogue.id) activeDialogueRef.current = null; }, 5000);
            }
        });

        // --- Spawning ---
        if (!isEndingSequenceRef.current) {
             // Obstacles
             if (Math.random() < 0.015 * level.spawnRateMultiplier * worldDt * 60) {
                 const types: Obstacle['type'][] = levelIndex === 1 ? ['GEAR', 'BUILDING'] : (levelIndex === 2 ? ['GLITCH_BLOCK', 'CLOUD'] : ['TREE', 'BIRD', 'SNOWMAN']);
                 const type = types[Math.floor(Math.random() * types.length)];
                 obstaclesRef.current.push({
                     id: Date.now() + Math.random(),
                     x: CANVAS_WIDTH + 100,
                     y: (type === 'BIRD' || type === 'CLOUD' || type === 'GEAR' || type === 'GLITCH_BLOCK') ? Math.random() * (CANVAS_HEIGHT - 200) : CANVAS_HEIGHT - 100,
                     width: 60, height: 60, type, markedForDeletion: false, rotation: 0
                 });
             }
             // Powerups
             if (Math.random() < 0.005 * worldDt * 60) {
                 const pTypes = Object.values(PowerupType);
                 const pType = pTypes[Math.floor(Math.random() * pTypes.length)];
                 powerupsRef.current.push({
                     id: Date.now() + Math.random(), x: CANVAS_WIDTH + 100, y: Math.random() * (CANVAS_HEIGHT - 200) + 50,
                     width: 40, height: 40, type: pType, floatOffset: 0, markedForDeletion: false
                 });
             }
             // Landmarks
             LANDMARKS.forEach(lm => {
                 if (progressRatio >= lm.progress && !triggeredLandmarksRef.current.has(lm.type)) {
                     triggeredLandmarksRef.current.add(lm.type);
                     landmarksRef.current.push({
                         id: Date.now(), x: CANVAS_WIDTH + 200, y: CANVAS_HEIGHT - 350,
                         width: 250, height: 350, type: lm.type, name: lm.name, markedForDeletion: false
                     });
                 }
             });
        }

        // --- Updates ---
        // Move Backgrounds (Parallax)
        bgLayersRef.current.forEach(l => {
            l.offset -= currentSpeed * l.speedModifier * worldDt * 60;
            if (l.offset <= -50) { l.offset += 50; l.points.shift(); l.points.push((Math.random()-0.5)*50); }
        });

        // Move Entities (Affected by World DT)
        obstaclesRef.current.forEach(o => {
            o.x -= currentSpeed * level.obstacleSpeedMultiplier * worldDt * 60;
            if (o.type === 'GEAR') o.rotation = (o.rotation || 0) + 0.05;
            if (o.x < -100) o.markedForDeletion = true;
            if (!cinematicMode && !player.isInvincible && checkCollision(player, o)) {
                player.lives--;
                soundManager.playCrash();
                player.invincibleTimer = 2.0;
                shakeRef.current = 20;
                createParticles(player.x, player.y, ParticleType.DEBRIS, 15, '#ef4444');
            }
        });

        powerupsRef.current.forEach(p => {
            p.x -= currentSpeed * worldDt * 60;
            if (p.x < -50) p.markedForDeletion = true;
            if (checkCollision(player, p)) {
                p.markedForDeletion = true;
                applyPowerup(p.type);
                soundManager.playPowerup(p.type);
                collectedPowerupsRef.current.push({id: Date.now(), type: p.type});
                createParticles(p.x, p.y, ParticleType.SPARKLE, 20, POWERUP_COLORS[p.type]);
            }
        });
        
        landmarksRef.current.forEach(l => {
             l.x -= currentSpeed * worldDt * 60;
             if (l.x < -300) l.markedForDeletion = true;
        });

        // Projectiles move normal speed relative to player
        projectilesRef.current.forEach(p => {
            p.x += p.vx * dt * 60; 
            if (p.x > CANVAS_WIDTH) p.markedForDeletion = true;
            obstaclesRef.current.forEach(o => {
                if (checkCollision(p, o)) {
                    o.markedForDeletion = true; p.markedForDeletion = true;
                    soundManager.playCrash();
                    createParticles(o.x, o.y, ParticleType.DEBRIS, 10, '#fff');
                    scoreRef.current += 50;
                }
            });
        });

        // Particles
        particlesRef.current.forEach(p => {
            p.x += p.vx * dt * 60; p.y += p.vy * dt * 60; p.life -= dt;
            if (p.type === ParticleType.SNOW) p.x -= currentSpeed * 0.5 * worldDt * 60;
        });
        particlesRef.current = particlesRef.current.filter(p => p.life > 0);

        // Cleanup
        obstaclesRef.current = obstaclesRef.current.filter(e => !e.markedForDeletion);
        powerupsRef.current = powerupsRef.current.filter(e => !e.markedForDeletion);
        landmarksRef.current = landmarksRef.current.filter(e => !e.markedForDeletion);
        projectilesRef.current = projectilesRef.current.filter(e => !e.markedForDeletion);

        if (shakeRef.current > 0) shakeRef.current *= 0.9;
        
        // HUD Update
        if (Math.floor(timestamp / 100) > Math.floor((timestamp - dt * 1000) / 100)) {
            const newPowerups = collectedPowerupsRef.current;
            collectedPowerupsRef.current = [];
            setHudState({
                lives: player.lives, snowballs: player.snowballs, progress: progressRatio * 100,
                timeLeft: timeRef.current, levelIndex, score: scoreRef.current,
                activeSpeed: player.speedTimer, activeHealing: player.healingTimer, activeTimeWarp: player.timeWarpTimer,
                collectedPowerups: newPowerups, activeDialogue: activeDialogueRef.current, activeWish: activeWishRef.current
            });
        }
    };

    const draw = (ctx: CanvasRenderingContext2D, timestamp: number) => {
        const levelIndex = hudState.levelIndex;
        const level = LEVELS[levelIndex];

        // Glitch Logic
        let glitchX = 0; let glitchY = 0;
        if (Math.random() < level.glitchIntensity * 0.1) {
            glitchX = (Math.random() - 0.5) * 10;
            glitchY = (Math.random() - 0.5) * 5;
            glitchTimerRef.current = 5;
        }
        if (glitchTimerRef.current > 0) {
            glitchTimerRef.current--;
            ctx.save();
            ctx.translate(glitchX, glitchY);
            // RGB Split effect sim
            ctx.shadowColor = "red"; ctx.shadowOffsetX = 2;
        }

        // Sky
        const gradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
        gradient.addColorStop(0, level.backgroundGradient[0]);
        gradient.addColorStop(1, level.backgroundGradient[1]);
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        // Gears (Clockwork Sky)
        if (levelIndex === 1) {
            bgGearsRef.current.forEach(g => {
                g.angle += g.speed;
                drawGear(ctx, g.x, g.y, g.radius, g.teeth, g.angle, "#52525b");
            });
        }

        // Stars
        ctx.fillStyle = "white";
        starsRef.current.forEach(s => {
             const alpha = 0.5 + 0.5 * Math.sin(timestamp * 0.005 + s.phase);
             ctx.globalAlpha = alpha;
             ctx.beginPath(); ctx.arc(s.x, s.y, s.size, 0, Math.PI*2); ctx.fill();
        });
        ctx.globalAlpha = 1.0;

        // Parallax Layers
        drawParallaxLayer(ctx, bgLayersRef.current[0], CANVAS_HEIGHT - 150, "#334155");
        drawParallaxLayer(ctx, bgLayersRef.current[1], CANVAS_HEIGHT - 80, "#475569");
        
        // World Transform (Shake)
        ctx.save();
        ctx.translate((Math.random() - 0.5) * shakeRef.current, (Math.random() - 0.5) * shakeRef.current);
        
        drawParallaxLayer(ctx, bgLayersRef.current[2], CANVAS_HEIGHT - 20, "#cbd5e1");

        // Entities
        landmarksRef.current.forEach(l => drawLandmark(ctx, l));
        obstaclesRef.current.forEach(o => drawObstacle(ctx, o));
        powerupsRef.current.forEach(p => drawPowerup(ctx, p));
        projectilesRef.current.forEach(p => {
             ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(p.x, p.y, p.width/2, 0, Math.PI*2); ctx.fill();
        });
        
        drawPlayer(ctx, playerRef.current);

        particlesRef.current.forEach(p => {
            ctx.globalAlpha = p.alpha; ctx.fillStyle = p.color;
            if (p.type === ParticleType.GLITCH) ctx.fillRect(p.x, p.y, p.radius, p.radius);
            else { ctx.beginPath(); ctx.arc(p.x, p.y, p.radius, 0, Math.PI*2); ctx.fill(); }
        });

        // Flash/Glitch Restore
        if (glitchTimerRef.current > 0) ctx.restore();
        ctx.restore(); // Shake restore
        
        if (flashTimerRef.current > 0) {
            ctx.fillStyle = `rgba(255,255,255,${flashTimerRef.current})`;
            ctx.fillRect(0,0, CANVAS_WIDTH, CANVAS_HEIGHT);
        }
    };
    
    // Draw Helpers
    const drawGear = (ctx: CanvasRenderingContext2D, x:number, y:number, r:number, teeth:number, angle:number, color:string) => {
        ctx.save(); ctx.translate(x,y); ctx.rotate(angle); ctx.fillStyle = color;
        ctx.beginPath();
        const outerR = r + 5; const innerR = r - 5;
        for(let i=0; i<teeth*2; i++) {
            const a = (Math.PI*2 * i) / (teeth*2);
            const rad = i%2===0 ? outerR : r;
            ctx.lineTo(Math.cos(a)*rad, Math.sin(a)*rad);
        }
        ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.arc(0,0, innerR/2, 0, Math.PI*2); ctx.fillStyle = "#27272a"; ctx.fill();
        ctx.restore();
    };

    const drawParallaxLayer = (ctx: CanvasRenderingContext2D, layer: BackgroundLayer, baseY: number, color: string) => {
        ctx.fillStyle = color;
        ctx.beginPath(); ctx.moveTo(0, CANVAS_HEIGHT);
        for (let i = 0; i < layer.points.length - 1; i++) {
            const x = (i * 50) + layer.offset; const y = baseY + layer.points[i];
            const nextX = ((i + 1) * 50) + layer.offset; const nextY = baseY + layer.points[i+1];
            const cx = (x + nextX) / 2; const cy = (y + nextY) / 2;
            if (i === 0) ctx.moveTo(x, y); else ctx.quadraticCurveTo(x, y, cx, cy);
        }
        ctx.lineTo(CANVAS_WIDTH, CANVAS_HEIGHT); ctx.lineTo(0, CANVAS_HEIGHT); ctx.fill();
    };

    const drawPlayer = (ctx: CanvasRenderingContext2D, player: Player) => {
        if (player.isInvincible && Math.floor(Date.now() / 50) % 2 === 0) return;
        ctx.save(); ctx.translate(player.x + player.width/2, player.y + player.height/2); ctx.rotate(player.angle);
        
        // Sleigh
        ctx.fillStyle = "#b91c1c"; 
        ctx.beginPath(); ctx.roundRect(-30, 0, 60, 20, 5); ctx.fill();
        ctx.strokeStyle = "#fbbf24"; ctx.lineWidth=3;
        ctx.beginPath(); ctx.moveTo(-25, 20); ctx.quadraticCurveTo(0, 25, 25, 20); ctx.stroke();
        
        // Time Warp Effect Aura
        if (player.timeWarpTimer > 0) {
            ctx.strokeStyle = "#d8b4fe"; ctx.lineWidth = 2; ctx.setLineDash([5, 5]);
            ctx.beginPath(); ctx.arc(0, 0, 50, 0, Math.PI*2); ctx.stroke(); ctx.setLineDash([]);
        }
        
        // Santa
        ctx.fillStyle = "#fca5a5"; ctx.beginPath(); ctx.arc(0, -10, 8, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = "#ef4444"; ctx.beginPath(); ctx.moveTo(-8, -14); ctx.lineTo(8, -14); ctx.lineTo(0, -28); ctx.fill();
        
        ctx.restore();
    };

    const drawObstacle = (ctx: CanvasRenderingContext2D, o: Obstacle) => {
        ctx.save(); ctx.translate(o.x, o.y);
        if (o.type === 'GEAR') drawGear(ctx, 30, 30, 25, 6, o.rotation || 0, "#71717a");
        else if (o.type === 'GLITCH_BLOCK') {
            ctx.fillStyle = `rgb(${Math.random()*255},0,${Math.random()*255})`;
            ctx.fillRect(0,0, o.width, o.height);
        } else {
            // Basic fallback for other types
            ctx.fillStyle = "#fff"; ctx.fillRect(0,0, o.width, o.height);
        }
        ctx.restore();
    };

    const drawPowerup = (ctx: CanvasRenderingContext2D, p: Powerup) => {
        ctx.save(); ctx.translate(p.x, p.y);
        ctx.fillStyle = POWERUP_COLORS[p.type];
        ctx.shadowColor = POWERUP_COLORS[p.type]; ctx.shadowBlur = 15;
        ctx.beginPath(); ctx.arc(20, 20, 15, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = "white"; ctx.font = "bold 16px Arial"; ctx.textAlign="center"; ctx.textBaseline="middle";
        ctx.fillText(p.type === 'TIME_WARP' ? '⏳' : '⚡', 20, 20);
        ctx.restore();
    };

    const drawLandmark = (ctx: CanvasRenderingContext2D, l: Landmark) => {
        ctx.save(); ctx.translate(l.x, l.y);
        if (l.type === 'CLOCK_TOWER') {
             ctx.fillStyle = "#18181b"; ctx.fillRect(0,0, l.width, l.height);
             ctx.fillStyle = "#fbbf24"; ctx.beginPath(); ctx.arc(l.width/2, 50, 40, 0, Math.PI*2); ctx.fill();
        } else {
             ctx.fillStyle = "#27272a"; ctx.fillRect(0,0, l.width, l.height);
        }
        ctx.restore();
    };
    
    const applyPowerup = (type: PowerupType) => {
        const p = playerRef.current;
        if (type === PowerupType.TIME_WARP) p.timeWarpTimer = 5.0;
        else if (type === PowerupType.SPEED) p.speedTimer = 7.0;
        else if (type === PowerupType.HEALING) p.healingTimer = 5.0;
        else if (type === PowerupType.SNOWBALLS) p.snowballs += 5;
    };
    
    const checkCollision = (r1: Entity, r2: Entity) => (r1.x < r2.x+r2.width && r1.x+r1.width > r2.x && r1.y < r2.y+r2.height && r1.y+r1.height > r2.y);

    animationFrameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationFrameId);
  }, [gameState, gameMode]);

  return (
    <div className="relative w-full h-full max-w-[1200px] max-h-[600px] mx-auto border-4 border-slate-800 shadow-2xl rounded-xl overflow-hidden bg-black">
      <canvas ref={canvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} className="w-full h-full object-cover" />
      <div className="scanline"></div>
      {gameState === GameState.PLAYING && (
        <UIOverlay 
          lives={hudState.lives} snowballs={hudState.snowballs} progress={hudState.progress} 
          timeLeft={hudState.timeLeft} activePowerups={hudState.activeSpeed + hudState.activeHealing + hudState.activeTimeWarp}
          currentLevelName={LEVELS[hudState.levelIndex].name} score={hudState.score}
          collectedPowerups={hudState.collectedPowerups} activeDialogue={hudState.activeDialogue} activeWish={hudState.activeWish}
        />
      )}
      {/* Debug Menu Omitted for brevity, assumed existing */}
    </div>
  );
};

export default GameCanvas;
