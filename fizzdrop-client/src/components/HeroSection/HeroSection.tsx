import React, { useState, useEffect } from 'react';
import { ArrowRight, ShoppingBag, Zap, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';

// Background
import heroBg from '/src/assets/img/hero-image.png';

// Brand cutouts matching your assets directory
import pepsiImg from '/src/assets/img/pepsi.PNG';
import sevenUpImg from '/src/assets/img/7up.PNG';
import mountainDewImg from '/src/assets/img/mountain dew.PNG';
import mirindaImg from '/src/assets/img/mirinda.PNG';
import sliceImg from '/src/assets/img/slice.PNG';
import aquafinaImg from '/src/assets/img/aquafina.PNG';

interface ProductSlide {
  name: string;
  tagline: string;
  volume: string;
  color: string;
  accentGlow: string;
  borderGlow: string;
  pedestalGlow: string;
  image: string;
}

const FEATURED_PRODUCTS: ProductSlide[] = [
  {
    name: 'Pepsi Chill',
    tagline: 'Maximum Taste, Zero Sugar',
    volume: '500ml Chilled Bottle',
    color: 'from-blue-600 via-indigo-600 to-sky-500',
    accentGlow: 'from-blue-600/35 via-indigo-500/25 to-transparent',
    borderGlow: 'hover:border-blue-500/40',
    pedestalGlow: 'bg-blue-500/25',
    image: pepsiImg,
  },
  {
    name: '7UP Refresh',
    tagline: 'Crisp & Refreshing Lemon Lime',
    volume: '500ml Chilled Bottle',
    color: 'from-emerald-500 via-teal-600 to-cyan-500',
    accentGlow: 'from-emerald-500/35 via-teal-500/25 to-transparent',
    borderGlow: 'hover:border-emerald-500/40',
    pedestalGlow: 'bg-emerald-500/25',
    image: sevenUpImg,
  },
  {
    name: 'Mountain Dew',
    tagline: 'Darr Ke Aage Jeet Hai',
    volume: '600ml Cold PET',
    color: 'from-lime-500 via-emerald-600 to-teal-500',
    accentGlow: 'from-lime-500/35 via-emerald-500/25 to-transparent',
    borderGlow: 'hover:border-lime-500/40',
    pedestalGlow: 'bg-lime-500/25',
    image: mountainDewImg,
  },
  {
    name: 'Mirinda Orange',
    tagline: 'Bold & Tangy Citrus Burst',
    volume: '400ml Cold PET',
    color: 'from-amber-500 via-orange-600 to-red-500',
    accentGlow: 'from-amber-500/35 via-orange-500/25 to-transparent',
    borderGlow: 'hover:border-orange-500/40',
    pedestalGlow: 'bg-orange-500/25',
    image: mirindaImg,
  },
  {
    name: 'Slice Mango',
    tagline: 'Thickest Mango Indulgence',
    volume: '500ml Bottle',
    color: 'from-yellow-500 via-amber-600 to-orange-500',
    accentGlow: 'from-yellow-500/35 via-amber-500/25 to-transparent',
    borderGlow: 'hover:border-yellow-500/40',
    pedestalGlow: 'bg-amber-500/25',
    image: sliceImg,
  },
  {
    name: 'Aquafina Water',
    tagline: 'Pure & Crisp Hydration',
    volume: '1L Mineral Water',
    color: 'from-cyan-500 via-blue-600 to-indigo-500',
    accentGlow: 'from-cyan-500/35 via-blue-500/25 to-transparent',
    borderGlow: 'hover:border-cyan-500/40',
    pedestalGlow: 'bg-cyan-500/25',
    image: aquafinaImg,
  },
];

const HeroSection: React.FC = () => {
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [animState, setAnimState] = useState<'entering' | 'active' | 'exiting'>('active');
  const [isPaused, setIsPaused] = useState<boolean>(false);

  useEffect(() => {
    if (isPaused) return;

    const interval = setInterval(() => {
      // 1. Trigger Exit Animation
      setAnimState('exiting');

      setTimeout(() => {
        // 2. Switch Product Index and Trigger Entrance
        setCurrentIndex((prev) => (prev + 1) % FEATURED_PRODUCTS.length);
        setAnimState('entering');

        // 3. Settle back to stable Active state
        setTimeout(() => {
          setAnimState('active');
        }, 50);
      }, 420); // Duration matches CSS exit transition
    }, 3800);

    return () => clearInterval(interval);
  }, [isPaused]);

  const currentProduct = FEATURED_PRODUCTS[currentIndex];

  const handleManualSelect = (index: number) => {
    if (index === currentIndex || animState === 'exiting') return;
    setAnimState('exiting');
    setTimeout(() => {
      setCurrentIndex(index);
      setAnimState('entering');
      setTimeout(() => setAnimState('active'), 50);
    }, 300);
  };

  return (
    <section
      className="relative w-full overflow-hidden py-12 md:py-16 lg:py-20 select-none"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* 1. Background Atmosphere Texture */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-[0.12] dark:opacity-[0.06] pointer-events-none scale-105 transition-transform duration-1000 ease-out"
        style={{ backgroundImage: `url(${heroBg})` }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-white/90 via-transparent to-white dark:from-zinc-950/90 dark:to-zinc-950 pointer-events-none" />

      {/* 2. Main Content Grid */}
      <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          
          {/* Left Column: Kinetic Typography & Actions */}
          <div className="lg:col-span-7 flex flex-col items-center lg:items-start text-center lg:text-left space-y-7">
            
            {/* Live Pill */}
            <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-[#9BD8DA]/25 backdrop-blur-md border border-[#9BD8DA] shadow-xs text-xs font-bold tracking-wider text-[#1A282A]">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#65B016] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#65B016]"></span>
              </span>
              <span>LIVE FRANCHISE INVENTORY DISPATCH</span>
            </div>

            {/* Headline with Slide Transition */}
            <div className="w-full">
              <h1 className="font-oswald text-5xl sm:text-6xl lg:text-7xl font-black uppercase tracking-tight leading-[0.93] text-[#1A282A]">
                Refreshment <br />
                <span className="block h-[1.18em] overflow-hidden my-1">
                  <span
                    className={`block transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] bg-gradient-to-r ${currentProduct.color} bg-clip-text text-transparent transform ${
                      animState === 'exiting'
                        ? '-translate-y-10 opacity-0 scale-95 blur-xs'
                        : animState === 'entering'
                        ? 'translate-y-10 opacity-0 scale-95 blur-xs'
                        : 'translate-y-0 opacity-100 scale-100 blur-none'
                    }`}
                  >
                    {currentProduct.name}
                  </span>
                </span>
                <span className="text-[#1A282A]">Delivered Instantly</span>
              </h1>

              {/* Synchronized Tagline */}
              <p
                className={`mt-3 text-sm sm:text-base font-semibold text-[#3D5558] transition-all duration-500 ease-out ${
                  animState !== 'active' ? 'opacity-0 translate-y-2' : 'opacity-100 translate-y-0'
                }`}
              >
                {currentProduct.tagline}
              </p>
            </div>

            <p className="max-w-xl text-base text-[#3D5558] leading-relaxed font-sans">
              Hand-picked cold drinks, isotonic boosters, and exclusive lifestyle merch sourced straight from authorized outlets.
            </p>

            {/* CTAs */}
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 pt-1">
              <Link
                to="/shop"
                className="group relative flex items-center gap-2.5 px-7 py-4 rounded-2xl bg-[#FF6A00] hover:bg-[#E55F00] text-white font-bold text-sm shadow-xl shadow-[#FF6A00]/25 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 ease-out cursor-pointer"
              >
                <ShoppingBag className="w-4 h-4 transition-transform group-hover:-translate-y-0.5" />
                <span>Explore Catalog</span>
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </Link>

              <Link
                to="/shop"
                className="flex items-center gap-2 px-7 py-4 rounded-2xl bg-white hover:bg-[#EDF7F7] border border-[#DCE8E9] text-[#1A282A] font-bold text-sm backdrop-blur-sm transition-all duration-300 ease-out hover:scale-[1.01] cursor-pointer shadow-xs"
              >
                Find Local Outlet
              </Link>
            </div>

            {/* Carousel Navigation Indicators */}
            <div className="flex items-center gap-2 pt-1">
              {FEATURED_PRODUCTS.map((prod, idx) => (
                <button
                  key={prod.name}
                  onClick={() => handleManualSelect(idx)}
                  className={`h-1.5 rounded-full transition-all duration-500 ease-out cursor-pointer ${
                    idx === currentIndex
                      ? 'w-9 bg-[#FF6A00] shadow-sm'
                      : 'w-2.5 bg-[#DCE8E9] hover:bg-[#9CB7BB]'
                  }`}
                  aria-label={`Slide to ${prod.name}`}
                />
              ))}
            </div>

            {/* Brand Specs */}
            <div className="grid grid-cols-3 gap-6 pt-6 border-t border-[#DCE8E9] w-full max-w-md">
              <div className="flex flex-col">
                <span className="font-oswald text-xl font-bold text-[#1A282A] tracking-wide">30 MIN</span>
                <span className="text-[11px] text-[#6B8487] font-semibold">Flash Dispatch</span>
              </div>
              <div className="flex flex-col">
                <span className="font-oswald text-xl font-bold text-[#1A282A] tracking-wide">4°C COLD</span>
                <span className="text-[11px] text-[#6B8487] font-semibold">Chilled Transport</span>
              </div>
              <div className="flex flex-col">
                <span className="font-oswald text-xl font-bold text-[#1A282A] tracking-wide">GENUINE</span>
                <span className="text-[11px] text-[#6B8487] font-semibold">Sealed Bottle</span>
              </div>
            </div>

          </div>

          {/* Right Column: Carousel Presentation with Depth Animations */}
          <div className="lg:col-span-5 flex justify-center items-center relative">
            
            {/* Ambient Background Aura */}
            <div
              className={`absolute w-80 h-80 sm:w-[440px] sm:h-[440px] rounded-full bg-gradient-to-tr ${currentProduct.accentGlow} blur-3xl -z-10 pointer-events-none transition-all duration-1000 ease-in-out transform ${
                animState === 'active' ? 'scale-100 opacity-100' : 'scale-90 opacity-60'
              }`}
            />

            {/* Main Stage Glassmorphic Card */}
            <div
              className={`group relative w-full max-w-[390px] sm:max-w-[430px] h-[500px] sm:h-[550px] rounded-[40px] bg-gradient-to-b from-white/90 via-[#FAFCFC]/80 to-white/90 backdrop-blur-2xl border border-[#DCE8E9] p-7 sm:p-8 flex flex-col justify-between items-center shadow-[0_20px_50px_-15px_rgba(26,40,42,0.08)] transition-all duration-700 ease-out hover:shadow-2xl overflow-hidden hover:border-[#FF6A00]/40`}
            >
              
              {/* Card Top Row Badges */}
              <div className="w-full flex items-center justify-between z-10">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-[#DCE8E9] text-[11px] font-bold text-[#1A282A] backdrop-blur-md shadow-xs">
                  <Zap className="w-3 h-3 text-[#FFB62A] fill-[#FFB62A]" /> Instant Drop
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#4B8510]">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#65B016]" /> Authenticated
                </span>
              </div>

              {/* Animated Carousel Center Stage */}
              <div className="relative flex-1 w-full flex items-center justify-center my-3 rounded-3xl bg-radial from-white/80 via-[#EDF7F7]/40 to-transparent overflow-hidden">
                
                {/* Pedestal Reflection Halo */}
                <div
                  className={`absolute bottom-6 w-52 h-14 rounded-full bg-[#9BD8DA]/40 blur-xl pointer-events-none transition-all duration-700 ${
                    animState === 'active' ? 'scale-100 opacity-100' : 'scale-75 opacity-40'
                  }`}
                />

                {/* Animated Product Bottle */}
                <div className="relative flex items-center justify-center w-full h-full">
                  <img
                    key={currentProduct.name}
                    src={currentProduct.image}
                    alt={currentProduct.name}
                    className={`max-h-[300px] sm:max-h-[365px] w-auto object-contain drop-shadow-[0_24px_32px_rgba(26,40,42,0.18)] transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-105 group-hover:-translate-y-2 group-hover:rotate-1 ${
                      animState === 'exiting'
                        ? 'opacity-0 scale-75 translate-y-12 rotate-[-6deg] blur-xs'
                        : animState === 'entering'
                        ? 'opacity-0 scale-90 -translate-y-10 rotate-[4deg] blur-xs'
                        : 'opacity-100 scale-100 translate-y-0 rotate-0 blur-none'
                    }`}
                  />
                </div>
              </div>

              {/* Card Footer: Synchronized Product Meta */}
              <div className="w-full z-10">
                <div className="w-full flex items-center justify-between px-4 py-3 rounded-2xl bg-white border border-[#DCE8E9] shadow-xs transition-all duration-300">
                  <div className="overflow-hidden">
                    <p
                      className={`text-xs font-bold text-[#1A282A] tracking-tight transition-all duration-300 ${
                        animState !== 'active' ? 'opacity-0 translate-y-1' : 'opacity-100 translate-y-0'
                      }`}
                    >
                      {currentProduct.name}
                    </p>
                    <p
                      className={`text-[10px] text-[#6B8487] font-semibold transition-all duration-300 delay-75 ${
                        animState !== 'active' ? 'opacity-0 translate-y-1' : 'opacity-100 translate-y-0'
                      }`}
                    >
                      {currentProduct.volume}
                    </p>
                  </div>
                  
                  <Link
                    to="/shop"
                    className="p-2.5 rounded-xl bg-[#FF6A00] hover:bg-[#E55F00] text-white hover:scale-105 active:scale-95 transition-transform shadow-xs cursor-pointer shrink-0"
                    aria-label={`Buy ${currentProduct.name}`}
                  >
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
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