import React, { useState, useEffect } from 'react';
import { FileText, Plus, Trash2, Hash, Calendar, DollarSign, User, FileSpreadsheet, Percent, CreditCard, Sparkles } from 'lucide-react';
import { format, addDays } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

const FactureForm = ({ transaction, type = 'facture', onClose, onGenerate, servicesList = [] }) => {
  const isProforma = type === 'proforma';
  const [numero, setNumero] = useState('');
  const [loadingNumber, setLoadingNumber] = useState(true);

  // Initialize initial items from transaction articles or details
  const initialItems = React.useMemo(() => {
    if (transaction?.articles && Array.isArray(transaction.articles) && transaction.articles.length > 0) {
      return transaction.articles.map(art => {
        const descParts = [];
        if (art.categorie && art.categorie !== 'Service') descParts.push(`[${art.categorie}]`);
        if (art.designation) descParts.push(art.designation);
        if (art.details && art.details !== art.designation) descParts.push(art.details);
        return {
          categorie: art.categorie || 'Prestation',
          description: descParts.join(' - ') || 'Prestation de service',
          quantite: Number(art.quantite) || 1,
          prix_unitaire: Number(art.prix_vente) || 0,
          total: (Number(art.quantite) || 1) * (Number(art.prix_vente) || 0)
        };
      });
    }

    if (transaction?.total || transaction?.details) {
      return [{
        description: transaction?.details || 'Prestation de service',
        quantite: 1,
        prix_unitaire: parseFloat(transaction?.total) || 0,
        total: parseFloat(transaction?.total) || 0
      }];
    }

    return [{ description: '', quantite: 1, prix_unitaire: 0, total: 0 }];
  }, [transaction]);

  const [items, setItems] = useState(initialItems);

  const [formData, setFormData] = useState({
    clientNomOverride: transaction?.client_nom || transaction?.clientNom || '',
    details: transaction?.details || '',
    taxePercentage: 0,
    deadline: format(addDays(new Date(), 30), 'yyyy-MM-dd'),
    moyenPaiement: transaction?.moyen_paiement || 'espèce'
  });

  // Automatically suggest next sequential number on mount
  useEffect(() => {
    const fetchNextNumber = async () => {
      setLoadingNumber(true);
      try {
        const year = new Date().getFullYear();
        const { data: lastInvoice } = await supabase
          .from('factures')
          .select('numero')
          .eq('type_doc', type)
          .like('numero', `%/${year}`)
          .order('date_creation', { ascending: false })
          .limit(1);

        let nextNumStr = `001/${year}`;
        if (lastInvoice && lastInvoice.length > 0 && lastInvoice[0]?.numero) {
          const parts = lastInvoice[0].numero.split('/');
          const lastNum = parseInt(parts[0], 10);
          if (!isNaN(lastNum)) {
            nextNumStr = `${(lastNum + 1).toString().padStart(3, '0')}/${year}`;
          }
        }
        setNumero(nextNumStr);
      } catch (err) {
        console.warn('Erreur lors de la récupération du numéro séquentiel:', err);
        const year = new Date().getFullYear();
        setNumero(`001/${year}`);
      } finally {
        setLoadingNumber(false);
      }
    };

    fetchNextNumber();
  }, [type]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleItemChange = (index, field, value) => {
    setItems(prevItems => {
      const updated = [...prevItems];
      const item = { ...updated[index], [field]: value };
      if (field === 'quantite' || field === 'prix_unitaire') {
        const qte = parseFloat(item.quantite) || 0;
        const pu = parseFloat(item.prix_unitaire) || 0;
        item.total = qte * pu;
      }
      updated[index] = item;
      return updated;
    });
  };

  const handleAddItem = () => {
    setItems(prev => [
      ...prev,
      { description: '', quantite: 1, prix_unitaire: 0, total: 0 }
    ]);
  };

  const handleRemoveItem = (index) => {
    if (items.length <= 1) {
      setItems([{ description: '', quantite: 1, prix_unitaire: 0, total: 0 }]);
      return;
    }
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  // Compute live totals
  const totalHT = items.reduce((acc, it) => acc + (parseFloat(it.total) || 0), 0);
  const taxeRate = parseFloat(formData.taxePercentage) || 0;
  const montantTaxe = (totalHT * taxeRate) / 100;
  const totalTTC = totalHT + montantTaxe;

  const fmtCurrency = (val) => new Intl.NumberFormat('fr-DZ', { style: 'currency', currency: 'DZD' }).format(val || 0);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!numero.trim()) {
      alert("Veuillez renseigner un numéro de document valide.");
      return;
    }

    onGenerate({
      ...transaction,
      id: transaction?.id,
      numero: numero.trim(),
      items: items.map(it => ({
        ...it,
        quantite: parseFloat(it.quantite) || 1,
        prix_unitaire: parseFloat(it.prix_unitaire) || 0,
        total: (parseFloat(it.quantite) || 1) * (parseFloat(it.prix_unitaire) || 0)
      })),
      total_ht: totalHT,
      total_ttc: totalTTC,
      invoiceType: type,
      invoiceDetails: {
        ...formData,
        numero: numero.trim(),
        taxePercentage: taxeRate
      }
    });
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="p-0 overflow-hidden max-w-4xl max-h-[92vh] flex flex-col" onClose={onClose}>
        {/* Header */}
        <div className="bg-gradient-to-r from-primary/15 via-primary/5 to-transparent px-6 py-5 border-b shrink-0">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="text-2xl font-black flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-primary/10 text-primary">
                  <FileText size={22} />
                </div>
                <span>Générer un {isProforma ? 'Devis / Proforma' : 'Facture Client'}</span>
              </DialogTitle>
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
                {isProforma ? 'PROFORMA' : 'FACTURE OFFICIELLE'}
              </span>
            </div>
          </DialogHeader>
        </div>

        {/* Scrollable Form Body */}
        <form id="facture-form-builder" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Header Info Banner if transaction has details */}
          {transaction && (
            <div className="rounded-2xl bg-muted/40 border p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div>
                <p className="text-[10px] uppercase tracking-widest font-black text-muted-foreground">Transaction liée</p>
                <p className="font-bold text-foreground text-sm mt-0.5">
                  {transaction.client_nom || 'Client'} — {transaction.details || 'Prestation'}
                </p>
              </div>
              <div className="text-right sm:border-l sm:pl-4">
                <span className="text-muted-foreground">Montant vente :</span>
                <span className="font-black text-primary text-sm ml-1.5">{fmtCurrency(transaction.total)}</span>
              </div>
            </div>
          )}

          {/* Top Parameters Grid: Facture Number, Client, Date, Payment, Tax */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Facture Number (Editable) */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Hash size={14} className="text-primary" />
                Numéro de {isProforma ? 'Proforma' : 'Facture'}
              </Label>
              <div className="relative">
                <Input
                  name="numero"
                  required
                  value={numero}
                  onChange={(e) => setNumero(e.target.value)}
                  placeholder="ex: 001/2026"
                  className="h-10 font-bold text-primary bg-muted/20 focus-visible:bg-transparent font-mono transition-colors"
                />
                {loadingNumber && (
                  <span className="absolute right-3 top-2.5 text-[10px] text-muted-foreground animate-pulse">
                    Génération auto...
                  </span>
                )}
              </div>
              <p className="text-[10px] text-muted-foreground">Modifiable librement (ex: 001/2026, FAC-26-001...)</p>
            </div>

            {/* Client Name */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <User size={14} className="text-primary" />
                Nom du Client / Société
              </Label>
              <Input
                name="clientNomOverride"
                required
                value={formData.clientNomOverride}
                onChange={handleChange}
                placeholder="Nom du client"
                className="h-10 bg-muted/20 focus-visible:bg-transparent transition-colors"
              />
            </div>

            {/* General Details / Reference */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <FileSpreadsheet size={14} className="text-primary" />
                Détails / Réf. globale
              </Label>
              <Input
                name="details"
                value={formData.details}
                onChange={handleChange}
                placeholder="ex: Séjour Turquie, Vol Alger..."
                className="h-10 bg-muted/20 focus-visible:bg-transparent transition-colors"
              />
            </div>

            {/* Payment Deadline */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Calendar size={14} className="text-primary" />
                Échéance de paiement
              </Label>
              <Input
                type="date"
                name="deadline"
                required
                value={formData.deadline}
                onChange={handleChange}
                className="h-10 bg-muted/20 focus-visible:bg-transparent transition-colors"
              />
            </div>

            {/* Moyen de Paiement */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <CreditCard size={14} className="text-primary" />
                Moyen de paiement
              </Label>
              <Select
                name="moyenPaiement"
                value={formData.moyenPaiement}
                onChange={handleChange}
                className="h-10 bg-muted/20 focus-visible:bg-transparent transition-colors"
              >
                <option value="espèce">Espèce</option>
                <option value="chèque">Chèque</option>
                <option value="versement">Versement</option>
                <option value="virement bancaire">Virement bancaire</option>
              </Select>
            </div>

            {/* Tax (%) */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Percent size={14} className="text-primary" />
                Taxe / TVA (%)
              </Label>
              <Input
                type="number"
                name="taxePercentage"
                min="0"
                max="100"
                step="any"
                value={formData.taxePercentage}
                onChange={handleChange}
                className="h-10 bg-muted/20 focus-visible:bg-transparent transition-colors"
              />
            </div>
          </div>

          {/* Facture Items / Articles Builder */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between pb-2 border-b">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black text-foreground uppercase tracking-wider">
                  Articles & Lignes de Facturation
                </h3>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                  {items.length} {items.length > 1 ? 'lignes' : 'ligne'}
                </span>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleAddItem}
                className="h-8 text-xs font-bold gap-1.5 hover:border-primary hover:text-primary transition-all shadow-sm"
              >
                <Plus size={14} /> Ajouter une ligne
              </Button>
            </div>

            <div className="space-y-3">
              {items.map((item, idx) => (
                <div
                  key={idx}
                  className="group relative rounded-2xl border bg-card/60 p-4 shadow-sm hover:border-primary/40 transition-all space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-muted-foreground flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[11px] font-bold">
                        {idx + 1}
                      </span>
                      Ligne #{idx + 1}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:bg-destructive/10 h-7 px-2 text-xs font-semibold"
                      onClick={() => handleRemoveItem(idx)}
                      disabled={items.length === 1 && !item.description && !item.prix_unitaire}
                      title="Supprimer cette ligne"
                    >
                      <Trash2 size={13} className="mr-1" /> Supprimer
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-start">
                    {/* Multiline Description Textarea */}
                    <div className="md:col-span-6 space-y-1">
                      <Label className="text-[11px] font-bold text-muted-foreground">
                        Description de la prestation (multilignes autorisées)
                      </Label>
                      <Textarea
                        rows={2}
                        placeholder="Détails du service, itinéraire, conditions... (appuyez sur Entrée pour sauter une ligne)"
                        value={item.description || ''}
                        onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                        className="min-h-[60px] resize-y bg-muted/20 text-xs leading-relaxed focus-visible:bg-transparent"
                      />
                    </div>

                    {/* Quantité */}
                    <div className="md:col-span-2 space-y-1">
                      <Label className="text-[11px] font-bold text-muted-foreground">Quantité</Label>
                      <Input
                        type="number"
                        min="1"
                        step="any"
                        placeholder="Qté"
                        value={item.quantite}
                        onChange={(e) => handleItemChange(idx, 'quantite', e.target.value)}
                        className="h-10 bg-muted/20 text-center font-bold text-xs"
                      />
                    </div>

                    {/* Prix Unitaire HT */}
                    <div className="md:col-span-2 space-y-1">
                      <Label className="text-[11px] font-bold text-muted-foreground">Prix Unit. HT</Label>
                      <Input
                        type="number"
                        min="0"
                        step="any"
                        placeholder="0.00"
                        value={item.prix_unitaire}
                        onChange={(e) => handleItemChange(idx, 'prix_unitaire', e.target.value)}
                        className="h-10 bg-muted/20 text-right font-bold text-xs"
                      />
                    </div>

                    {/* Total Ligne HT (Calculé) */}
                    <div className="md:col-span-2 space-y-1">
                      <Label className="text-[11px] font-bold text-muted-foreground">Total HT</Label>
                      <div className="h-10 px-3 flex items-center justify-end rounded-lg bg-muted/40 border text-xs font-black text-foreground">
                        {fmtCurrency(item.total)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Totals Summary Card */}
          <div className="rounded-2xl border bg-gradient-to-br from-card via-muted/20 to-card p-5 shadow-sm space-y-2.5">
            <div className="flex justify-between items-center text-xs text-muted-foreground">
              <span>Total HT :</span>
              <span className="font-bold text-foreground text-sm">{fmtCurrency(totalHT)}</span>
            </div>
            {taxeRate > 0 && (
              <div className="flex justify-between items-center text-xs text-muted-foreground">
                <span>TVA ({taxeRate}%) :</span>
                <span className="font-bold text-foreground text-sm">{fmtCurrency(montantTaxe)}</span>
              </div>
            )}
            <div className="border-t pt-2.5 flex justify-between items-center">
              <span className="text-sm font-black uppercase tracking-wider text-foreground">
                Total TTC à Facturer :
              </span>
              <span className="text-xl font-black text-primary tabular-nums">
                {fmtCurrency(totalTTC)}
              </span>
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="p-4 border-t bg-muted/10 shrink-0 flex items-center justify-end gap-3">
          <Button type="button" variant="outline" onClick={onClose} className="h-10 px-5">
            Annuler
          </Button>
          <Button type="submit" form="facture-form-builder" className="h-10 px-7 font-bold shadow-md">
            <FileText size={16} className="mr-2" />
            Générer {isProforma ? 'le Proforma' : 'la Facture'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FactureForm;
