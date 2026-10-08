import React, { useState, useEffect, useMemo } from 'react';
import { 
  Coins, CreditCard, Plus, Trash2, Pencil, Printer, Download, CheckCircle2, 
  Clock, ArrowRight, Calendar, DollarSign, AlertCircle, Percent, Layers, 
  User, Wallet, X, RefreshCw, Check, Sparkles, FileText, ChevronRight
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import CountryFlag from '@/components/CountryFlag';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const CURRENCY_LIST = [
  { code: 'DZD', label: 'DZD — Dinar Algérien', symbol: 'DA', flag: '🇩🇿', defaultRate: 1 },
  { code: 'EUR', label: 'EUR — Euro', symbol: '€', flag: '🇪🇺', defaultRate: 245 },
  { code: 'USD', label: 'USD — Dollar US', symbol: '$', flag: '🇺🇸', defaultRate: 225 },
  { code: 'SAR', label: 'SAR — Riyal Saoudien', symbol: 'SR', flag: '🇸🇦', defaultRate: 60 },
  { code: 'CAD', label: 'CAD — Dollar Canadien', symbol: 'CA$', flag: '🇨🇦', defaultRate: 165 },
  { code: 'GBP', label: 'GBP — Livre Sterling', symbol: '£', flag: '🇬🇧', defaultRate: 285 },
  { code: 'TRY', label: 'TRY — Livre Turque', symbol: '₺', flag: '🇹🇷', defaultRate: 6.5 },
  { code: 'AED', label: 'AED — Dirham Émirati', symbol: 'AED', flag: '🇦🇪', defaultRate: 61 },
  { code: 'TND', label: 'TND — Dinar Tunisien', symbol: 'DT', flag: '🇹🇳', defaultRate: 72 },
];

const MOYENS_PAIEMENT = [
  { id: 'Espèce', label: '💵 Espèce / Cash', icon: '💵' },
  { id: 'Virement bancaire', label: '🏦 Virement bancaire', icon: '🏦' },
  { id: 'Chèque', label: '🧾 Chèque bancaire', icon: '🧾' },
  { id: 'Versement CCP', label: '📮 Versement CCP / Poste', icon: '📮' },
  { id: 'Carte bancaire', label: '💳 Carte bancaire / TPE', icon: '💳' },
];

export const fmtDZD = (amount) => {
  return new Intl.NumberFormat('fr-DZ', { 
    style: 'currency', 
    currency: 'DZD',
    maximumFractionDigits: 0 
  }).format(amount || 0);
};

export const fmtCurrency = (amount, currency = 'DZD') => {
  if (currency === 'DZD') return fmtDZD(amount);
  return `${Number(amount || 0).toLocaleString('fr-DZ', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ${currency}`;
};

const VentePaiementsModal = ({ vente, onClose, onPaiementsUpdated }) => {
  const { user, profile } = useAuth();
  const [paiements, setPaiements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form State
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  const [datePaiement, setDatePaiement] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [nomPayeur, setNomPayeur] = useState(vente?.client_nom || '');
  const [passagerNom, setPassagerNom] = useState('');
  const [devise, setDevise] = useState('DZD');
  const [tauxChange, setTauxChange] = useState('');
  const [montantOriginal, setMontantOriginal] = useState('');
  const [moyenPaiement, setMoyenPaiement] = useState('Espèce');
  const [numRecu, setNumRecu] = useState('');
  const [notes, setNotes] = useState('');

  // Extract passagers from vente
  const passagersList = useMemo(() => {
    if (vente?.passagers && Array.isArray(vente.passagers) && vente.passagers.length > 0) {
      return vente.passagers;
    }
    if (vente?.articles && Array.isArray(vente.articles)) {
      const artWithPax = vente.articles.find(a => Array.isArray(a.passagers) && a.passagers.length > 0);
      if (artWithPax) return artWithPax.passagers;
    }
    return [];
  }, [vente]);

  useEffect(() => {
    if (vente?.id) {
      fetchPaiements();
      generateNextRecuNumber();
    }
  }, [vente?.id]);

  // Adjust default exchange rate when currency changes
  useEffect(() => {
    if (devise === 'DZD') {
      setTauxChange('1');
    } else {
      const cur = CURRENCY_LIST.find(c => c.code === devise);
      if (cur && (!tauxChange || tauxChange === '1')) {
        setTauxChange(cur.defaultRate.toString());
      }
    }
  }, [devise]);

  const generateNextRecuNumber = async () => {
    const year = new Date().getFullYear();
    try {
      const { data } = await supabase
        .from('vente_paiements')
        .select('num_recu')
        .like('num_recu', `REC-${year}-%`)
        .order('created_at', { ascending: false })
        .limit(1);

      if (data && data.length > 0 && data[0].num_recu) {
        const parts = data[0].num_recu.split('-');
        const lastNum = parseInt(parts[2], 10) || 0;
        setNumRecu(`REC-${year}-${(lastNum + 1).toString().padStart(4, '0')}`);
      } else {
        setNumRecu(`REC-${year}-0001`);
      }
    } catch {
      setNumRecu(`REC-${year}-0001`);
    }
  };

  const fetchPaiements = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('vente_paiements')
        .select('*')
        .eq('vente_id', vente.id)
        .order('date_paiement', { ascending: false })
        .order('created_at', { ascending: false });

      if (!error && data) {
        setPaiements(data);
      } else {
        console.warn("Table vente_paiements non trouvée ou erreur, initialisation vide :", error);
        setPaiements([]);
      }
    } catch (err) {
      console.warn("Erreur fetchPaiements:", err);
      setPaiements([]);
    }
    setLoading(false);
  };

  // Calculated Totals
  const totalVente = Number(vente?.total) || 0;

  const totalPayeDZD = useMemo(() => {
    return paiements.reduce((acc, p) => acc + (Number(p.montant_dzd) || 0), 0);
  }, [paiements]);

  const resteAPayer = Math.max(0, totalVente - totalPayeDZD);
  const pourcentagePaye = totalVente > 0 ? Math.min(100, Math.round((totalPayeDZD / totalVente) * 100)) : 100;

  // Real-time calculation of current form input to DZD
  const currentMontantOriginal = parseFloat(montantOriginal) || 0;
  const currentRate = devise === 'DZD' ? 1 : (parseFloat(tauxChange) || 1);
  const currentMontantDZD = Math.round(currentMontantOriginal * currentRate);

  // Quick fill remaining balance
  const handleFillRemaining = () => {
    if (devise === 'DZD') {
      setMontantOriginal(resteAPayer.toString());
    } else {
      const rate = parseFloat(tauxChange) || 1;
      const converted = rate > 0 ? (resteAPayer / rate).toFixed(2) : '0';
      setMontantOriginal(converted);
    }
  };

  const resetForm = () => {
    setIsEditing(false);
    setEditingId(null);
    setDatePaiement(format(new Date(), 'yyyy-MM-dd'));
    setNomPayeur(vente?.client_nom || '');
    setPassagerNom('');
    setDevise('DZD');
    setTauxChange('1');
    setMontantOriginal('');
    setMoyenPaiement('Espèce');
    setNotes('');
    generateNextRecuNumber();
  };

  const handleEditPayment = (p) => {
    setIsEditing(true);
    setEditingId(p.id);
    setDatePaiement(p.date_paiement ? format(new Date(p.date_paiement), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'));
    setNomPayeur(p.nom_payeur || vente?.client_nom || '');
    setPassagerNom(p.passager_nom || '');
    setDevise(p.devise || 'DZD');
    setTauxChange(p.taux_change ? p.taux_change.toString() : '1');
    setMontantOriginal(p.montant_original ? p.montant_original.toString() : '');
    setMoyenPaiement(p.moyen_paiement || 'Espèce');
    setNumRecu(p.num_recu || '');
    setNotes(p.notes || '');
  };

  const handleDeletePayment = async (id, numRecuLabel, montantLabel) => {
    if (!window.confirm(`Confirmer la suppression du versement ${numRecuLabel || ''} d'un montant de ${montantLabel} DZD ?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('vente_paiements')
        .delete()
        .eq('id', id);

      if (!error) {
        const updated = paiements.filter(p => p.id !== id);
        setPaiements(updated);
        syncVenteEtat(updated);
      } else {
        alert("Erreur lors de la suppression : " + error.message);
      }
    } catch (err) {
      alert("Erreur : " + err.message);
    }
  };

  const syncVenteEtat = async (currentPaiementsList) => {
    const totalPaid = currentPaiementsList.reduce((acc, p) => acc + (Number(p.montant_dzd) || 0), 0);
    const newReste = totalVente - totalPaid;
    let newEtat = 'Payé';
    if (newReste <= 0) {
      newEtat = 'Payé';
    } else if (totalPaid > 0) {
      newEtat = 'Reservé'; // Acompte / Réservé
    } else {
      newEtat = 'Reservé';
    }

    try {
      await supabase.from('ventes').update({ etat: newEtat }).eq('id', vente.id);
      if (onPaiementsUpdated) {
        onPaiementsUpdated({ ...vente, totalPayeDZD: totalPaid, resteAPayer: Math.max(0, newReste), etat: newEtat });
      }
    } catch (err) {
      console.warn("Erreur mise à jour état vente:", err);
    }
  };

  const handleSubmitPayment = async (e) => {
    e.preventDefault();
    if (currentMontantOriginal <= 0) {
      alert("Veuillez saisir un montant supérieur à 0.");
      return;
    }

    if (devise !== 'DZD' && (!tauxChange || parseFloat(tauxChange) <= 0)) {
      alert("Veuillez renseigner un taux de change valide supérieur à 0.");
      return;
    }

    setSaving(true);
    const rateToSave = devise === 'DZD' ? 1 : parseFloat(tauxChange);
    const dzdToSave = currentMontantDZD;

    const creatorId = user?.id || null;
    const creatorName = profile?.nom || user?.email?.split('@')[0] || 'Admin';

    const payload = {
      vente_id: vente.id,
      client_id: vente.client_id || null,
      nom_payeur: nomPayeur.trim() || vente?.client_nom || 'Client',
      passager_nom: passagerNom.trim() || null,
      date_paiement: datePaiement,
      montant_original: currentMontantOriginal,
      devise: devise,
      taux_change: rateToSave,
      montant_dzd: dzdToSave,
      moyen_paiement: moyenPaiement,
      num_recu: numRecu.trim() || null,
      notes: notes.trim() || null,
      ...(!isEditing ? { created_by: creatorId, created_by_name: creatorName } : {})
    };

    try {
      if (isEditing && editingId) {
        const { data, error } = await supabase
          .from('vente_paiements')
          .update(payload)
          .eq('id', editingId)
          .select();

        if (error) {
          alert("Erreur lors de la mise à jour : " + error.message);
        } else if (data && data[0]) {
          const updated = paiements.map(p => p.id === editingId ? data[0] : p);
          setPaiements(updated);
          syncVenteEtat(updated);
          resetForm();
        }
      } else {
        const { data, error } = await supabase
          .from('vente_paiements')
          .insert([payload])
          .select();

        if (error) {
          alert("Erreur lors de l'enregistrement du versement : " + error.message);
        } else if (data && data[0]) {
          const updated = [data[0], ...paiements];
          setPaiements(updated);
          syncVenteEtat(updated);
          resetForm();
        }
      }
    } catch (err) {
      alert("Erreur technique : " + err.message);
    }
    setSaving(false);
  };

  // ── IMPRESSION DU REÇU DE CAISSE / BON DE VERSEMENT PDF ──────────
  const handlePrintReceipt = (paiement) => {
    const doc = new jsPDF({ unit: 'mm', format: 'a5', orientation: 'landscape' });
    const pDate = paiement.date_paiement ? format(parseISO(paiement.date_paiement), 'dd MMMM yyyy', { locale: fr }) : format(new Date(), 'dd MMMM yyyy', { locale: fr });
    const recuNum = paiement.num_recu || `REC-${new Date().getFullYear()}-0000`;

    // ── En-tête Agence
    doc.setFillColor(15, 23, 42); // slate-900
    doc.rect(0, 0, 210, 24, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text("REÇU DE VERSEMENT / BON DE CAISSE", 15, 12);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`N° ${recuNum}  |  Date: ${pDate}`, 15, 18);

    doc.setFont('helvetica', 'bold');
    doc.text("AGENCE DE VOYAGES & TOURISME", 195, 14, { align: 'right' });

    // ── Boîte Client & Prestation
    doc.setDrawColor(226, 232, 240);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(15, 30, 180, 24, 3, 3, 'FD');

    doc.setTextColor(51, 65, 85);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text("Reçu de (Client / Payeur) :", 20, 37);
    doc.setFont('helvetica', 'normal');
    doc.text(paiement.nom_payeur || vente?.client_nom || 'Client', 70, 37);

    doc.setFont('helvetica', 'bold');
    doc.text("Dossier / Prestation :", 20, 44);
    doc.setFont('helvetica', 'normal');
    const prestationDesc = vente?.destination ? `Voyage ${vente.destination} — ${vente?.details || 'Prestations multiples'}` : (vente?.details || 'Prestation de service');
    doc.text(prestationDesc.substring(0, 75), 70, 44);

    if (paiement.passager_nom) {
      doc.setFont('helvetica', 'bold');
      doc.text("Passager concerné :", 20, 50);
      doc.setFont('helvetica', 'normal');
      doc.text(paiement.passager_nom, 70, 50);
    }

    // ── Tableau Détail du Versement
    const isForeign = paiement.devise && paiement.devise !== 'DZD';
    const amountOrigLabel = isForeign 
      ? `${fmtCurrency(paiement.montant_original, paiement.devise)} (Taux: ${paiement.taux_change})`
      : fmtDZD(paiement.montant_dzd);

    autoTable(doc, {
      startY: 58,
      margin: { left: 15, right: 15 },
      head: [['Moyen de Paiement', 'Montant Devise', 'Équivalent DZD', 'Observations']],
      body: [
        [
          paiement.moyen_paiement || 'Espèce',
          isForeign ? fmtCurrency(paiement.montant_original, paiement.devise) : '—',
          fmtDZD(paiement.montant_dzd),
          paiement.notes || 'Règlement tranche'
        ]
      ],
      theme: 'striped',
      headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },
      bodyStyles: { fontSize: 9, textColor: [30, 41, 59] },
      columnStyles: {
        0: { cellWidth: 40 },
        1: { cellWidth: 45, halign: 'right' },
        2: { cellWidth: 45, halign: 'right', fontStyle: 'bold' },
        3: { cellWidth: 50 }
      }
    });

    // ── Synthèse du Solde
    const currentTableY = doc.lastAutoTable.finalY + 6;
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(15, currentTableY, 180, 18, 2, 2, 'F');

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text(`Montant Total Vente : ${fmtDZD(totalVente)}`, 20, currentTableY + 7);
    doc.text(`Total Cumulé Encaissé : ${fmtDZD(totalPayeDZD)}`, 20, currentTableY + 13);

    doc.setFontSize(10);
    doc.setTextColor(resteAPayer === 0 ? 22 : 185, resteAPayer === 0 ? 101 : 28, resteAPayer === 0 ? 52 : 28);
    doc.text(`Reste à Payer : ${fmtDZD(resteAPayer)} ${resteAPayer === 0 ? ' (SOLDÉ)' : ''}`, 190, currentTableY + 10, { align: 'right' });

    // ── Cadres Signatures
    const sigY = currentTableY + 24;
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.setFont('helvetica', 'italic');
    doc.text("Signature du Client / Payeur :", 25, sigY);
    doc.line(25, sigY + 14, 85, sigY + 14);

    doc.text("Cachet & Signature de l'Agence :", 125, sigY);
    doc.line(125, sigY + 14, 185, sigY + 14);

    // ── Téléchargement
    doc.save(`Recu_${recuNum}_${(vente?.client_nom || 'Client').replace(/\s+/g, '_')}.pdf`);
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-[1000px] p-0 overflow-hidden rounded-[28px] border border-border/80 shadow-2xl bg-card" onClose={onClose}>
        
        {/* ── Header ────────────────────────────────────────────────────────── */}
        <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 text-white px-7 py-5 border-b border-white/10 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-32 bg-primary/20 rounded-full blur-3xl pointer-events-none -mr-16 -mt-16" />
          
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase tracking-[0.2em] font-extrabold text-emerald-400 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 shadow-2xs">
                  Encaissements & Tranches
                </span>
                <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                  <Calendar size={12} />
                  Vente du {vente?.date_vente ? format(new Date(vente.date_vente), 'dd MMMM yyyy', { locale: fr }) : '—'}
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center font-black text-sm shadow-inner border border-emerald-500/30">
                  <Coins size={16} />
                </div>
                <span>Paiements — {vente?.client_nom || 'Client'}</span>
                {vente?.destination && (
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2 py-0.5 rounded-md bg-white/10 text-white border border-white/15 ml-1">
                    <CountryFlag countryName={vente.destination} className="w-4 h-3 rounded-2xs" />
                    <span>{vente.destination}</span>
                  </span>
                )}
              </h2>
            </div>

            {/* Quick Balance Status Badge */}
            <div className="flex items-center gap-2">
              <Badge 
                className={cn(
                  "px-3.5 py-1.5 rounded-xl font-black text-xs uppercase tracking-wider border shadow-sm",
                  resteAPayer === 0
                    ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                    : totalPayeDZD > 0
                      ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                      : "bg-rose-500/20 text-rose-300 border-rose-500/40"
                )}
              >
                {resteAPayer === 0 ? "🟢 Soldé Intégralement" : totalPayeDZD > 0 ? `🟡 Acompte (${pourcentagePaye}%)` : "🔴 En Attente de Règlement"}
              </Badge>
            </div>
          </div>

          {/* ── 3 Big KPIs & Progress Bar ───────────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 pt-4 border-t border-white/10">
            <div className="p-3 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">Total de la Vente</span>
              <span className="text-lg font-black text-white">{fmtDZD(totalVente)}</span>
            </div>

            <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 backdrop-blur-md">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-300">Total Encaissé</span>
                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/20 px-1.5 py-0.5 rounded">
                  {paiements.length} {paiements.length > 1 ? 'versements' : 'versement'}
                </span>
              </div>
              <span className="text-lg font-black text-emerald-400">{fmtDZD(totalPayeDZD)}</span>
            </div>

            <div className={cn(
              "p-3 rounded-2xl border backdrop-blur-md transition-colors",
              resteAPayer === 0 
                ? "bg-emerald-950/40 border-emerald-500/30" 
                : "bg-rose-500/10 border-rose-500/20"
            )}>
              <span className={cn(
                "text-[10px] uppercase font-bold tracking-wider block",
                resteAPayer === 0 ? "text-emerald-400" : "text-rose-300"
              )}>
                Reste à Payer
              </span>
              <span className={cn(
                "text-lg font-black",
                resteAPayer === 0 ? "text-emerald-400" : "text-rose-400"
              )}>
                {fmtDZD(resteAPayer)}
              </span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-3 space-y-1">
            <div className="flex justify-between text-[11px] font-bold text-slate-400">
              <span>Progression du règlement</span>
              <span className="text-emerald-400 font-extrabold">{pourcentagePaye}% encaissé</span>
            </div>
            <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden p-0.5 border border-white/10">
              <div 
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500 shadow-sm"
                style={{ width: `${pourcentagePaye}%` }}
              />
            </div>
          </div>
        </div>

        {/* ── Main Content Area ──────────────────────────────────────────────── */}
        <div className="p-6 space-y-6 max-h-[calc(90vh-220px)] overflow-y-auto">
          
          {/* ── SECTION 1: FORMULAIRE DE VERSEMENT (MULTI-DEVISES) ──────────── */}
          <form onSubmit={handleSubmitPayment} className="p-5 rounded-2xl bg-gradient-to-b from-muted/50 via-card to-card border border-border/80 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/60 pb-3">
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider text-foreground flex items-center gap-2">
                  <Coins size={16} className="text-emerald-600 dark:text-emerald-400" />
                  <span>{isEditing ? 'Modifier le Versement' : 'Nouveau Versement / Encaissement'}</span>
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Prend en charge toutes les devises (DZD, EUR, USD, SAR...) avec conversion en temps réel.
                </p>
              </div>

              {resteAPayer > 0 && !isEditing && (
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  onClick={handleFillRemaining}
                  className="h-7 text-xs font-bold gap-1.5 rounded-xl border-emerald-500/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                >
                  <Sparkles size={12} className="text-emerald-600" />
                  Régler le solde ({fmtDZD(resteAPayer)})
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5">
              
              {/* Date */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-foreground flex items-center gap-1">
                  <Calendar size={12} className="text-primary" /> Date de Versement
                </Label>
                <Input 
                  type="date" 
                  value={datePaiement} 
                  onChange={e => setDatePaiement(e.target.value)} 
                  required
                  className="h-9 text-xs bg-background rounded-xl font-medium"
                />
              </div>

              {/* Payeur */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-foreground flex items-center gap-1">
                  <User size={12} className="text-primary" /> Nom du Payeur
                </Label>
                <Input 
                  placeholder="Nom de la personne" 
                  value={nomPayeur} 
                  onChange={e => setNomPayeur(e.target.value)} 
                  required
                  className="h-9 text-xs bg-background rounded-xl font-medium"
                />
              </div>

              {/* Attribution Passager (Optionnel) */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-foreground">
                  Bénéficiaire / Passager
                </Label>
                <Select 
                  value={passagerNom} 
                  onChange={e => setPassagerNom(e.target.value)}
                  className="h-9 text-xs bg-background rounded-xl font-medium"
                >
                  <option value="">Tous / Global Vente</option>
                  {passagersList.map((p, idx) => (
                    <option key={idx} value={p.nom}>
                      👤 {p.nom} {p.passport ? `[${p.passport}]` : ''}
                    </option>
                  ))}
                </Select>
              </div>

              {/* N° Reçu / Bon */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-foreground flex items-center gap-1">
                  <FileText size={12} className="text-primary" /> N° Reçu / Bon
                </Label>
                <Input 
                  placeholder="ex: REC-2026-0001" 
                  value={numRecu} 
                  onChange={e => setNumRecu(e.target.value)} 
                  className="h-9 text-xs bg-background rounded-xl font-mono"
                />
              </div>
            </div>

            {/* ── ROW 2: DEVISE, MONTANT, TAUX ET CONVERSION ──────────────── */}
            <div className="p-3.5 rounded-xl bg-emerald-500/5 dark:bg-emerald-950/20 border border-emerald-500/20 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5 items-end">
              
              {/* Devise */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-emerald-900 dark:text-emerald-300">
                  Devise Reçue
                </Label>
                <Select 
                  value={devise} 
                  onChange={e => setDevise(e.target.value)}
                  className="h-9 text-xs bg-background rounded-xl font-bold"
                >
                  {CURRENCY_LIST.map(c => (
                    <option key={c.code} value={c.code}>
                      {c.flag} {c.code} ({c.symbol})
                    </option>
                  ))}
                </Select>
              </div>

              {/* Montant Original */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-emerald-900 dark:text-emerald-300">
                  Montant en {devise}
                </Label>
                <Input 
                  type="number"
                  step="any"
                  min="0"
                  placeholder="0.00"
                  value={montantOriginal}
                  onChange={e => setMontantOriginal(e.target.value)}
                  required
                  className="h-9 text-xs bg-background rounded-xl font-black text-foreground"
                />
              </div>

              {/* Taux de Change (si devise != DZD) */}
              {devise !== 'DZD' ? (
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-emerald-900 dark:text-emerald-300">
                    Taux (1 {devise} = X DZD)
                  </Label>
                  <Input 
                    type="number"
                    step="any"
                    min="0"
                    placeholder="Taux"
                    value={tauxChange}
                    onChange={e => setTauxChange(e.target.value)}
                    required
                    className="h-9 text-xs bg-background rounded-xl font-bold text-foreground"
                  />
                </div>
              ) : (
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-muted-foreground">Taux Appliqué</Label>
                  <div className="h-9 px-3 rounded-xl bg-muted/40 border flex items-center text-xs text-muted-foreground font-semibold">
                    1 DZD = 1 DZD (Monnaie nationale)
                  </div>
                </div>
              )}

              {/* Montant Équivalent en DZD (Calculé) */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-emerald-900 dark:text-emerald-300">
                  Total Converti en DZD
                </Label>
                <div className="h-9 px-3 rounded-xl bg-emerald-100 dark:bg-emerald-900/60 border border-emerald-300 dark:border-emerald-700 flex items-center justify-between font-black text-xs text-emerald-950 dark:text-emerald-100">
                  <span>{fmtDZD(currentMontantDZD)}</span>
                  {devise !== 'DZD' && currentMontantOriginal > 0 && (
                    <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                      ({currentMontantOriginal} {devise})
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* ── ROW 3: MOYEN DE PAIEMENT & NOTES ───────────────────────── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5 items-end">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-foreground">Moyen de Paiement</Label>
                <Select 
                  value={moyenPaiement} 
                  onChange={e => setMoyenPaiement(e.target.value)}
                  className="h-9 text-xs bg-background rounded-xl font-bold"
                >
                  {MOYENS_PAIEMENT.map(m => (
                    <option key={m.id} value={m.id}>{m.label}</option>
                  ))}
                </Select>
              </div>

              <div className="space-y-1.5 md:col-span-2 flex items-center gap-2">
                <div className="flex-1 space-y-1.5">
                  <Label className="text-xs font-bold text-foreground">Remarques / Observations (Optionnel)</Label>
                  <Input 
                    placeholder="ex: Acompte espèces remis à l'agence..." 
                    value={notes} 
                    onChange={e => setNotes(e.target.value)} 
                    className="h-9 text-xs bg-background rounded-xl font-medium"
                  />
                </div>

                <div className="flex gap-2 shrink-0 pt-5">
                  {isEditing && (
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={resetForm}
                      className="h-9 text-xs font-bold rounded-xl"
                    >
                      Annuler
                    </Button>
                  )}
                  <Button 
                    type="submit" 
                    disabled={saving}
                    className="h-9 px-4 text-xs font-black rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                  >
                    {saving ? (
                      <RefreshCw size={14} className="animate-spin mr-1.5" />
                    ) : (
                      <Check size={14} className="mr-1.5" />
                    )}
                    {isEditing ? 'Mettre à jour' : 'Encaisser le versement'}
                  </Button>
                </div>
              </div>
            </div>
          </form>

          {/* ── SECTION 2: HISTORIQUE DES TRANCHES / VERSEMENTS ────────────── */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-wider text-foreground flex items-center gap-2">
                <Wallet size={15} className="text-primary" />
                <span>Historique des Versements ({paiements.length})</span>
              </h3>
              <span className="text-xs text-muted-foreground">
                Total réglé : <strong className="text-emerald-600 dark:text-emerald-400 font-black">{fmtDZD(totalPayeDZD)}</strong> sur {fmtDZD(totalVente)}
              </span>
            </div>

            {loading ? (
              <div className="py-12 flex flex-col items-center justify-center text-muted-foreground gap-2">
                <RefreshCw size={24} className="animate-spin text-primary" />
                <span className="text-xs font-medium">Chargement des paiements...</span>
              </div>
            ) : paiements.length === 0 ? (
              <div className="py-10 px-4 rounded-2xl border border-dashed border-border/80 text-center space-y-2 bg-muted/20">
                <div className="w-10 h-10 rounded-2xl bg-muted flex items-center justify-center mx-auto text-muted-foreground">
                  <Coins size={20} />
                </div>
                <h4 className="text-sm font-bold text-foreground">Aucun versement enregistré</h4>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  Cette vente n'a pas encore de paiement enregistré. Utilisez le formulaire ci-dessus pour ajouter un premier acompte ou solder la vente.
                </p>
              </div>
            ) : (
              <div className="border border-border/80 rounded-2xl overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-muted/60 text-muted-foreground font-black uppercase tracking-wider border-b border-border/80 text-[10px]">
                      <tr>
                        <th className="px-3.5 py-3">Date</th>
                        <th className="px-3.5 py-3">N° Reçu</th>
                        <th className="px-3.5 py-3">Payeur / Passager</th>
                        <th className="px-3.5 py-3">Saisi par</th>
                        <th className="px-3.5 py-3">Moyen</th>
                        <th className="px-3.5 py-3 text-right">Montant Devise</th>
                        <th className="px-3.5 py-3 text-right">Équivalent DZD</th>
                        <th className="px-3.5 py-3">Remarques</th>
                        <th className="px-3.5 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {paiements.map((p, idx) => {
                        const isForeign = p.devise && p.devise !== 'DZD';
                        const curInfo = CURRENCY_LIST.find(c => c.code === p.devise);

                        return (
                          <tr key={p.id || idx} className="hover:bg-muted/30 transition-colors">
                            <td className="px-3.5 py-3 font-semibold text-foreground whitespace-nowrap">
                              {p.date_paiement ? format(new Date(p.date_paiement), 'dd MMM yyyy', { locale: fr }) : '—'}
                            </td>

                            <td className="px-3.5 py-3 whitespace-nowrap">
                              <span className="font-mono text-[11px] bg-muted px-2 py-0.5 rounded border font-bold text-foreground">
                                {p.num_recu || `REC-${idx + 1}`}
                              </span>
                            </td>

                            <td className="px-3.5 py-3">
                              <div className="font-bold text-foreground truncate max-w-[150px]">
                                {p.nom_payeur || 'Client'}
                              </div>
                              {p.passager_nom && (
                                <div className="text-[10px] text-muted-foreground truncate max-w-[150px]">
                                  👤 Pax : {p.passager_nom}
                                </div>
                              )}
                            </td>

                            <td className="px-3.5 py-3 whitespace-nowrap">
                              <span className="inline-flex items-center gap-1 font-bold text-[10px] bg-muted/60 px-2 py-0.5 rounded-md border text-foreground">
                                <User size={10} className="text-primary" />
                                <span>{p.created_by_name || 'Admin'}</span>
                              </span>
                            </td>

                            <td className="px-3.5 py-3 whitespace-nowrap">
                              <span className="inline-flex items-center gap-1 font-semibold text-foreground">
                                {p.moyen_paiement || 'Espèce'}
                              </span>
                            </td>

                            <td className="px-3.5 py-3 text-right whitespace-nowrap">
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

                            <td className="px-3.5 py-3 text-right whitespace-nowrap font-black text-emerald-600 dark:text-emerald-400 text-sm">
                              {fmtDZD(p.montant_dzd)}
                            </td>

                            <td className="px-3.5 py-3 text-muted-foreground max-w-[160px] truncate text-[11px]">
                              {p.notes || '—'}
                            </td>

                            <td className="px-3.5 py-3 text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-1">
                                <Button 
                                  variant="outline" 
                                  size="icon-sm" 
                                  onClick={() => handlePrintReceipt(p)} 
                                  title="Imprimer Reçu PDF"
                                  className="h-7 w-7 rounded-lg text-muted-foreground hover:text-primary"
                                >
                                  <Printer size={13} />
                                </Button>
                                <Button 
                                  variant="outline" 
                                  size="icon-sm" 
                                  onClick={() => handleEditPayment(p)} 
                                  title="Modifier le versement"
                                  className="h-7 w-7 rounded-lg text-muted-foreground hover:text-amber-600"
                                >
                                  <Pencil size={13} />
                                </Button>
                                <Button 
                                  variant="destructive" 
                                  size="icon-sm" 
                                  onClick={() => handleDeletePayment(p.id, p.num_recu, p.montant_dzd)} 
                                  title="Supprimer le versement"
                                  className="h-7 w-7 rounded-lg"
                                >
                                  <Trash2 size={13} />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Footer ────────────────────────────────────────────────────────── */}
        <div className="px-6 py-4 border-t border-border/80 bg-muted/20 flex items-center justify-between">
          <div className="text-xs text-muted-foreground flex items-center gap-2">
            <span>Règlement :</span>
            <strong className="text-foreground">{fmtDZD(totalPayeDZD)} / {fmtDZD(totalVente)}</strong>
            <span className="text-muted-foreground">·</span>
            <span>Reste : <strong className={resteAPayer === 0 ? "text-emerald-600" : "text-rose-600"}>{fmtDZD(resteAPayer)}</strong></span>
          </div>

          <Button type="button" onClick={onClose} className="h-9 px-6 font-bold rounded-xl">
            Fermer
          </Button>
        </div>

      </DialogContent>
    </Dialog>
  );
};

export default VentePaiementsModal;
