/**
 * Helper & Définitions pour la répartition des chambres par hôtel
 * et le calcul des lits vides (avec indication du genre Homme/Femme)
 */

export const CHAMBRE_CAPACITY = {
  'CH5': 5,
  'CH4': 4,
  'CH3': 3,
  'CH2': 2,
  'Single': 1
};

export const CHAMBRE_LABELS = {
  'CH5': 'Quintuple',
  'CH4': 'Quadruple',
  'CH3': 'Triple',
  'CH2': 'Double',
  'Single': 'Single'
};

export const CHAMBRE_KEYS = {
  'CH5': 'ch5',
  'CH4': 'ch4',
  'CH3': 'ch3',
  'CH2': 'ch2',
  'Single': 'single'
};

/**
 * Détermine la capacité d'une chambre à partir de son type
 */
export const getChambreCapacity = (typeChambre) => {
  if (!typeChambre) return 4;
  const key = String(typeChambre).trim();
  if (CHAMBRE_CAPACITY[key] !== undefined) return CHAMBRE_CAPACITY[key];
  
  const upper = key.toUpperCase();
  if (upper === 'CH5' || upper === 'QUINTUPLE') return 5;
  if (upper === 'CH4' || upper === 'QUADRUPLE') return 4;
  if (upper === 'CH3' || upper === 'TRIPLE') return 3;
  if (upper === 'CH2' || upper === 'DOUBLE') return 2;
  if (upper === 'SINGLE' || upper === 'INDIVIDUELLE' || upper === 'CH1') return 1;
  
  const match = upper.match(/(\d+)/);
  if (match) return parseInt(match[1], 10);
  return 4;
};

/**
 * Vérification du sexe
 */
export const isFemme = (sexe) => {
  if (!sexe) return false;
  const s = String(sexe).trim().toUpperCase();
  return s === 'F' || s === 'FEMME' || s === 'WOMAN';
};

export const isHomme = (sexe) => {
  if (!sexe) return true;
  const s = String(sexe).trim().toUpperCase();
  return s === 'H' || s === 'M' || s === 'HOMME' || s === 'MAN';
};

/**
 * Retrouve le nom lisible de l'hôtel
 */
export const resolveHotelName = (hId, hotelsMaster = [], groupHotels = []) => {
  if (!hId) return 'Hôtel non défini';
  
  const foundInMaster = (hotelsMaster || []).find(h => 
    h.id === hId || 
    h.nom === hId || 
    (typeof hId === 'string' && (h.id?.toString() === hId.toString() || hId.startsWith(h.nom) || h.nom?.startsWith(hId)))
  );
  if (foundInMaster?.nom) return foundInMaster.nom;

  const foundInGroup = (groupHotels || []).find(gh => gh.hotelId === hId || gh.id === hId);
  if (foundInGroup) {
    const matchMaster = (hotelsMaster || []).find(h => h.id === foundInGroup.hotelId || h.nom === foundInGroup.hotelId);
    if (matchMaster?.nom) return matchMaster.nom;
    if (foundInGroup.nom) return foundInGroup.nom;
    if (foundInGroup.hotelNom) return foundInGroup.hotelNom;
    if (foundInGroup.location) return foundInGroup.location.replace(/undefined\s*étoiles/gi, '').trim();
  }

  return typeof hId === 'string' ? hId.replace(/undefined\s*étoiles/gi, '').trim() : 'Hôtel';
};

/**
 * Construit la liste des chambres physiques avec leurs occupants
 * et applique la règle d'attribution du genre pour les lits vides :
 * - Chambre 100% Femmes -> lits vides indiqués Femmes (F)
 * - Chambre 100% Hommes -> lits vides indiqués Hommes (H)
 * - Chambre Mixte (couple/famille) -> lits vides Mixtes
 * - Chambre vide (0 occupants) -> lits vides Libres
 */
