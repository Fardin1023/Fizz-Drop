import React, { useMemo } from 'react';

interface AnimatedFizzdropBackdropProps {
  className?: string;
  subtitle?: string;
}

export const AnimatedFizzdropBackdrop: React.FC<AnimatedFizzdropBackdropProps> = ({
  className = '',
  subtitle = 'REFRESHING THE NATION • DISTRIBUTED COMMERCE',
}) => {
  // Pre-generate stable random bubbles for smooth carbonation fizz
  const bubbles = useMemo(() => {
    return Array.from({ length: 18 }).map((_, i) => ({
      id: i,
      left: `${(i * 5.6 + Math.sin(i * 1.5) * 3 + 2).toFixed(1)}%`,
      size: `${Math.floor(6 + (i % 5) * 4)}px`,
      duration: `${(9 + (i % 7) * 2.2).toFixed(1)}s`,
      delay: `${((i * 0.7) % 8).toFixed(1)}s`,
      opacity: 0.2 + (i % 4) * 0.15,
      blur: i % 3 === 0 ? 'blur-xs' : '',
    }));
  }, []);

  return (
    <div
      className={`absolute inset-0 pointer-events-none select-none overflow-hidden flex items-center justify-center z-0 ${className}`}
      aria-hidden="true"
    >
      {/* 1. Ambient Dynamic Cyan-White Glow Orbs */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[70vw] max-w-4xl h-[45vh] bg-radial from-cyan-400/20 via-teal-500/10 to-transparent blur-3xl rounded-full pointer-events-none animate-pulse" />
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[45vw] max-w-2xl h-[30vh] bg-radial from-white/20 via-cyan-300/15 to-transparent blur-2xl rounded-full pointer-events-none"
        style={{ animation: 'pulse 5s ease-in-out infinite 1s' }}
      />

      {/* 2. Floating Carbonation Fizz Particles */}
      <div className="absolute inset-0 overflow-hidden">
        {bubbles.map((b) => (
          <div
            key={b.id}
            className={`absolute bottom-0 rounded-full bg-gradient-to-t from-cyan-300 to-white animate-fizz-bubble ${b.blur}`}
            style={{
              left: b.left,
              width: b.size,
              height: b.size,
              animationDuration: b.duration,
              animationDelay: b.delay,
              opacity: b.opacity,
              boxShadow: '0 0 12px rgba(34, 211, 238, 0.8), 0 0 4px rgba(255, 255, 255, 0.9)',
            }}
          />
        ))}
      </div>

      {/* 3. Deep Ambient Cyan Shadow/Blur Text (Echo Layer) */}
      <div
        className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 font-oswald font-black uppercase tracking-[0.18em] text-[13vw] sm:text-[15vw] md:text-[18vw] lg:text-[20vw] leading-none whitespace-nowrap text-cyan-400/25 blur-2xl animate-fizzdrop-outline"
        style={{ userSelect: 'none' }}
      >
        FIZZDROP
      </div>

      {/* 4. Giant Hologram Outline Echo (Layer 2) */}
      <div
        className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 font-oswald font-black uppercase tracking-[0.2em] text-[13.5vw] sm:text-[15.5vw] md:text-[18.5vw] lg:text-[20.5vw] leading-none whitespace-nowrap text-transparent animate-fizzdrop-outline"
        style={{
          WebkitTextStroke: '1.5px rgba(103, 232, 249, 0.35)',
          userSelect: 'none',
        }}
      >
        FIZZDROP
      </div>

      {/* 5. Main Primary Animated Cyan-White FIZZDROP Text */}
      <div className="relative flex flex-col items-center justify-center">
        <h1
          className="font-oswald font-black uppercase text-[12.5vw] sm:text-[14.5vw] md:text-[17.5vw] lg:text-[19.5vw] leading-none whitespace-nowrap animate-fizzdrop-text animate-fizzdrop-shimmer bg-gradient-to-r from-cyan-400 via-white via-cyan-100 to-cyan-300 bg-clip-text text-transparent transition-all"
          style={{
            userSelect: 'none',
            textShadow: '0 0 30px rgba(34, 211, 238, 0.4), 0 0 70px rgba(255, 255, 255, 0.25)',
          }}
        >
          FIZZDROP
        </h1>

        {/* Elegant Futuristic Cyan Watermark Tagline */}
        <div className="flex items-center gap-2 px-3.5 py-1 rounded-full bg-cyan-950/40 border border-cyan-400/25 backdrop-blur-md -mt-3 sm:-mt-6 opacity-60 animate-pulse">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-300 animate-ping" />
          <span className="text-[9px] sm:text-[11px] font-mono font-bold tracking-[0.25em] text-cyan-200 uppercase">
            {subtitle}
          </span>
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-300" />
        </div>
      </div>
    </div>
  );
};
