import React, { useState, useEffect, useMemo } from 'react';
import { Plus, CreditCard, FileText, FileDown, Trash2, TrendingUp, BarChart3, Coins, ClipboardList, Loader2, Pencil, Search, ChevronLeft, ChevronRight } from 'lucide-react';
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
import { useAuth } from '@/contexts/AuthContext';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const Ventes = () => {
  const { isAdmin } = useAuth();
  const [ventes, setVentes] = useState([]);
  const [servicesList, setServicesList] = useState([]);
  const [fournisseursList, setFournisseursList] = useState([]);
  const [loading, setLoading] = useState(true);

  // Stats State
  const [stats, setStats] = useState({ count: 0, totalCA: 0, totalCommission: 0 });

  // Pagination & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const ITEMS_PER_PAGE = 20;

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
    statut: '',
    format: 'pdf'
  });

  useEffect(() => {
    fetchMetadata();
    fetchStats();
  }, []);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    fetchVentesPage();
  }, [currentPage, debouncedSearch]);

  const fetchMetadata = async () => {
    const [sRes, fRes] = await Promise.all([
      supabase.from('services').select('*'),
      supabase.from('fournisseurs').select('*')
    ]);
    if (sRes.data) setServicesList(sRes.data);
    if (fRes.data) setFournisseursList(fRes.data);
  };

  const fetchStats = async () => {
    const now = new Date();
    const monthStart = startOfMonth(now).toISOString();
    const monthEnd = endOfMonth(now).toISOString();
    
    const { data } = await supabase.from('ventes')
      .select('total, commission')
      .gte('created_at', monthStart)
      .lte('created_at', monthEnd);

    if (data) {
      setStats({
        count: data.length,
        totalCA: data.reduce((acc, v) => acc + (parseFloat(v.total) || 0), 0),
        totalCommission: data.reduce((acc, v) => acc + (parseFloat(v.commission) || 0), 0)
      });
    }
  };

  const fetchVentesPage = async () => {
    setLoading(true);
    let query = supabase.from('ventes').select('*', { count: 'exact' });

    if (debouncedSearch) {
      query = query.or(`client_nom.ilike.%${debouncedSearch}%,details.ilike.%${debouncedSearch}%`);
    }

    const from = (currentPage - 1) * ITEMS_PER_PAGE;
    const to = from + ITEMS_PER_PAGE - 1;

    const { data, error, count } = await query
      .order('date_vente', { ascending: false })
      .order('created_at', { ascending: false })
      .range(from, to);

    if (!error && data) {
      setVentes(data);
      if (count !== null) setTotalCount(count);
    }
    setLoading(false);
  };

  const handleSaveVente = async (rawData) => {
    // Separate visa metadata and id from DB fields
    const { _visaMeta: visaMeta, id, ...newVenteData } = rawData;

    if (id) {
      const { data, error } = await supabase.from('ventes').update(newVenteData).eq('id', id).select();
      if (error) {
        console.error("Update error:", error);
        alert(`Erreur: ${error.message}`);
      } else if (data) {
        fetchVentesPage();
        fetchStats();
        setIsFormOpen(false);
        setEditingVente(null);
      }
    } else {
      const { data, error } = await supabase.from('ventes').insert([newVenteData]).select();
      if (error) {
        console.error("Insert error:", error);
        alert(`Erreur: ${error.message}`);
      } else if (data) {
        const insertedVente = data[0];

        // If this is a visa sale, create visa_demandes for each passager
        if (visaMeta && visaMeta.passagers && visaMeta.passagers.length > 0) {
          for (const passager of visaMeta.passagers) {
            const { data: demandeData } = await supabase.from('visa_demandes').insert([{
              vente_id: insertedVente.id,
              client_id: insertedVente.client_id,
              visa_type_id: visaMeta.visa_type_id,
              country_id: visaMeta.country_id,
              passager_nom: passager.nom,
              tarif_base: visaMeta.tarif_base_unit,
              tarif_vente: passager.tarif_vente || visaMeta.tarif_vente_unit,
              statut: 'Nouveau'
            }]).select();

            // Create dossier tracking entries for each document
            if (demandeData && demandeData[0] && visaMeta.dossier && visaMeta.dossier.length > 0) {
              const now = new Date().toISOString();
              const dossierEntries = visaMeta.dossier.map(docName => ({
                demande_id: demandeData[0].id,
                document_nom: docName,
                recu: visaMeta.dossierChecks?.[docName] || false,
                date_reception: visaMeta.dossierChecks?.[docName] ? now : null
              }));
              await supabase.from('visa_dossier_tracking').insert(dossierEntries);
            }
          }
        }

        fetchVentesPage();
        fetchStats();
        setIsFormOpen(false);
      }
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Supprimer cette transaction ?')) {
      await supabase.from('ventes').delete().eq('id', id);
      fetchVentesPage();
      fetchStats();
    }
  };

  const handleGenerateInvoice = async (data) => {
    // Generate Sequential Number
    const year = new Date().getFullYear();
    const { data: lastInvoice } = await supabase
      .from('factures')
      .select('numero')
      .eq('type_doc', data.invoiceType)
      .like('numero', `%/${year}`)
      .order('date_creation', { ascending: false })
      .limit(1);
      
    let numero = `001/${year}`;
    if (lastInvoice && lastInvoice.length > 0 && lastInvoice[0].numero) {
      const lastNum = parseInt(lastInvoice[0].numero.split('/')[0], 10);
      const nextNum = (lastNum + 1).toString().padStart(3, '0');
      numero = `${nextNum}/${year}`;
    }

    // Prepare line items
    const items = [
      {
        description: data.details || 'Prestation de service',
        quantite: 1,
        prix_unitaire: parseFloat(data.total) || 0,
        total: parseFloat(data.total) || 0
      }
    ];

    const newDoc = {
      numero,
      type_doc: data.invoiceType,
      transaction_id: data.id,
      client_nom: data.invoiceDetails.clientNomOverride,
      taxe: parseFloat(data.invoiceDetails.taxePercentage) || 0, 
      deadline: data.invoiceDetails.deadline || null,
      moyen_paiement: data.invoiceDetails.moyenPaiement,
      total_ht: parseFloat(data.total) || 0,
      total_ttc: (parseFloat(data.total) || 0) * (1 + (parseFloat(data.invoiceDetails.taxePercentage) || 0) / 100),
      date_creation: new Date().toISOString(),
      details: data.details, 
      items: items,
      service_id: data.service_id,
    };
    
    await supabase.from('factures').insert([newDoc]);
    setInvoiceModal({ isOpen: false, transaction: null, type: null });
    alert(`${data.invoiceType === 'proforma' ? 'Proforma' : 'Facture'} N° ${numero} générée avec succès !`);
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

  const handleGenerateReport = async () => {
    setIsReportOpen(false);
    
    const range = getDateRange(reportFilters.periode);
    
    let query = supabase.from('ventes').select('*')
      .gte('created_at', range.start.toISOString())
      .lte('created_at', range.end.toISOString());
    
    if (reportFilters.fournisseur_id) query = query.eq('fournisseur_id', reportFilters.fournisseur_id);
    if (reportFilters.service_id) query = query.eq('service_id', reportFilters.service_id);
    if (reportFilters.statut) query = query.eq('etat', reportFilters.statut);

    const { data } = await query.order('created_at', { ascending: false });
    const filtered = data || [];

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

    const timestamp = format(new Date(), 'yyyy-MM-dd_HHmm');
    const filename = `rapport_ventes_${timestamp}`;
    
    if (reportFilters.format === 'txt') {
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
        lines.push(`     Date: ${v.date_vente || v.created_at.substring(0, 10)} | Service: ${getServiceName(v.service_id)} | Fournisseur: ${getFournisseurName(v.fournisseur_id)}`);
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
      a.download = `${filename}.txt`;
      a.click();
      URL.revokeObjectURL(url);
    } else if (reportFilters.format === 'csv') {
      const header = ["Client", "Details", "Date", "Service", "Fournisseur", "Tarif Base (DZD)", "Commission (DZD)", "Total (DZD)", "Statut"];
      const rows = filtered.map(v => [
        `"${(v.client_nom || '').replace(/"/g, '""')}"`,
        `"${(v.details || '').replace(/"/g, '""')}"`,
        v.date_vente || v.created_at.substring(0, 10),
        `"${getServiceName(v.service_id)}"`,
        `"${getFournisseurName(v.fournisseur_id)}"`,
        v.tarif_base || 0,
        v.commission || 0,
        v.total || 0,
        v.etat
      ]);
      const csvContent = [header.join(";"), ...rows.map(r => r.join(";"))].join("\n");
      const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${filename}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      const doc = new jsPDF('landscape');
      
      const formatMoney = (val) => Number(val || 0).toLocaleString('fr-DZ').replace(/\s|\u202F|\u00A0/g, ' ');
      const formatDateStr = (val) => val ? val.substring(0, 10) : '';
      
      doc.setFontSize(18);
      doc.text('RAPPORT DE VENTES - AGENCE CRM', 14, 22);
      
      doc.setFontSize(11);
      doc.text(`Période: ${periodeLabel}`, 14, 32);
      doc.text(`Généré le: ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: fr })}`, 14, 38);
      
      let yPos = 44;
      if (fournisseurLabel) { doc.text(`Fournisseur: ${fournisseurLabel}`, 14, yPos); yPos += 6; }
      if (serviceLabel) { doc.text(`Service: ${serviceLabel}`, 14, yPos); yPos += 6; }
      if (reportFilters.statut) { doc.text(`Statut: ${reportFilters.statut}`, 14, yPos); yPos += 6; }
      
      yPos += 4;
      
      doc.setFontSize(12);
      doc.text(`Résumé :`, 14, yPos);
      yPos += 6;
      doc.setFontSize(10);
      doc.text(`Nombre d'opérations: ${filtered.length}`, 14, yPos);
      doc.text(`Tarif de base total: ${formatMoney(totalBase)} DZD`, 120, yPos);
      yPos += 6;
      doc.text(`Total commissions: ${formatMoney(totalCommission)} DZD`, 14, yPos);
      doc.text(`Chiffre d'affaires: ${formatMoney(totalCA)} DZD`, 120, yPos);
      
      yPos += 10;
      
      const tableData = filtered.map(v => [
        v.client_nom,
        formatDateStr(v.date_vente || v.created_at),
        getServiceName(v.service_id),
        getFournisseurName(v.fournisseur_id),
        formatMoney(v.tarif_base),
        formatMoney(v.commission),
        formatMoney(v.total),
        v.etat
      ]);
      
      autoTable(doc, {
        startY: yPos,
        head: [['Client', 'Date', 'Service', 'Fournisseur', 'Base (DZD)', 'Comm (DZD)', 'Total (DZD)', 'Statut']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [41, 128, 185] }
      });
      
      doc.save(`${filename}.pdf`);
    }
  };

  return (
    <Layout>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
        <h1 className="text-2xl font-extrabold tracking-tight">Suivi des Ventes</h1>
        
        <div className="flex items-center gap-3 w-full sm:w-auto flex-wrap">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Rechercher (Client, Détails)..." 
              className="pl-9 bg-white" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button variant="outline" onClick={() => setIsReportOpen(true)}>
            <ClipboardList size={16} className="mr-2 hidden sm:inline" /> Rapport
          </Button>
          <Button onClick={() => { setEditingVente(null); setIsFormOpen(true); }} className="shrink-0">
            <Plus size={16} className="mr-1 hidden sm:inline" /> Vente
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
            <p className="text-2xl font-extrabold tabular-nums">{stats.count}</p>
          </div>
        </div>
        <div className="rounded-xl border bg-card shadow-sm p-5 flex items-center gap-4">
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-emerald-100 text-emerald-600 shrink-0">
            <TrendingUp size={22} />
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-widest font-bold text-muted-foreground">CA Brut ce mois</p>
            <p className="text-2xl font-extrabold tabular-nums text-emerald-600">{fmt(stats.totalCA)}</p>
          </div>
        </div>
        <div className="rounded-xl border bg-card shadow-sm p-5 flex items-center gap-4">
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-purple-100 text-purple-600 shrink-0">
            <Coins size={22} />
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-widest font-bold text-muted-foreground">CA Net de Commission</p>
            <p className="text-2xl font-extrabold tabular-nums text-purple-600">{fmt(stats.totalCA - stats.totalCommission)}</p>
          </div>
        </div>
        <div className="rounded-xl border bg-card shadow-sm p-5 flex items-center gap-4">
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-amber-100 text-amber-600 shrink-0">
            <Coins size={22} />
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-widest font-bold text-muted-foreground">Commissions ce mois</p>
            <p className="text-2xl font-extrabold tabular-nums text-amber-600">{fmt(stats.totalCommission)}</p>
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
                    <p className="font-medium text-muted-foreground">Aucune vente trouvée</p>
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
                        <Pencil size={13} />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setInvoiceModal({ isOpen: true, transaction: v, type: 'proforma' })}>
                        <FileText size={13} />
                      </Button>
                      <Button size="sm" onClick={() => setInvoiceModal({ isOpen: true, transaction: v, type: 'facture' })}>
                        <FileDown size={13} />
                      </Button>
                      {isAdmin && (
                        <Button variant="destructive" size="icon-sm" onClick={() => handleDelete(v.id)} title="Supprimer la vente">
                          <Trash2 size={14} />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination Controls */}
      {!loading && totalCount > ITEMS_PER_PAGE && (
        <div className="flex flex-col sm:flex-row items-center justify-between mt-4 gap-4 bg-white/50 p-3 rounded-xl border border-primary/10">
          <span className="text-sm text-slate-600 font-medium">
            Affichage de <span className="font-extrabold text-primary">{ventes.length > 0 ? (currentPage - 1) * ITEMS_PER_PAGE + 1 : 0}</span> à <span className="font-extrabold text-primary">{Math.min(currentPage * ITEMS_PER_PAGE, totalCount)}</span> sur <span className="font-extrabold text-primary">{totalCount}</span> ventes
          </span>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            >
              <ChevronLeft size={16} className="mr-1" /> Précédent
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              disabled={currentPage * ITEMS_PER_PAGE >= totalCount}
              onClick={() => setCurrentPage(prev => prev + 1)}
            >
              Suivant <ChevronRight size={16} className="ml-1" />
            </Button>
          </div>
        </div>
      )}

      {isFormOpen && <VenteForm onClose={() => { setIsFormOpen(false); setEditingVente(null); }} onSave={handleSaveVente} initialData={editingVente} />}
      {invoiceModal.isOpen && <FactureForm transaction={invoiceModal.transaction} type={invoiceModal.type}
        onClose={() => setInvoiceModal({ isOpen: false, transaction: null, type: null })} onGenerate={handleGenerateInvoice} servicesList={servicesList} />}

      {/* ── Modal Rapport ───────────────────────────────────── */}
      <Dialog open={isReportOpen} onOpenChange={setIsReportOpen}>
        <DialogContent className="max-w-lg p-0 overflow-hidden">
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
            
            <div className="space-y-2.5 mt-2">
              <Label className="text-sm font-bold text-foreground">Format du rapport</Label>
              <Select value={reportFilters.format} onChange={e => setReportFilters(p => ({ ...p, format: e.target.value }))} className="h-11 bg-muted/20 focus-visible:bg-transparent transition-colors">
                <option value="pdf">PDF (Recommandé)</option>
                <option value="csv">Excel (CSV)</option>
                <option value="txt">Texte brut (.txt)</option>
              </Select>
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
