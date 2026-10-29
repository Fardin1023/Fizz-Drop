import React from 'react';
import HeroSection from '../components/HeroSection/HeroSection';
import BrandMarquee from '../components/Sections/BrandMarquee';
import NewArrivals from '../components/Sections/NewArrivals';

interface HomePageProps {
  onAddToCart?: (product: any) => void;
  branchId?: number | string;
}

const HomePage: React.FC<HomePageProps> = ({ onAddToCart, branchId }) => {
  return (
    <>
      <HeroSection />
      <BrandMarquee />
      <NewArrivals branchId={branchId} onAddToCart={onAddToCart} />
    </>
  );
};

export default HomePage;