export const buildChambresPhysiques = (enregistrements = [], roomCapacityOverrides = {}) => {
  const chambresPhysiques = {};

  (enregistrements || []).forEach(enr => {
    const hotelId = enr.hotelId || enr.hotel_id;
    const typeChambre = enr.typeChambre || enr.type_chambre || 'CH4';
    const baseRoomId = enr.chambreId || enr.chambre_id || enr.id;

    if (baseRoomId && !chambresPhysiques[baseRoomId]) {
      chambresPhysiques[baseRoomId] = {
        chambreId: baseRoomId,
        hotelId,
        typeChambre,
        occupants: [],
        enregistrements: [enr]
      };
    } else if (baseRoomId && chambresPhysiques[baseRoomId]) {
      if (!chambresPhysiques[baseRoomId].enregistrements.find(e => (e.id || e.id) === enr.id)) {
        chambresPhysiques[baseRoomId].enregistrements.push(enr);
      }
    }

    const pelerins = enr.pelerins || [];
    pelerins.forEach((p, idx) => {
      const cId = p.chambreId || baseRoomId;
      if (!chambresPhysiques[cId]) {
        chambresPhysiques[cId] = {
          chambreId: cId,
          hotelId,
          typeChambre,
          occupants: [],
          enregistrements: []
        };
      }
      if (!chambresPhysiques[cId].enregistrements.find(e => e.id === enr.id)) {
        chambresPhysiques[cId].enregistrements.push(enr);
      }
      chambresPhysiques[cId].occupants.push({
        ...p,
        isEnfantSansLit: false,
        sourceEnrId: enr.id,
        pelerinIdx: idx
      });
    });

    const enfants = enr.enfantsSansLit || enr.enfants_sans_lit || [];
    enfants.forEach((enf, idx) => {
      const cId = enf.chambreId || baseRoomId;
      if (!chambresPhysiques[cId]) {
        chambresPhysiques[cId] = {
          chambreId: cId,
          hotelId,
          typeChambre,
          occupants: [],
          enregistrements: []
        };
      }
      if (!chambresPhysiques[cId].enregistrements.find(e => e.id === enr.id)) {
        chambresPhysiques[cId].enregistrements.push(enr);
      }
      chambresPhysiques[cId].occupants.push({
        ...enf,
        isEnfantSansLit: true,
        sourceEnrId: enr.id,
        enfantIdx: idx
      });
    });
  });

  return Object.values(chambresPhysiques).map(chambre => {
    const defaultCapacity = getChambreCapacity(chambre.typeChambre);
    const capacity = roomCapacityOverrides[chambre.chambreId] ?? defaultCapacity;
    const occupantsForBed = (chambre.occupants || []).filter(o => !o.isEnfantSansLit);
    const femmes = occupantsForBed.filter(o => isFemme(o.sexe)).length;
    const hommes = occupantsForBed.filter(o => !isFemme(o.sexe)).length;
    const litsOccupes = occupantsForBed.length;
    const litsVides = Math.max(0, capacity - litsOccupes);

    // Règle d'indication demandée :
    // Chambre que femmes -> lits vides indiqués femmes
    // Chambre que hommes -> lits vides indiqués hommes
    let litsVidesType = 'LIBRE'; // 'F' | 'H' | 'MIXTE' | 'LIBRE'
    if (litsVides > 0) {
      if (femmes > 0 && hommes === 0) {
        litsVidesType = 'F';
      } else if (hommes > 0 && femmes === 0) {
        litsVidesType = 'H';
      } else if (femmes > 0 && hommes > 0) {
        litsVidesType = 'MIXTE';
      } else {
        litsVidesType = 'LIBRE';
      }
    }

    return {
      ...chambre,
      capacity,
      occupantsForBed,
      femmes,
      hommes,
      litsOccupes,
      litsVides,
      litsVidesType
    };
  });
};

/**
 * Calcule les statistiques globales et par hôtel pour un groupe
 */
