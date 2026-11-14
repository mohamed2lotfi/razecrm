/**
 * Constantes et Helpers pour la Checklist des Documents par Pèlerin (Muatamir)
 * 4 Documents suivis : Visa, Billet, Badge, Contrat
 */

export const PELERIN_DOC_TYPES = [
  {
    id: 'visa',
    label: 'Visa',
    labelAr: 'التأشيرة',
    shortLabel: 'Visa',
    iconName: 'ShieldCheck',
    color: 'emerald',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
    activeBtnClass: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm ring-2 ring-emerald-500/20',
    inactiveBtnClass: 'bg-slate-100 hover:bg-slate-200 text-slate-500 border border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700',
    description: 'Visa Omra / Tourisme délivré et validé'
  },
  {
    id: 'billet',
    label: 'Billet',
    labelAr: 'التذكرة',
    shortLabel: 'Billet',
    iconName: 'Plane',
    color: 'blue',
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800',
    activeBtnClass: 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm ring-2 ring-blue-500/20',
    inactiveBtnClass: 'bg-slate-100 hover:bg-slate-200 text-slate-500 border border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700',
    description: 'Billet d’avion aller-retour émis et confirmé'
  },
  {
    id: 'badge',
    label: 'Badge',
    labelAr: 'البطاقة',
    shortLabel: 'Badge',
    iconName: 'IdCard',
    color: 'purple',
    badgeClass: 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800',
    activeBtnClass: 'bg-purple-600 hover:bg-purple-700 text-white shadow-sm ring-2 ring-purple-500/20',
    inactiveBtnClass: 'bg-slate-100 hover:bg-slate-200 text-slate-500 border border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700',
    description: 'Badge pèlerin officiel avec QR Code imprimé'
  },
  {
    id: 'contrat',
    label: 'Contrat',
    labelAr: 'العقد',
    shortLabel: 'Contrat',
    iconName: 'FileSignature',
    color: 'amber',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
    activeBtnClass: 'bg-amber-600 hover:bg-amber-700 text-white shadow-sm ring-2 ring-amber-500/20',
    inactiveBtnClass: 'bg-slate-100 hover:bg-slate-200 text-slate-500 border border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700',
    description: 'Contrat de voyage pèlerin signé et archivé'
  }
];

export const DEFAULT_PILGRIM_CHECKLIST = {
  visa: false,
  billet: false,
  badge: false,
  contrat: false,
  remarque: '',
  updated_at: null
};

/**
 * Récupère ou normalise les 4 documents pour un pèlerin
 */
export const getPilgrimChecklist = (pelerinObj) => {
  if (!pelerinObj) return { ...DEFAULT_PILGRIM_CHECKLIST };

  const raw = pelerinObj.checklist_docs || pelerinObj.checklistDocs || pelerinObj.documents_checklist || {};

  return {
    visa: Boolean(raw.visa ?? (pelerinObj.num_visa && String(pelerinObj.num_visa).trim().length > 0 ? true : false)),
    billet: Boolean(raw.billet ?? (pelerinObj.numero_billet || pelerinObj.num_billet ? true : false)),
    badge: Boolean(raw.badge ?? false),
    contrat: Boolean(raw.contrat ?? false),
    remarque: raw.remarque || pelerinObj.notes || '',
    updated_at: raw.updated_at || null
  };
};

/**
 * Calcule la progression (0 à 100%) d'un pèlerin sur ses 4 documents
 */
export const calculatePilgrimProgress = (pelerinObjOrDocs) => {
  const docs = pelerinObjOrDocs?.visa !== undefined ? pelerinObjOrDocs : getPilgrimChecklist(pelerinObjOrDocs);
  
  let completedCount = 0;
  if (docs.visa) completedCount++;
  if (docs.billet) completedCount++;
  if (docs.badge) completedCount++;
  if (docs.contrat) completedCount++;

  const totalCount = 4;
  const percentage = Math.round((completedCount / totalCount) * 100);

  let status = 'non_commence'; // 'non_commence' | 'en_cours' | 'complet'
  if (completedCount === 4) {
    status = 'complet';
  } else if (completedCount > 0) {
    status = 'en_cours';
  }

  return {
    completedCount,
    totalCount,
    percentage,
    isComplete: completedCount === 4,
    status
  };
};

/**
 * Calcule les statistiques globales du groupe pour la checklist documents
 */
