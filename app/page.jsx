import HeroSection from '@/components/HeroSection';
import ToolsGrid from '@/components/ToolsGrid';
import FeaturesSection from '@/components/FeaturesSection';

export const metadata = { alternates: { canonical: '/' } };

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <ToolsGrid />
      <FeaturesSection />
    </>
  );
}
