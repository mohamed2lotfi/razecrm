import React from 'react';
import { Globe } from 'lucide-react';
import Layout from '@/components/Layout';
import OmraGroupes from '@/components/OmraGroupes';

const Omra = () => {
  return (
    <Layout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-extrabold tracking-tight flex items-center gap-3">
          <Globe size={28} className="text-primary" /> Module Omra
        </h1>
      </div>

      <div>
        <OmraGroupes />
      </div>
    </Layout>
  );
};

export default Omra;
