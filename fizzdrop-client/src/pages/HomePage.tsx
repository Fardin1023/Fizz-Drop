import React from 'react';
import HeroSection from '../components/HeroSection/HeroSection';
import BrandMarquee from '../components/Sections/BrandMarquee';
import BrandVideoSection from '../components/Sections/BrandVideoSection';
import NewArrivals from '../components/Sections/NewArrivals';

interface HomePageProps {
  onAddToCart?: (product: any) => void;
  branchId?: number | string;
}

const HomePage: React.FC<HomePageProps> = ({ onAddToCart, branchId }) => {
  return (
    <div className="flex flex-col">
      {/* 1. Interactive Product Carousel Hero */}
      <HeroSection />

      {/* 2. Infinite Partner Brand Logos */}
      <BrandMarquee />

      {/* 3. Official Brand Campaign Video Showcase */}
      <BrandVideoSection />

      {/* 4. Curated Featured Drops (Preview only on Home, complete catalog lives in /beverages) */}
      <NewArrivals branchId={branchId} onAddToCart={onAddToCart} limit={4} />
    </div>
  );
};

export default HomePage;
