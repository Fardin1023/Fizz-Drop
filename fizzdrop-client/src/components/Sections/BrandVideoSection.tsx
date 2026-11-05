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

export const BrandVideoSection: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [isMuted, setIsMuted] = useState<boolean>(true);
  const [progress, setProgress] = useState<number>(0);
  const [isHovered, setIsHovered] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

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
      {/* Ambient background glow orbs for depth without clutter */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] bg-gradient-to-r from-cyan-500/10 via-blue-500/10 to-indigo-500/10 rounded-full blur-3xl pointer-events-none -z-10" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-14 space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-50 dark:bg-cyan-950/50 border border-cyan-200/80 dark:border-cyan-800/80 text-cyan-700 dark:text-cyan-300 text-xs font-bold tracking-wider uppercase shadow-xs">
            <Sparkles className="w-3.5 h-3.5 text-cyan-500 animate-pulse" />
            <span>The FizzDrop Experience</span>
          </div>

          <h2 className="font-oswald text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
            Feel The Chill.{' '}
            <span className="bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Taste The Fizz.
            </span>
          </h2>

          <p className="text-slate-600 dark:text-zinc-400 text-sm sm:text-base leading-relaxed">
            From state-of-the-art regional cold depots to authorized franchise outlets, witness the relentless freshness and sub-zero logistics powering every single drop.
          </p>
        </div>

        {/* Video Player Showcase Frame */}
        <div
          ref={containerRef}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          className="relative mx-auto max-w-5xl rounded-3xl sm:rounded-[2.5rem] p-2 sm:p-3.5 bg-gradient-to-b from-white/80 via-slate-100/60 to-white/40 dark:from-zinc-800/80 dark:via-zinc-900/60 dark:to-zinc-950/40 border border-slate-200/80 dark:border-zinc-800/80 shadow-2xl backdrop-blur-xl transition-all duration-500 group"
        >
          {/* Inner Video Container */}
          <div className="relative w-full aspect-video rounded-2xl sm:rounded-[2rem] overflow-hidden bg-slate-950 shadow-inner">
            <video
              ref={videoRef}
              src="/videos/brand_ad.mp4"
              className="w-full h-full object-cover cursor-pointer"
              playsInline
              muted
              loop
              autoPlay
              onClick={togglePlay}
              onTimeUpdate={handleTimeUpdate}
            />

            {/* Top Badge: Spotlight Tag */}
            <div className="absolute top-4 left-4 sm:top-6 sm:left-6 z-20 pointer-events-none flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/70 backdrop-blur-md border border-white/10 text-white text-[11px] font-mono tracking-wider">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-bold">ORIGINAL CAMPAIGN</span>
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
                  className="h-full bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-500 rounded-full transition-all duration-100 relative"
                  style={{ width: `${progress}%` }}
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
                    title="Fullscreen"
                  >
                    <Maximize className="w-4 h-4" />
                  </button>
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