export const calculateGroupDocumentsMetrics = (pilgrimsList = []) => {
  const totalPilgrims = pilgrimsList.length;
  if (totalPilgrims === 0) {
    return {
      totalPilgrims: 0,
      totalExpectedDocs: 0,
      totalValidatedDocs: 0,
      globalPercentage: 0,
      completeCount: 0,
      inProgressCount: 0,
      notStartedCount: 0,
      breakdown: {
        visa: { count: 0, total: 0, percent: 0 },
        billet: { count: 0, total: 0, percent: 0 },
        badge: { count: 0, total: 0, percent: 0 },
        contrat: { count: 0, total: 0, percent: 0 }
      }
    };
  }

  let totalValidatedDocs = 0;
  let completeCount = 0;
  let inProgressCount = 0;
  let notStartedCount = 0;

  const counts = {
    visa: 0,
    billet: 0,
    badge: 0,
    contrat: 0
  };

  pilgrimsList.forEach(p => {
    const docs = getPilgrimChecklist(p);
    const prog = calculatePilgrimProgress(docs);

    if (docs.visa) counts.visa++;
    if (docs.billet) counts.billet++;
    if (docs.badge) counts.badge++;
    if (docs.contrat) counts.contrat++;

    totalValidatedDocs += prog.completedCount;

    if (prog.status === 'complet') completeCount++;
    else if (prog.status === 'en_cours') inProgressCount++;
    else notStartedCount++;
  });

  const totalExpectedDocs = totalPilgrims * 4;
  const globalPercentage = Math.round((totalValidatedDocs / totalExpectedDocs) * 100);

  return {
    totalPilgrims,
    totalExpectedDocs,
    totalValidatedDocs,
    globalPercentage,
    completeCount,
    inProgressCount,
    notStartedCount,
    breakdown: {
      visa: { count: counts.visa, total: totalPilgrims, percent: Math.round((counts.visa / totalPilgrims) * 100) },
      billet: { count: counts.billet, total: totalPilgrims, percent: Math.round((counts.billet / totalPilgrims) * 100) },
      badge: { count: counts.badge, total: totalPilgrims, percent: Math.round((counts.badge / totalPilgrims) * 100) },
      contrat: { count: counts.contrat, total: totalPilgrims, percent: Math.round((counts.contrat / totalPilgrims) * 100) }
    }
  };
};

/**
 * Génère le code HTML complet pour impression / export PDF de la checklist documents pèlerins
 */
