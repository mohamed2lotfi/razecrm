import React, { useState, useEffect } from 'react';
import { 
  CheckSquare, Square, Clock, AlertTriangle, CheckCircle2, 
  Printer, Plus, RotateCcw, Search, Calendar, Plane, 
  Users, Building2, Tag, Save, Edit2, Trash2, Check, X,
  AlertCircle, ArrowUpDown, ChevronDown, ListFilter, Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { 
  DEFAULT_OMRA_TASKS, 
  CHECKLIST_STATUS, 
  CHECKLIST_STATUS_CONFIG, 
  calculateDueDate, 
  formatDateFr, 
  getDefaultChecklist, 
  syncChecklistDueDates, 
  getChecklistStats 
} from '@/lib/omraChecklistConstants';

const OmraGroupChecklistTab = ({ groupe, onUpdateGroup, agencySettings, isAdmin }) => {
  const [checklist, setChecklist] = useState([]);
  const [filterStatus, setFilterStatus] = useState('all'); // 'all' | 'pas_encore' | 'en_cours' | 'ok' | 'retard'
  const [searchQuery, setSearchQuery] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState('');

  // Dialog pour ajouter / éditer une tâche
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [taskFormData, setTaskFormData] = useState({
    id: '',
    designation: '',
    daysBefore: 2,
    dueDate: '',
    statut: CHECKLIST_STATUS.PAS_ENCORE,
    remarque: '',
    category: 'Général'
  });

  // Initialisation de la checklist depuis le groupe
  useEffect(() => {
    if (groupe) {
      if (Array.isArray(groupe.checklist) && groupe.checklist.length > 0) {
        // Synchroniser les due dates au cas où la date de départ a été modifiée
        setChecklist(syncChecklistDueDates(groupe.checklist, groupe.date_depart));
      } else {
        // Initialiser avec les 16 tâches par défaut
        setChecklist(getDefaultChecklist(groupe.date_depart));
      }
    }
  }, [groupe?.id, groupe?.date_depart]);

  // Sauvegarde dans Supabase
  const saveChecklistToSupabase = async (newChecklist) => {
    if (!groupe?.id) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('omra_groupes')
        .update({ checklist: newChecklist })
        .eq('id', groupe.id);

      if (error) {
        console.warn("Échec de mise à jour Supabase (colonne checklist non migrée ou erreur):", error.message);
        // Fallback local
        try {
          localStorage.setItem(`omra_checklist_${groupe.id}`, JSON.stringify(newChecklist));
        } catch (e) {}
      }

      if (onUpdateGroup) {
        onUpdateGroup({ ...groupe, checklist: newChecklist });
      }

      setSaveSuccessMessage('Enregistré');
      setTimeout(() => setSaveSuccessMessage(''), 2500);
    } catch (err) {
      console.error('Erreur sauvegarde checklist:', err);
    } finally {
      setSaving(false);
    }
  };

  // Changement rapide de statut
  const handleStatusChange = (taskId, newStatus) => {
    const updated = checklist.map(t => {
      if (t.id === taskId) {
        return {
          ...t,
          statut: newStatus,
          completedAt: newStatus === CHECKLIST_STATUS.OK ? new Date().toISOString() : null,
          updatedAt: new Date().toISOString()
        };
      }
      return t;
    });

    setChecklist(updated);
    saveChecklistToSupabase(updated);
  };

  // Mise à jour de la remarque
  const handleRemarqueChange = (taskId, newRemarque) => {
    const updated = checklist.map(t => {
      if (t.id === taskId) {
        return { ...t, remarque: newRemarque, updatedAt: new Date().toISOString() };
      }
      return t;
    });
    setChecklist(updated);
  };

  // Sauvegarde après blur sur la remarque
  const handleRemarqueBlur = () => {
    saveChecklistToSupabase(checklist);
  };

  // Réinitialiser avec les 16 tâches par défaut
  const handleResetToDefault = () => {
    if (window.confirm("Êtes-vous sûr de vouloir réinitialiser la checklist aux 16 tâches standards ? Vos remarques et statuts actuels seront remplacés.")) {
      const defaultList = getDefaultChecklist(groupe?.date_depart);
      setChecklist(defaultList);
      saveChecklistToSupabase(defaultList);
    }
  };

  // Ouvrir modale ajout/édition tâche
  const handleOpenTaskModal = (task = null) => {
    if (task) {
      setEditingTask(task);
      setTaskFormData({
        id: task.id,
        designation: task.designation,
        daysBefore: task.daysBefore !== undefined ? task.daysBefore : 2,
        dueDate: task.dueDate || calculateDueDate(groupe?.date_depart, task.daysBefore || 2),
        statut: task.statut || CHECKLIST_STATUS.PAS_ENCORE,
        remarque: task.remarque || '',
        category: task.category || 'Général'
      });
    } else {
      setEditingTask(null);
      const defaultDays = 2;
      setTaskFormData({
        id: `custom_${Date.now()}`,
        designation: '',
        daysBefore: defaultDays,
        dueDate: calculateDueDate(groupe?.date_depart, defaultDays),
        statut: CHECKLIST_STATUS.PAS_ENCORE,
        remarque: '',
        category: 'Personnalisée'
      });
    }
    setIsTaskModalOpen(true);
  };

  // Sauvegarder la modale tâche
  const handleSaveTaskModal = (e) => {
    e.preventDefault();
    if (!taskFormData.designation.trim()) {
      alert("Veuillez saisir une désignation pour la tâche.");
      return;
    }

    const calculatedDue = taskFormData.dueDate || calculateDueDate(groupe?.date_depart, taskFormData.daysBefore);

    let updated;
    if (editingTask) {
      updated = checklist.map(t => t.id === editingTask.id ? {
        ...t,
        designation: taskFormData.designation.trim(),
        daysBefore: Number(taskFormData.daysBefore) || 0,
        dueDate: calculatedDue,
        statut: taskFormData.statut,
        remarque: taskFormData.remarque,
        category: taskFormData.category || 'Général',
        updatedAt: new Date().toISOString()
      } : t);
    } else {
      const newTask = {
        id: taskFormData.id || `custom_${Date.now()}`,
        designation: taskFormData.designation.trim(),
        daysBefore: Number(taskFormData.daysBefore) || 0,
        dueDate: calculatedDue,
        statut: taskFormData.statut,
        remarque: taskFormData.remarque,
        category: taskFormData.category || 'Personnalisée',
        updatedAt: new Date().toISOString()
      };
      updated = [...checklist, newTask];
    }

    setChecklist(updated);
    saveChecklistToSupabase(updated);
    setIsTaskModalOpen(false);
  };

  // Supprimer une tâche
  const handleDeleteTask = (taskId, taskName) => {
    if (window.confirm(`Supprimer la tâche "${taskName}" ?`)) {
      const updated = checklist.filter(t => t.id !== taskId);
      setChecklist(updated);
      saveChecklistToSupabase(updated);
    }
  };

  // Statistiques
  const stats = getChecklistStats(checklist, groupe?.date_depart);
  const todayStr = new Date().toISOString().split('T')[0];

  // Calcul du compte à rebours avant départ
  const daysUntilDeparture = (() => {
    if (!groupe?.date_depart) return null;
    const dep = new Date(groupe.date_depart);
    const now = new Date();
    dep.setHours(0, 0, 0, 0);
    now.setHours(0, 0, 0, 0);
    const diff = Math.round((dep - now) / (1000 * 60 * 60 * 24));
    return diff;
  })();

  // Filtrage des tâches
  const filteredTasks = checklist.filter(task => {
    // Filtre recherche textuelle
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchDesig = task.designation?.toLowerCase().includes(q);
      const matchRem = task.remarque?.toLowerCase().includes(q);
      const matchCat = task.category?.toLowerCase().includes(q);
      if (!matchDesig && !matchRem && !matchCat) return false;
    }

    // Filtre par statut
    if (filterStatus === 'all') return true;
    if (filterStatus === 'ok') return task.statut === CHECKLIST_STATUS.OK;
    if (filterStatus === 'en_cours') return task.statut === CHECKLIST_STATUS.EN_COURS;
    if (filterStatus === 'pas_encore') return !task.statut || task.statut === CHECKLIST_STATUS.PAS_ENCORE;
    if (filterStatus === 'retard') {
      return task.statut !== CHECKLIST_STATUS.OK && task.dueDate && task.dueDate < todayStr;
    }
    return true;
  });

  // Impression de la checklist au format haute qualité
  const handlePrintChecklist = () => {
    const agencyName = agencySettings?.nom_agence || 'EL MOKHTAR TRAVEL VOYAGES & OMRA';
    const agencyPhone = agencySettings?.telephone || '';
    const agencyEmail = agencySettings?.email || '';
    const agencyLogo = agencySettings?.logo_url || '';
    const groupCode = groupe?.code || `OMRAETV001/1448`;
    const exportDate = new Date().toLocaleDateString('fr-FR', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });

    const rowsHtml = checklist.map((t, idx) => {
      const isOverdue = t.statut !== CHECKLIST_STATUS.OK && t.dueDate && t.dueDate < todayStr;
      const isOk = t.statut === CHECKLIST_STATUS.OK;
      const isEnCours = t.statut === CHECKLIST_STATUS.EN_COURS;
      
      let statusBadgeHtml = '';
      if (isOk) {
        statusBadgeHtml = `<span class="badge badge-ok">✓ OK</span>`;
      } else if (isEnCours) {
        statusBadgeHtml = `<span class="badge badge-encours">⏳ EN COURS</span>`;
      } else {
        statusBadgeHtml = `<span class="badge badge-todo">PAS ENCORE</span>`;
      }

      const dueFormatted = t.dueDate ? formatDateFr(t.dueDate) : '—';
      const daysText = t.daysBefore !== undefined ? `J-${t.daysBefore}` : '';

      return `
        <tr class="${isOverdue ? 'overdue-row' : ''}">
          <td style="text-align: center; font-weight: 700; width: 35px;">${idx + 1}</td>
          <td style="width: 30px; text-align: center;">
            <div class="checkbox-box ${isOk ? 'checked' : ''}">${isOk ? '✓' : ''}</div>
          </td>
          <td style="font-weight: 600;">
            <div class="task-title">${t.designation}</div>
            <div class="task-cat">${t.category || ''}</div>
          </td>
          <td style="text-align: center; font-weight: 700; white-space: nowrap;">
            <div class="deadline-main ${isOverdue ? 'deadline-alert' : ''}">${dueFormatted}</div>
            ${daysText ? `<div class="deadline-sub">(${daysText})</div>` : ''}
          </td>
          <td style="text-align: center; width: 110px;">
            ${statusBadgeHtml}
          </td>
          <td style="font-size: 11px; color: #334155; max-width: 250px;">
            ${t.remarque ? t.remarque : '<span style="color: #cbd5e1; font-style: italic;">—</span>'}
          </td>
        </tr>
      `;
    }).join('');

    const printHtml = `
      <!DOCTYPE html>
      <html lang="fr">
      <head>
        <meta charset="utf-8">
        <title>Checklist Vol - ${groupe?.nom || 'Groupe Omra'} (${groupCode})</title>
        <style>
          * { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
          body { padding: 25px; color: #0f172a; font-size: 12px; line-height: 1.4; background: #fff; }
          
          .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 2px solid #047857;
            padding-bottom: 12px;
            margin-bottom: 16px;
          }
          .logo { max-height: 55px; object-fit: contain; }
          .agency-title { font-size: 18px; font-weight: 900; color: #065f46; letter-spacing: -0.5px; }
          .agency-meta { font-size: 11px; color: #64748b; }

          .doc-banner {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            background: #f0fdf4;
            border: 1px solid #bbf7d0;
            border-radius: 8px;
            padding: 14px 18px;
            margin-bottom: 16px;
          }
          .doc-title { font-size: 20px; font-weight: 800; color: #065f46; margin: 0 0 4px 0; }
          .group-code {
            display: inline-block;
            background: #047857;
            color: #fff;
            font-size: 12px;
            font-weight: 800;
            padding: 3px 8px;
            border-radius: 4px;
            font-family: monospace;
            letter-spacing: 0.5px;
          }
          .group-meta { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px 16px; font-size: 12px; margin-top: 8px; }
          .group-meta b { color: #0f172a; }
          .group-meta span { color: #475569; }

          .kpi-row {
            display: flex;
            gap: 12px;
            margin-bottom: 16px;
          }
          .kpi-box {
            flex: 1;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            padding: 8px 12px;
            text-align: center;
          }
          .kpi-num { font-size: 18px; font-weight: 800; color: #0f172a; }
          .kpi-lbl { font-size: 10px; text-transform: uppercase; font-weight: 700; color: #64748b; }

          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          th {
            background: #065f46;
            color: #fff;
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
            padding: 8px 10px;
            border: 1px solid #047857;
            text-align: left;
          }
          td {
            padding: 7px 10px;
            border: 1px solid #e2e8f0;
            font-size: 11.5px;
            vertical-align: middle;
          }
          tr:nth-child(even) { background-color: #f8fafc; }
          .overdue-row { background-color: #fff1f2 !important; }

          .task-title { font-weight: 700; color: #0f172a; font-size: 12px; }
          .task-cat { font-size: 9.5px; color: #64748b; text-transform: uppercase; font-weight: 600; }
          .deadline-main { font-weight: 700; color: #047857; }
          .deadline-alert { color: #e11d48; }
          .deadline-sub { font-size: 9px; color: #64748b; }

          .checkbox-box {
            width: 16px;
            height: 16px;
            border: 1.5px solid #64748b;
            border-radius: 3px;
            margin: 0 auto;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 11px;
            font-weight: 900;
          }
          .checkbox-box.checked { background: #047857; border-color: #047857; color: #fff; }

          .badge {
            display: inline-block;
            font-size: 9.5px;
            font-weight: 800;
            padding: 2px 6px;
            border-radius: 4px;
            text-transform: uppercase;
            letter-spacing: 0.3px;
          }
          .badge-ok { background: #dcfce7; color: #166534; border: 1px solid #86efac; }
          .badge-encours { background: #fef3c7; color: #92400e; border: 1px solid #fcd34d; }
          .badge-todo { background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; }

          .signature-section {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 20px;
            margin-top: 30px;
            page-break-inside: avoid;
          }
          .sig-box {
            border: 1px dashed #94a3b8;
            border-radius: 6px;
            padding: 12px;
            height: 95px;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
          }
          .sig-title { font-size: 10px; font-weight: 700; text-transform: uppercase; color: #475569; }
          
          .footer {
            margin-top: 25px;
            padding-top: 8px;
            border-top: 1px solid #e2e8f0;
            display: flex;
            justify-content: space-between;
            font-size: 9.5px;
            color: #94a3b8;
          }

          @media print {
            body { padding: 10px; }
            @page { margin: 12mm; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="agency-title">${agencyName}</div>
            <div class="agency-meta">${agencyPhone ? 'Tél : ' + agencyPhone : ''} ${agencyEmail ? ' | Email : ' + agencyEmail : ''}</div>
          </div>
          ${agencyLogo ? `<img src="${agencyLogo}" class="logo" alt="Logo" />` : ''}
        </div>

        <div class="doc-banner">
          <div style="flex: 1;">
            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 4px;">
              <h1 class="doc-title">CHECKLIST PRÉPARATION VOL</h1>
              <span class="group-code">${groupCode}</span>
            </div>
            <div style="font-size: 15px; font-weight: 800; color: #1e293b;">${groupe?.nom || 'GROUPE OMRA'}</div>
            
            <div class="group-meta">
              <div><span>Date Départ :</span> <b>${formatDateFr(groupe?.date_depart)}</b></div>
              <div><span>Date Retour :</span> <b>${formatDateFr(groupe?.date_retour)}</b></div>
              <div><span>Compagnie :</span> <b>${groupe?.compagnie || '—'}</b></div>
              <div><span>Places / Pèlerins :</span> <b>${groupe?.nbr_places || 0} pax</b></div>
              <div><span>Délai départ :</span> <b>${daysUntilDeparture !== null ? (daysUntilDeparture >= 0 ? `J-${daysUntilDeparture}` : `Départ passé`) : '—'}</b></div>
              <div><span>Statut Global :</span> <b>${stats.percent}% Prêt (${stats.ok}/${stats.total} OK)</b></div>
            </div>
          </div>
        </div>

        <div class="kpi-row">
          <div class="kpi-box">
            <div class="kpi-num">${stats.total}</div>
            <div class="kpi-lbl">Total Tâches</div>
          </div>
          <div class="kpi-box" style="background: #f0fdf4; border-color: #bbf7d0;">
            <div class="kpi-num" style="color: #166534;">${stats.ok}</div>
            <div class="kpi-lbl" style="color: #166534;">Validées (OK)</div>
          </div>
          <div class="kpi-box" style="background: #fffbeb; border-color: #fde68a;">
            <div class="kpi-num" style="color: #92400e;">${stats.enCours}</div>
            <div class="kpi-lbl" style="color: #92400e;">En cours</div>
          </div>
          <div class="kpi-box">
            <div class="kpi-num" style="color: #64748b;">${stats.pasEncore}</div>
            <div class="kpi-lbl">Pas encore</div>
          </div>
          <div class="kpi-box" style="background: ${stats.enRetard > 0 ? '#fff1f2' : '#f8fafc'}; border-color: ${stats.enRetard > 0 ? '#fecdd3' : '#e2e8f0'};">
            <div class="kpi-num" style="color: ${stats.enRetard > 0 ? '#be123c' : '#64748b'};">${stats.enRetard}</div>
            <div class="kpi-lbl" style="color: ${stats.enRetard > 0 ? '#be123c' : '#64748b'};">En retard</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="text-align: center; width: 35px;">N°</th>
              <th style="text-align: center; width: 30px;">État</th>
              <th>Désignation de la Tâche</th>
              <th style="text-align: center; width: 130px;">Échéance / Deadline</th>
              <th style="text-align: center; width: 110px;">Statut</th>
              <th>Remarques & Observations</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>

        <div class="signature-section">
          <div class="sig-box">
            <div class="sig-title">Responsable Billetterie & Vol</div>
            <div style="font-size: 9px; color: #94a3b8;">Date & Signature :</div>
          </div>
          <div class="sig-box">
            <div class="sig-title">Responsable Visas & Logistique</div>
            <div style="font-size: 9px; color: #94a3b8;">Date & Signature :</div>
          </div>
          <div class="sig-box">
            <div class="sig-title">Direction / Cachet Agence</div>
            <div style="font-size: 9px; color: #94a3b8;">Date & Signature :</div>
          </div>
        </div>

        <div class="footer">
          <div>Document généré depuis le module CRM Omra &bull; <b>${groupCode}</b></div>
          <div>Émis le ${exportDate}</div>
        </div>

        <script>
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank', 'width=1000,height=800');
    if (!printWindow) {
      alert("Veuillez autoriser les fenêtres pop-up dans votre navigateur pour imprimer la checklist.");
      return;
    }
    printWindow.document.write(printHtml);
    printWindow.document.close();
  };

  return (
    <div className="space-y-6">
      {/* ── Bandeau Récapitulatif & KPIs ────────────────────────── */}
      <Card className="border-0 shadow-md ring-1 ring-black/5 bg-gradient-to-br from-card to-muted/30 overflow-hidden">
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            
            {/* Infos Groupe & Code */}
            <div className="space-y-2">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="px-3 py-1 bg-emerald-600 text-white font-mono font-extrabold text-sm rounded-lg shadow-sm">
                  {groupe?.code || 'OMRAETV001/1448'}
                </span>
                <h2 className="text-xl md:text-2xl font-black text-foreground">
                  Checklist Préparation du Vol
                </h2>
              </div>
              <p className="text-xs text-muted-foreground flex items-center gap-3 flex-wrap">
                <span className="flex items-center gap-1 font-medium"><Plane size={13} className="text-emerald-600" /> {groupe?.compagnie || 'Vol non spécifié'}</span>
                <span>•</span>
                <span className="flex items-center gap-1 font-medium"><Calendar size={13} className="text-emerald-600" /> Départ : <b>{formatDateFr(groupe?.date_depart)}</b></span>
                {daysUntilDeparture !== null && (
                  <span className={cn(
                    "px-2 py-0.5 rounded text-[11px] font-bold",
                    daysUntilDeparture > 7 ? "bg-blue-100 text-blue-800" :
                    daysUntilDeparture >= 0 ? "bg-amber-100 text-amber-900 animate-pulse" :
                    "bg-muted text-muted-foreground"
                  )}>
                    {daysUntilDeparture > 0 ? `J-${daysUntilDeparture} (${daysUntilDeparture} jours restants)` :
                     daysUntilDeparture === 0 ? "Départ AUJOURD'HUI !" : "Vol parti"}
                  </span>
                )}
              </p>
            </div>

            {/* Actions principales (Impression, Ajout, Reset) */}
            <div className="flex items-center gap-2.5 flex-wrap">
              {saveSuccessMessage && (
                <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200 animate-fade-in flex items-center gap-1">
                  <Check size={13} /> {saveSuccessMessage}
                </span>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={handleResetToDefault}
                className="text-xs h-9 text-muted-foreground hover:text-foreground"
                title="Restaurer la liste par défaut des 16 tâches"
              >
                <RotateCcw size={14} className="mr-1.5" /> Réinitialiser
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleOpenTaskModal(null)}
                className="text-xs h-9"
              >
                <Plus size={14} className="mr-1.5" /> Ajouter une tâche
              </Button>
              <Button
                onClick={handlePrintChecklist}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-9 shadow-sm gap-1.5"
              >
                <Printer size={15} /> Imprimer la Checklist
              </Button>
            </div>
          </div>

          {/* Barre de Progression & KPI Cards */}
          <div className="mt-6 pt-6 border-t border-border grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {/* Progression Globale */}
            <div className="col-span-2 sm:col-span-3 lg:col-span-2 bg-background p-4 rounded-xl border shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Progression Globale</span>
                <span className="text-base font-extrabold text-emerald-600">{stats.percent}%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
                <div 
                  className={cn(
                    "h-full transition-all duration-500 rounded-full",
                    stats.percent === 100 ? "bg-emerald-500" :
                    stats.percent >= 50 ? "bg-gradient-to-r from-emerald-500 to-teal-400" :
                    "bg-gradient-to-r from-amber-500 to-emerald-400"
                  )}
                  style={{ width: `${stats.percent}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[11px] text-muted-foreground mt-2 font-medium">
                <span>{stats.ok} validée{stats.ok > 1 ? 's' : ''} sur {stats.total}</span>
                {stats.isComplete && <span className="text-emerald-600 font-bold flex items-center gap-1"><Sparkles size={12} /> Prêt au vol !</span>}
              </div>
            </div>

            {/* Total Tâches */}
            <div className="bg-background p-3.5 rounded-xl border shadow-xs flex flex-col justify-center text-center">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Total Tâches</span>
              <span className="text-2xl font-black text-foreground mt-0.5">{stats.total}</span>
            </div>

            {/* Validées (OK) */}
            <div className="bg-emerald-50/60 dark:bg-emerald-950/30 p-3.5 rounded-xl border border-emerald-200 dark:border-emerald-800 shadow-xs flex flex-col justify-center text-center">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">Validées (OK)</span>
              <span className="text-2xl font-black text-emerald-700 dark:text-emerald-300 mt-0.5">{stats.ok}</span>
            </div>

            {/* En cours */}
            <div className="bg-amber-50/60 dark:bg-amber-950/30 p-3.5 rounded-xl border border-amber-200 dark:border-amber-800 shadow-xs flex flex-col justify-center text-center">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300">En cours</span>
              <span className="text-2xl font-black text-amber-800 dark:text-amber-300 mt-0.5">{stats.enCours}</span>
            </div>

            {/* En retard */}
            <div className={cn(
              "p-3.5 rounded-xl border shadow-xs flex flex-col justify-center text-center transition-colors",
              stats.enRetard > 0 
                ? "bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300"
                : "bg-background text-muted-foreground"
            )}>
              <span className="text-[10px] font-bold uppercase tracking-wider">En retard</span>
              <span className={cn("text-2xl font-black mt-0.5", stats.enRetard > 0 ? "text-rose-600 dark:text-rose-400" : "")}>
                {stats.enRetard}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Filtres & Recherche ─────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-3 rounded-xl border shadow-xs">
        {/* Pills de filtre statut */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setFilterStatus('all')}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap",
              filterStatus === 'all'
                ? "bg-primary text-primary-foreground shadow-xs"
                : "bg-muted/40 text-muted-foreground hover:bg-muted"
            )}
          >
            Toutes ({stats.total})
          </button>
          <button
            onClick={() => setFilterStatus('pas_encore')}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap",
              filterStatus === 'pas_encore'
                ? "bg-slate-700 text-white shadow-xs"
                : "bg-muted/40 text-muted-foreground hover:bg-muted"
            )}
          >
            À faire ({stats.pasEncore})
          </button>
          <button
            onClick={() => setFilterStatus('en_cours')}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap",
              filterStatus === 'en_cours'
                ? "bg-amber-600 text-white shadow-xs"
                : "bg-muted/40 text-muted-foreground hover:bg-muted"
            )}
          >
            En cours ({stats.enCours})
          </button>
          <button
            onClick={() => setFilterStatus('ok')}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap",
              filterStatus === 'ok'
                ? "bg-emerald-600 text-white shadow-xs"
                : "bg-muted/40 text-muted-foreground hover:bg-muted"
            )}
          >
            Validées OK ({stats.ok})
          </button>
          {stats.enRetard > 0 && (
            <button
              onClick={() => setFilterStatus('retard')}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1",
                filterStatus === 'retard'
                  ? "bg-rose-600 text-white shadow-xs"
                  : "bg-rose-100 text-rose-800 hover:bg-rose-200 dark:bg-rose-950 dark:text-rose-300"
              )}
            >
              <AlertTriangle size={12} /> En retard ({stats.enRetard})
            </button>
          )}
        </div>

        {/* Barre de recherche */}
        <div className="relative min-w-[220px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input 
            placeholder="Filtrer par tâche ou remarque..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-8 h-9 text-xs bg-muted/20"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')} 
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      {/* ── Tableau Interactif des Tâches ────────────────────────── */}
      <Card className="border-0 shadow-lg ring-1 ring-black/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse">
            <thead>
              <tr className="bg-muted/50 text-muted-foreground text-[11px] uppercase tracking-wider font-bold border-b">
                <th className="px-4 py-3.5 text-center w-12">N°</th>
                <th className="px-4 py-3.5 min-w-[240px]">Désignation de la tâche</th>
                <th className="px-4 py-3.5 text-center min-w-[150px]">Deadline / Échéance</th>
                <th className="px-4 py-3.5 text-center min-w-[230px]">Statut & Action</th>
                <th className="px-4 py-3.5 min-w-[260px]">Remarque / Observation</th>
                <th className="px-3 py-3.5 text-center w-16">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredTasks.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-muted-foreground">
                    <CheckSquare size={36} className="mx-auto text-muted-foreground/30 mb-2" />
                    <p className="font-semibold text-sm">Aucune tâche trouvée pour ce filtre</p>
                    <p className="text-xs text-muted-foreground/70 mt-0.5">Modifiez vos critères de recherche ou ajoutez une nouvelle tâche.</p>
                  </td>
                </tr>
              ) : (
                filteredTasks.map((task, index) => {
                  const isOk = task.statut === CHECKLIST_STATUS.OK;
                  const isEnCours = task.statut === CHECKLIST_STATUS.EN_COURS;
                  const isPasEncore = !task.statut || task.statut === CHECKLIST_STATUS.PAS_ENCORE;
                  const isOverdue = !isOk && task.dueDate && task.dueDate < todayStr;
                  const dueFormatted = task.dueDate ? formatDateFr(task.dueDate) : '—';
                  const daysText = task.daysBefore !== undefined ? `J-${task.daysBefore}` : '';

                  return (
                    <tr 
                      key={task.id} 
                      className={cn(
                        "transition-colors hover:bg-muted/20 group",
                        isOk ? "bg-emerald-50/20 dark:bg-emerald-950/10" :
                        isOverdue ? "bg-rose-50/30 dark:bg-rose-950/20" : ""
                      )}
                    >
                      {/* Numéro */}
                      <td className="px-4 py-3 text-center font-bold text-xs text-muted-foreground align-middle">
                        {index + 1}
                      </td>

                      {/* Désignation */}
                      <td className="px-4 py-3 align-middle">
                        <div className="flex items-start gap-2.5">
                          <button
                            onClick={() => handleStatusChange(task.id, isOk ? CHECKLIST_STATUS.PAS_ENCORE : CHECKLIST_STATUS.OK)}
                            className="mt-0.5 text-muted-foreground hover:text-primary transition-transform active:scale-95"
                            title={isOk ? "Marquer comme Pas encore" : "Marquer comme OK"}
                          >
                            {isOk ? (
                              <CheckCircle2 size={18} className="text-emerald-600 fill-emerald-100" />
                            ) : (
                              <Square size={18} className="text-muted-foreground/50 hover:text-foreground" />
                            )}
                          </button>
                          <div>
                            <span className={cn(
                              "font-bold text-sm text-foreground block",
                              isOk && "line-through text-muted-foreground font-normal"
                            )}>
                              {task.designation}
                            </span>
                            {task.category && (
                              <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
                                {task.category}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Deadline / Échéance */}
                      <td className="px-4 py-3 text-center align-middle">
                        <div className="flex flex-col items-center justify-center">
                          <span className={cn(
                            "font-bold text-xs flex items-center gap-1",
                            isOk ? "text-emerald-700 dark:text-emerald-400" :
                            isOverdue ? "text-rose-600 dark:text-rose-400 font-extrabold" :
                            "text-foreground"
                          )}>
                            {isOverdue && <AlertTriangle size={12} className="text-rose-600 animate-bounce" />}
                            {dueFormatted}
                          </span>
                          <span className={cn(
                            "text-[10px] font-semibold mt-0.5",
                            isOverdue ? "text-rose-600 font-bold" : "text-muted-foreground"
                          )}>
                            {daysText} {isOverdue && "(En retard)"}
                          </span>
                        </div>
                      </td>

                      {/* Statut & Action Rapide (3 boutons de statut) */}
                      <td className="px-4 py-3 text-center align-middle">
                        <div className="inline-flex rounded-lg p-0.5 bg-muted/60 border gap-0.5 shadow-2xs">
                          {/* Bouton Pas encore */}
                          <button
                            type="button"
                            onClick={() => handleStatusChange(task.id, CHECKLIST_STATUS.PAS_ENCORE)}
                            className={cn(
                              "px-2.5 py-1 rounded-md text-[11px] font-bold transition-all",
                              isPasEncore 
                                ? "bg-white text-slate-800 shadow-xs dark:bg-slate-800 dark:text-slate-200" 
                                : "text-muted-foreground hover:text-foreground"
                            )}
                            title="Marquer : Pas encore"
                          >
                            Pas encore
                          </button>

                          {/* Bouton En cours */}
                          <button
                            type="button"
                            onClick={() => handleStatusChange(task.id, CHECKLIST_STATUS.EN_COURS)}
                            className={cn(
                              "px-2.5 py-1 rounded-md text-[11px] font-bold transition-all flex items-center gap-1",
                              isEnCours 
                                ? "bg-amber-500 text-white shadow-xs" 
                                : "text-muted-foreground hover:text-foreground"
                            )}
                            title="Marquer : En cours"
                          >
                            <Clock size={11} /> En cours
                          </button>

                          {/* Bouton OK */}
                          <button
                            type="button"
                            onClick={() => handleStatusChange(task.id, CHECKLIST_STATUS.OK)}
                            className={cn(
                              "px-2.5 py-1 rounded-md text-[11px] font-bold transition-all flex items-center gap-1",
                              isOk 
                                ? "bg-emerald-600 text-white shadow-xs" 
                                : "text-muted-foreground hover:text-foreground"
                            )}
                            title="Marquer : OK"
                          >
                            <Check size={11} /> OK
                          </button>
                        </div>
                      </td>

                      {/* Remarque avec saisie en ligne */}
                      <td className="px-4 py-3 align-middle">
                        <Input 
                          placeholder="Ajouter une remarque..."
                          value={task.remarque || ''}
                          onChange={(e) => handleRemarqueChange(task.id, e.target.value)}
                          onBlur={handleRemarqueBlur}
                          className="h-8 text-xs bg-muted/15 focus-visible:bg-background transition-colors"
                        />
                      </td>

                      {/* Actions (Éditer / Supprimer) */}
                      <td className="px-3 py-3 text-center align-middle">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => handleOpenTaskModal(task)}
                            className="h-7 w-7 text-muted-foreground hover:text-foreground"
                            title="Modifier cette tâche"
                          >
                            <Edit2 size={13} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => handleDeleteTask(task.id, task.designation)}
                            className="h-7 w-7 text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                            title="Supprimer cette tâche"
                          >
                            <Trash2 size={13} />
                          </Button>
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

      {/* ── Modale Ajout / Modification de Tâche (Design Moderne & Ergonomique) ── */}
      <Dialog open={isTaskModalOpen} onOpenChange={setIsTaskModalOpen}>
        <DialogContent className="sm:max-w-[540px] p-0 overflow-hidden rounded-2xl shadow-2xl border-border/80" onClose={() => setIsTaskModalOpen(false)}>
          {/* Header avec gradient élégant */}
          <div className="bg-gradient-to-r from-slate-950 via-emerald-950 to-slate-900 text-white px-6 py-5 border-b border-emerald-900/40 relative">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-lg border border-white/20 shrink-0">
                <CheckSquare size={20} className="stroke-[2.5]" />
              </div>
              <div className="min-w-0 flex-1">
                <DialogTitle className="text-xl font-black tracking-tight text-white flex items-center gap-2">
                  {editingTask ? 'Modifier la Tâche' : 'Ajouter une Nouvelle Tâche'}
                </DialogTitle>
                <DialogDescription className="text-xs text-emerald-200/80 mt-0.5 font-medium">
                  {groupe?.date_depart 
                    ? `Vol & Départ prévu le ${formatDateFr(groupe.date_depart)}`
                    : "Configurez l'échéance et les détails de cette étape de préparation."}
                </DialogDescription>
              </div>
            </div>
          </div>

          <form onSubmit={handleSaveTaskModal} className="p-6 space-y-5 bg-card">
            {/* Désignation de la tâche */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground flex items-center justify-between">
                <span>Désignation de la tâche <span className="text-red-500">*</span></span>
                <span className="text-[10px] text-muted-foreground font-normal">Obligatoire</span>
              </Label>
              <Input 
                required
                placeholder="Ex: Envoi des passeports à l'ambassade"
                value={taskFormData.designation}
                onChange={e => setTaskFormData({ ...taskFormData, designation: e.target.value })}
                className="h-11 text-sm font-semibold bg-muted/20 focus-visible:bg-transparent transition-colors shadow-2xs"
              />

              {/* Suggestions rapides si nouvelle tâche */}
              {!editingTask && (
                <div className="pt-1.5 flex flex-wrap gap-1.5 items-center">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase mr-1">Idées rapides :</span>
                  {[
                    { label: "Visas Omra", cat: "Visa" },
                    { label: "Billets d'avion", cat: "Vol" },
                    { label: "Voucher Hôtels", cat: "Hôtel" },
                    { label: "Badges & Sacoches", cat: "Bagages" },
                    { label: "Réservation Bus", cat: "Logistique" }
                  ].map((preset, pIdx) => (
                    <button
                      key={pIdx}
                      type="button"
                      onClick={() => setTaskFormData(prev => ({
                        ...prev,
                        designation: prev.designation ? prev.designation : preset.label,
                        category: preset.cat
                      }))}
                      className="text-[11px] px-2 py-0.5 rounded-md bg-muted/60 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 border border-transparent font-medium text-muted-foreground transition-colors"
                    >
                      + {preset.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Carte synchronisée Délai & Deadline */}
            <div className="rounded-xl border border-border/80 bg-muted/30 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                  <Calendar size={13} className="text-emerald-600" /> Planification & Échéance
                </span>
                {groupe?.date_depart && (
                  <Badge variant="outline" className="text-[10px] bg-background border-emerald-200 text-emerald-700 font-bold">
                    Départ: {formatDateFr(groupe.date_depart)}
                  </Badge>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-muted-foreground">Délai avant départ</Label>
                  <div className="relative">
                    <Input 
                      type="number"
                      min="0"
                      max="90"
                      placeholder="Ex: 3"
                      value={taskFormData.daysBefore}
                      onChange={e => {
                        const days = Number(e.target.value) || 0;
                        const newDue = calculateDueDate(groupe?.date_depart, days);
                        setTaskFormData({ ...taskFormData, daysBefore: days, dueDate: newDue });
                      }}
                      className="h-10 pr-14 text-sm font-bold font-mono bg-background"
                    />
                    <div className="absolute right-2.5 top-1/2 -translate-y-1/2 px-1.5 py-0.5 rounded bg-muted text-[10px] font-extrabold text-foreground pointer-events-none uppercase">
                      J-{taskFormData.daysBefore || 0}
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-muted-foreground">Date limite (Deadline)</Label>
                  <Input 
                    type="date"
                    value={taskFormData.dueDate}
                    onChange={e => setTaskFormData({ ...taskFormData, dueDate: e.target.value })}
                    className="h-10 text-sm font-semibold bg-background"
                  />
                </div>
              </div>
            </div>

            {/* Statut & Catégorie */}
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-foreground">Statut de la tâche</Label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { key: CHECKLIST_STATUS.PAS_ENCORE, label: "Pas encore", color: "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200", active: "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm font-bold border-slate-900" },
                    { key: CHECKLIST_STATUS.EN_COURS, label: "En cours", color: "hover:bg-amber-50 text-amber-700", active: "bg-amber-100 text-amber-900 border-amber-400 ring-1 ring-amber-400/40 font-bold shadow-xs" },
                    { key: CHECKLIST_STATUS.OK, label: "OK (Terminé)", color: "hover:bg-emerald-50 text-emerald-700", active: "bg-emerald-600 text-white border-emerald-600 font-bold shadow-sm" }
                  ].map(st => {
                    const isSelected = taskFormData.statut === st.key;
                    return (
                      <button
                        key={st.key}
                        type="button"
                        onClick={() => setTaskFormData({ ...taskFormData, statut: st.key })}
                        className={cn(
                          "h-10 px-2 rounded-xl text-xs font-semibold border transition-all flex items-center justify-center gap-1.5 select-none",
                          isSelected ? st.active : cn("bg-background border-input text-muted-foreground", st.color)
                        )}
                      >
                        {st.key === CHECKLIST_STATUS.OK && <CheckCircle2 size={13} className="shrink-0" />}
                        {st.key === CHECKLIST_STATUS.EN_COURS && <Clock size={13} className="shrink-0" />}
                        {st.key === CHECKLIST_STATUS.PAS_ENCORE && <Square size={13} className="shrink-0" />}
                        <span className="truncate">{st.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Catégorie */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-foreground">Catégorie</Label>
                  <div className="flex items-center gap-1">
                    {["Vol", "Visa", "Hôtel", "Logistique", "Finance"].map(c => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setTaskFormData({ ...taskFormData, category: c })}
                        className={cn(
                          "text-[10px] px-1.5 py-0.5 rounded font-bold uppercase transition-colors",
                          taskFormData.category === c 
                            ? "bg-emerald-100 text-emerald-800" 
                            : "text-muted-foreground hover:bg-muted"
                        )}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>
                <Input 
                  placeholder="Ex: Vol, Visa, Hôtel, Logistique..."
                  value={taskFormData.category}
                  onChange={e => setTaskFormData({ ...taskFormData, category: e.target.value })}
                  className="h-10 text-sm bg-muted/20 focus-visible:bg-transparent"
                />
              </div>
            </div>

            {/* Remarque / Notes */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">Remarque / Précisions</Label>
              <Input 
                placeholder="Précisions utiles pour l'équipe (contacts, consignes, détails...)"
                value={taskFormData.remarque}
                onChange={e => setTaskFormData({ ...taskFormData, remarque: e.target.value })}
                className="h-10 text-sm bg-muted/20 focus-visible:bg-transparent"
              />
            </div>

            <DialogFooter className="pt-3 border-t gap-2 flex-row justify-end">
              <Button type="button" variant="outline" onClick={() => setIsTaskModalOpen(false)} className="h-10 px-5 text-xs font-bold">
                Annuler
              </Button>
              <Button type="submit" className="h-10 px-6 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-2 shadow-md shadow-emerald-700/20">
                <Check size={14} className="stroke-[2.5]" />
                {editingTask ? 'Mettre à jour la tâche' : 'Ajouter la tâche'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OmraGroupChecklistTab;
