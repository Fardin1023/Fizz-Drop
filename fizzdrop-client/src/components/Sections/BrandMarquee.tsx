import React from 'react';

// Brand logos from your assets folder
import pepsiLogo from '../../assets/img/pepsi logo.PNG';
import sevenUpLogo from '../../assets/img/7up logo.PNG';
import dewLogo from '../../assets/img/dew logo.PNG';
import mirindaLogo from '../../assets/img/mirinda logo.PNG';
import sliceLogo from '../../assets/img/slice logo.PNG';

interface BrandItem {
  name: string;
  logo: string;
}

const BRANDS: BrandItem[] = [
  { name: 'Pepsi', logo: pepsiLogo },
  { name: '7UP', logo: sevenUpLogo },
  { name: 'Mountain Dew', logo: dewLogo },
  { name: 'Mirinda', logo: mirindaLogo },
  { name: 'Slice', logo: sliceLogo },
];

const BrandMarquee: React.FC = () => {
  // Duplicate array to achieve an unbroken infinite horizontal loop
  const marqueeList = [...BRANDS, ...BRANDS, ...BRANDS, ...BRANDS];

  return (
    <section className="relative w-full py-8 overflow-hidden bg-white/40 dark:bg-zinc-950/40 border-y border-zinc-200/60 dark:border-zinc-800/60 backdrop-blur-md">
      {/* Edge gradient mask for smooth fade in/out */}
      <div className="absolute left-0 top-0 bottom-0 w-24 sm:w-40 bg-gradient-to-r from-white dark:from-zinc-950 to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-24 sm:w-40 bg-gradient-to-l from-white dark:from-zinc-950 to-transparent z-10 pointer-events-none" />

      {/* Infinite Scrolling Track */}
      <div className="animate-marquee items-center gap-6 sm:gap-10">
        {marqueeList.map((brand, idx) => (
          <div
            key={`${brand.name}-${idx}`}
            className="flex items-center justify-center h-16 sm:h-20 px-6 sm:px-8 rounded-2xl bg-white/70 dark:bg-zinc-900/60 border border-zinc-200/70 dark:border-zinc-800/80 shadow-xs hover:shadow-md hover:scale-105 hover:border-indigo-500/30 transition-all duration-300 shrink-0 cursor-pointer"
          >
            <img
  src={brand.logo}
  alt={brand.name}
  className="h-9 sm:h-11 w-auto max-w-[110px] object-contain drop-shadow-sm transition-all duration-300"
/>
          </div>
        ))}
      </div>
    </section>
  );
};

export default BrandMarquee;