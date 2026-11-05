import React, { useRef, useState, useEffect } from 'react';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Sparkles,
  Snowflake,
  ShieldCheck,
  Zap,
  ArrowRight,
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface RgbColor {
  r: number;
  g: number;
  b: number;
}

// Enhance color saturation and ensure a luminous radiant glow
const enhanceColor = (r: number, g: number, b: number, boost: number = 1.35): RgbColor => {
  const max = Math.max(r, g, b);

  // If totally dark frame or fade transition, provide a luminous baseline neon cyan
  if (max < 30) {
    return { r: 6, g: 182, b: 212 };
  }

  // Boost color saturation around the RGB channel average
  const avg = (r + g + b) / 3;
  let nr = Math.min(255, Math.max(0, Math.round(avg + (r - avg) * boost)));
  let ng = Math.min(255, Math.max(0, Math.round(avg + (g - avg) * boost)));
  let nb = Math.min(255, Math.max(0, Math.round(avg + (b - avg) * boost)));

  // Ensure radiant minimum luminance so the neon edge glow is always vivid
  const lum = 0.299 * nr + 0.587 * ng + 0.114 * nb;
  if (lum < 75) {
    const scale = 75 / (lum || 1);
    nr = Math.min(255, Math.round(nr * scale));
    ng = Math.min(255, Math.round(ng * scale));
    nb = Math.min(255, Math.round(nb * scale));
  }

  return { r: nr, g: ng, b: nb };
};

