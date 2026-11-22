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
    <section className="relative w-full py-8 overflow-hidden bg-gradient-to-r from-[#FAFCFC] via-[#EDF7F7]/70 to-[#FAFCFC] border-y border-[#DCE8E9] backdrop-blur-md">
      {/* Edge gradient mask for smooth fade in/out */}
      <div className="absolute left-0 top-0 bottom-0 w-24 sm:w-40 bg-gradient-to-r from-[#FAFCFC] to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-24 sm:w-40 bg-gradient-to-l from-[#FAFCFC] to-transparent z-10 pointer-events-none" />

      {/* Infinite Scrolling Track */}
      <div className="animate-marquee items-center gap-6 sm:gap-10">
        {marqueeList.map((brand, idx) => (
          <div
            key={`${brand.name}-${idx}`}
            className="flex items-center justify-center h-16 sm:h-20 px-6 sm:px-8 rounded-2xl bg-white border border-[#DCE8E9] shadow-xs hover:shadow-md hover:scale-105 hover:border-[#FF6A00] transition-all duration-300 shrink-0 cursor-pointer"
          >
            <img
              src={brand.logo}
              alt={brand.name}
              className="h-9 sm:h-11 w-auto max-w-[110px] object-contain drop-shadow-xs transition-all duration-300"
            />
          </div>
        ))}
      </div>
    </section>
  );
};

export default BrandMarquee;