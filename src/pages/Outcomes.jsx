import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Loader2, ArrowRightLeft, CreditCard, Pencil } from 'lucide-react';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import OutcomeForm from '@/components/OutcomeForm';
import { supabase } from '@/lib/supabase';

const Outcomes = () => {
  const [outcomes, setOutcomes] = useState([]);
  const [enveloppes, setEnveloppes] = useState({});
  const [sousEnveloppes, setSousEnveloppes] = useState({});
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingOutcome, setEditingOutcome] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const [envRes, subEnvRes, outRes] = await Promise.all([
      supabase.from('outcomes_enveloppes').select('*'),
      supabase.from('outcomes_sous_enveloppes').select('*'),
      supabase.from('outcomes').select('*').order('date_paiement', { ascending: false })
    ]);

    if (envRes.data) {
      const envMap = {};
      envRes.data.forEach(e => { envMap[e.id] = e.nom; });
      setEnveloppes(envMap);
    }

    if (subEnvRes.data) {
      const subEnvMap = {};
      subEnvRes.data.forEach(se => { subEnvMap[se.id] = se.nom; });
      setSousEnveloppes(subEnvMap);
    }
    
    if (outRes.data) {
      setOutcomes(outRes.data);
    }
    setLoading(false);
  };

  const handleSave = async (newOutcomeData) => {
    if (newOutcomeData.id) {
      const { data, error } = await supabase.from('outcomes').update(newOutcomeData).eq('id', newOutcomeData.id).select();
      if (!error && data) {
        setOutcomes(outcomes.map(o => o.id === newOutcomeData.id ? data[0] : o));
        setIsFormOpen(false);
        setEditingOutcome(null);
      }
    } else {
      const { data, error } = await supabase.from('outcomes').insert([newOutcomeData]).select();
      if (!error && data) {
        setOutcomes([data[0], ...outcomes]);
        setIsFormOpen(false);
      }
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Voulez-vous vraiment supprimer cette dépense ?')) {
      await supabase.from('outcomes').delete().eq('id', id);
      setOutcomes(prev => prev.filter(o => o.id !== id));
    }
  };

  return (
    <Layout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-extrabold tracking-tight">Dépenses Générales (Outcomes)</h1>
        <Button onClick={() => { setEditingOutcome(null); setIsFormOpen(true); }} className="bg-orange-500 hover:bg-orange-600 text-white">
          <Plus size={16} className="mr-1" /> Ajouter une dépense
        </Button>
      </div>

      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Date</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Enveloppe</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Référence</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Montant Saisi</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total (DZD)</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" className="py-16 text-center">
                    <Loader2 size={32} className="mx-auto animate-spin text-orange-500 mb-3" />
                    <p className="font-medium text-muted-foreground">Chargement des dépenses...</p>
                  </td>
                </tr>
              ) : outcomes.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-16 text-center">
                    <CreditCard size={40} className="mx-auto text-muted-foreground/30 mb-3" />
                    <p className="font-medium text-muted-foreground">Aucune dépense enregistrée</p>
                    <p className="text-xs text-muted-foreground mt-1">Cliquez sur "Ajouter une dépense" pour commencer.</p>
                  </td>
                </tr>
              ) : outcomes.map(o => (
                <tr key={o.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(o.date_paiement).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="px-4 py-3 font-medium">
                    <div className="flex flex-col gap-1 items-start">
                      <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                        {enveloppes[o.enveloppe_id] || 'Inconnu'}
                      </Badge>
                      {o.sous_enveloppe_id && (
                        <span className="text-xs text-muted-foreground ml-1">
                          ↳ {sousEnveloppes[o.sous_enveloppe_id] || 'Inconnu'}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    <div className="flex flex-col gap-1">
                      <span>{o.reference_paiement || '—'}</span>
                      {o.description && (
                        <span className="text-xs text-muted-foreground/70 italic truncate max-w-[200px]" title={o.description}>
                          {o.description}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="font-medium">
                      {Number(o.montant).toLocaleString('fr-DZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      <span className="text-xs text-muted-foreground ml-1">{o.devise}</span>
                    </div>
                    {o.devise !== 'DZD' && (
                      <div className="text-[10px] text-muted-foreground">Taux: {o.taux_change}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-extrabold text-orange-600">
                    {Number(o.montant_dzd).toLocaleString('fr-DZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-xs">DZD</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button variant="outline" size="sm" onClick={() => { setEditingOutcome(o); setIsFormOpen(true); }}>
                        <Pencil size={13} />
                      </Button>
                      <Button variant="destructive" size="icon-sm" onClick={() => handleDelete(o.id)}>
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isFormOpen && <OutcomeForm onClose={() => { setIsFormOpen(false); setEditingOutcome(null); }} onSave={handleSave} initialData={editingOutcome} />}
    </Layout>
  );
};

export default Outcomes;
