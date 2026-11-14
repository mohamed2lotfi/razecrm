import React, { useState, useMemo } from 'react';
import { 
  Check, X, Search, Printer, 
  ShieldCheck, Plane, IdCard, FileSignature, 
  CheckCircle2, AlertCircle, Users, Building2, 
  Sparkles, CheckSquare, Square, 
  RotateCcw, ArrowUpDown, Eye, MessageSquare, 
  Layers, FileText
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { 
  PELERIN_DOC_TYPES, 
  getPilgrimChecklist, 
  calculatePilgrimProgress, 
  calculateGroupDocumentsMetrics,
  generatePelerinsChecklistPrintHtml
} from '@/lib/omraPelerinsChecklistConstants';
import { getChecklistStats } from '@/lib/omraChecklistConstants';

// Helper pour retrouver un occupant de façon robuste (par id, passeport, nom ou index)
const findOccupantIndex = (array, pilgrim) => {
  if (!Array.isArray(array)) return -1;
  if (pilgrim.rawPelerin?.pelerin_id) {
    const idx = array.findIndex(p => p.pelerin_id === pilgrim.rawPelerin.pelerin_id);
    if (idx !== -1) return idx;
  }
  if (pilgrim.passport && pilgrim.passport !== '—') {
    const idx = array.findIndex(p => {
      const pass = (p.num_passeport || p.passport || '').trim().toUpperCase();
      return pass && pass === pilgrim.passport;
    });
    if (idx !== -1) return idx;
  }
  if (pilgrim.nom) {
    const pNom = (pilgrim.nom || '').trim().toLowerCase();
    const pPrenom = (pilgrim.prenom || '').trim().toLowerCase();
    const idx = array.findIndex(p => {
      const nom = (p.nom || '').trim().toLowerCase();
      const prenom = (p.prenom || '').trim().toLowerCase();
      if (pNom && nom === pNom) {
        if (!pPrenom || !prenom || prenom === pPrenom) return true;
      }
      return false;
    });
    if (idx !== -1) return idx;
  }
  if (pilgrim.originalIndex !== undefined && array[pilgrim.originalIndex]) {
    return pilgrim.originalIndex;
  }
  return -1;
};

export default function OmraPelerinsChecklistTab({
  groupe,
  enregistrements = [],
  onUpdateEnregistrements,
  hotels = [],
  pelerinsMaster = [],
  getPelerinPhoto,
  isAdmin = false,
  agencySettings = {},
  onSwitchToFlightChecklist
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all'); // 'all' | 'complet' | 'en_cours' | 'non_commence' | 'no_visa' | 'no_billet' | 'no_badge' | 'no_contrat'
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'cards'
  const [selectedKeys, setSelectedKeys] = useState(new Set());
  const [savingKey, setSavingKey] = useState(null);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');

  // Statistiques de la checklist de vol (opérations groupe)
  const flightStats = useMemo(() => {
    return getChecklistStats(groupe?.checklist, groupe?.date_depart);
  }, [groupe?.checklist, groupe?.date_depart]);

  // Note dialog state
  const [isNoteDialogOpen, setIsNoteDialogOpen] = useState(false);
  const [activePilgrimForNote, setActivePilgrimForNote] = useState(null);
  const [noteContent, setNoteContent] = useState('');

  // Bulk action confirmation dialog
  const [confirmBulkAction, setConfirmBulkAction] = useState(null); // { type: 'visa'|'billet'|'badge'|'contrat'|'all_100'|'reset', label: string }

  // 1. Aplatir et structurer tous les pèlerins du groupe
  const allPilgrims = useMemo(() => {
    const list = [];
    let globalIndex = 0;

    enregistrements.forEach((enr) => {
      const occupants = [
        ...(enr.pelerins || []).map((p, idx) => ({ ...p, isEnfantSansLit: false, originalIndex: idx })),
        ...(enr.enfantsSansLit || enr.enfants_sans_lit || []).map((e, idx) => ({ ...e, isEnfantSansLit: true, originalIndex: idx }))
      ];

      occupants.forEach(occ => {
        const occNom = (occ.nom || '').trim();
        // Ignorer les créneaux vides non assignés
        if (!occNom) return;

        globalIndex++;
        const occPrenom = (occ.prenom || '').trim();
        const occPass = (occ.num_passeport || occ.passport || '').trim().toUpperCase();

        // Matching avec pelerinsMaster si disponible
        const master = pelerinsMaster.find(m => {
          if (occPass && occPass !== '—' && m.num_passeport && m.num_passeport.trim().toUpperCase() === occPass) return true;
          if (occ.pelerin_id && m.id && occ.pelerin_id === m.id) return true;
          if (m.nom && occNom && m.nom.trim().toLowerCase() === occNom.toLowerCase()) {
            if (!occPrenom || !m.prenom || m.prenom.trim().toLowerCase() === occPrenom.toLowerCase()) return true;
          }
          return false;
        });

        const nomArabe = master?.nom_arabe || occ.nom_arabe || occNom;
        const prenomArabe = master?.prenom_arabe || occ.prenom_arabe || occPrenom;
        const fullNameAr = (prenomArabe || nomArabe) 
          ? `${prenomArabe} ${nomArabe}`.trim() 
          : (occPrenom ? `${occNom} ${occPrenom}` : occNom);

        const fullNameFr = occPrenom && !occNom.toLowerCase().includes(occPrenom.toLowerCase()) 
          ? `${occNom} ${occPrenom}` 
          : occNom;
        const passport = occPass || master?.num_passeport || '—';
        const photo = (typeof getPelerinPhoto === 'function' ? getPelerinPhoto(occ) : null) || master?.photo_url || null;
        const sexe = master?.sexe || occ.sexe || 'H';

        const uniqueKey = `${enr.id}-${occ.isEnfantSansLit ? 'enf' : 'pel'}-${occ.originalIndex}`;

        // Nom hôtel / chambre
        const hotelObj = hotels.find(h => h.id === enr.hotelId || h.id === enr.hotel_id);
        const chambreTitle = enr.chambreId || enr.chambre_id ? `Ch. ${enr.chambreId || enr.chambre_id}` : 'Non assignée';

        // Fusion des données de documents pèlerin + master pour une vue 100% réelle
        const mergedForDocs = {
          ...master,
          ...occ,
          num_visa: occ.num_visa || master?.num_visa || '',
          numero_billet: occ.numero_billet || occ.num_billet || master?.numero_billet || master?.num_billet || '',
          checklist_docs: occ.checklist_docs || occ.checklistDocs || master?.checklist_docs || master?.checklistDocs || null
        };

        const docs = getPilgrimChecklist(mergedForDocs);
        const progress = calculatePilgrimProgress(docs);

        list.push({
          uniqueKey,
          enrId: enr.id,
          masterId: master?.id || null,
          isEnfantSansLit: occ.isEnfantSansLit,
          originalIndex: occ.originalIndex,
          nom: occNom,
          prenom: occPrenom,
          fullNameFr,
          nomArabe,
          prenomArabe,
          fullNameAr,
          passport,
          num_passeport: passport,
          photo,
          sexe,
          telephone: occ.telephone || enr.telephone || '',
          chambreId: enr.chambreId || enr.chambre_id || '',
          chambreTitre: chambreTitle,
          typeChambre: enr.typeChambre || enr.type_chambre || 'CH4',
          hotelNom: hotelObj?.nom || 'Hôtel standard',
          intermediaire: enr.intermediaire || 'Direct Agence',
          docs,
          progress,
          rawPelerin: occ
        });
      });
    });

    return list;
  }, [enregistrements, hotels, pelerinsMaster, getPelerinPhoto]);

  // 2. Métriques globales calculées (indicateurs et progression réels)
  const metrics = useMemo(() => {
    return calculateGroupDocumentsMetrics(allPilgrims);
  }, [allPilgrims]);

  // 3. Filtrage et Recherche
  const filteredPilgrims = useMemo(() => {
    return allPilgrims.filter(p => {
      // Recherche textuelle
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = (p.fullNameFr || '').toLowerCase().includes(q);
        const matchesPass = (p.passport || '').toLowerCase().includes(q);
        const matchesPhone = (p.telephone || '').toLowerCase().includes(q);
        const matchesChambre = (p.chambreTitre || '').toLowerCase().includes(q);
        const matchesInter = (p.intermediaire || '').toLowerCase().includes(q);
        if (!matchesName && !matchesPass && !matchesPhone && !matchesChambre && !matchesInter) {
          return false;
        }
      }

      // Filtre statut
      if (filterStatus === 'all') return true;
      if (filterStatus === 'complet') return p.progress.isComplete;
      if (filterStatus === 'en_cours') return p.progress.status === 'en_cours';
      if (filterStatus === 'non_commence') return p.progress.status === 'non_commence';
      if (filterStatus === 'no_visa') return !p.docs.visa;
      if (filterStatus === 'no_billet') return !p.docs.billet;
      if (filterStatus === 'no_badge') return !p.docs.badge;
      if (filterStatus === 'no_contrat') return !p.docs.contrat;

      return true;
    });
  }, [allPilgrims, searchQuery, filterStatus]);

  // 4. Mise à jour d'un document pour un pèlerin
  const handleToggleDoc = async (pilgrim, docId) => {
    const currentVal = pilgrim.docs[docId];
    const newVal = !currentVal;

    const newDocs = {
      ...pilgrim.docs,
      [docId]: newVal,
      updated_at: new Date().toISOString()
    };

    await savePilgrimDocs(pilgrim, newDocs);
  };

  // 5. Sauvegarder les documents d'un pèlerin
  const savePilgrimDocs = async (pilgrim, updatedDocs) => {
    setSavingKey(pilgrim.uniqueKey);

    // 1. Mettre à jour l'enregistrement dans le state React (Optimistic Update)
    const targetEnr = enregistrements.find(e => e.id === pilgrim.enrId);
    if (!targetEnr) {
      setSavingKey(null);
      return;
    }

    const isEnfant = pilgrim.isEnfantSansLit;
    const targetArray = isEnfant 
      ? [...(targetEnr.enfantsSansLit || targetEnr.enfants_sans_lit || [])]
      : [...(targetEnr.pelerins || [])];

    const targetIdx = findOccupantIndex(targetArray, pilgrim);
    if (targetIdx >= 0 && targetArray[targetIdx]) {
      targetArray[targetIdx] = {
        ...targetArray[targetIdx],
        checklist_docs: updatedDocs
      };
    }

    const updatedEnr = {
      ...targetEnr,
      ...(isEnfant 
        ? { enfantsSansLit: targetArray, enfants_sans_lit: targetArray } 
        : { pelerins: targetArray })
    };

    const newEnregistrements = enregistrements.map(e => e.id === pilgrim.enrId ? updatedEnr : e);
    if (onUpdateEnregistrements) {
      onUpdateEnregistrements(newEnregistrements);
    }

    // 2. Persistance dans Supabase
    try {
      const dbPayload = {
        pelerins: updatedEnr.pelerins || [],
        enfants_sans_lit: updatedEnr.enfantsSansLit || updatedEnr.enfants_sans_lit || []
      };

      const { error } = await supabase
        .from('omra_enregistrements')
        .update(dbPayload)
        .eq('id', pilgrim.enrId);

      if (error) {
        console.warn("Échec update checklist_docs dans omra_enregistrements:", error.message);
      } else {
        setSaveSuccessMsg('✓ Enregistré');
        setTimeout(() => setSaveSuccessMsg(''), 2000);
      }

      // Sync facultatif avec table pelerins si UUID valide
      const pId = pilgrim.masterId || pilgrim.rawPelerin?.pelerin_id || pilgrim.rawPelerin?.id;
      const isUuid = pId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(pId);
      if (isUuid) {
        supabase
          .from('pelerins')
          .update({ checklist_docs: updatedDocs })
          .eq('id', pId)
          .then();
      }
    } catch (err) {
      console.error("Erreur sauvegarde document checklist:", err);
    } finally {
      setSavingKey(null);
    }
  };

  // 6. Action 100% ou 0% pour un pèlerin
  const handleSetAllDocsForPilgrim = async (pilgrim, targetValue = true) => {
    const newDocs = {
      ...pilgrim.docs,
      visa: targetValue,
      billet: targetValue,
      badge: targetValue,
      contrat: targetValue,
      updated_at: new Date().toISOString()
    };
    await savePilgrimDocs(pilgrim, newDocs);
  };

  // 7. Actions groupées globales ou sur la sélection
  const handleExecuteBulkAction = async (actionType) => {
    const targetPilgrims = selectedKeys.size > 0 
      ? allPilgrims.filter(p => selectedKeys.has(p.uniqueKey))
      : allPilgrims;

    if (targetPilgrims.length === 0) return;

    // Regrouper par enregistrement pour minimiser les requêtes Supabase
    const enrMap = new Map();

    targetPilgrims.forEach(p => {
      if (!enrMap.has(p.enrId)) {
        const enr = enregistrements.find(e => e.id === p.enrId);
        if (enr) {
          enrMap.set(p.enrId, {
            enr,
            pelerins: [...(enr.pelerins || [])],
            enfants: [...(enr.enfantsSansLit || enr.enfants_sans_lit || [])]
          });
        }
      }

      const enrData = enrMap.get(p.enrId);
      if (!enrData) return;

      const targetList = p.isEnfantSansLit ? enrData.enfants : enrData.pelerins;
      const targetIdx = findOccupantIndex(targetList, p);

      if (targetIdx >= 0 && targetList[targetIdx]) {
        const targetObj = targetList[targetIdx];
        const currentDocs = getPilgrimChecklist(targetObj);
        let newDocs = { ...currentDocs, updated_at: new Date().toISOString() };

        if (actionType === 'all_100') {
          newDocs.visa = true;
          newDocs.billet = true;
          newDocs.badge = true;
          newDocs.contrat = true;
        } else if (actionType === 'reset') {
          newDocs.visa = false;
          newDocs.billet = false;
          newDocs.badge = false;
          newDocs.contrat = false;
        } else if (['visa', 'billet', 'badge', 'contrat'].includes(actionType)) {
          newDocs[actionType] = true;
        }

        targetList[targetIdx] = {
          ...targetObj,
          checklist_docs: newDocs
        };
      }
    });

    // Mettre à jour le state local
    const newEnregistrements = enregistrements.map(e => {
      if (enrMap.has(e.id)) {
        const updated = enrMap.get(e.id);
        return {
          ...e,
          pelerins: updated.pelerins,
          enfantsSansLit: updated.enfants,
          enfants_sans_lit: updated.enfants
        };
      }
      return e;
    });

    if (onUpdateEnregistrements) {
      onUpdateEnregistrements(newEnregistrements);
    }

    // Persister dans Supabase par lots
    try {
      const updates = Array.from(enrMap.entries()).map(([enrId, data]) => {
        return supabase
          .from('omra_enregistrements')
          .update({
            pelerins: data.pelerins,
            enfants_sans_lit: data.enfants
          })
          .eq('id', enrId);
      });

      await Promise.all(updates);
      setSaveSuccessMsg(`✓ Mise à jour réussie (${targetPilgrims.length} pèlerins)`);
      setTimeout(() => setSaveSuccessMsg(''), 2500);
      setSelectedKeys(new Set());
    } catch (err) {
      console.error("Erreur action groupée:", err);
      alert("Erreur lors de l'enregistrement des modifications.");
    } finally {
      setConfirmBulkAction(null);
    }
  };

  // 8. Gestion de la sélection multiple
  const handleToggleSelectAll = () => {
    if (selectedKeys.size === filteredPilgrims.length && filteredPilgrims.length > 0) {
      setSelectedKeys(new Set());
    } else {
      setSelectedKeys(new Set(filteredPilgrims.map(p => p.uniqueKey)));
    }
  };

  const handleToggleSelectOne = (key) => {
    const next = new Set(selectedKeys);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setSelectedKeys(next);
  };

  // 9. Ouvrir dialogue note / observation
  const handleOpenNoteDialog = (pilgrim) => {
    setActivePilgrimForNote(pilgrim);
    setNoteContent(pilgrim.docs.remarque || '');
    setIsNoteDialogOpen(true);
  };

  const handleSaveNote = async () => {
    if (!activePilgrimForNote) return;

    const newDocs = {
      ...activePilgrimForNote.docs,
      remarque: noteContent.trim(),
      updated_at: new Date().toISOString()
    };

    await savePilgrimDocs(activePilgrimForNote, newDocs);
    setIsNoteDialogOpen(false);
  };

  // 10. Impression / Export PDF
  const handlePrint = () => {
    const html = generatePelerinsChecklistPrintHtml({
      groupe,
      pilgrims: filteredPilgrims,
      metrics,
      agencySettings,
      filterStatus
    });

    const printWin = window.open('', '_blank', 'width=1050,height=800');
    if (!printWin) {
      alert("Veuillez autoriser les fenêtres pop-up pour imprimer la checklist.");
      return;
    }
    printWin.document.write(html);
    printWin.document.close();
  };

  return (
    <div className="space-y-6">
      {/* ── Bandeau Switcher & Statut ── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border shadow-xs">
        <div className="flex items-center gap-2">
          <button
            onClick={onSwitchToFlightChecklist}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors border border-slate-200 cursor-pointer"
          >
            <Plane size={14} className="text-emerald-600" />
            Checklist Vol (Opérations Groupe)
            <span className={cn(
              "ml-1.5 px-2 py-0.5 rounded-full text-[10px] font-extrabold border",
              flightStats.percent === 100 
                ? "bg-emerald-100 text-emerald-800 border-emerald-300" 
                : "bg-slate-100 text-slate-700 border-slate-200"
            )}>
              {flightStats.percent}%
            </span>
          </button>
          <div className="px-3.5 py-2 rounded-lg text-xs font-bold bg-primary/10 text-primary border border-primary/20 flex items-center gap-1.5 shadow-xs">
            <Users size={14} />
            Checklist Documents (Suivi Muatamirs)
            <span className={cn(
              "ml-1.5 px-2 py-0.5 rounded-full text-white text-[10px] font-extrabold shadow-2xs",
              metrics.globalPercentage === 100 ? "bg-emerald-600" :
              metrics.globalPercentage >= 50 ? "bg-blue-600" :
              metrics.globalPercentage > 0 ? "bg-amber-600" : "bg-slate-500"
            )}>
              {metrics.globalPercentage}%
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-end sm:self-auto">
          {saveSuccessMsg && (
            <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200 animate-in fade-in">
              <Check size={13} /> {saveSuccessMsg}
            </span>
          )}
          <Button
            onClick={handlePrint}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-xs gap-1.5 text-xs h-9"
          >
            <Printer size={15} />
            Imprimer la Checklist ({filteredPilgrims.length})
          </Button>
        </div>
      </div>

      {/* ── Dashboard KPI : Progression Globale & 4 Documents ── */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {/* Progression Totale du Groupe */}
        <Card className="md:col-span-1 border-0 shadow-md bg-gradient-to-br from-emerald-600 to-teal-700 text-white rounded-xl overflow-hidden relative">
          <div className="p-5 flex flex-col justify-between h-full relative z-10">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-100">
                  Progression Totale
                </span>
                <Sparkles size={16} className="text-emerald-200 animate-pulse" />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-4xl font-extrabold tracking-tight">
                  {metrics.globalPercentage}%
                </span>
                <span className="text-xs text-emerald-100 font-semibold">du groupe</span>
              </div>
              <p className="text-[11px] text-emerald-100/90 mt-1">
                {metrics.totalValidatedDocs} sur {metrics.totalExpectedDocs} documents prêts
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-emerald-500/40 space-y-1.5 text-[11px]">
              <div className="flex items-center justify-between text-white font-medium">
                <span>Dossiers 100% prêts :</span>
                <span className="font-extrabold">{metrics.completeCount} / {metrics.totalPilgrims}</span>
              </div>
              <div className="w-full bg-emerald-950/40 rounded-full h-2 overflow-hidden">
                <div 
                  className="bg-white h-full rounded-full transition-all duration-500"
                  style={{ width: `${metrics.globalPercentage}%` }}
                />
              </div>
            </div>
          </div>
          <div className="absolute -bottom-6 -right-6 w-28 h-28 bg-white/10 rounded-full pointer-events-none blur-xl" />
        </Card>

        {/* Les 4 Documents : Visa, Billet, Badge, Contrat */}
        <div className="md:col-span-4 grid grid-cols-2 lg:grid-cols-4 gap-3">
          {PELERIN_DOC_TYPES.map(doc => {
            const stat = metrics.breakdown[doc.id];
            const isFilterActive = filterStatus === `no_${doc.id}`;

            return (
              <Card 
                key={doc.id}
                onClick={() => setFilterStatus(prev => prev === `no_${doc.id}` ? 'all' : `no_${doc.id}`)}
                className={cn(
                  "cursor-pointer transition-all hover:shadow-md border rounded-xl overflow-hidden bg-white",
                  isFilterActive && "ring-2 ring-primary border-primary shadow-sm"
                )}
              >
                <CardContent className="p-4 flex flex-col justify-between h-full">
                  <div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className={cn(
                          "w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs",
                          doc.id === 'visa' && "bg-emerald-100 text-emerald-700",
                          doc.id === 'billet' && "bg-blue-100 text-blue-700",
                          doc.id === 'badge' && "bg-purple-100 text-purple-700",
                          doc.id === 'contrat' && "bg-amber-100 text-amber-700",
                        )}>
                          {doc.id === 'visa' && <ShieldCheck size={16} />}
                          {doc.id === 'billet' && <Plane size={16} />}
                          {doc.id === 'badge' && <IdCard size={16} />}
                          {doc.id === 'contrat' && <FileSignature size={16} />}
                        </span>
                        <span className="font-bold text-sm text-slate-800">{doc.label}</span>
                      </div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        {doc.labelAr}
                      </span>
                    </div>

                    <div className="mt-3 flex items-baseline justify-between">
                      <span className="text-2xl font-black text-slate-900">
                        {stat.count}
                        <span className="text-xs font-semibold text-slate-400">/{stat.total}</span>
                      </span>
                      <span className={cn(
                        "text-xs font-extrabold px-2 py-0.5 rounded-full",
                        stat.percent === 100 ? "bg-emerald-100 text-emerald-800" :
                        stat.percent >= 50 ? "bg-blue-100 text-blue-800" : "bg-slate-100 text-slate-700"
                      )}>
                        {stat.percent}%
                      </span>
                    </div>
                  </div>

                  <div className="mt-3">
                    <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                      <div 
                        className={cn(
                          "h-full rounded-full transition-all duration-500",
                          doc.id === 'visa' && "bg-emerald-600",
                          doc.id === 'billet' && "bg-blue-600",
                          doc.id === 'badge' && "bg-purple-600",
                          doc.id === 'contrat' && "bg-amber-500"
                        )}
                        style={{ width: `${stat.percent}%` }}
                      />
                    </div>
                    <div className="mt-1.5 flex items-center justify-between text-[10px] text-slate-400">
                      <span>Reste à faire :</span>
                      <span className="font-bold text-slate-600">{stat.total - stat.count}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* ── Barre de Contrôle : Recherche, Filtres & Actions Groupées ── */}
      <div className="space-y-3 bg-white p-4 rounded-xl border shadow-xs">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Recherche */}
          <div className="relative flex-1 max-w-md">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Rechercher par nom, passeport, chambre, téléphone..."
              className="pl-9 h-9 text-xs"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Actions groupées */}
          <div className="flex items-center gap-2 flex-wrap">
            {selectedKeys.size > 0 && (
              <span className="text-xs font-bold text-primary bg-primary/10 px-2.5 py-1.5 rounded-lg border border-primary/20">
                {selectedKeys.size} sélectionné(s)
              </span>
            )}

            <Button
              size="sm"
              variant="outline"
              onClick={() => setConfirmBulkAction({ type: 'all_100', label: selectedKeys.size > 0 ? 'Valider tout (100%) pour la sélection' : 'Valider tout (100%) pour tout le groupe' })}
              className="text-xs h-9 gap-1 font-semibold text-emerald-700 border-emerald-300 hover:bg-emerald-50"
            >
              <CheckCircle2 size={14} className="text-emerald-600" />
              Tout valider à 100%
            </Button>

            <div className="h-5 w-px bg-slate-200 hidden sm:block" />

            {/* Boutons validation rapide par document */}
            <Button
              size="sm"
              variant="outline"
              onClick={() => setConfirmBulkAction({ type: 'visa', label: selectedKeys.size > 0 ? 'Valider les Visas de la sélection' : 'Valider tous les Visas du groupe' })}
              className="text-xs h-9 gap-1 font-semibold text-emerald-700 hover:bg-emerald-50"
            >
              <ShieldCheck size={14} />
              + Visas
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setConfirmBulkAction({ type: 'billet', label: selectedKeys.size > 0 ? 'Valider les Billets de la sélection' : 'Valider tous les Billets du groupe' })}
              className="text-xs h-9 gap-1 font-semibold text-blue-700 hover:bg-blue-50"
            >
              <Plane size={14} />
              + Billets
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setConfirmBulkAction({ type: 'badge', label: selectedKeys.size > 0 ? 'Valider les Badges de la sélection' : 'Valider tous les Badges du groupe' })}
              className="text-xs h-9 gap-1 font-semibold text-purple-700 hover:bg-purple-50"
            >
              <IdCard size={14} />
              + Badges
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setConfirmBulkAction({ type: 'contrat', label: selectedKeys.size > 0 ? 'Valider les Contrats de la sélection' : 'Valider tous les Contrats du groupe' })}
              className="text-xs h-9 gap-1 font-semibold text-amber-700 hover:bg-amber-50"
            >
              <FileSignature size={14} />
              + Contrats
            </Button>

            {isAdmin && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setConfirmBulkAction({ type: 'reset', label: selectedKeys.size > 0 ? 'Réinitialiser les documents de la sélection' : 'Réinitialiser tous les documents du groupe' })}
                className="text-xs h-9 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
              >
                <RotateCcw size={13} />
              </Button>
            )}
          </div>
        </div>

        {/* Pilules de Filtrage */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-2 border-t border-slate-100 text-xs">
          <span className="text-slate-400 font-semibold mr-1 shrink-0">Filtres :</span>
          
          <button
            onClick={() => setFilterStatus('all')}
            className={cn(
              "px-3 py-1 rounded-full font-semibold transition-colors shrink-0",
              filterStatus === 'all' 
                ? "bg-slate-900 text-white" 
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            )}
          >
            Tous ({allPilgrims.length})
          </button>

          <button
            onClick={() => setFilterStatus('complet')}
            className={cn(
              "px-3 py-1 rounded-full font-semibold transition-colors shrink-0 flex items-center gap-1",
              filterStatus === 'complet' 
                ? "bg-emerald-600 text-white" 
                : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200"
            )}
          >
            <CheckCircle2 size={12} />
            100% Complets ({metrics.completeCount})
          </button>

          <button
            onClick={() => setFilterStatus('en_cours')}
            className={cn(
              "px-3 py-1 rounded-full font-semibold transition-colors shrink-0",
              filterStatus === 'en_cours' 
                ? "bg-amber-600 text-white" 
                : "bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200"
            )}
          >
            En cours ({metrics.inProgressCount})
          </button>

          <button
            onClick={() => setFilterStatus('non_commence')}
            className={cn(
              "px-3 py-1 rounded-full font-semibold transition-colors shrink-0",
              filterStatus === 'non_commence' 
                ? "bg-rose-600 text-white" 
                : "bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200"
            )}
          >
            Non commencés ({metrics.notStartedCount})
          </button>

          <div className="h-4 w-px bg-slate-200 mx-1 shrink-0" />

          <button
            onClick={() => setFilterStatus('no_visa')}
            className={cn(
              "px-3 py-1 rounded-full font-semibold transition-colors shrink-0",
              filterStatus === 'no_visa' 
                ? "bg-emerald-700 text-white" 
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            )}
          >
            Sans Visa ({allPilgrims.length - metrics.breakdown.visa.count})
          </button>

          <button
            onClick={() => setFilterStatus('no_billet')}
            className={cn(
              "px-3 py-1 rounded-full font-semibold transition-colors shrink-0",
              filterStatus === 'no_billet' 
                ? "bg-blue-700 text-white" 
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            )}
          >
            Sans Billet ({allPilgrims.length - metrics.breakdown.billet.count})
          </button>

          <button
            onClick={() => setFilterStatus('no_badge')}
            className={cn(
              "px-3 py-1 rounded-full font-semibold transition-colors shrink-0",
              filterStatus === 'no_badge' 
                ? "bg-purple-700 text-white" 
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            )}
          >
            Sans Badge ({allPilgrims.length - metrics.breakdown.badge.count})
          </button>

          <button
            onClick={() => setFilterStatus('no_contrat')}
            className={cn(
              "px-3 py-1 rounded-full font-semibold transition-colors shrink-0",
              filterStatus === 'no_contrat' 
                ? "bg-amber-700 text-white" 
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            )}
          >
            Sans Contrat ({allPilgrims.length - metrics.breakdown.contrat.count})
          </button>
        </div>
      </div>

      {/* ── Table des Pèlerins & Documents ── */}
      <Card className="overflow-hidden border border-slate-200 shadow-sm bg-white rounded-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse">
            <thead className="bg-slate-50 text-slate-700 text-xs uppercase font-bold border-b border-slate-200">
              <tr>
                <th className="px-3 py-3 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={selectedKeys.size === filteredPilgrims.length && filteredPilgrims.length > 0}
                    onChange={handleToggleSelectAll}
                    className="rounded border-slate-300 text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                  />
                </th>
                <th className="px-3 py-3 w-10 text-center font-bold text-slate-400">#</th>
                <th className="px-4 py-3 min-w-[220px]">Pèlerin (Muatamir)</th>
                <th className="px-3 py-3 min-w-[120px]">Passeport</th>
                <th className="px-3 py-3 min-w-[130px]">Hôtel / Chambre</th>
                
                {/* 4 Colonnes Documents */}
                <th className="px-3 py-3 text-center min-w-[110px] text-emerald-700 bg-emerald-50/50">
                  <div className="flex items-center justify-center gap-1">
                    <ShieldCheck size={14} />
                    <span>Visa</span>
                  </div>
                </th>
                <th className="px-3 py-3 text-center min-w-[110px] text-blue-700 bg-blue-50/50">
                  <div className="flex items-center justify-center gap-1">
                    <Plane size={14} />
                    <span>Billet</span>
                  </div>
                </th>
                <th className="px-3 py-3 text-center min-w-[110px] text-purple-700 bg-purple-50/50">
                  <div className="flex items-center justify-center gap-1">
                    <IdCard size={14} />
                    <span>Badge</span>
                  </div>
                </th>
                <th className="px-3 py-3 text-center min-w-[110px] text-amber-700 bg-amber-50/50">
                  <div className="flex items-center justify-center gap-1">
                    <FileSignature size={14} />
                    <span>Contrat</span>
                  </div>
                </th>

                {/* Progression & Actions */}
                <th className="px-4 py-3 text-center min-w-[140px]">Suivi (%)</th>
                <th className="px-3 py-3 text-center w-20">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredPilgrims.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-4 py-16 text-center text-slate-400">
                    <Users size={36} className="mx-auto mb-2 opacity-30" />
                    <p className="font-semibold text-slate-700">Aucun pèlerin trouvé</p>
                    <p className="text-xs text-slate-400 mt-0.5">Modifiez vos critères de recherche ou réinitialisez les filtres.</p>
                  </td>
                </tr>
              ) : (
                filteredPilgrims.map((p, idx) => {
                  const isSelected = selectedKeys.has(p.uniqueKey);
                  const isSaving = savingKey === p.uniqueKey;
                  const prog = p.progress;
                  const docs = p.docs;

                  return (
                    <tr 
                      key={p.uniqueKey}
                      className={cn(
                        "hover:bg-slate-50/80 transition-colors",
                        isSelected && "bg-primary/5",
                        prog.isComplete && "bg-emerald-50/20"
                      )}
                    >
                      {/* Checkbox sélection */}
                      <td className="px-3 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelectOne(p.uniqueKey)}
                          className="rounded border-slate-300 text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                        />
                      </td>

                      {/* N° ligne */}
                      <td className="px-3 py-3 text-center font-bold text-xs text-slate-400">
                        {idx + 1}
                      </td>

                      {/* Infos Pèlerin */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          {p.photo ? (
                            <img 
                              src={p.photo} 
                              alt={p.fullNameFr} 
                              className="w-8 h-8 rounded-full object-cover shrink-0 border border-slate-300 shadow-2xs" 
                            />
                          ) : (
                            <div className={cn(
                              "w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs",
                              p.isEnfantSansLit 
                                ? "bg-purple-100 text-purple-700" 
                                : p.sexe === 'F' 
                                  ? "bg-pink-100 text-pink-700" 
                                  : "bg-blue-100 text-blue-700"
                            )}>
                              {p.nom ? p.nom.charAt(0).toUpperCase() : 'P'}
                            </div>
                          )}

                          <div className="flex flex-col min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-slate-900 truncate">
                                {p.fullNameFr}
                              </span>
                              {p.isEnfantSansLit && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-purple-100 text-purple-700">
                                  Enfant
                                </span>
                              )}
                            </div>
                            {p.fullNameAr && (
                              <span className="text-[11px] text-slate-500 font-arabic direction-rtl truncate">
                                {p.fullNameAr}
                              </span>
                            )}
                            {p.telephone && (
                              <span className="text-[10px] text-slate-400">
                                📞 {p.telephone}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Passeport */}
                      <td className="px-3 py-3">
                        <span className="font-mono text-xs font-semibold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                          {p.passport}
                        </span>
                      </td>

                      {/* Logement / Chambre */}
                      <td className="px-3 py-3">
                        <div className="text-xs">
                          <div className="font-semibold text-slate-800 flex items-center gap-1">
                            <Building2 size={12} className="text-slate-400 shrink-0" />
                            <span className="truncate">{p.chambreTitre}</span>
                          </div>
                          <div className="text-[10px] text-slate-400 truncate">
                            {p.hotelNom}
                          </div>
                        </div>
                      </td>

                      {/* 1. VISA */}
                      <td className="px-3 py-3 text-center bg-emerald-50/20">
                        <button
                          type="button"
                          onClick={() => handleToggleDoc(p, 'visa')}
                          className={cn(
                            "w-full py-1.5 px-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer",
                            docs.visa
                              ? "bg-emerald-600 text-white shadow-xs hover:bg-emerald-700"
                              : "bg-slate-100 text-slate-400 hover:bg-slate-200 border border-slate-200 hover:text-slate-700"
                          )}
                        >
                          {docs.visa ? <Check size={13} strokeWidth={3} /> : <Square size={13} />}
                          <span>{docs.visa ? 'Validé' : 'À faire'}</span>
                        </button>
                      </td>

                      {/* 2. BILLET */}
                      <td className="px-3 py-3 text-center bg-blue-50/20">
                        <button
                          type="button"
                          onClick={() => handleToggleDoc(p, 'billet')}
                          className={cn(
                            "w-full py-1.5 px-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer",
                            docs.billet
                              ? "bg-blue-600 text-white shadow-xs hover:bg-blue-700"
                              : "bg-slate-100 text-slate-400 hover:bg-slate-200 border border-slate-200 hover:text-slate-700"
                          )}
                        >
                          {docs.billet ? <Check size={13} strokeWidth={3} /> : <Square size={13} />}
                          <span>{docs.billet ? 'Émis' : 'À faire'}</span>
                        </button>
                      </td>

                      {/* 3. BADGE */}
                      <td className="px-3 py-3 text-center bg-purple-50/20">
                        <button
                          type="button"
                          onClick={() => handleToggleDoc(p, 'badge')}
                          className={cn(
                            "w-full py-1.5 px-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer",
                            docs.badge
                              ? "bg-purple-600 text-white shadow-xs hover:bg-purple-700"
                              : "bg-slate-100 text-slate-400 hover:bg-slate-200 border border-slate-200 hover:text-slate-700"
                          )}
                        >
                          {docs.badge ? <Check size={13} strokeWidth={3} /> : <Square size={13} />}
                          <span>{docs.badge ? 'Prêt' : 'À faire'}</span>
                        </button>
                      </td>

                      {/* 4. CONTRAT */}
                      <td className="px-3 py-3 text-center bg-amber-50/20">
                        <button
                          type="button"
                          onClick={() => handleToggleDoc(p, 'contrat')}
                          className={cn(
                            "w-full py-1.5 px-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer",
                            docs.contrat
                              ? "bg-amber-600 text-white shadow-xs hover:bg-amber-700"
                              : "bg-slate-100 text-slate-400 hover:bg-slate-200 border border-slate-200 hover:text-slate-700"
                          )}
                        >
                          {docs.contrat ? <Check size={13} strokeWidth={3} /> : <Square size={13} />}
                          <span>{docs.contrat ? 'Signé' : 'À faire'}</span>
                        </button>
                      </td>

                      {/* Progression / Pourcentage par Mutamir */}
                      <td className="px-4 py-3 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <div className="flex items-center gap-1.5">
                            <span className={cn(
                              "text-xs font-extrabold px-2 py-0.5 rounded-full inline-flex items-center gap-1 shadow-2xs",
                              prog.percentage === 100 ? "bg-emerald-100 text-emerald-800 border border-emerald-300" :
                              prog.percentage >= 50 ? "bg-blue-100 text-blue-800 border border-blue-300" :
                              prog.percentage > 0 ? "bg-amber-100 text-amber-800 border border-amber-300" :
                              "bg-slate-100 text-slate-600 border border-slate-200"
                            )}>
                              {prog.percentage === 100 && <CheckCircle2 size={11} className="text-emerald-600" />}
                              {prog.percentage}%
                            </span>
                            <span className="text-[10px] text-slate-400 font-bold">
                              ({prog.completedCount}/4)
                            </span>
                          </div>

                          <div className="w-24 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                            <div 
                              className={cn(
                                "h-full rounded-full transition-all duration-300",
                                prog.percentage === 100 ? "bg-emerald-600" :
                                prog.percentage >= 50 ? "bg-blue-600" :
                                prog.percentage > 0 ? "bg-amber-500" : "bg-transparent"
                              )}
                              style={{ width: `${prog.percentage}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Actions individuelles */}
                      <td className="px-3 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            title={prog.isComplete ? "Tout décocher" : "Tout valider (100%)"}
                            onClick={() => handleSetAllDocsForPilgrim(p, !prog.isComplete)}
                            className={cn(
                              "w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold transition-colors",
                              prog.isComplete 
                                ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200" 
                                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                            )}
                          >
                            <Sparkles size={13} />
                          </button>

                          <button
                            type="button"
                            title={docs.remarque ? `Note: ${docs.remarque}` : "Ajouter une note"}
                            onClick={() => handleOpenNoteDialog(p)}
                            className={cn(
                              "w-7 h-7 rounded-lg flex items-center justify-center text-xs transition-colors",
                              docs.remarque 
                                ? "bg-amber-100 text-amber-800 hover:bg-amber-200" 
                                : "bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-700"
                            )}
                          >
                            <MessageSquare size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* ── Dialog Observation / Note Pèlerin ── */}
      <Dialog open={isNoteDialogOpen} onOpenChange={setIsNoteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare size={18} className="text-primary" />
              Note / Observation Documents
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-2">
            {activePilgrimForNote && (
              <div className="p-3 bg-slate-50 rounded-lg border text-xs space-y-1">
                <div className="font-bold text-slate-900">{activePilgrimForNote.fullNameFr}</div>
                <div className="text-slate-500 font-mono">Passeport: {activePilgrimForNote.passport}</div>
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Remarque concernant les documents :</Label>
              <Textarea
                rows={3}
                value={noteContent}
                onChange={e => setNoteContent(e.target.value)}
                placeholder="Ex: Visa en cours au consulat, billet payé par virement, badge à réimprimer..."
                className="text-xs"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setIsNoteDialogOpen(false)}>
              Annuler
            </Button>
            <Button size="sm" onClick={handleSaveNote} className="bg-primary text-white">
              Enregistrer la note
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog Confirmation Action Groupée ── */}
      <Dialog open={Boolean(confirmBulkAction)} onOpenChange={() => setConfirmBulkAction(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle size={18} className="text-primary" />
              Confirmer l'action groupée
            </DialogTitle>
          </DialogHeader>

          <div className="py-3 text-xs text-slate-600 space-y-2">
            <p>
              Êtes-vous sûr de vouloir exécuter l'action suivante :
            </p>
            <div className="p-3 bg-slate-100 rounded-lg font-bold text-slate-900 border">
              {confirmBulkAction?.label}
            </div>
            <p className="text-[11px] text-slate-400">
              Cette action mettra à jour instantanément les dossiers concernés et sera enregistrée dans la base de données.
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setConfirmBulkAction(null)}>
              Annuler
            </Button>
            <Button 
              size="sm" 
              onClick={() => handleExecuteBulkAction(confirmBulkAction?.type)}
              className={confirmBulkAction?.type === 'reset' ? 'bg-rose-600 hover:bg-rose-700 text-white' : 'bg-primary text-white'}
            >
              Confirmer et appliquer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
