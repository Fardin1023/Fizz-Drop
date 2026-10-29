import React, { useState, useEffect } from 'react';
import { ArrowRight, ShoppingBag, Zap, ShieldCheck } from 'lucide-react';

// Bottle assets from src/assets/img/
import heroBg from '/src/assets/img/hero-image.png';
import heroBottlePepsi from '/src/assets/img/hero-image.png';
import heroBottleDew from '/src/assets/img/hero-image2.png';

interface ProductSlide {
  name: string;
  tagline: string;
  volume: string;
  color: string;
  accentGlow: string;
  borderGlow: string;
  image: string;
}

const FEATURED_PRODUCTS: ProductSlide[] = [
  {
    name: 'Pepsi Chill',
    tagline: 'Maximum Taste, Zero Sugar',
    volume: '500ml Chilled Bottle',
    color: 'from-blue-600 via-indigo-600 to-sky-500',
    accentGlow: 'from-blue-600/25 via-indigo-500/20 to-transparent',
    borderGlow: 'group-hover:border-blue-500/40',
    image: heroBottlePepsi,
  },
  {
    name: 'Mountain Dew',
    tagline: 'Darr Ke Aage Jeet Hai',
    volume: '600ml Cold PET',
    color: 'from-lime-500 via-emerald-600 to-teal-500',
    accentGlow: 'from-lime-500/25 via-emerald-500/20 to-transparent',
    borderGlow: 'group-hover:border-lime-500/40',
    image: heroBottleDew,
  },
  {
    name: '7UP Refresh',
    tagline: 'Crisp & Refreshing Lemon Lime',
    volume: '500ml Glass Bottle',
    color: 'from-emerald-500 via-teal-600 to-cyan-500',
    accentGlow: 'from-emerald-500/25 via-teal-500/20 to-transparent',
    borderGlow: 'group-hover:border-emerald-500/40',
    image: heroBottleDew,
  },
  {
    name: 'Mirinda Orange',
    tagline: 'Bold & Tangy Citrus Burst',
    volume: '400ml Can',
    color: 'from-amber-500 via-orange-600 to-red-500',
    accentGlow: 'from-amber-500/25 via-orange-500/20 to-transparent',
    borderGlow: 'group-hover:border-orange-500/40',
    image: heroBottlePepsi,
  },
  {
    name: 'Sting Energy',
    tagline: 'Electrifying Berry Surge',
    volume: '250ml Slim Can',
    color: 'from-red-500 via-rose-600 to-pink-500',
    accentGlow: 'from-red-500/25 via-rose-500/20 to-transparent',
    borderGlow: 'group-hover:border-rose-500/40',
    image: heroBottlePepsi,
  },
  {
    name: 'Aquafina Water',
    tagline: 'Pure & Crisp Hydration',
    volume: '1L Mineral Water',
    color: 'from-cyan-500 via-blue-600 to-indigo-500',
    accentGlow: 'from-cyan-500/25 via-blue-500/20 to-transparent',
    borderGlow: 'group-hover:border-cyan-500/40',
    image: heroBottlePepsi,
  },
];

