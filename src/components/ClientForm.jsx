import React, { useState } from 'react';
import { X, UserPlus, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

const ClientForm = ({ onClose, onSave, initialData }) => {
  const [formData, setFormData] = useState(initialData || {
    type: 'Particulier',
    nom: '',
    email: '',
    telephone: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.nom) return;
    onSave(formData);
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="p-0 overflow-hidden" onClose={onClose}>
        <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent px-6 py-5 border-b">
          <DialogHeader>
            <DialogTitle className="text-2xl font-extrabold flex items-center gap-2">
              {initialData ? <Pencil className="text-primary" size={24} /> : <UserPlus className="text-primary" size={24} />}
              {initialData ? 'Modifier le Client' : 'Ajouter un Client'}
            </DialogTitle>
          </DialogHeader>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Type Toggle */}
          <div className="flex gap-1 p-1 bg-muted rounded-lg">
            {['Particulier', 'Entreprise'].map(type => (
              <button
                key={type}
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, type }))}
                className={`flex-1 py-2.5 text-sm font-bold rounded-md transition-all ${
                  formData.type === type 
                    ? 'bg-background text-foreground shadow-sm' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {type}
              </button>
            ))}
          </div>

          <div className="space-y-2.5">
            <Label className="text-sm font-bold text-foreground">
              {formData.type === 'Entreprise' ? "Nom de l'entreprise" : 'Nom Complet'} <span className="text-red-500">*</span>
            </Label>
            <Input id="nom" name="nom" required value={formData.nom} onChange={handleChange} className="h-11 bg-muted/20 focus-visible:bg-transparent transition-colors" placeholder={formData.type === 'Entreprise' ? "Ex: SARL Voyage Pro" : "Ex: Ahmed Yassine"} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2.5">
              <Label className="text-sm font-bold text-foreground">Email</Label>
              <Input id="email" name="email" type="email" value={formData.email} onChange={handleChange} className="h-11 bg-muted/20 focus-visible:bg-transparent transition-colors" placeholder="exemple@email.com" />
            </div>
            <div className="space-y-2.5">
              <Label className="text-sm font-bold text-foreground">Téléphone</Label>
              <Input id="telephone" name="telephone" value={formData.telephone} onChange={handleChange} className="h-11 bg-muted/20 focus-visible:bg-transparent transition-colors" placeholder="Ex: 0555..." />
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="h-11 px-6">Annuler</Button>
            <Button type="submit" className="h-11 px-8">Enregistrer</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ClientForm;
