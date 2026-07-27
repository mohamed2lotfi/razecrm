import React, { useState, useEffect } from 'react';
import { 
  FileBarChart, Building2, TrendingDown, DollarSign, 
  ArrowRightLeft, AlertCircle, CheckCircle2, Info, Loader2, RefreshCw, Eye, FileText, Printer, Download, Calendar 
} from 'lucide-react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { supabase } from '@/lib/supabase';

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

  // Sub-Envelope Detail Modal State
  const [selectedSubEnvDetail, setSelectedSubEnvDetail] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Raw fetched data
  const [ventes, setVentes] = useState([]);
  const [enveloppes, setEnveloppes] = useState([]);
  const [sousEnveloppes, setSousEnveloppes] = useState([]);
  const [outcomes, setOutcomes] = useState([]);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    const [fRes, sRes, vRes, eRes, subRes, oRes] = await Promise.all([
      supabase.from('fournisseurs').select('*').order('nom'),
      supabase.from('services').select('*').order('nom'),
      supabase.from('ventes').select('*'),
      supabase.from('outcomes_enveloppes').select('*'),
      supabase.from('outcomes_sous_enveloppes').select('*'),
      supabase.from('outcomes').select('*')
    ]);

    if (fRes.data) {
      setFournisseurs(fRes.data);
      if (fRes.data.length > 0 && !selectedFournisseurId) {
        setSelectedFournisseurId(fRes.data[0].id);
      }
    }
    if (sRes.data) setServices(sRes.data);
    if (vRes.data) setVentes(vRes.data);
    if (eRes.data) setEnveloppes(eRes.data);
    if (subRes.data) setSousEnveloppes(subRes.data);
    if (oRes.data) setOutcomes(oRes.data);

    setLoading(false);
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
      if (customStartDate && new Date(dateStr) < new Date(customStartDate)) return false;
      if (customEndDate) {
        const end = new Date(customEndDate);
        end.setHours(23, 59, 59, 999);
        if (new Date(dateStr) > end) return false;
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

    // 1. Filter sales for selected supplier & period
    const supplierVentes = ventes.filter(v => 
      v.fournisseur_id === selectedFournisseurId && 
      isDateInPeriod(v.date_vente || v.created_at)
    );
    const totalVentesTarif = supplierVentes.reduce((sum, v) => {
      // Tarif fournisseur is base rate or (total - commission)
      const cost = Number(v.tarif_base) || (Number(v.total) - Number(v.commission)) || 0;
      return sum + cost;
    }, 0);

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
      if (v.service_id && serviceMap[v.service_id]) {
        serviceMap[v.service_id].ventesCount += 1;
        const cost = Number(v.tarif_base) || (Number(v.total) - Number(v.commission)) || 0;
        serviceMap[v.service_id].ventesTarifTotal += cost;
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
      const matchingVentes = supplierVentes.filter(v => 
        linkedServiceIds.length > 0 ? linkedServiceIds.includes(v.service_id) : false
      );

      const ventesTarifTotal = matchingVentes.reduce((sum, v) => {
        const cost = Number(v.tarif_base) || (Number(v.total) - Number(v.commission)) || 0;
        return sum + cost;
      }, 0);

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
    const unassignedVentes = supplierVentes.filter(v => !v.service_id || !allLinkedServiceIds.has(v.service_id));
    const unassignedVentesTarifTotal = unassignedVentes.reduce((sum, v) => sum + (Number(v.tarif_base) || (Number(v.total) - Number(v.commission)) || 0), 0);

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

  const openSubEnvDetail = (se) => {
    setSelectedSubEnvDetail(se);
    setIsDetailModalOpen(true);
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
      const cost = Number(v.tarif_base) || (Number(v.total) - Number(v.commission)) || 0;
      return `
        <tr>
          <td>${v.date_vente ? new Date(v.date_vente).toLocaleDateString('fr-FR') : '—'}</td>
          <td><b>${v.client_nom || '—'}</b></td>
          <td>${sObj?.nom || '—'}</td>
          <td>${v.details || '—'}</td>
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
      </div>

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
                        <th className="px-3.5 py-2.5">Détails</th>
                        <th className="px-3.5 py-2.5 text-right">Tarif Dû (DZD)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {selectedSubEnvDetail.matchingVentes.map((v) => {
                        const sObj = services.find(s => s.id === v.service_id);
                        const cost = Number(v.tarif_base) || (Number(v.total) - Number(v.commission)) || 0;
                        return (
                          <tr key={v.id} className="hover:bg-muted/20">
                            <td className="px-3.5 py-2.5 text-muted-foreground whitespace-nowrap">
                              {v.date_vente ? new Date(v.date_vente).toLocaleDateString('fr-FR') : '—'}
                            </td>
                            <td className="px-3.5 py-2.5 font-bold text-foreground">{v.client_nom}</td>
                            <td className="px-3.5 py-2.5 font-medium text-blue-700">{sObj?.nom || '—'}</td>
                            <td className="px-3.5 py-2.5 text-muted-foreground truncate max-w-[180px]" title={v.details}>{v.details || '—'}</td>
                            <td className="px-3.5 py-2.5 text-right font-extrabold text-blue-700">
                              {cost.toLocaleString('fr-DZ', { minimumFractionDigits: 2 })} DZD
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
