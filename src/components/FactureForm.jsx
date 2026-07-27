import React, { useState } from 'react';
import { FileText } from 'lucide-react';
import { format, addDays } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

const FactureForm = ({ transaction, type, onClose, onGenerate }) => {
  const [formData, setFormData] = useState({
    clientNomOverride: transaction?.client_nom || transaction?.clientNom || '',
    taxePercentage: 0,
    deadline: format(addDays(new Date(), 30), 'yyyy-MM-dd'),
    moyenPaiement: 'espèce'
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onGenerate({ ...transaction, invoiceDetails: formData, invoiceType: type });
  };

  const isProforma = type === 'proforma';

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="p-0 overflow-hidden" onClose={onClose}>
        <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent px-6 py-5 border-b">
          <DialogHeader>
            <DialogTitle className="text-2xl font-extrabold flex items-center gap-2">
              <FileText className="text-primary" size={24} />
              Générer une {isProforma ? 'Proforma' : 'Facture'}
            </DialogTitle>
          </DialogHeader>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="rounded-xl bg-muted/30 border p-4">
            <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground mb-1">Transaction originale</p>
            <p className="font-bold text-sm">{transaction?.details || 'Sans détails'} — <span className="text-primary">{transaction?.total?.toLocaleString('fr-DZ')} DZD</span></p>
          </div>

          <div className="space-y-2.5">
            <Label className="text-sm font-bold text-foreground">Nom du Client</Label>
            <Input name="clientNomOverride" required value={formData.clientNomOverride} onChange={handleChange}
              placeholder="Modifier si nécessaire" className="h-11 bg-muted/20 focus-visible:bg-transparent transition-colors" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2.5">
              <Label className="text-sm font-bold text-foreground">Taxe (%)</Label>
              <Input type="number" name="taxePercentage" min="0" max="100"
                value={formData.taxePercentage} onChange={handleChange} className="h-11 bg-muted/20 focus-visible:bg-transparent transition-colors" />
            </div>
            <div className="space-y-2.5">
              <Label className="text-sm font-bold text-foreground">Échéance de paiement</Label>
              <Input type="date" name="deadline" required value={formData.deadline} onChange={handleChange} className="h-11 bg-muted/20 focus-visible:bg-transparent transition-colors" />
            </div>
          </div>

          <div className="space-y-2.5">
            <Label className="text-sm font-bold text-foreground">Moyen de paiement</Label>
            <Select name="moyenPaiement" value={formData.moyenPaiement} onChange={handleChange} className="h-11 bg-muted/20 focus-visible:bg-transparent transition-colors">
              <option value="espèce">Espèce</option>
              <option value="chèque">Chèque</option>
              <option value="versement">Versement</option>
              <option value="virement bancaire">Virement bancaire</option>
            </Select>
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="h-11 px-6">Annuler</Button>
            <Button type="submit" className="h-11 px-8"><FileText size={16} className="mr-2" /> Générer {isProforma ? 'Proforma' : 'Facture'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default FactureForm;
