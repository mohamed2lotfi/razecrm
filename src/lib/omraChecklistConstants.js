/**
 * Module Omra - Définitions et Helpers pour la Checklist & Numérotation des Groupes
 */

export const DEFAULT_OMRA_TASKS = [
  {
    id: 'billets',
    designation: 'Les billets',
    daysBefore: 10,
    category: 'Vols & Billetterie'
  },
  {
    id: 'visas',
    designation: 'Les visas',
    daysBefore: 10,
    category: 'Visas & Documents'
  },
  {
    id: 'visa_guide',
    designation: 'Visa du guide',
    daysBefore: 10,
    category: 'Visas & Documents'
  },
  {
    id: 'demande_desk',
    designation: 'Demande desk',
    daysBefore: 7,
    category: 'Vols & Billetterie'
  },
  {
    id: 'amr_tachghil',
    designation: 'أمر تشغيل الوكيل',
    daysBefore: 5,
    category: 'Procédures Arabie Saoudite'
  },
  {
    id: 'manifest_sv',
    designation: 'Envoie manifest SV',
    daysBefore: 3,
    category: 'Vols & Billetterie'
  },
  {
    id: 'contrats',
    designation: 'Les contrats',
    daysBefore: 3,
    category: 'Administration'
  },
  {
    id: 'tahmil_idkhal',
    designation: 'تحميل مجموعة إدخال',
    daysBefore: 3,
    category: 'Procédures Arabie Saoudite'
  },
  {
    id: 'badges',
    designation: 'Les badges',
    daysBefore: 2,
    category: 'Logistique & Pèlerins'
  },
  {
    id: 'copies_manifest',
    designation: '4 copies manifest',
    daysBefore: 2,
    category: 'Vols & Billetterie'
  },
  {
    id: 'roznamah',
    designation: 'الرزنامة',
    daysBefore: 2,
    category: 'Logistique & Pèlerins'
  },
  {
    id: 'taskin',
    designation: 'التسكين',
    daysBefore: 2,
    category: 'Hébergement'
  },
  {
    id: 'exemplaire_billet',
    designation: 'Exemplaire billet',
    daysBefore: 2,
    category: 'Vols & Billetterie'
  },
  {
    id: 'fiche_technique_fb',
    designation: 'Fiche technique fb',
    daysBefore: 2,
    category: 'Communication'
  },
  {
    id: 'taahoud',
    designation: 'التعهد',
    daysBefore: 2,
    category: 'Administration'
  },
  {
    id: 'groupe_whatsapp',
    designation: 'Groupe whatsapp',
    daysBefore: 2,
    category: 'Communication'
  }
];

export const CHECKLIST_STATUS = {
  PAS_ENCORE: 'pas_encore',
  EN_COURS: 'en_cours',
  OK: 'ok'
};

export const CHECKLIST_STATUS_CONFIG = {
  [CHECKLIST_STATUS.PAS_ENCORE]: {
    value: 'pas_encore',
    label: 'Pas encore',
    labelShort: 'À faire',
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300',
    colorClass: 'text-slate-500',
    dotClass: 'bg-slate-400'
  },
  [CHECKLIST_STATUS.EN_COURS]: {
    value: 'en_cours',
    label: 'En cours',
    labelShort: 'En cours',
    badgeClass: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300',
    colorClass: 'text-amber-600',
    dotClass: 'bg-amber-500 animate-pulse'
  },
  [CHECKLIST_STATUS.OK]: {
    value: 'ok',
    label: 'OK',
    labelShort: 'Validé',
    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300',
    colorClass: 'text-emerald-600',
    dotClass: 'bg-emerald-500'
  }
};

/**
 * Calcule la date d'échéance à partir de la date de départ et du nombre de jours avant.
 */
export const calculateDueDate = (dateDepart, daysBefore = 0) => {
  if (!dateDepart) return '';
  const d = new Date(dateDepart);
  if (isNaN(d.getTime())) return '';
  d.setDate(d.getDate() - Number(daysBefore));
  return d.toISOString().split('T')[0];
};

/**
 * Formate une date YYYY-MM-DD en format lisible (ex: "18 Oct 2026")
 */
export const formatDateFr = (dateStr) => {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
};

/**
 * Calcule l'année Hégirienne (AH) estimée pour une date Grégorienne donnée.
 */
