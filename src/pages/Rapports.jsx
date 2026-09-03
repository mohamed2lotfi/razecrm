import React, { useState, useEffect } from 'react';
import { 
  FileBarChart, Building2, TrendingDown, TrendingUp, DollarSign, 
  ArrowRightLeft, AlertCircle, CheckCircle2, Info, Loader2, RefreshCw, Eye, FileText, Printer, Download, Calendar,
  Trash2, RotateCcw, ChevronDown
} from 'lucide-react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { supabase } from '@/lib/supabase';

const MultiSelectDropdown = ({ options, selected, onChange, placeholder, className = "" }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className={`relative ${className}`}>
      <div 
        className="border bg-white rounded-md px-3 py-2 h-10 cursor-pointer flex justify-between items-center text-sm"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="truncate">
          {selected.length === 0 
            ? placeholder 
            : selected.length === options.length 
              ? 'Toutes les sélections'
              : `${selected.length} sélection(s)`}
        </span>
        <ChevronDown size={14} className="ml-2 text-muted-foreground shrink-0" />
      </div>
      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute top-full left-0 mt-1 w-full bg-white border shadow-xl rounded-md z-50 max-h-60 overflow-y-auto">
            {options.length > 0 && (
              <div 
                className="p-2 border-b hover:bg-slate-50 cursor-pointer text-sm font-bold flex items-center gap-2"
                onClick={() => {
                  if (selected.length === options.length) onChange([]);
                  else onChange(options.map(o => o.value));
                }}
              >
                <input 
                  type="checkbox" 
                  checked={selected.length === options.length} 
                  readOnly
                />
                Tout sélectionner
              </div>
            )}
            {options.map(opt => (
              <label key={opt.value} className="flex items-center gap-2 p-2 hover:bg-slate-50 cursor-pointer text-sm">
                <input 
                  type="checkbox" 
                  checked={selected.includes(opt.value)}
                  onChange={(e) => {
                    if (e.target.checked) onChange([...selected, opt.value]);
                    else onChange(selected.filter(v => v !== opt.value));
                  }}
                />
                <span className="truncate">{opt.label}</span>
              </label>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

const Rapports = () => {
  const [activeTab, setActiveTab] = useState('fournisseurs'); // 'fournisseurs'
  const [fournisseurs, setFournisseurs] = useState([]);
  const [services, setServices] = useState([]);
  const [selectedFournisseurId, setSelectedFournisseurId] = useState('');
  const [loading, setLoading] = useState(true);

  // Period Filter States
  const [periodType, setPeriodType] = useState('all'); // 'all', 'today', 'this_month', 'last_month', 'this_year', 'custom'
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // Sub-Envelope Detail Modal & Exclusions State
  const [selectedSubEnvId, setSelectedSubEnvId] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [excludedAuditVenteIds, setExcludedAuditVenteIds] = useState([]);

  // Depenses Filter States
  const [depensesEnvId, setDepensesEnvId] = useState('');
  const [depensesSubEnvId, setDepensesSubEnvId] = useState('');
  const [depensesGroupeIds, setDepensesGroupeIds] = useState([]);

  // Incomes Filter States
  const [incomesSources, setIncomesSources] = useState(['ventes', 'omra']); 
  const [incomesServiceIds, setIncomesServiceIds] = useState([]);
  const [incomesGroupIds, setIncomesGroupIds] = useState([]);

  // Raw fetched data
  const [ventes, setVentes] = useState([]);
  const [enveloppes, setEnveloppes] = useState([]);
  const [sousEnveloppes, setSousEnveloppes] = useState([]);
  const [outcomes, setOutcomes] = useState([]);
  const [omraGroupes, setOmraGroupes] = useState([]);
  const [omraPaiements, setOmraPaiements] = useState([]);

  // Pagination states for Tab 2 & 3
  const [currentPageDepenses, setCurrentPageDepenses] = useState(1);
  const [currentPageIncomes, setCurrentPageIncomes] = useState(1);
  const ITEMS_PER_PAGE = 50;

  useEffect(() => {
    fetchMetadata();
  }, []);

  useEffect(() => {
    fetchTransactions();
    // Reset pagination when period changes
    setCurrentPageDepenses(1); 
    setCurrentPageIncomes(1);
  }, [periodType, customStartDate, customEndDate]);

  const getSupabaseDateRange = () => {
    const now = new Date();
    let start, end;
    if (periodType === 'today') {
      const s = new Date();
      s.setHours(0, 0, 0, 0);
      const e = new Date();
      e.setHours(23, 59, 59, 999);
      start = s.toISOString();
      end = e.toISOString();
    } else if (periodType === 'this_month') {
      start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0).toISOString();
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).toISOString();
    } else if (periodType === 'last_month') {
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0).toISOString();
      end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999).toISOString();
    } else if (periodType === 'this_year') {
      start = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0).toISOString();
      end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999).toISOString();
    } else if (periodType === 'custom') {
      if (customStartDate) {
        const s = new Date(customStartDate);
        s.setHours(0, 0, 0, 0);
        start = s.toISOString();
      } else {
        start = new Date('2000-01-01T00:00:00.000Z').toISOString();
      }
      let e = customEndDate ? new Date(customEndDate) : new Date();
      e.setHours(23, 59, 59, 999);
      end = e.toISOString();
    }
    return { start, end };
  };

  const fetchMetadata = async () => {
    const [fRes, sRes, eRes, subRes, ogRes] = await Promise.all([
      supabase.from('fournisseurs').select('*').order('nom'),
      supabase.from('services').select('*').order('nom'),
      supabase.from('outcomes_enveloppes').select('*'),
      supabase.from('outcomes_sous_enveloppes').select('*'),
      supabase.from('omra_groupes').select('*')
    ]);

    if (fRes.data) {
      setFournisseurs(fRes.data);
      if (fRes.data.length > 0 && !selectedFournisseurId) {
        setSelectedFournisseurId(fRes.data[0].id);
      }
    }
    if (sRes.data) setServices(sRes.data);
    if (eRes.data) setEnveloppes(eRes.data);
    if (subRes.data) setSousEnveloppes(subRes.data);
    if (ogRes.data) setOmraGroupes(ogRes.data);
  };

  const fetchTransactions = async () => {
    setLoading(true);
    let vQuery = supabase.from('ventes').select('*, vente_articles(*, services(*), fournisseurs(*))');
    let oQuery = supabase.from('outcomes').select('*');
    let opQuery = supabase.from('omra_paiements').select('*');
    
    if (periodType !== 'all') {
      const range = getSupabaseDateRange();
      if (range.start && range.end) {
        vQuery = vQuery.or(`and(date_vente.gte.${range.start},date_vente.lte.${range.end}),and(date_vente.is.null,created_at.gte.${range.start},created_at.lte.${range.end})`);
        oQuery = oQuery.or(`and(date_paiement.gte.${range.start},date_paiement.lte.${range.end}),and(date_paiement.is.null,created_at.gte.${range.start},created_at.lte.${range.end})`);
        opQuery = opQuery.or(`and(date_paiement.gte.${range.start},date_paiement.lte.${range.end}),and(date_paiement.is.null,created_at.gte.${range.start},created_at.lte.${range.end})`);
      }
    }

    let [vRes, oRes, opRes] = await Promise.all([vQuery, oQuery, opQuery]);
    
    // Fallback if vente_articles relation is not yet loaded
    if (vRes.error) {
      let fallbackVQuery = supabase.from('ventes').select('*');
      if (periodType !== 'all') {
        const range = getSupabaseDateRange();
        if (range.start && range.end) {
          fallbackVQuery = fallbackVQuery.or(`and(date_vente.gte.${range.start},date_vente.lte.${range.end}),and(date_vente.is.null,created_at.gte.${range.start},created_at.lte.${range.end})`);
        }
      }
      vRes = await fallbackVQuery;
    }

    if (vRes.data) {
      const normVentes = vRes.data.map(v => ({
        ...v,
        articles: (v.vente_articles && Array.isArray(v.vente_articles)) 
          ? v.vente_articles.map(a => ({
              ...a,
              passagers: (a.details_specifiques && Array.isArray(a.details_specifiques.passagers) && a.details_specifiques.passagers.length > 0)
                ? a.details_specifiques.passagers
                : (a.passagers || [])
            }))
          : []
      }));
      setVentes(normVentes);
    }
    if (oRes.data) setOutcomes(oRes.data);
    if (opRes.data) setOmraPaiements(opRes.data);
    
    setLoading(false);
  };

  const fetchInitialData = () => {
    fetchMetadata();
    fetchTransactions();
  };

  // Selected Fournisseur Object
  const selectedFournisseur = fournisseurs.find(f => f.id === selectedFournisseurId);

  // --- DATE PERIOD FILTER LOGIC ---
  const isDateInPeriod = (dateStr) => {
    if (!dateStr) return false;
    if (periodType === 'all') return true;

    const d = new Date(dateStr);
    const now = new Date();

    if (periodType === 'today') {
      return d.toDateString() === now.toDateString();
    }

    if (periodType === 'this_month') {
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }

    if (periodType === 'last_month') {
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      return d.getMonth() === lastMonth.getMonth() && d.getFullYear() === lastMonth.getFullYear();
    }

    if (periodType === 'this_year') {
      return d.getFullYear() === now.getFullYear();
    }

    if (periodType === 'custom') {
      if (customStartDate) {
        const start = new Date(customStartDate);
        start.setHours(0, 0, 0, 0);
        if (d < start) return false;
      }
      if (customEndDate) {
        const end = new Date(customEndDate);
        end.setHours(23, 59, 59, 999);
        if (d > end) return false;
      }
      return true;
    }

    return true;
  };

  const getPeriodLabel = () => {
    switch (periodType) {
      case 'today': return "Aujourd'hui";
      case 'this_month': return "Ce mois-ci (" + new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }) + ")";
      case 'last_month': {
        const lm = new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1);
        return "Le mois dernier (" + lm.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }) + ")";
      }
      case 'this_year': return "Cette année (" + new Date().getFullYear() + ")";
      case 'custom': return `Du ${customStartDate || '...'} au ${customEndDate || '...'}`;
      default: return "Toutes les dates (Historique complet)";
    }
  };

  // --- CALCULATION ENGINE FOR SUPPLIER AUDIT ---
  const calculateSupplierReport = () => {
    if (!selectedFournisseurId) {
      return {
        totalVentesTarif: 0,
        totalDepensesPaid: 0,
        ecartGlobal: 0,
        serviceBreakdown: [],
        supplierVentes: [],
        supplierOutcomes: [],
        subEnvBreakdown: []
      };
    }

    // Helper: calculate the specific portion belonging to selectedFournisseurId for a sale
    const getSaleSupplierDetails = (v) => {
      const isRembourse = v.etat === 'Remboursé';

      if (v.articles && Array.isArray(v.articles) && v.articles.length > 0) {
        const matchingArticles = v.articles.filter(a => 
          (a.fournisseur_id === selectedFournisseurId) || 
          (!a.fournisseur_id && v.fournisseur_id === selectedFournisseurId)
        );

        if (matchingArticles.length === 0) return null;

        let supplierTarifBase = 0;
        let supplierTotalVente = 0;
        let supplierCommission = 0;

        if (isRembourse) {
          // En cas de vente remboursée, seule la pénalité fournisseur retenue (Total vente net - Commission agence) reste due
          const refundPenalite = Math.max(0, (parseFloat(v.total) || 0) - (parseFloat(v.commission) || 0));
          supplierTarifBase = refundPenalite;
          supplierTotalVente = parseFloat(v.total) || 0;
          supplierCommission = parseFloat(v.commission) || 0;
        } else {
          supplierTarifBase = matchingArticles.reduce((sum, a) => {
            const pa = parseFloat(a.prix_achat);
            if (!isNaN(pa) && a.prix_achat !== '') return sum + pa;
            const pv = parseFloat(a.prix_vente) || 0;
            const comm = parseFloat(a.commission) || 0;
            return sum + (pv - comm);
          }, 0);
          supplierTotalVente = matchingArticles.reduce((sum, a) => sum + (parseFloat(a.prix_vente) || 0), 0);
          supplierCommission = matchingArticles.reduce((sum, a) => sum + (parseFloat(a.commission) || 0), 0);
        }

        return {
          supplierTarifBase,
          supplierTotalVente,
          supplierCommission,
          matchingArticles,
          isPartial: matchingArticles.length < v.articles.length,
          totalArticlesCount: v.articles.length
        };
      } else {
        // Legacy single-service sale without articles array
        if (v.fournisseur_id === selectedFournisseurId) {
          let cost = 0;
          if (isRembourse) {
            cost = Math.max(0, (parseFloat(v.total) || 0) - (parseFloat(v.commission) || 0));
          } else {
            const costCandidate = Number(v.tarif_base);
            cost = (!isNaN(costCandidate) && costCandidate > 0) ? costCandidate : Math.max(0, Number(v.total) - Number(v.commission));
          }
          return {
            supplierTarifBase: cost,
            supplierTotalVente: Number(v.total) || 0,
            supplierCommission: Number(v.commission) || 0,
            matchingArticles: [],
            isPartial: false,
            totalArticlesCount: 1
          };
        }
        return null;
      }
    };

    // 1. Filter sales for selected supplier & period (excluding manual audit exclusions)
    const supplierVentes = [];
    ventes.forEach(v => {
      if (!isDateInPeriod(v.date_vente || v.created_at)) return;
      if (excludedAuditVenteIds.includes(v.id)) return;

      const details = getSaleSupplierDetails(v);
      if (details) {
        supplierVentes.push({
          ...v,
          supplierTarifBase: details.supplierTarifBase,
          supplierTotalVente: details.supplierTotalVente,
          supplierCommission: details.supplierCommission,
          matchingArticles: details.matchingArticles,
          isPartial: details.isPartial,
          totalArticlesCount: details.totalArticlesCount
        });
      }
    });

    const totalVentesTarif = supplierVentes.reduce((sum, v) => sum + v.supplierTarifBase, 0);

    // 2. Filter envelopes & outcomes for selected supplier & period
    const supplierEnvelopes = enveloppes.filter(e => e.fournisseur_id === selectedFournisseurId || (e.type_enveloppe === 'fournisseur' && e.fournisseur_id === selectedFournisseurId));
    const supplierEnvIds = supplierEnvelopes.map(e => e.id);

    // Filter sub-envelopes under supplier envelopes
    const supplierSubEnvs = sousEnveloppes.filter(se => supplierEnvIds.includes(se.enveloppe_id));
    const supplierSubEnvIds = supplierSubEnvs.map(se => se.id);

    // Filter outcomes matching these supplier envelopes or sub-envelopes & period
    const supplierOutcomes = outcomes.filter(o => 
      (supplierEnvIds.includes(o.enveloppe_id) || supplierSubEnvIds.includes(o.sous_enveloppe_id)) &&
      isDateInPeriod(o.date_paiement || o.created_at)
    );

    const totalDepensesPaid = supplierOutcomes.reduce((sum, o) => {
      return sum + (Number(o.montant_dzd) || Number(o.montant) || 0);
    }, 0);

    // Écart / Solde = Total Payé (Dépenses) - Total Dû (Ventes)
    const ecartGlobal = totalDepensesPaid - totalVentesTarif;

    // 3. Service Breakdown Comparison
    const serviceMap = {};
    services.forEach(serv => {
      serviceMap[serv.id] = {
        id: serv.id,
        nom: serv.nom,
        ventesCount: 0,
        ventesTarifTotal: 0,
        outcomesTotal: 0
      };
    });

    supplierVentes.forEach(v => {
      const isRembourse = v.etat === 'Remboursé';
      if (v.matchingArticles && v.matchingArticles.length > 0) {
        v.matchingArticles.forEach(art => {
          const matchedService = services.find(s => 
            s.id === art.service_id || s.nom.toLowerCase() === (art.categorie || '').toLowerCase()
          ) || (v.service_id ? services.find(s => s.id === v.service_id) : null);

          if (matchedService && serviceMap[matchedService.id]) {
            serviceMap[matchedService.id].ventesCount += 1;
            let artCost = 0;
            if (isRembourse) {
              artCost = v.supplierTarifBase / (v.matchingArticles.length || 1);
            } else {
              const pa = parseFloat(art.prix_achat);
              artCost = (!isNaN(pa) && art.prix_achat !== '') 
                ? pa 
                : ((parseFloat(art.prix_vente) || 0) - (parseFloat(art.commission) || 0));
            }
            serviceMap[matchedService.id].ventesTarifTotal += artCost;
          }
        });
      } else {
        if (v.service_id && serviceMap[v.service_id]) {
          serviceMap[v.service_id].ventesCount += 1;
          serviceMap[v.service_id].ventesTarifTotal += v.supplierTarifBase;
        }
      }
    });

    supplierOutcomes.forEach(o => {
      const subEnv = supplierSubEnvs.find(se => se.id === o.sous_enveloppe_id);
      const linkedServices = subEnv?.service_ids || [];
      const outcomeAmount = Number(o.montant_dzd) || Number(o.montant) || 0;

      if (linkedServices.length > 0) {
        const amountPerService = outcomeAmount / linkedServices.length;
        linkedServices.forEach(sId => {
          if (serviceMap[sId]) {
            serviceMap[sId].outcomesTotal += amountPerService;
          }
        });
      }
    });

    // 4. Breakdown BY SOUS-ENVELOPPE
    const subEnvBreakdown = supplierSubEnvs.map(se => {
      const parentEnv = supplierEnvelopes.find(e => e.id === se.enveloppe_id);
      const linkedServiceIds = se.service_ids || [];
      const linkedServiceNames = linkedServiceIds
        .map(sId => services.find(s => s.id === sId)?.nom)
        .filter(Boolean);

      // Find sales matching services linked to this sous-enveloppe
      const matchingVentes = [];
      let ventesTarifTotal = 0;

      supplierVentes.forEach(v => {
        const isRembourse = v.etat === 'Remboursé';
        if (v.matchingArticles && v.matchingArticles.length > 0) {
          const seArticles = v.matchingArticles.filter(art => {
            const matchedService = services.find(s => 
              s.id === art.service_id || s.nom.toLowerCase() === (art.categorie || '').toLowerCase()
            );
            const sId = matchedService?.id || art.service_id || v.service_id;
            return linkedServiceIds.includes(sId);
          });

          if (seArticles.length > 0) {
            let costForThisSubEnv = 0;
            if (isRembourse) {
              costForThisSubEnv = v.supplierTarifBase;
            } else {
              costForThisSubEnv = seArticles.reduce((sum, art) => {
                const pa = parseFloat(art.prix_achat);
                if (!isNaN(pa) && art.prix_achat !== '') return sum + pa;
                const pv = parseFloat(art.prix_vente) || 0;
                const comm = parseFloat(art.commission) || 0;
                return sum + (pv - comm);
              }, 0);
            }

            ventesTarifTotal += costForThisSubEnv;
            matchingVentes.push({
              ...v,
              subEnvMatchingArticles: seArticles,
              subEnvCost: costForThisSubEnv
            });
          }
        } else {
          if (linkedServiceIds.includes(v.service_id)) {
            ventesTarifTotal += v.supplierTarifBase;
            matchingVentes.push({
              ...v,
              subEnvMatchingArticles: [],
              subEnvCost: v.supplierTarifBase
            });
          }
        }
      });

      // Find outcomes paid specifically under this sous-enveloppe
      const matchingOutcomes = supplierOutcomes.filter(o => o.sous_enveloppe_id === se.id);
      const outcomesTotal = matchingOutcomes.reduce((sum, o) => {
        return sum + (Number(o.montant_dzd) || Number(o.montant) || 0);
      }, 0);

      const ecart = outcomesTotal - ventesTarifTotal;
      let status = 'equilibre';
      if (ecart > 1) status = 'surpaye';
      else if (ecart < -1) status = 'dette';

      return {
        id: se.id,
        nom: se.nom,
        enveloppeNom: parentEnv?.nom || '—',
        linkedServiceNames,
        ventesCount: matchingVentes.length,
        ventesTarifTotal,
        outcomesTotal,
        ecart,
        status,
        matchingVentes,
        matchingOutcomes
      };
    });

    // Handle unassigned supplier outcomes or sales
    const assignedSubEnvIds = new Set(supplierSubEnvs.map(se => se.id));
    const unassignedOutcomes = supplierOutcomes.filter(o => !o.sous_enveloppe_id || !assignedSubEnvIds.has(o.sous_enveloppe_id));
    const unassignedOutcomesTotal = unassignedOutcomes.reduce((sum, o) => sum + (Number(o.montant_dzd) || Number(o.montant) || 0), 0);

    const allLinkedServiceIds = new Set(supplierSubEnvs.flatMap(se => se.service_ids || []));
    const unassignedVentes = [];
    let unassignedVentesTarifTotal = 0;

    supplierVentes.forEach(v => {
      const isRembourse = v.etat === 'Remboursé';
      if (v.matchingArticles && v.matchingArticles.length > 0) {
        const unassignedArticles = v.matchingArticles.filter(art => {
          const matchedService = services.find(s => 
            s.id === art.service_id || s.nom.toLowerCase() === (art.categorie || '').toLowerCase()
          );
          const sId = matchedService?.id || art.service_id || v.service_id;
          return !sId || !allLinkedServiceIds.has(sId);
        });

        if (unassignedArticles.length > 0) {
          let cost = 0;
          if (isRembourse) {
            cost = v.supplierTarifBase;
          } else {
            cost = unassignedArticles.reduce((sum, art) => {
              const pa = parseFloat(art.prix_achat);
              if (!isNaN(pa) && art.prix_achat !== '') return sum + pa;
              const pv = parseFloat(art.prix_vente) || 0;
              const comm = parseFloat(art.commission) || 0;
              return sum + (pv - comm);
            }, 0);
          }
          unassignedVentesTarifTotal += cost;
          unassignedVentes.push({
            ...v,
            subEnvMatchingArticles: unassignedArticles,
            subEnvCost: cost
          });
        }
      } else {
        if (!v.service_id || !allLinkedServiceIds.has(v.service_id)) {
          unassignedVentesTarifTotal += v.supplierTarifBase;
          unassignedVentes.push({
            ...v,
            subEnvMatchingArticles: [],
            subEnvCost: v.supplierTarifBase
          });
        }
      }
    });

    if (unassignedOutcomesTotal > 0 || unassignedVentesTarifTotal > 0) {
      const ecart = unassignedOutcomesTotal - unassignedVentesTarifTotal;
      subEnvBreakdown.push({
        id: 'unassigned',
        nom: 'Dépenses & Ventes non rattachées à une sous-enveloppe spécifique',
        enveloppeNom: 'Général',
        linkedServiceNames: ['Non spécifié'],
        ventesCount: unassignedVentes.length,
        ventesTarifTotal: unassignedVentesTarifTotal,
        outcomesTotal: unassignedOutcomesTotal,
        ecart,
        status: ecart > 1 ? 'surpaye' : ecart < -1 ? 'dette' : 'equilibre',
        matchingVentes: unassignedVentes,
        matchingOutcomes: unassignedOutcomes
      });
    }

    return {
      totalVentesTarif,
      totalDepensesPaid,
      ecartGlobal,
      subEnvBreakdown,
      supplierVentes,
      supplierOutcomes
    };
  };

  const reportData = calculateSupplierReport();
  const selectedSubEnvDetail = reportData.subEnvBreakdown.find(se => se.id === selectedSubEnvId) || null;

  const openSubEnvDetail = (se) => {
    setSelectedSubEnvId(se.id);
    setIsDetailModalOpen(true);
  };

  const handleExcludeVenteFromAudit = (venteId) => {
    setExcludedAuditVenteIds(prev => [...prev, venteId]);
  };

  const exportPDF = () => {
    if (!selectedSubEnvDetail) return;

    const printWindow = window.open('', '_blank', 'height=800,width=1000');
    if (!printWindow) {
      alert("Veuillez autoriser les fenêtres surgissantes (popups) pour exporter en PDF.");
      return;
    }

    const exportDate = new Date().toLocaleDateString('fr-FR', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });

    const ventesRows = (selectedSubEnvDetail.matchingVentes || []).map(v => {
      const sObj = services.find(s => s.id === v.service_id);
      const cost = v.subEnvCost !== undefined ? v.subEnvCost : (v.supplierTarifBase || (Number(v.tarif_base) || (Number(v.total) - Number(v.commission)) || 0));
      
      const articlesLabel = (v.subEnvMatchingArticles && v.subEnvMatchingArticles.length > 0)
        ? v.subEnvMatchingArticles.map(a => `[${a.categorie}] ${a.designation || 'Prestation'}`).join(', ')
        : (v.details || '—');

      return `
        <tr>
          <td>${v.date_vente ? new Date(v.date_vente).toLocaleDateString('fr-FR') : '—'}</td>
          <td><b>${v.client_nom || '—'}</b></td>
          <td>${sObj?.nom || '—'}</td>
          <td>${articlesLabel}</td>
          <td style="text-align: right; font-weight: bold; color: #1d4ed8;">${cost.toLocaleString('fr-DZ', { minimumFractionDigits: 2 })} DZD</td>
        </tr>
      `;
    }).join('');

    const outcomesRows = (selectedSubEnvDetail.matchingOutcomes || []).map(o => {
      return `
        <tr>
          <td>${new Date(o.date_paiement).toLocaleDateString('fr-FR')}</td>
          <td><b>${o.description || 'Dépense Fournisseur'}</b></td>
          <td>${o.reference_paiement || '—'}</td>
          <td style="text-align: right;">${Number(o.montant).toLocaleString('fr-DZ')} ${o.devise}</td>
          <td style="text-align: right; font-weight: bold; color: #7e22ce;">${Number(o.montant_dzd).toLocaleString('fr-DZ', { minimumFractionDigits: 2 })} DZD</td>
        </tr>
      `;
    }).join('');

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Rapport Audit - ${selectedSubEnvDetail.nom}</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; font-size: 12px; color: #1e293b; margin: 30px; line-height: 1.5; }
            .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #2563eb; padding-bottom: 12px; margin-bottom: 20px; }
            .title { font-size: 20px; font-weight: 800; color: #1e3a8a; letter-spacing: -0.5px; }
            .meta { font-size: 11px; color: #475569; text-align: right; line-height: 1.6; }
            .badge { background: #eff6ff; color: #1d4ed8; padding: 3px 8px; border-radius: 4px; font-weight: 700; border: 1px solid #bfdbfe; }
            .period-badge { background: #fef3c7; color: #92400e; padding: 3px 8px; border-radius: 4px; font-weight: 700; border: 1px solid #fde68a; }
            .kpi-container { display: flex; gap: 15px; margin-bottom: 25px; }
            .kpi-card { flex: 1; padding: 12px 16px; border-radius: 8px; border: 1px solid #e2e8f0; background: #f8fafc; }
            .kpi-title { font-size: 10px; text-transform: uppercase; color: #64748b; font-weight: 700; tracking-wide; }
            .kpi-value { font-size: 17px; font-weight: 800; margin-top: 4px; }
            .section-title { font-size: 13px; font-weight: 700; margin-top: 25px; margin-bottom: 10px; color: #0f172a; border-bottom: 1px solid #cbd5e1; padding-bottom: 5px; display: flex; justify-content: space-between; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 11px; }
            th { background: #f1f5f9; text-align: left; padding: 8px 10px; font-size: 10px; text-transform: uppercase; color: #475569; border: 1px solid #cbd5e1; font-weight: 700; }
            td { padding: 7px 10px; border: 1px solid #e2e8f0; }
            tr:nth-child(even) { background-color: #f8fafc; }
            .footer { margin-top: 40px; text-align: center; font-size: 10px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 12px; }
            @media print {
              body { margin: 15px; }
              @page { size: A4; margin: 12mm; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="title">📋 RAPPORT D'AUDIT FINANCIER</div>
              <div style="font-size: 13px; margin-top: 6px;">
                Sous-Enveloppe : <span class="badge">${selectedSubEnvDetail.nom}</span>
              </div>
            </div>
            <div class="meta">
              <div><b>Fournisseur :</b> ${selectedFournisseur?.nom || '—'}</div>
              <div><b>Enveloppe Parente :</b> ${selectedSubEnvDetail.enveloppeNom || '—'}</div>
              <div><b>Période d'analyse :</b> <span class="period-badge">${getPeriodLabel()}</span></div>
              <div><b>Émis le :</b> ${exportDate}</div>
            </div>
          </div>

          <div class="kpi-container">
            <div class="kpi-card" style="border-left: 4px solid #2563eb;">
              <div class="kpi-title">Total Dû (Ventes)</div>
              <div class="kpi-value" style="color: #1d4ed8;">${selectedSubEnvDetail.ventesTarifTotal?.toLocaleString('fr-DZ', { minimumFractionDigits: 2 })} DZD</div>
              <div style="font-size: 10px; color: #64748b;">${selectedSubEnvDetail.matchingVentes?.length || 0} dossier(s) de vente</div>
            </div>
            <div class="kpi-card" style="border-left: 4px solid #9333ea;">
              <div class="kpi-title">Total Payé (Outcomes)</div>
              <div class="kpi-value" style="color: #7e22ce;">${selectedSubEnvDetail.outcomesTotal?.toLocaleString('fr-DZ', { minimumFractionDigits: 2 })} DZD</div>
              <div style="font-size: 10px; color: #64748b;">${selectedSubEnvDetail.matchingOutcomes?.length || 0} décaissement(s)</div>
            </div>
            <div class="kpi-card" style="border-left: 4px solid ${selectedSubEnvDetail.ecart > 1 ? '#10b981' : selectedSubEnvDetail.ecart < -1 ? '#f59e0b' : '#64748b'};">
              <div class="kpi-title">Solde / Écart</div>
              <div class="kpi-value" style="color: ${selectedSubEnvDetail.ecart > 0 ? '#047857' : selectedSubEnvDetail.ecart < 0 ? '#b45309' : '#334155'};">
                ${selectedSubEnvDetail.ecart > 0 ? '+' : ''}${selectedSubEnvDetail.ecart?.toLocaleString('fr-DZ', { minimumFractionDigits: 2 })} DZD
              </div>
              <div style="font-size: 10px; font-weight: bold; color: ${selectedSubEnvDetail.ecart > 1 ? '#047857' : selectedSubEnvDetail.ecart < -1 ? '#b45309' : '#475569'};">
                ${selectedSubEnvDetail.ecart > 1 ? 'Surpayé / Avance crédite' : selectedSubEnvDetail.ecart < -1 ? 'Reste à régler au fournisseur' : 'Situation équilibrée'}
              </div>
            </div>
          </div>

          <div class="section-title">
            <span>🛒 1. Détail des Dossiers de Ventes</span>
            <span>Sous-total Dû : ${selectedSubEnvDetail.ventesTarifTotal?.toLocaleString('fr-DZ', { minimumFractionDigits: 2 })} DZD</span>
          </div>
          <table>
            <thead>
              <tr>
                <th>Date Vente</th>
                <th>Nom du Client</th>
                <th>Service</th>
                <th>Détails</th>
                <th style="text-align: right;">Tarif Dû (DZD)</th>
              </tr>
            </thead>
            <tbody>
              ${ventesRows.length > 0 ? ventesRows : '<tr><td colSpan="5" style="text-align:center; color:#94a3b8;">Aucune vente associée sur cette période.</td></tr>'}
            </tbody>
          </table>

          <div class="section-title">
            <span>💳 2. Détail des Décaissements / Dépenses</span>
            <span>Sous-total Payé : ${selectedSubEnvDetail.outcomesTotal?.toLocaleString('fr-DZ', { minimumFractionDigits: 2 })} DZD</span>
          </div>
          <table>
            <thead>
              <tr>
                <th>Date Paiement</th>
                <th>Description / Désignation</th>
                <th>Réf. Paiement</th>
                <th style="text-align: right;">Montant Saisi</th>
                <th style="text-align: right;">Total DZD</th>
              </tr>
            </thead>
            <tbody>
              ${outcomesRows.length > 0 ? outcomesRows : '<tr><td colSpan="5" style="text-align:center; color:#94a3b8;">Aucune dépense enregistrée sur cette période.</td></tr>'}
            </tbody>
          </table>

          <div class="footer">
            Document généré automatiquement par AgencyCRM — Rapport Officiel d'Audit Financier
          </div>

          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  return (
    <Layout>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight flex items-center gap-3">
            <FileBarChart size={28} className="text-primary" /> Rapports & Audits Financiers
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Analyse comparative de la situation envers les fournisseurs par Sous-Enveloppe (Ventes vs Dépenses).
          </p>
        </div>

        <Button onClick={fetchInitialData} variant="outline" size="sm" className="gap-2 self-start sm:self-auto">
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Actualiser les données
        </Button>
      </div>

      {/* Onglets */}
      <div className="flex gap-2 border-b mb-6">
        <button
          onClick={() => setActiveTab('fournisseurs')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'fournisseurs'
              ? 'text-primary border-primary bg-primary/5'
              : 'text-muted-foreground border-transparent hover:text-foreground'
          }`}
        >
          <Building2 size={16} /> Rapport Fournisseurs (Par Sous-Enveloppe)
        </button>
        <button
          onClick={() => setActiveTab('depenses')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'depenses'
              ? 'text-primary border-primary bg-primary/5'
              : 'text-muted-foreground border-transparent hover:text-foreground'
          }`}
        >
          <DollarSign size={16} /> Rapport de Dépenses
        </button>
        <button
          onClick={() => setActiveTab('incomes')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'incomes'
              ? 'text-primary border-primary bg-primary/5'
              : 'text-muted-foreground border-transparent hover:text-foreground'
          }`}
        >
          <TrendingUp size={16} /> Rapport des Incomes
        </button>
      </div>

      {/* --- VOLET RAPPORT DÉPENSES --- */}
      {activeTab === 'depenses' && (() => {
        const selectedDepenseEnv = enveloppes.find(e => e.id === depensesEnvId);
        const isDepenseEnvOmra = selectedDepenseEnv?.type_enveloppe === 'omra' || selectedDepenseEnv?.nom?.toLowerCase() === 'omra';

        let filtered = outcomes.filter(o => isDateInPeriod(o.date_paiement || o.created_at));
        if (depensesEnvId) {
          filtered = filtered.filter(o => o.enveloppe_id === depensesEnvId);
        }
        if (depensesSubEnvId) {
          filtered = filtered.filter(o => o.sous_enveloppe_id === depensesSubEnvId);
        }
        if (isDepenseEnvOmra && depensesGroupeIds.length > 0) {
          filtered = filtered.filter(o => o.groupe_ids && o.groupe_ids.some(gid => depensesGroupeIds.includes(gid)));
        }
        const totalDZD = filtered.reduce((sum, o) => sum + (Number(o.montant_dzd) || Number(o.montant) || 0), 0);
        
        // Client-side pagination
        const totalItems = filtered.length;
        const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
        const paginatedOutcomes = filtered.slice((currentPageDepenses - 1) * ITEMS_PER_PAGE, currentPageDepenses * ITEMS_PER_PAGE);

        const exportDepensesPDF = () => {
          const exportDate = new Date().toLocaleString('fr-FR');
          const rows = filtered.map(o => {
            const env = enveloppes.find(e => e.id === o.enveloppe_id);
            const subEnv = sousEnveloppes.find(se => se.id === o.sous_enveloppe_id);
            return `
              <tr>
                <td>${new Date(o.date_paiement).toLocaleDateString('fr-FR')}</td>
                <td><b>${o.description || 'Dépense'}</b></td>
                <td>${env?.nom || '—'}</td>
                <td>${subEnv?.nom || '—'}</td>
                <td style="text-align: right; font-weight: bold; color: #7e22ce;">${Number(o.montant_dzd).toLocaleString('fr-DZ', { minimumFractionDigits: 2 })} DZD</td>
              </tr>
            `;
          }).join('');

          const htmlContent = `
            <!DOCTYPE html>
            <html>
              <head>
                <title>Rapport de Dépenses</title>
                <style>
                  body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; font-size: 12px; color: #1e293b; margin: 30px; line-height: 1.5; }
                  .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #9333ea; padding-bottom: 12px; margin-bottom: 20px; }
                  .title { font-size: 20px; font-weight: 800; color: #4c1d95; }
                  .meta { font-size: 11px; color: #475569; text-align: right; }
                  table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 11px; }
                  th { background: #f1f5f9; text-align: left; padding: 8px 10px; font-size: 10px; text-transform: uppercase; color: #475569; border: 1px solid #cbd5e1; font-weight: 700; }
                  td { padding: 7px 10px; border: 1px solid #e2e8f0; }
                  tr:nth-child(even) { background-color: #f8fafc; }
                  .total-box { margin-top: 20px; text-align: right; font-size: 14px; font-weight: bold; }
                  .total-val { font-size: 18px; color: #7e22ce; }
                  @media print { body { margin: 15px; } }
                </style>
              </head>
              <body>
                <div class="header">
                  <div>
                    <div class="title">📋 RAPPORT DE DÉPENSES</div>
                  </div>
                  <div class="meta">
                    <div><b>Période d'analyse :</b> ${getPeriodLabel()}</div>
                    <div><b>Émis le :</b> ${exportDate}</div>
                  </div>
                </div>
                <table>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Description</th>
                      <th>Enveloppe</th>
                      <th>Sous-Enveloppe</th>
                      <th style="text-align: right;">Montant (DZD)</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${rows || '<tr><td colSpan="5" style="text-align:center;">Aucune dépense</td></tr>'}
                  </tbody>
                </table>
                <div class="total-box">
                  Total des Dépenses : <span class="total-val">${totalDZD.toLocaleString('fr-DZ', { minimumFractionDigits: 2 })} DZD</span>
                </div>
                <script>window.onload = function() { window.print(); };</script>
              </body>
            </html>
          `;
          const printWindow = window.open('', '', 'height=800,width=1000');
          printWindow.document.write(htmlContent);
          printWindow.document.close();
        };

        return (
          <div className="space-y-6">
            <Card className="border-2 border-primary/20 bg-primary/5">
              <CardContent className="p-4 space-y-4">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Filtres Enveloppes */}
                  <div className="flex items-center gap-4 flex-wrap">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center text-purple-700 font-bold shrink-0">
                        <FileText size={20} />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-foreground block">Enveloppe :</label>
                        <Select
                          value={depensesEnvId}
                          onChange={e => {
                            setDepensesEnvId(e.target.value);
                            setDepensesSubEnvId(''); // reset sub-env on change
                            setDepensesGroupeIds([]); // reset group selection
                          }}
                          className="bg-white font-semibold mt-1 w-full sm:w-48"
                        >
                          <option value="">-- Toutes --</option>
                          {enveloppes.map(env => (
                            <option key={env.id} value={env.id}>{env.nom}</option>
                          ))}
                        </Select>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div>
                        <label className="text-xs font-bold text-foreground block">Sous-Enveloppe :</label>
                        <Select
                          value={depensesSubEnvId}
                          onChange={e => setDepensesSubEnvId(e.target.value)}
                          className="bg-white font-semibold mt-1 w-full sm:w-48"
                          disabled={!depensesEnvId}
                        >
                          <option value="">-- Toutes --</option>
                          {sousEnveloppes
                            .filter(se => se.enveloppe_id === depensesEnvId)
                            .map(se => (
                              <option key={se.id} value={se.id}>{se.nom}</option>
                            ))}
                        </Select>
                      </div>
                    </div>
                  </div>

                  {/* Sélecteur de Période (Réutilisé) */}
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-700 font-bold shrink-0">
                      <Calendar size={20} />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-foreground block">Période d'Analyse :</label>
                      <Select
                        value={periodType}
                        onChange={e => setPeriodType(e.target.value)}
                        className="bg-white font-semibold mt-1 w-full sm:w-56"
                      >
                        <option value="all">📅 Toutes les dates</option>
                        <option value="today">📅 Aujourd'hui</option>
                        <option value="this_month">📅 Ce mois-ci</option>
                        <option value="last_month">📅 Le mois dernier</option>
                        <option value="this_year">📅 Cette année</option>
                        <option value="custom">📅 Personnalisée</option>
                      </Select>
                    </div>
                  </div>
                </div>

                {isDepenseEnvOmra && (
                  <div className="pt-3 border-t border-primary/10 mt-2">
                    <label className="text-xs font-bold text-foreground block mb-2">Filtrer par Groupes Omra :</label>
                    <div className="flex flex-wrap gap-2">
                      {omraGroupes.map(g => {
                        const isSelected = depensesGroupeIds.includes(g.id);
                        return (
                          <button
                            key={g.id}
                            type="button"
                            onClick={() => {
                              setDepensesGroupeIds(prev => 
                                prev.includes(g.id) ? prev.filter(id => id !== g.id) : [...prev, g.id]
                              );
                            }}
                            className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors ${
                              isSelected ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-gray-700 border-gray-200 hover:bg-purple-50'
                            }`}
                          >
                            {g.nom}
                          </button>
                        );
                      })}
                      {omraGroupes.length === 0 && <span className="text-xs text-muted-foreground italic">Aucun groupe disponible</span>}
                    </div>
                  </div>
                )}

                {periodType === 'custom' && (
                  <div className="flex flex-wrap items-center gap-4 pt-3 border-t border-primary/10 bg-white/60 p-3 rounded-lg">
                    <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <Calendar size={14} className="text-primary" /> Plage personnalisée :
                    </span>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-semibold text-muted-foreground">Du:</span>
                      <Input type="date" value={customStartDate} onChange={e => setCustomStartDate(e.target.value)} className="h-8 text-xs bg-white w-36" />
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-semibold text-muted-foreground">Au:</span>
                      <Input type="date" value={customEndDate} onChange={e => setCustomEndDate(e.target.value)} className="h-8 text-xs bg-white w-36" />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="shadow-sm border-l-4 border-l-purple-500">
              <CardHeader className="py-4 px-5">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Total des Dépenses (Filtrées)</span>
                <div className="text-3xl font-extrabold text-purple-700 mt-1">
                  {totalDZD.toLocaleString('fr-DZ', { minimumFractionDigits: 2 })} <span className="text-sm text-muted-foreground">DZD</span>
                </div>
              </CardHeader>
            </Card>

            <Card className="shadow-md overflow-hidden">
              <CardHeader className="bg-muted/30 py-4 border-b flex flex-row items-center justify-between">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <FileText size={18} /> Détails des Dépenses ({filtered.length})
                </CardTitle>
                <Button onClick={exportDepensesPDF} size="sm" variant="outline" className="h-8 gap-2 border-purple-200 text-purple-700 hover:bg-purple-50">
                  <Printer size={14} /> Exporter PDF
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-muted/50 text-muted-foreground text-[11px] uppercase font-bold border-b">
                      <tr>
                        <th className="px-5 py-3">Date</th>
                        <th className="px-5 py-3">Description</th>
                        <th className="px-5 py-3">Enveloppe</th>
                        <th className="px-5 py-3">Sous-Enveloppe</th>
                        <th className="px-5 py-3 text-right">Montant (DZD)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {paginatedOutcomes.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-5 py-8 text-center text-muted-foreground italic">Aucune dépense trouvée.</td>
                        </tr>
                      ) : (
                        paginatedOutcomes.map(o => {
                          const env = enveloppes.find(e => e.id === o.enveloppe_id);
                          const subEnv = sousEnveloppes.find(se => se.id === o.sous_enveloppe_id);
                          return (
                            <tr key={o.id} className="hover:bg-muted/20">
                              <td className="px-5 py-3">{new Date(o.date_paiement).toLocaleDateString('fr-FR')}</td>
                              <td className="px-5 py-3 font-medium">{o.description || '-'}</td>
                              <td className="px-5 py-3 text-muted-foreground text-xs">{env?.nom || '-'}</td>
                              <td className="px-5 py-3 text-muted-foreground text-xs">{subEnv?.nom || '-'}</td>
                              <td className="px-5 py-3 text-right font-bold text-slate-800">
                                {(Number(o.montant_dzd) || Number(o.montant)).toLocaleString('fr-DZ', { minimumFractionDigits: 2 })}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
                {totalPages > 1 && (
                  <div className="p-4 border-t flex justify-center gap-2">
                    {Array.from({ length: totalPages }).map((_, i) => (
                      <Button key={i} variant={currentPageDepenses === i + 1 ? 'default' : 'outline'} size="sm" onClick={() => setCurrentPageDepenses(i + 1)}>
                        {i + 1}
                      </Button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        );
      })()}

      {/* --- VOLET RAPPORT REVENUS (INCOMES) --- */}
      {activeTab === 'incomes' && (() => {
        let filteredVentes = [];
        let filteredOmra = [];

        if (incomesSources.includes('ventes')) {
          filteredVentes = ventes.filter(v => isDateInPeriod(v.date_vente || v.created_at));
          if (incomesServiceIds.length > 0) {
            filteredVentes = filteredVentes.filter(v => incomesServiceIds.includes(v.service_id));
          }
        }

        if (incomesSources.includes('omra')) {
          filteredOmra = omraPaiements.filter(p => isDateInPeriod(p.date_paiement || p.created_at));
          if (incomesGroupIds.length > 0) {
            filteredOmra = filteredOmra.filter(p => incomesGroupIds.includes(p.groupe_id));
          }
        }

        const allIncomes = [
          ...filteredVentes.map(v => ({ ...v, type: 'vente' })),
          ...filteredOmra.map(o => ({ ...o, type: 'omra' }))
        ];
        
        const totalVentes = filteredVentes.reduce((sum, v) => sum + (Number(v.total) || 0), 0);
        const totalOmra = filteredOmra.reduce((sum, p) => sum + (Number(p.montant_dzd) || 0), 0);
        const totalIncomes = totalVentes + totalOmra;

        const totalPages = Math.ceil(allIncomes.length / ITEMS_PER_PAGE);
        const paginatedIncomes = allIncomes.slice((currentPageIncomes - 1) * ITEMS_PER_PAGE, currentPageIncomes * ITEMS_PER_PAGE);

        const exportIncomesPDF = () => {
          const exportDate = new Date().toLocaleString('fr-FR');
          const rows = allIncomes.map(item => {
            if (item.type === 'vente') {
              const serv = services.find(s => s.id === item.service_id);
              return `
                <tr>
                  <td>${item.date_vente ? new Date(item.date_vente).toLocaleDateString('fr-FR') : '—'}</td>
                  <td><b>VENTE</b></td>
                  <td>${item.client_nom || '—'}</td>
                  <td>${serv?.nom || '—'}</td>
                  <td style="text-align: right; font-weight: bold; color: #1d4ed8;">${Number(item.total || 0).toLocaleString('fr-DZ', { minimumFractionDigits: 2 })} DZD</td>
                </tr>
              `;
            } else {
              const grp = omraGroupes.find(g => g.id === item.groupe_id);
              return `
                <tr>
                  <td>${item.date_paiement ? new Date(item.date_paiement).toLocaleDateString('fr-FR') : '—'}</td>
                  <td><b>OMRA</b></td>
                  <td>${item.nom_client || '—'}</td>
                  <td>${grp?.nom || '—'}</td>
                  <td style="text-align: right; font-weight: bold; color: #7e22ce;">${Number(item.montant_dzd || 0).toLocaleString('fr-DZ', { minimumFractionDigits: 2 })} DZD</td>
                </tr>
              `;
            }
          }).join('');

          const htmlContent = `
            <!DOCTYPE html>
            <html>
              <head>
                <title>Rapport des Revenus</title>
                <style>
                  body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; font-size: 12px; color: #1e293b; margin: 30px; line-height: 1.5; }
                  .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #10b981; padding-bottom: 12px; margin-bottom: 20px; }
                  .title { font-size: 20px; font-weight: 800; color: #047857; }
                  .meta { font-size: 11px; color: #475569; text-align: right; }
                  .kpi-container { display: flex; gap: 15px; margin-bottom: 25px; }
                  .kpi-card { flex: 1; padding: 12px; border-radius: 6px; border: 1px solid #e2e8f0; background: #f8fafc; }
                  .kpi-title { font-size: 10px; text-transform: uppercase; color: #64748b; font-weight: 700; }
                  .kpi-value { font-size: 16px; font-weight: 800; margin-top: 4px; }
                  table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 11px; }
                  th { background: #f1f5f9; text-align: left; padding: 8px 10px; font-size: 10px; text-transform: uppercase; color: #475569; border: 1px solid #cbd5e1; font-weight: 700; }
                  td { padding: 7px 10px; border: 1px solid #e2e8f0; }
                  tr:nth-child(even) { background-color: #f8fafc; }
                  @media print { body { margin: 15px; } }
                </style>
              </head>
              <body>
                <div class="header">
                  <div>
                    <div class="title">📈 RAPPORT DES REVENUS</div>
                  </div>
                  <div class="meta">
                    <div><b>Période d'analyse :</b> ${getPeriodLabel()}</div>
                    <div><b>Émis le :</b> ${exportDate}</div>
                  </div>
                </div>
                <div class="kpi-container">
                  <div class="kpi-card" style="border-left: 4px solid #3b82f6;">
                    <div class="kpi-title">Total Ventes</div>
                    <div class="kpi-value" style="color: #1d4ed8;">${totalVentes.toLocaleString('fr-DZ', { minimumFractionDigits: 2 })} DZD</div>
                  </div>
                  <div class="kpi-card" style="border-left: 4px solid #a855f7;">
                    <div class="kpi-title">Total Omra</div>
                    <div class="kpi-value" style="color: #7e22ce;">${totalOmra.toLocaleString('fr-DZ', { minimumFractionDigits: 2 })} DZD</div>
                  </div>
                  <div class="kpi-card" style="border-left: 4px solid #10b981; background: #ecfdf5;">
                    <div class="kpi-title">Revenu Global</div>
                    <div class="kpi-value" style="color: #047857;">${totalIncomes.toLocaleString('fr-DZ', { minimumFractionDigits: 2 })} DZD</div>
                  </div>
                </div>
                <table>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Type</th>
                      <th>Client / Pèlerin</th>
                      <th>Détail</th>
                      <th style="text-align: right;">Montant Encaissé (DZD)</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${rows || '<tr><td colSpan="5" style="text-align:center;">Aucun revenu</td></tr>'}
                  </tbody>
                </table>
                <script>window.onload = function() { window.print(); };</script>
              </body>
            </html>
          `;
          const printWindow = window.open('', '', 'height=800,width=1000');
          printWindow.document.write(htmlContent);
          printWindow.document.close();
        };

        return (
          <div className="space-y-6">
            <Card className="border-2 border-primary/20 bg-primary/5">
              <CardContent className="p-4 space-y-4">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex items-center gap-4 flex-wrap">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center text-green-700 font-bold shrink-0">
                        <TrendingUp size={20} />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-foreground block mb-1">Source de revenu :</label>
                        <MultiSelectDropdown 
                          options={[
                            { value: 'ventes', label: 'Ventes (Services)' },
                            { value: 'omra', label: 'Omra (Paiements)' }
                          ]}
                          selected={incomesSources}
                          onChange={(val) => { setIncomesSources(val); setCurrentPageIncomes(1); }}
                          placeholder="Sélectionnez..."
                          className="w-full sm:w-48"
                        />
                      </div>
                    </div>

                    {incomesSources.includes('ventes') && (
                      <div className="flex items-center gap-3">
                        <div>
                          <label className="text-xs font-bold text-foreground block mb-1">Service (Ventes) :</label>
                          <MultiSelectDropdown 
                            options={services.map(s => ({ value: s.id, label: s.nom }))}
                            selected={incomesServiceIds}
                            onChange={(val) => { setIncomesServiceIds(val); setCurrentPageIncomes(1); }}
                            placeholder="Tous les services"
                            className="w-full sm:w-48 z-40"
                          />
                        </div>
                      </div>
                    )}

                    {incomesSources.includes('omra') && (
                      <div className="flex items-center gap-3">
                        <div>
                          <label className="text-xs font-bold text-foreground block mb-1">Groupe Omra :</label>
                          <MultiSelectDropdown 
                            options={omraGroupes.map(g => ({ value: g.id, label: g.nom }))}
                            selected={incomesGroupIds}
                            onChange={(val) => { setIncomesGroupIds(val); setCurrentPageIncomes(1); }}
                            placeholder="Tous les groupes"
                            className="w-full sm:w-48 z-30"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-700 font-bold shrink-0">
                      <Calendar size={20} />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-foreground block">Période d'Analyse :</label>
                      <Select
                        value={periodType}
                        onChange={e => { setPeriodType(e.target.value); setCurrentPageIncomes(1); }}
                        className="bg-white font-semibold mt-1 w-full sm:w-56"
                      >
                        <option value="all">📅 Toutes les dates</option>
                        <option value="today">📅 Aujourd'hui</option>
                        <option value="this_month">📅 Ce mois-ci</option>
                        <option value="last_month">📅 Le mois dernier</option>
                        <option value="this_year">📅 Cette année</option>
                        <option value="custom">📅 Personnalisée</option>
                      </Select>
                    </div>
                  </div>
                </div>

                {periodType === 'custom' && (
                  <div className="flex flex-wrap items-center gap-4 pt-3 border-t border-primary/10 bg-white/60 p-3 rounded-lg">
                    <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <Calendar size={14} className="text-primary" /> Plage personnalisée :
                    </span>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-semibold text-muted-foreground">Du:</span>
                      <Input type="date" value={customStartDate} onChange={e => { setCustomStartDate(e.target.value); setCurrentPageIncomes(1); }} className="h-8 text-xs bg-white w-36" />
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-semibold text-muted-foreground">Au:</span>
                      <Input type="date" value={customEndDate} onChange={e => { setCustomEndDate(e.target.value); setCurrentPageIncomes(1); }} className="h-8 text-xs bg-white w-36" />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <Card className="shadow-sm border-l-4 border-l-blue-500">
                <CardHeader className="py-3 px-5">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Total Ventes</span>
                  <div className="text-2xl font-extrabold text-blue-700 mt-1">
                    {totalVentes.toLocaleString('fr-DZ', { minimumFractionDigits: 2 })} <span className="text-xs text-muted-foreground font-normal">DZD</span>
                  </div>
                </CardHeader>
              </Card>

              <Card className="shadow-sm border-l-4 border-l-purple-500">
                <CardHeader className="py-3 px-5">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Total Omra (Paiements)</span>
                  <div className="text-2xl font-extrabold text-purple-700 mt-1">
                    {totalOmra.toLocaleString('fr-DZ', { minimumFractionDigits: 2 })} <span className="text-xs text-muted-foreground font-normal">DZD</span>
                  </div>
                </CardHeader>
              </Card>

              <Card className="shadow-sm border-l-4 border-l-emerald-500">
                <CardHeader className="py-3 px-5">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Revenu Total Global</span>
                  <div className="text-2xl font-extrabold text-emerald-700 mt-1">
                    {totalIncomes.toLocaleString('fr-DZ', { minimumFractionDigits: 2 })} <span className="text-xs text-muted-foreground font-normal">DZD</span>
                  </div>
                </CardHeader>
              </Card>
            </div>

            <Card className="shadow-md overflow-hidden">
              <CardHeader className="bg-muted/30 py-4 border-b flex flex-row items-center justify-between">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <TrendingUp size={18} /> Détails des Revenus (Ventes & Omra)
                </CardTitle>
                <Button onClick={exportIncomesPDF} size="sm" variant="outline" className="h-8 gap-2 border-emerald-200 text-emerald-700 hover:bg-emerald-50">
                  <Printer size={14} /> Exporter PDF
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-muted/50 text-muted-foreground text-[11px] uppercase font-bold border-b">
                      <tr>
                        <th className="px-5 py-3">Date</th>
                        <th className="px-5 py-3">Type</th>
                        <th className="px-5 py-3">Client / Pèlerin</th>
                        <th className="px-5 py-3">Détail (Service / Groupe)</th>
                        <th className="px-5 py-3 text-right">Montant Encaissé (DZD)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {paginatedIncomes.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-5 py-8 text-center text-muted-foreground italic">Aucun revenu trouvé pour cette sélection.</td>
                        </tr>
                      ) : (
                        paginatedIncomes.map((item, i) => {
                          if (item.type === 'vente') {
                            const serv = services.find(s => s.id === item.service_id);
                            return (
                              <tr key={`vente-${item.id}-${i}`} className="hover:bg-muted/20">
                                <td className="px-5 py-3">{item.date_vente ? new Date(item.date_vente).toLocaleDateString('fr-FR') : '-'}</td>
                                <td className="px-5 py-3"><span className="bg-blue-100 text-blue-800 text-[10px] font-extrabold px-2 py-0.5 rounded border border-blue-200">VENTE</span></td>
                                <td className="px-5 py-3 font-medium">{item.client_nom || '-'}</td>
                                <td className="px-5 py-3 text-muted-foreground text-xs">{serv?.nom || '-'}</td>
                                <td className="px-5 py-3 text-right font-bold text-blue-700">
                                  {Number(item.total || 0).toLocaleString('fr-DZ', { minimumFractionDigits: 2 })}
                                </td>
                              </tr>
                            );
                          } else {
                            const grp = omraGroupes.find(g => g.id === item.groupe_id);
                            return (
                              <tr key={`omra-${item.id}-${i}`} className="hover:bg-muted/20">
                                <td className="px-5 py-3">{item.date_paiement ? new Date(item.date_paiement).toLocaleDateString('fr-FR') : '-'}</td>
                                <td className="px-5 py-3"><span className="bg-purple-100 text-purple-800 text-[10px] font-extrabold px-2 py-0.5 rounded border border-purple-200">OMRA</span></td>
                                <td className="px-5 py-3 font-medium">{item.nom_client || '-'}</td>
                                <td className="px-5 py-3 text-muted-foreground text-xs">{grp?.nom || '-'}</td>
                                <td className="px-5 py-3 text-right font-bold text-purple-700">
                                  {Number(item.montant_dzd || 0).toLocaleString('fr-DZ', { minimumFractionDigits: 2 })}
                                </td>
                              </tr>
                            );
                          }
                        })
                      )}
                    </tbody>
                  </table>
                </div>
                {totalPages > 1 && (
                  <div className="p-4 border-t flex justify-center gap-2">
                    {Array.from({ length: totalPages }).map((_, i) => (
                      <Button key={i} variant={currentPageIncomes === i + 1 ? 'default' : 'outline'} size="sm" onClick={() => setCurrentPageIncomes(i + 1)}>
                        {i + 1}
                      </Button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        );
      })()}

      {/* --- VOLET RAPPORT FOURNISSEURS --- */}

      {activeTab === 'fournisseurs' && (
        <div className="space-y-6">
          {/* BARRE DE FILTRES : FOURNISSEUR & PÉRIODE */}
          <Card className="border-2 border-primary/20 bg-primary/5">
            <CardContent className="p-4 space-y-4">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                {/* 1. Sélection Fournisseur */}
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold shrink-0">
                    <Building2 size={20} />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-foreground block">Fournisseur à Auditer :</label>
                    <Select
                      value={selectedFournisseurId}
                      onChange={e => setSelectedFournisseurId(e.target.value)}
                      className="bg-white font-semibold mt-1 w-full sm:w-64"
                    >
                      <option value="">-- Choisir un fournisseur --</option>
                      {fournisseurs.map(f => (
                        <option key={f.id} value={f.id}>{f.nom}</option>
                      ))}
                    </Select>
                  </div>
                </div>

                {/* 2. Sélecteur de Période */}
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-700 font-bold shrink-0">
                    <Calendar size={20} />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-foreground block">Période d'Analyse :</label>
                    <Select
                      value={periodType}
                      onChange={e => setPeriodType(e.target.value)}
                      className="bg-white font-semibold mt-1 w-full sm:w-64"
                    >
                      <option value="all">📅 Toutes les dates (Historique complet)</option>
                      <option value="today">📅 Aujourd'hui</option>
                      <option value="this_month">📅 Ce mois-ci</option>
                      <option value="last_month">📅 Le mois dernier</option>
                      <option value="this_year">📅 Cette année</option>
                      <option value="custom">📅 Période personnalisée (Du / Au)</option>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Si Période Personnalisée sélectionnée */}
              {periodType === 'custom' && (
                <div className="flex flex-wrap items-center gap-4 pt-3 border-t border-primary/10 bg-white/60 p-3 rounded-lg">
                  <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Calendar size={14} className="text-primary" /> Plage de dates personnalisée :
                  </span>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-semibold text-muted-foreground">Du:</span>
                    <Input
                      type="date"
                      value={customStartDate}
                      onChange={e => setCustomStartDate(e.target.value)}
                      className="h-8 text-xs bg-white w-36 font-medium border-slate-300"
                    />
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-semibold text-muted-foreground">Au:</span>
                    <Input
                      type="date"
                      value={customEndDate}
                      onChange={e => setCustomEndDate(e.target.value)}
                      className="h-8 text-xs bg-white w-36 font-medium border-slate-300"
                    />
                  </div>
                  {(customStartDate || customEndDate) && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => { setCustomStartDate(''); setCustomEndDate(''); }}
                      className="h-8 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      Effacer les dates
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {loading ? (
            <div className="flex justify-center items-center h-48">
              <Loader2 className="animate-spin text-primary" size={32} />
            </div>
          ) : !selectedFournisseurId ? (
            <Card className="p-12 text-center">
              <AlertCircle size={40} className="mx-auto text-muted-foreground/30 mb-3" />
              <p className="font-semibold text-muted-foreground">Veuillez choisir un fournisseur dans le menu ci-dessus.</p>
            </Card>
          ) : (
            <>
              {/* CARTES KPI SYNTHÈSE */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {/* Dû Ventes */}
                <Card className="shadow-sm border-l-4 border-l-blue-500">
                  <CardHeader className="py-3 px-5 flex flex-row items-center justify-between space-y-0">
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Tarifs Dûs (Ventes)</span>
                    <DollarSign size={18} className="text-blue-500" />
                  </CardHeader>
                  <CardContent className="px-5 pb-4">
                    <div className="text-2xl font-extrabold text-slate-900">
                      {reportData.totalVentesTarif.toLocaleString('fr-DZ', { minimumFractionDigits: 2 })} <span className="text-xs font-normal text-muted-foreground">DZD</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      {reportData.supplierVentes.length} vente(s) enregistrée(s)
                    </p>
                  </CardContent>
                </Card>

                {/* Payé Outcomes */}
                <Card className="shadow-sm border-l-4 border-l-purple-500">
                  <CardHeader className="py-3 px-5 flex flex-row items-center justify-between space-y-0">
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Total Payé (Dépenses)</span>
                    <TrendingDown size={18} className="text-purple-500" />
                  </CardHeader>
                  <CardContent className="px-5 pb-4">
                    <div className="text-2xl font-extrabold text-slate-900">
                      {reportData.totalDepensesPaid.toLocaleString('fr-DZ', { minimumFractionDigits: 2 })} <span className="text-xs font-normal text-muted-foreground">DZD</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      {reportData.supplierOutcomes.length} paiement(s) effectué(s)
                    </p>
                  </CardContent>
                </Card>

                {/* Écart / Solde */}
                <Card className={`shadow-sm border-l-4 ${reportData.ecartGlobal > 1 ? 'border-l-emerald-500 bg-emerald-50/20' : reportData.ecartGlobal < -1 ? 'border-l-amber-500 bg-amber-50/20' : 'border-l-gray-400'}`}>
                  <CardHeader className="py-3 px-5 flex flex-row items-center justify-between space-y-0">
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Solde de Situation</span>
                    <ArrowRightLeft size={18} className={reportData.ecartGlobal > 1 ? 'text-emerald-600' : reportData.ecartGlobal < -1 ? 'text-amber-600' : 'text-gray-500'} />
                  </CardHeader>
                  <CardContent className="px-5 pb-4">
                    <div className={`text-2xl font-extrabold ${reportData.ecartGlobal > 1 ? 'text-emerald-700' : reportData.ecartGlobal < -1 ? 'text-amber-700' : 'text-slate-800'}`}>
                      {reportData.ecartGlobal > 0 ? '+' : ''}{reportData.ecartGlobal.toLocaleString('fr-DZ', { minimumFractionDigits: 2 })} <span className="text-xs font-normal text-muted-foreground">DZD</span>
                    </div>
                    <p className="text-[11px] font-semibold mt-1">
                      {reportData.ecartGlobal > 1 ? (
                        <span className="text-emerald-700 font-bold">🟢 Surpayé / Avance crédite</span>
                      ) : reportData.ecartGlobal < -1 ? (
                        <span className="text-amber-700 font-bold">🟠 Reste à régler au fournisseur</span>
                      ) : (
                        <span className="text-gray-600">⚪ Situation équilibrée</span>
                      )}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* TABLEAU COMPARATIF REGROUPÉ PAR SOUS-ENVELOPPE */}
              <Card className="shadow-md overflow-hidden">
                <CardHeader className="bg-muted/30 py-4 border-b">
                  <CardTitle className="text-base font-bold flex items-center justify-between">
                    <span>📊 Rapport d'Audit par Sous-Enveloppe (Ventes vs Outcomes)</span>
                    <span className="text-xs text-muted-foreground font-normal">Fournisseur : {selectedFournisseur?.nom}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-muted/50 text-muted-foreground text-[11px] uppercase tracking-wider font-bold border-b">
                        <tr>
                          <th className="px-5 py-3.5">Sous-Enveloppe & Enveloppe</th>
                          <th className="px-5 py-3.5">Services Rattachés</th>
                          <th className="px-5 py-3.5 text-center">Nbr Ventes</th>
                          <th className="px-5 py-3.5 text-right">Tarif Dû (Ventes)</th>
                          <th className="px-5 py-3.5 text-right">Dépensé / Payé (Outcomes)</th>
                          <th className="px-5 py-3.5 text-right">Écart (Différence)</th>
                          <th className="px-5 py-3.5 text-center">Statut audit</th>
                          <th className="px-5 py-3.5 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {reportData.subEnvBreakdown.length === 0 ? (
                          <tr>
                            <td colSpan={8} className="px-5 py-10 text-center text-muted-foreground italic">
                              Aucune sous-enveloppe ni dépense trouvée pour ce fournisseur.
                            </td>
                          </tr>
                        ) : (
                          reportData.subEnvBreakdown.map((se) => (
                            <tr key={se.id} className="hover:bg-muted/20 transition-colors">
                              <td className="px-5 py-4">
                                <div className="font-bold text-foreground">📂 {se.nom}</div>
                                <div className="text-[11px] text-muted-foreground">Enveloppe: {se.enveloppeNom}</div>
                              </td>
                              <td className="px-5 py-4">
                                <div className="flex flex-wrap gap-1">
                                  {se.linkedServiceNames.length === 0 ? (
                                    <span className="text-xs text-muted-foreground italic">Aucun service rattaché</span>
                                  ) : (
                                    se.linkedServiceNames.map(sName => (
                                      <span key={sName} className="bg-blue-50 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded border border-blue-200">
                                        ⚡ {sName}
                                      </span>
                                    ))
                                  )}
                                </div>
                              </td>
                              <td className="px-5 py-4 text-center font-medium text-muted-foreground">
                                {se.ventesCount}
                              </td>
                              <td className="px-5 py-4 text-right font-semibold text-blue-700">
                                {se.ventesTarifTotal.toLocaleString('fr-DZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} DZD
                              </td>
                              <td className="px-5 py-4 text-right font-semibold text-purple-700">
                                {se.outcomesTotal.toLocaleString('fr-DZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} DZD
                              </td>
                              <td className={`px-5 py-4 text-right font-extrabold ${se.ecart > 1 ? 'text-emerald-600' : se.ecart < -1 ? 'text-amber-600' : 'text-gray-600'}`}>
                                {se.ecart > 0 ? '+' : ''}{se.ecart.toLocaleString('fr-DZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} DZD
                              </td>
                              <td className="px-5 py-4 text-center">
                                {se.status === 'surpaye' && (
                                  <span className="bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-2.5 py-1 rounded-full border border-emerald-200">
                                    Surpayé / Avance
                                  </span>
                                )}
                                {se.status === 'dette' && (
                                  <span className="bg-amber-100 text-amber-800 text-[10px] font-extrabold px-2.5 py-1 rounded-full border border-amber-200">
                                    Reste à régler
                                  </span>
                                )}
                                {se.status === 'equilibre' && (
                                  <span className="bg-gray-100 text-gray-700 text-[10px] font-extrabold px-2.5 py-1 rounded-full border border-gray-200">
                                    Équilibré
                                  </span>
                                )}
                              </td>
                              <td className="px-5 py-4 text-center">
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  onClick={() => openSubEnvDetail(se)}
                                  className="gap-1.5 text-xs font-semibold text-primary border-primary/30 hover:bg-primary/10"
                                >
                                  <Eye size={14} /> Voir les détails
                                </Button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      )}

      {/* ── MODAL DÉTAILS SOUS-ENVELOPPE ── */}
      <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden" onClose={() => setIsDetailModalOpen(false)}>
          <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white px-6 py-5 flex items-center justify-between border-b">
            <DialogHeader className="space-y-1 text-white">
              <DialogTitle className="text-xl font-extrabold flex items-center gap-2 text-white">
                <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-white/10 text-white">
                  <FileText size={18} />
                </div>
                Détails Audit : {selectedSubEnvDetail?.nom}
              </DialogTitle>
              <DialogDescription className="text-blue-200 text-xs">
                Enveloppe parente : <b className="text-white">{selectedSubEnvDetail?.enveloppeNom}</b> | Fournisseur : <b className="text-white">{selectedFournisseur?.nom}</b>
              </DialogDescription>
            </DialogHeader>

            <Button 
              onClick={exportPDF} 
              className="bg-white text-blue-950 hover:bg-blue-50 font-bold shadow-md gap-2 text-xs h-9 px-4 shrink-0"
            >
              <Printer size={15} /> Exporter PDF
            </Button>
          </div>

          <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
            {/* KPI Cards inside Modal */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3.5">
                <span className="text-xs font-bold text-blue-900 uppercase block">Somme Dûe (Ventes)</span>
                <span className="text-lg font-extrabold text-blue-700">
                  {selectedSubEnvDetail?.ventesTarifTotal?.toLocaleString('fr-DZ', { minimumFractionDigits: 2 })} DZD
                </span>
                <span className="text-[11px] text-blue-600 block mt-0.5">{selectedSubEnvDetail?.matchingVentes?.length || 0} vente(s)</span>
              </div>
              <div className="bg-purple-50 border border-purple-200 rounded-xl p-3.5">
                <span className="text-xs font-bold text-purple-900 uppercase block">Somme Payée (Outcomes)</span>
                <span className="text-lg font-extrabold text-purple-700">
                  {selectedSubEnvDetail?.outcomesTotal?.toLocaleString('fr-DZ', { minimumFractionDigits: 2 })} DZD
                </span>
                <span className="text-[11px] text-purple-600 block mt-0.5">{selectedSubEnvDetail?.matchingOutcomes?.length || 0} dépense(s)</span>
              </div>
              <div className={`border rounded-xl p-3.5 ${selectedSubEnvDetail?.ecart > 1 ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : selectedSubEnvDetail?.ecart < -1 ? 'bg-amber-50 border-amber-200 text-amber-900' : 'bg-gray-50 border-gray-200'}`}>
                <span className="text-xs font-bold uppercase block">Solde / Écart</span>
                <span className="text-lg font-extrabold">
                  {selectedSubEnvDetail?.ecart > 0 ? '+' : ''}{selectedSubEnvDetail?.ecart?.toLocaleString('fr-DZ', { minimumFractionDigits: 2 })} DZD
                </span>
                <span className="text-[11px] font-bold block mt-0.5">
                  {selectedSubEnvDetail?.ecart > 1 ? '🟢 Surpayé / Avance' : selectedSubEnvDetail?.ecart < -1 ? '🟠 Reste à régler' : '⚪ Équilibré'}
                </span>
              </div>
            </div>

            {/* BANNIÈRE SI VENTES EXCLUES DE L'AUDIT */}
            {excludedAuditVenteIds.length > 0 && (
              <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-900 shadow-sm">
                <div className="flex items-center gap-2">
                  <AlertCircle size={16} className="text-amber-600 shrink-0" />
                  <span>
                    <b>{excludedAuditVenteIds.length} dossier(s) de vente</b> exclu(s) manuellement de cet audit (ajustement visuel uniquement — la BDD est intacte).
                  </span>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs border-amber-300 hover:bg-amber-100 text-amber-900 gap-1 shrink-0 ml-2 font-medium"
                  onClick={() => setExcludedAuditVenteIds([])}
                >
                  <RotateCcw size={12} /> Réinitialiser l'audit
                </Button>
              </div>
            )}

            {/* SECTION 1 : VENTES CONCERNÉES */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-slate-800 flex items-center justify-between border-b pb-2">
                <span>🛒 Dossiers de Vente Concernés ({selectedSubEnvDetail?.matchingVentes?.length || 0})</span>
                <span className="text-xs text-blue-600 font-bold">
                  Total Dû : {selectedSubEnvDetail?.ventesTarifTotal?.toLocaleString('fr-DZ', { minimumFractionDigits: 2 })} DZD
                </span>
              </h3>
              {(!selectedSubEnvDetail?.matchingVentes || selectedSubEnvDetail.matchingVentes.length === 0) ? (
                <p className="text-xs text-muted-foreground italic py-3 text-center bg-muted/20 rounded">
                  Aucune vente enregistrée pour les services rattachés à cette sous-enveloppe.
                </p>
              ) : (
                <div className="overflow-x-auto border rounded-lg">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-muted/50 text-muted-foreground font-bold uppercase">
                      <tr>
                        <th className="px-3.5 py-2.5">Date</th>
                        <th className="px-3.5 py-2.5">Client</th>
                        <th className="px-3.5 py-2.5">Service</th>
                        <th className="px-3.5 py-2.5">Articles & Prestations Concernés</th>
                        <th className="px-3.5 py-2.5 text-right">Tarif Dû (DZD)</th>
                        <th className="px-3.5 py-2.5 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {selectedSubEnvDetail.matchingVentes.map((v) => {
                        const sObj = services.find(s => s.id === v.service_id);
                        const cost = v.subEnvCost !== undefined ? v.subEnvCost : (v.supplierTarifBase || (Number(v.tarif_base) || (Number(v.total) - Number(v.commission)) || 0));
                        const hasSpecificArticles = v.subEnvMatchingArticles && v.subEnvMatchingArticles.length > 0;
                        
                        return (
                          <tr key={v.id} className="hover:bg-muted/20">
                            <td className="px-3.5 py-2.5 text-muted-foreground whitespace-nowrap">
                              {v.date_vente ? new Date(v.date_vente).toLocaleDateString('fr-FR') : '—'}
                            </td>
                            <td className="px-3.5 py-2.5 font-bold text-foreground">{v.client_nom}</td>
                            <td className="px-3.5 py-2.5 font-medium text-blue-700">{sObj?.nom || '—'}</td>
                            <td className="px-3.5 py-2.5">
                              {v.etat === 'Remboursé' && (
                                <div className="mb-1">
                                  <span className="text-[10px] font-black bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 px-1.5 py-0.5 rounded border border-rose-200 dark:border-rose-800 inline-block">
                                    ↩️ Vente Remboursée (Pénalité Fournisseur)
                                  </span>
                                </div>
                              )}
                              {hasSpecificArticles ? (
                                <div className="space-y-1">
                                  {v.subEnvMatchingArticles.map((art, idx) => (
                                    <div key={idx} className="flex items-center gap-1.5 font-semibold text-slate-800">
                                      <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-black border border-primary/20">
                                        {art.categorie || 'Article'}
                                      </span>
                                      <span>{art.designation || 'Prestation'}</span>
                                      <span className="text-muted-foreground text-[10px]">
                                        {v.etat === 'Remboursé' ? `(Pén. ${cost.toLocaleString('fr-DZ')} DZD)` : `(${(parseFloat(art.prix_achat) || (parseFloat(art.prix_vente) - parseFloat(art.commission)) || 0).toLocaleString('fr-DZ')} DZD)`}
                                      </span>
                                    </div>
                                  ))}
                                  {v.isPartial && (
                                    <span className="text-[10px] text-amber-700 font-bold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 inline-block mt-0.5">
                                      ⚡ Vente Multi-Fournisseurs ({v.subEnvMatchingArticles.length}/{v.totalArticlesCount} article(s) comptabilisé(s))
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-muted-foreground truncate max-w-[200px] block" title={v.details}>
                                  {v.details || '—'}
                                </span>
                              )}
                            </td>
                            <td className="px-3.5 py-2.5 text-right font-extrabold text-blue-700 whitespace-nowrap">
                              {cost.toLocaleString('fr-DZ', { minimumFractionDigits: 2 })} DZD
                            </td>
                            <td className="px-3.5 py-2.5 text-center whitespace-nowrap">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-md"
                                title="Exclure ce dossier de l'audit (Conservé dans la BDD)"
                                onClick={() => handleExcludeVenteFromAudit(v.id)}
                              >
                                <Trash2 size={14} />
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* SECTION 2 : DÉPENSES (OUTCOMES) EFFECTUÉES */}
            <div className="space-y-3 pt-2">
              <h3 className="text-sm font-bold text-slate-800 flex items-center justify-between border-b pb-2">
                <span>💳 Décaissements / Dépenses Effectuées ({selectedSubEnvDetail?.matchingOutcomes?.length || 0})</span>
                <span className="text-xs text-purple-600 font-bold">
                  Total Payé : {selectedSubEnvDetail?.outcomesTotal?.toLocaleString('fr-DZ', { minimumFractionDigits: 2 })} DZD
                </span>
              </h3>
              {(!selectedSubEnvDetail?.matchingOutcomes || selectedSubEnvDetail.matchingOutcomes.length === 0) ? (
                <p className="text-xs text-muted-foreground italic py-3 text-center bg-muted/20 rounded">
                  Aucune dépense enregistrée spécifiquement sous cette sous-enveloppe.
                </p>
              ) : (
                <div className="overflow-x-auto border rounded-lg">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-muted/50 text-muted-foreground font-bold uppercase">
                      <tr>
                        <th className="px-3.5 py-2.5">Date Paiement</th>
                        <th className="px-3.5 py-2.5">Description / Désignation</th>
                        <th className="px-3.5 py-2.5">Référence</th>
                        <th className="px-3.5 py-2.5 text-right">Montant Origine</th>
                        <th className="px-3.5 py-2.5 text-right">Total DZD</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {selectedSubEnvDetail.matchingOutcomes.map((o) => (
                        <tr key={o.id} className="hover:bg-muted/20">
                          <td className="px-3.5 py-2.5 text-muted-foreground whitespace-nowrap">
                            {new Date(o.date_paiement).toLocaleDateString('fr-FR')}
                          </td>
                          <td className="px-3.5 py-2.5 font-semibold text-foreground max-w-[200px] truncate" title={o.description}>
                            {o.description || 'Dépense Fournisseur'}
                          </td>
                          <td className="px-3.5 py-2.5 text-muted-foreground">{o.reference_paiement || '—'}</td>
                          <td className="px-3.5 py-2.5 text-right">
                            {Number(o.montant).toLocaleString('fr-DZ')} <span className="text-[10px] text-muted-foreground">{o.devise}</span>
                          </td>
                          <td className="px-3.5 py-2.5 text-right font-extrabold text-purple-700">
                            {Number(o.montant_dzd).toLocaleString('fr-DZ', { minimumFractionDigits: 2 })} DZD
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default Rapports;
