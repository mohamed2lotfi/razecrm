import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  Plus, Trash2, Search, Loader2, Pencil, Sparkles, Plane, Building2, 
  FileText, Bus, Compass, Shield, Coins, TrendingUp, CheckCircle2, User, 
  Calendar, Layers, Tag, DollarSign, Calculator, ChevronDown, HelpCircle, 
  Package, ArrowUpRight, Check, X, CreditCard, ShieldCheck, Users, ArrowRight, Globe, MapPin,
  Clock, FileCheck, RefreshCw, AlertCircle, BookmarkCheck
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import ClientForm from './ClientForm';
import DestinationSelect from '@/components/DestinationSelect';
import CountryFlag from '@/components/CountryFlag';
import { format } from 'date-fns';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

// Helper to assign a fitting emoji based on service name
export const getServiceEmoji = (name = '') => {
  const lower = name.toLowerCase();
  if (lower.includes('billet') || lower.includes('vol') || lower.includes('avion') || lower.includes('air') || lower.includes('ticket')) return '✈️';
  if (lower.includes('hotel') || lower.includes('hôtel') || lower.includes('heberg') || lower.includes('chambre') || lower.includes('nuit')) return '🏨';
  if (lower.includes('visa') || lower.includes('formalit') || lower.includes('consul') || lower.includes('evisa')) return '📑';
  if (lower.includes('transfert') || lower.includes('transport') || lower.includes('bus') || lower.includes('vtc') || lower.includes('navette')) return '🚐';
  if (lower.includes('excursion') || lower.includes('activit') || lower.includes('visite') || lower.includes('circuit') || lower.includes('guide') || lower.includes('safari')) return '🏖️';
  if (lower.includes('assurance')) return '🛡️';
  if (lower.includes('omra') || lower.includes('hajj') || lower.includes('pelerin')) return '🕋';
  if (lower.includes('package') || lower.includes('sejour') || lower.includes('séjour') || lower.includes('voyage')) return '📦';
  if (lower.includes('croisi') || lower.includes('bateau') || lower.includes('ferry')) return '🚢';
  if (lower.includes('train')) return '🚆';
  if (lower.includes('location') || lower.includes('voiture') || lower.includes('auto')) return '🚗';
  return '🏷️';
};

const createEmptyArticle = (categorie = 'Billeterie', defaultDest = '') => ({
  id: 'art_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
  categorie,
  service_id: '',
  destination: defaultDest,
  designation: '',
  prix_achat: '',
  commission: '',
  prix_vente: '',
  fournisseur_id: '',
  visa_country_id: '',
  visa_type_id: '',
  visa_dossier: [],
  airline_id: '',
  compagnie_nom: '',
  numero_billet: '',
  pnr: '',
  itineraire: '',
  notes: ''
});

