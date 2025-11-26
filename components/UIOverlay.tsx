
import React, { useEffect, useState } from 'react';
import { Heart, Snowflake, Clock, Zap, Sparkles, Plus, Mail, Hourglass } from 'lucide-react';
import { Player, PowerupType, DialogueLine } from '../types.ts';
import { POWERUP_COLORS } from '../constants.ts';

interface UIOverlayProps {
  lives: number;
  snowballs: number;
  progress: number;
  timeLeft: number;
  activePowerups: number; // Sum of timers
  currentLevelName: string;
  score: number;
  collectedPowerups: { id: number; type: PowerupType }[];
  activeDialogue: DialogueLine | null;
  activeWish: string | null;
}

const UIOverlay: React.FC<UIOverlayProps> = ({
  lives, snowballs, progress, timeLeft, currentLevelName, score, collectedPowerups, activeDialogue, activeWish
}) => {
  const [popups, setPopups] = useState<{id: number, type: PowerupType}[]>([]);

  useEffect(() => {
    if (collectedPowerups.length > 0) setPopups(prev => [...prev, ...collectedPowerups]);
  }, [collectedPowerups]);

  const getPowerupConfig = (type: PowerupType) => {
      switch (type) {
          case PowerupType.SPEED: return { icon: Zap, label: "SPEED UP!", color: POWERUP_COLORS[type] };
          case PowerupType.SNOWBALLS: return { icon: Snowflake, label: "AMMO!", color: POWERUP_COLORS[type] };
          case PowerupType.BLAST: return { icon: Sparkles, label: "BLAST!", color: POWERUP_COLORS[type] };
          case PowerupType.HEALING: return { icon: Plus, label: "HEAL!", color: POWERUP_COLORS[type] };
          case PowerupType.TIME_WARP: return { icon: Hourglass, label: "TIME FREEZE!", color: POWERUP_COLORS[type] };
          default: return { icon: Zap, label: "POWERUP!", color: "#fff" };
      }
  };
  
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div className="absolute inset-0 flex flex-col justify-between p-6 pointer-events-none z-20 font-tech">
      
      {/* Powerups Popup */}
      <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
        {popups.map(p => {
            const { icon: Icon, label, color } = getPowerupConfig(p.type);
            return (
                <div key={p.id} className="absolute animate-powerup-pop flex flex-col items-center justify-center" onAnimationEnd={() => setPopups(prev => prev.filter(x => x.id !== p.id))}>
                    <div className="p-4 rounded-full bg-white/10 backdrop-blur-md shadow-[0_0_30px_currentColor] border-2 border-white/50 mb-2" style={{ color }}>
                        <Icon size={48} strokeWidth={2.5} />
                    </div>
                    <span className="font-black text-2xl uppercase tracking-wider text-stroke" style={{ color }}>{label}</span>
                </div>
            );
        })}
      </div>

      {/* Narrative Dialogue */}
      {activeDialogue && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/80 to-transparent pb-8 pt-12 flex justify-center animate-slide-up z-20">
             <div className="flex flex-col items-center text-center max-w-3xl px-4">
                <h4 className={`font-bold uppercase text-sm tracking-[0.2em] mb-1 ${activeDialogue.speaker === 'Timekeeper' ? 'text-purple-400' : 'text-yellow-400'}`}>
                    [{activeDialogue.speaker}]
                </h4>
                <p className="text-2xl text-white font-mono tracking-wide leading-snug drop-shadow-lg border-l-4 border-purple-500 pl-4 bg-black/50 p-2">
                    "{activeDialogue.text}"
                </p>
             </div>
          </div>
      )}

      {/* Top HUD */}
      <div className="flex items-start justify-between w-full z-10">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-1 p-2 bg-slate-900/60 backdrop-blur-md rounded-2xl border border-white/10">
            {[1, 2, 3].map((i) => (
                <div key={i} className="text-red-500 drop-shadow-[0_0_5px_rgba(239,68,68,0.8)]">
                   <Heart fill={i <= lives ? "currentColor" : "none"} stroke="currentColor" className={i > lives ? "opacity-30" : ""} size={32} />
                </div>
            ))}
          </div>
          <div className="flex items-center gap-3 bg-cyan-900/40 backdrop-blur-md px-4 py-2 rounded-full border border-cyan-500/30">
            <Snowflake size={20} className="text-cyan-300" />
            <span className="font-black text-xl text-cyan-100">{snowballs}</span>
          </div>
        </div>

        <div className="flex flex-col items-center">
          <div className="flex items-center gap-3 text-3xl font-black px-6 py-2 rounded-xl bg-slate-900/60 border border-slate-700 text-purple-300 backdrop-blur-md">
            <Clock size={28} />
            <span className="tabular-nums tracking-widest font-mono">{formatTime(timeLeft)}</span>
          </div>
          <div className="mt-2 text-center">
            <h2 className="text-white font-christmas text-3xl drop-shadow-md tracking-wide">{currentLevelName}</h2>
          </div>
        </div>

        <div className="bg-slate-900/60 backdrop-blur-md px-6 py-3 rounded-2xl border border-slate-700 text-right">
            <div className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mb-1">Timeline Stability</div>
            <div className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-b from-purple-300 to-purple-600 tabular-nums">
                {Math.floor(score).toLocaleString()}
            </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full max-w-3xl mx-auto mb-12 z-10 opacity-80">
         <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full bg-purple-500 transition-all duration-200" style={{ width: `${progress}%` }} />
         </div>
      </div>
    </div>
  );
};

export default UIOverlay;