import React, { useEffect, useRef } from 'react';
import { ConnectionState } from '../types';

interface VisualizerProps {
  volume: number;
  state: ConnectionState;
}

const Visualizer: React.FC<VisualizerProps> = ({ volume, state }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let time = 0;

    // Blink state
    let blinkState = 0; // 0: open, 1: closing, 2: opening
    let eyeHeight = 1;
    let nextBlinkTime = Math.random() * 200 + 100;

    const render = () => {
      time++;
      
      // Resize
      canvas.width = canvas.clientWidth;
      canvas.height = canvas.clientHeight;
      const w = canvas.width;
      const h = canvas.height;
      
      ctx.clearRect(0, 0, w, h);

      // --- COLORS ---
      const primaryColor = state === ConnectionState.ERROR ? '#EF4444' : 
                           state === ConnectionState.CONNECTED ? '#22D3EE' : 
                           '#EAB308';
      const secondaryColor = state === ConnectionState.ERROR ? '#7F1D1D' : 
                             state === ConnectionState.CONNECTED ? '#0891B2' : 
                             '#713F12';

      // --- BLINK LOGIC ---
      if (time > nextBlinkTime) {
         if (blinkState === 0) blinkState = 1;
      }
      if (blinkState === 1) {
         eyeHeight -= 0.1;
         if (eyeHeight <= 0.1) {
            eyeHeight = 0.1;
            blinkState = 2;
         }
      } else if (blinkState === 2) {
         eyeHeight += 0.1;
         if (eyeHeight >= 1) {
            eyeHeight = 1;
            blinkState = 0;
            nextBlinkTime = time + Math.random() * 200 + 100;
         }
      }

      // --- DRAW EYES ---
      const eyeWidth = 80;
      const maxEyeH = 40;
      const eyeY = h * 0.35;
      const leftEyeX = w * 0.35;
      const rightEyeX = w * 0.65;

      ctx.save();
      ctx.shadowBlur = 20;
      ctx.shadowColor = primaryColor;
      ctx.fillStyle = primaryColor;

      // Left Eye
      ctx.beginPath();
      ctx.ellipse(leftEyeX, eyeY, eyeWidth/2, (maxEyeH * eyeHeight)/2, 0, 0, Math.PI * 2);
      ctx.fill();
      
      // Right Eye
      ctx.beginPath();
      ctx.ellipse(rightEyeX, eyeY, eyeWidth/2, (maxEyeH * eyeHeight)/2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // --- DRAW HUD RINGS (Face Outline) ---
      ctx.save();
      ctx.strokeStyle = secondaryColor;
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.5;
      
      // Outer ring
      ctx.beginPath();
      ctx.arc(w/2, h/2, 110, 0 + time*0.01, Math.PI + time*0.01);
      ctx.stroke();
      
      // Inner ring segments
      ctx.beginPath();
      ctx.arc(w/2, h/2, 90, Math.PI + time*0.02, Math.PI*1.5 + time*0.02);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(w/2, h/2, 90, 0 - time*0.02, 1 - time*0.02);
      ctx.stroke();
      ctx.restore();


      // --- DRAW MOUTH (Voice Core) ---
      // The mouth reacts to volume
      const mouthY = h * 0.65;
      const mouthW = 100;
      const bars = 10;
      const spacing = 6;
      const barW = (mouthW - (bars-1)*spacing) / bars;

      ctx.save();
      ctx.fillStyle = primaryColor;
      ctx.shadowBlur = 15;
      ctx.shadowColor = primaryColor;
      
      // Center the mouth group
      const startX = w/2 - mouthW/2;

      for (let i = 0; i < bars; i++) {
        // Create a wave effect across bars + volume influence
        const wave = Math.sin(time * 0.1 + i * 0.5) * 0.5 + 0.5;
        // Volume impact
        const barH = 5 + (volume * 100) * (i % 2 === 0 ? 1 : 0.8) + (wave * 5);
        
        const x = startX + i * (barW + spacing);
        
        // Draw rounded rect bar
        ctx.beginPath();
        ctx.roundRect(x, mouthY - barH/2, barW, barH, 2);
        ctx.fill();
      }
      ctx.restore();

      // --- TEXT STATUS ---
      ctx.fillStyle = primaryColor;
      ctx.font = '10px Rajdhani';
      ctx.textAlign = 'center';
      ctx.globalAlpha = 0.8;
      let statusText = "STANDBY";
      if (state === ConnectionState.CONNECTING) statusText = "INITIALIZING...";
      if (state === ConnectionState.CONNECTED) statusText = volume > 0.1 ? "PROCESSING AUDIO" : "ONLINE";
      if (state === ConnectionState.ERROR) statusText = "SYSTEM FAILURE";
      
      ctx.fillText(statusText, w/2, h - 20);

      animationId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animationId);
  }, [volume, state]);

  return (
    <canvas ref={canvasRef} className="w-full h-full" />
  );
};

export default Visualizer;