export const getHijriYear = (dateInput) => {
  try {
    const d = dateInput ? new Date(dateInput) : new Date();
    if (isNaN(d.getTime())) return 1448;
    
    // Essayer l'API standard Intl si disponible
    if (typeof Intl !== 'undefined' && Intl.DateTimeFormat) {
      const formatter = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', { year: 'numeric' });
      const parts = formatter.formatToParts(d);
      const yearPart = parts.find(p => p.type === 'year');
      if (yearPart && !isNaN(parseInt(yearPart.value, 10))) {
        return parseInt(yearPart.value, 10);
      }
    }
  } catch (e) {
    // Silently fallback
  }

  // Calcul mathématique d'approximation hégirienne
  const d = dateInput ? new Date(dateInput) : new Date();
  const gregYear = isNaN(d.getTime()) ? new Date().getFullYear() : d.getFullYear();
  // Formule d'approximation : AH = (AD - 622) * 33 / 32
  const approx = Math.round((gregYear - 622) * (33 / 32));
  return approx > 1400 ? approx : 1448;
};

/**
 * Génère le prochain code séquentiel pour un groupe Omra (ex: OMRAETV001/1448)
 */
export const generateNextGroupCode = (existingGroups = [], dateDepart = null) => {
  const hijriYear = getHijriYear(dateDepart);
  const prefix = 'OMRAETV';
  
  // Chercher tous les groupes existants pour cette année hégirienne
  let maxSeq = 0;
  const regex = new RegExp(`^${prefix}(\\d+)/${hijriYear}$`, 'i');

  (existingGroups || []).forEach(g => {
    const code = g.code || g.nom || '';
    const match = code.match(regex);
    if (match && match[1]) {
      const num = parseInt(match[1], 10);
      if (num > maxSeq) maxSeq = num;
    }
  });

  const nextSeq = String(maxSeq + 1).padStart(3, '0');
  return `${prefix}${nextSeq}/${hijriYear}`;
};

/**
 * Génère la checklist par défaut pour un groupe
 */
export const getDefaultChecklist = (dateDepart = null) => {
  return DEFAULT_OMRA_TASKS.map(task => ({
    id: task.id,
    designation: task.designation,
    daysBefore: task.daysBefore,
    dueDate: calculateDueDate(dateDepart, task.daysBefore),
    statut: CHECKLIST_STATUS.PAS_ENCORE,
    remarque: '',
    category: task.category || 'Général',
    updatedAt: new Date().toISOString()
  }));
};

/**
 * Met à jour les due dates d'une checklist existante si la date de départ change
 */
export const syncChecklistDueDates = (checklist = [], dateDepart = null) => {
  if (!Array.isArray(checklist) || checklist.length === 0) {
    return getDefaultChecklist(dateDepart);
  }

  return checklist.map(item => {
    // Si l'item a un daysBefore, on recalcule sa dueDate
    const daysBefore = item.daysBefore !== undefined ? Number(item.daysBefore) : 2;
    return {
      ...item,
      dueDate: dateDepart ? calculateDueDate(dateDepart, daysBefore) : (item.dueDate || '')
    };
  });
};

/**
 * Calcule les statistiques d'une checklist
 */
export const getChecklistStats = (checklist = [], dateDepart = null) => {
  const items = Array.isArray(checklist) && checklist.length > 0 
    ? checklist 
    : getDefaultChecklist(dateDepart);

  const total = items.length;
  const ok = items.filter(i => i.statut === CHECKLIST_STATUS.OK).length;
  const enCours = items.filter(i => i.statut === CHECKLIST_STATUS.EN_COURS).length;
  const pasEncore = items.filter(i => !i.statut || i.statut === CHECKLIST_STATUS.PAS_ENCORE).length;
  
  const todayStr = new Date().toISOString().split('T')[0];
  
  // Tâches en retard : dueDate dépassée et statut !== 'ok'
  const enRetard = items.filter(i => {
    if (i.statut === CHECKLIST_STATUS.OK) return false;
    if (!i.dueDate) return false;
    return i.dueDate < todayStr;
  }).length;

  const percent = total > 0 ? Math.round((ok / total) * 100) : 0;

  return {
    total,
    ok,
    enCours,
    pasEncore,
    enRetard,
    percent,
    isComplete: ok === total && total > 0
  };
};
