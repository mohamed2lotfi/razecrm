import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, CreditCard, FileText, FileDown, Trash2, TrendingUp, BarChart3, 
  Coins, ClipboardList, Loader2, Pencil, Search, ChevronLeft, ChevronRight, 
  ChevronsLeft, ChevronsRight,
  Eye, Layers, Globe, Building2, Wallet, AlertCircle, Sparkles, DollarSign,
  RotateCcw
} from 'lucide-react';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import VenteForm from '@/components/VenteForm';
import FactureForm from '@/components/FactureForm';
import VentePaiementsModal from '@/components/VentePaiementsModal';
import VenteRemboursementModal from '@/components/VenteRemboursementModal';
import CountryFlag from '@/components/CountryFlag';
import { format, parseISO, startOfMonth, endOfMonth, startOfWeek, endOfWeek, startOfYear, endOfYear, startOfDay, endOfDay, isWithinInterval } from 'date-fns';
import { fr } from 'date-fns/locale';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const Ventes = () => {
  const { isAdmin } = useAuth();
  const [ventes, setVentes] = useState([]);
  const [servicesList, setServicesList] = useState([]);
  const [fournisseursList, setFournisseursList] = useState([]);
  const [loading, setLoading] = useState(true);

  // Paiements Data State
  const [paiementsMap, setPaiementsMap] = useState({});
  const [activePaymentVente, setActivePaymentVente] = useState(null);
  const [activeRefundVente, setActiveRefundVente] = useState(null);
  const [filterPaymentStatut, setFilterPaymentStatut] = useState('all');

  // Stats State
  const [stats, setStats] = useState({ 
    count: 0, 
    totalCA: 0, 
    totalCommission: 0,
    totalEncaissed: 0,
    totalCreances: 0 
  });

  // Pagination & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingVente, setEditingVente] = useState(null);
  const [viewingArticlesVente, setViewingArticlesVente] = useState(null);
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
  }, [currentPage, debouncedSearch, filterPaymentStatut, itemsPerPage]);

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
    
    try {
      const [vRes, pRes] = await Promise.all([
        supabase.from('ventes').select('id, total, commission').or(`and(date_vente.gte.${monthStart},date_vente.lte.${monthEnd}),and(date_vente.is.null,created_at.gte.${monthStart},created_at.lte.${monthEnd})`),
        supabase.from('vente_paiements').select('montant_dzd').gte('created_at', monthStart).lte('created_at', monthEnd)
      ]);

      const vData = vRes.data || [];
      const pData = pRes.data || [];

      const totalCA = vData.reduce((acc, v) => acc + (parseFloat(v.total) || 0), 0);
      const totalCommission = vData.reduce((acc, v) => acc + (parseFloat(v.commission) || 0), 0);
      const totalEncaissed = pData.reduce((acc, p) => acc + (parseFloat(p.montant_dzd) || 0), 0);
      const totalCreances = Math.max(0, totalCA - totalEncaissed);

      setStats({
        count: vData.length,
        totalCA,
        totalCommission,
        totalEncaissed,
        totalCreances
      });
    } catch (err) {
      console.warn("Erreur fetchStats:", err);
    }
  };

  const fetchVentesPage = async () => {
    setLoading(true);
    let query = supabase.from('ventes').select('*, vente_articles(*, services(*), fournisseurs(*), airlines(*), visa_countries(*), visa_types(*))', { count: 'exact' });

    if (debouncedSearch) {
      query = query.or(`client_nom.ilike.%${debouncedSearch}%,details.ilike.%${debouncedSearch}%`);
    }

    if (filterPaymentStatut && filterPaymentStatut !== 'all') {
      query = query.eq('etat', filterPaymentStatut);
    }

    const from = (currentPage - 1) * itemsPerPage;
    const to = from + itemsPerPage - 1;

    let { data, error, count } = await query
      .order('date_vente', { ascending: false })
      .order('created_at', { ascending: false })
      .range(from, to);

    // Fallback if vente_articles join fails
    if (error && error.message) {
      const fallbackQuery = supabase.from('ventes').select('*', { count: 'exact' });
      if (debouncedSearch) fallbackQuery.or(`client_nom.ilike.%${debouncedSearch}%,details.ilike.%${debouncedSearch}%`);
      if (filterPaymentStatut && filterPaymentStatut !== 'all') {
        fallbackQuery.eq('etat', filterPaymentStatut);
      }
      const fallbackRes = await fallbackQuery
        .order('date_vente', { ascending: false })
        .order('created_at', { ascending: false })
        .range(from, to);
      data = fallbackRes.data;
      count = fallbackRes.count;
      error = fallbackRes.error;
    }

    if (!error && data) {
      const extractPaxFromDetails = (detailsStr) => {
        if (!detailsStr) return [];
        const paxMatch = detailsStr.match(/\(\d+\s*Pax(?::\s*([^)]+))?\)/i);
        if (paxMatch && paxMatch[1]) {
          return paxMatch[1].split(',').map(item => {
            const trimmed = item.trim();
            const pMatch = trimmed.match(/^([^\[]+)(?:\[(.*?)\])?$/);
            if (pMatch) {
              return { nom: pMatch[1].trim(), passport: (pMatch[2] || '').trim() };
            }
            return { nom: trimmed, passport: '' };
          }).filter(p => p.nom.length > 0);
        }
        return [];
      };

      const normalizedData = data.map(v => {
        const fallbackPax = extractPaxFromDetails(v.details);
        const arts = (v.vente_articles && Array.isArray(v.vente_articles)) 
          ? v.vente_articles.map(a => {
              const pax = (a.details_specifiques && Array.isArray(a.details_specifiques.passagers) && a.details_specifiques.passagers.length > 0)
                ? a.details_specifiques.passagers
                : (Array.isArray(a.passagers) && a.passagers.length > 0)
                  ? a.passagers
                  : fallbackPax;
              return {
                ...a,
                passagers: pax
              };
            })
          : [];

        const directPax = arts.find(a => Array.isArray(a.passagers) && a.passagers.length > 0)?.passagers || fallbackPax;

        return {
          ...v,
          articles: arts,
          passagers: directPax
        };
      });
      setVentes(normalizedData);
      if (count !== null) setTotalCount(count);

      // Charger les paiements correspondants
      const vIds = data.map(v => v.id).filter(Boolean);
      if (vIds.length > 0) {
        try {
          const { data: pData } = await supabase
            .from('vente_paiements')
            .select('*')
            .in('vente_id', vIds);

          if (pData) {
            const map = {};
            pData.forEach(p => {
              if (!map[p.vente_id]) map[p.vente_id] = [];
              map[p.vente_id].push(p);
            });
            setPaiementsMap(map);
          }
        } catch (pErr) {
          console.warn("Erreur fetch vente_paiements:", pErr);
        }
      }
    }
    setLoading(false);
  };

  const handleSaveVente = async (rawData) => {
    const { _visaMeta: visaMeta, id, vente_articles: rawVenteArticles, articles: _legacyArticles, passagers: _passagers, ...newVenteData } = rawData;
    const articleList = rawVenteArticles || _legacyArticles || [];
    const effectivePaxList = _passagers || visaMeta?.passagers || [];

    const cleanedPayload = {
      ...newVenteData,
      client_id: newVenteData.client_id || null,
      service_id: newVenteData.service_id || null,
      fournisseur_id: newVenteData.fournisseur_id || null,
    };

    let savedVente = null;

    if (id) {
      let { data, error } = await supabase.from('ventes').update(cleanedPayload).eq('id', id).select();

      if (error) {
        console.error("Update error:", error);
        alert(`Erreur: ${error.message}`);
        return;
      }
      if (data && data[0]) savedVente = data[0];
    } else {
      let { data, error } = await supabase.from('ventes').insert([cleanedPayload]).select();

      if (error) {
        console.error("Insert error:", error);
        alert(`Erreur: ${error.message}`);
        return;
      }
      if (data && data[0]) savedVente = data[0];
    }

    if (savedVente) {
      const venteId = savedVente.id;

      // Sync rows in vente_articles
      if (articleList && Array.isArray(articleList) && articleList.length > 0) {
        try {
          await supabase.from('vente_articles').delete().eq('vente_id', venteId);
          
          const articlesToInsert = articleList.map((art, idx) => {
            const pa = parseFloat(art.prix_achat) || 0;
            const comm = parseFloat(art.commission) || 0;
            const pv = parseFloat(art.prix_vente) || (pa + comm);
            const paxForArt = (art.passagers && Array.isArray(art.passagers) && art.passagers.length > 0)
              ? art.passagers
              : effectivePaxList;
            
            return {
              vente_id: venteId,
              service_id: art.service_id || savedVente.service_id || null,
              fournisseur_id: art.fournisseur_id || savedVente.fournisseur_id || null,
              designation: art.designation || 'Prestation',
              prix_achat: pa,
              commission: comm,
              prix_vente: pv,
              quantite: parseFloat(art.quantite) || (paxForArt.length > 0 ? paxForArt.length : 1),
              destination: art.destination || savedVente.destination || null,
              visa_country_id: art.visa_country_id || null,
              visa_type_id: art.visa_type_id || null,
              visa_dossier: Array.isArray(art.visa_dossier) ? art.visa_dossier : [],
              airline_id: art.airline_id || null,
              compagnie_nom: art.compagnie_nom || null,
              numero_billet: art.numero_billet || null,
              pnr: art.pnr || null,
              itineraire: art.itineraire || null,
              details_specifiques: {
                ...(art.details_specifiques || {}),
                passagers: paxForArt
              },
              notes: art.notes || null,
              ordre: idx + 1
            };
          });

          await supabase.from('vente_articles').insert(articlesToInsert);
        } catch (artErr) {
          console.warn("Erreur insertion vente_articles:", artErr);
        }
      }

      // Sync visa_demandes if visa sale
      if (visaMeta && visaMeta.passagers && visaMeta.passagers.length > 0 && visaMeta.visa_type_id) {
        try {
          const { data: existingDemandes } = await supabase
            .from('visa_demandes')
            .select('*')
            .eq('vente_id', savedVente.id);

          const existingMap = new Map((existingDemandes || []).map(d => [d.passager_nom?.toLowerCase()?.trim(), d]));

          await supabase.from('visa_demandes').delete().eq('vente_id', savedVente.id);

          for (const passager of visaMeta.passagers) {
            const existing = existingMap.get(passager.nom?.toLowerCase()?.trim());
            const { data: demandeData } = await supabase.from('visa_demandes').insert([{
              vente_id: savedVente.id,
              client_id: savedVente.client_id,
              visa_type_id: visaMeta.visa_type_id,
              country_id: visaMeta.country_id,
              passager_nom: passager.nom,
              tarif_base: visaMeta.tarif_base_unit,
              tarif_vente: passager.tarif_vente || visaMeta.tarif_vente_unit,
              statut: existing?.statut || 'Nouveau'
            }]).select();

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
        } catch (vErr) {
          console.warn("Erreur synchronisation visa_demandes:", vErr);
        }
      }

      fetchVentesPage();
      fetchStats();
      setIsFormOpen(false);
      setEditingVente(null);
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

    // Prepare line items from articles or fallback
    const items = (data.articles && Array.isArray(data.articles) && data.articles.length > 0)
      ? data.articles.map(art => ({
          categorie: art.categorie || 'Prestation',
          description: `[${art.categorie || 'Service'}] ${art.designation || art.details || 'Prestation'}`,
          quantite: Number(art.quantite) || 1,
          prix_unitaire: Number(art.prix_vente) || 0,
          total: (Number(art.quantite) || 1) * (Number(art.prix_vente) || 0)
        }))
      : [
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
    const startIso = range.start.toISOString();
    const endIso = range.end.toISOString();
    
    let query = supabase.from('ventes').select('*')
      .or(`and(date_vente.gte.${startIso},date_vente.lte.${endIso}),and(date_vente.is.null,created_at.gte.${startIso},created_at.lte.${endIso})`);
    
    if (reportFilters.statut) query = query.eq('etat', reportFilters.statut);

    const { data } = await query
      .order('date_vente', { ascending: false })
      .order('created_at', { ascending: false });
    const allSales = data || [];

    // Filter and compute line-item amounts accurately per supplier / service
    const filtered = [];
    allSales.forEach(v => {
      const hasArticles = Array.isArray(v.articles) && v.articles.length > 0;
      
      if (reportFilters.fournisseur_id || reportFilters.service_id) {
        if (hasArticles) {
          const matchingArticles = v.articles.filter(a => {
            const matchFournisseur = !reportFilters.fournisseur_id || 
              (a.fournisseur_id === reportFilters.fournisseur_id) || 
              (!a.fournisseur_id && v.fournisseur_id === reportFilters.fournisseur_id);
            
            const matchService = !reportFilters.service_id || 
              (a.service_id === reportFilters.service_id) || 
              (!a.service_id && v.service_id === reportFilters.service_id);
            
            return matchFournisseur && matchService;
          });

          if (matchingArticles.length > 0) {
            let base = 0;
            let comm = 0;
            let total = 0;

            if (v.etat === 'Remboursé') {
              base = Math.max(0, (parseFloat(v.total) || 0) - (parseFloat(v.commission) || 0));
              comm = parseFloat(v.commission) || 0;
              total = parseFloat(v.total) || 0;
            } else {
              base = matchingArticles.reduce((sum, a) => {
                const pa = parseFloat(a.prix_achat);
                if (!isNaN(pa) && a.prix_achat !== '') return sum + pa;
                const pv = parseFloat(a.prix_vente) || 0;
                const c = parseFloat(a.commission) || 0;
                return sum + (pv - c);
              }, 0);
              comm = matchingArticles.reduce((sum, a) => sum + (parseFloat(a.commission) || 0), 0);
              total = matchingArticles.reduce((sum, a) => sum + (parseFloat(a.prix_vente) || 0), 0);
            }

            const articlesSummary = matchingArticles.map(a => `[${a.categorie || 'Article'}] ${a.designation || 'Prestation'}`).join(', ');

            filtered.push({
              ...v,
              displayDetails: v.etat === 'Remboursé' ? `[Remboursé] ${articlesSummary}` : articlesSummary,
              displayBase: base,
              displayCommission: comm,
              displayTotal: total,
              displayFournisseur: reportFilters.fournisseur_id ? getFournisseurName(reportFilters.fournisseur_id) : getFournisseurName(v.fournisseur_id),
              displayService: reportFilters.service_id ? getServiceName(reportFilters.service_id) : getServiceName(v.service_id)
            });
          }
        } else {
          // Legacy sale
          const matchFournisseur = !reportFilters.fournisseur_id || v.fournisseur_id === reportFilters.fournisseur_id;
          const matchService = !reportFilters.service_id || v.service_id === reportFilters.service_id;
          if (matchFournisseur && matchService) {
            const isRembourse = v.etat === 'Remboursé';
            const base = isRembourse 
              ? Math.max(0, (parseFloat(v.total) || 0) - (parseFloat(v.commission) || 0))
              : (parseFloat(v.tarif_base) || 0);

            filtered.push({
              ...v,
              displayDetails: v.details || '—',
              displayBase: base,
              displayCommission: parseFloat(v.commission) || 0,
              displayTotal: parseFloat(v.total) || 0,
              displayFournisseur: getFournisseurName(v.fournisseur_id),
              displayService: getServiceName(v.service_id)
            });
          }
        }
      } else {
        // No supplier/service filter
        const isRembourse = v.etat === 'Remboursé';
        const base = isRembourse 
          ? Math.max(0, (parseFloat(v.total) || 0) - (parseFloat(v.commission) || 0))
          : (parseFloat(v.tarif_base) || 0);

        filtered.push({
          ...v,
          displayDetails: v.details || (hasArticles ? v.articles.map(a => a.designation || a.categorie).join(', ') : '—'),
          displayBase: base,
          displayCommission: parseFloat(v.commission) || 0,
          displayTotal: parseFloat(v.total) || 0,
          displayFournisseur: getFournisseurName(v.fournisseur_id),
          displayService: getServiceName(v.service_id)
        });
      }
    });

    const totalCA = filtered.reduce((acc, v) => acc + (v.displayTotal || 0), 0);
    const totalCommission = filtered.reduce((acc, v) => acc + (v.displayCommission || 0), 0);
    const totalBase = filtered.reduce((acc, v) => acc + (v.displayBase || 0), 0);

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
        lines.push(`  ${i + 1}. ${v.client_nom} | ${v.displayDetails || 'Sans détails'}`);
        lines.push(`     Date: ${v.date_vente || v.created_at.substring(0, 10)} | Service: ${v.displayService} | Fournisseur: ${v.displayFournisseur}`);
        lines.push(`     Base: ${(v.displayBase || 0).toLocaleString('fr-DZ')} DZD | Comm: ${(v.displayCommission || 0).toLocaleString('fr-DZ')} DZD | Total: ${(v.displayTotal || 0).toLocaleString('fr-DZ')} DZD | État: ${v.etat}`);
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
        `"${(v.displayDetails || '').replace(/"/g, '""')}"`,
        v.date_vente || v.created_at.substring(0, 10),
        `"${v.displayService}"`,
        `"${v.displayFournisseur}"`,
        v.displayBase || 0,
        v.displayCommission || 0,
        v.displayTotal || 0,
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
        v.displayService,
        v.displayFournisseur,
        formatMoney(v.displayBase),
        formatMoney(v.displayCommission),
        formatMoney(v.displayTotal),
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

  const totalPages = Math.ceil(totalCount / itemsPerPage) || 1;

  return (
    <Layout>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground">Suivi des Ventes</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Gestion globale des dossiers, prestations, tranches et règlements multi-devises.
          </p>
        </div>
        
        <div className="flex items-center gap-3 w-full sm:w-auto flex-wrap">
          <div className="relative flex-1 sm:w-60">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Rechercher (Client, Détails)..." 
              className="pl-9 bg-card text-xs rounded-xl" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <Select 
            value={filterPaymentStatut} 
            onChange={(e) => {
              setFilterPaymentStatut(e.target.value);
              setCurrentPage(1);
            }}
            className="w-44 h-9 text-xs bg-card rounded-xl font-bold"
          >
            <option value="all">Tous les règlements</option>
            <option value="Payé">🟢 Payé intégralement</option>
            <option value="Reservé">🟡 Réservé / Acompte</option>
            <option value="Remboursé">🟣 Remboursé</option>
            <option value="Annulé">⚪ Annulé</option>
          </Select>

          <Button variant="outline" size="sm" onClick={() => setIsReportOpen(true)} className="h-9 rounded-xl font-bold text-xs">
            <ClipboardList size={15} className="mr-1.5 hidden sm:inline" /> Rapport
          </Button>
          <Button onClick={() => { setEditingVente(null); setIsFormOpen(true); }} className="h-9 rounded-xl font-black text-xs shrink-0 bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm">
            <Plus size={15} className="mr-1 hidden sm:inline" /> Vente
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="rounded-2xl border bg-card shadow-xs p-4 flex items-center gap-3.5">
          <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-blue-100 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 shrink-0">
            <BarChart3 size={20} />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider font-extrabold text-muted-foreground">Opérations ce mois</p>
            <p className="text-xl font-black tabular-nums text-foreground">{stats.count}</p>
          </div>
        </div>

        <div className="rounded-2xl border bg-card shadow-xs p-4 flex items-center gap-3.5">
          <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-indigo-100 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 shrink-0">
            <TrendingUp size={20} />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider font-extrabold text-muted-foreground">CA Brut ce mois</p>
            <p className="text-xl font-black tabular-nums text-foreground">{fmt(stats.totalCA)}</p>
          </div>
        </div>

        <div className="rounded-2xl border bg-card shadow-xs p-4 flex items-center gap-3.5">
          <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 shrink-0">
            <Wallet size={20} />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider font-extrabold text-emerald-600 dark:text-emerald-400">Total Encaissé Réel</p>
            <p className="text-xl font-black tabular-nums text-emerald-600 dark:text-emerald-400">{fmt(stats.totalEncaissed)}</p>
          </div>
        </div>

        <div className="rounded-2xl border bg-card shadow-xs p-4 flex items-center gap-3.5">
          <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 shrink-0">
            <AlertCircle size={20} />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider font-extrabold text-amber-600 dark:text-amber-400">Créances à Recouvrer</p>
            <p className="text-xl font-black tabular-nums text-amber-600 dark:text-amber-400">{fmt(stats.totalCreances)}</p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border bg-card shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b bg-muted/50 text-muted-foreground text-[10px] font-black uppercase tracking-wider">
                <th className="px-4 py-3 text-left">Date</th>
                <th className="px-4 py-3 text-left">Client & Destination</th>
                <th className="px-4 py-3 text-left">Prestations / Articles</th>
                <th className="px-4 py-3 text-left">Fournisseur</th>
                <th className="px-4 py-3 text-right">Total Vente</th>
                <th className="px-4 py-3 text-right">Encaissé</th>
                <th className="px-4 py-3 text-right">Reste Dû</th>
                <th className="px-4 py-3 text-center">Règlement</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {loading ? (
                <tr>
                  <td colSpan="9" className="py-16 text-center">
                    <Loader2 size={28} className="mx-auto animate-spin text-primary mb-2" />
                    <p className="font-medium text-muted-foreground text-xs">Chargement des ventes...</p>
                  </td>
                </tr>
              ) : ventes.length === 0 ? (
                <tr>
                  <td colSpan="9" className="py-16 text-center">
                    <CreditCard size={36} className="mx-auto text-muted-foreground/30 mb-2" />
                    <p className="font-medium text-muted-foreground text-xs">Aucune vente trouvée</p>
                  </td>
                </tr>
              ) : ventes.map(v => {
                const hasArticles = v.articles && Array.isArray(v.articles) && v.articles.length > 0;
                const vDest = v.destination || v.articles?.[0]?.destination || (() => {
                  if (v.details) {
                    const match = v.details.match(/\[(?:🌍|Destination:?)\s*([^\]]+)\]/i);
                    if (match) return match[1].trim();
                  }
                  return '';
                })();

                const vPaiements = paiementsMap[v.id] || [];
                const totalPaye = vPaiements.reduce((acc, p) => acc + (Number(p.montant_dzd) || 0), 0);
                const totalVente = Number(v.total) || 0;
                const resteAPayer = Math.max(0, totalVente - totalPaye);
                const pctPaye = totalVente > 0 ? Math.min(100, Math.round((totalPaye / totalVente) * 100)) : 100;
                const isFullyPaid = resteAPayer === 0 && totalVente > 0;

                return (
                  <tr key={v.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 text-muted-foreground font-medium whitespace-nowrap">
                      {fmtDate(v.date_vente || v.created_at)}
                    </td>

                    <td className="px-4 py-3 font-medium text-foreground">
                      <div className="space-y-0.5">
                        <span className="font-bold block truncate max-w-[170px]">{v.client_nom}</span>
                        {vDest && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-muted/60 px-1.5 py-0.5 rounded-md border text-muted-foreground">
                            <CountryFlag destinationName={vDest} className="w-3.5 h-2.5 rounded-2xs" />
                            <span>{vDest}</span>
                          </span>
                        )}
                      </div>
                    </td>
                    
                    {/* Articles / Détails Column */}
                    <td className="px-4 py-3">
                      {hasArticles ? (
                        <div className="space-y-1">
                          <button
                            type="button"
                            onClick={() => setViewingArticlesVente({ ...v, destination: vDest })}
                            className="text-left group/art flex items-center gap-1.5 flex-wrap cursor-pointer"
                            title="Cliquer pour voir le détail des articles"
                          >
                            <span className="text-[10px] font-black bg-primary/10 text-primary px-2 py-0.5 rounded-md border border-primary/20 hover:bg-primary/20 transition-colors shadow-2xs">
                              {v.articles.length} {v.articles.length > 1 ? 'articles' : 'article'}
                            </span>
                            {v.articles.slice(0, 2).map((a, idx) => (
                              <span key={idx} className="text-[10px] font-bold bg-muted/60 px-1.5 py-0.5 rounded-md border text-foreground/80 max-w-[140px] truncate">
                                {a.categorie === 'Billeterie' ? '✈️' : a.categorie === 'Hôtel' ? '🏨' : a.categorie === 'Visa' ? '📑' : a.categorie === 'Transfert' ? '🚐' : a.categorie === 'Omra' ? '🕋' : '🏷️'} {a.designation ? a.designation : a.categorie}
                              </span>
                            ))}
                            {v.articles.length > 2 && (
                              <span className="text-[10px] font-bold text-muted-foreground">
                                +{v.articles.length - 2}
                              </span>
                            )}
                          </button>
                        </div>
                      ) : (
                        <span className="text-muted-foreground max-w-[160px] truncate block text-[11px]">{v.details || '—'}</span>
                      )}
                    </td>

                    <td className="px-4 py-3">
                      {(() => {
                        const rawIds = (v.articles && Array.isArray(v.articles))
                          ? v.articles.map(a => a.fournisseur_id || a.fournisseurs?.id).filter(Boolean)
                          : [];
                        const uniqueFournisseurIds = [...new Set(rawIds.length > 0 ? rawIds : [v.fournisseur_id].filter(Boolean))];

                        if (uniqueFournisseurIds.length === 0) {
                          return <span className="text-muted-foreground text-xs">—</span>;
                        }

                        return (
                          <div className="flex flex-wrap gap-1 items-center">
                            {uniqueFournisseurIds.map(fId => (
                              <span 
                                key={fId} 
                                className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-muted/60 text-foreground border border-border/80 shadow-2xs"
                              >
                                <Building2 size={10} className="text-primary shrink-0" />
                                <span className="truncate max-w-[130px]">{getFournisseurName(fId)}</span>
                              </span>
                            ))}
                          </div>
                        );
                      })()}
                    </td>

                    {/* Total Vente */}
                    <td className="px-4 py-3 text-right font-black tabular-nums text-foreground whitespace-nowrap text-xs">
                      {fmt(v.total)}
                    </td>

                    {/* Total Encaissé avec bouton direct */}
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => setActivePaymentVente(v)}
                        className={cn(
                          "inline-flex items-center gap-1.5 px-2 py-1 rounded-lg border font-bold text-xs transition-all hover:scale-102",
                          isFullyPaid
                            ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300"
                            : totalPaye > 0
                              ? "bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300"
                              : "bg-muted/40 border-border text-muted-foreground hover:text-foreground"
                        )}
                        title="Cliquer pour gérer les paiements"
                      >
                        <Coins size={12} className={isFullyPaid ? "text-emerald-600" : totalPaye > 0 ? "text-amber-600" : "text-muted-foreground"} />
                        <span>{fmt(totalPaye)}</span>
                        {vPaiements.length > 0 && (
                          <span className="text-[9px] px-1 rounded bg-white dark:bg-card border font-black">
                            {vPaiements.length}
                          </span>
                        )}
                      </button>
                    </td>

                    {/* Reste Dû */}
                    <td className="px-4 py-3 text-right whitespace-nowrap font-bold tabular-nums">
                      <span className={cn(
                        "text-xs",
                        isFullyPaid 
                          ? "text-emerald-600 dark:text-emerald-400 font-black" 
                          : totalPaye > 0 
                            ? "text-amber-600 dark:text-amber-400" 
                            : "text-rose-600 dark:text-rose-400 font-black"
                      )}>
                        {fmt(resteAPayer)}
                      </span>
                    </td>

                    {/* Statut Règlement */}
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      <Badge 
                        variant={v.etat === 'Remboursé' ? 'outline' : isFullyPaid ? 'success' : totalPaye > 0 ? 'warning' : 'outline'}
                        className={cn(
                          "text-[10px] font-black uppercase tracking-wider",
                          v.etat === 'Remboursé' && "bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950/50 dark:text-purple-300"
                        )}
                      >
                        {v.etat === 'Remboursé' ? 'Remboursé' : isFullyPaid ? 'Payé' : totalPaye > 0 ? `Acompte ${pctPaye}%` : v.etat || 'Réservé'}
                      </Badge>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <Button 
                          variant="outline" 
                          size="icon-sm" 
                          onClick={() => setActivePaymentVente(v)}
                          title="Gérer les paiements & encaissements"
                          className="h-7 w-7 text-emerald-700 hover:text-emerald-900 border-emerald-500/30 bg-emerald-50/40 dark:bg-emerald-950/20"
                        >
                          <Coins size={13} />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="icon-sm" 
                          onClick={() => setActiveRefundVente(v)}
                          title={v.etat === 'Remboursé' ? "Détails / Gérer le remboursement" : "Rembourser cette vente"}
                          className={cn(
                            "h-7 w-7 transition-colors",
                            v.etat === 'Remboursé'
                              ? "text-purple-700 hover:text-purple-900 border-purple-400/40 bg-purple-50/50 dark:bg-purple-950/30"
                              : "text-rose-600 hover:text-rose-800 border-rose-500/30 bg-rose-50/40 dark:bg-rose-950/20"
                          )}
                        >
                          <RotateCcw size={13} />
                        </Button>
                        {hasArticles && (
                          <Button 
                            variant="ghost" 
                            size="icon-sm" 
                            onClick={() => setViewingArticlesVente({ ...v, destination: vDest })}
                            title="Voir les articles"
                            className="h-7 w-7 text-muted-foreground hover:text-primary"
                          >
                            <Eye size={13} />
                          </Button>
                        )}
                        <Button variant="outline" size="icon-sm" onClick={() => { setEditingVente({ ...v, destination: vDest }); setIsFormOpen(true); }} title="Modifier" className="h-7 w-7">
                          <Pencil size={13} />
                        </Button>
                        <Button variant="outline" size="icon-sm" onClick={() => setInvoiceModal({ isOpen: true, transaction: v, type: 'proforma' })} title="Proforma" className="h-7 w-7">
                          <FileText size={13} />
                        </Button>
                        <Button size="icon-sm" onClick={() => setInvoiceModal({ isOpen: true, transaction: v, type: 'facture' })} title="Facture" className="h-7 w-7">
                          <FileDown size={13} />
                        </Button>
                        {isAdmin && (
                          <Button variant="destructive" size="icon-sm" onClick={() => handleDelete(v.id)} title="Supprimer la vente" className="h-7 w-7">
                            <Trash2 size={13} />
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
      </div>

      {/* Pagination Controls */}
      {!loading && totalCount > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between mt-4 gap-4 bg-card p-3 rounded-2xl border border-border/80 shadow-xs">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-xs text-muted-foreground font-medium">
              Affichage de <span className="font-extrabold text-foreground">{ventes.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}</span> à <span className="font-extrabold text-foreground">{Math.min(currentPage * itemsPerPage, totalCount)}</span> sur <span className="font-extrabold text-foreground">{totalCount}</span> ventes
            </span>
            <div className="flex items-center gap-1.5 border-l border-border/60 pl-3">
              <span className="text-[11px] text-muted-foreground font-semibold">Par page :</span>
              <Select
                value={String(itemsPerPage)}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="h-7 w-20 text-xs bg-background rounded-lg font-bold"
              >
                <option value="10">10</option>
                <option value="20">20</option>
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
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              className="h-8 px-2.5 text-xs font-bold rounded-xl"
            >
              <ChevronLeft size={14} className="mr-1" /> Précédent
            </Button>
            
            <div className="px-3 py-1 bg-muted/50 rounded-xl border border-border/50 text-xs font-black text-foreground">
              Page {currentPage} / {totalPages}
            </div>

            <Button 
              variant="outline" 
              size="sm" 
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
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

      {/* ── Modal Paiements & Encaissements de la Vente ────────── */}
      {activePaymentVente && (
        <VentePaiementsModal
          vente={activePaymentVente}
          onClose={() => {
            setActivePaymentVente(null);
            fetchVentesPage();
            fetchStats();
          }}
          onPaiementsUpdated={() => {
            fetchVentesPage();
            fetchStats();
          }}
        />
      )}

      {isFormOpen && <VenteForm onClose={() => { setIsFormOpen(false); setEditingVente(null); }} onSave={handleSaveVente} initialData={editingVente} />}
      {invoiceModal.isOpen && <FactureForm transaction={invoiceModal.transaction} type={invoiceModal.type}
        onClose={() => setInvoiceModal({ isOpen: false, transaction: null, type: null })} onGenerate={handleGenerateInvoice} servicesList={servicesList} />}

      {/* ── Modal Détail des Articles de la Vente ─────────────── */}
      {viewingArticlesVente && (
        <Dialog open={true} onOpenChange={() => setViewingArticlesVente(null)}>
          <DialogContent className="max-w-xl p-0 overflow-hidden rounded-3xl" onClose={() => setViewingArticlesVente(null)}>
            <div className="bg-gradient-to-r from-primary/15 via-primary/5 to-transparent px-6 py-5 border-b flex items-center justify-between">
              <div>
                <DialogTitle className="text-lg font-black flex items-center gap-2 flex-wrap">
                  <Layers size={18} className="text-primary" />
                  <span>Détail des Articles — {viewingArticlesVente.client_nom}</span>
                  {viewingArticlesVente.destination && (
                    <span className="inline-flex items-center gap-1 text-xs font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-md border border-primary/20">
                      <CountryFlag countryName={viewingArticlesVente.destination} className="w-3.5 h-2.5 rounded-2xs" />
                      <span>{viewingArticlesVente.destination}</span>
                    </span>
                  )}
                </DialogTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Vente du {fmtDate(viewingArticlesVente.date_vente || viewingArticlesVente.created_at)}
                </p>
              </div>
              <Badge variant={etatVariant(viewingArticlesVente.etat)}>{viewingArticlesVente.etat}</Badge>
            </div>

            <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
              {/* Passagers / Voyageurs Section if present */}
              {(() => {
                const paxList = (viewingArticlesVente.articles && viewingArticlesVente.articles.find(a => Array.isArray(a.passagers) && a.passagers.length > 0)?.passagers)
                  || (Array.isArray(viewingArticlesVente.passagers) && viewingArticlesVente.passagers.length > 0 ? viewingArticlesVente.passagers : []);
                if (paxList.length === 0) return null;

                return (
                  <div className="p-3.5 rounded-2xl bg-sky-50/70 dark:bg-sky-950/30 border border-sky-200/80 dark:border-sky-800/60 space-y-2">
                    <div className="flex items-center justify-between text-xs font-black text-sky-950 dark:text-sky-200 uppercase tracking-wider">
                      <span className="flex items-center gap-1.5">
                        👥 Voyageurs & Bénéficiaires ({paxList.length} Pax)
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {paxList.map((p, pIdx) => (
                        <div key={pIdx} className="p-2 rounded-xl bg-background/80 border border-sky-200/50 flex items-center justify-between text-xs font-semibold">
                          <span className="text-foreground font-bold truncate">👤 {p.nom || `Voyageur #${pIdx + 1}`}</span>
                          {p.passport && (
                            <span className="text-[11px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded border">
                              {p.passport}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              <div className="space-y-3">
                {viewingArticlesVente.etat === 'Remboursé' && (
                  <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-xs flex items-center gap-2">
                    <span className="text-base">↩️</span>
                    <div>
                      <strong>Dossier de Vente Remboursé :</strong> Les montants affichés correspondent aux pénalités retenues (Pénalité Fournisseur & Marge Agence).
                    </div>
                  </div>
                )}
                {(viewingArticlesVente.articles || []).map((art, idx) => {
                  const q = Number(art.quantite) || 1;
                  const isRembourse = viewingArticlesVente.etat === 'Remboursé';
                  const effectiveTarifBase = parseFloat(viewingArticlesVente.tarif_base) || Math.max(0, (parseFloat(viewingArticlesVente.total) || 0) - (parseFloat(viewingArticlesVente.commission) || 0));
                  const pa = isRembourse ? (effectiveTarifBase / ((viewingArticlesVente.articles || []).length || 1)) : (Number(art.prix_achat) || 0);
                  const pv = isRembourse ? (Number(viewingArticlesVente.total || 0) / ((viewingArticlesVente.articles || []).length || 1)) : (Number(art.prix_vente) || 0);
                  const comm = isRembourse ? (Number(viewingArticlesVente.commission || 0) / ((viewingArticlesVente.articles || []).length || 1)) : (Number(art.commission) !== undefined && art.commission !== null ? Number(art.commission) : (pv - pa));
                  const fName = getFournisseurName(art.fournisseur_id || art.fournisseurs?.id);
                  const sCat = art.categorie || art.services?.nom || 'Prestation';

                  return (
                    <div key={idx} className="p-3.5 rounded-2xl border border-border/80 bg-muted/20 space-y-2.5 shadow-2xs">
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[11px] font-black bg-background border px-2 py-0.5 rounded-lg shadow-2xs">
                              {sCat.includes('Billet') ? '✈️' : sCat.includes('Hôtel') ? '🏨' : sCat.includes('Visa') ? '📑' : sCat.includes('Transfert') ? '🚐' : sCat.includes('Omra') ? '🕋' : '🏷️'} {sCat}
                            </span>
                            {fName && fName !== '—' && (
                              <span className="text-[10px] font-bold bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-md flex items-center gap-1">
                                🏢 {fName}
                              </span>
                            )}
                            {(art.compagnie_nom || art.airlines?.nom) && (
                              <span className="text-[10px] font-bold bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border border-sky-300 dark:border-sky-800 px-2 py-0.5 rounded-md">
                                ✈️ {art.compagnie_nom || art.airlines?.nom}
                              </span>
                            )}
                            {art.destination && (
                              <span className="text-[10px] font-bold bg-muted/80 text-foreground border border-border/80 px-2 py-0.5 rounded-md flex items-center gap-1">
                                <CountryFlag destinationName={art.destination} className="w-3 h-2 rounded-2xs" />
                                <span>{art.destination}</span>
                              </span>
                            )}
                          </div>
                          <h4 className="font-bold text-xs text-foreground mt-1">
                            {art.designation || 'Prestation'}
                          </h4>
                          {(art.pnr || art.numero_billet || art.itineraire) && (
                            <div className="flex items-center gap-2 text-[10px] font-mono text-muted-foreground pt-0.5 flex-wrap">
                              {art.pnr && <span className="bg-background px-1.5 py-0.5 rounded border">PNR: <strong>{art.pnr}</strong></span>}
                              {art.numero_billet && <span className="bg-background px-1.5 py-0.5 rounded border">Billet: {art.numero_billet}</span>}
                              {art.itineraire && <span className="bg-background px-1.5 py-0.5 rounded border">Trajet: {art.itineraire}</span>}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* 3 Montants Financiers */}
                      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border/40 text-center">
                        <div className="p-1.5 rounded-xl bg-background border border-border/50">
                          <span className="text-[9px] uppercase font-bold text-muted-foreground block">
                            {isRembourse ? 'Pén. Fournisseur' : 'Achat Fournisseur'}
                          </span>
                          <span className="text-xs font-bold text-slate-700 dark:text-slate-300 tabular-nums">
                            {pa.toLocaleString('fr-DZ')} DZD
                          </span>
                        </div>
                        <div className="p-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
                          <span className="text-[9px] uppercase font-black text-amber-700 dark:text-amber-400 block">
                            {isRembourse ? 'Pén. Agence (Marge)' : 'Commission'}
                          </span>
                          <span className="text-xs font-black text-amber-600 dark:text-amber-400 tabular-nums">
                            +{comm.toLocaleString('fr-DZ')} DZD
                          </span>
                        </div>
                        <div className="p-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                          <span className="text-[9px] uppercase font-black text-emerald-700 dark:text-emerald-400 block">
                            {isRembourse ? 'Total Conservé' : 'Vente Client'}
                          </span>
                          <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
                            {pv.toLocaleString('fr-DZ')} DZD
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Total Box */}
              <div className="p-4 rounded-2xl bg-slate-900 text-white flex items-center justify-between shadow-md">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">
                    {viewingArticlesVente.etat === 'Remboursé' ? 'Pénalité Due Fournisseur' : 'Total Achat Fournisseur'}
                  </span>
                  <span className="text-sm font-bold text-slate-300">
                    {((viewingArticlesVente.etat === 'Remboursé' 
                      ? (parseFloat(viewingArticlesVente.tarif_base) || Math.max(0, (parseFloat(viewingArticlesVente.total) || 0) - (parseFloat(viewingArticlesVente.commission) || 0)))
                      : (viewingArticlesVente.tarif_base || 0)) || 0).toLocaleString('fr-DZ')} DZD
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-amber-400 block">Marge Agence</span>
                  <span className="text-sm font-bold text-amber-400">{(viewingArticlesVente.commission || 0).toLocaleString('fr-DZ')} DZD</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-emerald-400 block">Total Conservé</span>
                  <span className="text-base font-black text-emerald-400">{(viewingArticlesVente.total || 0).toLocaleString('fr-DZ')} DZD</span>
                </div>
              </div>
            </div>

            <div className="px-6 py-3.5 border-t bg-muted/20 flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setViewingArticlesVente(null)} className="rounded-xl font-bold">
                Fermer
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

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

      {/* ── Modal Remboursement de Vente (Double Pénalités) ─── */}
      <VenteRemboursementModal
        isOpen={!!activeRefundVente}
        vente={activeRefundVente}
        paiementsList={activeRefundVente ? (paiementsMap[activeRefundVente.id] || []) : []}
        onClose={() => setActiveRefundVente(null)}
        onSuccess={() => {
          setActiveRefundVente(null);
          fetchVentesPage();
          fetchStats();
        }}
      />
    </Layout>
  );
};

export default Ventes;
