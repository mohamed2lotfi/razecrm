import React, { useState, useEffect } from 'react';
import { FileDown, FileText, Trash2, Loader2, Download, Pencil, Plus, Check, Search, Hash } from 'lucide-react';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import FactureForm from '@/components/FactureForm';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { amountToFrench } from '@/lib/numberToFrenchWords';

const EditFactureModal = ({ doc, onClose, onSave }) => {
  const [formData, setFormData] = useState({ ...doc });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...(formData.items || [])];
    newItems[index] = { ...newItems[index], [field]: value };
    if (field === 'quantite' || field === 'prix_unitaire') {
      newItems[index].total = (parseFloat(newItems[index].quantite) || 0) * (parseFloat(newItems[index].prix_unitaire) || 0);
    }
    setFormData(prev => ({ ...prev, items: newItems }));
  };

  const handleAddItem = () => {
    const newItems = [...(formData.items || []), { description: '', quantite: 1, prix_unitaire: 0, total: 0 }];
    setFormData(prev => ({ ...prev, items: newItems }));
  };

  const handleRemoveItem = (index) => {
    const newItems = (formData.items || []).filter((_, i) => i !== index);
    setFormData(prev => ({ ...prev, items: newItems.length > 0 ? newItems : [{ description: '', quantite: 1, prix_unitaire: 0, total: 0 }] }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="p-0 overflow-hidden max-w-4xl max-h-[92vh] flex flex-col" onClose={onClose}>
        <div className="bg-gradient-to-r from-primary/15 via-primary/5 to-transparent px-6 py-5 border-b shrink-0">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black flex items-center gap-2">
              <Pencil className="text-primary" size={24} />
              Modifier {doc.type_doc === 'proforma' ? 'le Proforma' : 'la Facture'} N° {doc.numero}
            </DialogTitle>
          </DialogHeader>
        </div>
        
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Facture Number (Editable) */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Hash size={14} className="text-primary" />
                Numéro de {doc.type_doc === 'proforma' ? 'Proforma' : 'Facture'}
              </Label>
              <Input 
                name="numero" 
                value={formData.numero || ''} 
                onChange={handleChange} 
                required 
                className="h-10 font-mono font-bold text-primary bg-muted/20 focus-visible:bg-transparent transition-colors" 
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">Nom du Client</Label>
              <Input 
                name="client_nom" 
                value={formData.client_nom || ''} 
                onChange={handleChange} 
                required 
                className="h-10 bg-muted/20 focus-visible:bg-transparent transition-colors" 
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">Détails / Référence</Label>
              <Input 
                name="details" 
                value={formData.details || ''} 
                onChange={handleChange} 
                className="h-10 bg-muted/20 focus-visible:bg-transparent transition-colors" 
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">Moyen de Paiement</Label>
              <Select 
                name="moyen_paiement" 
                value={formData.moyen_paiement || ''} 
                onChange={handleChange} 
                className="h-10 bg-muted/20 focus-visible:bg-transparent transition-colors"
              >
                <option value="espèce">Espèce</option>
                <option value="chèque">Chèque</option>
                <option value="versement">Versement</option>
                <option value="virement bancaire">Virement bancaire</option>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">Échéance (Date)</Label>
              <Input 
                type="date" 
                name="deadline" 
                value={formData.deadline ? formData.deadline.split('T')[0] : ''} 
                onChange={handleChange} 
                className="h-10 bg-muted/20 focus-visible:bg-transparent transition-colors" 
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">Taxe / TVA (%)</Label>
              <Input 
                type="number" 
                name="taxe" 
                min="0"
                max="100"
                step="any"
                value={formData.taxe || 0} 
                onChange={handleChange} 
                className="h-10 bg-muted/20 focus-visible:bg-transparent transition-colors" 
              />
            </div>
          </div>

          {/* Lignes de facturation */}
          <div className="space-y-3 pt-2">
            <div className="flex justify-between items-center pb-2 border-b">
              <h3 className="text-sm font-black text-foreground uppercase tracking-wider">
                Articles & Lignes de Facturation
              </h3>
              <Button type="button" size="sm" variant="outline" onClick={handleAddItem} className="h-8 text-xs font-bold gap-1.5">
                <Plus size={14}/> Ajouter une ligne
              </Button>
            </div>
            
            <div className="space-y-3">
              {(formData.items || []).map((item, idx) => (
                <div key={idx} className="group relative rounded-2xl border bg-card/60 p-4 shadow-sm hover:border-primary/40 transition-all space-y-3">
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
                    >
                      <Trash2 size={13} className="mr-1"/> Supprimer
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-start">
                    {/* Multiline Description */}
                    <div className="md:col-span-6 space-y-1">
                      <Label className="text-[11px] font-bold text-muted-foreground">Description (multilignes)</Label>
                      <Textarea 
                        rows={2}
                        placeholder="Description du service / prestation..." 
                        value={item.description || ''} 
                        onChange={e => handleItemChange(idx, 'description', e.target.value)} 
                        className="min-h-[55px] resize-y bg-muted/20 text-xs leading-relaxed" 
                      />
                    </div>
                    <div className="md:col-span-2 space-y-1">
                      <Label className="text-[11px] font-bold text-muted-foreground">Quantité</Label>
                      <Input 
                        type="number" 
                        min="1"
                        step="any"
                        placeholder="Qté" 
                        value={item.quantite || 0} 
                        onChange={e => handleItemChange(idx, 'quantite', e.target.value)} 
                        className="h-10 bg-muted/20 text-center font-bold text-xs" 
                      />
                    </div>
                    <div className="md:col-span-2 space-y-1">
                      <Label className="text-[11px] font-bold text-muted-foreground">Prix unitaire HT</Label>
                      <Input 
                        type="number" 
                        min="0"
                        step="any"
                        placeholder="Prix unitaire" 
                        value={item.prix_unitaire || 0} 
                        onChange={e => handleItemChange(idx, 'prix_unitaire', e.target.value)} 
                        className="h-10 bg-muted/20 text-right font-bold text-xs" 
                      />
                    </div>
                    <div className="md:col-span-2 space-y-1">
                      <Label className="text-[11px] font-bold text-muted-foreground">Total HT</Label>
                      <div className="h-10 px-3 flex items-center justify-end rounded-lg bg-muted/40 border text-xs font-black text-foreground">
                        {((parseFloat(item.quantite) || 0) * (parseFloat(item.prix_unitaire) || 0)).toLocaleString('fr-DZ')} DA
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter className="pt-4 border-t shrink-0 flex items-center justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose} className="h-10 px-5">Annuler</Button>
            <Button type="submit" className="h-10 px-7 font-bold"><Check size={16} className="mr-2" /> Enregistrer les modifications</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

const Facturation = () => {
  const { isAdmin } = useAuth();
  const [factures, setFactures] = useState([]);
  const [proformas, setProformas] = useState([]);
  const [agencySettings, setAgencySettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('factures');
  const [editingDoc, setEditingDoc] = useState(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    
    // Fetch Agency Settings
    const { data: settings } = await supabase.from('agency_settings').select('*').single();
    if (settings) setAgencySettings(settings);

    // Fetch Invoices
    const { data, error } = await supabase.from('factures').select('*').order('date_creation', { ascending: false });
    
    if (!error && data) {
      setFactures(data.filter(d => d.type_doc === 'facture'));
      setProformas(data.filter(d => d.type_doc === 'proforma'));
    }
    setLoading(false);
  };

  const handleUpdate = async (updatedDoc) => {
    const total_ht = (updatedDoc.items || []).reduce((acc, item) => acc + ((parseFloat(item.quantite) || 0) * (parseFloat(item.prix_unitaire) || 0)), 0);
    const taxeVal = parseFloat(updatedDoc.taxe) || 0;
    const total_ttc = total_ht * (1 + taxeVal / 100);

    const { error } = await supabase.from('factures').update({
       numero: updatedDoc.numero,
       client_nom: updatedDoc.client_nom,
       details: updatedDoc.details,
       deadline: updatedDoc.deadline,
       moyen_paiement: updatedDoc.moyen_paiement,
       taxe: taxeVal,
       items: updatedDoc.items,
       total_ht,
       total_ttc
    }).eq('id', updatedDoc.id);
    
    if (!error) {
       setEditingDoc(null);
       fetchData();
    } else {
       alert("Erreur lors de la modification : " + error.message);
    }
  };

  const handleCreateDocument = async (generatedData) => {
    const newDoc = {
      numero: generatedData.numero,
      type_doc: generatedData.invoiceType,
      transaction_id: null,
      client_nom: generatedData.invoiceDetails?.clientNomOverride || generatedData.client_nom || '',
      taxe: generatedData.invoiceDetails?.taxePercentage || 0,
      deadline: generatedData.invoiceDetails?.deadline || null,
      moyen_paiement: generatedData.invoiceDetails?.moyenPaiement || 'espèce',
      total_ht: generatedData.total_ht,
      total_ttc: generatedData.total_ttc,
      date_creation: new Date().toISOString(),
      details: generatedData.invoiceDetails?.details || generatedData.details || '',
      items: generatedData.items,
      service_id: null
    };

    const { error } = await supabase.from('factures').insert([newDoc]);
    if (error) {
      alert("Erreur lors de la création : " + error.message);
      return;
    }

    setIsCreateModalOpen(false);
    fetchData();
    alert(`${generatedData.invoiceType === 'proforma' ? 'Proforma' : 'Facture'} N° ${generatedData.numero} créé avec succès !`);
  };

  const handleDelete = async (id, isFacture) => {
    if (!window.confirm('Supprimer ce document ?')) return;
    
    await supabase.from('factures').delete().eq('id', id);

    if (isFacture) setFactures(prev => prev.filter(f => f.id !== id));
    else setProformas(prev => prev.filter(p => p.id !== id));
  };

  const fmt = (a) => new Intl.NumberFormat('fr-DZ', { style: 'currency', currency: 'DZD' }).format(a);
  const fmtDate = (d) => {
    if (!d) return '—';
    try { return format(parseISO(d), 'dd MMM yyyy', { locale: fr }); } catch { return d; } 
  };

  const fmtPdf = (a) => {
    return Number(a || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).replace(/\s/g, ' ') + ' DA';
  };

  const handleDownloadPDF = async (doc) => {
    const pdf = new jsPDF('p', 'pt', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const marginX = 40;
    const rightMarginX = pageWidth - marginX; // usually ~555
    
    // Header
    let startTextY = 50;
    
    if (agencySettings?.logo_url) {
      try {
        const match = agencySettings.logo_url.match(/^data:image\/(png|jpeg|jpg);base64,/);
        let format = 'JPEG';
        if (match && match[1] === 'png') format = 'PNG';
        
        // Calculate dimensions to maintain aspect ratio
        const dim = await new Promise(resolve => {
          const img = new window.Image();
          img.onload = () => resolve({ w: img.width, h: img.height });
          img.onerror = () => resolve({ w: 100, h: 50 });
          img.src = agencySettings.logo_url;
        });
        
        const MAX_W = 150;
        const MAX_H = 70;
        let finalW = dim.w;
        let finalH = dim.h;
        
        if (finalW > MAX_W) {
          finalH = (MAX_W * finalH) / finalW;
          finalW = MAX_W;
        }
        if (finalH > MAX_H) {
          finalW = (MAX_H * finalW) / finalH;
          finalH = MAX_H;
        }

        pdf.addImage(agencySettings.logo_url, format, marginX, 40, finalW, finalH);
        startTextY = 40 + finalH + 20; // 20px padding below the logo
      } catch (err) {
        console.error("Error adding logo to PDF:", err);
      }
    }

    pdf.setFontSize(20);
    pdf.setFont("helvetica", "bold");
    pdf.text(agencySettings?.nom_agence || "AGENCE DE VOYAGE", marginX, startTextY);
    
    pdf.setFontSize(10);
    pdf.setFont("helvetica", "normal");
    pdf.text(agencySettings?.adresse || "Adresse non configurée", marginX, startTextY + 15);
    pdf.text(agencySettings?.telephone ? `Tél: ${agencySettings.telephone}` : "", marginX, startTextY + 30);
    pdf.text(agencySettings?.email ? `Email: ${agencySettings.email}` : "", marginX, startTextY + 45);

    // Title
    const docTitle = doc.type_doc === 'proforma' ? 'FACTURE PROFORMA' : 'FACTURE';
    const num = doc.numero || 'N/A';
    
    pdf.setFontSize(16);
    pdf.setFont("helvetica", "bold");
    pdf.text(`${docTitle} N° ${num}`, rightMarginX, 50, { align: 'right' });
    
    pdf.setFontSize(10);
    pdf.setFont("helvetica", "normal");
    pdf.text(`Date: ${fmtDate(doc.date_creation || doc.created_at)}`, rightMarginX, 70, { align: 'right' });
    if (doc.deadline) {
      pdf.text(`Échéance: ${fmtDate(doc.deadline)}`, rightMarginX, 85, { align: 'right' });
    }

    // Client
    const clientStartY = startTextY + 80;
    
    pdf.setFontSize(12);
    pdf.setFont("helvetica", "bold");
    pdf.text("Client :", marginX, clientStartY);
    pdf.setFont("helvetica", "normal");
    pdf.text(doc.client_nom || 'Client Anonyme', marginX, clientStartY + 15);

    // Table
    let tableBody = [];
    if (doc.items && doc.items.length > 0) {
      tableBody = doc.items.map(item => [
        item.description || 'Prestation de service',
        String(item.quantite || 1),
        fmtPdf(item.prix_unitaire),
        fmtPdf(item.total)
      ]);
    } else {
      tableBody = [
        [doc.details || "Prestation de service", "1", fmtPdf(doc.total_ht), fmtPdf(doc.total_ht)]
      ];
    }

    autoTable(pdf, {
      startY: clientStartY + 40,
      head: [["Description", "Quantité", "Prix Unitaire", "Total HT"]],
      body: tableBody,
      theme: 'grid',
      headStyles: { fillColor: [94, 106, 210] },
      styles: { fontSize: 10, cellPadding: 6, overflow: 'linebreak' },
      columnStyles: {
        0: { cellWidth: 'auto' },
        1: { halign: 'center', cellWidth: 55 },
        2: { halign: 'right', cellWidth: 90 },
        3: { halign: 'right', cellWidth: 95 }
      }
    });

    const finalY = pdf.lastAutoTable.finalY + 30;
    const totalsLabelX = rightMarginX - 85;

    // Totals
    pdf.setFontSize(10);
    pdf.text(`Total HT :`, totalsLabelX, finalY, { align: 'right' });
    pdf.text(fmtPdf(doc.total_ht), rightMarginX, finalY, { align: 'right' });
    
    pdf.text(`TVA (${doc.taxe}%) :`, totalsLabelX, finalY + 15, { align: 'right' });
    const tvaAmount = (doc.total_ht * doc.taxe) / 100;
    pdf.text(fmtPdf(tvaAmount), rightMarginX, finalY + 15, { align: 'right' });

    pdf.setFont("helvetica", "bold");
    pdf.text(`Total TTC :`, totalsLabelX, finalY + 35, { align: 'right' });
    pdf.text(fmtPdf(doc.total_ttc), rightMarginX, finalY + 35, { align: 'right' });

    // Amount in letters
    pdf.setFont("helvetica", "normal");
    pdf.text(`Arrêtée la présente ${doc.type_doc} à la somme de :`, marginX, finalY + 60);
    pdf.setFont("helvetica", "bold");
    pdf.text(`${amountToFrench(doc.total_ttc, 'Dinars')}.`, marginX, finalY + 75);

    // Footer
    pdf.setFont("helvetica", "italic");
    pdf.setFontSize(9);
    pdf.text(`Moyen de paiement : ${doc.moyen_paiement || 'Non défini'}`, 40, finalY + 110);

    pdf.save(`${doc.type_doc}_${num.replace('/', '_')}.pdf`);
  };

  const rawData = activeTab === 'factures' ? factures : proformas;
  const isFacture = activeTab === 'factures';

  const filteredData = rawData.filter(d => 
    (d.client_nom && d.client_nom.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (d.numero && d.numero.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (d.details && d.details.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE);
  const paginatedData = filteredData.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  // Reset pagination when tab or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchTerm]);

  return (
    <Layout>
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Facturation & Proformas</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Gérez et éditez vos factures, proformas et lignes de facturation</p>
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input 
              placeholder="Rechercher par client, n° ou détail..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-9 h-10 w-full"
            />
          </div>
          <Button 
            onClick={() => setIsCreateModalOpen(true)}
            className="h-10 px-4 font-bold shrink-0 gap-1.5 shadow-sm"
          >
            <Plus size={16} />
            <span>Nouveau {isFacture ? 'Facture' : 'Proforma'}</span>
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-0 border-b mb-6">
        {[
          { key: 'factures', label: 'Factures', icon: FileDown },
          { key: 'proformas', label: 'Proformas', icon: FileText },
        ].map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={cn(
              "flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-colors",
              activeTab === tab.key ? "text-primary border-primary" : "text-muted-foreground border-transparent hover:text-foreground"
            )}>
            <tab.icon size={15} /> {tab.label}
          </button>
        ))}
      </div>

      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                {['N°', 'Date', 'Client', 'Détails', 'Échéance', 'Paiement', 'Total TTC', 'Actions'].map(h => (
                  <th key={h} className={cn("px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground",
                    ['Total TTC'].includes(h) && 'text-right',
                    h === 'Actions' && 'text-right'
                  )}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" className="py-16 text-center">
                    <Loader2 size={32} className="mx-auto animate-spin text-primary mb-3" />
                    <p className="font-medium text-muted-foreground">Chargement des documents...</p>
                  </td>
                </tr>
              ) : paginatedData.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-16 text-center">
                    {isFacture ? <FileDown size={40} className="mx-auto text-muted-foreground/30 mb-3" /> : <FileText size={40} className="mx-auto text-muted-foreground/30 mb-3" />}
                    <p className="font-medium text-muted-foreground">Aucune {isFacture ? 'facture' : 'proforma'} trouvée</p>
                    <p className="text-xs text-muted-foreground mt-1">Générez-en une depuis la section Ventes ou avec le bouton ci-dessus.</p>
                  </td>
                </tr>
              ) : paginatedData.map(doc => (
                <tr key={doc.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-semibold text-primary font-mono">{doc.numero || 'N/A'}</td>
                  <td className="px-4 py-3 text-muted-foreground">{fmtDate(doc.date_creation || doc.created_at)}</td>
                  <td className="px-4 py-3 font-medium">{doc.client_nom}</td>
                  <td className="px-4 py-3 text-muted-foreground max-w-[200px] truncate" title={doc.details}>{doc.details || '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground">{fmtDate(doc.deadline)}</td>
                  <td className="px-4 py-3"><Badge variant="secondary" className="capitalize text-xs">{doc.moyen_paiement}</Badge></td>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums text-primary">{fmt(doc.total_ttc)}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="outline" size="icon-sm" onClick={() => setEditingDoc(doc)} title="Modifier">
                        <Pencil size={14} />
                      </Button>
                      <Button variant="outline" size="icon-sm" onClick={() => handleDownloadPDF(doc)} title="Télécharger PDF">
                        <Download size={14} />
                      </Button>
                      {isAdmin && (
                        <Button variant="destructive" size="icon-sm" onClick={() => handleDelete(doc.id, isFacture)} title="Supprimer le document">
                          <Trash2 size={14} />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="border-t p-4 flex items-center justify-between bg-muted/20">
            <div className="text-xs text-muted-foreground">
              Affichage de <span className="font-bold text-foreground">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</span> à <span className="font-bold text-foreground">{Math.min(currentPage * ITEMS_PER_PAGE, filteredData.length)}</span> sur <span className="font-bold text-foreground">{filteredData.length}</span> documents
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="h-8 px-3"
              >
                Précédent
              </Button>
              <div className="text-xs font-medium px-2">
                Page {currentPage} sur {totalPages}
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="h-8 px-3"
              >
                Suivant
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editingDoc && (
        <EditFactureModal 
          doc={editingDoc} 
          onClose={() => setEditingDoc(null)} 
          onSave={handleUpdate} 
        />
      )}

      {/* Direct Create Modal */}
      {isCreateModalOpen && (
        <FactureForm 
          transaction={null}
          type={isFacture ? 'facture' : 'proforma'}
          onClose={() => setIsCreateModalOpen(false)}
          onGenerate={handleCreateDocument}
        />
      )}
    </Layout>
  );
};

export default Facturation;
