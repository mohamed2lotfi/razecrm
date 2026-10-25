import React, { useState, useMemo } from 'react';
import { 
  X, Upload, FileText, CheckCircle2, AlertTriangle, 
  RefreshCw, Search, ShieldCheck, Database, 
  Image as ImageIcon, Check, UserPlus, Link2, Unlink,
  Eye, CheckCheck, Sparkles, Filter, ChevronDown, Trash2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';

/**
 * Normalise un numéro de passeport pour comparaison stricte
 */
const normalizePassport = (pass) => {
  if (!pass) return '';
  return String(pass).replace(/[^a-zA-Z0-9]/g, '').trim().toUpperCase();
};

/**
 * Normalise un nom/prénom pour rapprochement
 */
const normalizeString = (str) => {
  if (!str) return '';
  return String(str)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
};

/**
 * Calcule la liste exacte des différences entre la donnée XML et le CRM
 */
const computeDifferences = (xml, crm) => {
  if (!crm) return [];
  const diffs = [];

  const clean = (val) => (val || '').trim();
  const cleanPass = (val) => (val || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase().trim();
  const cleanDate = (val) => (val ? String(val).slice(0, 10) : '');

  // Nom & Prénom Latin
  const xmlFullLt = normalizeString(`${xml.nom || ''} ${xml.prenom || ''}`);
  const crmFullLt = normalizeString(crm.fullName || `${crm.nom || ''} ${crm.prenom || ''}`);
  const crmNom = normalizeString(crm.nom || '');
  const xmlNom = normalizeString(xml.nom || '');
  const crmPrenom = normalizeString(crm.prenom || '');
  const xmlPrenom = normalizeString(xml.prenom || '');

  // Vérifier si le nom et prénom latin sont déjà équivalents
  // (ex: CRM a "Redjdal Sabrina" dans le nom seul, ou inversé "Naziha Saib", ou nom="REDJDAL" prenom="SABRINA")
  const isNameEquivalent = 
    (xmlFullLt && crmFullLt && xmlFullLt === crmFullLt) ||
    (xmlFullLt && crmNom && xmlFullLt === crmNom) ||
    (xmlNom === crmNom && xmlPrenom === crmPrenom) ||
    (crmNom && xmlNom && xmlPrenom && crmNom.includes(xmlNom) && crmNom.includes(xmlPrenom)) ||
    (crmFullLt && xmlNom && xmlPrenom && crmFullLt.includes(xmlNom) && crmFullLt.includes(xmlPrenom));

  if (!isNameEquivalent) {
    if (clean(xml.nom).toLowerCase() !== clean(crm.nom).toLowerCase()) {
      diffs.push({ label: 'Nom', oldVal: crm.nom, newVal: xml.nom });
    }
    if (clean(xml.prenom).toLowerCase() !== clean(crm.prenom).toLowerCase()) {
      diffs.push({ label: 'Prénom', oldVal: crm.prenom, newVal: xml.prenom });
    }
  }

  // Nom & Prénom Arabe
  const cleanAr = (str) => (str || '').trim().replace(/\s+/g, ' ');
  const xmlFullAr = cleanAr(`${xml.nom_arabe || ''} ${xml.prenom_arabe || ''}`);
  const crmFullAr = cleanAr(`${crm.nom_arabe || ''} ${crm.prenom_arabe || ''}`);
  const crmNomAr = cleanAr(crm.nom_arabe || '');
  const xmlNomAr = cleanAr(xml.nom_arabe || '');
  const crmPrenomAr = cleanAr(crm.prenom_arabe || '');
  const xmlPrenomAr = cleanAr(xml.prenom_arabe || '');

  const isArEquivalent = 
    (xmlFullAr && crmFullAr && xmlFullAr === crmFullAr) ||
    (xmlFullAr && crmNomAr && xmlFullAr === crmNomAr) ||
    (xmlNomAr === crmNomAr && xmlPrenomAr === crmPrenomAr) ||
    (crmNomAr && xmlNomAr && xmlPrenomAr && crmNomAr.includes(xmlNomAr) && crmNomAr.includes(xmlPrenomAr));

  if (!isArEquivalent) {
    if (clean(xml.nom_arabe) && clean(xml.nom_arabe) !== clean(crm.nom_arabe)) {
      diffs.push({ label: 'Nom Arabe', oldVal: crm.nom_arabe || 'Vide', newVal: xml.nom_arabe });
    }
    if (clean(xml.prenom_arabe) && clean(xml.prenom_arabe) !== clean(crm.prenom_arabe)) {
      diffs.push({ label: 'Prénom Arabe', oldVal: crm.prenom_arabe || 'Vide', newVal: xml.prenom_arabe });
    }
  }
  // Passeport
  const crmPass = crm.passport !== '—' ? (crm.passport || crm.num_passeport) : crm.num_passeport;
  if (cleanPass(xml.num_passeport) !== cleanPass(crmPass)) {
    diffs.push({ label: 'Passeport', oldVal: crmPass || 'Vide', newVal: xml.num_passeport });
  }
  // NIN
  if (clean(xml.nin) && clean(xml.nin) !== clean(crm.nin)) {
    diffs.push({ label: 'NIN', oldVal: crm.nin || 'Vide', newVal: xml.nin });
  }
  // Date de naissance
  const crmBirth = crm.dateNaissance || crm.date_naissance;
  if (cleanDate(xml.date_naissance) && cleanDate(xml.date_naissance) !== cleanDate(crmBirth)) {
    diffs.push({ label: 'Date Naiss.', oldVal: crmBirth || 'Vide', newVal: xml.date_naissance });
  }
  // Date émission passeport
  const crmIssue = crm.dateEmissionPassport || crm.date_emission_passeport;
  if (cleanDate(xml.date_emission_passeport) && cleanDate(xml.date_emission_passeport) !== cleanDate(crmIssue)) {
    diffs.push({ label: 'Émission Pass.', oldVal: crmIssue || 'Vide', newVal: xml.date_emission_passeport });
  }
  // Date expiration passeport
  const crmExp = crm.dateExpirationPassport || crm.date_expiration_passeport;
  if (cleanDate(xml.date_expiration_passeport) && cleanDate(xml.date_expiration_passeport) !== cleanDate(crmExp)) {
    diffs.push({ label: 'Expiration Pass.', oldVal: crmExp || 'Vide', newVal: xml.date_expiration_passeport });
  }
  // Lieu de naissance
  if (clean(xml.lieu_naissance) && clean(xml.lieu_naissance).toLowerCase() !== clean(crm.lieu_naissance).toLowerCase()) {
    diffs.push({ label: 'Lieu Naiss.', oldVal: crm.lieu_naissance || 'Vide', newVal: xml.lieu_naissance });
  }
  // Photo
  if (xml.photo_url && !crm.photoUrl && !crm.photo_url) {
    diffs.push({ label: 'Photo d\'identité', oldVal: 'Absente', newVal: 'Ajoutée' });
  }
  // Scan Passeport
  if (xml.passport_scan_url && !crm.passportScanUrl && !crm.passport_scan_url) {
    diffs.push({ label: 'Scan Passeport', oldVal: 'Absent', newVal: 'Ajouté' });
  }

  return diffs;
};

export default function XmlImportModal({ 
  isOpen, 
  onClose, 
  existingPelerins = [], 
  onImportSuccess 
}) {
  const [file, setFile] = useState(null);
  const [parsedRawItems, setParsedRawItems] = useState([]);
  const [parseError, setParseError] = useState('');

  // Liaisons manuelles : { [xmlItemId]: crmPelerinId }
  const [manualLinks, setManualLinks] = useState({});
  const [linkingItemId, setLinkingItemId] = useState(null);
  const [crmSearchQuery, setCrmSearchQuery] = useState('');

  // Mode de fusion choisi par l'utilisateur (Option C)
  const [mergePolicy, setMergePolicy] = useState('fill_missing');
  const [importPictures, setImportPictures] = useState(true);
  const [importScans, setImportScans] = useState(true);
  const [createNewPilgrims, setCreateNewPilgrims] = useState(true);

  // Pèlerins ignorés / supprimés manuellement (ne seront pas créés)
  const [ignoredItemIds, setIgnoredItemIds] = useState(new Set());

  // Masquer les pèlerins déjà à jour par défaut
  const [hideIdentical, setHideIdentical] = useState(true);

  // Filtre d'affichage
  const [activeTab, setActiveTab] = useState('todo'); // 'todo' | 'update' | 'unmatched' | 'identical' | 'all'
  const [searchFilter, setSearchFilter] = useState('');

  // État d'exécution
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [importReport, setImportReport] = useState(null);

  /**
   * Parse le fichier XML (Format XDS / Sejil / Nusuk)
   */
  const handleFileUpload = (e) => {
    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;

    if (!uploadedFile.name.toLowerCase().endsWith('.xml')) {
      setParseError('Veuillez sélectionner un fichier au format XML (.xml).');
      return;
    }

    setFile(uploadedFile);
    setParseError('');
    setImportReport(null);
    setManualLinks({});

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const xmlText = event.target.result;
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, 'text/xml');

        const parserErrors = xmlDoc.getElementsByTagName('parsererror');
        if (parserErrors.length > 0) {
          throw new Error("Le fichier XML n'est pas bien formé.");
        }

        const muatamirNodes = xmlDoc.getElementsByTagName('Muatamir');
        if (muatamirNodes.length === 0) {
          throw new Error("Aucun pèlerin (<Muatamir>) trouvé dans ce fichier XML.");
        }

        const items = [];

        for (let i = 0; i < muatamirNodes.length; i++) {
          const m = muatamirNodes[i];

          const getTag = (tagName) => {
            const el = m.getElementsByTagName(tagName)[0];
            return el ? el.textContent.trim() : '';
          };

          const birthInfoEl = m.getElementsByTagName('BirthInfo')[0];
          const passportEl = m.getElementsByTagName('Passport')[0];

          // Passeport & Dates
          const rawPassport = passportEl?.getAttribute('PassportNumber') || getTag('PassportNumber') || '';
          const cleanPass = normalizePassport(rawPassport);
          const issuedDate = getTag('IssuedDate') || null;
          const expiredDate = getTag('ExpiredDate') || null;

          // Identité
          const nomLt = getTag('LastNameLt') || '';
          const prenomLt = getTag('FirstNameLt') || '';
          const nomAr = getTag('LastNameAr') || '';
          const prenomAr = getTag('FirstNameAr') || '';

          // Genre (0 = F, 1 = H)
          const rawGender = getTag('Gender');
          const sexe = rawGender === '0' ? 'F' : 'H';

          // Naissance
          const birthDate = birthInfoEl?.getAttribute('Date') || getTag('BirthDate') || null;
          const birthPlaceLt = birthInfoEl?.getAttribute('BirthPlaceLt') || '';
          const birthPlaceAr = birthInfoEl?.getAttribute('BirthPlaceAr') || '';
          const rawNat = getTag('NationnalityCode');
          const nationalite = (rawNat === 'DZ' || rawNat === '101') ? 'Algérienne' : (rawNat || 'Algérienne');

          // NIN
          const nin = getTag('NIN') || null;

          // Photos & Scans
          const rawPic = getTag('Picture');
          const rawScan = getTag('PassportScan');
          const pictureUrl = rawPic ? `data:image/jpeg;base64,${rawPic}` : null;
          const scanUrl = rawScan ? `data:image/jpeg;base64,${rawScan}` : null;

          items.push({
            id: `xml_${i}_${cleanPass || i}`,
            index: i + 1,
            num_passeport: cleanPass || rawPassport,
            nom: nomLt,
            prenom: prenomLt,
            nom_arabe: nomAr,
            prenom_arabe: prenomAr,
            sexe,
            date_naissance: birthDate,
            lieu_naissance: birthPlaceLt,
            lieu_naissance_arabe: birthPlaceAr,
            nationalite,
            nin,
            date_emission_passeport: issuedDate,
            date_expiration_passeport: expiredDate,
            photo_url: pictureUrl,
            passport_scan_url: scanUrl
          });
        }

        setParsedRawItems(items);
      } catch (err) {
        console.error("Erreur de parsing XML:", err);
        setParseError(err.message || "Erreur lors de la lecture du fichier XML.");
        setParsedRawItems([]);
      }
    };

    reader.onerror = () => {
      setParseError("Impossible de lire le fichier.");
    };

    reader.readAsText(uploadedFile);
  };

  /**
   * Analyse complète avec matching automatique ou manuel et calcul des différences
   */
  const reconciledItems = useMemo(() => {
    return parsedRawItems
      .filter(item => !ignoredItemIds.has(item.id))
      .map((item) => {
        let matchedPelerin = null;
      let isManual = false;

      // 1. Vérifier si l'utilisateur a lié ce pèlerin manuellement
      if (manualLinks[item.id]) {
        matchedPelerin = existingPelerins.find(p => (p.pelerin_id || p.id) === manualLinks[item.id]);
        isManual = true;
      }

      // 2. Matching automatique par N° de passeport
      if (!matchedPelerin && item.num_passeport) {
        const cleanItemPass = normalizePassport(item.num_passeport);
        matchedPelerin = existingPelerins.find(p => {
          const crmPass = normalizePassport(p.passport || p.num_passeport);
          return crmPass && crmPass === cleanItemPass;
        });
      }

      // 3. Matching secondaire par Nom + Prénom
      if (!matchedPelerin && item.nom) {
        const targetNom = normalizeString(item.nom);
        const targetPrenom = normalizeString(item.prenom);

        matchedPelerin = existingPelerins.find(p => {
          const cNom = normalizeString(p.nom);
          const cPrenom = normalizeString(p.prenom);
          const cFull = normalizeString(p.fullName);
          if (cNom === targetNom && cPrenom === targetPrenom) return true;
          if (cFull && cFull.includes(targetNom) && cFull.includes(targetPrenom)) return true;
          return false;
        });
      }

      // Calcul des différences avec le dossier CRM
      const diffs = matchedPelerin ? computeDifferences(item, matchedPelerin) : [];

      let status = 'unmatched'; // 'unmatched' | 'update' | 'identical'
      if (matchedPelerin) {
        status = diffs.length > 0 ? 'update' : 'identical';
      }

      return {
        ...item,
        matchedPelerin,
        isManualLink: isManual,
        diffs,
        status, // 'unmatched' | 'update' | 'identical'
        isMatched: !!matchedPelerin
      };
    });
  }, [parsedRawItems, manualLinks, existingPelerins, ignoredItemIds]);

  // Statistiques en temps réel
  const stats = useMemo(() => {
    const total = reconciledItems.length;
    const identical = reconciledItems.filter(x => x.status === 'identical').length;
    const update = reconciledItems.filter(x => x.status === 'update').length;
    const unmatched = reconciledItems.filter(x => x.status === 'unmatched').length;
    const todo = update + unmatched;

    return { total, identical, update, unmatched, todo };
  }, [reconciledItems]);

  // Liste filtrée selon l'onglet et la recherche
  const displayItems = useMemo(() => {
    return reconciledItems.filter(item => {
      // Filtrage par onglet
      if (activeTab === 'todo' && item.status === 'identical') return false;
      if (activeTab === 'update' && item.status !== 'update') return false;
      if (activeTab === 'unmatched' && item.status !== 'unmatched') return false;
      if (activeTab === 'identical' && item.status !== 'identical') return false;

      // Masquer les identiques si demandé (sur onglet 'all')
      if (activeTab === 'all' && hideIdentical && item.status === 'identical') {
        return false;
      }

      // Recherche texte
      if (searchFilter.trim()) {
        const query = searchFilter.toLowerCase().trim();
        const fullLt = `${item.nom} ${item.prenom}`.toLowerCase();
        const fullAr = `${item.nom_arabe} ${item.prenom_arabe}`.toLowerCase();
        const pass = (item.num_passeport || '').toLowerCase();
        const nin = (item.nin || '').toLowerCase();
        const crmName = item.matchedPelerin?.fullName?.toLowerCase() || '';
        return fullLt.includes(query) || fullAr.includes(query) || pass.includes(query) || nin.includes(query) || crmName.includes(query);
      }
      return true;
    });
  }, [reconciledItems, activeTab, hideIdentical, searchFilter]);

  // Pèlerins CRM filtrés pour la modalité de liaison manuelle
  const linkableCrmPelerins = useMemo(() => {
    if (!crmSearchQuery.trim()) return existingPelerins.slice(0, 50);
    const q = crmSearchQuery.toLowerCase().trim();
    return existingPelerins.filter(p => {
      const full = (p.fullName || `${p.nom} ${p.prenom || ''}`).toLowerCase();
      const pass = (p.passport || p.num_passeport || '').toLowerCase();
      const grp = (p.groupeNom || '').toLowerCase();
      return full.includes(q) || pass.includes(q) || grp.includes(q);
    }).slice(0, 50);
  }, [existingPelerins, crmSearchQuery]);

  /**
   * Liaison manuelle d'un pèlerin
   */
  const handleAssignManualLink = (xmlItemId, crmPelerinId) => {
    setManualLinks(prev => ({
      ...prev,
      [xmlItemId]: crmPelerinId
    }));
    setLinkingItemId(null);
    setCrmSearchQuery('');
  };

  /**
   * Dissociation manuelle
   */
  const handleRemoveManualLink = (xmlItemId) => {
    setManualLinks(prev => {
      const copy = { ...prev };
      delete copy[xmlItemId];
      return copy;
    });
  };

  /**
   * Ignorer / Supprimer un pèlerin non trouvé de la liste (ne sera pas créé)
   */
  const handleIgnoreItem = (xmlItemId) => {
    setIgnoredItemIds(prev => new Set([...prev, xmlItemId]));
  };

  /**
   * Rétablir tous les pèlerins ignorés
   */
  const handleRestoreIgnored = () => {
    setIgnoredItemIds(new Set());
  };

  /**
   * Ignorer tous les pèlerins non trouvés en lot
   */
  const handleIgnoreAllUnmatched = () => {
    const unmatchedIds = reconciledItems
      .filter(item => item.status === 'unmatched')
      .map(item => item.id);
    setIgnoredItemIds(prev => new Set([...prev, ...unmatchedIds]));
  };

  /**
   * Exécution de l'importation vers Supabase
   */
  /**
   * Exécution de l'importation vers Supabase
   * Met à jour directement omra_enregistrements (dossiers des pèlerins dans les groupes)
   * et public.pelerins si fiches autonomes.
   */
  const handleExecuteImport = async () => {
    // Seuls les dossiers qui ont des changements ou sont créés manuellement sont traités
    const itemsToProcess = reconciledItems.filter(item => {
      if (item.status === 'update') return true;
      if (item.status === 'unmatched' && createNewPilgrims) return true;
      return false;
    });

    if (itemsToProcess.length === 0) {
      alert("Tous les dossiers sont déjà à jour ou aucun pèlerin à traiter.");
      return;
    }

    setImporting(true);
    setProgress(0);

    let updatedCount = 0;
    let createdCount = 0;
    let errorsCount = 0;
    const errorDetails = [];

    const isUuid = (str) => typeof str === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

    try {
      // 1. Grouper les pèlerins liés à un enregistrement CRM (omra_enregistrements)
      const enrGroups = new Map(); // enrId -> Array<{ item, existing }>
      const standaloneItems = [];
      const newItems = [];

      itemsToProcess.forEach(item => {
        if (item.status === 'update' && item.matchedPelerin?.enrId) {
          const enrId = item.matchedPelerin.enrId;
          if (!enrGroups.has(enrId)) enrGroups.set(enrId, []);
          enrGroups.get(enrId).push({ item, existing: item.matchedPelerin });
        } else if (item.status === 'update') {
          standaloneItems.push({ item, existing: item.matchedPelerin });
        } else if (item.status === 'unmatched' && createNewPilgrims) {
          newItems.push(item);
        }
      });

      const totalTasks = Math.max(1, enrGroups.size + standaloneItems.length + newItems.length);
      let completedTasks = 0;

      // 2. Traitement des enregistrements CRM (omra_enregistrements)
      for (const [enrId, groupMembers] of enrGroups.entries()) {
        try {
          const { data: enrRecord, error: fetchErr } = await supabase
            .from('omra_enregistrements')
            .select('id, pelerins, enfants_sans_lit')
            .eq('id', enrId)
            .single();

          if (fetchErr || !enrRecord) {
            console.error(`Erreur lecture enregistrement ${enrId}:`, fetchErr);
            errorsCount += groupMembers.length;
            errorDetails.push(`Dossier ${enrId}: ${fetchErr?.message || 'Introuvable'}`);
            continue;
          }

          let updatedPelerins = Array.isArray(enrRecord.pelerins) ? [...enrRecord.pelerins] : [];
          let updatedEnfants = Array.isArray(enrRecord.enfants_sans_lit) ? [...enrRecord.enfants_sans_lit] : [];

          groupMembers.forEach(({ item, existing }) => {
            const findInList = (list) => {
              if (existing.pelerin_id) {
                const found = list.find(p => p.pelerin_id === existing.pelerin_id);
                if (found) return found;
              }
              if (item.num_passeport || existing.passport) {
                const targetPass = normalizePassport(item.num_passeport || existing.passport);
                const found = list.find(p => normalizePassport(p.passport || p.num_passeport) === targetPass);
                if (found) return found;
              }
              if (existing.nom) {
                const tNom = normalizeString(existing.nom);
                const tPrenom = normalizeString(existing.prenom || '');
                const found = list.find(p => {
                  const pNom = normalizeString(p.nom || '');
                  const pPrenom = normalizeString(p.prenom || '');
                  return pNom === tNom && (!tPrenom || pPrenom === tPrenom || pNom.includes(tPrenom));
                });
                if (found) return found;
              }
              return null;
            };

            let target = null;
            if (existing.isEnfantSansLit) {
              target = findInList(updatedEnfants);
            }
            if (!target) {
              target = findInList(updatedPelerins);
            }

            if (target) {
              // Mettre à jour les données selon la politique choisie
              if (mergePolicy === 'overwrite') {
                if (item.nom) target.nom = item.nom;
                if (item.prenom) target.prenom = item.prenom;
              } else {
                if (!target.nom && item.nom) target.nom = item.nom;
                if (!target.prenom && item.prenom) target.prenom = item.prenom;
              }

              // Enrichissements officiels issus du XML
              if (item.nom_arabe) target.nom_arabe = item.nom_arabe;
              if (item.prenom_arabe) target.prenom_arabe = item.prenom_arabe;
              if (item.sexe) target.sexe = item.sexe;
              if (item.date_naissance) {
                target.date_naissance = item.date_naissance;
                target.dateNaissance = item.date_naissance;
              }
              if (item.lieu_naissance) target.lieu_naissance = item.lieu_naissance;
              if (item.lieu_naissance_arabe) target.lieu_naissance_arabe = item.lieu_naissance_arabe;
              if (item.nationalite) target.nationalite = item.nationalite;
              if (item.num_passeport) {
                target.num_passeport = item.num_passeport;
                target.passport = item.num_passeport;
              }
              if (item.date_emission_passeport) {
                target.date_emission_passeport = item.date_emission_passeport;
                target.dateEmissionPassport = item.date_emission_passeport;
              }
              if (item.date_expiration_passeport) {
                target.date_expiration_passeport = item.date_expiration_passeport;
                target.dateExpirationPassport = item.date_expiration_passeport;
              }
              if (item.nin) target.nin = item.nin;

              if (importPictures && item.photo_url) {
                if (mergePolicy === 'overwrite' || (!target.photo_url && !target.photoUrl)) {
                  target.photo_url = item.photo_url;
                  target.photoUrl = item.photo_url;
                }
              }

              if (importScans && item.passport_scan_url) {
                if (mergePolicy === 'overwrite' || (!target.passport_scan_url && !target.passportScanUrl)) {
                  target.passport_scan_url = item.passport_scan_url;
                  target.passportScanUrl = item.passport_scan_url;
                }
              }

              updatedCount++;

              // Optionnel: sync background avec public.pelerins si UUID valide
              if (existing.pelerin_id && isUuid(existing.pelerin_id)) {
                supabase.from('pelerins').upsert({
                  id: existing.pelerin_id,
                  nom: target.nom || existing.nom,
                  prenom: target.prenom || existing.prenom || null,
                  nom_arabe: target.nom_arabe || null,
                  prenom_arabe: target.prenom_arabe || null,
                  sexe: target.sexe || 'H',
                  date_naissance: target.date_naissance || null,
                  lieu_naissance: target.lieu_naissance || null,
                  lieu_naissance_arabe: target.lieu_naissance_arabe || null,
                  nationalite: target.nationalite || 'Algérienne',
                  num_passeport: target.num_passeport || null,
                  date_emission_passeport: target.date_emission_passeport || null,
                  date_expiration_passeport: target.date_expiration_passeport || null,
                  nin: target.nin || null,
                  photo_url: target.photo_url || null,
                  passport_scan_url: target.passport_scan_url || null,
                  updated_at: new Date().toISOString()
                }, { onConflict: 'id' }).then();
              }
            } else {
              console.warn(`Pèlerin "${item.nom}" non trouvé dans la liste interne du dossier ${enrId}`);
              errorsCount++;
              errorDetails.push(`Pèlerin "${item.nom}" : non trouvé dans le dossier ${enrId}`);
            }
          });

          // Enregistrement effectif dans la base de données
          const { error: saveErr } = await supabase
            .from('omra_enregistrements')
            .update({
              pelerins: updatedPelerins,
              enfants_sans_lit: updatedEnfants
            })
            .eq('id', enrId);

          if (saveErr) {
            console.error(`Erreur mise à jour enregistrement ${enrId}:`, saveErr);
            errorDetails.push(`Dossier ${enrId}: ${saveErr.message}`);
          }
        } catch (errGroup) {
          console.error("Erreur groupe:", errGroup);
          errorDetails.push(`Erreur dossier ${enrId}: ${errGroup.message}`);
        }

        completedTasks++;
        setProgress(Math.round((completedTasks / totalTasks) * 100));
      }

      // 3. Traitement des pèlerins autonomes hors dossier
      for (const { item, existing } of standaloneItems) {
        try {
          const targetId = isUuid(existing.pelerin_id || existing.id)
            ? (existing.pelerin_id || existing.id)
            : (crypto.randomUUID ? crypto.randomUUID() : `p_${Date.now()}`);

          const payload = {
            id: targetId,
            nom: (mergePolicy === 'overwrite' ? item.nom : existing.nom) || item.nom,
            prenom: (mergePolicy === 'overwrite' ? item.prenom : existing.prenom) || item.prenom || null,
            nom_arabe: item.nom_arabe || existing.nom_arabe || null,
            prenom_arabe: item.prenom_arabe || existing.prenom_arabe || null,
            sexe: item.sexe || existing.sexe || 'H',
            date_naissance: item.date_naissance || existing.date_naissance || null,
            lieu_naissance: item.lieu_naissance || existing.lieu_naissance || null,
            lieu_naissance_arabe: item.lieu_naissance_arabe || existing.lieu_naissance_arabe || null,
            nationalite: item.nationalite || existing.nationalite || 'Algérienne',
            num_passeport: item.num_passeport || existing.num_passeport || null,
            date_emission_passeport: item.date_emission_passeport || existing.date_emission_passeport || null,
            date_expiration_passeport: item.date_expiration_passeport || existing.date_expiration_passeport || null,
            nin: item.nin || existing.nin || null,
            photo_url: (importPictures && item.photo_url) ? item.photo_url : (existing.photo_url || null),
            passport_scan_url: (importScans && item.passport_scan_url) ? item.passport_scan_url : (existing.passport_scan_url || null),
            updated_at: new Date().toISOString()
          };

          const { error: pErr } = await supabase.from('pelerins').upsert(payload, { onConflict: 'id' });
          if (pErr) {
            console.error(`Erreur pèlerin autonome ${item.nom}:`, pErr);
            errorsCount++;
            errorDetails.push(`Pèlerin "${item.nom}": ${pErr.message}`);
          } else {
            updatedCount++;
          }
        } catch (sErr) {
          errorsCount++;
          errorDetails.push(`Pèlerin "${item.nom}": ${sErr.message}`);
        }
        completedTasks++;
        setProgress(Math.round((completedTasks / totalTasks) * 100));
      }

      // 4. Traitement des nouvelles fiches pèlerins non trouvées
      for (const item of newItems) {
        try {
          const newId = (typeof crypto !== 'undefined' && crypto.randomUUID)
            ? crypto.randomUUID()
            : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
                const r = (Math.random() * 16) | 0;
                const v = c === 'x' ? r : (r & 0x3) | 0x8;
                return v.toString(16);
              });

          const newPayload = {
            id: newId,
            nom: item.nom || 'Inconnu',
            prenom: item.prenom || null,
            nom_arabe: item.nom_arabe || null,
            prenom_arabe: item.prenom_arabe || null,
            sexe: item.sexe || 'H',
            date_naissance: item.date_naissance || null,
            lieu_naissance: item.lieu_naissance || null,
            lieu_naissance_arabe: item.lieu_naissance_arabe || null,
            nationalite: item.nationalite || 'Algérienne',
            num_passeport: item.num_passeport || null,
            date_emission_passeport: item.date_emission_passeport || null,
            date_expiration_passeport: item.date_expiration_passeport || null,
            nin: item.nin || null,
            photo_url: (importPictures && item.photo_url) ? item.photo_url : null,
            passport_scan_url: (importScans && item.passport_scan_url) ? item.passport_scan_url : null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };

          const { error: insertErr } = await supabase.from('pelerins').insert([newPayload]);
          if (insertErr) {
            console.error(`Erreur création fiche ${item.nom}:`, insertErr);
            errorsCount++;
            errorDetails.push(`Création "${item.nom}": ${insertErr.message}`);
          } else {
            createdCount++;
          }
        } catch (nErr) {
          errorsCount++;
          errorDetails.push(`Création "${item.nom}": ${nErr.message}`);
        }
        completedTasks++;
        setProgress(Math.round((completedTasks / totalTasks) * 100));
      }

      setImportReport({
        totalProcessed: itemsToProcess.length,
        updatedCount,
        createdCount,
        errorsCount,
        errorDetails
      });

      if ((updatedCount > 0 || createdCount > 0) && onImportSuccess) {
        onImportSuccess();
      }
    } catch (err) {
      console.error("Erreur import:", err);
      alert("Erreur lors de l'importation: " + err.message);
    } finally {
      setImporting(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setParsedRawItems([]);
    setManualLinks({});
    setIgnoredItemIds(new Set());
    setParseError('');
    setImportReport(null);
    setProgress(0);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5">
      <div className="bg-white rounded-2xl max-w-5xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 text-white flex items-center justify-between shrink-0 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white font-bold border border-white/20 shadow-inner">
              <FileText size={22} />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight flex items-center gap-2">
                Importation & Enrichissement XML Pèlerins
                <span className="text-[10px] bg-white/20 font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider">
                  XDS / Sejil / Nusuk
                </span>
              </h2>
              <p className="text-xs text-amber-100">
                Détection automatique des doublons, liaison manuelle et mise à jour ciblée.
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onClose}
            className="text-white hover:bg-white/20 rounded-full"
          >
            <X size={20} />
          </Button>
        </div>

        {/* Body content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar bg-slate-50/50">

          {/* Étape 1 : Sélection du fichier XML */}
          {!file && (
            <div className="space-y-4">
              <div 
                className="border-2 border-dashed border-amber-300 hover:border-amber-500 rounded-2xl p-10 bg-amber-50/30 hover:bg-amber-50/60 transition-all text-center flex flex-col items-center justify-center cursor-pointer group"
                onClick={() => document.getElementById('xml-file-input').click()}
              >
                <div className="w-16 h-16 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-sm">
                  <Upload size={32} />
                </div>
                <h3 className="font-bold text-base text-slate-800 mb-1">
                  Glissez ou choisissez votre fichier XML ici
                </h3>
                <p className="text-xs text-slate-500 max-w-md mb-4">
                  Fichiers officiels Sejil, Bab Makkah ou Nusuk (<code className="font-mono text-amber-700 bg-amber-100/70 px-1 py-0.5 rounded">XDS-*.xml</code>).
                </p>
                <Button 
                  type="button" 
                  size="sm" 
                  className="bg-amber-600 hover:bg-amber-700 text-white font-bold h-9 px-5 shadow-sm"
                >
                  Parcourir mes fichiers...
                </Button>
                <input 
                  id="xml-file-input"
                  type="file" 
                  accept=".xml,text/xml" 
                  onChange={handleFileUpload}
                  className="hidden" 
                />
              </div>

              {parseError && (
                <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 flex items-center gap-3 text-xs font-medium">
                  <AlertTriangle size={18} className="shrink-0" />
                  <span>{parseError}</span>
                </div>
              )}
            </div>
          )}

          {/* Étape 2 : Analyse & Dashboard du fichier XML */}
          {file && (
            <div className="space-y-5">
              
              {/* Carte Info & KPIs avec Détection des Changements */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {/* Total */}
                <Card className="border border-slate-200 bg-white shadow-xs">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total XML</div>
                      <div className="text-2xl font-black text-slate-900">{stats.total}</div>
                      <div className="text-[10px] text-slate-400 truncate max-w-[140px]" title={file.name}>
                        {file.name}
                      </div>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={handleReset}
                      className="text-xs text-slate-400 hover:text-red-600 h-7 px-2"
                    >
                      Changer
                    </Button>
                  </CardContent>
                </Card>

                {/* Déjà à jour (Identiques) */}
                <Card className="border-l-4 border-l-emerald-500 bg-white shadow-xs">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Déjà à Jour</div>
                      <div className="text-2xl font-black text-emerald-600">{stats.identical}</div>
                      <div className="text-[11px] text-emerald-700 font-semibold">
                        Données 100% identiques
                      </div>
                    </div>
                    <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                      <CheckCheck size={20} />
                    </div>
                  </CardContent>
                </Card>

                {/* Mises à jour disponibles */}
                <Card className="border-l-4 border-l-blue-500 bg-white shadow-xs">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Mises à Jour</div>
                      <div className="text-2xl font-black text-blue-600">{stats.update}</div>
                      <div className="text-[11px] text-blue-700 font-semibold">
                        Nouveaux détails détectés
                      </div>
                    </div>
                    <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                      <Sparkles size={20} />
                    </div>
                  </CardContent>
                </Card>

                {/* Non trouvés */}
                <Card className="border-l-4 border-l-amber-500 bg-white shadow-xs">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Non Trouvés</div>
                      <div className="text-2xl font-black text-amber-600">{stats.unmatched}</div>
                      <div className="text-[11px] text-amber-700 font-semibold">
                        À lier ou créer
                      </div>
                    </div>
                    <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                      <Link2 size={20} />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Message de succès si tout est déjà à jour */}
              {stats.identical === stats.total && stats.total > 0 && (
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CheckCheck size={24} className="text-emerald-600 shrink-0" />
                    <div>
                      <div className="font-bold text-sm">Tous les pèlerins sont déjà à jour !</div>
                      <div className="text-xs text-emerald-700">
                        Les <b>{stats.total}</b> pèlerins de ce fichier XML existent déjà dans votre CRM et leurs données sont strictement identiques. Aucune mise à jour n'est requise.
                      </div>
                    </div>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => { setActiveTab('all'); setHideIdentical(false); }}
                    className="h-8 text-xs bg-white text-emerald-800 border-emerald-300"
                  >
                    Consulter quand même
                  </Button>
                </div>
              )}

              {/* ── Bloc Configuration & Options ── */}
              <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs space-y-3.5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <div className="flex items-center gap-2">
                    <ShieldCheck size={16} className="text-amber-600" />
                    <span className="font-bold text-xs text-slate-800 uppercase tracking-wider">
                      Options & Politique de Fusion
                    </span>
                  </div>

                  {/* Toggle Masquer les déjà à jour */}
                  {stats.identical > 0 && (
                    <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 cursor-pointer select-none bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-100">
                      <input 
                        type="checkbox" 
                        checked={hideIdentical} 
                        onChange={e => setHideIdentical(e.target.checked)}
                        className="rounded text-amber-600 focus:ring-amber-500" 
                      />
                      <span>Masquer les {stats.identical} dossiers déjà à jour</span>
                    </label>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <label className={cn(
                    "flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all",
                    mergePolicy === 'fill_missing' 
                      ? "border-emerald-500 bg-emerald-50/30 shadow-xs" 
                      : "border-slate-200 hover:border-slate-300 bg-white"
                  )}>
                    <input 
                      type="radio" 
                      name="merge_policy" 
                      checked={mergePolicy === 'fill_missing'} 
                      onChange={() => setMergePolicy('fill_missing')}
                      className="mt-0.5 text-emerald-600 focus:ring-emerald-500" 
                    />
                    <div className="space-y-0.5">
                      <div className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                        <span>Remplir uniquement les données manquantes</span>
                        <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.2 rounded">Recommandé</span>
                      </div>
                      <p className="text-[11px] text-slate-500">
                        Conserve les saisies de votre agence. Ajoute le NIN, le nom arabe, les dates délivrance et scans manquants.
                      </p>
                    </div>
                  </label>

                  <label className={cn(
                    "flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all",
                    mergePolicy === 'overwrite' 
                      ? "border-blue-500 bg-blue-50/30 shadow-xs" 
                      : "border-slate-200 hover:border-slate-300 bg-white"
                  )}>
                    <input 
                      type="radio" 
                      name="merge_policy" 
                      checked={mergePolicy === 'overwrite'} 
                      onChange={() => setMergePolicy('overwrite')}
                      className="mt-0.5 text-blue-600 focus:ring-blue-500" 
                    />
                    <div className="space-y-0.5">
                      <div className="font-bold text-xs text-slate-900">
                        Écraser avec les données officielles du XML
                      </div>
                      <p className="text-[11px] text-slate-500">
                        Remplace l'orthographe du nom/prénom et dates par les valeurs officielles issues du consulat / Sejil.
                      </p>
                    </div>
                  </label>
                </div>

                <div className="pt-2 flex flex-wrap items-center gap-5 border-t border-slate-100 text-xs font-medium text-slate-700">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input 
                      type="checkbox" 
                      checked={importPictures} 
                      onChange={e => setImportPictures(e.target.checked)}
                      className="rounded text-amber-600 focus:ring-amber-500" 
                    />
                    <span className="flex items-center gap-1">
                      <ImageIcon size={14} className="text-slate-500" />
                      Importer les photos d'identité
                    </span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input 
                      type="checkbox" 
                      checked={importScans} 
                      onChange={e => setImportScans(e.target.checked)}
                      className="rounded text-amber-600 focus:ring-amber-500" 
                    />
                    <span className="flex items-center gap-1">
                      <FileText size={14} className="text-slate-500" />
                      Importer les scans de passeport
                    </span>
                  </label>

                  {stats.unmatched > 0 && (
                    <label className="flex items-center gap-2 cursor-pointer select-none text-amber-800 font-bold">
                      <input 
                        type="checkbox" 
                        checked={createNewPilgrims} 
                        onChange={e => setCreateNewPilgrims(e.target.checked)}
                        className="rounded text-amber-600 focus:ring-amber-500" 
                      />
                      <span className="flex items-center gap-1">
                        <UserPlus size={14} />
                        Créer les {stats.unmatched} dossiers non liés comme nouveaux pèlerins
                      </span>
                    </label>
                  )}
                </div>
              </div>

              {/* ── Tableau & Filtres ── */}
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                  {/* Tabs */}
                  <div className="flex items-center p-1 bg-slate-200/60 rounded-xl text-xs font-bold w-full sm:w-auto overflow-x-auto">
                    <button
                      onClick={() => setActiveTab('todo')}
                      className={cn(
                        "px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap",
                        activeTab === 'todo' ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
                      )}
                    >
                      <Sparkles size={13} className="text-amber-600" />
                      À Traiter ({stats.todo})
                    </button>
                    <button
                      onClick={() => setActiveTab('update')}
                      className={cn(
                        "px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap",
                        activeTab === 'update' ? "bg-white text-blue-700 shadow-xs" : "text-slate-600 hover:text-slate-900"
                      )}
                    >
                      Mises à jour ({stats.update})
                    </button>
                    <button
                      onClick={() => setActiveTab('unmatched')}
                      className={cn(
                        "px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap",
                        activeTab === 'unmatched' ? "bg-white text-amber-700 shadow-xs" : "text-slate-600 hover:text-slate-900"
                      )}
                    >
                      <Link2 size={13} className="text-amber-600" />
                      Non Trouvés ({stats.unmatched})
                    </button>
                    <button
                      onClick={() => setActiveTab('identical')}
                      className={cn(
                        "px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap",
                        activeTab === 'identical' ? "bg-white text-emerald-700 shadow-xs" : "text-slate-600 hover:text-slate-900"
                      )}
                    >
                      <CheckCheck size={13} className="text-emerald-600" />
                      Déjà à jour ({stats.identical})
                    </button>
                    <button
                      onClick={() => setActiveTab('all')}
                      className={cn(
                        "px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap",
                        activeTab === 'all' ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
                      )}
                    >
                      Tous ({stats.total})
                    </button>
                  </div>

                  {/* Actions & Recherche */}
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    {activeTab === 'unmatched' && stats.unmatched > 0 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleIgnoreAllUnmatched}
                        className="h-8.5 text-xs gap-1.5 text-red-700 border-red-200 bg-red-50 hover:bg-red-100 font-bold shrink-0"
                      >
                        <Trash2 size={13} />
                        Ignorer tous ({stats.unmatched})
                      </Button>
                    )}

                    <div className="relative w-full sm:w-64">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <Input 
                        value={searchFilter}
                        onChange={e => setSearchFilter(e.target.value)}
                        placeholder="Filtrer par nom, passeport..."
                        className="h-8.5 pl-8.5 text-xs bg-white"
                      />
                    </div>
                  </div>
                </div>

                {/* Bannière pèlerins ignorés si existants */}
                {ignoredItemIds.size > 0 && (
                  <div className="flex items-center justify-between p-2.5 px-3 rounded-xl bg-slate-100/80 border border-slate-200 text-xs text-slate-600">
                    <span className="flex items-center gap-1.5 font-medium">
                      <Trash2 size={13} className="text-red-500" />
                      <b>{ignoredItemIds.size}</b> pèlerin(s) retiré(s) de la liste (ne seront pas créés dans le CRM).
                    </span>
                    <button 
                      type="button"
                      onClick={handleRestoreIgnored} 
                      className="text-xs text-amber-700 hover:text-amber-800 font-bold underline"
                    >
                      Rétablir ces pèlerins
                    </button>
                  </div>
                )}

                {/* Table */}
                <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs max-h-88 overflow-y-auto custom-scrollbar">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="bg-slate-50 text-slate-600 font-bold sticky top-0 z-10 border-b border-slate-200 shadow-xs">
                      <tr>
                        <th className="py-2.5 px-3 w-10 text-center">#</th>
                        <th className="py-2.5 px-3 w-56">Pèlerin (XML)</th>
                        <th className="py-2.5 px-3 w-32">Passeport</th>
                        <th className="py-2.5 px-3">Modifications & Différences</th>
                        <th className="py-2.5 px-3 w-64">Correspondance CRM</th>
                        <th className="py-2.5 px-3 text-center w-28">Statut</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {displayItems.length === 0 ? (
                        <tr>
                          <td colSpan="6" className="py-10 text-center text-slate-400">
                            {stats.identical === stats.total ? (
                              <div className="space-y-1">
                                <div className="font-bold text-slate-600">Tous les pèlerins sont déjà à jour !</div>
                                <div className="text-xs">Désactivez le masquage ou cliquez sur "Déjà à jour" pour les afficher.</div>
                              </div>
                            ) : (
                              "Aucun pèlerin correspondant au filtre sélectionné."
                            )}
                          </td>
                        </tr>
                      ) : (
                        displayItems.map((item) => (
                          <tr key={item.id} className={cn(
                            "transition-colors",
                            item.status === 'identical' && "bg-slate-50/40 opacity-75 hover:opacity-100",
                            item.status === 'update' && "hover:bg-blue-50/40",
                            item.status === 'unmatched' && "hover:bg-amber-50/40"
                          )}>
                            <td className="py-2.5 px-3 text-center text-slate-400 font-mono text-[11px]">
                              {item.index}
                            </td>
                            
                            {/* Pèlerin XML */}
                            <td className="py-2.5 px-3">
                              <div className="flex items-center gap-2.5">
                                {item.photo_url ? (
                                  <img 
                                    src={item.photo_url} 
                                    alt="Avatar" 
                                    className="w-8 h-8 rounded-lg object-cover border border-slate-200 shrink-0" 
                                  />
                                ) : (
                                  <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 shrink-0 font-bold">
                                    {item.nom?.[0] || 'P'}
                                  </div>
                                )}
                                <div className="min-w-0">
                                  <div className="font-bold text-slate-900 truncate">
                                    {item.nom} {item.prenom}
                                  </div>
                                  <div className="text-[11px] text-amber-800 font-medium font-arabic" dir="rtl">
                                    {item.nom_arabe} {item.prenom_arabe}
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* Passeport */}
                            <td className="py-2.5 px-3">
                              <div className="font-mono font-bold text-slate-800">
                                {item.num_passeport || '—'}
                              </div>
                              <div className="text-[10px] text-slate-400">
                                Exp: {item.date_expiration_passeport || '—'}
                              </div>
                            </td>

                            {/* Modifications détectées */}
                            <td className="py-2.5 px-3">
                              {item.status === 'identical' ? (
                                <span className="text-emerald-700 font-medium text-[11px] flex items-center gap-1">
                                  <CheckCheck size={13} /> Identique au dossier CRM
                                </span>
                              ) : item.diffs.length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                  {item.diffs.map((d, dIdx) => (
                                    <span 
                                      key={dIdx} 
                                      className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-blue-50 text-blue-800 border border-blue-200 font-medium"
                                      title={`${d.oldVal} ➔ ${d.newVal}`}
                                    >
                                      +{d.label}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-slate-400 text-[11px] italic">
                                  Nouveau pèlerin à importer
                                </span>
                              )}
                            </td>

                            {/* Correspondance CRM & Sélecteur Manuel */}
                            <td className="py-2.5 px-3">
                              {item.isMatched ? (
                                <div className="flex items-center justify-between gap-2">
                                  <div className="min-w-0">
                                    <div className="font-bold text-slate-900 truncate flex items-center gap-1">
                                      <span>{item.matchedPelerin.fullName || item.matchedPelerin.nom}</span>
                                      {item.isManualLink && (
                                        <span className="text-[9px] bg-purple-100 text-purple-800 font-bold px-1 rounded">Manuel</span>
                                      )}
                                    </div>
                                    <div className="text-[10px] text-slate-500 truncate">
                                      {item.matchedPelerin.groupeNom || 'Dossier individuel'} &bull; Pass: {item.matchedPelerin.passport || item.matchedPelerin.num_passeport || '—'}
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-1 shrink-0">
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon-xs"
                                      onClick={() => {
                                        setLinkingItemId(item.id);
                                        setCrmSearchQuery(item.nom || '');
                                      }}
                                      title="Changer de pèlerin"
                                      className="text-slate-400 hover:text-blue-600"
                                    >
                                      <Link2 size={13} />
                                    </Button>
                                    {item.isManualLink && (
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon-xs"
                                        onClick={() => handleRemoveManualLink(item.id)}
                                        title="Dissocier"
                                        className="text-slate-400 hover:text-red-600"
                                      >
                                        <Unlink size={13} />
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1.5">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setLinkingItemId(item.id);
                                      setCrmSearchQuery(item.nom || '');
                                    }}
                                    className="h-7 text-[11px] gap-1 text-amber-800 border-amber-300 bg-amber-50/50 hover:bg-amber-100"
                                  >
                                    <Link2 size={12} />
                                    Lier au CRM...
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon-xs"
                                    onClick={() => handleIgnoreItem(item.id)}
                                    title="Supprimer / Ne pas créer ce pèlerin"
                                    className="text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                                  >
                                    <Trash2 size={13} />
                                  </Button>
                                </div>
                              )}
                            </td>

                            {/* Statut Badge */}
                            <td className="py-2.5 px-3 text-center">
                              {item.status === 'identical' && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                  <CheckCheck size={11} /> À jour
                                </span>
                              )}
                              {item.status === 'update' && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                                  <Sparkles size={11} /> Update
                                </span>
                              )}
                              {item.status === 'unmatched' && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                  Non lié
                                </span>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Rapport post-importation */}
              {importReport && (
                <div className={`p-4 rounded-xl border space-y-1.5 ${
                  importReport.errorsCount > 0 && importReport.updatedCount === 0 && importReport.createdCount === 0
                    ? 'bg-red-50 border-red-200 text-red-800'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                }`}>
                  <div className="font-bold flex items-center gap-2 text-sm">
                    {importReport.errorsCount > 0 && importReport.updatedCount === 0 && importReport.createdCount === 0 ? (
                      <>
                        <AlertTriangle size={18} className="text-red-600 shrink-0" />
                        <span>Des erreurs ont empêché la mise à jour</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
                        <span>Mise à jour enregistrée avec succès dans le CRM !</span>
                      </>
                    )}
                  </div>
                  <div className="text-xs space-y-1">
                    {importReport.updatedCount > 0 && (
                      <div>&bull; <b>{importReport.updatedCount}</b> pèlerin(s) mis à jour dans leurs dossiers respectifs.</div>
                    )}
                    {importReport.createdCount > 0 && (
                      <div>&bull; <b>{importReport.createdCount}</b> nouvelle(s) fiche(s) pèlerin créée(s).</div>
                    )}
                    {importReport.errorsCount > 0 && (
                      <div className="text-red-700 mt-2 font-medium">
                        &bull; <b>{importReport.errorsCount}</b> dossier(s) non mis à jour :
                        <ul className="list-disc list-inside mt-1 space-y-0.5 text-[11px] text-red-600">
                          {importReport.errorDetails?.slice(0, 5).map((err, idx) => (
                            <li key={idx}>{err}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Barre de progression pendant l'enregistrement */}
              {importing && (
                <div className="space-y-1.5 p-3 rounded-xl bg-amber-50 border border-amber-200">
                  <div className="flex justify-between text-xs font-bold text-amber-800">
                    <span>Mise à jour en cours...</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="w-full h-2 bg-amber-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-amber-600 transition-all duration-150 rounded-full"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500">
            {file && (
              <span>
                <b>{stats.update}</b> mises à jour prêtes
                {createNewPilgrims && stats.unmatched > 0 && ` + ${stats.unmatched} à créer`}.
                {stats.identical > 0 && ` (${stats.identical} déjà à jour)`}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={importing}
              className="h-9 px-4"
            >
              Fermer
            </Button>
            {file && (
              <Button
                size="sm"
                onClick={handleExecuteImport}
                disabled={importing || (stats.update === 0 && (!createNewPilgrims || stats.unmatched === 0))}
                className="h-9 px-5 bg-amber-600 hover:bg-amber-700 text-white font-bold shadow-sm gap-2"
              >
                {importing ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    Traitement ({progress}%)...
                  </>
                ) : (
                  <>
                    <Database size={15} />
                    {stats.identical === stats.total ? (
                      "Tout est déjà à jour"
                    ) : (
                      `Enregistrer les Modifications (${stats.update + (createNewPilgrims ? stats.unmatched : 0)})`
                    )}
                  </>
                )}
              </Button>
            )}
          </div>
        </div>

      </div>

      {/* ── Sous-Modal de Liaison Manuelle avec un Pèlerin du CRM ── */}
      {linkingItemId && (
        <div className="fixed inset-0 z-60 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-100 flex flex-col max-h-[80vh]">
            <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Link2 size={18} className="text-amber-600" />
                <h3 className="font-bold text-sm text-slate-900">
                  Lier à un pèlerin existant du CRM
                </h3>
              </div>
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => setLinkingItemId(null)}
                className="rounded-full"
              >
                <X size={16} />
              </Button>
            </div>

            <div className="p-4 space-y-3 flex-1 overflow-hidden flex flex-col">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input 
                  autoFocus
                  value={crmSearchQuery}
                  onChange={e => setCrmSearchQuery(e.target.value)}
                  placeholder="Rechercher par nom, prénom ou passeport..."
                  className="h-9 pl-8.5 text-xs bg-slate-50"
                />
              </div>

              <div className="flex-1 overflow-y-auto space-y-1.5 custom-scrollbar border border-slate-100 rounded-xl p-1 bg-slate-50/50">
                {linkableCrmPelerins.length === 0 ? (
                  <div className="p-6 text-center text-slate-400 text-xs">
                    Aucun pèlerin trouvé dans le CRM pour "{crmSearchQuery}".
                  </div>
                ) : (
                  linkableCrmPelerins.map(crmP => {
                    const pId = crmP.pelerin_id || crmP.id;
                    return (
                      <div
                        key={pId}
                        onClick={() => handleAssignManualLink(linkingItemId, pId)}
                        className="p-2.5 rounded-lg bg-white hover:bg-amber-50/80 border border-slate-200 hover:border-amber-300 cursor-pointer transition-all flex items-center justify-between group"
                      >
                        <div className="min-w-0">
                          <div className="font-bold text-xs text-slate-900 group-hover:text-amber-900 truncate">
                            {crmP.fullName || `${crmP.nom} ${crmP.prenom || ''}`}
                          </div>
                          <div className="text-[11px] text-slate-500 flex items-center gap-2">
                            <span className="font-mono">Pass: {crmP.passport || crmP.num_passeport || '—'}</span>
                            &bull;
                            <span>{crmP.groupeNom || 'Individuel'}</span>
                          </div>
                        </div>
                        <Button 
                          size="xs" 
                          className="h-7 text-[11px] bg-slate-100 hover:bg-amber-600 text-slate-700 hover:text-white shrink-0"
                        >
                          Lier ce dossier
                        </Button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setLinkingItemId(null)}
                className="h-8 text-xs"
              >
                Annuler
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