const VenteForm = ({ onClose, onSave, initialData }) => {
  const [clients, setClients] = useState([]);
  const [servicesList, setServicesList] = useState([]);
  const [fournisseursList, setFournisseursList] = useState([]);
  const [destinationsList, setDestinationsList] = useState([]);
  const [loadingData, setLoadingData] = useState(true);

  // Visa catalogue data
  const [visaCountries, setVisaCountries] = useState([]);
  const [visaTypes, setVisaTypes] = useState([]);

  // Airlines data
  const [airlines, setAirlines] = useState([]);

  // Fournisseur Quick Add state
  const [isAddingFournisseur, setIsAddingFournisseur] = useState(false);
  const [newFournisseurNom, setNewFournisseurNom] = useState('');
  const [targetArticleIdxForFournisseur, setTargetArticleIdxForFournisseur] = useState(null);
  const [savingFournisseur, setSavingFournisseur] = useState(false);

  // Form Global Fields
  const [dateVente, setDateVente] = useState(() => {
    if (initialData?.date_vente) {
      try { return format(new Date(initialData.date_vente), 'yyyy-MM-dd'); } catch {}
    }
    return format(new Date(), 'yyyy-MM-dd');
  });
  const [clientId, setClientId] = useState(initialData?.client_id || '');
  const [destination, setDestination] = useState(() => {
    if (initialData?.destination) return initialData.destination;
    if (initialData?.articles && Array.isArray(initialData.articles) && initialData.articles[0]?.destination) {
      return initialData.articles[0].destination;
    }
    if (initialData?.details) {
      const match = initialData.details.match(/\[(?:🌍|Destination:?)\s*([^\]]+)\]/i);
      if (match) return match[1].trim();
    }
    return '';
  });
  const [etat, setEtat] = useState(initialData?.etat || 'Payé');
  const [observations, setObservations] = useState('');

  // Passagers list (Determines PAX Count)
  const [personnes, setPersonnes] = useState(() => {
    // 1. Check direct passagers array on initialData
    if (initialData?.passagers && Array.isArray(initialData.passagers) && initialData.passagers.length > 0) {
      return initialData.passagers.map(p => ({ nom: p.nom || '', passport: p.passport || '' }));
    }
    // 2. Check if any article has stored passagers in JSONB / details_specifiques
    const rawArticlesList = initialData?.vente_articles || initialData?.articles;
    if (rawArticlesList && Array.isArray(rawArticlesList) && rawArticlesList.length > 0) {
      const artWithPax = rawArticlesList.find(a => 
        (Array.isArray(a.passagers) && a.passagers.length > 0) ||
        (Array.isArray(a.details_specifiques?.passagers) && a.details_specifiques.passagers.length > 0)
      );
      if (artWithPax) {
        const pList = (Array.isArray(artWithPax.passagers) && artWithPax.passagers.length > 0)
          ? artWithPax.passagers
          : artWithPax.details_specifiques.passagers;
        return pList.map(p => ({ nom: p.nom || '', passport: p.passport || '' }));
      }
    }
    // 3. Check _visaMeta
    if (initialData?._visaMeta?.passagers && Array.isArray(initialData._visaMeta.passagers) && initialData._visaMeta.passagers.length > 0) {
      return initialData._visaMeta.passagers.map(p => ({ nom: p.nom || '', passport: p.passport || '' }));
    }
    // 4. Fallback: Parse from details string (e.g. "(2 Pax: Mohamed [A123], Fatima [B456])" or "(2 Pax: Mohamed, Fatima)")
    if (initialData?.details) {
      const paxMatch = initialData.details.match(/\(\d+\s*Pax(?::\s*([^)]+))?\)/i);
      if (paxMatch && paxMatch[1]) {
        const rawPaxString = paxMatch[1].trim();
        const extracted = rawPaxString.split(',').map(item => {
          const trimmed = item.trim();
          const pMatch = trimmed.match(/^([^\[]+)(?:\[(.*?)\])?$/);
          if (pMatch) {
            return { nom: pMatch[1].trim(), passport: (pMatch[2] || '').trim() };
          }
          return { nom: trimmed, passport: '' };
        }).filter(p => p.nom.length > 0);
        if (extracted.length > 0) return extracted;
      }
    }
    return [];
  });

  // Effective PAX count: at least 1 (the main client) or the number of added passengers
  const paxCount = Math.max(1, personnes.length);

  // Multi-Articles Array
  const [articles, setArticles] = useState(() => {
    const rawList = (initialData?.vente_articles && Array.isArray(initialData.vente_articles) && initialData.vente_articles.length > 0)
      ? initialData.vente_articles
      : (initialData?.articles && Array.isArray(initialData.articles) && initialData.articles.length > 0)
        ? initialData.articles
        : null;

    if (rawList) {
      return rawList.map(a => {
        const pa = a.prix_achat !== undefined && a.prix_achat !== null ? a.prix_achat : (a.tarif_base || '');
        const pv = a.prix_vente !== undefined && a.prix_vente !== null ? a.prix_vente : (a.total || '');
        let comm = a.commission !== undefined && a.commission !== null ? a.commission : '';
        if (comm === '' && pa !== '' && pv !== '') {
          comm = (parseFloat(pv) || 0) - (parseFloat(pa) || 0);
        }

        const paxList = (Array.isArray(a.passagers) && a.passagers.length > 0)
          ? a.passagers
          : (Array.isArray(a.details_specifiques?.passagers) && a.details_specifiques.passagers.length > 0)
            ? a.details_specifiques.passagers
            : [];

        return {
          id: a.id || 'art_' + Math.random().toString(36).substring(2, 7),
          categorie: a.categorie || a.services?.nom || a.service?.nom || 'Billeterie',
          service_id: a.service_id || '',
          destination: a.destination || initialData?.destination || '',
          designation: a.designation || a.description || a.details || '',
          prix_achat: pa,
          commission: comm,
          prix_vente: pv,
          fournisseur_id: a.fournisseur_id || '',
          visa_country_id: a.visa_country_id || a.country_id || initialData?._visaMeta?.country_id || '',
          visa_type_id: a.visa_type_id || initialData?._visaMeta?.visa_type_id || '',
          visa_dossier: a.visa_dossier || initialData?._visaMeta?.dossier || [],
          airline_id: a.airline_id || '',
          compagnie_nom: a.compagnie_nom || a.airlines?.nom || '',
          numero_billet: a.numero_billet || '',
          pnr: a.pnr || '',
          itineraire: a.itineraire || '',
          passagers: paxList,
          details_specifiques: a.details_specifiques || {},
          notes: a.notes || ''
        };
      });
    }
    return [createEmptyArticle('Billeterie', initialData?.destination || '')];
  });

  // Autocomplete client state
  const [clientSearch, setClientSearch] = useState(initialData?.client_nom || '');
  const [showDropdown, setShowDropdown] = useState(false);
  const [isAddingClient, setIsAddingClient] = useState(false);
  const wrapperRef = useRef(null);

  useEffect(() => {
    fetchFormData();
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setShowDropdown(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchFormData = async () => {
    setLoadingData(true);
    const [cRes, sRes, fRes, dRes, vcRes, vtRes, aRes] = await Promise.all([
      supabase.from('clients').select('*').order('created_at', { ascending: false }),
      supabase.from('services').select('*').order('created_at'),
      supabase.from('fournisseurs').select('*').order('nom'),
      supabase.from('destinations').select('*').order('nom', { ascending: true }),
      supabase.from('visa_countries').select('*').order('nom'),
      supabase.from('visa_types').select('*').order('nom'),
      supabase.from('airlines').select('*').order('nom')
    ]);
    if (cRes.data) setClients(cRes.data);
    if (sRes.data) setServicesList(sRes.data);
    if (fRes.data) setFournisseursList(fRes.data);
    if (dRes.data) setDestinationsList(dRes.data);
    if (vcRes.data) setVisaCountries(vcRes.data);
    if (vtRes.data) setVisaTypes(vtRes.data);
    if (aRes.data) setAirlines(aRes.data);

    // If editing existing sale, check if vente_articles or visa_demandes has registered passagers
    if (initialData?.id) {
      try {
        const [vaRes, vdRes] = await Promise.all([
          supabase.from('vente_articles').select('details_specifiques').eq('vente_id', initialData.id),
          supabase.from('visa_demandes').select('passager_nom').eq('vente_id', initialData.id)
        ]);

        let loadedPax = [];
        if (vaRes.data && vaRes.data.length > 0) {
          const artWithPax = vaRes.data.find(a => 
            Array.isArray(a.details_specifiques?.passagers) && a.details_specifiques.passagers.length > 0
          );
          if (artWithPax) {
            loadedPax = artWithPax.details_specifiques.passagers;
          }
        }

        if (loadedPax.length === 0 && vdRes.data && vdRes.data.length > 0) {
          loadedPax = vdRes.data.map(vd => ({ nom: vd.passager_nom || '', passport: '' }));
        }

        if (loadedPax.length > 0) {
          setPersonnes(prev => {
            if (prev.length === 0) {
              return loadedPax.map(p => ({ nom: p.nom || '', passport: p.passport || '' }));
            }
            return prev;
          });
        }
      } catch (err) {
        console.error("Error loading passagers from DB:", err);
      }
    }

    setLoadingData(false);
  };

  // ── DYNAMIC CATEGORIES DIRECT FROM MASTER DATA (SERVICES TABLE) ─────
  const availableCategories = useMemo(() => {
    const masterServices = (servicesList || []).map(s => ({
      id: s.id,
      nom: s.nom,
      label: `${getServiceEmoji(s.nom)} ${s.nom}`,
      emoji: getServiceEmoji(s.nom),
      isMasterData: true
    }));

    const defaultCategories = [
      { id: 'cat_billet', nom: 'Billeterie', emoji: '✈️' },
      { id: 'cat_hotel', nom: 'Hôtel', emoji: '🏨' },
      { id: 'cat_visa', nom: 'Visa', emoji: '📑' },
      { id: 'cat_transfert', nom: 'Transfert', emoji: '🚐' },
      { id: 'cat_excursion', nom: 'Excursion', emoji: '🏖️' },
      { id: 'cat_assurance', nom: 'Assurance Voyage', emoji: '🛡️' },
      { id: 'cat_omra', nom: 'Omra', emoji: '🕋' },
      { id: 'cat_package', nom: 'Séjour / Package', emoji: '📦' }
    ];

    if (masterServices.length === 0) {
      return defaultCategories.map(d => ({ ...d, label: `${d.emoji} ${d.nom}` }));
    }

    const combined = [...masterServices];
    const hasAutre = combined.some(s => s.nom.toLowerCase().includes('autre'));
    if (!hasAutre) {
      combined.push({ id: 'cat_autre', nom: 'Autre Prestation', label: '⚙️ Autre Prestation', emoji: '⚙️' });
    }

    return combined;
  }, [servicesList]);

  // Adjust first article's category if initial was default and Master Data services loaded
  useEffect(() => {
    if (servicesList.length > 0 && (!initialData || !initialData.articles)) {
      setArticles(prev => {
        if (prev.length === 1 && (!prev[0].designation || prev[0].designation === '') && prev[0].categorie === 'Billeterie') {
          const firstService = servicesList[0];
          return [{
            ...prev[0],
            categorie: firstService.nom,
            service_id: firstService.id
          }];
        }
        return prev;
      });
    }
  }, [servicesList]);

  const selectedClient = clients.find(c => c.id === clientId);

  const handleSelectClient = (client) => {
    setClientSearch(client.nom);
    setClientId(client.id);
    setShowDropdown(false);

    setPersonnes(prev => {
      if (prev.length === 1) {
        return [{ nom: client.nom, passport: client.passport || prev[0].passport || '' }];
      }
      return prev;
    });
  };

  const handleSaveNewClient = async (newClientData) => {
    const { data, error } = await supabase.from('clients').insert([newClientData]).select();
    if (!error && data && data[0]) {
      const inserted = data[0];
      setClients(prev => [inserted, ...prev]);
      setClientSearch(inserted.nom);
      setClientId(inserted.id);
      setIsAddingClient(false);
      setPersonnes(prev => {
        if (prev.length === 1) {
          return [{ nom: inserted.nom, passport: inserted.passport || prev[0].passport || '' }];
        }
        return prev;
      });
    }
  };

  // ── QUICK ADD FOURNISSEUR ──────────────────────────────────────────
  const handleOpenAddFournisseur = (articleIdx) => {
    setTargetArticleIdxForFournisseur(articleIdx);
    setNewFournisseurNom('');
    setIsAddingFournisseur(true);
  };

  const handleSaveQuickFournisseur = async (e) => {
    if (e) e.preventDefault();
    if (!newFournisseurNom.trim()) return;
    setSavingFournisseur(true);
    const { data, error } = await supabase.from('fournisseurs').insert([{ nom: newFournisseurNom.trim() }]).select();
    if (!error && data && data[0]) {
      const newF = data[0];
      setFournisseursList(prev => [...prev, newF].sort((a, b) => a.nom.localeCompare(b.nom)));
      if (targetArticleIdxForFournisseur !== null) {
        handleUpdateArticle(targetArticleIdxForFournisseur, 'fournisseur_id', newF.id);
      }
      setIsAddingFournisseur(false);
      setNewFournisseurNom('');
      setTargetArticleIdxForFournisseur(null);
    } else if (error) {
      alert("Erreur lors de la création du fournisseur : " + error.message);
    }
    setSavingFournisseur(false);
  };

  // ── ARTICLES MANAGEMENT & BIDIRECTIONAL PRICING ─────────────────────
  const handleAddArticle = (categoryName) => {
    const defaultCat = categoryName || (availableCategories[0]?.nom || 'Billeterie');
    const matchedService = servicesList.find(s => s.nom.toLowerCase() === defaultCat.toLowerCase());
    const newArt = {
      ...createEmptyArticle(defaultCat, destination),
      service_id: matchedService?.id || ''
    };
    setArticles(prev => [...prev, newArt]);
  };

  const handleRemoveArticle = (index) => {
    if (articles.length === 1) {
      const defaultCat = availableCategories[0]?.nom || 'Billeterie';
      const matchedService = servicesList.find(s => s.nom.toLowerCase() === defaultCat.toLowerCase());
      setArticles([{
        ...createEmptyArticle(defaultCat, destination),
        service_id: matchedService?.id || ''
      }]);
      return;
    }
    setArticles(prev => prev.filter((_, i) => i !== index));
  };

  // Bidirectional price & commission calculation
  const handleUpdateArticle = (index, field, value) => {
    setArticles(prev => {
      const updated = [...prev];
      const art = { ...updated[index] };

      if (field === 'categorie') {
        art.categorie = value;
        const matched = servicesList.find(s => s.nom.toLowerCase() === value.toLowerCase());
        art.service_id = matched?.id || '';
        
        // Auto-attempt matching country if switching to Visa
        if (value.toLowerCase().includes('visa') && !art.visa_country_id && (art.destination || destination)) {
          const currentDestName = (art.destination || destination).toLowerCase().trim();
          const matchCountry = visaCountries.find(c => 
            c.nom.toLowerCase().includes(currentDestName) || currentDestName.includes(c.nom.toLowerCase())
          );
          if (matchCountry) {
            art.visa_country_id = matchCountry.id;
          }
        }
      } else if (field === 'prix_achat') {
        art.prix_achat = value;
        const pa = parseFloat(value) || 0;
        const comm = parseFloat(art.commission);
        const pv = parseFloat(art.prix_vente);

        if (!isNaN(comm) && art.commission !== '') {
          art.prix_vente = (pa + comm) === 0 && value === '' ? '' : (pa + comm);
        } else if (!isNaN(pv) && art.prix_vente !== '') {
          art.commission = (pv - pa);
        }
      } else if (field === 'commission') {
        art.commission = value;
        const comm = parseFloat(value) || 0;
        const pa = parseFloat(art.prix_achat) || 0;
        art.prix_vente = value === '' ? (pa ? pa : '') : (pa + comm);
      } else if (field === 'prix_vente') {
        art.prix_vente = value;
        const pv = parseFloat(value) || 0;
        const pa = parseFloat(art.prix_achat) || 0;
        art.commission = value === '' ? '' : (pv - pa);
      } else {
        art[field] = value;
      }

      updated[index] = art;
      return updated;
    });
  };

  // ── VISA CATALOG 2-STEP SELECTION HELPERS ──────────────────────────
  // Step 1: User selects country
  const handleVisaCountryChange = (index, countryId) => {
    const selectedCountry = visaCountries.find(c => c.id === countryId);
    setArticles(prev => {
      const updated = [...prev];
      const art = { ...updated[index] };
      art.visa_country_id = countryId;
      art.visa_type_id = ''; // Reset visa type when country changes
      art.visa_dossier = [];
      if (selectedCountry) {
        art.destination = selectedCountry.nom;
        if (!destination) setDestination(selectedCountry.nom);
      }
      updated[index] = art;
      return updated;
    });
  };

  // Step 2: User selects specific Visa Type for that country
  const handleQuickVisaSelect = (index, visaTypeId) => {
    const vt = visaTypes.find(v => v.id === visaTypeId);
    if (vt) {
      const country = visaCountries.find(c => c.id === vt.country_id);
      const pa = parseFloat(vt.tarif_base) || 0;
      const pv = parseFloat(vt.tarif_vente) || 0;
      const comm = pv - pa;

      setArticles(prev => {
        const updated = [...prev];
        const art = { ...updated[index] };
        
        const countryLabel = country ? `${country.nom} - ` : '';
        art.designation = `Visa ${countryLabel}${vt.nom}`;
        art.prix_achat = pa || '';
        art.commission = comm || '';
        art.prix_vente = pv || '';
        art.visa_country_id = vt.country_id;
        art.visa_type_id = vt.id;
        art.visa_dossier = Array.isArray(vt.dossier) ? vt.dossier : [];
        if (country) {
          art.destination = country.nom;
          if (!destination) setDestination(country.nom);
        }
        if (vt.duree_traitement && !art.notes) {
          art.notes = `Délai traitement: ${vt.duree_traitement}`;
        }
        
        updated[index] = art;
        return updated;
      });
    }
  };

  const handleClearVisaCatalogue = (index) => {
    setArticles(prev => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        visa_country_id: '',
        visa_type_id: '',
        visa_dossier: []
      };
      return updated;
    });
  };

  // Airline quick link helper
  const handleQuickAirlineSelect = (index, airlineId) => {
    const al = airlines.find(a => a.id === airlineId);
    setArticles(prev => {
      const updated = [...prev];
      const current = { ...updated[index] };
      if (al) {
        current.airline_id = al.id;
        current.compagnie_nom = al.nom;
        if (!current.designation || current.designation.toLowerCase().includes('vol') || current.designation.toLowerCase().includes('billet') || current.designation === 'Prestation Billeterie') {
          current.designation = `Vol ${al.nom} (${al.code_iata})`;
        }
        if (al.commission && !current.commission) {
          current.commission = al.commission;
          if (current.prix_achat) {
            current.prix_vente = (parseFloat(current.prix_achat) || 0) + (parseFloat(al.commission) || 0);
          }
        }
      } else {
        current.airline_id = '';
        current.compagnie_nom = '';
      }
      updated[index] = current;
      return updated;
    });
  };

  // ── PASSAGERS (PAX) MANAGEMENT ────────────────────────────────────
  const handleAddPersonne = () => {
    setPersonnes(prev => {
      if (prev.length === 0) {
        const clientNom = selectedClient?.nom || clientSearch || 'Client principal';
        const clientPassport = selectedClient?.passport || '';
        return [
          { nom: clientNom, passport: clientPassport },
          { nom: '', passport: '' }
        ];
      }
      return [...prev, { nom: '', passport: '' }];
    });
  };

  const handleRemovePersonne = (idx) => {
    setPersonnes(prev => prev.filter((_, i) => i !== idx));
  };

  const handleUpdatePersonne = (idx, field, val) => {
    setPersonnes(prev => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], [field]: val };
      return updated;
    });
  };

  // ── FINANCIAL TOTALS CALCULATION (GLOBAL & PER PAX) ────────────────
  const financialTotals = useMemo(() => {
    let totalAchat = 0;
    let totalVente = 0;
    let totalCommission = 0;

    articles.forEach(art => {
      const pa = parseFloat(art.prix_achat) || 0;
      const pv = parseFloat(art.prix_vente) || 0;
      const comm = parseFloat(art.commission) || (pv - pa);

      totalAchat += pa;
      totalVente += pv;
      totalCommission += comm;
    });

    const marge = totalVente - totalAchat;
    const tauxMarge = totalVente > 0 ? Math.round((marge / totalVente) * 100) : 0;

    const achatPerPax = paxCount > 0 ? Math.round(totalAchat / paxCount) : totalAchat;
    const ventePerPax = paxCount > 0 ? Math.round(totalVente / paxCount) : totalVente;
    const commPerPax = paxCount > 0 ? Math.round(totalCommission / paxCount) : totalCommission;

    return { 
      totalAchat, 
      totalVente, 
      totalCommission, 
      marge, 
      tauxMarge,
      achatPerPax,
      ventePerPax,
      commPerPax
    };
  }, [articles, paxCount]);

  // ── SUBMIT HANDLER ────────────────────────────────────────────────
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!clientId) {
      alert("Veuillez sélectionner ou créer un client.");
      return;
    }

    const validArticles = articles.filter(a => a.designation.trim() !== '' || a.prix_vente !== '');
    if (validArticles.length === 0) {
      alert("Veuillez renseigner au moins un article avec une désignation ou un prix.");
      return;
    }

    const validPersonnes = personnes.filter(p => p.nom && p.nom.trim() !== '');
    const clientNomToSave = selectedClient?.nom || clientSearch || 'Client';
    const effectivePassagers = validPersonnes.length > 0 ? validPersonnes : [{ nom: clientNomToSave, passport: '' }];
    const effectivePaxCount = Math.max(1, validPersonnes.length > 0 ? validPersonnes.length : paxCount);

    const destPrefix = destination ? `[🌍 ${destination}] ` : '';
    const summaryDetails = validArticles.map(a => {
      const artDest = a.destination && a.destination !== destination ? ` (${a.destination})` : '';
      return `[${a.categorie}] ${a.designation || 'Prestation'}${artDest}`;
    }).join(' | ');

    const paxNamesList = validPersonnes.length > 0 
      ? validPersonnes.map(p => p.nom.trim() + (p.passport?.trim() ? ` [${p.passport.trim()}]` : '')).join(', ') 
      : '';
    const paxSummary = paxNamesList 
      ? ` (${effectivePaxCount} Pax: ${paxNamesList})` 
      : ` (${effectivePaxCount} Pax)`;

    const fullDetails = observations.trim() 
      ? `${destPrefix}${summaryDetails}${paxSummary} — Remarque: ${observations.trim()}` 
      : `${destPrefix}${summaryDetails}${paxSummary}`;

    const firstArticle = validArticles[0];
    const matchedService = servicesList.find(s => 
      s.id === firstArticle.service_id || s.nom.toLowerCase() === firstArticle.categorie.toLowerCase()
    );
    const primaryServiceId = matchedService?.id || (servicesList[0]?.id || null);
    const primaryFournisseurId = firstArticle.fournisseur_id || (fournisseursList[0]?.id || null);

    const cleanArticles = validArticles.map((a, idx) => {
      const pa = parseFloat(a.prix_achat) || 0;
      const pv = parseFloat(a.prix_vente) || 0;
      const comm = parseFloat(a.commission) || (pv - pa);
      const matched = servicesList.find(s => s.id === a.service_id || s.nom.toLowerCase() === (a.categorie || '').toLowerCase());
      const isDbId = a.id && !String(a.id).startsWith('art_');

      return {
        ...(isDbId ? { id: a.id } : {}),
        categorie: a.categorie || matched?.nom || 'Prestation',
        service_id: matched?.id || a.service_id || null,
        destination: a.destination || destination || '',
        designation: a.designation.trim() || 'Article',
        quantite: effectivePaxCount,
        pax_count: effectivePaxCount,
        passagers: effectivePassagers,
        details_specifiques: {
          ...(a.details_specifiques || {}),
          passagers: effectivePassagers
        },
        prix_achat: pa,
        prix_achat_unit: effectivePaxCount > 0 ? pa / effectivePaxCount : pa,
        commission: comm,
        commission_unit: effectivePaxCount > 0 ? comm / effectivePaxCount : comm,
        prix_vente: pv,
        prix_vente_unit: effectivePaxCount > 0 ? pv / effectivePaxCount : pv,
        total_achat: pa,
        total_vente: pv,
        fournisseur_id: a.fournisseur_id || null,
        visa_country_id: a.visa_country_id || null,
        visa_type_id: a.visa_type_id || null,
        visa_dossier: a.visa_dossier || [],
        airline_id: a.airline_id || null,
        compagnie_nom: a.compagnie_nom || null,
        numero_billet: a.numero_billet || null,
        pnr: a.pnr || null,
        itineraire: a.itineraire || null,
        ordre: idx + 1,
        notes: a.notes || ''
      };
    });

    const clientNomToSaveFinal = selectedClient?.nom || clientSearch || 'Client';

    // Find if any article is linked to a Visa Catalogue type to enrich _visaMeta
    const visaArticle = cleanArticles.find(a => a.visa_type_id && a.visa_country_id);
    const primaryVisaType = visaTypes.find(vt => vt.id === visaArticle?.visa_type_id);

    const saveData = {
      id: initialData?.id,
      date_vente: dateVente,
      client_id: clientId,
      client_nom: clientNomToSaveFinal,
      destination: destination,
      details: fullDetails,
      service_id: primaryServiceId,
      fournisseur_id: primaryFournisseurId,
      tarif_base: financialTotals.totalAchat,
      commission: financialTotals.marge,
      total: financialTotals.totalVente,
      etat: etat,
      vente_articles: cleanArticles,
      passagers: effectivePassagers,
      _visaMeta: {
        country_id: visaArticle?.visa_country_id || null,
        visa_type_id: visaArticle?.visa_type_id || null,
        tarif_base_unit: visaArticle ? (effectivePaxCount > 0 ? (parseFloat(visaArticle.prix_achat) || 0) / effectivePaxCount : parseFloat(visaArticle.prix_achat) || 0) : 0,
        tarif_vente_unit: visaArticle ? (effectivePaxCount > 0 ? (parseFloat(visaArticle.prix_vente) || 0) / effectivePaxCount : parseFloat(visaArticle.prix_vente) || 0) : 0,
        dossier: primaryVisaType?.dossier || visaArticle?.visa_dossier || [],
        passagers: effectivePassagers
      }
    };

    onSave(saveData);
  };

  const filteredClients = clients.filter(c => c.nom.toLowerCase().includes(clientSearch.toLowerCase()));

  // Popular visa countries for quick 1-click selection
  const popularVisaCountryCodes = ['sa', 'tr', 'ae', 'eg', 'eu', 'gb', 'us', 'qa', 'my', 'tn', 'ma'];

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-[1060px] p-0 overflow-hidden rounded-[28px] border border-border/80 shadow-2xl bg-card" onClose={onClose}>
        
        {/* ── Outer Shell & Header ────────────────────────────────────────── */}
        <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 text-white px-7 py-5 border-b border-white/10 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-32 bg-primary/20 rounded-full blur-3xl pointer-events-none -mr-16 -mt-16" />
          
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase tracking-[0.2em] font-extrabold text-primary px-2.5 py-0.5 rounded-full bg-primary/10 border border-primary/20 shadow-2xs">
                  {initialData ? 'Édition Vente' : 'Transaction Commerciale'}
                </span>
                <span className="text-[11px] font-bold text-slate-400">
                  Tous Services & Prestations
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-white/10 text-white flex items-center justify-center font-black text-sm shadow-inner border border-white/15">
                  {initialData ? <Pencil size={15} /> : <Plus size={16} />}
                </div>
                <span>{initialData ? 'Modifier la Vente' : 'Nouvelle Vente (Multi-Articles)'}</span>
              </h2>
            </div>

            {/* KPI Badges */}
            <div className="flex items-center gap-2 flex-wrap">
              {destination && (
                <div className="px-3.5 py-1.5 rounded-xl bg-white/5 border border-white/10 text-center backdrop-blur-md flex items-center gap-1.5">
                  <CountryFlag destinationName={destination} className="w-4 h-3 rounded-xs shadow-2xs" />
                  <span className="text-xs font-bold text-white">{destination}</span>
                </div>
              )}
              <div className="px-3.5 py-1.5 rounded-xl bg-white/5 border border-white/10 text-center backdrop-blur-md">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Total Pax</span>
                <span className="text-sm font-black text-sky-400 flex items-center justify-center gap-1">
                  <Users size={13} /> {paxCount} Pax
                </span>
              </div>
              <div className="px-3.5 py-1.5 rounded-xl bg-white/5 border border-white/10 text-center backdrop-blur-md">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Prestations</span>
                <span className="text-sm font-black text-emerald-400">
                  {articles.length} {articles.length > 1 ? 'articles' : 'article'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {loadingData ? (
          <div className="flex flex-col justify-center items-center h-72 space-y-3 bg-background">
            <Loader2 className="animate-spin text-primary" size={34} />
            <p className="text-xs text-muted-foreground font-semibold">Chargement des données, catalogue visas & fournisseurs...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 bg-background">
            <div className="p-6 sm:p-7 overflow-y-auto max-h-[68vh] space-y-5">

              {/* ── ROW 1: CLIENT, DESTINATION, DATE & STATUT ─────────────────── */}
              <div className="p-1 rounded-2xl bg-gradient-to-b from-muted/60 to-muted/20 border border-border/70 shadow-xs">
                <div className="p-4 bg-card rounded-[14px] grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  
                  {/* 1. Client Selector with Autocomplete */}
                  <div className="space-y-1.5 relative" ref={wrapperRef}>
                    <Label className="text-xs font-bold text-foreground flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <User size={13} className="text-primary" />
                        Client <span className="text-red-500">*</span>
                      </span>
                      {selectedClient && (
                        <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                          ✓ Vérifié
                        </span>
                      )}
                    </Label>
                    <div className="relative">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/70" />
                      <Input
                        className="pl-8.5 h-10 bg-muted/20 focus-visible:bg-transparent text-xs font-bold rounded-xl border-border/80"
                        placeholder="Rechercher un client..."
                        value={clientSearch}
                        onChange={e => { 
                          setClientSearch(e.target.value); 
                          setShowDropdown(true); 
                          if (clientId) setClientId(''); 
                        }}
                        onFocus={() => setShowDropdown(true)}
                      />
                    </div>
                    {showDropdown && (
                      <div className="absolute top-full left-0 right-0 mt-1.5 bg-card border border-border/80 rounded-xl shadow-2xl z-50 max-h-[220px] overflow-y-auto">
                        {filteredClients.map(c => (
                          <div 
                            key={c.id} 
                            onClick={() => handleSelectClient(c)}
                            className="flex items-center justify-between px-3.5 py-2.5 cursor-pointer hover:bg-muted transition-colors border-b border-border/40 last:border-0"
                          >
                            <div>
                              <span className="font-bold text-xs text-foreground block">{c.nom}</span>
                              {c.telephone && <span className="text-[10px] text-muted-foreground">{c.telephone}</span>}
                            </div>
                            <span className={cn(
                              "text-[9px] font-black uppercase px-2 py-0.5 rounded-full border",
                              c.type === 'Entreprise' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            )}>
                              {c.type || 'Particulier'}
                            </span>
                          </div>
                        ))}
                        {filteredClients.length === 0 && clientSearch && (
                          <div className="px-4 py-3 text-xs text-muted-foreground italic">Aucun client trouvé.</div>
                        )}
                        <div 
                          onClick={() => { setShowDropdown(false); setIsAddingClient(true); }}
                          className="flex items-center gap-2 px-4 py-2.5 cursor-pointer text-primary font-extrabold text-xs bg-primary/5 hover:bg-primary/10 transition-colors border-t border-border/40"
                        >
                          <Plus size={14} /> Créer un nouveau client
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 2. Destination (Directement depuis Master Data) */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-foreground flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Globe size={13} className="text-blue-500" />
                        Destination Globale
                      </span>
                      {destination && (
                        <CountryFlag 
                          destinationName={destination} 
                          className="w-4 h-3 rounded-xs shadow-2xs" 
                        />
                      )}
                    </Label>
                    <DestinationSelect
                      value={destination}
                      onChange={(val) => {
                        const newDest = val === 'all' ? '' : val;
                        setDestination(newDest);
                        setArticles(prev => prev.map(a => a.destination ? a : { ...a, destination: newDest }));
                      }}
                      destinations={destinationsList}
                      placeholder="Sélectionner une destination..."
                      allowAll={false}
                      size="default"
                      mode="name"
                      showArabic={true}
                      className="w-full"
                    />
                  </div>

                  {/* 3. Date de vente */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <Calendar size={13} className="text-teal-600" />
                      Date de Vente <span className="text-red-500">*</span>
                    </Label>
                    <Input 
                      type="date" 
                      required 
                      value={dateVente} 
                      onChange={e => setDateVente(e.target.value)} 
                      className="h-10 bg-muted/20 focus-visible:bg-transparent text-xs font-bold rounded-xl border-border/80" 
                    />
                  </div>

                  {/* 4. Statut de Paiement */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <CheckCircle2 size={13} className="text-emerald-600" />
                      État du Règlement
                    </Label>
                    <Select 
                      value={etat} 
                      onChange={e => setEtat(e.target.value)} 
                      className="h-10 bg-muted/20 text-xs font-extrabold rounded-xl border-border/80"
                    >
                      <option value="Payé">🟢 Payé intégralement</option>
                      <option value="Reservé">🟡 Réservé / Acompte</option>
                      <option value="Annulé">🔴 Annulé / Non réglé</option>
                    </Select>
                  </div>
                </div>
              </div>

              {/* ── ROW 2: PASSAGERS & VOYAGEURS (DETERMINES TOTAL PAX) ────────── */}
              <div className="p-1 rounded-2xl bg-gradient-to-b from-sky-500/10 via-muted/30 to-muted/10 border border-sky-500/20 shadow-xs space-y-2">
                <div className="p-4 bg-card rounded-[14px] space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/40 pb-2">
                    <div>
                      <h3 className="text-xs font-black uppercase tracking-wider text-foreground flex items-center gap-2">
                        <Users size={15} className="text-sky-600 dark:text-sky-400" />
                        <span>Voyageurs & Bénéficiaires ({personnes.length} enregistrés · Total {paxCount} Pax)</span>
                      </h3>
                      <p className="text-[11px] text-muted-foreground">
                        Les montants totaux sont divisés par <strong>{paxCount} Pax</strong> pour le calcul unitaire.
                      </p>
                    </div>

                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm" 
                      onClick={handleAddPersonne} 
                      className="h-7 text-xs font-bold gap-1.5 rounded-xl border-sky-500/30 text-sky-700 dark:text-sky-300 hover:bg-sky-50 dark:hover:bg-sky-950/40"
                    >
                      <Plus size={13} /> Ajouter un voyageur
                    </Button>
                  </div>

                  {personnes.length === 0 ? (
                    <div className="py-2.5 px-3 rounded-xl bg-sky-50/50 dark:bg-sky-950/20 border border-sky-200/50 dark:border-sky-800/30 flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">
                        👤 <strong>Client seul (1 Pax)</strong> : <em>{clientSearch || 'Client principal'}</em>
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleAddPersonne}
                        className="h-6 text-[11px] font-bold text-sky-600 hover:text-sky-700"
                      >
                        + Ajouter des accompagnateurs
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                      {personnes.map((p, i) => (
                        <div key={i} className="flex gap-2 items-center">
                          <span className="text-[10px] font-bold bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-300 px-2 py-1 rounded-lg border border-sky-200 dark:border-sky-800 shrink-0">
                            Pax #{i + 1}
                          </span>
                          <Input
                            placeholder={`Nom et prénom du voyageur ${i + 1}`}
                            value={p.nom}
                            onChange={e => handleUpdatePersonne(i, 'nom', e.target.value)}
                            className="h-8.5 text-xs bg-muted/20 rounded-xl flex-1 font-medium"
                          />
                          <Input
                            placeholder="N° Passeport (optionnel)"
                            value={p.passport}
                            onChange={e => handleUpdatePersonne(i, 'passport', e.target.value)}
                            className="h-8.5 text-xs bg-muted/20 rounded-xl w-44 font-mono text-center"
                          />
                          <Button 
                            type="button" 
                            variant="destructive" 
                            size="icon-sm" 
                            className="h-8.5 w-8.5 rounded-xl shrink-0"
                            onClick={() => handleRemovePersonne(i)}
                            title="Supprimer ce voyageur"
                          >
                            <Trash2 size={13} />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* ── ROW 3: ARTICLES MULTIPLES & SERVICES ──────────────────────── */}
              <div className="space-y-3.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-border/60 pb-2.5">
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-wider text-foreground flex items-center gap-2">
                      <Layers size={16} className="text-primary" />
                      <span>Prestations & Lignes de Vente ({articles.length})</span>
                    </h3>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Tarifs synchronisés · Fournisseurs associés · Assistant catalogue visa intégré.
                    </p>
                  </div>

                  {/* Quick Add Presets dynamically generated from Master Data */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase mr-1">Raccourcis :</span>
                    {availableCategories.slice(0, 6).map(cat => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => handleAddArticle(cat.nom)}
                        className="px-2.5 py-1 rounded-xl text-[11px] font-bold bg-muted/50 hover:bg-primary/10 hover:text-primary hover:border-primary/40 border border-border/70 transition-all duration-150 flex items-center gap-1.5 shadow-2xs active:scale-[0.97]"
                      >
                        <span className="text-xs">{cat.emoji}</span>
                        <span className="truncate max-w-[110px]">{cat.nom}</span>
                      </button>
                    ))}
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => handleAddArticle(availableCategories[0]?.nom || 'Autre')}
                      className="h-7 text-xs font-bold gap-1 rounded-xl shadow-2xs ml-1"
                    >
                      <Plus size={13} /> Ajouter
                    </Button>
                  </div>
                </div>

                {/* Articles List Rows */}
                <div className="space-y-4">
                  {articles.map((art, idx) => {
                    const pa = parseFloat(art.prix_achat) || 0;
                    const pv = parseFloat(art.prix_vente) || 0;
                    const comm = parseFloat(art.commission) || (pv - pa);
                    
                    const paPax = paxCount > 0 ? Math.round(pa / paxCount) : pa;
                    const pvPax = paxCount > 0 ? Math.round(pv / paxCount) : pv;
                    const commPax = paxCount > 0 ? Math.round(comm / paxCount) : comm;

                    const isVisa = (art.categorie || '').toLowerCase().includes('visa');
                    const isBillet = (art.categorie || '').toLowerCase().includes('billet') || (art.categorie || '').toLowerCase().includes('vol');

                    // Filter visa types for the selected country in this article
                    const countryVisas = art.visa_country_id 
                      ? visaTypes.filter(vt => vt.country_id === art.visa_country_id) 
                      : [];
                    const selectedCountryObj = visaCountries.find(c => c.id === art.visa_country_id);
                    const selectedVisaTypeObj = visaTypes.find(vt => vt.id === art.visa_type_id);
                    const selectedFournisseur = fournisseursList.find(f => f.id === art.fournisseur_id);

                    return (
                      <div 
                        key={art.id || idx} 
                        className={cn(
                          "p-1 rounded-2xl border transition-all duration-200 shadow-xs group",
                          isVisa 
                            ? "bg-gradient-to-b from-emerald-500/10 via-muted/40 to-muted/20 border-emerald-500/30" 
                            : "bg-gradient-to-b from-muted/70 to-muted/20 border-border/70 hover:border-primary/40"
                        )}
                      >
                        <div className="p-4 bg-card rounded-[14px] border border-border/40 space-y-3.5">
                          
                          {/* ── ARTICLE HEADER: CATEGORY, FOURNISSEUR & REMOVE ── */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2.5 border-b border-border/50">
                            
                            {/* Left: Category & Line Label */}
                            <div className="flex items-center gap-2.5 flex-1 min-w-[260px]">
                              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-lg bg-primary/10 text-primary border border-primary/20 shrink-0">
                                #{idx + 1}
                              </span>
                              <div className="flex-1 max-w-[200px]">
                                <Select
                                  value={art.categorie}
                                  onChange={e => handleUpdateArticle(idx, 'categorie', e.target.value)}
                                  className="h-8 text-xs font-black bg-muted/40 rounded-xl"
                                >
                                  {availableCategories.map(cat => (
                                    <option key={cat.id} value={cat.nom}>
                                      {cat.emoji} {cat.nom}
                                    </option>
                                  ))}
                                </Select>
                              </div>

                              {isVisa && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 flex items-center gap-1 shrink-0">
                                  <Sparkles size={11} /> Catalogue Visa Actif
                                </span>
                              )}
                            </div>

                            {/* Right: Fournisseur UI & Delete Line */}
                            <div className="flex items-center gap-2 self-end sm:self-auto">
                              
                              {/* 🏢 Fournisseur Selector with Quick Add */}
                              <div className="flex items-center gap-1.5 bg-muted/30 p-1 rounded-xl border border-border/60">
                                <Building2 size={13} className="text-muted-foreground ml-1.5 shrink-0" />
                                <Select
                                  value={art.fournisseur_id || ''}
                                  onChange={e => handleUpdateArticle(idx, 'fournisseur_id', e.target.value)}
                                  className="h-7 text-[11px] font-bold bg-transparent border-0 max-w-[170px] min-w-[120px] focus:ring-0"
                                >
                                  <option value="">-- Sans Fournisseur --</option>
                                  {fournisseursList.map(f => (
                                    <option key={f.id} value={f.id}>{f.nom}</option>
                                  ))}
                                </Select>

                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon-xs"
                                  onClick={() => handleOpenAddFournisseur(idx)}
                                  title="Ajouter un nouveau fournisseur"
                                  className="h-6 w-6 rounded-lg text-primary hover:bg-primary/10 shrink-0"
                                >
                                  <Plus size={13} />
                                </Button>
                              </div>

                              {/* Delete Button */}
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                onClick={() => handleRemoveArticle(idx)}
                                className="h-7 w-7 text-muted-foreground/60 hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors ml-1"
                                title="Supprimer cette ligne"
                              >
                                <Trash2 size={14} />
                              </Button>
                            </div>
                          </div>

                          {/* ── SPECIAL STEP-BY-STEP VISA CATALOG SELECTOR (WHEN CATEGORY IS VISA) ── */}
                          {isVisa && (
                            <div className="p-3.5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/25 border border-emerald-500/25 space-y-3">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="w-5 h-5 rounded-lg bg-emerald-500 text-white flex items-center justify-center text-xs font-black">
                                    🛂
                                  </span>
                                  <span className="text-xs font-extrabold text-emerald-900 dark:text-emerald-300">
                                    Sélection Assistée du Visa (Étape 1 : Pays → Étape 2 : Visa)
                                  </span>
                                </div>
                                {art.visa_type_id && (
                                  <button
                                    type="button"
                                    onClick={() => handleClearVisaCatalogue(idx)}
                                    className="text-[10px] font-bold text-muted-foreground hover:text-destructive flex items-center gap-1 transition-colors"
                                  >
                                    <RefreshCw size={11} /> Réinitialiser
                                  </button>
                                )}
                              </div>

                              {/* Step 1 & Step 2 Grids */}
                              <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                                
                                {/* ── ÉTAPE 1 : PAYS DU VISA (OBLIGATOIRE EN PREMIER) ── */}
                                <div className="md:col-span-6 space-y-1.5">
                                  <Label className="text-[11px] font-extrabold text-foreground flex items-center justify-between">
                                    <span className="flex items-center gap-1.5">
                                      <span className="w-4 h-4 rounded-full bg-emerald-600 text-white text-[10px] flex items-center justify-center font-bold">1</span>
                                      Pays de Destination <span className="text-red-500">*</span>
                                    </span>
                                    {selectedCountryObj && (
                                      <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                        <CountryFlag destinationName={selectedCountryObj.nom} className="w-3.5 h-2.5 rounded-2xs" />
                                        {selectedCountryObj.nom}
                                      </span>
                                    )}
                                  </Label>

                                  <Select
                                    value={art.visa_country_id || ''}
                                    onChange={e => handleVisaCountryChange(idx, e.target.value)}
                                    className="h-9.5 text-xs font-bold bg-background rounded-xl border-emerald-500/40 focus:border-emerald-500"
                                  >
                                    <option value="">-- Choisir le pays du visa --</option>
                                    {visaCountries.map(c => {
                                      const count = visaTypes.filter(vt => vt.country_id === c.id).length;
                                      return (
                                        <option key={c.id} value={c.id}>
                                          {c.nom} {c.nom_ar ? `(${c.nom_ar})` : ''} — {count} {count > 1 ? 'visas' : 'visa'}
                                        </option>
                                      );
                                    })}
                                  </Select>

                                  {/* Quick Popular Country Pills */}
                                  <div className="flex items-center gap-1 flex-wrap pt-0.5">
                                    <span className="text-[9px] font-bold text-muted-foreground uppercase mr-0.5">Top :</span>
                                    {visaCountries
                                      .filter(c => popularVisaCountryCodes.includes((c.code_iso || '').toLowerCase()) || ['sa', 'tr', 'ae', 'eg'].some(k => c.nom.toLowerCase().includes(k)))
                                      .slice(0, 5)
                                      .map(c => (
                                        <button
                                          key={c.id}
                                          type="button"
                                          onClick={() => handleVisaCountryChange(idx, c.id)}
                                          className={cn(
                                            "px-2 py-0.5 text-[10px] font-bold rounded-lg border transition-all flex items-center gap-1 shadow-2xs",
                                            art.visa_country_id === c.id
                                              ? "bg-emerald-600 text-white border-emerald-600"
                                              : "bg-background/80 hover:bg-emerald-100 dark:hover:bg-emerald-950/50 text-foreground border-border/70"
                                          )}
                                        >
                                          <CountryFlag destinationName={c.nom} className="w-3 h-2 rounded-2xs" />
                                          <span>{c.nom.split(' ')[0]}</span>
                                        </button>
                                      ))}
                                  </div>
                                </div>

                                {/* ── ÉTAPE 2 : TYPE / FORMULE DE VISA POUR CE PAYS ── */}
                                <div className="md:col-span-6 space-y-1.5">
                                  <Label className="text-[11px] font-extrabold text-foreground flex items-center justify-between">
                                    <span className="flex items-center gap-1.5">
                                      <span className={cn(
                                        "w-4 h-4 rounded-full text-[10px] flex items-center justify-center font-bold",
                                        art.visa_country_id ? "bg-emerald-600 text-white" : "bg-muted text-muted-foreground"
                                      )}>2</span>
                                      Formule de Visa <span className="text-red-500">*</span>
                                    </span>
                                    {art.visa_type_id && (
                                      <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                                        ✓ Tarif injecté
                                      </span>
                                    )}
                                  </Label>

                                  {!art.visa_country_id ? (
                                    <div className="h-9.5 px-3 rounded-xl bg-muted/40 border border-dashed border-border/80 flex items-center gap-2 text-xs text-muted-foreground italic">
                                      <AlertCircle size={13} className="text-amber-500 shrink-0" />
                                      <span>Sélectionnez d'abord le pays (Étape 1)</span>
                                    </div>
                                  ) : countryVisas.length === 0 ? (
                                    <div className="h-9.5 px-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 flex items-center justify-between text-xs text-amber-800 dark:text-amber-300">
                                      <span>Aucun visa pré-enregistré pour ce pays.</span>
                                      <span className="text-[10px] font-bold">Saisie manuelle possible</span>
                                    </div>
                                  ) : (
                                    <Select
                                      value={art.visa_type_id || ''}
                                      onChange={e => handleQuickVisaSelect(idx, e.target.value)}
                                      className="h-9.5 text-xs font-black bg-background rounded-xl border-emerald-500/50 text-emerald-950 dark:text-emerald-100 shadow-xs focus:border-emerald-500"
                                    >
                                      <option value="">-- Sélectionner la formule de visa --</option>
                                      {countryVisas.map(vt => (
                                        <option key={vt.id} value={vt.id}>
                                          {vt.nom} — Vente: {Number(vt.tarif_vente || 0).toLocaleString('fr-DZ')} DZD {vt.duree_traitement ? `(${vt.duree_traitement})` : ''}
                                        </option>
                                      ))}
                                    </Select>
                                  )}

                                  {/* Info Pill on selected Visa */}
                                  {selectedVisaTypeObj && (
                                    <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground pt-0.5 flex-wrap">
                                      {selectedVisaTypeObj.duree_traitement && (
                                        <span className="flex items-center gap-1 bg-background/80 px-2 py-0.5 rounded-md border border-border/60">
                                          <Clock size={10} className="text-teal-600" />
                                          <span>Délai: {selectedVisaTypeObj.duree_traitement}</span>
                                        </span>
                                      )}
                                      {Array.isArray(selectedVisaTypeObj.dossier) && selectedVisaTypeObj.dossier.length > 0 && (
                                        <span className="flex items-center gap-1 bg-background/80 px-2 py-0.5 rounded-md border border-border/60">
                                          <FileCheck size={10} className="text-emerald-600" />
                                          <span>Dossier: {selectedVisaTypeObj.dossier.length} pièces</span>
                                        </span>
                                      )}
                                      <span className="text-emerald-600 dark:text-emerald-400 font-extrabold">
                                        Marge: +{(Number(selectedVisaTypeObj.tarif_vente || 0) - Number(selectedVisaTypeObj.tarif_base || 0)).toLocaleString('fr-DZ')} DZD
                                      </span>
                                    </div>
                                  )}
                                </div>

                              </div>
                            </div>
                          )}

                          {/* ── ROW: DESCRIPTION & BILLETTERIE FIELDS ── */}
                          <div className="space-y-2.5">
                            <div className="grid grid-cols-12 gap-3 items-start">
                              
                              {/* Description Input */}
                              <div className={cn(isBillet ? "col-span-12 sm:col-span-7" : "col-span-12")}>
                                <Label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">
                                  Libellé / Désignation de la prestation
                                </Label>
                                <Input
                                  placeholder={
                                    isBillet ? 'Ex: Vol Alger - Paris CDG A/R' :
                                    isVisa ? 'Ex: Visa Tourisme 90 jours' :
                                    art.categorie.toLowerCase().includes('hotel') ? 'Ex: Hôtel Hilton 4* 5 nuits' :
                                    art.categorie.toLowerCase().includes('transfert') ? 'Ex: Navette Privée Aéroport' :
                                    `Ex: Prestation ${art.categorie}`
                                  }
                                  value={art.designation}
                                  onChange={e => handleUpdateArticle(idx, 'designation', e.target.value)}
                                  className="h-9.5 text-xs font-semibold bg-background rounded-xl focus-visible:bg-transparent"
                                />
                              </div>

                              {/* Quick Airline Selector (If category is Billeterie) */}
                              {isBillet && (
                                <div className="col-span-12 sm:col-span-5">
                                  <Label className="text-[10px] font-bold text-sky-600 dark:text-sky-400 uppercase block mb-1 flex items-center justify-between">
                                    <span>✈️ Compagnie Aérienne</span>
                                    {art.airline_id && <span className="text-[9px] text-emerald-600 font-bold">✓ Liée</span>}
                                  </Label>
                                  <Select
                                    value={art.airline_id || ''}
                                    onChange={e => handleQuickAirlineSelect(idx, e.target.value)}
                                    className="h-9.5 text-[11px] font-bold bg-sky-50/70 dark:bg-sky-950/40 text-sky-950 dark:text-sky-200 border-sky-300 dark:border-sky-800 rounded-xl"
                                  >
                                    <option value="">-- Choisir une compagnie --</option>
                                    {airlines.map(al => (
                                      <option key={al.id} value={al.id}>{al.code_iata} - {al.nom}</option>
                                    ))}
                                  </Select>
                                </div>
                              )}

                            </div>

                            {/* Additional Billetterie details: Destination, Itinéraire, PNR, N° Billet */}
                            {isBillet && (
                              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 p-3 bg-sky-50/50 dark:bg-sky-950/25 border border-sky-200/70 dark:border-sky-800/50 rounded-2xl shadow-2xs">
                                
                                {/* 1. Destination du Billet / Vol */}
                                <div className="sm:col-span-3 space-y-1">
                                  <Label className="text-[10px] font-extrabold text-sky-900 dark:text-sky-300 uppercase flex items-center justify-between">
                                    <span className="flex items-center gap-1">
                                      <Globe size={11} className="text-sky-600" /> Destination
                                    </span>
                                    {art.destination && (
                                      <CountryFlag destinationName={art.destination} className="w-3.5 h-2.5 rounded-2xs" />
                                    )}
                                  </Label>
                                  <DestinationSelect
                                    value={art.destination || destination || ''}
                                    onChange={(val) => {
                                      const newDest = val === 'all' ? '' : val;
                                      handleUpdateArticle(idx, 'destination', newDest);
                                      if (!destination && newDest) setDestination(newDest);
                                    }}
                                    destinations={destinationsList}
                                    placeholder="Destination du vol..."
                                    allowAll={false}
                                    size="sm"
                                    mode="name"
                                    showArabic={false}
                                    className="w-full bg-background rounded-lg border-sky-300/80 dark:border-sky-800 text-xs font-bold"
                                  />
                                </div>

                                {/* 2. Itinéraire / Trajet */}
                                <div className="sm:col-span-3 space-y-1">
                                  <Label className="text-[10px] font-extrabold text-sky-900 dark:text-sky-300 uppercase block">
                                    Itinéraire / Trajet
                                  </Label>
                                  <Input
                                    placeholder="Ex: ALG - IST - ALG"
                                    value={art.itineraire || ''}
                                    onChange={e => handleUpdateArticle(idx, 'itineraire', e.target.value)}
                                    className="h-9 text-xs bg-background rounded-lg border-sky-300/80 dark:border-sky-800 font-semibold"
                                  />
                                </div>

                                {/* 3. PNR / Code Réservation */}
                                <div className="sm:col-span-3 space-y-1">
                                  <Label className="text-[10px] font-extrabold text-sky-900 dark:text-sky-300 uppercase block">
                                    PNR / Code Réservation
                                  </Label>
                                  <Input
                                    placeholder="Ex: 6YTR9Q"
                                    value={art.pnr || ''}
                                    onChange={e => handleUpdateArticle(idx, 'pnr', e.target.value.toUpperCase())}
                                    className="h-9 text-xs font-mono font-black uppercase bg-background rounded-lg border-sky-300/80 dark:border-sky-800 tracking-wider"
                                  />
                                </div>

                                {/* 4. Numéro de Billet (e-Ticket) */}
                                <div className="sm:col-span-3 space-y-1">
                                  <Label className="text-[10px] font-extrabold text-sky-900 dark:text-sky-300 uppercase block">
                                    Numéro de Billet (e-Ticket)
                                  </Label>
                                  <Input
                                    placeholder="Ex: 065-2458963214"
                                    value={art.numero_billet || ''}
                                    onChange={e => handleUpdateArticle(idx, 'numero_billet', e.target.value)}
                                    className="h-9 text-xs font-mono bg-background rounded-lg border-sky-300/80 dark:border-sky-800"
                                  />
                                </div>

                              </div>
                            )}
                          </div>

                          {/* ── ROW: FINANCIAL FIELDS (ACHAT TOTAL, COMMISSION, VENTE TOTAL) ── */}
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                            
                            {/* 1. Tarif Achat Total (DZD) */}
                            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 space-y-1">
                              <div className="flex items-center justify-between">
                                <Label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase block">
                                  Achat Total (DZD)
                                </Label>
                                {paxCount > 1 && pa > 0 && (
                                  <span className="text-[9px] font-bold text-slate-500">
                                    {paPax.toLocaleString('fr-DZ')} / pax
                                  </span>
                                )}
                              </div>
                              <Input
                                type="number"
                                placeholder="0"
                                value={art.prix_achat}
                                onChange={e => handleUpdateArticle(idx, 'prix_achat', e.target.value)}
                                className="h-9 text-xs font-bold text-slate-800 dark:text-slate-200 bg-background rounded-lg"
                              />
                            </div>

                            {/* 2. Commission / Marge (Modifiable) */}
                            <div className="p-2.5 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/50 space-y-1">
                              <div className="flex items-center justify-between">
                                <Label className="text-[10px] font-extrabold text-amber-700 dark:text-amber-400 uppercase block">
                                  Commission / Marge (DZD)
                                </Label>
                                {paxCount > 1 && comm !== 0 && (
                                  <span className="text-[9px] font-bold text-amber-600 dark:text-amber-400">
                                    {commPax.toLocaleString('fr-DZ')} / pax
                                  </span>
                                )}
                              </div>
                              <Input
                                type="number"
                                placeholder="0"
                                value={art.commission}
                                onChange={e => handleUpdateArticle(idx, 'commission', e.target.value)}
                                className="h-9 text-xs font-extrabold text-amber-700 dark:text-amber-400 bg-background rounded-lg border-amber-300"
                              />
                            </div>

                            {/* 3. Tarif Vente Total (Modifiable) */}
                            <div className="p-2.5 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/50 space-y-1">
                              <div className="flex items-center justify-between">
                                <Label className="text-[10px] font-black text-emerald-700 dark:text-emerald-400 uppercase block">
                                  Vente Total TTC (DZD)
                                </Label>
                                {paxCount > 1 && pv > 0 && (
                                  <span className="text-[9px] font-black text-emerald-600 dark:text-emerald-400">
                                    {pvPax.toLocaleString('fr-DZ')} / pax
                                  </span>
                                )}
                              </div>
                              <Input
                                type="number"
                                placeholder="0"
                                value={art.prix_vente}
                                onChange={e => handleUpdateArticle(idx, 'prix_vente', e.target.value)}
                                className="h-9 text-xs font-black text-emerald-700 dark:text-emerald-300 bg-background rounded-lg border-emerald-300"
                              />
                            </div>

                          </div>

                          {/* Line Bottom Meta: Indicators & Notes */}
                          <div className="flex items-center justify-between pt-2 border-t border-border/40 text-xs flex-wrap gap-2">
                            
                            <div className="flex items-center gap-2 text-[11px] text-muted-foreground flex-wrap">
                              {selectedFournisseur ? (
                                <span className="flex items-center gap-1 font-bold text-foreground bg-muted/60 px-2 py-0.5 rounded-md">
                                  <Building2 size={11} className="text-primary" />
                                  <span>Fournisseur: {selectedFournisseur.nom}</span>
                                </span>
                              ) : (
                                <span className="italic text-[10px]">Aucun fournisseur assigné</span>
                              )}

                              {art.destination && (
                                <span className="flex items-center gap-1 text-[10px] font-bold bg-muted/50 px-2 py-0.5 rounded-md">
                                  <CountryFlag destinationName={art.destination} className="w-3.5 h-2.5 rounded-2xs" />
                                  <span>{art.destination}</span>
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-2.5">
                              {paxCount > 1 && (
                                <span className="text-[10px] font-bold bg-muted/70 text-foreground px-2 py-0.5 rounded-lg border border-border/70">
                                  {paxCount} Pax : {pvPax.toLocaleString('fr-DZ')} DZD / pax
                                </span>
                              )}

                              <span className={cn(
                                "text-[10px] font-black px-2.5 py-0.5 rounded-full border shadow-2xs",
                                comm >= 0 
                                  ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30" 
                                  : "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30"
                              )}>
                                Marge : {comm >= 0 ? '+' : ''}{comm.toLocaleString('fr-DZ')} DZD
                              </span>
                            </div>
                          </div>

                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Add Article Button */}
                <button
                  type="button"
                  onClick={() => handleAddArticle(availableCategories[0]?.nom || 'Autre')}
                  className="w-full py-2.5 rounded-2xl border border-dashed border-primary/40 bg-primary/5 hover:bg-primary/10 text-primary font-extrabold text-xs flex items-center justify-center gap-2 transition-all duration-200 shadow-2xs active:scale-[0.99]"
                >
                  <Plus size={15} />
                  <span>Ajouter une autre prestation à cette vente</span>
                </button>
              </div>

              {/* ── ROW 4: OBSERVATIONS / REMARQUES ───────────────────────────── */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-foreground">Remarques & Modalités Spécifiques (Optionnel)</Label>
                <Input
                  placeholder="Ex: Bagage 23kg inclus, voucher transmis par email, règlement par virement..."
                  value={observations}
                  onChange={e => setObservations(e.target.value)}
                  className="h-10 text-xs bg-muted/20 rounded-xl border-border/80"
                />
              </div>

              {/* ── FINANCIAL SUMMARY HUD (GLOBAL & DIVISÉ PAR PAX) ───────────── */}
              <div className="relative rounded-2xl bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white p-5 border border-slate-800/90 shadow-2xl overflow-hidden">
                <div className="absolute top-0 right-1/4 w-48 h-24 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
                <div className="relative z-10 grid grid-cols-2 sm:grid-cols-4 gap-4">
                  
                  {/* Total Achat */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 block">
                        Total Achat
                      </span>
                      {paxCount > 1 && (
                        <span className="text-[9px] font-bold text-slate-400">
                          {financialTotals.achatPerPax.toLocaleString('fr-DZ')} / pax
                        </span>
                      )}
                    </div>
                    <span className="text-base sm:text-lg font-bold text-slate-200 font-mono">
                      {financialTotals.totalAchat.toLocaleString('fr-DZ')} <span className="text-[10px] font-sans text-slate-500">DZD</span>
                    </span>
                  </div>

                  {/* Total Commission */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] uppercase tracking-wider font-extrabold text-amber-400 block">
                        Marge Commission
                      </span>
                      {paxCount > 1 && (
                        <span className="text-[9px] font-extrabold text-amber-300">
                          {financialTotals.commPerPax.toLocaleString('fr-DZ')} / pax
                        </span>
                      )}
                    </div>
                    <span className="text-base sm:text-lg font-black text-amber-400 font-mono">
                      {financialTotals.totalCommission.toLocaleString('fr-DZ')} <span className="text-[10px] font-sans text-amber-500">DZD</span>
                    </span>
                  </div>

                  {/* Total Vente */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] uppercase tracking-wider font-extrabold text-emerald-400 block">
                        Total Vente TTC
                      </span>
                      {paxCount > 1 && (
                        <span className="text-[9px] font-black text-emerald-300">
                          {financialTotals.ventePerPax.toLocaleString('fr-DZ')} / pax
                        </span>
                      )}
                    </div>
                    <span className="text-base sm:text-xl font-black text-emerald-400 font-mono">
                      {financialTotals.totalVente.toLocaleString('fr-DZ')} <span className="text-[10px] font-sans text-emerald-500">DZD</span>
                    </span>
                  </div>

                  {/* Taux de Marge */}
                  <div>
                    <span className="text-[10px] uppercase tracking-wider font-bold text-sky-400 block mb-1">
                      Taux de Marge
                    </span>
                    <span className="text-base sm:text-lg font-black text-sky-400 font-mono">
                      {financialTotals.tauxMarge}%
                    </span>
                  </div>
                </div>
              </div>

            </div>

            {/* ── FOOTER: BUTTON-IN-BUTTON ARCHITECTURE ────────────────────── */}
            <div className="px-7 py-4.5 border-t border-border/80 bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground font-semibold">Total Client ({paxCount} Pax) :</span>
                <span className="text-base font-black text-foreground font-mono">
                  {financialTotals.totalVente.toLocaleString('fr-DZ')} DZD
                </span>
                {paxCount > 1 && (
                  <span className="text-xs text-muted-foreground">
                    ({financialTotals.ventePerPax.toLocaleString('fr-DZ')} DZD / pax)
                  </span>
                )}
              </div>
              
              <div className="flex items-center gap-2.5">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={onClose} 
                  className="h-10 px-5 text-xs font-bold rounded-xl"
                >
                  Annuler
                </Button>

                {/* Primary CTA with Nested Trailing Icon */}
                <button
                  type="submit"
                  className="h-10 px-6 bg-primary hover:bg-primary/90 text-primary-foreground font-extrabold text-xs rounded-xl shadow-md transition-all duration-200 flex items-center gap-3 group active:scale-[0.98]"
                >
                  <span>Enregistrer la Vente</span>
                  <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center group-hover:translate-x-0.5 transition-transform">
                    <Check size={13} className="text-white" />
                  </div>
                </button>
              </div>
            </div>
          </form>
        )}
      </DialogContent>

      {/* ── Quick Add Client Dialog ── */}
      {isAddingClient && (
        <ClientForm 
          onClose={() => setIsAddingClient(false)} 
          onSave={handleSaveNewClient} 
        />
      )}

      {/* ── Quick Add Fournisseur Dialog ── */}
      {isAddingFournisseur && (
        <Dialog open={true} onOpenChange={() => setIsAddingFournisseur(false)}>
          <DialogContent className="max-w-md p-6 rounded-3xl" onClose={() => setIsAddingFournisseur(false)}>
            <DialogHeader>
              <DialogTitle className="text-base font-black flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <Building2 size={16} />
                </div>
                <span>Nouveau Fournisseur / Prestataire</span>
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSaveQuickFournisseur} className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Nom de l'entreprise / Partenaire <span className="text-red-500">*</span></Label>
                <Input
                  placeholder="Ex: Al Tayyar Travel, Royal Airlines, Booking Pro..."
                  value={newFournisseurNom}
                  onChange={e => setNewFournisseurNom(e.target.value)}
                  required
                  autoFocus
                  className="h-10 text-xs font-bold rounded-xl"
                />
              </div>
              <DialogFooter className="gap-2 pt-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setIsAddingFournisseur(false)}
                  className="rounded-xl h-9"
                >
                  Annuler
                </Button>
                <Button 
                  type="submit" 
                  size="sm" 
                  disabled={savingFournisseur || !newFournisseurNom.trim()}
                  className="rounded-xl h-9 font-bold"
                >
                  {savingFournisseur ? <Loader2 className="animate-spin" size={14} /> : 'Créer & Assigner'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </Dialog>
  );
};

export default VenteForm;