export const generatePelerinsChecklistPrintHtml = ({
  groupe,
  pilgrims = [],
  metrics,
  agencySettings = {},
  filterStatus = 'all'
}) => {
  const agencyName = agencySettings?.nom_agence || 'EL MOKHTAR TRAVEL VOYAGES & OMRA';
  const agencyPhone = agencySettings?.telephone || '';
  const agencyEmail = agencySettings?.email || '';
  const agencyLogo = agencySettings?.logo_url || '';
  const groupCode = groupe?.code || 'OMRAETV001/1448';
  const groupName = groupe?.nom || 'Groupe Omra';

  const exportDate = new Date().toLocaleDateString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });

  const rowsHtml = pilgrims.map((p, idx) => {
    const docs = getPilgrimChecklist(p);
    const prog = calculatePilgrimProgress(docs);

    const isComplete = prog.isComplete;
    const isEnfant = p.isEnfantSansLit || p.chd;

    return `
      <tr class="${isComplete ? 'row-complete' : ''}">
        <td style="text-align: center; font-weight: 700; width: 35px;">${idx + 1}</td>
        <td>
          <div class="pilgrim-name">${p.fullNameFr || p.nom} ${isEnfant ? '<span class="chd-tag">(Enfant)</span>' : ''}</div>
          ${p.fullNameAr ? `<div class="pilgrim-ar">${p.fullNameAr}</div>` : ''}
        </td>
        <td style="text-align: center; font-family: monospace; font-size: 11px;">
          ${p.num_passeport || p.passport || '—'}
        </td>
        <td style="text-align: center; font-size: 11px;">
          ${p.chambreTitre || p.chambreId || '—'}
        </td>
        <td style="text-align: center; width: 60px;">
          <span class="doc-pill ${docs.visa ? 'pill-ok' : 'pill-todo'}">${docs.visa ? '✓ Prêt' : '—'}</span>
        </td>
        <td style="text-align: center; width: 60px;">
          <span class="doc-pill ${docs.billet ? 'pill-ok' : 'pill-todo'}">${docs.billet ? '✓ Émis' : '—'}</span>
        </td>
        <td style="text-align: center; width: 60px;">
          <span class="doc-pill ${docs.badge ? 'pill-ok' : 'pill-todo'}">${docs.badge ? '✓ Fait' : '—'}</span>
        </td>
        <td style="text-align: center; width: 60px;">
          <span class="doc-pill ${docs.contrat ? 'pill-ok' : 'pill-todo'}">${docs.contrat ? '✓ Signé' : '—'}</span>
        </td>
        <td style="text-align: center; font-weight: 700; width: 70px;">
          <div class="progress-badge ${prog.percentage === 100 ? 'prog-100' : prog.percentage >= 50 ? 'prog-50' : 'prog-0'}">
            ${prog.percentage}%
          </div>
        </td>
        <td style="font-size: 10px; color: #475569; max-width: 180px;">
          ${docs.remarque ? docs.remarque : '<span style="color: #cbd5e1;">—</span>'}
        </td>
      </tr>
    `;
  }).join('');

  return `
    <!DOCTYPE html>
    <html lang="fr">
    <head>
      <meta charset="utf-8">
      <title>Checklist Documents Pèlerins - ${groupName} (${groupCode})</title>
      <style>
        * { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
        body { padding: 25px; color: #0f172a; font-size: 11px; line-height: 1.35; background: #fff; }
        
        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 2px solid #047857;
          padding-bottom: 12px;
          margin-bottom: 14px;
        }
        .logo { max-height: 50px; object-fit: contain; }
        .agency-title { font-size: 16px; font-weight: 900; color: #065f46; letter-spacing: -0.5px; }
        .agency-meta { font-size: 10px; color: #64748b; }

        .doc-banner {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          background: #f0fdf4;
          border: 1px solid #bbf7d0;
          border-radius: 8px;
          padding: 12px 16px;
          margin-bottom: 16px;
        }
        .group-code {
          font-family: monospace;
          background: #047857;
          color: white;
          padding: 3px 8px;
          border-radius: 4px;
          font-weight: 700;
          font-size: 11px;
          display: inline-block;
          margin-bottom: 4px;
        }
        .group-title { font-size: 18px; font-weight: 800; color: #064e3b; margin: 0; }
        .group-meta { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px 16px; font-size: 11px; margin-top: 6px; }

        .kpi-row {
          display: grid;
          grid-template-columns: 1.4fr repeat(4, 1fr);
          gap: 10px;
          margin-bottom: 16px;
        }
        .kpi-box {
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          padding: 10px;
          text-align: center;
          background: #f8fafc;
        }
        .kpi-num { font-size: 20px; font-weight: 800; color: #0f172a; line-height: 1; }
        .kpi-lbl { font-size: 9px; text-transform: uppercase; font-weight: 700; color: #64748b; margin-top: 4px; letter-spacing: 0.5px; }

        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 11px; }
        th {
          background: #047857;
          color: white;
          text-align: left;
          padding: 7px 8px;
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          border: 1px solid #0369a1;
        }
        td {
          padding: 6px 8px;
          border: 1px solid #e2e8f0;
          vertical-align: middle;
        }
        tr:nth-child(even) { background: #f8fafc; }
        .row-complete { background: #f0fdf4 !important; }

        .pilgrim-name { font-weight: 700; color: #0f172a; }
        .pilgrim-ar { font-size: 10px; color: #64748b; direction: rtl; }
        .chd-tag { font-size: 9px; font-weight: 700; color: #7c3aed; }

        .doc-pill {
          display: inline-block;
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 9px;
          font-weight: 700;
        }
        .pill-ok { background: #dcfce7; color: #15803d; border: 1px solid #bbf7d0; }
        .pill-todo { background: #f1f5f9; color: #94a3b8; border: 1px solid #e2e8f0; }

        .progress-badge {
          display: inline-block;
          padding: 3px 6px;
          border-radius: 4px;
          font-size: 10px;
          font-weight: 800;
        }
        .prog-100 { background: #15803d; color: white; }
        .prog-50 { background: #f59e0b; color: white; }
        .prog-0 { background: #ef4444; color: white; }

        .signature-section {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
          margin-top: 25px;
          padding-top: 15px;
          border-top: 1px dashed #cbd5e1;
        }
        .sig-box {
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          padding: 10px;
          height: 80px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }
        .sig-title { font-weight: 700; font-size: 10px; color: #334155; }

        .footer {
          margin-top: 20px;
          font-size: 9px;
          color: #94a3b8;
          display: flex;
          justify-content: space-between;
          border-top: 1px solid #e2e8f0;
          padding-top: 8px;
        }

        @media print {
          body { padding: 0; }
          .no-print { display: none; }
          tr { page-break-inside: avoid; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <div class="agency-title">${agencyName}</div>
          <div class="agency-meta">${agencyPhone ? `Tél: ${agencyPhone}` : ''} ${agencyEmail ? `| ${agencyEmail}` : ''}</div>
        </div>
        ${agencyLogo ? `<img src="${agencyLogo}" class="logo" alt="Logo" />` : ''}
      </div>

      <div class="doc-banner">
        <div>
          <span class="group-code">${groupCode}</span>
          <h1 class="group-title">SUIVI CHECKLIST DOCUMENTS PÈLERINS</h1>
          <div class="group-meta">
            <div><b>Groupe :</b> ${groupName}</div>
            <div><b>Départ :</b> ${groupe?.date_depart || '—'}</div>
            <div><b>Retour :</b> ${groupe?.date_retour || '—'}</div>
            <div><b>Compagnie :</b> ${groupe?.compagnie || '—'}</div>
            <div><b>Pèlerins :</b> ${metrics.totalPilgrims} pax</div>
            <div><b>Statut Global :</b> <b>${metrics.globalPercentage}% Validé</b></div>
          </div>
        </div>
      </div>

      <div class="kpi-row">
        <div class="kpi-box" style="background: #f0fdf4; border-color: #bbf7d0;">
          <div class="kpi-num" style="color: #15803d;">${metrics.globalPercentage}%</div>
          <div class="kpi-lbl" style="color: #15803d;">Progression Totale (${metrics.completeCount}/${metrics.totalPilgrims} Complets)</div>
        </div>
        <div class="kpi-box">
          <div class="kpi-num" style="color: #059669;">${metrics.breakdown.visa.count}/${metrics.totalPilgrims}</div>
          <div class="kpi-lbl">Visas (${metrics.breakdown.visa.percent}%)</div>
        </div>
        <div class="kpi-box">
          <div class="kpi-num" style="color: #2563eb;">${metrics.breakdown.billet.count}/${metrics.totalPilgrims}</div>
          <div class="kpi-lbl">Billets (${metrics.breakdown.billet.percent}%)</div>
        </div>
        <div class="kpi-box">
          <div class="kpi-num" style="color: #7c3aed;">${metrics.breakdown.badge.count}/${metrics.totalPilgrims}</div>
          <div class="kpi-lbl">Badges (${metrics.breakdown.badge.percent}%)</div>
        </div>
        <div class="kpi-box">
          <div class="kpi-num" style="color: #d97706;">${metrics.breakdown.contrat.count}/${metrics.totalPilgrims}</div>
          <div class="kpi-lbl">Contrats (${metrics.breakdown.contrat.percent}%)</div>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th style="text-align: center; width: 35px;">N°</th>
            <th>Pèlerin (Muatamir)</th>
            <th style="text-align: center; width: 100px;">N° Passeport</th>
            <th style="text-align: center; width: 90px;">Chambre</th>
            <th style="text-align: center; width: 60px;">Visa</th>
            <th style="text-align: center; width: 60px;">Billet</th>
            <th style="text-align: center; width: 60px;">Badge</th>
            <th style="text-align: center; width: 60px;">Contrat</th>
            <th style="text-align: center; width: 70px;">Progrès</th>
            <th>Remarques</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>

      <div class="signature-section">
        <div class="sig-box">
          <div class="sig-title">Responsable Visas & Passeports</div>
          <div style="font-size: 8px; color: #94a3b8;">Signature & Date :</div>
        </div>
        <div class="sig-box">
          <div class="sig-title">Responsable Billetterie & Badges</div>
          <div style="font-size: 8px; color: #94a3b8;">Signature & Date :</div>
        </div>
        <div class="sig-box">
          <div class="sig-title">Chef d'Agence / Direction</div>
          <div style="font-size: 8px; color: #94a3b8;">Cachet & Signature :</div>
        </div>
      </div>

      <div class="footer">
        <div>Document de bord Omra &bull; <b>${groupCode}</b> &bull; ${groupName}</div>
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
};
