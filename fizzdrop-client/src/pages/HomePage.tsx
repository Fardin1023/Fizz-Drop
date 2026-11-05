import React from 'react';
import BrandVideoSection from '../components/Sections/BrandVideoSection';
import HeroSection from '../components/HeroSection/HeroSection';
import BrandMarquee from '../components/Sections/BrandMarquee';
import NewArrivals from '../components/Sections/NewArrivals';

interface HomePageProps {
  onAddToCart?: (product: any) => void;
  branchId?: number | string;
}

const HomePage: React.FC<HomePageProps> = ({ onAddToCart, branchId }) => {
  return (
    <div className="flex flex-col">
      {/* 1. Official Brand Video Showcase placed at the top for immediate consumer visibility */}
      <BrandVideoSection />

      {/* 2. Interactive Product Carousel Hero */}
      <div id="hero-showcase">
        <HeroSection />
      </div>

      {/* 3. Infinite Partner Brand Logos */}
      <BrandMarquee />

      {/* 4. Live Franchise Outlet New Arrivals Catalog */}
      <NewArrivals branchId={branchId} onAddToCart={onAddToCart} />
    </div>
  );
};

export default HomePage;
