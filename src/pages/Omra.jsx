import React from 'react';
import { Globe, Layers } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import OmraGroupes from '@/components/OmraGroupes';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';

const Omra = () => {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();

  return (
    <Layout>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-extrabold tracking-tight flex items-center gap-3">
          <Globe size={28} className="text-primary" /> Module Omra
        </h1>

        {isAdmin && (
          <Button 
            onClick={() => navigate('/omra/tracking')}
            className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold gap-2 shadow-sm"
          >
            <Layers size={15} className="text-amber-400" />
            <span>Tracking Omra (Visas, Billets, Diwan)</span>
            <span className="text-[9px] font-black uppercase px-1.5 py-0.2 bg-amber-500/30 text-amber-200 rounded">Admin</span>
          </Button>
        )}
      </div>

      <div>
        <OmraGroupes />
      </div>
    </Layout>
  );
};

export default Omra;
