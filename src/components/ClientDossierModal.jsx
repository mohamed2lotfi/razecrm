import React, { useState, useEffect } from 'react';
import { 
  X, FolderOpen, User, Phone, Mail, MapPin, Calendar, 
  CreditCard, DollarSign, Clock, FileText, CheckCircle2, 
  AlertCircle, ChevronRight, MessageSquare, Plus, ExternalLink,
  Users, Building2, Plane, Sparkles, Loader2, ArrowUpRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import ClientRemarquesModal from '@/components/ClientRemarquesModal';
import CountryFlag from '@/components/CountryFlag';

const fmtDZD = (n) => Number(Math.round(n || 0)).toLocaleString('fr-DZ', {
  maximumFractionDigits: 0
});

const ClientDossierModal = ({ isOpen, onClose, client, onOpenDevis, onOpenOmraGroupe }) => {
  const [activeTab, setActiveTab] = useState('ventes'); // 'ventes' | 'omra' | 'devis' | 'remarques'
  const [loading, setLoading] = useState(true);

  const [ventes, setVentes] = useState([]);
  const [omraInscriptions, setOmraInscriptions] = useState([]);
  const [devisList, setDevisList] = useState([]);
  const [remarquesList, setRemarquesList] = useState([]);

  // Totals & KPI
  const [stats, setStats] = useState({
    totalCaVentes: 0,
    totalCaOmra: 0,
    totalDevis: 0,
    totalPelerins: 0
  });

  useEffect(() => {
    if (client?.id) {
      fetchClientDossier();
    }
  }, [client?.id]);

  const fetchClientDossier = async () => {
    if (!client?.id) return;
    setLoading(true);

    try {
      // 1. Fetch Ventes
      const { data: vData } = await supabase
        .from('ventes')
        .select('*, services(nom)')
        .eq('client_id', client.id)
        .order('date_vente', { ascending: false });

      // 2. Fetch Omra Enregistrements
      const { data: omraData } = await supabase
        .from('omra_enregistrements')
        .select('*, omra_groupes(id, nom, date_depart, date_retour, compagnie)')
        .eq('client_id', client.id)
        .order('date_creation', { ascending: false });

      // 3. Fetch Devis / Pipeline
      const { data: devisData } = await supabase
        .from('pipeline')
        .select('*, services(nom)')
        .or(`client_id.eq.${client.id},nom_prospect.ilike.%${client.nom}%`)
        .order('date_creation', { ascending: false });

      // 4. Fetch Remarques
      const { data: remData } = await supabase
        .from('client_remarques')
        .select('*')
        .eq('client_id', client.id)
        .order('created_at', { ascending: false });

      const clientVentes = vData || [];
      const clientOmra = omraData || [];
      const clientDevis = devisData || [];
      const clientRemarques = remData || (Array.isArray(client.remarques) ? client.remarques : []);

      setVentes(clientVentes);
      setOmraInscriptions(clientOmra);
      setDevisList(clientDevis);
      setRemarquesList(clientRemarques);

      // Compute statistics
      const totalCaV = clientVentes.reduce((sum, v) => sum + Number(v.total || 0), 0);
      const totalCaOm = clientOmra.reduce((sum, o) => sum + Number(o.total_brut || o.total_net || 0), 0);
      let pelerinsCount = 0;
      clientOmra.forEach(o => {
        if (Array.isArray(o.pelerins)) pelerinsCount += o.pelerins.length;
      });

      setStats({
        totalCaVentes: totalCaV,
        totalCaOmra: totalCaOm,
        totalDevis: clientDevis.length,
        totalPelerins: pelerinsCount
      });
    } catch (err) {
      console.error("Error loading client dossier:", err);
    } finally {
      setLoading(false);
    }
  };

  const getRelativeTime = (dateStr) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      const now = new Date();
      const diffMs = now - d;
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      if (diffDays === 0) return "aujourd'hui";
      if (diffDays === 1) return 'hier';
      if (diffDays < 7) return `il y a ${diffDays} jours`;
      if (diffDays < 30) return `il y a ${Math.floor(diffDays / 7)} sem.`;
      return `il y a ${Math.floor(diffDays / 30)} mois`;
    } catch {
      return '';
    }
  };

  const getDevisMetadata = (item) => {
    let meta = {
      nom_devis: item.nom_prospect || 'Devis sans titre',
      destination: '',
      destination_emoji: '📍',
      priorite: 'Moyenne',
      agent_nom: ''
    };
    try {
      if (item.details_devis && item.details_devis.trim().startsWith('{')) {
        const parsed = JSON.parse(item.details_devis);
        if (parsed.nom_devis) meta.nom_devis = parsed.nom_devis;
        if (parsed.destination) meta.destination = parsed.destination;
        if (parsed.destination_emoji) meta.destination_emoji = parsed.destination_emoji;
        if (parsed.priorite) meta.priorite = parsed.priorite;
        if (parsed.agent_nom) meta.agent_nom = parsed.agent_nom;
      }
    } catch (e) {}
    return meta;
  };

  if (!isOpen || !client) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[900px] p-0 overflow-hidden" onClose={onClose}>
        
        {/* ── Header Dossier Client ─────────────────────────────── */}
        <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 text-white p-6 border-b border-slate-800">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white font-black text-xl shadow-lg border border-emerald-400/30">
                {(client.nom?.charAt(0) || 'C').toUpperCase()}
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h2 className="text-xl font-black tracking-tight text-white">{client.nom}</h2>
                  <Badge variant={client.type === 'Entreprise' ? 'warning' : 'success'} className="text-[10px]">
                    {client.type || 'Particulier'}
                  </Badge>
                </div>
                <div className="flex items-center gap-4 text-xs text-slate-300 flex-wrap">
                  {client.telephone && (
                    <span className="flex items-center gap-1">
                      <Phone size={12} className="text-emerald-400" /> {client.telephone}
                    </span>
                  )}
                  {client.email && (
                    <span className="flex items-center gap-1">
                      <Mail size={12} className="text-blue-400" /> {client.email}
                    </span>
                  )}
                  <span className="text-slate-400 text-[11px]">
                    Inscrit le {new Date(client.created_at || Date.now()).toLocaleDateString('fr-FR')}
                  </span>
                </div>
              </div>
            </div>

            {/* KPI Badges */}
            <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
              <div className="bg-white/10 backdrop-blur-xs border border-white/10 px-3 py-2 rounded-xl text-center min-w-[100px]">
                <span className="text-[10px] uppercase font-bold text-emerald-300 block">Total Dépenses</span>
                <span className="text-sm font-black text-white">
                  {fmtDZD(stats.totalCaVentes + stats.totalCaOmra)} <span className="text-[10px] font-normal text-emerald-300">DZD</span>
                </span>
              </div>
              <div className="bg-white/10 backdrop-blur-xs border border-white/10 px-3 py-2 rounded-xl text-center min-w-[70px]">
                <span className="text-[10px] uppercase font-bold text-blue-300 block">Devis</span>
                <span className="text-sm font-black text-white">{stats.totalDevis}</span>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 mt-6 border-b border-white/10 -mb-6 pb-2 overflow-x-auto">
            <button
              onClick={() => setActiveTab('ventes')}
              className={cn(
                "px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2",
                activeTab === 'ventes'
                  ? "bg-emerald-500 text-white shadow-sm"
                  : "text-slate-300 hover:text-white hover:bg-white/10"
              )}
            >
              <CreditCard size={14} /> Ventes & Prestations ({ventes.length})
            </button>

            <button
              onClick={() => setActiveTab('omra')}
              className={cn(
                "px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2",
                activeTab === 'omra'
                  ? "bg-emerald-500 text-white shadow-sm"
                  : "text-slate-300 hover:text-white hover:bg-white/10"
              )}
            >
              <Building2 size={14} /> Inscriptions Omra ({omraInscriptions.length})
            </button>

            <button
              onClick={() => setActiveTab('devis')}
              className={cn(
                "px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2",
                activeTab === 'devis'
                  ? "bg-emerald-500 text-white shadow-sm"
                  : "text-slate-300 hover:text-white hover:bg-white/10"
              )}
            >
              <FileText size={14} /> Devis & Pipeline ({devisList.length})
            </button>

            <button
              onClick={() => setActiveTab('remarques')}
              className={cn(
                "px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2",
                activeTab === 'remarques'
                  ? "bg-emerald-500 text-white shadow-sm"
                  : "text-slate-300 hover:text-white hover:bg-white/10"
              )}
            >
              <MessageSquare size={14} /> Notes Équipe ({remarquesList.length})
            </button>
          </div>
        </div>

        {/* ── Content Body ──────────────────────────────────────── */}
        <div className="p-6 max-h-[60vh] overflow-y-auto space-y-4">
          
          {loading ? (
            <div className="py-16 text-center text-muted-foreground space-y-2">
              <Loader2 size={32} className="mx-auto animate-spin text-primary" />
              <p className="text-xs">Chargement du dossier client...</p>
            </div>
          ) : (
            <>
              {/* TAB 1: VENTES */}
              {activeTab === 'ventes' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Historique des Ventes & Billetterie ({ventes.length})
                    </h3>
                  </div>

                  {ventes.length === 0 ? (
                    <div className="py-12 text-center bg-slate-50 rounded-xl border border-dashed text-slate-400">
                      <CreditCard size={32} className="mx-auto mb-2 opacity-50" />
                      <p className="text-xs font-bold">Aucune vente enregistrée pour ce client</p>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {ventes.map(v => (
                        <div key={v.id} className="p-3.5 rounded-xl border bg-white shadow-2xs hover:border-emerald-300 transition-all flex items-center justify-between gap-3 text-xs">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900 text-sm">{v.services?.nom || 'Prestation Divers'}</span>
                              <span className={cn(
                                "text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border",
                                v.etat === 'Payé' || v.etat === 'Confirmé' ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-700 border-amber-200"
                              )}>
                                {v.etat || 'Enregistré'}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-500 flex items-center gap-3">
                              <span>📅 {new Date(v.date_vente).toLocaleDateString('fr-FR')}</span>
                              {v.details && <span>📝 {v.details}</span>}
                            </div>
                          </div>

                          <div className="text-right">
                            <span className="text-[10px] font-semibold text-slate-400 block">Montant Total</span>
                            <span className="text-sm font-black text-emerald-700">{fmtDZD(v.total)} DZD</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: OMRA */}
              {activeTab === 'omra' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Inscriptions & Dossiers Omra ({omraInscriptions.length})
                    </h3>
                  </div>

                  {omraInscriptions.length === 0 ? (
                    <div className="py-12 text-center bg-slate-50 rounded-xl border border-dashed text-slate-400">
                      <Building2 size={32} className="mx-auto mb-2 opacity-50" />
                      <p className="text-xs font-bold">Aucune inscription Omra trouvée pour ce client</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {omraInscriptions.map(o => (
                        <div key={o.id} className="p-4 rounded-xl border bg-white shadow-2xs hover:border-emerald-300 transition-all space-y-2.5 text-xs">
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                              <span className="font-black text-slate-900 text-sm flex items-center gap-1.5">
                                🕋 {o.omra_groupes?.nom || 'Groupe Omra'}
                              </span>
                              <span className="text-[10px] font-bold bg-violet-100 text-violet-800 px-2 py-0.5 rounded-md">
                                Chambre {o.type_chambre || 'Standard'}
                              </span>
                            </div>

                            <div className="text-right">
                              <span className="text-sm font-black text-emerald-700">{fmtDZD(o.total_brut || o.total_net)} DZD</span>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-500 bg-slate-50 p-2 rounded-lg">
                            <div>
                              <span>📅 Départ : <b>{o.omra_groupes?.date_depart || 'À définir'}</b></span>
                              {o.omra_groupes?.date_retour && <span> ➔ Retour : <b>{o.omra_groupes.date_retour}</b></span>}
                            </div>
                            <div className="text-right sm:text-left">
                              <span>👥 Pèlerins inscrits : <b>{Array.isArray(o.pelerins) ? o.pelerins.length : 1} pèlerin(s)</b></span>
                            </div>
                          </div>

                          {/* List of pilgrims names */}
                          {Array.isArray(o.pelerins) && o.pelerins.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 pt-1">
                              {o.pelerins.map((p, pIdx) => (
                                <span key={pIdx} className="text-[10px] bg-slate-100 text-slate-800 font-semibold px-2 py-0.5 rounded-full border">
                                  👤 {p.nom || p.prenom ? `${p.nom || ''} ${p.prenom || ''}` : `Pèlerin ${pIdx + 1}`} ({p.type || 'Adulte'})
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: DEVIS & PIPELINE */}
              {activeTab === 'devis' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Devis & Opportunités CRM ({devisList.length})
                    </h3>
                  </div>

                  {devisList.length === 0 ? (
                    <div className="py-12 text-center bg-slate-50 rounded-xl border border-dashed text-slate-400">
                      <FileText size={32} className="mx-auto mb-2 opacity-50" />
                      <p className="text-xs font-bold">Aucun devis enregistré pour ce client</p>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {devisList.map(d => {
                        const meta = getDevisMetadata(d);
                        return (
                          <div 
                            key={d.id} 
                            onClick={() => onOpenDevis && onOpenDevis(d)}
                            className="p-3.5 rounded-xl border bg-white shadow-2xs hover:border-emerald-300 transition-all flex items-center justify-between gap-3 text-xs cursor-pointer group"
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
                                  {meta.nom_devis}
                                </span>
                                {meta.destination && (
                                  <span className="text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 px-1.5 py-0.5 rounded inline-flex items-center gap-1 shadow-2xs">
                                    <CountryFlag emoji={meta.destination_emoji} destinationName={meta.destination} className="w-3.5 h-2.5" />
                                    <span>{meta.destination}</span>
                                  </span>
                                )}
                                <span className="text-[9px] font-bold uppercase bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded">
                                  {d.status || 'Nouveau'}
                                </span>
                              </div>
                              <div className="text-[11px] text-slate-500 flex items-center gap-3">
                                <span>📅 {new Date(d.date_creation).toLocaleDateString('fr-FR')} ({getRelativeTime(d.date_creation)})</span>
                                {meta.agent_nom && <span>👤 Agent : <b>{meta.agent_nom}</b></span>}
                              </div>
                            </div>

                            <Button variant="ghost" size="sm" className="h-8 text-xs font-bold gap-1 text-emerald-700 group-hover:bg-emerald-50">
                              Voir devis <ArrowUpRight size={13} />
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: REMARQUES */}
              {activeTab === 'remarques' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Notes et Remarques de l'Équipe ({remarquesList.length})
                    </h3>
                  </div>

                  {remarquesList.length === 0 ? (
                    <div className="py-12 text-center bg-slate-50 rounded-xl border border-dashed text-slate-400">
                      <MessageSquare size={32} className="mx-auto mb-2 opacity-50" />
                      <p className="text-xs font-bold">Aucune remarque enregistrée pour le moment</p>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {remarquesList.map((r, rIdx) => (
                        <div key={r.id || rIdx} className="p-3 rounded-xl border bg-white shadow-2xs space-y-1 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-900">👤 {r.auteur_nom || 'Agent'}</span>
                            <span className="text-[10px] text-slate-400">
                              {r.created_at ? new Date(r.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''}
                            </span>
                          </div>
                          <p className="text-slate-700 whitespace-pre-wrap">{r.remarque || r.texte}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}

        </div>

        <DialogFooter className="px-6 py-3 border-t bg-slate-50 flex items-center justify-between">
          <span className="text-xs text-slate-400">
            Dossier consolidé El-Mokhtar CRM
          </span>
          <Button variant="outline" size="sm" onClick={onClose} className="h-8 text-xs font-bold">
            Fermer le dossier
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ClientDossierModal;
