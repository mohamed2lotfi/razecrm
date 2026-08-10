import React, { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { QuoteSimulatorModal } from '@/components/QuoteSimulatorModal';
import { Home } from '@/pages/Home';
import { OmraCatalogPage } from '@/pages/OmraCatalogPage';
import { VisaCatalogPage } from '@/pages/VisaCatalogPage';
import { ClientAuth } from '@/pages/ClientAuth';
import { ClientDashboard } from '@/pages/ClientDashboard';

import { UmrahProgramPage } from '@/pages/UmrahProgramPage';

export const App = () => {
  const [quoteModalOpen, setQuoteModalOpen] = useState(false);
  const [initialQuoteData, setInitialQuoteData] = useState(null);

  const handleOpenQuoteModal = (data = null) => {
    setInitialQuoteData(data);
    setQuoteModalOpen(true);
  };

  const handleSelectPackage = (pkg) => {
    handleOpenQuoteModal({
      type: 'omra',
      nom: pkg.nom,
      date_depart: pkg.date_depart
    });
  };

  const handleSelectVisa = (visa) => {
    handleOpenQuoteModal({
      type: 'visa',
      nom: `${visa.nom} (${visa.visa_countries?.nom || 'International'})`
    });
  };

  const handleSelectHotel = (hotel) => {
    handleOpenQuoteModal({
      type: 'omra',
      nom: `Hôtel : ${hotel.nom} (${hotel.distanceLabel})`
    });
  };

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-obsidian-950 text-slate-900 dark:text-slate-100 flex flex-col selection:bg-brand-500 selection:text-white transition-colors duration-300">
      <Navbar onOpenQuoteModal={() => handleOpenQuoteModal()} />
      
      <div className="flex-1">
        <Routes>
          <Route 
            path="/" 
            element={
              <Home 
                onOpenQuoteModal={() => handleOpenQuoteModal()}
                onSelectPackage={handleSelectPackage}
                onSelectVisa={handleSelectVisa}
                onSelectHotel={handleSelectHotel}
              />
            } 
          />
          <Route 
            path="/omra" 
            element={
              <OmraCatalogPage 
                onSelectPackage={handleSelectPackage}
                onSelectHotel={handleSelectHotel}
                onOpenQuoteModal={() => handleOpenQuoteModal()}
              />
            } 
          />
          <Route 
            path="/programme-omra" 
            element={
              <UmrahProgramPage 
                onOpenQuoteModal={() => handleOpenQuoteModal()}
              />
            } 
          />
          <Route 
            path="/visas" 
            element={
              <VisaCatalogPage 
                onSelectVisa={handleSelectVisa}
                onOpenQuoteModal={() => handleOpenQuoteModal()}
              />
            } 
          />
          <Route path="/connexion" element={<ClientAuth />} />
          <Route 
            path="/mon-espace" 
            element={<ClientDashboard onOpenQuoteModal={() => handleOpenQuoteModal()} />} 
          />
        </Routes>
      </div>

      <Footer />

      {/* Interactive Global Quote Modal */}
      <QuoteSimulatorModal
        isOpen={quoteModalOpen}
        onClose={() => setQuoteModalOpen(false)}
        initialData={initialQuoteData}
      />
    </div>
  );
};
export default App;
