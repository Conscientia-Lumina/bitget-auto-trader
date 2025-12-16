'use client';

import { useEffect, useRef, useState } from 'react';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';

interface Dot {
  x: number;
  y: number;
  baseX: number;
  baseY: number;
  vx: number;
  vy: number;
}

interface DotGridBackgroundProps {
  dotSize?: number;
  gap?: number;
  className?: string;
}

export function DotGridBackground({
  dotSize = 1,
  gap = 28,
  className,
}: DotGridBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: -1000, y: -1000, isMoving: false, lastMoveTime: 0 });
  const dotsRef = useRef<Dot[]>([]);
  const animationRef = useRef<number>();
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Theme-based colors - much more subtle
    const baseColor = resolvedTheme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';
    const glowColor1 = resolvedTheme === 'dark' ? '#1297a1' : '#9805b5';
    const glowColor2 = resolvedTheme === 'dark' ? '#6366f1' : '#ec4899';

    const createGlowGradient = (x: number, y: number, radius: number) => {
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius * 3);
      gradient.addColorStop(0, glowColor1);
      gradient.addColorStop(0.5, glowColor2);
      gradient.addColorStop(1, 'transparent');
      return gradient;
    };

    const initDots = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      dotsRef.current = [];
      
      for (let x = gap; x < width; x += gap) {
        for (let y = gap; y < height; y += gap) {
          dotsRef.current.push({
            x,
            y,
            baseX: x,
            baseY: y,
            vx: 0,
            vy: 0,
          });
        }
      }
    };

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      initDots();
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = { 
        x: e.clientX, 
        y: e.clientY, 
        isMoving: true,
        lastMoveTime: Date.now()
      };
    };

    const handleMouseLeave = () => {
      mouseRef.current = { x: -1000, y: -1000, isMoving: false, lastMoveTime: 0 };
    };

    const draw = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const mouse = mouseRef.current;
      const proximity = 100;
      const pushStrength = 30;
      const returnSpeed = 0.08;
      const friction = 0.85;
      
      // Check if mouse has been stationary for more than 150ms
      const timeSinceMove = Date.now() - mouse.lastMoveTime;
      const isActivelyMoving = mouse.isMoving && timeSinceMove < 150;

      ctx.clearRect(0, 0, width, height);

      for (const dot of dotsRef.current) {
        const dx = mouse.x - dot.x;
        const dy = mouse.y - dot.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Only push dots when mouse is actively moving
        if (isActivelyMoving && distance < proximity && distance > 0) {
          const force = (proximity - distance) / proximity;
          const angle = Math.atan2(dy, dx);
          dot.vx -= Math.cos(angle) * force * pushStrength * 0.1;
          dot.vy -= Math.sin(angle) * force * pushStrength * 0.1;
        }
        
        // Return to base position with spring effect
        const returnDx = dot.baseX - dot.x;
        const returnDy = dot.baseY - dot.y;
        dot.vx += returnDx * returnSpeed;
        dot.vy += returnDy * returnSpeed;
        
        // Apply friction
        dot.vx *= friction;
        dot.vy *= friction;
        
        // Update position
        dot.x += dot.vx;
        dot.y += dot.vy;
        
        // Calculate glow based on displacement only (not proximity)
        const displacement = Math.sqrt(
          Math.pow(dot.x - dot.baseX, 2) + 
          Math.pow(dot.y - dot.baseY, 2)
        );
        const isActive = displacement > 0.5;
        const intensity = Math.min(displacement / 15, 1);
        
        // Draw dot
        ctx.beginPath();
        const size = dotSize + (intensity * 1.5);
        ctx.arc(dot.x, dot.y, size, 0, Math.PI * 2);
        
        if (isActive && intensity > 0.1) {
          const gradient = createGlowGradient(dot.x, dot.y, size);
          ctx.fillStyle = gradient;
          ctx.globalAlpha = 0.3 + (intensity * 0.7);
          ctx.shadowBlur = 8 * intensity;
          ctx.shadowColor = glowColor1;
        } else {
          ctx.fillStyle = baseColor;
          ctx.globalAlpha = 1;
          ctx.shadowBlur = 0;
        }
        
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;
      }

      animationRef.current = requestAnimationFrame(draw);
    };

    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseleave', handleMouseLeave);
    draw();

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [mounted, dotSize, gap, resolvedTheme]);

  return (
    <canvas
      ref={canvasRef}
      className={cn(
        'fixed inset-0 pointer-events-none z-0',
        className
      )}
      aria-hidden="true"
    />
  );
}
