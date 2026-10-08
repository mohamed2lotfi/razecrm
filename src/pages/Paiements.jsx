import React, { useState, useEffect, useMemo } from 'react';
import { 
  Coins, CreditCard, Search, Plus, Filter, FileText, Download, Printer, 
  Calendar, Layers, ArrowUpRight, TrendingUp, RefreshCw, Trash2, Pencil,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, CheckCircle2, Wallet, Building2, User, Eye,
  ArrowRight, ShieldCheck, Sparkles, DollarSign, AlertCircle
} from 'lucide-react';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import CountryFlag from '@/components/CountryFlag';
import VentePaiementsModal, { fmtDZD, fmtCurrency } from '@/components/VentePaiementsModal';
import { 
  format, parseISO, startOfMonth, endOfMonth, startOfWeek, endOfWeek, 
  startOfYear, endOfYear, startOfDay, endOfDay, isWithinInterval 
} from 'date-fns';
import { fr } from 'date-fns/locale';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const CURRENCY_OPTIONS = [
  { value: 'all', label: 'Toutes les devises' },
  { value: 'DZD', label: '🇩🇿 DZD — Dinar Algérien' },
  { value: 'EUR', label: '🇪🇺 EUR — Euro' },
  { value: 'USD', label: '🇺🇸 USD — Dollar US' },
  { value: 'SAR', label: '🇸🇦 SAR — Riyal Saoudien' },
  { value: 'CAD', label: '🇨🇦 CAD — Dollar Canadien' },
  { value: 'GBP', label: '🇬🇧 GBP — Livre Sterling' },
  { value: 'TRY', label: '🇹🇷 TRY — Livre Turque' },
  { value: 'AED', label: '🇦🇪 AED — Dirham Émirati' },
];

const MOYEN_OPTIONS = [
  { value: 'all', label: 'Tous les moyens' },
  { value: 'Espèce', label: '💵 Espèce / Cash' },
  { value: 'Virement bancaire', label: '🏦 Virement bancaire' },
  { value: 'Chèque', label: '🧾 Chèque bancaire' },
  { value: 'Versement CCP', label: '📮 Versement CCP / Poste' },
  { value: 'Carte bancaire', label: '💳 Carte bancaire / TPE' },
];

