
import React, { useEffect, useState, useRef } from 'react';
import { Gift, Zap } from 'lucide-react';

interface VictorySequenceProps {
  onRestart: () => void;
}

const VictorySequence: React.FC<VictorySequenceProps> = ({ onRestart }) => {
  const [stage, setStage] = useState(0);
  const [showButton, setShowButton] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    // Stage 0: Silence/Black
    // Stage 1: Santa Stabilizes Time (Flash)
    const t1 = setTimeout(() => setStage(1), 1000); 
    // Stage 2: The Rift Opens (Visuals)
    const t2 = setTimeout(() => setStage(2), 3000); 
    // Stage 3: Krampus Falls
    const t3 = setTimeout(() => setStage(3), 5000); 
    // Stage 4: Impact & Dialogue
    const t4 = setTimeout(() => setStage(4), 8000);
    // Stage 5: "To Be Continued" / Credits
    const t5 = setTimeout(() => { setStage(5); setShowButton(true); }, 14000);

    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); clearTimeout(t5); };
  }, []);

  // Animation Loop for Rift
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    let frame = 0;
    const render = () => {
        frame++;
        ctx.clearRect(0,0, canvas.width, canvas.height);
        const center = { x: canvas.width/2, y: canvas.height/3 };
        
        if (stage >= 2) {
            // Draw Rift
            ctx.save();
            ctx.translate(center.x, center.y);
            // Swirling Portal
            for(let i=0; i<20; i++) {
                ctx.rotate(frame * 0.01 + i);
                ctx.fillStyle = `hsla(${270 + i*5}, 80%, 50%, ${0.1})`;
                ctx.beginPath(); ctx.arc(0, 0, 50 + i*5 + Math.sin(frame*0.1)*10, 0, Math.PI*2); ctx.fill();
            }
            // Lightning
            if (Math.random() > 0.8) {
                ctx.strokeStyle = "#fff"; ctx.lineWidth = 2;
                ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo((Math.random()-0.5)*100, 100); ctx.stroke();
            }
            ctx.restore();
        }

        if (stage === 3) {
            // Falling Krampus Figure
            const fallY = Math.min(canvas.height - 100, center.y + (frame * 5) % 400); 
            ctx.fillStyle = "#000";
            ctx.beginPath(); ctx.arc(center.x, fallY, 20, 0, Math.PI*2); ctx.fill();
            // Horns
            ctx.beginPath(); ctx.moveTo(center.x-15, fallY-10); ctx.lineTo(center.x-25, fallY-30); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(center.x+15, fallY-10); ctx.lineTo(center.x+25, fallY-30); ctx.stroke();
        }

        if (stage >= 4) {
            // Crashed Figure in Snow
            const groundY = canvas.height - 80;
            ctx.fillStyle = "#1e1e1e";
            ctx.beginPath(); ctx.ellipse(center.x, groundY, 30, 15, 0, 0, Math.PI*2); ctx.fill();
            // Smoke
            ctx.fillStyle = "rgba(100,100,100,0.5)";
            ctx.beginPath(); ctx.arc(center.x + Math.sin(frame*0.1)*10, groundY - 20 - frame*0.2, 10, 0, Math.PI*2); ctx.fill();
        }
        
        requestAnimationFrame(render);
    };
    render();
  }, [stage]);

  return (
    <div className="absolute inset-0 bg-black z-50 flex flex-col items-center justify-center overflow-hidden text-white font-tech">
      <canvas ref={canvasRef} width={800} height={600} className="absolute inset-0 w-full h-full" />
      
      {/* Dialogue Overlay */}
      {stage === 4 && (
          <div className="absolute bottom-20 bg-slate-900/90 border border-slate-600 p-6 max-w-lg text-center rounded-xl animate-fade-in-up">
              <p className="text-red-500 font-bold uppercase tracking-widest mb-2">Unknown Entity</p>
              <p className="text-2xl font-mono text-white typing-effect">"Santa... the timeline... it's broken..."</p>
          </div>
      )}

      {/* Credits */}
      {stage === 5 && (
          <div className="absolute inset-0 bg-black flex flex-col items-center justify-center animate-fade-in space-y-8">
               <h1 className="text-6xl font-christmas text-red-600 mb-4">TO BE CONTINUED</h1>
               <h2 className="text-3xl font-mono text-purple-400">IN SLEIGH RIDE 4</h2>
               
               <div className="text-slate-400 text-sm space-y-2 text-center mt-8">
                   <p>Director: Santa Claus</p>
                   <p>Guest Star: Krampus (From The Future)</p>
                   <p>System: Chrono-Stable</p>
               </div>

               {showButton && (
                  <button 
                    onClick={onRestart}
                    className="mt-12 px-8 py-3 bg-white text-black font-bold rounded-full hover:scale-110 transition-transform"
                  >
                    Reboot Timeline
                  </button>
               )}
          </div>
      )}
    </div>
  );
};

export default VictorySequence;