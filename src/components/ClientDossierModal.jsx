import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  X, FolderOpen, User, Phone, Mail, MapPin, Calendar, 
  CreditCard, DollarSign, Clock, FileText, CheckCircle2, 
  AlertCircle, ChevronRight, MessageSquare, Plus, ExternalLink,
  Users, Building2, Plane, Sparkles, Loader2, ArrowUpRight, Coins,
  Printer, Send, MessageCircle, ShieldCheck, Award, History,
  TrendingUp, Check, RefreshCw, Layers, Baby, Utensils
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import ProspectModal from '@/components/ProspectModal';
import VentePaiementsModal from '@/components/VentePaiementsModal';
import VenteForm from '@/components/VenteForm';
import CountryFlag from '@/components/CountryFlag';

const fmtDZD = (n) => Number(Math.round(n || 0)).toLocaleString('fr-DZ', {
  maximumFractionDigits: 0
});

const fmtCompactDZD = (n) => {
  const num = Number(n || 0);
  if (num >= 1000000) return (num / 1000000).toFixed(2) + ' M DZD';
  if (num >= 1000) return Math.round(num).toLocaleString('fr-FR') + ' DZD';
  return num.toFixed(0) + ' DZD';
};

const STATUS_PILLS = {
  nouvelle: { label: 'Demande', bg: 'bg-blue-50 text-blue-700 border-blue-200' },
  en_cours: { label: 'En cours', bg: 'bg-amber-50 text-amber-700 border-amber-200' },
  envoye: { label: 'Devis envoyé', bg: 'bg-purple-50 text-purple-700 border-purple-200' },
  converti: { label: 'Converti', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  ferme: { label: 'Fermé', bg: 'bg-slate-100 text-slate-600 border-slate-200' }
};

export default function ClientDossierModal({ isOpen, onClose, client, onOpenDevis, onOpenOmraGroupe }) {
  const navigate = useNavigate();
  const { user, profile, isAdmin } = useAuth();

  const [activeTab, setActiveTab] = useState('vue_360'); // 'vue_360' | 'omra' | 'ventes' | 'devis' | 'remarques' | 'releve'
  const [loading, setLoading] = useState(true);

  // Raw data collections
  const [ventes, setVentes] = useState([]);
  const [omraInscriptions, setOmraInscriptions] = useState([]);
  const [devisList, setDevisList] = useState([]);
  const [remarquesList, setRemarquesList] = useState([]);
  const [pelerinsFamille, setPelerinsFamille] = useState([]);
  const [agencySettings, setAgencySettings] = useState(null);

  // Sub-modals
  const [selectedDevisForModal, setSelectedDevisForModal] = useState(null);
  const [selectedVenteForPayment, setSelectedVenteForPayment] = useState(null);
  const [isNewVenteOpen, setIsNewVenteOpen] = useState(false);
  const [isNewDevisOpen, setIsNewDevisOpen] = useState(false);

  // New Remark form state
  const [newRemarkText, setNewRemarkText] = useState('');
  const [newRemarkCategory, setNewRemarkCategory] = useState('Général'); // 'Général' | 'Préférence' | 'Finance' | 'Important'
  const [savingRemark, setSavingRemark] = useState(false);

  const fetchClientDossier = useCallback(async () => {
    if (!client?.id) return;
    setLoading(true);

    try {
      // 1. Fetch agency settings
      supabase.from('agency_settings').select('*').single().then(({ data }) => {
        if (data) setAgencySettings(data);
      });

      // 2. Fetch Ventes with articles and payments
      let { data: vData, error: vErr } = await supabase
        .from('ventes')
        .select('*, services(nom), vente_articles(*, services(nom), fournisseurs(nom))')
        .eq('client_id', client.id)
        .order('date_vente', { ascending: false });

      if (vErr) {
        const fallbackRes = await supabase
          .from('ventes')
          .select('*, services(nom)')
          .eq('client_id', client.id)
          .order('date_vente', { ascending: false });
        vData = fallbackRes.data || [];
      }

      const clientVentesRaw = vData || [];
      const vIds = clientVentesRaw.map(v => v.id);
      let vPayMap = {};

      if (vIds.length > 0) {
        const { data: vPays } = await supabase
          .from('vente_paiements')
          .select('*')
          .in('vente_id', vIds);

        (vPays || []).forEach(p => {
          vPayMap[p.vente_id] = (vPayMap[p.vente_id] || 0) + (Number(p.montant_dzd) || 0);
        });
      }

      const enrichedVentes = clientVentesRaw.map(v => {
        const total = Number(v.total) || 0;
        const paye = vPayMap[v.id] || 0;
        const reste = Math.max(0, total - paye);
        const arts = (v.vente_articles && Array.isArray(v.vente_articles))
          ? v.vente_articles.map(a => ({
              ...a,
              passagers: (a.details_specifiques && Array.isArray(a.details_specifiques.passagers))
                ? a.details_specifiques.passagers
                : (a.passagers || [])
            }))
          : [];

        return {
          ...v,
          articles: arts,
          total,
          paye,
          reste
        };
      });

      // 3. Fetch Omra Enregistrements & group payments
      const { data: omraData } = await supabase
        .from('omra_enregistrements')
        .select('*, omra_groupes(id, nom, date_depart, date_retour, compagnie)')
        .eq('client_id', client.id)
        .order('date_creation', { ascending: false });

      const clientOmraRaw = omraData || [];
      const enrIds = clientOmraRaw.map(o => o.id);
      let omraPayMap = {};

      if (enrIds.length > 0) {
        const { data: oPays } = await supabase
          .from('omra_paiements')
          .select('*')
          .in('enregistrement_id', enrIds);

        (oPays || []).forEach(p => {
          omraPayMap[p.enregistrement_id] = (omraPayMap[p.enregistrement_id] || 0) + (Number(p.montant_dzd) || 0);
        });
      }

      const enrichedOmra = clientOmraRaw.map(o => {
        const totalNet = Number(o.total_net !== null && o.total_net !== undefined ? o.total_net : (o.total_brut || 0));
        const paye = omraPayMap[o.id] || 0;
        const reste = Math.max(0, totalNet - paye);
        return {
          ...o,
          totalNet,
          paye,
          reste
        };
      });

      // 4. Fetch Devis / Pipeline
      const { data: devisData } = await supabase
        .from('pipeline')
        .select('*, services(nom)')
        .or(`client_id.eq.${client.id},nom_prospect.ilike.%${client.nom}%`)
        .order('date_creation', { ascending: false });

      const clientDevis = (devisData || []).map(d => {
        let meta = {
          nom_devis: d.nom_prospect || 'Devis sans titre',
          destination: '',
          destination_emoji: '📍',
          priorite: 'Moyenne',
          agent_nom: ''
        };
        try {
          if (d.details_devis && d.details_devis.trim().startsWith('{')) {
            const p = JSON.parse(d.details_devis);
            if (p.nom_devis) meta.nom_devis = p.nom_devis;
            if (p.destination) meta.destination = p.destination;
            if (p.destination_emoji) meta.destination_emoji = p.destination_emoji;
            if (p.priorite) meta.priorite = p.priorite;
            if (p.agent_nom) meta.agent_nom = p.agent_nom;
          }
        } catch (e) {}
        return { ...d, meta };
      });

      // 5. Fetch Notes & Remarques
      const { data: remData } = await supabase
        .from('client_remarques')
        .select('*')
        .eq('client_id', client.id)
        .order('created_at', { ascending: false });

      // 6. Extract all distinct family members / passengers
      const familyMap = new Map();
      enrichedOmra.forEach(enr => {
        (enr.pelerins || []).forEach(p => {
          if (p.nom && p.nom.trim()) {
            const key = p.nom.trim().toLowerCase();
            if (!familyMap.has(key)) {
              familyMap.set(key, {
                nom: p.nom.trim(),
                sexe: p.sexe || 'H',
                telephone: p.telephone || '',
                passport: p.passport || '',
                type: p.chd ? 'Enfant (CHD)' : (p.guide ? 'Guide' : 'Adulte'),
                lastTrip: enr.omra_groupes?.nom || 'Omra',
                lastDate: enr.omra_groupes?.date_depart || enr.date_creation
              });
            }
          }
        });
        (enr.enfants_sans_lit || []).forEach(enf => {
          if (enf.nom && enf.nom.trim()) {
            const key = enf.nom.trim().toLowerCase();
            if (!familyMap.has(key)) {
              familyMap.set(key, {
                nom: enf.nom.trim(),
                sexe: 'H',
                telephone: '',
                passport: '',
                type: 'Bébé (Sans lit)',
                lastTrip: enr.omra_groupes?.nom || 'Omra',
                lastDate: enr.omra_groupes?.date_depart || enr.date_creation
              });
            }
          }
        });
      });

      enrichedVentes.forEach(v => {
        (v.articles || []).forEach(a => {
          (a.passagers || []).forEach(p => {
            const pNom = typeof p === 'string' ? p : p.nom;
            if (pNom && pNom.trim()) {
              const key = pNom.trim().toLowerCase();
              if (!familyMap.has(key)) {
                familyMap.set(key, {
                  nom: pNom.trim(),
                  sexe: p.sexe || 'H',
                  telephone: p.telephone || '',
                  passport: p.passport || '',
                  type: 'Passager Vol / Séjour',
                  lastTrip: v.details || 'Voyage',
                  lastDate: v.date_vente || v.created_at
                });
              }
            }
          });
        });
      });

      setVentes(enrichedVentes);
      setOmraInscriptions(enrichedOmra);
      setDevisList(clientDevis);
      setRemarquesList(remData || []);
      setPelerinsFamille(Array.from(familyMap.values()));

    } catch (err) {
      console.error("Error loading client 360 dossier:", err);
    } finally {
      setLoading(false);
    }
  }, [client?.id]);

  useEffect(() => {
    if (client?.id && isOpen) {
      fetchClientDossier();
    }
  }, [client?.id, isOpen, fetchClientDossier]);

  // KPIs Calculations
  const stats = useMemo(() => {
    const totalCaVentes = ventes.reduce((sum, v) => sum + (v.total || 0), 0);
    const totalCaOmra = omraInscriptions.reduce((sum, o) => sum + (o.totalNet || 0), 0);
    const caGlobal = totalCaVentes + totalCaOmra;

    const totalCreanceVentes = ventes.reduce((sum, v) => sum + (v.reste || 0), 0);
    const totalCreanceOmra = omraInscriptions.reduce((sum, o) => sum + (o.reste || 0), 0);
    const totalCreances = totalCreanceVentes + totalCreanceOmra;

    let totalPaxOmra = 0;
    omraInscriptions.forEach(o => {
      totalPaxOmra += (o.pelerins?.length || 0) + (o.enfants_sans_lit?.length || 0);
    });

    const totalDevisCount = devisList.length;
    const convertedDevisCount = devisList.filter(d => d.status === 'converti').length;
    const conversionRate = totalDevisCount > 0 ? Math.round((convertedDevisCount / totalDevisCount) * 100) : 0;

    // Loyalty Tier
    let loyaltyTier = 'Nouveau Client';
    let loyaltyBadge = 'bg-slate-100 text-slate-700 border-slate-200';

    if (caGlobal >= 1500000 || (ventes.length + omraInscriptions.length) >= 4) {
      loyaltyTier = 'VIP Platine 👑';
      loyaltyBadge = 'bg-amber-100 text-amber-800 border-amber-300 font-black shadow-xs';
    } else if (caGlobal >= 500000 || (ventes.length + omraInscriptions.length) >= 2) {
      loyaltyTier = 'Client Fidèle ⭐';
      loyaltyBadge = 'bg-emerald-100 text-emerald-800 border-emerald-300 font-bold';
    } else if (ventes.length > 0 || omraInscriptions.length > 0) {
      loyaltyTier = 'Client Actif';
      loyaltyBadge = 'bg-blue-100 text-blue-800 border-blue-300 font-bold';
    } else if (totalDevisCount > 0) {
      loyaltyTier = 'Prospect Chaud 🎯';
      loyaltyBadge = 'bg-purple-100 text-purple-800 border-purple-300 font-bold';
    }

    return {
      caGlobal,
      totalCaVentes,
      totalCaOmra,
      totalCreances,
      totalPaxOmra,
      totalDevisCount,
      convertedDevisCount,
      conversionRate,
      loyaltyTier,
      loyaltyBadge
    };
  }, [ventes, omraInscriptions, devisList]);

  // Unified 360° Timeline items
  const timelineItems = useMemo(() => {
    const items = [];

    ventes.forEach(v => {
      items.push({
        id: `v_${v.id}`,
        type: 'vente',
        date: v.date_vente || v.created_at,
        title: `Vente : ${v.code || 'Billet/Séjour'}`,
        description: v.details || 'Vente enregistrée en agence',
        amount: v.total,
        reste: v.reste,
        icon: CreditCard,
        color: 'bg-blue-50 text-blue-700 border-blue-200'
      });
    });

    omraInscriptions.forEach(o => {
      items.push({
        id: `o_${o.id}`,
        type: 'omra',
        date: o.date_creation || o.created_at,
        title: `Inscription Omra : ${o.omra_groupes?.nom || 'Groupe Omra'}`,
        description: `${o.pelerins?.length || 1} pèlerins (${o.type_chambre || 'Chambre'}) - ${o.omra_groupes?.compagnie || 'Vol'}`,
        amount: o.totalNet,
        reste: o.reste,
        icon: Plane,
        color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        groupeId: o.omra_groupes?.id
      });
    });

    devisList.forEach(d => {
      items.push({
        id: `d_${d.id}`,
        type: 'devis',
        date: d.date_creation,
        title: `Devis : ${d.meta?.nom_devis || d.nom_prospect || 'Devis'}`,
        description: d.details_demande || 'Demande de chiffrage',
        status: d.status,
        icon: FileText,
        color: 'bg-purple-50 text-purple-700 border-purple-200',
        rawDevis: d
      });
    });

    remarquesList.forEach(r => {
      items.push({
        id: `r_${r.id}`,
        type: 'note',
        date: r.created_at,
        title: `Note interne (${r.categorie || 'Général'})`,
        description: r.remarque || r.texte,
        author: r.auteur_nom || 'Agent',
        icon: MessageSquare,
        color: 'bg-amber-50 text-amber-800 border-amber-200'
      });
    });

    return items.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
  }, [ventes, omraInscriptions, devisList, remarquesList]);

  // Handle add inline remark
  const handleSaveRemark = async (e) => {
    e.preventDefault();
    if (!newRemarkText.trim()) return;

    setSavingRemark(true);
    try {
      const payload = {
        client_id: client.id,
        remarque: newRemarkText.trim(),
        categorie: newRemarkCategory,
        auteur_nom: profile?.nom || user?.email?.split('@')[0] || 'Admin',
        auteur_id: user?.id || null,
        created_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('client_remarques')
        .insert([payload])
        .select();

      if (!error && data && data[0]) {
        setRemarquesList(prev => [data[0], ...prev]);
        setNewRemarkText('');
      } else {
        alert("Erreur lors de l'ajout de la remarque : " + (error?.message || 'Inconnue'));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSavingRemark(false);
    }
  };

  // WhatsApp helper
  const handleOpenWhatsApp = () => {
    if (!client.telephone) {
      alert("Aucun numéro de téléphone pour ce client.");
      return;
    }
    const cleanPhone = client.telephone.replace(/[^0-9]/g, '');
    const intPhone = cleanPhone.startsWith('0') ? '213' + cleanPhone.substring(1) : cleanPhone;
    const msg = encodeURIComponent(`Bonjour M./Mme ${client.nom},\n\nNous vous contactons de la part de l'agence El-Mokhtar Voyages & Omra.\nComment pouvons-nous vous aider aujourd'hui ?`);
    window.open(`https://wa.me/${intPhone}?text=${msg}`, '_blank');
  };

  // Print 360 Dossier / Statement
  const handlePrintDossier = () => {
    const agencyName = agencySettings?.nom_agence || 'EL-MOKHTAR VOYAGES & OMRA';
    const agencyPhone = agencySettings?.telephone || '';
    const agencyEmail = agencySettings?.email || '';
    const agencyLogo = agencySettings?.logo_url || '';
    const dateToday = new Date().toLocaleDateString('fr-FR');

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Fiche Client 360° - ${client.nom}</title>
          <style>
            @page { size: A4 portrait; margin: 12mm; }
            * { box-sizing: border-box; }
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              font-size: 11px;
              color: #1e293b;
              margin: 0;
              padding: 10px;
            }
            .header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              border-bottom: 2px solid #059669;
              padding-bottom: 10px;
              margin-bottom: 12px;
            }
            .logo { max-height: 45px; max-width: 140px; }
            .title { font-size: 16px; font-weight: 800; color: #065f46; margin: 0; text-transform: uppercase; }
            .card {
              background: #f8fafc;
              border: 1px solid #e2e8f0;
              border-radius: 8px;
              padding: 10px;
              margin-bottom: 12px;
            }
            .kpi-grid {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 8px;
              margin-bottom: 12px;
            }
            .kpi-box {
              background: #ecfdf5;
              border: 1px solid #a7f3d0;
              padding: 8px;
              border-radius: 6px;
              text-align: center;
            }
            .kpi-val { font-size: 14px; font-weight: 800; color: #065f46; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 12px; font-size: 10px; }
            th { background: #f1f5f9; padding: 6px 8px; text-align: left; border: 1px solid #cbd5e1; font-weight: 700; }
            td { padding: 6px 8px; border: 1px solid #e2e8f0; }
            .badge { display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 9px; font-weight: 700; }
            .badge-paid { background: #dcfce7; color: #166534; }
            .badge-due { background: #fee2e2; color: #991b1b; }
            .footer {
              margin-top: 20px;
              border-top: 1px solid #e2e8f0;
              padding-top: 8px;
              display: flex;
              justify-content: space-between;
              font-size: 9px;
              color: #64748b;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              ${agencyLogo ? `<img src="${agencyLogo}" class="logo" />` : ''}
              <h1 class="title">${agencyName}</h1>
              <div>FICHE CLIENT 360° & RELEVÉ DE DOSSIER</div>
            </div>
            <div style="text-align: right;">
              <div><b>Date :</b> ${dateToday}</div>
              <div><b>Tél :</b> ${agencyPhone}</div>
              <div><b>Email :</b> ${agencyEmail}</div>
            </div>
          </div>

          <div class="card">
            <div style="display: flex; justify-content: space-between;">
              <div>
                <div style="font-size: 14px; font-weight: 800;">${client.nom}</div>
                <div><b>Téléphone :</b> ${client.telephone || '—'} &bull; <b>Email :</b> ${client.email || '—'}</div>
                <div><b>Type :</b> ${client.type || 'Particulier'} &bull; <b>Statut :</b> ${stats.loyaltyTier}</div>
              </div>
              <div style="text-align: right;">
                <div><b>Créé le :</b> ${new Date(client.created_at || Date.now()).toLocaleDateString('fr-FR')}</div>
              </div>
            </div>
          </div>

          <div class="kpi-grid">
            <div class="kpi-box">
              <div style="font-size: 9px; color: #047857;">TOTAL ACHATS (LTV)</div>
              <div class="kpi-val">${fmtDZD(stats.caGlobal)} DZD</div>
            </div>
            <div class="kpi-box" style="${stats.totalCreances > 0 ? 'background: #fef2f2; border-color: #fca5a5;' : ''}">
              <div style="font-size: 9px; color: ${stats.totalCreances > 0 ? '#b91c1c' : '#047857'};">RESTE DÛ / CRÉANCES</div>
              <div class="kpi-val" style="color: ${stats.totalCreances > 0 ? '#dc2626' : '#065f46'};">${fmtDZD(stats.totalCreances)} DZD</div>
            </div>
            <div class="kpi-box">
              <div style="font-size: 9px; color: #047857;">VOYAGES & OMRA</div>
              <div class="kpi-val">${ventes.length + omraInscriptions.length} dossiers</div>
            </div>
            <div class="kpi-box">
              <div style="font-size: 9px; color: #047857;">DEVIS ENREGISTRÉS</div>
              <div class="kpi-val">${stats.totalDevisCount} (${stats.conversionRate}% conv.)</div>
            </div>
          </div>

          <div style="font-weight: 800; text-transform: uppercase; margin: 10px 0 4px; color: #065f46;">1. Inscriptions Omra & Pèlerinages</div>
          <table>
            <thead>
              <tr>
                <th>Groupe Omra</th>
                <th>Vol / Dates</th>
                <th>Pèlerins</th>
                <th>Total Dû</th>
                <th>Payé</th>
                <th>Reste</th>
              </tr>
            </thead>
            <tbody>
              ${omraInscriptions.length === 0 ? '<tr><td colspan="6" style="text-align: center; color: #94a3b8;">Aucune inscription Omra</td></tr>' : omraInscriptions.map(o => `
                <tr>
                  <td><b>${o.omra_groupes?.nom || 'Omra'}</b> (${o.type_chambre || '-'})</td>
                  <td>${o.omra_groupes?.compagnie || ''} ${o.omra_groupes?.date_depart || ''}</td>
                  <td>${o.pelerins?.length || 1} pax</td>
                  <td style="text-align: right;">${fmtDZD(o.totalNet)}</td>
                  <td style="text-align: right; color: #059669;">${fmtDZD(o.paye)}</td>
                  <td style="text-align: right; font-weight: bold; color: ${o.reste > 0 ? '#dc2626' : '#10b981'};">${fmtDZD(o.reste)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div style="font-weight: 800; text-transform: uppercase; margin: 10px 0 4px; color: #065f46;">2. Ventes & Billetterie</div>
          <table>
            <thead>
              <tr>
                <th>Réf. / Date</th>
                <th>Prestation / Détails</th>
                <th>Total</th>
                <th>Payé</th>
                <th>Reste</th>
              </tr>
            </thead>
            <tbody>
              ${ventes.length === 0 ? '<tr><td colspan="5" style="text-align: center; color: #94a3b8;">Aucune vente enregistrée</td></tr>' : ventes.map(v => `
                <tr>
                  <td><b>${v.code || 'VTE'}</b><br/>${v.date_vente ? new Date(v.date_vente).toLocaleDateString('fr-FR') : ''}</td>
                  <td>${v.details || 'Prestation voyage'}</td>
                  <td style="text-align: right;">${fmtDZD(v.total)}</td>
                  <td style="text-align: right; color: #059669;">${fmtDZD(v.paye)}</td>
                  <td style="text-align: right; font-weight: bold; color: ${v.reste > 0 ? '#dc2626' : '#10b981'};">${fmtDZD(v.reste)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="footer">
            <div>Document généré par El-Mokhtar CRM &bull; Fiche Confidentielle Client 360°</div>
            <div>Page 1 sur 1 &bull; Imprimé le ${dateToday}</div>
          </div>

          <script>
            window.onload = function() { setTimeout(function() { window.print(); }, 250); };
          </script>
        </body>
      </html>
    `;

    const printWin = window.open('', '_blank', 'height=850,width=900');
    if (printWin) {
      printWin.document.write(htmlContent);
      printWin.document.close();
    }
  };

  if (!isOpen || !client) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[960px] p-0 overflow-hidden rounded-2xl max-h-[92vh] flex flex-col" onClose={onClose}>
        
        {/* ── 1. Top Header 360° ─────────────────────────────────── */}
        <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 text-white p-5 border-b border-slate-800 shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            
            {/* Client Info Left */}
            <div className="flex items-start gap-3.5 min-w-0">
              <div className="w-13 h-13 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white font-black text-2xl shadow-md border border-emerald-400/30 shrink-0">
                {(client.nom?.charAt(0) || 'C').toUpperCase()}
              </div>
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-xl font-extrabold tracking-tight text-white truncate">{client.nom}</h2>
                  <span className={cn("text-[10px] px-2 py-0.5 rounded-full border uppercase tracking-wider", stats.loyaltyBadge)}>
                    {stats.loyaltyTier}
                  </span>
                  <Badge variant={client.type === 'Entreprise' ? 'warning' : 'outline'} className="text-[10px] text-white/80 border-white/20">
                    {client.type || 'Particulier'}
                  </Badge>
                </div>

                <div className="flex items-center gap-3 text-xs text-slate-300 flex-wrap">
                  {client.telephone && (
                    <span className="flex items-center gap-1 font-mono text-emerald-300">
                      <Phone size={12} className="text-emerald-400" /> {client.telephone}
                    </span>
                  )}
                  {client.email && (
                    <span className="flex items-center gap-1 text-blue-300">
                      <Mail size={12} className="text-blue-400" /> {client.email}
                    </span>
                  )}
                  <span className="text-slate-400 text-[11px] flex items-center gap-1">
                    <Calendar size={11} /> Client depuis {new Date(client.created_at || Date.now()).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })}
                  </span>
                </div>
              </div>
            </div>

            {/* Top Right Quick Actions */}
            <div className="flex items-center gap-2 flex-wrap shrink-0">
              {client.telephone && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleOpenWhatsApp}
                  className="bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border-emerald-400/30 text-xs h-8 gap-1.5 font-bold"
                  title="Ouvrir WhatsApp directement"
                >
                  <MessageCircle size={14} /> WhatsApp
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                onClick={handlePrintDossier}
                className="bg-white/10 hover:bg-white/20 text-white border-white/20 text-xs h-8 gap-1.5 font-bold"
                title="Imprimer la fiche 360° et le relevé en PDF"
              >
                <Printer size={14} /> Relevé PDF
              </Button>
            </div>
          </div>

          {/* ── 2. Executive 360° KPI Strip ───────────────────────── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4 pt-3 border-t border-white/10">
            <div className="bg-white/5 border border-white/10 px-3 py-2 rounded-xl">
              <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-300 block">Total Achats (LTV)</span>
              <span className="text-sm font-black text-white">{fmtDZD(stats.caGlobal)} <span className="text-[10px] font-normal text-slate-400">DZD</span></span>
            </div>

            <div className={cn("border px-3 py-2 rounded-xl", stats.totalCreances > 0 ? "bg-red-500/10 border-red-400/30" : "bg-emerald-500/10 border-emerald-400/30")}>
              <span className={cn("text-[10px] uppercase font-bold tracking-wider block", stats.totalCreances > 0 ? "text-red-300" : "text-emerald-300")}>
                Reste Dû / Créances
              </span>
              <span className={cn("text-sm font-black", stats.totalCreances > 0 ? "text-red-200" : "text-emerald-200")}>
                {fmtDZD(stats.totalCreances)} <span className="text-[10px] font-normal text-slate-400">DZD</span>
              </span>
            </div>

            <div className="bg-white/5 border border-white/10 px-3 py-2 rounded-xl">
              <span className="text-[10px] uppercase font-bold tracking-wider text-blue-300 block">Voyages & Omra</span>
              <span className="text-sm font-black text-white">
                {ventes.length + omraInscriptions.length} <span className="text-[10px] font-normal text-slate-400">({stats.totalPaxOmra} pèlerins)</span>
              </span>
            </div>

            <div className="bg-white/5 border border-white/10 px-3 py-2 rounded-xl">
              <span className="text-[10px] uppercase font-bold tracking-wider text-purple-300 block">Devis & Conversion</span>
              <span className="text-sm font-black text-white">
                {stats.totalDevisCount} <span className="text-[10px] font-normal text-slate-400">({stats.conversionRate}% convertis)</span>
              </span>
            </div>
          </div>

          {/* ── 3. Navigation Tabs ─────────────────────────────────── */}
          <div className="flex items-center gap-1.5 mt-4 -mb-5 pb-0 overflow-x-auto border-b border-transparent">
            {[
              { id: 'vue_360', label: 'Vue 360° & Famille', icon: Sparkles },
              { id: 'omra', label: `Omra (${omraInscriptions.length})`, icon: Plane },
              { id: 'ventes', label: `Ventes (${ventes.length})`, icon: CreditCard },
              { id: 'devis', label: `Devis (${devisList.length})`, icon: FileText },
              { id: 'remarques', label: `Notes (${remarquesList.length})`, icon: MessageSquare },
              { id: 'releve', label: 'Relevé Financier', icon: Coins },
            ].map(t => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={cn(
                  "px-3 py-2 rounded-t-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 border-t border-x",
                  activeTab === t.id
                    ? "bg-white text-slate-900 border-white shadow-xs"
                    : "text-slate-300 hover:text-white hover:bg-white/10 border-transparent"
                )}
              >
                <t.icon size={13} className={activeTab === t.id ? "text-emerald-600" : "opacity-70"} />
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── 4. Main Tab Content ─────────────────────────────────── */}
        <div className="flex-1 min-h-0 overflow-y-auto p-5 bg-slate-50/50">
          
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <Loader2 size={32} className="animate-spin text-primary mb-2" />
              <p className="text-xs font-medium">Chargement des données du dossier client 360°...</p>
            </div>
          ) : (
            <>
              {/* 🌟 Tab 1: Vue d'ensemble 360° & Famille */}
              {activeTab === 'vue_360' && (
                <div className="space-y-5">
                  
                  {/* Family Members / Frequent Pax Section */}
                  {pelerinsFamille.length > 0 && (
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                          <Users size={14} className="text-emerald-600" /> Membres de la Famille & Passagers Fréquents ({pelerinsFamille.length})
                        </h3>
                        <span className="text-[11px] text-slate-400">Enregistrés sous ce dossier client</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                        {pelerinsFamille.map((pax, idx) => (
                          <div key={idx} className="p-2.5 rounded-lg border border-slate-200/80 bg-slate-50/50 hover:bg-white transition-all flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className={cn("w-2 h-2 rounded-full shrink-0", pax.sexe === 'F' ? "bg-pink-400" : "bg-blue-400")} />
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-slate-900 truncate">{pax.nom}</p>
                                <p className="text-[10px] text-slate-500 truncate">{pax.type} &bull; {pax.lastTrip}</p>
                              </div>
                            </div>
                            <span className="text-[9px] font-mono bg-white px-1.5 py-0.5 rounded border text-slate-600 shrink-0">
                              {pax.sexe === 'F' ? 'Femme' : 'Homme'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 360° Unified Timeline */}
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                        <History size={14} className="text-indigo-600" /> Journal d'Activité & Historique 360°
                      </h3>
                      <span className="text-[11px] text-slate-400">{timelineItems.length} interactions</span>
                    </div>

                    {timelineItems.length === 0 ? (
                      <p className="text-xs text-slate-400 py-6 text-center">Aucune activité pour ce client pour le moment.</p>
                    ) : (
                      <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                        {timelineItems.map((item) => (
                          <div key={item.id} className="relative flex items-start justify-between gap-3 text-xs">
                            <div className="absolute -left-6 top-1 w-5 h-5 rounded-full bg-white border-2 border-slate-300 flex items-center justify-center text-slate-600 shadow-2xs">
                              <item.icon size={11} />
                            </div>

                            <div className="space-y-0.5 flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-slate-900">{item.title}</span>
                                <span className={cn("text-[9px] px-1.5 py-0.2 rounded border font-semibold", item.color)}>
                                  {item.type.toUpperCase()}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-600 line-clamp-2">{item.description}</p>
                              {item.author && (
                                <p className="text-[10px] text-slate-400">Par: <b>{item.author}</b></p>
                              )}
                            </div>

                            <div className="text-right shrink-0">
                              {item.amount !== undefined && (
                                <span className="font-bold text-slate-900 block">{fmtDZD(item.amount)} DZD</span>
                              )}
                              {item.reste !== undefined && item.reste > 0 && (
                                <span className="text-[10px] font-bold text-red-600 block">Reste: {fmtDZD(item.reste)} DZD</span>
                              )}
                              <span className="text-[10px] text-slate-400">
                                {item.date ? new Date(item.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                </div>
              )}

              {/* 🕌 Tab 2: Historique Omra */}
              {activeTab === 'omra' && (
                <div className="space-y-3">
                  {omraInscriptions.length === 0 ? (
                    <div className="bg-white p-8 rounded-xl border border-slate-200 text-center text-slate-400">
                      <Plane size={32} className="mx-auto mb-2 opacity-30" />
                      <p className="text-xs font-semibold text-slate-600">Aucune inscription Omra pour ce client</p>
                    </div>
                  ) : (
                    omraInscriptions.map((enr) => (
                      <div key={enr.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-bold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded">
                                {enr.omra_groupes?.compagnie || 'VOL'}
                              </span>
                              <h4 className="text-sm font-bold text-slate-900">{enr.omra_groupes?.nom || 'Groupe Omra'}</h4>
                            </div>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                              Départ : <b>{enr.omra_groupes?.date_depart || '—'}</b> &bull; Retour : <b>{enr.omra_groupes?.date_retour || '—'}</b> &bull; Chambre : <b>{enr.type_chambre || 'Standard'}</b>
                            </p>
                          </div>

                          <div className="flex items-center gap-2">
                            {enr.omra_groupes?.id && (
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => {
                                  onClose();
                                  navigate(`/omra/group/${enr.omra_groupes.id}`);
                                }}
                                className="text-xs h-7 gap-1 font-bold text-emerald-700 bg-emerald-50 border-emerald-200"
                              >
                                Ouvrir Groupe <ExternalLink size={12} />
                              </Button>
                            )}
                          </div>
                        </div>

                        {/* Pilgrims List */}
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                            Pèlerins inscrits ({enr.pelerins?.length || 0}) :
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {(enr.pelerins || []).map((p, idx) => (
                              <span key={idx} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 text-slate-800 rounded-md text-xs font-medium border border-slate-200">
                                <span className={cn("w-1.5 h-1.5 rounded-full", p.sexe === 'F' ? "bg-pink-400" : "bg-blue-400")} />
                                {p.nom || 'Sans nom'}
                                {p.chd && <span className="text-[9px] bg-blue-100 text-blue-700 px-1 py-0.2 rounded font-bold">CHD</span>}
                                {p.restauration && <Utensils size={10} className="text-orange-500" />}
                              </span>
                            ))}
                            {(enr.enfants_sans_lit || []).map((e, idx) => (
                              <span key={`enf-${idx}`} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 text-amber-800 rounded-md text-xs font-medium border border-amber-200">
                                <Baby size={12} /> {e.nom || 'Bébé'}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Financial summary for this registration */}
                        <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100 bg-slate-50/50 -mx-4 -mb-4 p-3 rounded-b-xl">
                          <span className="text-slate-600">Total Dû : <b>{fmtDZD(enr.totalNet)} DZD</b></span>
                          <span className="text-emerald-700 font-bold">Payé : {fmtDZD(enr.paye)} DZD</span>
                          <span className={cn("font-bold px-2 py-0.5 rounded", enr.reste > 0 ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-800")}>
                            {enr.reste > 0 ? `Reste : ${fmtDZD(enr.reste)} DZD` : 'Soldé 100%'}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* 💳 Tab 3: Ventes & Billetterie */}
              {activeTab === 'ventes' && (
                <div className="space-y-3">
                  {ventes.length === 0 ? (
                    <div className="bg-white p-8 rounded-xl border border-slate-200 text-center text-slate-400">
                      <CreditCard size={32} className="mx-auto mb-2 opacity-30" />
                      <p className="text-xs font-semibold text-slate-600">Aucune vente enregistrée pour ce client</p>
                    </div>
                  ) : (
                    ventes.map((v) => (
                      <div key={v.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-2.5">
                        <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                              {v.code || 'VTE'}
                            </span>
                            <span className="text-xs font-bold text-slate-900">{v.details || 'Prestation voyage'}</span>
                          </div>
                          <span className="text-[11px] text-slate-400">
                            {v.date_vente ? new Date(v.date_vente).toLocaleDateString('fr-FR') : ''}
                          </span>
                        </div>

                        {/* Passenger Tags */}
                        {v.articles?.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {v.articles.flatMap(a => a.passagers || []).map((p, pIdx) => (
                              <span key={pIdx} className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
                                👤 {typeof p === 'string' ? p : p.nom}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Financials & Actions */}
                        <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100">
                          <div className="flex items-center gap-3">
                            <span className="text-slate-600">Total: <b>{fmtDZD(v.total)} DZD</b></span>
                            <span className="text-emerald-700 font-bold">Payé: {fmtDZD(v.paye)} DZD</span>
                            <span className={cn("font-bold px-2 py-0.5 rounded text-[11px]", v.reste > 0 ? "bg-rose-50 text-rose-700 border border-rose-200" : "bg-emerald-50 text-emerald-700")}>
                              {v.reste > 0 ? `Reste : ${fmtDZD(v.reste)} DZD` : 'Payé'}
                            </span>
                          </div>

                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedVenteForPayment(v)}
                            className="h-7 text-xs font-bold text-blue-700 bg-blue-50 border-blue-200 hover:bg-blue-100"
                          >
                            Paiements & Reçus
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* 📋 Tab 4: Devis & Pipeline */}
              {activeTab === 'devis' && (
                <div className="space-y-3">
                  {devisList.length === 0 ? (
                    <div className="bg-white p-8 rounded-xl border border-slate-200 text-center text-slate-400">
                      <FileText size={32} className="mx-auto mb-2 opacity-30" />
                      <p className="text-xs font-semibold text-slate-600">Aucun devis enregistré pour ce client</p>
                    </div>
                  ) : (
                    devisList.map((d) => {
                      const statusInfo = STATUS_PILLS[d.status] || STATUS_PILLS.nouvelle;

                      return (
                        <div 
                          key={d.id}
                          onClick={() => setSelectedDevisForModal(d)}
                          className="bg-white p-3.5 rounded-xl border border-slate-200 hover:border-purple-300 hover:bg-purple-50/20 transition-all cursor-pointer shadow-2xs space-y-2 group"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 truncate">
                              <span className="text-xs font-bold text-slate-900 group-hover:text-purple-700 transition-colors">
                                {d.nom_prospect || d.meta?.nom_devis}
                              </span>
                              {d.meta?.destination && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                                  <CountryFlag countryName={d.meta.destination} emoji={d.meta.destination_emoji} size={11} />
                                  {d.meta.destination}
                                </span>
                              )}
                            </div>
                            <span className={cn("text-[10px] px-2 py-0.5 rounded border font-bold uppercase", statusInfo.bg)}>
                              {statusInfo.label}
                            </span>
                          </div>

                          {d.details_demande && (
                            <p className="text-[11px] text-slate-500 line-clamp-2">{d.details_demande}</p>
                          )}

                          <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-100">
                            <span>Créé le {d.date_creation ? new Date(d.date_creation).toLocaleDateString('fr-FR') : '—'}</span>
                            <span className="font-bold text-purple-700 flex items-center gap-1">
                              Ouvrir le devis <ChevronRight size={12} />
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {/* 💬 Tab 5: Notes & Journal d'Échanges */}
              {activeTab === 'remarques' && (
                <div className="space-y-4">
                  
                  {/* Inline New Note Form */}
                  <form onSubmit={handleSaveRemark} className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-2.5">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <Plus size={14} className="text-emerald-600" /> Ajouter une note interne sur ce client
                      </Label>
                      <div className="flex items-center gap-1">
                        {['Général', 'Préférence', 'Finance', 'Important'].map(cat => (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => setNewRemarkCategory(cat)}
                            className={cn(
                              "text-[10px] px-2 py-0.5 rounded-md font-bold transition-all border",
                              newRemarkCategory === cat
                                ? "bg-emerald-50 text-emerald-800 border-emerald-300 shadow-2xs"
                                : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                            )}
                          >
                            {cat}
                          </button>
                        ))}
                      </div>
                    </div>

                    <Textarea
                      placeholder="Ex: Préfère toujours les chambres avec lits séparés, ne voyage qu'avec Saudia, paiement souvent par BaridiMob..."
                      value={newRemarkText}
                      onChange={e => setNewRemarkText(e.target.value)}
                      className="text-xs min-h-[60px] bg-slate-50 border-slate-200 focus:bg-white"
                    />

                    <div className="flex justify-end">
                      <Button type="submit" size="sm" disabled={savingRemark || !newRemarkText.trim()} className="h-8 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white">
                        {savingRemark ? <Loader2 size={13} className="animate-spin mr-1" /> : <Check size={13} className="mr-1" />}
                        Enregistrer la note
                      </Button>
                    </div>
                  </form>

                  {/* Notes List */}
                  <div className="space-y-2">
                    {remarquesList.length === 0 ? (
                      <div className="bg-white p-6 rounded-xl border border-slate-200 text-center text-slate-400">
                        <MessageSquare size={28} className="mx-auto mb-1.5 opacity-20" />
                        <p className="text-xs text-slate-600 font-semibold">Aucune note interne pour ce client</p>
                      </div>
                    ) : (
                      remarquesList.map(r => (
                        <div key={r.id} className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs space-y-1">
                          <div className="flex items-center justify-between text-[10px]">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-slate-800">{r.auteur_nom || 'Agent'}</span>
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-slate-100 text-slate-600 border">
                                {r.categorie || 'Général'}
                              </span>
                            </div>
                            <span className="text-slate-400">{r.created_at ? new Date(r.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''}</span>
                          </div>
                          <p className="text-xs text-slate-700 leading-relaxed font-normal">{r.remarque || r.texte}</p>
                        </div>
                      ))
                    )}
                  </div>

                </div>
              )}

              {/* 🧾 Tab 6: Relevé Financier & Facturation */}
              {activeTab === 'releve' && (
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
                        Relevé Financier Global des Transactions
                      </h3>
                      <p className="text-[11px] text-slate-500">Synthèse de tous les débits (commandes) et crédits (versements reçus)</p>
                    </div>
                    <Button size="sm" onClick={handlePrintDossier} className="h-8 text-xs font-bold gap-1.5 bg-slate-900 text-white">
                      <Printer size={13} /> Imprimer Relevé Officiel
                    </Button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b bg-slate-50 text-slate-500 font-bold uppercase text-[10px]">
                          <th className="py-2.5 px-3 text-left">Date</th>
                          <th className="py-2.5 px-3 text-left">Type & Prestation</th>
                          <th className="py-2.5 px-3 text-right">Débit (Total Dû)</th>
                          <th className="py-2.5 px-3 text-right">Crédit (Payé)</th>
                          <th className="py-2.5 px-3 text-right">Solde Restant</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {timelineItems.filter(i => i.amount !== undefined).map(item => (
                          <tr key={item.id} className="hover:bg-slate-50/50">
                            <td className="py-2.5 px-3 text-slate-500">
                              {item.date ? new Date(item.date).toLocaleDateString('fr-FR') : '—'}
                            </td>
                            <td className="py-2.5 px-3 font-semibold text-slate-900">
                              {item.title}
                            </td>
                            <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                              {fmtDZD(item.amount)} DZD
                            </td>
                            <td className="py-2.5 px-3 text-right font-bold text-emerald-700">
                              {fmtDZD(item.amount - (item.reste || 0))} DZD
                            </td>
                            <td className="py-2.5 px-3 text-right font-bold text-rose-600">
                              {item.reste > 0 ? `${fmtDZD(item.reste)} DZD` : '0 DZD'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 border-slate-300 font-extrabold bg-slate-50 text-slate-900">
                          <td colSpan="2" className="py-3 px-3 uppercase text-[11px]">Totaux Généraux :</td>
                          <td className="py-3 px-3 text-right text-sm">{fmtDZD(stats.caGlobal)} DZD</td>
                          <td className="py-3 px-3 text-right text-sm text-emerald-700">{fmtDZD(stats.caGlobal - stats.totalCreances)} DZD</td>
                          <td className={cn("py-3 px-3 text-right text-sm", stats.totalCreances > 0 ? "text-rose-600" : "text-emerald-700")}>
                            {fmtDZD(stats.totalCreances)} DZD
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              )}

            </>
          )}

        </div>

      </DialogContent>

      {/* ── Sub-Modals ────────────────────────────────────────────── */}
      {/* Prospect / Devis Modal */}
      {selectedDevisForModal && (
        <ProspectModal
          isOpen={!!selectedDevisForModal}
          onClose={() => {
            setSelectedDevisForModal(null);
            fetchClientDossier();
          }}
          prospect={selectedDevisForModal}
          onSuccess={fetchClientDossier}
        />
      )}

      {/* Payment Modal for Sale */}
      {selectedVenteForPayment && (
        <VentePaiementsModal
          isOpen={!!selectedVenteForPayment}
          onClose={() => {
            setSelectedVenteForPayment(null);
            fetchClientDossier();
          }}
          vente={selectedVenteForPayment}
          onPaymentSuccess={fetchClientDossier}
        />
      )}
    </Dialog>
  );
}
