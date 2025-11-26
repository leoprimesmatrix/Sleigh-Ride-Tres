
import React, { useEffect, useRef, useState } from 'react';
import { 
  GameState, Player, Obstacle, Powerup, Letter, Projectile, Particle, ParticleType, PowerupType, Entity, BackgroundLayer, DialogueLine, GameMode, Landmark, TerrainStyle
} from '../types.ts';
import { 
  CANVAS_WIDTH, CANVAS_HEIGHT, GRAVITY, JUMP_STRENGTH, LEVELS, LEVEL_THRESHOLDS, POWERUP_COLORS, TOTAL_GAME_TIME_SECONDS, VICTORY_DISTANCE, BASE_SPEED, STORY_MOMENTS, LANDMARKS
} from '../constants.ts';
import UIOverlay from './UIOverlay.tsx';
import { soundManager } from '../audio.ts';

interface GameCanvasProps {
  gameState: GameState;
  setGameState: (state: GameState) => void;
  onWin: () => void;
  gameMode: GameMode;
}

const GameCanvas: React.FC<GameCanvasProps> = ({ gameState, setGameState, onWin, gameMode }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Debug State
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
  const starsRef = useRef<{x:number, y:number, size:number, phase:number, color: string}[]>([]);
  const bgGearsRef = useRef<{x:number, y:number, radius:number, teeth:number, speed:number, angle:number, opacity: number}[]>([]);
  
  const flashTimerRef = useRef(0); 
  const glitchTimerRef = useRef(0); 
  
  // State Management
  const distanceRef = useRef(0);
  const scoreRef = useRef(0);
  const timeRef = useRef(TOTAL_GAME_TIME_SECONDS);
  const lastFrameTimeRef = useRef(0);
  const shakeRef = useRef(0);
  const triggeredStoryMomentsRef = useRef<Set<string>>(new Set());
  const triggeredLandmarksRef = useRef<Set<string>>(new Set());
  const lastLevelIndexRef = useRef(-1);
  const isEndingSequenceRef = useRef(false);
  
  // Parallax
  const bgLayersRef = useRef<BackgroundLayer[]>([
    { points: [], color: '', speedModifier: 0.1, offset: 0 }, 
    { points: [], color: '', speedModifier: 0.3, offset: 0 }, 
    { points: [], color: '', speedModifier: 0.6, offset: 0 }, 
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

  // Helper moved to component scope
  const createParticles = (x:number, y:number, type:ParticleType, count:number, color:string) => {
    for(let i=0; i<count; i++) {
        particlesRef.current.push({
            id: Math.random(), type, x, y, radius: Math.random()*3+2, 
            vx: (Math.random()-0.5)*5, vy: (Math.random()-0.5)*5, alpha: 1, color, life: 1, maxLife: 1, growth: -0.1
        });
    }
  };

  useEffect(() => {
    // Generate Terrain Points
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

    bgLayersRef.current[0].points = generateTerrain(150, 60); 
    bgLayersRef.current[1].points = generateTerrain(100, 40);  
    bgLayersRef.current[2].points = generateTerrain(50, 20);  

    const starColors = ["#ffffff", "#fef08a", "#e9d5ff", "#bfdbfe"];
    starsRef.current = Array.from({length: 120}, () => ({
        x: Math.random() * CANVAS_WIDTH,
        y: Math.random() * (CANVAS_HEIGHT * 0.7),
        size: Math.random() * 2 + 0.5,
        phase: Math.random() * Math.PI * 2,
        color: starColors[Math.floor(Math.random() * starColors.length)]
    }));

    bgGearsRef.current = Array.from({length: 8}, () => ({
        x: Math.random() * CANVAS_WIDTH,
        y: Math.random() * CANVAS_HEIGHT,
        radius: Math.random() * 80 + 20,
        teeth: Math.floor(Math.random() * 8 + 6),
        speed: (Math.random() - 0.5) * 0.05,
        angle: 0,
        opacity: Math.random() * 0.3 + 0.1
    }));
  }, []);

  // Input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Backquote') { setCinematicMode(prev => !prev); return; }
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
        if (gameState === GameState.INTRO) return;

        const player = playerRef.current;
        const timeWarpFactor = player.timeWarpTimer > 0 ? 0.2 : 1.0;
        const worldDt = dt * timeWarpFactor;
        
        timeRef.current -= dt;
        if (player.timeWarpTimer > 0) player.timeWarpTimer -= dt;
        if (player.speedTimer > 0) player.speedTimer -= dt;
        if (player.invincibleTimer > 0) player.invincibleTimer -= dt;
        if (flashTimerRef.current > 0) flashTimerRef.current -= dt;

        player.isInvincible = player.invincibleTimer > 0;

        let progressRatio = distanceRef.current / VICTORY_DISTANCE;
        if (gameMode === GameMode.STORY) progressRatio = Math.min(1.0, progressRatio);

        let levelIndex = 0;
        for (let i = LEVELS.length - 1; i >= 0; i--) {
            if (progressRatio * 100 >= LEVEL_THRESHOLDS[i]) { levelIndex = i; break; }
        }
        if (levelIndex !== lastLevelIndexRef.current) {
            soundManager.playLevelBgm(levelIndex);
            lastLevelIndexRef.current = levelIndex;
            flashTimerRef.current = 0.5; // Flash on level change
        }
        const level = LEVELS[levelIndex];

        const speedMultiplier = player.speedTimer > 0 ? 1.5 : 1.0;
        const currentSpeed = (BASE_SPEED + (progressRatio * 4)) * speedMultiplier;
        
        if (gameMode === GameMode.STORY && progressRatio >= 0.99 && !isEndingSequenceRef.current) {
            isEndingSequenceRef.current = true;
            onWin(); 
        }

        if (!isEndingSequenceRef.current) {
            distanceRef.current += currentSpeed * worldDt * 60;
            scoreRef.current += currentSpeed * 0.1 * worldDt * 60;
            
            player.vy += GRAVITY * dt * 60;
            player.y += player.vy * dt * 60;
            const targetAngle = Math.min(Math.max(player.vy * 0.05, -0.5), 0.5);
            player.angle += (targetAngle - player.angle) * 0.1 * dt * 60;

            if (player.y + player.height > CANVAS_HEIGHT - 50) { player.y = CANVAS_HEIGHT - 50 - player.height; player.vy = 0; }
            if (player.y < 0) { player.y = 0; player.vy = 0; }
        }

        // Narrative & Spawning
        STORY_MOMENTS.forEach(moment => {
            if (progressRatio >= moment.progress && !triggeredStoryMomentsRef.current.has(moment.dialogue.id)) {
                triggeredStoryMomentsRef.current.add(moment.dialogue.id);
                activeDialogueRef.current = moment.dialogue;
                setTimeout(() => { if (activeDialogueRef.current?.id === moment.dialogue.id) activeDialogueRef.current = null; }, 5000);
            }
        });

        if (!isEndingSequenceRef.current) {
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
             if (Math.random() < 0.005 * worldDt * 60) {
                 const pTypes = Object.values(PowerupType);
                 const pType = pTypes[Math.floor(Math.random() * pTypes.length)];
                 powerupsRef.current.push({
                     id: Date.now() + Math.random(), x: CANVAS_WIDTH + 100, y: Math.random() * (CANVAS_HEIGHT - 200) + 50,
                     width: 40, height: 40, type: pType, floatOffset: 0, markedForDeletion: false
                 });
             }
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

        // Move Backgrounds
        bgLayersRef.current.forEach(l => {
            l.offset -= currentSpeed * l.speedModifier * worldDt * 60;
            if (l.offset <= -50) { l.offset += 50; l.points.shift(); l.points.push((Math.random()-0.5)*50); }
        });

        // Entity Updates
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

        particlesRef.current.forEach(p => {
            p.x += p.vx * dt * 60; p.y += p.vy * dt * 60; p.life -= dt;
            if (p.type === ParticleType.SNOW) p.x -= currentSpeed * 0.5 * worldDt * 60;
        });
        particlesRef.current = particlesRef.current.filter(p => p.life > 0);

        obstaclesRef.current = obstaclesRef.current.filter(e => !e.markedForDeletion);
        powerupsRef.current = powerupsRef.current.filter(e => !e.markedForDeletion);
        landmarksRef.current = landmarksRef.current.filter(e => !e.markedForDeletion);
        projectilesRef.current = projectilesRef.current.filter(e => !e.markedForDeletion);

        if (shakeRef.current > 0) shakeRef.current *= 0.9;
        
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

        // --- Glitch Effect Pre-Draw ---
        let glitchX = 0; let glitchY = 0;
        if (Math.random() < level.glitchIntensity * 0.05) {
            glitchX = (Math.random() - 0.5) * 15;
            glitchY = (Math.random() - 0.5) * 5;
            glitchTimerRef.current = 3;
        }
        
        if (glitchTimerRef.current > 0) {
            glitchTimerRef.current--;
            ctx.save();
            ctx.translate(glitchX, glitchY);
            if (Math.random() > 0.5) {
                ctx.globalCompositeOperation = "color-dodge";
                ctx.fillStyle = `rgba(${Math.random()*255},0,${Math.random()*255},0.2)`;
                ctx.fillRect(0,0, CANVAS_WIDTH, CANVAS_HEIGHT);
            }
        }

        // --- Sky Rendering ---
        const gradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
        gradient.addColorStop(0, level.backgroundGradient[0]);
        gradient.addColorStop(1, level.backgroundGradient[1]);
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        // Sky Effects per Biome
        if (levelIndex === 0) drawAurora(ctx, timestamp);
        if (levelIndex === 2) drawCyberGrid(ctx, timestamp);

        // --- Celestial Bodies ---
        ctx.save();
        starsRef.current.forEach(s => {
             const twinkle = 0.5 + 0.5 * Math.sin(timestamp * 0.003 + s.phase);
             ctx.globalAlpha = twinkle * (levelIndex === 4 ? 0.2 : 1); // Dim stars in finale
             ctx.fillStyle = s.color;
             ctx.beginPath(); ctx.arc(s.x, s.y, s.size, 0, Math.PI*2); ctx.fill();
             
             // Star Glow
             if (s.size > 2) {
                 ctx.shadowColor = s.color;
                 ctx.shadowBlur = 10;
                 ctx.stroke();
                 ctx.shadowBlur = 0;
             }
        });
        ctx.restore();

        // --- Industrial Gears (Act 2) ---
        if (levelIndex === 1) {
            bgGearsRef.current.forEach(g => {
                g.angle += g.speed;
                ctx.globalAlpha = g.opacity;
                drawGear(ctx, g.x, g.y, g.radius, g.teeth, g.angle, "#000");
                ctx.globalAlpha = 1.0;
            });
        }

        // --- Parallax Backgrounds ---
        // Layer 0 (Farthest)
        drawParallaxLayer(ctx, bgLayersRef.current[0], CANVAS_HEIGHT - 200, "#334155", level.terrainStyle, 0.3);
        
        // Atmospheric Fog Layer 1
        drawFog(ctx, timestamp, 0.3, level.backgroundGradient[1]);

        // Layer 1 (Mid)
        drawParallaxLayer(ctx, bgLayersRef.current[1], CANVAS_HEIGHT - 120, "#475569", level.terrainStyle, 0.6);
        
        // Atmospheric Fog Layer 2
        drawFog(ctx, timestamp * 1.5, 0.5, level.backgroundGradient[1]);

        // --- World Transform (Shake) ---
        ctx.save();
        ctx.translate((Math.random() - 0.5) * shakeRef.current, (Math.random() - 0.5) * shakeRef.current);
        
        // Layer 2 (Closest/Ground)
        drawParallaxLayer(ctx, bgLayersRef.current[2], CANVAS_HEIGHT - 20, "#cbd5e1", level.terrainStyle, 1.0);

        // --- Entities ---
        landmarksRef.current.forEach(l => drawLandmark(ctx, l));
        obstaclesRef.current.forEach(o => drawObstacle(ctx, o, level.terrainStyle));
        powerupsRef.current.forEach(p => drawPowerup(ctx, p));
        projectilesRef.current.forEach(p => {
             ctx.fillStyle = "#fff"; 
             ctx.shadowColor = "#fff"; ctx.shadowBlur = 5;
             ctx.beginPath(); ctx.arc(p.x, p.y, p.width/2, 0, Math.PI*2); ctx.fill();
             ctx.shadowBlur = 0;
        });
        
        drawPlayer(ctx, playerRef.current);

        // Particles
        particlesRef.current.forEach(p => {
            ctx.globalAlpha = p.alpha; ctx.fillStyle = p.color;
            if (p.type === ParticleType.GLITCH) ctx.fillRect(p.x, p.y, p.radius, p.radius);
            else { ctx.beginPath(); ctx.arc(p.x, p.y, p.radius, 0, Math.PI*2); ctx.fill(); }
        });

        // --- Vignette ---
        const grad = ctx.createRadialGradient(CANVAS_WIDTH/2, CANVAS_HEIGHT/2, CANVAS_HEIGHT/3, CANVAS_WIDTH/2, CANVAS_HEIGHT/2, CANVAS_HEIGHT);
        grad.addColorStop(0, "transparent");
        grad.addColorStop(1, "rgba(0,0,0,0.4)");
        ctx.fillStyle = grad;
        ctx.fillRect(0,0, CANVAS_WIDTH, CANVAS_HEIGHT);

        // Restore Glitch Context
        if (glitchTimerRef.current > 0) ctx.restore();
        ctx.restore(); // Restore Shake
        
        if (flashTimerRef.current > 0) {
            ctx.fillStyle = `rgba(255,255,255,${flashTimerRef.current})`;
            ctx.fillRect(0,0, CANVAS_WIDTH, CANVAS_HEIGHT);
        }
    };
    
    // --- Visual Helpers ---

    const drawAurora = (ctx: CanvasRenderingContext2D, time: number) => {
        const t = time * 0.001;
        ctx.save();
        ctx.globalCompositeOperation = "screen";
        for (let i = 0; i < 2; i++) {
            const gradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT/2);
            gradient.addColorStop(0, i===0 ? "rgba(50, 255, 100, 0)" : "rgba(150, 50, 255, 0)");
            gradient.addColorStop(0.5, i===0 ? "rgba(50, 255, 100, 0.2)" : "rgba(150, 50, 255, 0.2)");
            gradient.addColorStop(1, "rgba(0,0,0,0)");
            
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            for (let x = 0; x <= CANVAS_WIDTH; x += 50) {
                const y = Math.sin(x * 0.005 + t + i) * 50 + Math.sin(x * 0.01 - t*2) * 30 + 100;
                ctx.lineTo(x, y);
            }
            ctx.lineTo(CANVAS_WIDTH, 0);
            ctx.fill();
        }
        ctx.restore();
    };

    const drawCyberGrid = (ctx: CanvasRenderingContext2D, time: number) => {
        ctx.save();
        ctx.strokeStyle = "rgba(168, 85, 247, 0.2)"; // Purple
        ctx.lineWidth = 1;
        const offset = (time * 0.1) % 50;
        
        // Vertical lines
        for(let x=offset; x<CANVAS_WIDTH; x+=100) {
            ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, CANVAS_HEIGHT); ctx.stroke();
        }
        // Horizontal (Perspective illusion)
        for(let y=0; y<CANVAS_HEIGHT/2; y+=40) {
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(CANVAS_WIDTH, y); ctx.stroke();
        }
        ctx.restore();
    };

    const drawFog = (ctx: CanvasRenderingContext2D, time: number, opacity: number, colorHex: string) => {
        ctx.save();
        ctx.globalAlpha = opacity;
        const grad = ctx.createLinearGradient(0, CANVAS_HEIGHT - 100, 0, CANVAS_HEIGHT);
        grad.addColorStop(0, "rgba(255,255,255,0)");
        grad.addColorStop(1, colorHex); // Mist blends into background color
        ctx.fillStyle = grad;
        
        // Moving Fog
        const offset = Math.sin(time * 0.0005) * 50;
        ctx.translate(offset, 0);
        ctx.fillRect(-50, CANVAS_HEIGHT-150, CANVAS_WIDTH + 100, 150);
        ctx.restore();
    };

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
        ctx.beginPath(); ctx.arc(0,0, innerR/2, 0, Math.PI*2); ctx.fillStyle = "#27272a"; ctx.fill(); // Hollow center
        ctx.restore();
    };

    const drawParallaxLayer = (ctx: CanvasRenderingContext2D, layer: BackgroundLayer, baseY: number, color: string, style: TerrainStyle, opacity: number) => {
        ctx.fillStyle = color;
        ctx.globalAlpha = opacity;
        ctx.beginPath();
        
        // Start bottom-left
        ctx.moveTo(0, CANVAS_HEIGHT);
        
        // If VOID style, we draw disconnected islands sometimes
        if (style === 'VOID') {
             // Just fill the bottom for stability in VOID mode for now, or simple hills
             // Actually, lets make VOID just flat but fading
        }

        for (let i = 0; i < layer.points.length - 1; i++) {
            const x = (i * 50) + layer.offset; 
            const y = baseY + layer.points[i];
            const nextX = ((i + 1) * 50) + layer.offset; 
            const nextY = baseY + layer.points[i+1];
            const cx = (x + nextX) / 2; const cy = (y + nextY) / 2;

            if (style === 'SNOW') {
                if (i === 0) ctx.moveTo(x, y); 
                ctx.quadraticCurveTo(x, y, cx, cy);
            } 
            else if (style === 'INDUSTRIAL') {
                // Stepped / Blocky
                if (i === 0) ctx.moveTo(x, y);
                ctx.lineTo(cx, y);
                ctx.lineTo(cx, nextY);
                ctx.lineTo(nextX, nextY);
            }
            else if (style === 'FRACTURED') {
                // Jagged / Broken
                if (i === 0) ctx.moveTo(x, y);
                if (i % 2 === 0) ctx.lineTo(cx, y - 20); // Spike up
                else ctx.lineTo(cx, y + 20); // Spike down
                ctx.lineTo(nextX, nextY);
            }
            else if (style === 'SPIKES') {
                if (i === 0) ctx.moveTo(x, y);
                ctx.lineTo(cx, y - 50); // Sharp tall spikes
                ctx.lineTo(nextX, nextY);
            }
            else {
                // Default fallback
                 if (i === 0) ctx.moveTo(x, y); 
                ctx.lineTo(nextX, nextY);
            }
        }
        
        ctx.lineTo(CANVAS_WIDTH + 100, baseY); // Extend right
        ctx.lineTo(CANVAS_WIDTH + 100, CANVAS_HEIGHT); // Down to bottom-right
        ctx.lineTo(0, CANVAS_HEIGHT); // Back to bottom-left
        ctx.fill();
        ctx.globalAlpha = 1.0;
    };

    const drawPlayer = (ctx: CanvasRenderingContext2D, player: Player) => {
        if (player.isInvincible && Math.floor(Date.now() / 50) % 2 === 0) return;
        ctx.save(); ctx.translate(player.x + player.width/2, player.y + player.height/2); ctx.rotate(player.angle);
        
        // Sleigh
        ctx.fillStyle = "#b91c1c"; 
        ctx.beginPath(); ctx.roundRect(-30, 0, 60, 20, 5); ctx.fill();
        // Sleigh Trim
        ctx.strokeStyle = "#fbbf24"; ctx.lineWidth=3;
        ctx.beginPath(); ctx.moveTo(-25, 20); ctx.quadraticCurveTo(0, 25, 25, 20); ctx.stroke();
        
        // Time Warp Effect Aura
        if (player.timeWarpTimer > 0) {
            ctx.strokeStyle = "#d8b4fe"; ctx.lineWidth = 2; ctx.setLineDash([5, 5]);
            ctx.beginPath(); ctx.arc(0, 0, 50, 0, Math.PI*2); ctx.stroke(); ctx.setLineDash([]);
        }
        
        // Santa
        ctx.fillStyle = "#fca5a5"; ctx.beginPath(); ctx.arc(0, -10, 8, 0, Math.PI*2); ctx.fill(); // Head
        ctx.fillStyle = "#ef4444"; ctx.beginPath(); ctx.moveTo(-8, -14); ctx.lineTo(8, -14); ctx.lineTo(0, -28); ctx.fill(); // Hat
        
        ctx.restore();
    };

    const drawObstacle = (ctx: CanvasRenderingContext2D, o: Obstacle, style: TerrainStyle) => {
        ctx.save(); ctx.translate(o.x, o.y);
        
        // Dynamic obstacle coloring based on biome
        let color = "#fff";
        if (style === 'INDUSTRIAL') color = "#a1a1aa";
        if (style === 'FRACTURED') color = "#c084fc";
        if (style === 'SPIKES') color = "#ef4444";

        if (o.type === 'GEAR') drawGear(ctx, 30, 30, 25, 6, o.rotation || 0, "#71717a");
        else if (o.type === 'GLITCH_BLOCK') {
            ctx.fillStyle = `rgb(${Math.random()*255},0,${Math.random()*255})`;
            ctx.shadowColor = "cyan"; ctx.shadowBlur = 10;
            ctx.fillRect(0,0, o.width, o.height);
            ctx.shadowBlur = 0;
        } else if (o.type === 'BUILDING') {
            ctx.fillStyle = "#3f3f46";
            ctx.fillRect(0,0, o.width, o.height);
            // Windows
            ctx.fillStyle = "#fef08a";
            for(let wx=5; wx<o.width; wx+=15) {
                for(let wy=5; wy<o.height; wy+=15) {
                     if (Math.random()>0.3) ctx.fillRect(wx, wy, 8, 8);
                }
            }
        } else {
            // Standard fallback
            ctx.fillStyle = color; 
            ctx.fillRect(0,0, o.width, o.height);
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
             ctx.fillStyle = "#fbbf24"; ctx.beginPath(); ctx.arc(l.width/2, 50, 40, 0, Math.PI*2); ctx.fill(); // Clock face
             // Hands
             ctx.strokeStyle="#000"; ctx.lineWidth=3;
             ctx.beginPath(); ctx.moveTo(l.width/2, 50); ctx.lineTo(l.width/2, 20); ctx.stroke();
             ctx.beginPath(); ctx.moveTo(l.width/2, 50); ctx.lineTo(l.width/2 + 20, 60); ctx.stroke();
        } else if (l.type === 'RUINS') {
             ctx.fillStyle = "#334155"; 
             ctx.beginPath(); ctx.moveTo(0, l.height); ctx.lineTo(50, 0); ctx.lineTo(100, l.height); ctx.fill();
             ctx.beginPath(); ctx.moveTo(120, l.height); ctx.lineTo(150, 50); ctx.lineTo(200, l.height); ctx.fill();
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
    </div>
  );
};

export default GameCanvas;