export const computeGroupRoomStats = (chambresList = [], groupHotels = [], hotelsMaster = []) => {
  let totalChambres = chambresList.length;
  let totalLits = 0;
  let totalLitsOccupes = 0;
  let totalLitsVides = 0;
  let litsVidesFemmes = 0;
  let litsVidesHommes = 0;
  let litsVidesMixte = 0;
  let litsVidesLibres = 0;

  const repartitionTypes = {
    'CH5': 0,
    'CH4': 0,
    'CH3': 0,
    'CH2': 0,
    'Single': 0,
    'Autre': 0
  };

  const hotelRoomsMap = {};

  chambresList.forEach(ch => {
    totalLits += ch.capacity;
    totalLitsOccupes += ch.litsOccupes;
    totalLitsVides += ch.litsVides;

    if (ch.litsVidesType === 'F') {
      litsVidesFemmes += ch.litsVides;
    } else if (ch.litsVidesType === 'H') {
      litsVidesHommes += ch.litsVides;
    } else if (ch.litsVidesType === 'MIXTE') {
      litsVidesMixte += ch.litsVides;
    } else if (ch.litsVidesType === 'LIBRE') {
      litsVidesLibres += ch.litsVides;
    }

    const t = ch.typeChambre || 'CH4';
    if (repartitionTypes[t] !== undefined) {
      repartitionTypes[t]++;
    } else {
      repartitionTypes['Autre']++;
    }

    const hId = ch.hotelId || 'default';
    if (!hotelRoomsMap[hId]) {
      hotelRoomsMap[hId] = [];
    }
    hotelRoomsMap[hId].push(ch);
  });

  // Assurer que tous les hôtels configurés dans le groupe sont représentés
  (groupHotels || []).forEach(gh => {
    const hId = gh.hotelId || gh.id;
    if (hId && !hotelRoomsMap[hId]) {
      hotelRoomsMap[hId] = [];
    }
  });

  const hotelsStats = Object.keys(hotelRoomsMap).map(hId => {
    const rooms = hotelRoomsMap[hId];
    const hotelNom = resolveHotelName(hId, hotelsMaster, groupHotels);
    
    let hLits = 0;
    let hOccupes = 0;
    let hVides = 0;
    let hVidesF = 0;
    let hVidesH = 0;
    let hVidesMixte = 0;
    let hVidesLibre = 0;
    const hTypes = {};

    rooms.forEach(r => {
      hLits += r.capacity;
      hOccupes += r.litsOccupes;
      hVides += r.litsVides;
      if (r.litsVidesType === 'F') hVidesF += r.litsVides;
      else if (r.litsVidesType === 'H') hVidesH += r.litsVides;
      else if (r.litsVidesType === 'MIXTE') hVidesMixte += r.litsVides;
      else if (r.litsVidesType === 'LIBRE') hVidesLibre += r.litsVides;

      const rt = r.typeChambre || 'CH4';
      hTypes[rt] = (hTypes[rt] || 0) + 1;
    });

    const typeTokens = [];
    ['CH4', 'CH3', 'CH2', 'CH5', 'Single'].forEach(tk => {
      if (hTypes[tk]) {
        const shortLabel = tk === 'CH4' ? 'Quad' : tk === 'CH3' ? 'Trp' : tk === 'CH2' ? 'Dbl' : tk === 'CH5' ? 'Qnt' : tk;
        typeTokens.push(`${hTypes[tk]} ${shortLabel}`);
      }
    });
    Object.keys(hTypes).forEach(k => {
      if (!['CH4', 'CH3', 'CH2', 'CH5', 'Single'].includes(k)) {
        typeTokens.push(`${hTypes[k]} ${k}`);
      }
    });

    return {
      hotelId: hId,
      hotelNom,
      totalChambres: rooms.length,
      types: hTypes,
      typesSummary: typeTokens.join(', '),
      totalLits: hLits,
      litsOccupes: hOccupes,
      totalLitsVides: hVides,
      litsVidesFemmes: hVidesF,
      litsVidesHommes: hVidesH,
      litsVidesMixte: hVidesMixte,
      litsVidesLibres: hVidesLibre,
      chambres: rooms
    };
  });

  return {
    totalChambres,
    totalLits,
    totalLitsOccupes,
    totalLitsVides,
    litsVidesFemmes,
    litsVidesHommes,
    litsVidesMixte,
    litsVidesLibres,
    repartitionTypes,
    hotelsStats
  };
};
