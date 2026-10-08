import React, { useState, useEffect, useMemo } from 'react';
import { 
  RotateCcw, ShieldAlert, DollarSign, Calendar, CreditCard, 
  FileText, CheckCircle2, AlertTriangle, Printer, Download, 
  HelpCircle, Sparkles, Building2, User, ArrowDownLeft, X, Coins
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { numberToFrenchWords, amountToFrench } from '@/lib/numberToFrenchWords';

const MOYENS_PAIEMENT = [
  { id: 'Espèce', label: '💵 Espèce / Cash' },
  { id: 'Virement bancaire', label: '🏦 Virement bancaire' },
  { id: 'Chèque', label: '🧾 Chèque bancaire' },
  { id: 'Versement CCP', label: '📮 Versement CCP / Poste' },
  { id: 'Carte bancaire', label: '💳 Carte bancaire' },
];

export const fmtDZD = (amount) => {
  return new Intl.NumberFormat('fr-DZ', { 
    style: 'currency', 
    currency: 'DZD',
    maximumFractionDigits: 0 
  }).format(amount || 0);
};

export default function VenteRemboursementModal({ 
  isOpen, 
  vente, 
  paiementsList = [], 
  onClose, 
  onSuccess 
}) {
  const { user, profile } = useAuth();
  
  const [dateRemboursement, setDateRemboursement] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [penaliteFournisseur, setPenaliteFournisseur] = useState('0');
  const [penaliteAgence, setPenaliteAgence] = useState('0');
  const [moyenPaiement, setMoyenPaiement] = useState('Espèce');
  const [motif, setMotif] = useState('');
  const [notes, setNotes] = useState('');
  const [numRecu, setNumRecu] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Existing total paid by client
  const montantEncaisse = useMemo(() => {
    if (paiementsList && paiementsList.length > 0) {
      return paiementsList.reduce((acc, p) => acc + (parseFloat(p.montant_dzd) || 0), 0);
    }
    return parseFloat(vente?.total) || 0;
  }, [paiementsList, vente]);

  const montantInitialVente = parseFloat(vente?.total) || 0;
  const numPenFournisseur = Math.max(0, parseFloat(penaliteFournisseur) || 0);
  const numPenAgence = Math.max(0, parseFloat(penaliteAgence) || 0);

  // Core Financial Formula:
  // Montant à restituer au client = Montant encaissé - Pénalité fournisseur - Pénalité agence
  const montantRembourseClient = Math.max(0, montantEncaisse - numPenFournisseur - numPenAgence);
  
  // Nouveau CA / Total Vente conservé = Pénalité Fournisseur + Pénalité Agence
  const nouveauTotalVente = numPenFournisseur + numPenAgence;
  const nouveauBeneficeAgence = numPenAgence;
  const nouveauCoutFournisseur = numPenFournisseur;

  useEffect(() => {
    if (isOpen && vente) {
      const year = new Date().getFullYear();
      generateNextRecuNumber(year);
      setError(null);
    }
  }, [isOpen, vente]);

  const generateNextRecuNumber = async (year) => {
    try {
      const { data } = await supabase
        .from('vente_remboursements')
        .select('num_recu_remboursement')
        .like('num_recu_remboursement', `RMB-${year}-%`)
        .order('created_at', { ascending: false })
        .limit(1);

      if (data && data.length > 0 && data[0].num_recu_remboursement) {
        const parts = data[0].num_recu_remboursement.split('-');
        const lastNum = parseInt(parts[2], 10) || 0;
        setNumRecu(`RMB-${year}-${(lastNum + 1).toString().padStart(4, '0')}`);
      } else {
        setNumRecu(`RMB-${year}-0001`);
      }
    } catch {
      setNumRecu(`RMB-${year}-0001`);
    }
  };

  // PDF Receipt Generation
  const exportPDF = (savedRecord = null) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const record = savedRecord || {
      num_recu_remboursement: numRecu,
      date_remboursement: dateRemboursement,
      client_nom: vente?.client_nom,
      montant_initial: montantInitialVente,
      montant_encaisse: montantEncaisse,
      penalite_fournisseur: numPenFournisseur,
      penalite_agence: numPenAgence,
      montant_rembourse_client: montantRembourseClient,
      moyen_paiement: moyenPaiement,
      motif: motif || 'Annulation à la demande du client',
      agent_nom: user?.user_metadata?.nom || user?.email?.split('@')[0] || 'Agence El-Mokhtar'
    };

    // Header Background Accent
    doc.setFillColor(15, 23, 42); // slate-900
    doc.rect(0, 0, pageWidth, 40, 'F');

    // Title & Brand
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('EL MOKHTAR TRAVEL', 14, 18);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(217, 119, 6); // amber-400
    doc.text('REÇU D\'AVOIR & DE REMBOURSEMENT CLIENT', 14, 26);

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.text(`Réf : ${record.num_recu_remboursement || numRecu}`, pageWidth - 14, 18, { align: 'right' });
    doc.text(`Date : ${format(new Date(record.date_remboursement), 'dd/MM/yyyy')}`, pageWidth - 14, 26, { align: 'right' });

    // Client Info Box
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(14, 48, pageWidth - 28, 28, 3, 3, 'FD');

    doc.setTextColor(51, 65, 85);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('Bénéficiaire du Remboursement :', 20, 58);
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text(record.client_nom || 'Client', 20, 68);

    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(`Mode de restitution : ${record.moyen_paiement}`, pageWidth - 20, 58, { align: 'right' });
    doc.text(`Motif : ${record.motif || 'Annulation'}`, pageWidth - 20, 68, { align: 'right' });

    // Financial Breakdown Table
    const tableBody = [
      ['Montant Initial Payé par le Client', `${fmtDZD(record.montant_encaisse)}`],
      ['Déduction — Pénalité Fournisseur de service (retenue compagnie/prestataire)', `- ${fmtDZD(record.penalite_fournisseur)}`],
      ['Déduction — Pénalité / Frais de dossier Agence El-Mokhtar', `- ${fmtDZD(record.penalite_agence)}`],
    ];

    autoTable(doc, {
      startY: 85,
      head: [['Désignation & Décompte Financier', 'Montant (DZD)']],
      body: tableBody,
      theme: 'striped',
      headStyles: { fillColor: [30, 41, 59], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 9.5, cellPadding: 5 },
      columnStyles: {
        0: { cellWidth: 'auto' },
        1: { halign: 'right', fontStyle: 'bold' }
      }
    });

    const finalY = doc.lastAutoTable.finalY + 8;

    // Total Refund Highlight Box
    doc.setFillColor(236, 253, 245); // emerald-50
    doc.setDrawColor(52, 211, 153); // emerald-400
    doc.roundedRect(14, finalY, pageWidth - 28, 26, 3, 3, 'FD');

    doc.setTextColor(6, 95, 70);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('NET TOTAL REMBOURSÉ AU CLIENT :', 22, finalY + 11);

    doc.setFontSize(15);
    doc.setTextColor(4, 120, 87);
    doc.text(fmtDZD(record.montant_rembourse_client), pageWidth - 22, finalY + 13, { align: 'right' });

    // Amount in French letters
    const words = numberToFrenchWords(record.montant_rembourse_client);
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(71, 85, 105);
    doc.text(`Arrêté le présent avoir à la somme de : ${words} Dinars Algériens.`, 22, finalY + 21);

    // Signatures
    const sigY = finalY + 45;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(30, 41, 59);
    doc.text('Signature du Client :', 25, sigY);
    doc.text('Cachet & Signature Agence :', pageWidth - 70, sigY);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(148, 163, 184);
    doc.text('Reconnaît avoir reçu le montant mentionné ci-dessus.', 25, sigY + 6);
    doc.text(`Traité par : ${record.agent_nom}`, pageWidth - 70, sigY + 6);

    doc.save(`Recu_Remboursement_${record.num_recu_remboursement || 'Client'}.pdf`);
  };

  const handleConfirmRefund = async () => {
    if (!vente?.id) return;
    if (numPenFournisseur + numPenAgence > montantEncaisse) {
      if (!window.confirm("Attention : La somme des pénalités dépasse le montant encaissé. Voulez-vous continuer ?")) {
        return;
      }
    }

    setLoading(true);
    setError(null);

    try {
      const agentNom = user?.user_metadata?.nom || user?.email?.split('@')[0] || 'Agent';

      // 1. Enregistrer dans la table 'vente_remboursements'
      const refundPayload = {
        vente_id: vente.id,
        client_id: vente.client_id || null,
        client_nom: vente.client_nom,
        date_remboursement: dateRemboursement,
        montant_initial: montantInitialVente,
        montant_encaisse: montantEncaisse,
        penalite_fournisseur: numPenFournisseur,
        penalite_agence: numPenAgence,
        montant_rembourse_client: montantRembourseClient,
        moyen_paiement: moyenPaiement,
        num_recu_remboursement: numRecu,
        motif: motif.trim() || 'Remboursement et annulation client',
        agent_id: user?.id || null,
        agent_nom: agentNom,
        notes: notes.trim() || null
      };

      const { data: refundData, error: refundErr } = await supabase
        .from('vente_remboursements')
        .insert(refundPayload)
        .select()
        .single();

      if (refundErr) {
        console.warn("Table vente_remboursements note:", refundErr);
      }

      // 2. Enregistrer la sortie de caisse (Paiement Négatif) dans 'vente_paiements'
      if (montantRembourseClient > 0) {
        await supabase
          .from('vente_paiements')
          .insert({
            vente_id: vente.id,
            client_id: vente.client_id || null,
            nom_payeur: vente.client_nom,
            date_paiement: dateRemboursement,
            montant_original: -montantRembourseClient,
            devise: 'DZD',
            taux_change: 1,
            montant_dzd: -montantRembourseClient,
            moyen_paiement: moyenPaiement,
            num_recu: numRecu,
            notes: `Remboursement Client (Pénalité Fournisseur: ${fmtDZD(numPenFournisseur)}, Pénalité Agence: ${fmtDZD(numPenAgence)})`,
            created_by: user?.id || null,
            created_by_name: profile?.nom || user?.email?.split('@')[0] || 'Admin'
          });
      }

      // 3. Mettre à jour la Vente (Statut 'Remboursé', Nouveau Total net, Nouvelle Commission, Nouveau Tarif Base Fournisseur)
      const { error: venteErr } = await supabase
        .from('ventes')
        .update({
          etat: 'Remboursé',
          total: nouveauTotalVente,
          commission: nouveauBeneficeAgence,
          tarif_base: nouveauCoutFournisseur,
          details: `${vente.details ? vente.details + ' | ' : ''}[Remboursé le ${format(new Date(dateRemboursement), 'dd/MM/yyyy')} — Restitué: ${fmtDZD(montantRembourseClient)}, Pén. Fournisseur: ${fmtDZD(numPenFournisseur)}, Pén. Agence: ${fmtDZD(numPenAgence)}]`
        })
        .eq('id', vente.id);

      if (venteErr) throw venteErr;

      // Si la vente a des articles, mettre à jour le prix_achat dans vente_articles
      if (vente.articles && Array.isArray(vente.articles) && vente.articles.length > 0) {
        if (vente.articles.length === 1) {
          await supabase
            .from('vente_articles')
            .update({
              prix_achat: nouveauCoutFournisseur,
              prix_vente: nouveauTotalVente,
              commission: nouveauBeneficeAgence
            })
            .eq('id', vente.articles[0].id);
        }
      }

      // 4. Télécharger automatiquement le reçu PDF
      exportPDF(refundPayload);

      if (onSuccess) {
        onSuccess({
          ...vente,
          etat: 'Remboursé',
          total: nouveauTotalVente,
          commission: nouveauBeneficeAgence,
          tarif_base: nouveauCoutFournisseur
        });
      }

      onClose();
    } catch (err) {
      console.error("Erreur enregistrement remboursement:", err);
      setError(err.message || "Erreur lors de l'enregistrement du remboursement.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl bg-white dark:bg-card text-foreground rounded-3xl p-0 overflow-hidden shadow-2xl border border-border">
        
        {/* Header */}
        <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 shrink-0">
              <RotateCcw size={20} />
            </div>
            <div>
              <DialogTitle className="text-base font-black text-white">
                Remboursement & Annulation de Vente
              </DialogTitle>
              <p className="text-xs text-slate-400">
                Calcul automatique des pénalités fournisseur et agence
              </p>
            </div>
          </div>
          <Badge className="bg-rose-500/20 text-rose-300 border-rose-500/40 text-[10px] font-black uppercase">
            Réf : {numRecu || 'RMB-0001'}
          </Badge>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto custom-scrollbar">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertTriangle size={16} className="shrink-0 text-rose-500" />
              <span>{error}</span>
            </div>
          )}

          {/* Vente Initial Summary Card */}
          <div className="p-4 rounded-2xl bg-muted/40 border border-border/80 flex items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase text-muted-foreground tracking-wider">Client concerné</span>
              <h4 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                <User size={14} className="text-primary" />
                <span>{vente?.client_nom || 'Client'}</span>
              </h4>
              <p className="text-[11px] text-muted-foreground truncate max-w-sm">
                {vente?.details || 'Détails de la vente'}
              </p>
            </div>

            <div className="text-right space-y-1">
              <span className="text-[10px] font-black uppercase text-muted-foreground tracking-wider">Total Encaissé</span>
              <p className="text-base font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
                {fmtDZD(montantEncaisse)}
              </p>
              <span className="text-[10px] text-muted-foreground block">
                Prix initial : {fmtDZD(montantInitialVente)}
              </span>
            </div>
          </div>

          {/* Inputs Section */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Pénalité Fournisseur */}
            <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-black text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                  <Building2 size={14} />
                  <span>Pénalité Fournisseur (DZD)</span>
                </Label>
                <span className="text-[10px] font-bold text-amber-600">Retenu par le prestataire</span>
              </div>
              <Input
                type="number"
                min="0"
                step="100"
                placeholder="Ex: 1000"
                value={penaliteFournisseur}
                onChange={(e) => setPenaliteFournisseur(e.target.value)}
                className="bg-white dark:bg-card text-base font-black text-foreground border-amber-300 dark:border-amber-700/50 focus:border-amber-500"
              />
              <p className="text-[10px] text-muted-foreground">
                Total final dû au fournisseur : <strong>{fmtDZD(numPenFournisseur)}</strong>
              </p>
            </div>

            {/* Pénalité Agence */}
            <div className="p-4 rounded-2xl bg-blue-500/5 border border-blue-500/20 space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-black text-blue-800 dark:text-blue-300 flex items-center gap-1.5">
                  <Coins size={14} />
                  <span>Pénalité Agence (DZD)</span>
                </Label>
                <span className="text-[10px] font-bold text-blue-600">Bénéfice conservé</span>
              </div>
              <Input
                type="number"
                min="0"
                step="100"
                placeholder="Ex: 1000"
                value={penaliteAgence}
                onChange={(e) => setPenaliteAgence(e.target.value)}
                className="bg-white dark:bg-card text-base font-black text-foreground border-blue-300 dark:border-blue-700/50 focus:border-blue-500"
              />
              <p className="text-[10px] text-muted-foreground">
                Nouveau bénéfice agence : <strong>{fmtDZD(numPenAgence)}</strong>
              </p>
            </div>
          </div>

          {/* Mode & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs font-bold text-foreground mb-1.5 block">
                Mode de restitution au client
              </Label>
              <Select value={moyenPaiement} onValueChange={setMoyenPaiement}>
                {MOYENS_PAIEMENT.map(m => (
                  <option key={m.id} value={m.id}>{m.label}</option>
                ))}
              </Select>
            </div>

            <div>
              <Label className="text-xs font-bold text-foreground mb-1.5 block">
                Date du remboursement
              </Label>
              <Input
                type="date"
                value={dateRemboursement}
                onChange={(e) => setDateRemboursement(e.target.value)}
                className="bg-white dark:bg-card"
              />
            </div>
          </div>

          {/* Motif & Notes */}
          <div>
            <Label className="text-xs font-bold text-foreground mb-1.5 block">
              Motif de l'annulation / Remboursement
            </Label>
            <Input
              type="text"
              placeholder="Ex: Annulation vol par la compagnie, demande du voyageur..."
              value={motif}
              onChange={(e) => setMotif(e.target.value)}
              className="bg-white dark:bg-card text-xs"
            />
          </div>

          {/* Real-time Calculation Summary Result */}
          <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-300 dark:border-emerald-700/50 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                <ArrowDownLeft size={16} />
                <span>Montant Net à Rendre au Client</span>
              </span>
              <span className="text-xl font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
                {fmtDZD(montantRembourseClient)}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-emerald-200 dark:border-emerald-800/40 text-[11px]">
              <div>
                <span className="text-muted-foreground block text-[10px]">Encaissé initial :</span>
                <span className="font-bold text-foreground">{fmtDZD(montantEncaisse)}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[10px]">Pén. Fournisseur :</span>
                <span className="font-bold text-amber-700 dark:text-amber-400">- {fmtDZD(numPenFournisseur)}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[10px]">Pén. Agence :</span>
                <span className="font-bold text-blue-700 dark:text-blue-400">- {fmtDZD(numPenAgence)}</span>
              </div>
            </div>
          </div>

        </div>

        {/* Footer */}
        <DialogFooter className="p-4 bg-muted/40 border-t border-border flex items-center justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={loading}
            className="text-xs"
          >
            Annuler
          </Button>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => exportPDF()}
              className="text-xs font-semibold flex items-center gap-1.5"
            >
              <Download size={13} />
              <span>Aperçu Reçu PDF</span>
            </Button>

            <Button
              type="button"
              onClick={handleConfirmRefund}
              disabled={loading}
              className="text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-600/20 flex items-center gap-1.5"
            >
              {loading ? (
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <CheckCircle2 size={14} />
              )}
              <span>Valider le Remboursement ({fmtDZD(montantRembourseClient)})</span>
            </Button>
          </div>
        </DialogFooter>

      </DialogContent>
    </Dialog>
  );
}
