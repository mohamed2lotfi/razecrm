import React, { useState, useEffect } from 'react';
import { FileDown, FileText, Trash2, Loader2 } from 'lucide-react';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';

const Facturation = () => {
  const [factures, setFactures] = useState([]);
  const [proformas, setProformas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('factures');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('factures').select('*').order('date_creation', { ascending: false });
    
    if (!error && data) {
      setFactures(data.filter(d => d.type_doc === 'facture'));
      setProformas(data.filter(d => d.type_doc === 'proforma'));
    }
    setLoading(false);
  };

  const handleDelete = async (id, isFacture) => {
    if (!window.confirm('Supprimer ce document ?')) return;
    
    await supabase.from('factures').delete().eq('id', id);

    if (isFacture) setFactures(prev => prev.filter(f => f.id !== id));
    else setProformas(prev => prev.filter(p => p.id !== id));
  };

  const fmt = (a) => new Intl.NumberFormat('fr-DZ', { style: 'currency', currency: 'DZD' }).format(a);
  const fmtDate = (d) => {
    if (!d) return '—';
    try { return format(parseISO(d), 'dd MMM yyyy', { locale: fr }); } catch { return d; } 
  };

  const data = activeTab === 'factures' ? factures : proformas;
  const isFacture = activeTab === 'factures';

  return (
    <Layout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-extrabold tracking-tight">Facturation</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-0 border-b mb-6">
        {[
          { key: 'factures', label: 'Factures', icon: FileDown },
          { key: 'proformas', label: 'Proformas', icon: FileText },
        ].map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={cn(
              "flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-colors",
              activeTab === tab.key ? "text-primary border-primary" : "text-muted-foreground border-transparent hover:text-foreground"
            )}>
            <tab.icon size={15} /> {tab.label}
          </button>
        ))}
      </div>

      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                {['Date', 'Client', 'Détails', 'Échéance', 'Paiement', 'Taxe', 'Total HT', 'Total TTC', 'Actions'].map(h => (
                  <th key={h} className={cn("px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground",
                    ['Taxe', 'Total HT', 'Total TTC'].includes(h) && 'text-right',
                    h === 'Actions' && 'text-right'
                  )}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="9" className="py-16 text-center">
                    <Loader2 size={32} className="mx-auto animate-spin text-primary mb-3" />
                    <p className="font-medium text-muted-foreground">Chargement des documents...</p>
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan="9" className="py-16 text-center">
                    {isFacture ? <FileDown size={40} className="mx-auto text-muted-foreground/30 mb-3" /> : <FileText size={40} className="mx-auto text-muted-foreground/30 mb-3" />}
                    <p className="font-medium text-muted-foreground">Aucune {isFacture ? 'facture' : 'proforma'} générée</p>
                    <p className="text-xs text-muted-foreground mt-1">Générez-en une depuis la section Ventes.</p>
                  </td>
                </tr>
              ) : data.map(doc => (
                <tr key={doc.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 text-muted-foreground">{fmtDate(doc.date_creation || doc.created_at)}</td>
                  <td className="px-4 py-3 font-medium">{doc.client_nom}</td>
                  <td className="px-4 py-3 text-muted-foreground">{doc.details || '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground">{fmtDate(doc.deadline)}</td>
                  <td className="px-4 py-3"><Badge variant="secondary" className="capitalize text-xs">{doc.moyen_paiement}</Badge></td>
                  <td className="px-4 py-3 text-right tabular-nums">{doc.taxe}%</td>
                  <td className="px-4 py-3 text-right tabular-nums">{fmt(doc.total_ht)}</td>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums text-primary">{fmt(doc.total_ttc)}</td>
                  <td className="px-4 py-3 text-right">
                    <Button variant="destructive" size="icon-sm" onClick={() => handleDelete(doc.id, isFacture)}>
                      <Trash2 size={14} />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  );
};

export default Facturation;