const Paiements = () => {
  const { isAdmin } = useAuth();
  const [paiements, setPaiements] = useState([]);
  const [ventesList, setVentesList] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPeriode, setSelectedPeriode] = useState('ce_mois');
  const [dateDebut, setDateDebut] = useState('');
  const [dateFin, setDateFin] = useState('');
  const [filterDevise, setFilterDevise] = useState('all');
  const [filterMoyen, setFilterMoyen] = useState('all');

  // Active modal for a specific sale
  const [activeVenteForPayment, setActiveVenteForPayment] = useState(null);

  // Quick "Encaisser sur une Vente" Selector Modal
  const [isSelectVenteOpen, setIsSelectVenteOpen] = useState(false);
  const [venteSearchQuery, setVenteSearchQuery] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);

  // Reset to page 1 whenever filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedPeriode, dateDebut, dateFin, filterDevise, filterMoyen, searchQuery]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch All Ventes
      const { data: vData } = await supabase
        .from('ventes')
        .select('*, vente_articles(*)')
        .order('date_vente', { ascending: false });

      if (vData) setVentesList(vData);

      // 2. Fetch All Vente Paiements
      const { data: pData, error: pErr } = await supabase
        .from('vente_paiements')
        .select('*')
        .order('date_paiement', { ascending: false })
        .order('created_at', { ascending: false });

      if (!pErr && pData) {
        setPaiements(pData);
      } else {
        console.warn("Table vente_paiements:", pErr);
        setPaiements([]);
      }
    } catch (err) {
      console.warn("Erreur fetch paiements:", err);
    }
    setLoading(false);
  };

  // Helper date interval check
  const getDateRange = (periode) => {
    const now = new Date();
    switch (periode) {
      case 'aujourdhui': return { start: startOfDay(now), end: endOfDay(now) };
      case 'cette_semaine': return { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) };
      case 'ce_mois': return { start: startOfMonth(now), end: endOfMonth(now) };
      case 'cette_annee': return { start: startOfYear(now), end: endOfYear(now) };
      case 'personnalise': return {
        start: dateDebut ? parseISO(dateDebut) : startOfYear(now),
        end: dateFin ? parseISO(dateFin) : endOfDay(now),
      };
      case 'tout': return null;
      default: return { start: startOfMonth(now), end: endOfMonth(now) };
    }
  };

  // Filtered Payments
  const filteredPaiements = useMemo(() => {
    const range = getDateRange(selectedPeriode);

    return paiements.filter(p => {
      // Date filter
      if (range && p.date_paiement) {
        try {
          const pDate = parseISO(p.date_paiement);
          if (!isWithinInterval(pDate, { start: range.start, end: range.end })) {
            return false;
          }
        } catch {
          // ignore
        }
      }

      // Devise filter
      if (filterDevise !== 'all' && p.devise !== filterDevise) {
        return false;
      }

      // Moyen filter
      if (filterMoyen !== 'all' && p.moyen_paiement !== filterMoyen) {
        return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchedPayeur = p.nom_payeur?.toLowerCase().includes(q);
        const matchedRecu = p.num_recu?.toLowerCase().includes(q);
        const matchedNotes = p.notes?.toLowerCase().includes(q);
        const matchedPax = p.passager_nom?.toLowerCase().includes(q);

        // Find linked vente
        const linkedVente = ventesList.find(v => v.id === p.vente_id);
        const matchedClient = linkedVente?.client_nom?.toLowerCase().includes(q);
        const matchedDest = linkedVente?.destination?.toLowerCase().includes(q);

        if (!matchedPayeur && !matchedRecu && !matchedNotes && !matchedPax && !matchedClient && !matchedDest) {
          return false;
        }
      }

      return true;
    });
  }, [paiements, selectedPeriode, dateDebut, dateFin, filterDevise, filterMoyen, searchQuery, ventesList]);

  // Statistics Calculations
  const stats = useMemo(() => {
    const totalEncaissedDZD = filteredPaiements.reduce((acc, p) => acc + (Number(p.montant_dzd) || 0), 0);
    const countPayments = filteredPaiements.length;
    
    // Total in Foreign Currencies
    const foreignPayments = filteredPaiements.filter(p => p.devise && p.devise !== 'DZD');
    const totalForeignDZD = foreignPayments.reduce((acc, p) => acc + (Number(p.montant_dzd) || 0), 0);

    // Global remaining on sales
    const totalSalesCA = ventesList.reduce((acc, v) => acc + (Number(v.total) || 0), 0);
    const totalAllPaidDZD = paiements.reduce((acc, p) => acc + (Number(p.montant_dzd) || 0), 0);
    const totalPendingReceivables = Math.max(0, totalSalesCA - totalAllPaidDZD);

    return {
      totalEncaissedDZD,
      countPayments,
      foreignCount: foreignPayments.length,
      totalForeignDZD,
      totalPendingReceivables
    };
  }, [filteredPaiements, ventesList, paiements]);

  // Paginated Payments
  const paginatedPaiements = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredPaiements.slice(start, start + itemsPerPage);
  }, [filteredPaiements, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredPaiements.length / itemsPerPage) || 1;

  // Filtered Ventes for the quick-add selector modal
  const filteredVentesForSelector = useMemo(() => {
    if (!venteSearchQuery.trim()) return ventesList.slice(0, 15);
    const q = venteSearchQuery.toLowerCase().trim();
    return ventesList.filter(v => 
      v.client_nom?.toLowerCase().includes(q) ||
      v.destination?.toLowerCase().includes(q) ||
      v.details?.toLowerCase().includes(q)
    ).slice(0, 20);
  }, [ventesList, venteSearchQuery]);

  // Export Journal PDF
  const handleExportJournalPDF = () => {
    const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'landscape' });
    const todayStr = format(new Date(), 'dd MMMM yyyy à HH:mm', { locale: fr });

    // Header
    doc.setFillColor(15, 23, 42); // slate-900
    doc.rect(0, 0, 297, 25, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text("JOURNAL DES ENCAISSEMENTS & PAIEMENTS VENTES", 15, 12);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Période : ${selectedPeriode.replace('_', ' ').toUpperCase()}  |  Édité le : ${todayStr}`, 15, 19);

    doc.text(`TOTAL ENCAISSÉ : ${fmtDZD(stats.totalEncaissedDZD)} (${stats.countPayments} versements)`, 282, 15, { align: 'right' });

    // Table
    const tableRows = filteredPaiements.map(p => {
      const v = ventesList.find(x => x.id === p.vente_id);
      const isForeign = p.devise && p.devise !== 'DZD';
      const montantDeviseStr = isForeign ? `${p.montant_original} ${p.devise} (taux ${p.taux_change})` : '—';
      const pDate = p.date_paiement ? format(new Date(p.date_paiement), 'dd/MM/yyyy') : '—';

      return [
        pDate,
        p.num_recu || '—',
        p.nom_payeur || v?.client_nom || 'Client',
        v?.destination ? `${v.destination} - ${v.client_nom}` : (v?.client_nom || 'Vente directe'),
        p.moyen_paiement || 'Espèce',
        montantDeviseStr,
        fmtDZD(p.montant_dzd),
        p.notes || ''
      ];
    });

    autoTable(doc, {
      startY: 32,
      head: [['Date', 'N° Reçu', 'Payeur', 'Dossier / Vente', 'Moyen', 'Montant Devise', 'Équivalent DZD', 'Remarques']],
      body: tableRows,
      theme: 'grid',
      headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },
      bodyStyles: { fontSize: 8.5, textColor: [30, 41, 59] },
      columnStyles: {
        0: { cellWidth: 22 },
        1: { cellWidth: 28, fontStyle: 'bold' },
        2: { cellWidth: 40 },
        3: { cellWidth: 48 },
        4: { cellWidth: 32 },
        5: { cellWidth: 40, halign: 'right' },
        6: { cellWidth: 35, halign: 'right', fontStyle: 'bold' },
        7: { cellWidth: 40 }
      }
    });

    // Summary Footer
    const finalY = doc.lastAutoTable.finalY + 8;
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(15, finalY, 267, 16, 2, 2, 'F');
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text(`Nombre total de versements : ${stats.countPayments}`, 20, finalY + 6.5);
    doc.text(`En devises étrangères : ${stats.foreignCount} (${fmtDZD(stats.totalForeignDZD)})`, 20, finalY + 12);
    doc.text(`TOTAL GÉNÉRAL ENCAISSÉ : ${fmtDZD(stats.totalEncaissedDZD)}`, 275, finalY + 10, { align: 'right' });

    doc.save(`Journal_Paiements_${selectedPeriode}_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
  };

  return (
    <Layout>
      <div className="space-y-6">
        
        {/* ── Top Header ────────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase tracking-[0.2em] font-extrabold text-emerald-600 dark:text-emerald-400 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                Finance & Trésorerie
              </span>
              <span className="text-xs font-bold text-muted-foreground">
                Toutes Ventes & Prestations
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground flex items-center gap-3 mt-1">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <Coins size={20} />
              </div>
              <span>Journal des Paiements & Tranches</span>
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Suivi centralisé des versements multi-tranches et multi-devises (DZD, EUR, USD, SAR...).
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <Button
              variant="outline"
              onClick={handleExportJournalPDF}
              className="h-10 text-xs font-bold gap-1.5 rounded-xl border-border/80"
            >
              <Download size={15} /> Exporter Journal (PDF)
            </Button>
            <Button
              onClick={() => setIsSelectVenteOpen(true)}
              className="h-10 text-xs font-black gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20"
            >
              <Plus size={16} /> Encaisser un Paiement
            </Button>
          </div>
        </div>

        {/* ── 4 Big KPI Cards ──────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          <div className="p-5 rounded-2xl bg-card border border-border/80 shadow-xs space-y-1">
            <div className="flex items-center justify-between text-muted-foreground text-xs font-bold uppercase tracking-wider">
              <span>Total Encaissé Période</span>
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
                <Wallet size={16} />
              </div>
            </div>
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
              {fmtDZD(stats.totalEncaissedDZD)}
            </div>
            <span className="text-[11px] text-muted-foreground block">
              Sur {stats.countPayments} versements enregistrés
            </span>
          </div>

          <div className="p-5 rounded-2xl bg-card border border-border/80 shadow-xs space-y-1">
            <div className="flex items-center justify-between text-muted-foreground text-xs font-bold uppercase tracking-wider">
              <span>Devises Étrangères</span>
              <div className="w-8 h-8 rounded-xl bg-sky-500/10 text-sky-600 flex items-center justify-center font-bold">
                <DollarSign size={16} />
              </div>
            </div>
            <div className="text-2xl font-black text-sky-600 dark:text-sky-400">
              {fmtDZD(stats.totalForeignDZD)}
            </div>
            <span className="text-[11px] text-muted-foreground block">
              {stats.foreignCount} règlements en EUR/USD/SAR...
            </span>
          </div>

          <div className="p-5 rounded-2xl bg-card border border-border/80 shadow-xs space-y-1">
            <div className="flex items-center justify-between text-muted-foreground text-xs font-bold uppercase tracking-wider">
              <span>Nombre de Tranches</span>
              <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center font-bold">
                <Layers size={16} />
              </div>
            </div>
            <div className="text-2xl font-black text-foreground">
              {stats.countPayments}
            </div>
            <span className="text-[11px] text-muted-foreground block">
              Paiements sur ventes globales
            </span>
          </div>

          <div className="p-5 rounded-2xl bg-card border border-border/80 shadow-xs space-y-1">
            <div className="flex items-center justify-between text-muted-foreground text-xs font-bold uppercase tracking-wider">
              <span>Créances à Recouvrer</span>
              <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center font-bold">
                <AlertCircle size={16} />
              </div>
            </div>
            <div className="text-2xl font-black text-rose-600 dark:text-rose-400">
              {fmtDZD(stats.totalPendingReceivables)}
            </div>
            <span className="text-[11px] text-muted-foreground block">
              Reste total dû sur toutes les ventes
            </span>
          </div>
        </div>

        {/* ── Filter Bar ───────────────────────────────────────────────────── */}
        <div className="p-4 rounded-2xl bg-card border border-border/80 shadow-xs space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 items-end">
            
            {/* Search */}
            <div className="space-y-1.5 md:col-span-2">
              <Label className="text-xs font-bold text-foreground">Recherche</Label>
              <div className="relative">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Rechercher par client, n° reçu, destination..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-9 h-10 text-xs bg-muted/20 rounded-xl"
                />
              </div>
            </div>

            {/* Période */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">Période</Label>
              <Select
                value={selectedPeriode}
                onChange={e => setSelectedPeriode(e.target.value)}
                className="h-10 text-xs bg-muted/20 rounded-xl font-bold"
              >
                <option value="aujourdhui">Aujourd'hui</option>
                <option value="cette_semaine">Cette semaine</option>
                <option value="ce_mois">Ce mois-ci</option>
                <option value="cette_annee">Cette année</option>
                <option value="tout">Tout l'historique</option>
                <option value="personnalise">Personnalisé</option>
              </Select>
            </div>

            {/* Devise */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">Devise</Label>
              <Select
                value={filterDevise}
                onChange={e => setFilterDevise(e.target.value)}
                className="h-10 text-xs bg-muted/20 rounded-xl font-bold"
              >
                {CURRENCY_OPTIONS.map(c => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </Select>
            </div>

            {/* Moyen de Paiement */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">Moyen de Paiement</Label>
              <Select
                value={filterMoyen}
                onChange={e => setFilterMoyen(e.target.value)}
                className="h-10 text-xs bg-muted/20 rounded-xl font-bold"
              >
                {MOYEN_OPTIONS.map(m => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </Select>
            </div>
          </div>

          {/* Custom Date Range if selected */}
          {selectedPeriode === 'personnalise' && (
            <div className="pt-2 border-t flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-muted-foreground">Du :</span>
                <Input
                  type="date"
                  value={dateDebut}
                  onChange={e => setDateDebut(e.target.value)}
                  className="h-8.5 text-xs w-40 bg-muted/20 rounded-xl"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-muted-foreground">Au :</span>
                <Input
                  type="date"
                  value={dateFin}
                  onChange={e => setDateFin(e.target.value)}
                  className="h-8.5 text-xs w-40 bg-muted/20 rounded-xl"
                />
              </div>
            </div>
          )}
        </div>

        {/* ── Transactions Table ───────────────────────────────────────────── */}
        <div className="bg-card border border-border/80 rounded-2xl overflow-hidden shadow-xs">
          <div className="p-4 border-b border-border/80 flex items-center justify-between bg-muted/30">
            <h3 className="text-xs font-black uppercase tracking-wider text-foreground flex items-center gap-2">
              <CreditCard size={15} className="text-primary" />
              <span>Liste des Encaissements ({filteredPaiements.length})</span>
            </h3>
            <span className="text-xs text-muted-foreground">
              Total affiché : <strong className="text-emerald-600 dark:text-emerald-400 font-black">{fmtDZD(stats.totalEncaissedDZD)}</strong>
            </span>
          </div>

          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center text-muted-foreground gap-2">
              <RefreshCw size={24} className="animate-spin text-primary" />
              <span className="text-xs font-medium">Chargement du journal des paiements...</span>
            </div>
          ) : filteredPaiements.length === 0 ? (
            <div className="py-16 text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mx-auto text-muted-foreground">
                <Coins size={24} />
              </div>
              <h4 className="text-sm font-bold text-foreground">Aucun paiement trouvé</h4>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Aucun versement ne correspond aux critères de filtre sélectionnés.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted/50 text-muted-foreground font-black uppercase tracking-wider text-[10px] border-b border-border/80">
                  <tr>
                    <th className="px-4 py-3.5">Date</th>
                    <th className="px-4 py-3.5">N° Reçu</th>
                    <th className="px-4 py-3.5">Payeur & Bénéficiaire</th>
                    <th className="px-4 py-3.5">Saisi par</th>
                    <th className="px-4 py-3.5">Dossier / Vente</th>
                    <th className="px-4 py-3.5">Moyen</th>
                    <th className="px-4 py-3.5 text-right">Montant Devise</th>
                    <th className="px-4 py-3.5 text-right">Montant DZD</th>
                    <th className="px-4 py-3.5">Remarques</th>
                    <th className="px-4 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {paginatedPaiements.map((p, idx) => {
                    const linkedVente = ventesList.find(v => v.id === p.vente_id);
                    const isForeign = p.devise && p.devise !== 'DZD';

                    return (
                      <tr key={p.id || idx} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3.5 whitespace-nowrap font-semibold text-foreground">
                          {p.date_paiement ? format(new Date(p.date_paiement), 'dd MMM yyyy', { locale: fr }) : '—'}
                        </td>

                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <span className="font-mono text-[11px] bg-muted px-2 py-0.5 rounded border font-bold text-foreground">
                            {p.num_recu || '—'}
                          </span>
                        </td>

                        <td className="px-4 py-3.5">
                          <div className="font-bold text-foreground truncate max-w-[170px]">
                            {p.nom_payeur || linkedVente?.client_nom || 'Client'}
                          </div>
                          {p.passager_nom && (
                            <div className="text-[10px] text-muted-foreground truncate max-w-[170px]">
                              👤 Pax : {p.passager_nom}
                            </div>
                          )}
                        </td>

                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 font-bold text-[10px] bg-muted/60 px-2 py-0.5 rounded-md border text-foreground">
                            <User size={10} className="text-primary" />
                            <span>{p.created_by_name || 'Admin'}</span>
                          </span>
                        </td>

                        <td className="px-4 py-3.5">
                          {linkedVente ? (
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-1.5 font-bold text-foreground">
                                {linkedVente.destination && (
                                  <CountryFlag countryName={linkedVente.destination} className="w-3.5 h-2.5 rounded-2xs shrink-0" />
                                )}
                                <span className="truncate max-w-[180px]">{linkedVente.client_nom}</span>
                              </div>
                              <span className="text-[10px] text-muted-foreground block truncate max-w-[180px]">
                                Total vente : {fmtDZD(linkedVente.total)}
                              </span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
                        </td>

                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <span className="font-semibold text-foreground">
                            {p.moyen_paiement || 'Espèce'}
                          </span>
                        </td>

                        <td className="px-4 py-3.5 text-right whitespace-nowrap">
                          {isForeign ? (
                            <div className="space-y-0.5">
                              <span className="font-bold text-foreground">
                                {fmtCurrency(p.montant_original, p.devise)}
                              </span>
                              <span className="text-[10px] text-muted-foreground block font-mono">
                                Taux : {p.taux_change}
                              </span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground font-semibold">—</span>
                          )}
                        </td>

                        <td className="px-4 py-3.5 text-right whitespace-nowrap font-black text-emerald-600 dark:text-emerald-400 text-sm">
                          {fmtDZD(p.montant_dzd)}
                        </td>

                        <td className="px-4 py-3.5 text-muted-foreground max-w-[160px] truncate text-[11px]">
                          {p.notes || '—'}
                        </td>

                        <td className="px-4 py-3.5 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            {linkedVente && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setActiveVenteForPayment(linkedVente)}
                                className="h-7 text-xs font-bold gap-1 rounded-lg"
                                title="Gérer tous les paiements de cette vente"
                              >
                                <Coins size={12} className="text-emerald-600" /> Dossier
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Controls */}
          {filteredPaiements.length > 0 && (
            <div className="p-4 border-t border-border/80 bg-muted/20 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
              <div className="flex items-center gap-3 flex-wrap">
                <span>
                  Affichage de <b className="text-foreground">{(currentPage - 1) * itemsPerPage + 1}</b> à <b className="text-foreground">{Math.min(currentPage * itemsPerPage, filteredPaiements.length)}</b> sur <b className="text-foreground">{filteredPaiements.length}</b> paiements
                </span>
                <div className="flex items-center gap-1.5 border-l border-border/60 pl-3">
                  <span className="text-[11px] font-semibold">Par page :</span>
                  <Select
                    value={String(itemsPerPage)}
                    onChange={(e) => {
                      setItemsPerPage(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="h-7 w-20 text-xs bg-background rounded-lg font-bold"
                  >
                    <option value="10">10</option>
                    <option value="25">25</option>
                    <option value="50">50</option>
                    <option value="100">100</option>
                  </Select>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <Button 
                  variant="outline" 
                  size="sm" 
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(1)}
                  className="h-8 w-8 p-0 rounded-xl"
                  title="Première page"
                >
                  <ChevronsLeft size={14} />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  className="h-8 px-2.5 text-xs font-bold rounded-xl"
                >
                  <ChevronLeft size={14} className="mr-1" /> Précédent
                </Button>
                <div className="px-3 py-1 bg-background rounded-xl border border-border/60 font-black text-foreground">
                  Page {currentPage} / {totalPages}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  className="h-8 px-2.5 text-xs font-bold rounded-xl"
                >
                  Suivant <ChevronRight size={14} className="ml-1" />
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage(totalPages)}
                  className="h-8 w-8 p-0 rounded-xl"
                  title="Dernière page"
                >
                  <ChevronsRight size={14} />
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* ── Modal Sélecteur de Vente pour Encaisser ────────────────────────── */}
        {isSelectVenteOpen && (
          <Dialog open={true} onOpenChange={() => setIsSelectVenteOpen(false)}>
            <DialogContent className="max-w-xl p-0 overflow-hidden rounded-[24px]" onClose={() => setIsSelectVenteOpen(false)}>
              <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 text-white px-6 py-5 border-b border-white/10">
                <DialogTitle className="text-xl font-black flex items-center gap-2">
                  <Coins size={18} className="text-emerald-400" />
                  <span>Sélectionner une Vente pour Encaisser</span>
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-400 mt-0.5">
                  Choisissez la transaction client à laquelle ajouter un versement / acompte.
                </DialogDescription>
              </div>

              <div className="p-6 space-y-4">
                <div className="relative">
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Rechercher par nom de client, destination..."
                    value={venteSearchQuery}
                    onChange={e => setVenteSearchQuery(e.target.value)}
                    className="pl-9 h-10 text-xs bg-muted/20 rounded-xl font-medium"
                    autoFocus
                  />
                </div>

                <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
                  {filteredVentesForSelector.length === 0 ? (
                    <div className="py-8 text-center text-muted-foreground text-xs">
                      Aucune vente trouvée.
                    </div>
                  ) : (
                    filteredVentesForSelector.map(v => (
                      <div
                        key={v.id}
                        onClick={() => {
                          setIsSelectVenteOpen(false);
                          setActiveVenteForPayment(v);
                        }}
                        className="p-3.5 rounded-xl border border-border/80 hover:border-emerald-500/50 hover:bg-emerald-50/30 dark:hover:bg-emerald-950/20 cursor-pointer transition-all flex items-center justify-between gap-3 group"
                      >
                        <div className="min-w-0 space-y-0.5">
                          <div className="flex items-center gap-2 font-black text-sm text-foreground">
                            {v.destination && (
                              <CountryFlag countryName={v.destination} className="w-4 h-3 rounded-2xs shrink-0" />
                            )}
                            <span className="truncate">{v.client_nom}</span>
                            <Badge variant={v.etat === 'Payé' ? 'success' : 'warning'} className="text-[10px] py-0">
                              {v.etat}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground truncate max-w-sm">
                            {v.details || 'Prestation'}
                          </p>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="font-black text-sm text-foreground block">{fmtDZD(v.total)}</span>
                          <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1 justify-end group-hover:underline">
                            Encaisser <ArrowRight size={12} />
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* ── Modal de Paiement de la Vente Active ──────────────────────────── */}
        {activeVenteForPayment && (
          <VentePaiementsModal
            vente={activeVenteForPayment}
            onClose={() => {
              setActiveVenteForPayment(null);
              fetchData();
            }}
            onPaiementsUpdated={() => {
              fetchData();
            }}
          />
        )}

      </div>
    </Layout>
  );
};

export default Paiements;