const HeroSection: React.FC = () => {
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isFading, setIsFading] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);

  useEffect(() => {
    if (isPaused) return;

    const interval = setInterval(() => {
      setIsFading(true);
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % FEATURED_PRODUCTS.length);
        setIsFading(false);
      }, 450); // Easing duration for exit
    }, 3600);

    return () => clearInterval(interval);
  }, [isPaused]);

  const currentProduct = FEATURED_PRODUCTS[currentIndex];

  const handleSelectProduct = (index: number) => {
    if (index === currentIndex) return;
    setIsFading(true);
    setTimeout(() => {
      setCurrentIndex(index);
      setIsFading(false);
    }, 350);
  };

  return (
    <section
      className="relative w-full overflow-hidden py-12 md:py-20 lg:py-24"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* 1. Ambient Background Layer */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-[0.14] dark:opacity-[0.08] pointer-events-none scale-105 transition-transform duration-1000 ease-out"
        style={{ backgroundImage: `url(${heroBg})` }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-white/80 via-transparent to-white dark:from-zinc-950/80 dark:to-zinc-950 pointer-events-none" />

      {/* 2. Hero Content Container */}
      <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          
          {/* Left Column: Premium Typography & CTAs */}
          <div className="lg:col-span-7 flex flex-col items-center lg:items-start text-center lg:text-left space-y-7">
            
            {/* Live Indicator Pill */}
            <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-zinc-900/[0.04] dark:bg-zinc-100/[0.06] backdrop-blur-md border border-zinc-200/80 dark:border-zinc-800 shadow-sm text-xs font-semibold tracking-wider text-zinc-700 dark:text-zinc-300">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-600"></span>
              </span>
              <span>LIVE FRANCHISE INVENTORY DISPATCH</span>
            </div>

            {/* Headline with Text Motion */}
            <div className="w-full">
              <h1 className="font-oswald text-5xl sm:text-6xl lg:text-7xl font-black uppercase tracking-tight leading-[0.93] text-zinc-900 dark:text-zinc-50">
                Refreshment <br />
                <span className="block h-[1.18em] overflow-hidden my-1">
                  <span
                    className={`block transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] bg-gradient-to-r ${currentProduct.color} bg-clip-text text-transparent transform ${
                      isFading
                        ? '-translate-y-8 opacity-0 scale-95 blur-[2px]'
                        : 'translate-y-0 opacity-100 scale-100 blur-0'
                    }`}
                  >
                    {currentProduct.name}
                  </span>
                </span>
                <span className="text-zinc-900 dark:text-zinc-100">Delivered Instantly</span>
              </h1>

              {/* Tagline Fade */}
              <p
                className={`mt-3 text-sm sm:text-base font-medium text-zinc-500 dark:text-zinc-400 transition-all duration-500 ease-out ${
                  isFading ? 'opacity-0 translate-y-1' : 'opacity-100 translate-y-0'
                }`}
              >
                {currentProduct.tagline}
              </p>
            </div>

            {/* Subtext */}
            <p className="max-w-xl text-base text-zinc-600 dark:text-zinc-400 leading-relaxed font-sans">
              Hand-picked cold drinks, isotonic boosters, and exclusive lifestyle merch sourced straight from authorized outlets.
            </p>

            {/* Premium CTA Buttons */}
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 pt-1">
              <a
                href="/shop"
                className="group relative flex items-center gap-2.5 px-7 py-4 rounded-2xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-medium text-sm shadow-xl shadow-zinc-900/10 dark:shadow-white/5 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 ease-out"
              >
                <ShoppingBag className="w-4 h-4 transition-transform group-hover:-translate-y-0.5" />
                <span>Explore Catalog</span>
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </a>

              <a
                href="/outlets"
                className="flex items-center gap-2 px-7 py-4 rounded-2xl bg-zinc-100/80 dark:bg-zinc-800/60 hover:bg-zinc-200/70 dark:hover:bg-zinc-700/60 border border-zinc-200/70 dark:border-zinc-700/70 text-zinc-800 dark:text-zinc-200 font-medium text-sm backdrop-blur-sm transition-all duration-300 ease-out hover:scale-[1.01]"
              >
                Find Local Outlet
              </a>
            </div>

            {/* Navigation Progress Indicators */}
            <div className="flex items-center gap-2 pt-1">
              {FEATURED_PRODUCTS.map((prod, idx) => (
                <button
                  key={prod.name}
                  onClick={() => handleSelectProduct(idx)}
                  className={`h-1.5 rounded-full transition-all duration-500 ease-out cursor-pointer ${
                    idx === currentIndex
                      ? 'w-8 bg-zinc-900 dark:bg-zinc-100'
                      : 'w-2 bg-zinc-300 dark:bg-zinc-700 hover:bg-zinc-400'
                  }`}
                  aria-label={`Show ${prod.name}`}
                />
              ))}
            </div>

            {/* Key Value Micro-Banners */}
            <div className="grid grid-cols-3 gap-6 pt-6 border-t border-zinc-200/80 dark:border-zinc-800/80 w-full max-w-md">
              <div className="flex flex-col">
                <span className="font-oswald text-xl font-bold text-zinc-900 dark:text-zinc-100 tracking-wide">30 MIN</span>
                <span className="text-[11px] text-zinc-500 font-medium">Flash Dispatch</span>
              </div>
              <div className="flex flex-col">
                <span className="font-oswald text-xl font-bold text-zinc-900 dark:text-zinc-100 tracking-wide">4°C COLD</span>
                <span className="text-[11px] text-zinc-500 font-medium">Chilled Transport</span>
              </div>
              <div className="flex flex-col">
                <span className="font-oswald text-xl font-bold text-zinc-900 dark:text-zinc-100 tracking-wide">GENUINE</span>
                <span className="text-[11px] text-zinc-500 font-medium">Sealed Bottle</span>
              </div>
            </div>

          </div>

          {/* Right Column: Premium Glassmorphism Presentation Card */}
          <div className="lg:col-span-5 flex justify-center items-center relative">
            
            {/* Dynamic Ambient Background Glow */}
            <div
              className={`absolute w-80 h-80 sm:w-[440px] sm:h-[440px] rounded-full bg-gradient-to-tr ${currentProduct.accentGlow} blur-3xl -z-10 pointer-events-none transition-all duration-1000 ease-in-out`}
            />

            {/* Glass Container Card with Rounded Edges */}
            <div
              className={`group relative w-full max-w-[380px] sm:max-w-[430px] h-[480px] sm:h-[540px] rounded-[36px] bg-white/40 dark:bg-zinc-900/40 backdrop-blur-2xl border border-white/60 dark:border-zinc-800/80 p-8 flex flex-col justify-between items-center shadow-[0_20px_60px_-15px_rgba(0,0,0,0.07)] dark:shadow-[0_25px_70px_-20px_rgba(0,0,0,0.5)] transition-all duration-700 ease-out hover:shadow-2xl overflow-hidden ${currentProduct.borderGlow}`}
            >
              
              {/* Top Card Bar: Micro Badges */}
              <div className="w-full flex items-center justify-between z-10">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/70 dark:bg-zinc-800/70 border border-white/60 dark:border-zinc-700/60 text-[11px] font-semibold text-zinc-800 dark:text-zinc-200 backdrop-blur-md shadow-xs">
                  <Zap className="w-3 h-3 text-amber-500 fill-amber-500" /> Instant Drop
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> Authenticated
                </span>
              </div>

              {/* Centered Floating Bottle with Rounded Glow & Tilt */}
              <div className="relative flex-1 flex items-center justify-center my-4 w-full">
                {/* Internal bottle spotlight backdrop */}
                <div className="absolute w-44 h-44 rounded-full bg-white/80 dark:bg-zinc-800/50 blur-2xl pointer-events-none" />

                <img
                  key={currentProduct.name}
                  src={currentProduct.image}
                  alt={currentProduct.name}
                  className={`max-h-[300px] sm:max-h-[370px] w-auto object-contain drop-shadow-[0_25px_30px_rgba(0,0,0,0.22)] transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-105 group-hover:-translate-y-2 group-hover:rotate-1 ${
                    isFading
                      ? 'opacity-0 scale-90 translate-y-6 rotate-[-2deg] blur-[1px]'
                      : 'opacity-100 scale-100 translate-y-0 rotate-0 blur-0'
                  }`}
                />
              </div>

              {/* Bottom Card Bar: Dynamic Product Details Pill */}
              <div className="w-full z-10">
                <div className="w-full flex items-center justify-between px-4 py-2.5 rounded-2xl bg-white/70 dark:bg-zinc-800/60 backdrop-blur-md border border-white/60 dark:border-zinc-700/60 shadow-sm transition-all duration-300">
                  <div>
                    <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
                      {currentProduct.name}
                    </p>
                    <p className="text-[10px] text-zinc-500 font-medium">
                      {currentProduct.volume}
                    </p>
                  </div>
                  <a
                    href="/shop"
                    className="p-2 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:scale-105 active:scale-95 transition-transform"
                    aria-label={`Buy ${currentProduct.name}`}
                  >
                    <ArrowRight className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>

            </div>
          </div>

        </div>
      </div>
    </section>
  );
};

export default HeroSection;
