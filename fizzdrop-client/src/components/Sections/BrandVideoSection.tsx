import React, { useRef, useState, useEffect } from 'react';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Sparkles,
  ChevronDown,
} from 'lucide-react';

export const BrandVideoSection: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [isMuted, setIsMuted] = useState<boolean>(true);
  const [progress, setProgress] = useState<number>(0);
  const [isHovered, setIsHovered] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Ensure muted for browser autoplay compliance
    video.muted = true;
    setIsMuted(true);

    const playPromise = video.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => setIsPlaying(true))
        .catch(() => {
          setIsPlaying(false);
        });
    }

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
      { threshold: 0.25 }
    );

    observer.observe(video);
    return () => observer.disconnect();
  }, []);

  const togglePlay = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().then(() => setIsPlaying(true)).catch(() => {});
    } else {
      video.pause();
      setIsPlaying(false);
    }
  };

  const toggleMute = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
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
    e.stopPropagation();
    const video = videoRef.current;
    if (!video || !video.duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    video.currentTime = pos * video.duration;
  };

  const toggleFullscreen = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const container = containerRef.current;
    if (!container) return;

    if (!document.fullscreenElement) {
      container.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  const scrollToHero = () => {
    const heroEl = document.getElementById('hero-showcase');
    if (heroEl) {
      heroEl.scrollIntoView({ behavior: 'smooth' });
    } else {
      window.scrollBy({ top: 480, behavior: 'smooth' });
    }
  };

  return (
    <section className="relative w-full pt-4 sm:pt-6 pb-10 sm:pb-14 overflow-hidden bg-gradient-to-b from-slate-50/50 via-white to-slate-50/30 dark:from-zinc-950 dark:via-zinc-900/50 dark:to-zinc-950 border-b border-slate-200/60 dark:border-zinc-800/60">
      {/* Subtle ambient glow behind player */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] sm:w-[900px] h-[350px] bg-gradient-to-r from-cyan-400/10 via-blue-500/10 to-indigo-500/10 rounded-full blur-3xl pointer-events-none -z-10" />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Compact, High-Impact Top Header */}
        <div className="text-center max-w-2xl mx-auto mb-6 sm:mb-8 space-y-2.5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-50 dark:bg-cyan-950/60 border border-cyan-200/80 dark:border-cyan-800/80 text-cyan-700 dark:text-cyan-300 text-[11px] font-bold tracking-wider uppercase shadow-2xs">
            <Sparkles className="w-3.5 h-3.5 text-cyan-500 animate-pulse" />
            <span>Official Brand Showcase</span>
          </div>

          <h2 className="font-oswald text-2xl sm:text-3xl md:text-4xl font-black text-slate-900 dark:text-white uppercase tracking-tight leading-tight">
            Feel The Chill.{' '}
            <span className="bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Taste The Fizz.
            </span>
          </h2>

          <p className="text-slate-500 dark:text-zinc-400 text-xs sm:text-sm font-medium">
            Watch the official FizzDrop campaign — sub-zero regional cold chain dispatches delivering pure refreshment nationwide.
          </p>
        </div>

        {/* Video Player Display Card */}
        <div
          ref={containerRef}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          className="relative mx-auto rounded-2xl sm:rounded-[2rem] p-1.5 sm:p-2.5 bg-gradient-to-b from-slate-200/60 via-white/50 to-slate-100/40 dark:from-zinc-800/80 dark:via-zinc-900/50 dark:to-zinc-950/40 border border-slate-200/80 dark:border-zinc-800/80 shadow-xl backdrop-blur-xl transition-all duration-300 group"
        >
          {/* Inner Video Container with 16:9 ratio */}
          <div className="relative w-full aspect-video rounded-xl sm:rounded-[1.75rem] overflow-hidden bg-slate-950 shadow-inner">
            <video
              ref={videoRef}
              src="/videos/brand_ad.mp4"
              className="w-full h-full object-cover cursor-pointer"
              playsInline
              muted
              loop
              autoPlay
              onClick={() => togglePlay()}
              onTimeUpdate={handleTimeUpdate}
            />

            {/* Top Left Live Indicator */}
            <div className="absolute top-3.5 left-3.5 sm:top-5 sm:left-5 z-20 pointer-events-none flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900/75 backdrop-blur-md border border-white/10 text-white text-[10px] sm:text-xs font-mono tracking-wider shadow-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-bold">NOW STREAMING</span>
            </div>

            {/* Top Right Quick Sound Toggle Pill */}
            <div className="absolute top-3.5 right-3.5 sm:top-5 sm:right-5 z-20">
              <button
                onClick={(e) => toggleMute(e)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900/80 hover:bg-slate-900 backdrop-blur-md border border-white/20 text-white text-xs font-semibold shadow-md transition-all cursor-pointer hover:scale-105 active:scale-95"
                title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
              >
                {isMuted ? (
                  <>
                    <VolumeX className="w-3.5 h-3.5 text-rose-400" />
                    <span className="text-[11px] font-mono">Unmute</span>
                  </>
                ) : (
                  <>
                    <Volume2 className="w-3.5 h-3.5 text-cyan-300 animate-pulse" />
                    <span className="text-[11px] font-mono">Sound On</span>
                  </>
                )}
              </button>
            </div>

            {/* Central Play/Pause Watermark Button (shown on hover or when paused) */}
            <div
              onClick={() => togglePlay()}
              className={`absolute inset-0 z-10 flex items-center justify-center transition-opacity duration-300 cursor-pointer ${
                !isPlaying || isHovered ? 'opacity-100 bg-slate-950/20' : 'opacity-0'
              }`}
            >
              <button
                type="button"
                onClick={(e) => togglePlay(e)}
                className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-white/90 hover:bg-white text-slate-900 flex items-center justify-center shadow-xl hover:scale-110 active:scale-95 transition-all backdrop-blur-md cursor-pointer"
                title={isPlaying ? 'Pause Video' : 'Play Video'}
              >
                {isPlaying ? (
                  <Pause className="w-5 h-5 sm:w-6 sm:h-6 fill-current text-slate-900" />
                ) : (
                  <Play className="w-5 h-5 sm:w-6 sm:h-6 fill-current text-slate-900 ml-0.5 sm:ml-1" />
                )}
              </button>
            </div>

            {/* Bottom Controls Bar */}
            <div
              className={`absolute bottom-0 inset-x-0 z-20 p-3 sm:p-5 bg-gradient-to-t from-slate-950/90 via-slate-950/60 to-transparent transition-opacity duration-300 flex flex-col gap-2 ${
                isHovered || !isPlaying ? 'opacity-100' : 'opacity-0'
              }`}
            >
              {/* Progress Bar / Scrubber */}
              <div
                onClick={handleSeek}
                className="w-full h-1.5 sm:h-2 bg-white/20 rounded-full cursor-pointer overflow-hidden relative group/bar"
              >
                <div
                  className="h-full bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-500 rounded-full transition-all duration-100 relative"
                  style={{ width: `${progress}%` }}
                />
              </div>

              {/* Action Buttons Row */}
              <div className="flex items-center justify-between text-white text-xs">
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => togglePlay(e)}
                    className="p-1.5 rounded-lg hover:bg-white/20 transition-colors cursor-pointer text-white"
                    title={isPlaying ? 'Pause' : 'Play'}
                  >
                    {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                  </button>

                  <button
                    onClick={(e) => toggleMute(e)}
                    className="flex items-center gap-1.5 p-1 px-2.5 rounded-lg bg-white/10 hover:bg-white/20 text-white font-medium text-xs transition-colors cursor-pointer"
                    title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
                  >
                    {isMuted ? (
                      <>
                        <VolumeX className="w-3.5 h-3.5 text-cyan-300" />
                        <span className="text-[11px] font-mono">Unmute</span>
                      </>
                    ) : (
                      <>
                        <Volume2 className="w-3.5 h-3.5 text-cyan-300" />
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
                    onClick={(e) => toggleFullscreen(e)}
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

        {/* Minimalist bridge prompt down to the dynamic products */}
        <div className="mt-4 sm:mt-5 text-center">
          <button
            onClick={scrollToHero}
            className="inline-flex items-center gap-1.5 px-4 py-1 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 text-xs font-semibold tracking-wide transition-colors cursor-pointer group"
          >
            <span>Explore Flavors & Outlets</span>
            <ChevronDown className="w-3.5 h-3.5 group-hover:translate-y-0.5 transition-transform" />
          </button>
        </div>
      </div>
    </section>
  );
};

export default BrandVideoSection;