export const BrandVideoSection: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [isMuted, setIsMuted] = useState<boolean>(true);
  const [progress, setProgress] = useState<number>(0);
  const [isHovered, setIsHovered] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Dynamic edge glow colors sampled in real-time from the video frames
  const [edgeColors, setEdgeColors] = useState<{
    left: RgbColor;
    center: RgbColor;
    right: RgbColor;
  }>({
    left: { r: 6, g: 182, b: 212 },    // default cyan-400
    center: { r: 99, g: 102, b: 241 },  // default indigo-500
    right: { r: 236, g: 72, b: 153 },  // default fuchsia-500
  });

  // Auto-play when in view, pause when scrolled away to conserve device resources
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            video.play().then(() => setIsPlaying(true)).catch(() => {});
          } else {
            video.pause();
            setIsPlaying(false);
          }
        });
      },
      { threshold: 0.3 }
    );

    observer.observe(video);
    return () => observer.disconnect();
  }, []);

  // Real-time canvas frame color sampling for dynamic edge glow
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const canvas = document.createElement('canvas');
    canvas.width = 16;
    canvas.height = 9;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    let animFrameId: number;
    let lastSampleTime = 0;

    const sampleColors = (now: number) => {
      // Sample every ~60ms (~16fps) for smooth responsiveness with minimal CPU usage
      if (now - lastSampleTime > 60 && !video.paused && !video.ended && video.readyState >= 2) {
        lastSampleTime = now;
        try {
          ctx.drawImage(video, 0, 0, 16, 9);
          const { data } = ctx.getImageData(0, 0, 16, 9);

          let lR = 0, lG = 0, lB = 0, lCount = 0;
          let cR = 0, cG = 0, cB = 0, cCount = 0;
          let rR = 0, rG = 0, rB = 0, rCount = 0;

          // Sample left, center, and right regions across active rows
          for (let y = 1; y < 8; y++) {
            for (let x = 0; x < 16; x++) {
              const idx = (y * 16 + x) * 4;
              const r = data[idx];
              const g = data[idx + 1];
              const b = data[idx + 2];

              if (x <= 4) {
                lR += r; lG += g; lB += b; lCount++;
              } else if (x <= 10) {
                cR += r; cG += g; cB += b; cCount++;
              } else {
                rR += r; rG += g; rB += b; rCount++;
              }
            }
          }

          if (lCount > 0 && cCount > 0 && rCount > 0) {
            setEdgeColors({
              left: enhanceColor(lR / lCount, lG / lCount, lB / lCount, 1.35),
              center: enhanceColor(cR / cCount, cG / cCount, cB / cCount, 1.45),
              right: enhanceColor(rR / rCount, rG / rCount, rB / rCount, 1.35),
            });
          }
        } catch {
          // Graceful fallback
        }
      }

      animFrameId = requestAnimationFrame(sampleColors);
    };

    animFrameId = requestAnimationFrame(sampleColors);

    return () => {
      cancelAnimationFrame(animFrameId);
    };
  }, []);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play();
      setIsPlaying(true);
    } else {
      video.pause();
      setIsPlaying(false);
    }
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setIsMuted(video.muted);
  };

  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video || !video.duration) return;
    setProgress((video.currentTime / video.duration) * 100);
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const video = videoRef.current;
    if (!video || !video.duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    video.currentTime = pos * video.duration;
  };

  const toggleFullscreen = () => {
    const container = containerRef.current;
    if (!container) return;

    if (!document.fullscreenElement) {
      container.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  return (
    <section className="relative w-full py-16 sm:py-20 lg:py-24 overflow-hidden bg-gradient-to-b from-transparent via-slate-50/60 to-transparent dark:via-zinc-900/40">
      {/* Ambient background glow orbs adapting dynamically to the video color */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[750px] h-[450px] rounded-full blur-3xl pointer-events-none -z-10 transition-all duration-700"
        style={{
          background: `radial-gradient(ellipse at center, rgba(${edgeColors.center.r}, ${edgeColors.center.g}, ${edgeColors.center.b}, 0.22) 0%, rgba(${edgeColors.right.r}, ${edgeColors.right.g}, ${edgeColors.right.b}, 0.12) 50%, transparent 80%)`,
        }}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-14 space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-50 dark:bg-cyan-950/50 border border-cyan-200/80 dark:border-cyan-800/80 text-cyan-700 dark:text-cyan-300 text-xs font-bold tracking-wider uppercase shadow-xs">
            <Sparkles className="w-3.5 h-3.5 text-cyan-500 animate-pulse" />
            <span>The FizzDrop Experience</span>
          </div>

          <h2 className="font-oswald text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
            Feel The Chill.{' '}
            <span
              className="bg-clip-text text-transparent transition-all duration-500"
              style={{
                backgroundImage: `linear-gradient(135deg, rgb(${edgeColors.left.r}, ${edgeColors.left.g}, ${edgeColors.left.b}), rgb(${edgeColors.center.r}, ${edgeColors.center.g}, ${edgeColors.center.b}), rgb(${edgeColors.right.r}, ${edgeColors.right.g}, ${edgeColors.right.b}))`,
              }}
            >
              Taste The Fizz.
            </span>
          </h2>

          <p className="text-slate-600 dark:text-zinc-400 text-sm sm:text-base leading-relaxed">
            From state-of-the-art regional cold depots to authorized franchise outlets, witness the relentless freshness and sub-zero logistics powering every single drop.
          </p>
        </div>

        {/* Video Player Showcase Frame with Dynamic Edge Glow */}
        <div className="relative mx-auto max-w-5xl group">
          {/* Animated Glowing Edge Backdrop dynamically adapting to video frames */}
          <div
            aria-hidden="true"
            className="absolute -inset-1 sm:-inset-1.5 rounded-[2.25rem] sm:rounded-[2.75rem] opacity-90 blur-md group-hover:opacity-100 pointer-events-none"
            style={{
              background: `linear-gradient(135deg, rgb(${edgeColors.left.r}, ${edgeColors.left.g}, ${edgeColors.left.b}), rgb(${edgeColors.center.r}, ${edgeColors.center.g}, ${edgeColors.center.b}), rgb(${edgeColors.right.r}, ${edgeColors.right.g}, ${edgeColors.right.b}), rgb(${edgeColors.left.r}, ${edgeColors.left.g}, ${edgeColors.left.b}))`,
              filter: `drop-shadow(0 0 24px rgba(${edgeColors.center.r}, ${edgeColors.center.g}, ${edgeColors.center.b}, 0.85)) drop-shadow(0 0 48px rgba(${edgeColors.right.r}, ${edgeColors.right.g}, ${edgeColors.right.b}, 0.55))`,
              transition: 'background 400ms ease, filter 400ms ease',
            }}
          />

          <div
            ref={containerRef}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className="relative rounded-3xl sm:rounded-[2.5rem] p-1.5 sm:p-2.5 bg-gradient-to-b from-white/95 via-slate-900/90 to-slate-950/95 dark:from-zinc-900/90 dark:via-zinc-950/95 dark:to-black border shadow-2xl backdrop-blur-xl overflow-hidden"
            style={{
              borderColor: `rgba(${edgeColors.center.r}, ${edgeColors.center.g}, ${edgeColors.center.b}, 0.45)`,
              boxShadow: `0 20px 50px -10px rgba(${edgeColors.center.r}, ${edgeColors.center.g}, ${edgeColors.center.b}, 0.35)`,
              transition: 'border-color 400ms ease, box-shadow 400ms ease',
            }}
          >
            {/* Inner Video Container */}
            <div className="relative w-full aspect-video rounded-2xl sm:rounded-[2rem] overflow-hidden bg-slate-950 shadow-inner ring-1 ring-white/15">
              <video
                ref={videoRef}
                src="/videos/brand_ad.mp4"
                crossOrigin="anonymous"
                className="w-full h-full object-cover cursor-pointer"
                playsInline
                muted
                loop
                autoPlay
                onClick={togglePlay}
                onTimeUpdate={handleTimeUpdate}
              />

              {/* Top Badge: Spotlight Tag Synced with Video Theme */}
              <div
                className="absolute top-4 left-4 sm:top-6 sm:left-6 z-20 pointer-events-none flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/80 backdrop-blur-md border text-white text-[11px] font-mono tracking-wider shadow-lg"
                style={{
                  borderColor: `rgba(${edgeColors.center.r}, ${edgeColors.center.g}, ${edgeColors.center.b}, 0.5)`,
                  transition: 'border-color 400ms ease',
                }}
              >
                <span
                  className="w-2 h-2 rounded-full animate-pulse"
                  style={{
                    backgroundColor: `rgb(${edgeColors.center.r}, ${edgeColors.center.g}, ${edgeColors.center.b})`,
                    boxShadow: `0 0 10px rgb(${edgeColors.center.r}, ${edgeColors.center.g}, ${edgeColors.center.b})`,
                    transition: 'background-color 400ms ease, box-shadow 400ms ease',
                  }}
                />
                <span
                  className="font-bold tracking-wider"
                  style={{
                    color: `rgb(${edgeColors.center.r}, ${edgeColors.center.g}, ${edgeColors.center.b})`,
                    transition: 'color 400ms ease',
                  }}
                >
                  DYNAMIC CAN EVOLUTION
                </span>
              </div>

              {/* Floating Center Play/Pause Indicator (shown on hover or when paused) */}
              <div
                onClick={togglePlay}
                className={`absolute inset-0 z-10 flex items-center justify-center transition-opacity duration-300 cursor-pointer ${
                  !isPlaying || isHovered ? 'opacity-100 bg-slate-950/20' : 'opacity-0'
                }`}
              >
                <button
                  type="button"
                  className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-white/90 hover:bg-white text-slate-900 flex items-center justify-center shadow-xl hover:scale-105 active:scale-95 transition-all backdrop-blur-md cursor-pointer"
                  title={isPlaying ? 'Pause Video' : 'Play Video'}
                >
                  {isPlaying ? (
                    <Pause className="w-6 h-6 fill-current text-slate-900" />
                  ) : (
                    <Play className="w-6 h-6 fill-current text-slate-900 ml-1" />
                  )}
                </button>
              </div>

              {/* Bottom Controls Bar (Fades in on hover or when paused) */}
              <div
                className={`absolute bottom-0 inset-x-0 z-20 p-4 sm:p-6 bg-gradient-to-t from-slate-950/90 via-slate-950/60 to-transparent transition-opacity duration-300 flex flex-col gap-2.5 ${
                  isHovered || !isPlaying ? 'opacity-100' : 'opacity-0 sm:opacity-0'
                }`}
              >
                {/* Progress Bar / Scrubber */}
                <div
                  onClick={handleSeek}
                  className="w-full h-1.5 sm:h-2 bg-white/20 rounded-full cursor-pointer overflow-hidden group/bar relative"
                >
                  <div
                    className="h-full rounded-full transition-all duration-100 relative"
                    style={{
                      width: `${progress}%`,
                      background: `linear-gradient(90deg, rgb(${edgeColors.left.r}, ${edgeColors.left.g}, ${edgeColors.left.b}), rgb(${edgeColors.center.r}, ${edgeColors.center.g}, ${edgeColors.center.b}), rgb(${edgeColors.right.r}, ${edgeColors.right.g}, ${edgeColors.right.b}))`,
                      boxShadow: `0 0 10px rgba(${edgeColors.center.r}, ${edgeColors.center.g}, ${edgeColors.center.b}, 0.7)`,
                    }}
                  />
                </div>

                {/* Bar Actions */}
                <div className="flex items-center justify-between text-white text-xs">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={togglePlay}
                      className="p-1.5 rounded-lg hover:bg-white/20 transition-colors cursor-pointer text-white"
                      title={isPlaying ? 'Pause' : 'Play'}
                    >
                      {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                    </button>

                    <button
                      onClick={toggleMute}
                      className="flex items-center gap-1.5 p-1.5 px-2.5 rounded-lg bg-white/10 hover:bg-white/20 text-white font-medium text-xs transition-colors cursor-pointer"
                      title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
                    >
                      {isMuted ? (
                        <>
                          <VolumeX className="w-4 h-4 text-cyan-300" />
                          <span className="text-[11px] font-mono">Unmute</span>
                        </>
                      ) : (
                        <>
                          <Volume2 className="w-4 h-4 text-cyan-300" />
                          <span className="text-[11px] font-mono">Sound On</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="hidden sm:inline-block font-mono text-[11px] text-slate-300">
                      FIZZDROP 1080p HD
                    </span>
                    <button
                      onClick={toggleFullscreen}
                      className="p-1.5 rounded-lg hover:bg-white/20 transition-colors cursor-pointer text-white"
                      title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
                    >
                      <Maximize className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 3 Value Proposition Cards Under Video to Maintain Elegant White Space */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 mt-10 sm:mt-12">
          {/* Feature 1 */}
          <div className="p-5 sm:p-6 rounded-2xl sm:rounded-3xl bg-white dark:bg-zinc-900/60 border border-slate-200/80 dark:border-zinc-800/80 shadow-xs hover:shadow-md hover:border-cyan-500/30 transition-all group">
            <div className="w-10 h-10 rounded-xl bg-cyan-50 dark:bg-cyan-950/60 text-cyan-600 dark:text-cyan-400 flex items-center justify-center mb-3.5 group-hover:scale-110 transition-transform">
              <Snowflake className="w-5 h-5" />
            </div>
            <h3 className="font-oswald text-lg font-bold text-slate-900 dark:text-white uppercase tracking-wide">
              Sub-Zero Cold Chain
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400 mt-1 leading-relaxed">
              Every beverage is temperature-monitored through our regional depot network to ensure genuine crisp carbonation upon arrival.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="p-5 sm:p-6 rounded-2xl sm:rounded-3xl bg-white dark:bg-zinc-900/60 border border-slate-200/80 dark:border-zinc-800/80 shadow-xs hover:shadow-md hover:border-blue-500/30 transition-all group">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-3.5 group-hover:scale-110 transition-transform">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="font-oswald text-lg font-bold text-slate-900 dark:text-white uppercase tracking-wide">
              100% Authentic Stock
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400 mt-1 leading-relaxed">
              Certified franchise batches from PepsiCo, Mountain Dew, 7UP, and Aquafina direct from authorized superadmin central supplies.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="p-5 sm:p-6 rounded-2xl sm:rounded-3xl bg-white dark:bg-zinc-900/60 border border-slate-200/80 dark:border-zinc-800/80 shadow-xs hover:shadow-md hover:border-indigo-500/30 transition-all group">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-3.5 group-hover:scale-110 transition-transform">
              <Zap className="w-5 h-5" />
            </div>
            <h3 className="font-oswald text-lg font-bold text-slate-900 dark:text-white uppercase tracking-wide">
              Real-Time Depot Logistics
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400 mt-1 leading-relaxed">
              Integrated franchise replenishment keeping local supermarket and grocery shelves constantly stocked with ice-cold drinks.
            </p>
          </div>
        </div>

        {/* Subtle CTA Anchor to Products */}
        <div className="mt-8 text-center">
          <Link
            to="/beverages"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 font-bold text-xs sm:text-sm tracking-wide shadow-md transition-all active:scale-95 group"
          >
            <span>Explore All Chilled Beverages</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </div>
    </section>
  );
};

export default BrandVideoSection;