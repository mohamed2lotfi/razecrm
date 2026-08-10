import React from 'react';
import { HeroSection } from '@/components/HeroSection';
import { OmraPackages } from '@/components/OmraPackages';
import { PackagesSection } from '@/components/PackagesSection';
import { HaramHotelsRadar } from '@/components/HaramHotelsRadar';
import { VisaServices } from '@/components/VisaServices';
import { TestimonialsSection } from '@/components/TestimonialsSection';
import { WhyUsSection } from '@/components/WhyUsSection';

export const Home = ({ onOpenQuoteModal, onSelectPackage, onSelectVisa, onSelectHotel }) => {
  return (
    <main className="min-h-screen">
      <HeroSection onOpenQuoteModal={onOpenQuoteModal} />
      <OmraPackages onSelectPackage={onSelectPackage} />
      <PackagesSection onSelectPackage={onSelectPackage} onOpenQuoteModal={onOpenQuoteModal} />
      <HaramHotelsRadar onSelectHotel={onSelectHotel} />
      <VisaServices onSelectVisa={onSelectVisa} />
      <TestimonialsSection />
      <WhyUsSection />
    </main>
  );
};

