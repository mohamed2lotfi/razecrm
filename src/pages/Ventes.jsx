import React, { useState, useEffect, useMemo } from 'react';
import { Plus, CreditCard, FileText, FileDown, Trash2, TrendingUp, BarChart3, Coins, ClipboardList, Loader2, Pencil } from 'lucide-react';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import VenteForm from '@/components/VenteForm';
import FactureForm from '@/components/FactureForm';
import { format, parseISO, startOfMonth, endOfMonth, startOfWeek, endOfWeek, startOfYear, endOfYear, startOfDay, endOfDay, isWithinInterval } from 'date-fns';
import { fr } from 'date-fns/locale';
import { supabase } from '@/lib/supabase';

const Ventes = () => {
  const [ventes, setVentes] = useState([]);
  const [servicesList, setServicesList] = useState([]);
  const [fournisseursList, setFournisseursList] = useState([]);
  const [loading, setLoading] = useState(true);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingVente, setEditingVente] = useState(null);
  const [invoiceModal, setInvoiceModal] = useState({ isOpen: false, transaction: null, type: null });

  const [isReportOpen, setIsReportOpen] = useState(false);
  const [reportFilters, setReportFilters] = useState({
    periode: 'ce_mois',
    dateDebut: '',
    dateFin: '',
    fournisseur_id: '',
    service_id: '',
    statut: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const [vRes, sRes, fRes] = await Promise.all([
      supabase.from('ventes').select('*').order('date_vente', { ascending: false }),
      supabase.from('services').select('*'),
      supabase.from('fournisseurs').select('*')
    ]);

    if (vRes.data) setVentes(vRes.data);
    if (sRes.data) setServicesList(sRes.data);
    if (fRes.data) setFournisseursList(fRes.data);
    setLoading(false);
  };

  const handleSaveVente = async (newVenteData) => {
    if (newVenteData.id) {
      const { data, error } = await supabase.from('ventes').update(newVenteData).eq('id', newVenteData.id).select();
      if (!error && data) {
        setVentes(ventes.map(v => v.id === newVenteData.id ? data[0] : v));
        setIsFormOpen(false);
        setEditingVente(null);
      }
    } else {
      const { data, error } = await supabase.from('ventes').insert([newVenteData]).select();
      if (!error && data) {
        setVentes([data[0], ...ventes]);
        setIsFormOpen(false);
      }
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Supprimer cette transaction ?')) {
      await supabase.from('ventes').delete().eq('id', id);
      setVentes(prev => prev.filter(v => v.id !== id));
    }
  };

  const handleGenerateInvoice = async (data) => {
    const newDoc = {
      type_doc: data.invoiceType, // 'facture' ou 'proforma'
      transaction_id: data.id,
      client_nom: data.invoiceDetails.clientNomOverride,
      taxe: parseFloat(data.invoiceDetails.taxePercentage) || 0, 
      deadline: data.invoiceDetails.deadline || null,
      moyen_paiement: data.invoiceDetails.moyenPaiement,
      total_ht: parseFloat(data.total) || 0,
      total_ttc: (parseFloat(data.total) || 0) * (1 + (parseFloat(data.invoiceDetails.taxePercentage) || 0) / 100),
      date_creation: new Date().toISOString(),
      details: data.details, 
      service_id: data.service_id,
    };
    
    await supabase.from('factures').insert([newDoc]);
    setInvoiceModal({ isOpen: false, transaction: null, type: null });
    alert(`${data.invoiceType === 'proforma' ? 'Proforma' : 'Facture'} générée avec succès ! Vous pouvez la retrouver dans la section Facturation.`);
  };

  const fmt = (amount) => new Intl.NumberFormat('fr-DZ', { style: 'currency', currency: 'DZD' }).format(amount || 0);
  const fmtDate = (d) => { try { return format(parseISO(d), 'dd MMM yyyy', { locale: fr }); } catch { return d; } };

  const etatVariant = (e) => {
    if (e === 'Payé') return 'success';
    if (e === 'Reservé') return 'warning';
    return 'destructive';
  };

  const getServiceName = (id) => servicesList.find(s => s.id === id)?.nom || '—';
  const getFournisseurName = (id) => fournisseursList.find(f => f.id === id)?.nom || '—';

  // Monthly stats
  const monthlyStats = useMemo(() => {
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);
    const thisMonthVentes = ventes.filter(v => {
      try {
        const d = parseISO(v.date_vente || v.created_at);
        return isWithinInterval(d, { start: monthStart, end: monthEnd });
      } catch { return false; }
    });
    return {
      count: thisMonthVentes.length,
      totalCA: thisMonthVentes.reduce((acc, v) => acc + (parseFloat(v.total) || 0), 0),
      totalCommission: thisMonthVentes.reduce((acc, v) => acc + (parseFloat(v.commission) || 0), 0),
    };
  }, [ventes]);

  // Report generation
  const getDateRange = (periode) => {
    const now = new Date();
    switch (periode) {
      case 'aujourdhui': return { start: startOfDay(now), end: endOfDay(now) };
      case 'cette_semaine': return { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) };
      case 'ce_mois': return { start: startOfMonth(now), end: endOfMonth(now) };
      case 'cette_annee': return { start: startOfYear(now), end: endOfYear(now) };
      case 'personnalise': return {
        start: reportFilters.dateDebut ? parseISO(reportFilters.dateDebut) : startOfYear(now),
        end: reportFilters.dateFin ? parseISO(reportFilters.dateFin) : endOfDay(now),
      };
      default: return { start: startOfMonth(now), end: endOfMonth(now) };
    }
  };

  const handleGenerateReport = () => {
    const range = getDateRange(reportFilters.periode);
    const filtered = ventes.filter(v => {
      try {
        const d = parseISO(v.date_vente || v.created_at);
        if (!isWithinInterval(d, { start: range.start, end: range.end })) return false;
      } catch { return false; }
      if (reportFilters.fournisseur_id && v.fournisseur_id !== reportFilters.fournisseur_id) return false;
      if (reportFilters.service_id && v.service_id !== reportFilters.service_id) return false;
      if (reportFilters.statut && v.etat !== reportFilters.statut) return false;
      return true;
    });

    const totalCA = filtered.reduce((acc, v) => acc + (parseFloat(v.total) || 0), 0);
    const totalCommission = filtered.reduce((acc, v) => acc + (parseFloat(v.commission) || 0), 0);
    const totalBase = filtered.reduce((acc, v) => acc + (parseFloat(v.tarif_base) || 0), 0);

    const periodeLabel = {
      aujourdhui: "Aujourd'hui",
      cette_semaine: 'Cette semaine',
      ce_mois: 'Ce mois',
      cette_annee: 'Cette année',
      personnalise: `${reportFilters.dateDebut || '...'} → ${reportFilters.dateFin || '...'}`
    }[reportFilters.periode] || 'Ce mois';

    const fournisseurLabel = reportFilters.fournisseur_id ? getFournisseurName(reportFilters.fournisseur_id) : '';
    const serviceLabel = reportFilters.service_id ? getServiceName(reportFilters.service_id) : '';

    const lines = [
      `═══════════════════════════════════════`,
      `       RAPPORT DE VENTES - AGENCE CRM`,
      `═══════════════════════════════════════`,
      ``,
      `Période : ${periodeLabel}`,
      `Date du rapport : ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: fr })}`,
      fournisseurLabel ? `Fournisseur : ${fournisseurLabel}` : '',
      serviceLabel ? `Service : ${serviceLabel}` : '',
      reportFilters.statut ? `Statut : ${reportFilters.statut}` : '',
      ``,
      `───────────────────────────────────────`,
      `  RÉSUMÉ`,
      `───────────────────────────────────────`,
      `  Nombre d'opérations : ${filtered.length}`,
      `  Tarif de base total : ${totalBase.toLocaleString('fr-DZ')} DZD`,
      `  Total commissions   : ${totalCommission.toLocaleString('fr-DZ')} DZD`,
      `  Chiffre d'affaires  : ${totalCA.toLocaleString('fr-DZ')} DZD`,
      ``,
      `───────────────────────────────────────`,
      `  DÉTAIL DES OPÉRATIONS`,
      `───────────────────────────────────────`,
    ];

    filtered.forEach((v, i) => {
      lines.push(`  ${i + 1}. ${v.client_nom} | ${v.details || 'Sans détails'}`);
      lines.push(`     Date: ${v.date_vente} | Service: ${getServiceName(v.service_id)} | Fournisseur: ${getFournisseurName(v.fournisseur_id)}`);
      lines.push(`     Base: ${(v.tarif_base || 0).toLocaleString('fr-DZ')} DZD | Comm: ${(v.commission || 0).toLocaleString('fr-DZ')} DZD | Total: ${(v.total || 0).toLocaleString('fr-DZ')} DZD | État: ${v.etat}`);
      lines.push('');
    });

    lines.push(`═══════════════════════════════════════`);
    lines.push(`  Fin du rapport`);
    lines.push(`═══════════════════════════════════════`);

    const blob = new Blob([lines.filter(l => l !== '').join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rapport_ventes_${format(new Date(), 'yyyy-MM-dd_HHmm')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    setIsReportOpen(false);
  };

  return (
    <Layout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-extrabold tracking-tight">Suivi des Ventes</h1>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => setIsReportOpen(true)}>
            <ClipboardList size={16} className="mr-2" /> Générer un rapport
          </Button>
          <Button onClick={() => { setEditingVente(null); setIsFormOpen(true); }}>
            <Plus size={16} className="mr-1" /> Ajouter une vente
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="rounded-xl border bg-card shadow-sm p-5 flex items-center gap-4">
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-blue-100 text-blue-600 shrink-0">
            <BarChart3 size={22} />
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-widest font-bold text-muted-foreground">Opérations ce mois</p>
            <p className="text-2xl font-extrabold tabular-nums">{monthlyStats.count}</p>
          </div>
        </div>
        <div className="rounded-xl border bg-card shadow-sm p-5 flex items-center gap-4">
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-emerald-100 text-emerald-600 shrink-0">
            <TrendingUp size={22} />
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-widest font-bold text-muted-foreground">CA Brut ce mois</p>
            <p className="text-2xl font-extrabold tabular-nums text-emerald-600">{fmt(monthlyStats.totalCA)}</p>
          </div>
        </div>
        <div className="rounded-xl border bg-card shadow-sm p-5 flex items-center gap-4">
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-purple-100 text-purple-600 shrink-0">
            <Coins size={22} />
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-widest font-bold text-muted-foreground">CA Net de Commission</p>
            <p className="text-2xl font-extrabold tabular-nums text-purple-600">{fmt(monthlyStats.totalCA - monthlyStats.totalCommission)}</p>
          </div>
        </div>
        <div className="rounded-xl border bg-card shadow-sm p-5 flex items-center gap-4">
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-amber-100 text-amber-600 shrink-0">
            <Coins size={22} />
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-widest font-bold text-muted-foreground">Commissions ce mois</p>
            <p className="text-2xl font-extrabold tabular-nums text-amber-600">{fmt(monthlyStats.totalCommission)}</p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Date</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Client</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Détails</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Fournisseur</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Service</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Base</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Commission</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total</th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">État</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="10" className="py-16 text-center">
                    <Loader2 size={32} className="mx-auto animate-spin text-primary mb-3" />
                    <p className="font-medium text-muted-foreground">Chargement des ventes...</p>
                  </td>
                </tr>
              ) : ventes.length === 0 ? (
                <tr>
                  <td colSpan="10" className="py-16 text-center">
                    <CreditCard size={40} className="mx-auto text-muted-foreground/30 mb-3" />
                    <p className="font-medium text-muted-foreground">Aucune vente enregistrée</p>
                    <p className="text-xs text-muted-foreground mt-1">Cliquez sur "Ajouter une vente" pour commencer.</p>
                  </td>
                </tr>
              ) : ventes.map(v => (
                <tr key={v.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 text-muted-foreground">{fmtDate(v.date_vente || v.created_at)}</td>
                  <td className="px-4 py-3 font-medium">{v.client_nom}</td>
                  <td className="px-4 py-3 text-muted-foreground max-w-[180px] truncate">{v.details || '—'}</td>
                  <td className="px-4 py-3">
                    {v.fournisseur_id ? <Badge variant="secondary" className="text-xs">{getFournisseurName(v.fournisseur_id)}</Badge> : '—'}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{getServiceName(v.service_id)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{fmt(v.tarif_base)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{fmt(v.commission)}</td>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums">{fmt(v.total)}</td>
                  <td className="px-4 py-3 text-center"><Badge variant={etatVariant(v.etat)}>{v.etat}</Badge></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button variant="outline" size="sm" onClick={() => { setEditingVente(v); setIsFormOpen(true); }}>
                        <Pencil size={13} /> Modifier
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setInvoiceModal({ isOpen: true, transaction: v, type: 'proforma' })}>
                        <FileText size={13} /> Proforma
                      </Button>
                      <Button size="sm" onClick={() => setInvoiceModal({ isOpen: true, transaction: v, type: 'facture' })}>
                        <FileDown size={13} /> Facture
                      </Button>
                      <Button variant="destructive" size="icon-sm" onClick={() => handleDelete(v.id)}>
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

      {isFormOpen && <VenteForm onClose={() => { setIsFormOpen(false); setEditingVente(null); }} onSave={handleSaveVente} initialData={editingVente} />}
      {invoiceModal.isOpen && <FactureForm transaction={invoiceModal.transaction} type={invoiceModal.type}
        onClose={() => setInvoiceModal({ isOpen: false, transaction: null, type: null })} onGenerate={handleGenerateInvoice} servicesList={servicesList} />}

      {/* ── Modal Rapport ───────────────────────────────────── */}
      <Dialog open={isReportOpen} onOpenChange={setIsReportOpen}>
        <DialogContent className="max-w-lg p-0 overflow-hidden" onClose={() => setIsReportOpen(false)}>
          <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent px-6 py-5 border-b">
            <DialogHeader>
              <DialogTitle className="text-2xl font-extrabold flex items-center gap-2">
                <ClipboardList className="text-primary" size={24} />
                Générer un Rapport
              </DialogTitle>
              <DialogDescription>Filtrez les ventes pour générer un rapport détaillé</DialogDescription>
            </DialogHeader>
          </div>

          <div className="p-6 space-y-6">
            <div className="space-y-2.5">
              <Label className="text-sm font-bold text-foreground">Période</Label>
              <Select value={reportFilters.periode} onChange={e => setReportFilters(p => ({ ...p, periode: e.target.value }))} className="h-11 bg-muted/20 focus-visible:bg-transparent transition-colors">
                <option value="aujourdhui">Aujourd'hui</option>
                <option value="cette_semaine">Cette semaine</option>
                <option value="ce_mois">Ce mois</option>
                <option value="cette_annee">Cette année</option>
                <option value="personnalise">Personnalisé</option>
              </Select>
            </div>

            {reportFilters.periode === 'personnalise' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2.5">
                  <Label className="text-sm font-bold text-foreground">Date début</Label>
                  <Input type="date" value={reportFilters.dateDebut} onChange={e => setReportFilters(p => ({ ...p, dateDebut: e.target.value }))} className="h-11 bg-muted/20 focus-visible:bg-transparent transition-colors" />
                </div>
                <div className="space-y-2.5">
                  <Label className="text-sm font-bold text-foreground">Date fin</Label>
                  <Input type="date" value={reportFilters.dateFin} onChange={e => setReportFilters(p => ({ ...p, dateFin: e.target.value }))} className="h-11 bg-muted/20 focus-visible:bg-transparent transition-colors" />
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2.5">
                <Label className="text-sm font-bold text-foreground">Fournisseur</Label>
                <Select value={reportFilters.fournisseur_id} onChange={e => setReportFilters(p => ({ ...p, fournisseur_id: e.target.value }))} className="h-11 bg-muted/20 focus-visible:bg-transparent transition-colors">
                  <option value="">Tous</option>
                  {fournisseursList.map(p => <option key={p.id} value={p.id}>{p.nom}</option>)}
                </Select>
              </div>
              <div className="space-y-2.5">
                <Label className="text-sm font-bold text-foreground">Service</Label>
                <Select value={reportFilters.service_id} onChange={e => setReportFilters(p => ({ ...p, service_id: e.target.value }))} className="h-11 bg-muted/20 focus-visible:bg-transparent transition-colors">
                  <option value="">Tous</option>
                  {servicesList.map(s => <option key={s.id} value={s.id}>{s.nom}</option>)}
                </Select>
              </div>
              <div className="space-y-2.5">
                <Label className="text-sm font-bold text-foreground">Statut</Label>
                <Select value={reportFilters.statut} onChange={e => setReportFilters(p => ({ ...p, statut: e.target.value }))} className="h-11 bg-muted/20 focus-visible:bg-transparent transition-colors">
                  <option value="">Tous</option>
                  <option value="Payé">Payé</option>
                  <option value="Reservé">Reservé</option>
                  <option value="Annulé">Annulé</option>
                </Select>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="outline" onClick={() => setIsReportOpen(false)} className="h-11 px-6">Annuler</Button>
              <Button onClick={handleGenerateReport} className="h-11 px-8">
                <ClipboardList size={16} className="mr-2" /> Générer le rapport
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default Ventes;
