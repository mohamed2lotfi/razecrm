import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { 
  Users, Search, Filter, Printer, Download, Globe, 
  Building2, BedDouble, Calendar, Plane, CreditCard,
  ChevronRight, ArrowUpDown, RefreshCw, UserCheck, 
  Baby, Utensils, Tag, CheckCircle2, Clock, AlertCircle,
  TrendingUp, Phone, Shield, Edit, Eye, Camera, Upload,
  X, Check, AlertTriangle, FileText
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

const CHAMBRE_KEYS = {
  'CH5': 'ch5', 'CH4': 'ch4', 'CH3': 'ch3', 'CH2': 'ch2', 'Single': 'single'
};

const fmtDZD = (n) => Number(n || 0).toLocaleString('fr-DZ', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

const calculateAge = (birthDateStr) => {
  if (!birthDateStr) return null;
  const birth = new Date(birthDateStr);
  if (isNaN(birth.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
};

const Pelerins = () => {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [groupes, setGroupes] = useState([]);
  const [enregistrements, setEnregistrements] = useState([]);
  const [paiements, setPaiements] = useState([]);
  const [hotels, setHotels] = useState([]);
  const [pelerinsTableData, setPelerinsTableData] = useState([]);
  const [agencySettings, setAgencySettings] = useState(null);

  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGroupeId, setSelectedGroupeId] = useState('all');
  const [selectedHotelId, setSelectedHotelId] = useState('all');
  const [selectedGenre, setSelectedGenre] = useState('all'); // 'all' | 'H' | 'F'
  const [selectedCategory, setSelectedCategory] = useState('all'); // 'all' | 'adulte' | 'chd' | 'sans_lit' | 'guide'
  const [selectedPaymentStatus, setSelectedPaymentStatus] = useState('all'); // 'all' | 'payé' | 'versement' | 'pending'
  const [selectedResto, setSelectedResto] = useState('all'); // 'all' | 'with_resto' | 'no_resto'

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);

  // Modal Fiche Pèlerin (View / Edit)
  const [selectedPelerin, setSelectedPelerin] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSavingPelerin, setIsSavingPelerin] = useState(false);
  const [pelerinFormData, setPelerinFormData] = useState({
    id: '',
    nom: '',
    prenom: '',
    sexe: 'H',
    date_naissance: '',
    num_passeport: '',
    date_expiration_passeport: '',
    nationalite: 'Algérienne',
    telephone: '',
    photo_url: '',
    num_visa: '',
    notes: ''
  });
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [grpRes, enrRes, paiRes, hotRes, agencyRes, pelRes] = await Promise.all([
        supabase.from('omra_groupes').select('*').order('created_at', { ascending: false }),
        supabase.from('omra_enregistrements').select('*'),
        supabase.from('omra_paiements').select('*'),
        supabase.from('hotels').select('*'),
        supabase.from('agency_settings').select('*').single(),
        supabase.from('pelerins').select('*').then(res => res, () => ({ data: [] }))
      ]);

      if (grpRes.data) setGroupes(grpRes.data);
      if (enrRes.data) setEnregistrements(enrRes.data);
      if (paiRes.data) setPaiements(paiRes.data);
      if (hotRes.data) setHotels(hotRes.data);
      if (agencyRes?.data) setAgencySettings(agencyRes.data);
      if (pelRes?.data) setPelerinsTableData(pelRes.data);
    } catch (err) {
      console.error('Erreur lors du chargement des données pèlerins:', err);
    } finally {
      setLoading(false);
    }
  };

  const getHotelName = (hId) => {
    if (!hId) return 'Hôtel non défini';
    const h = hotels.find(x => x.id === hId || x.nom === hId || (typeof hId === 'string' && (hId.includes(x.nom) || x.nom.includes(hId))));
    if (h) return h.nom;
    return typeof hId === 'string' ? hId.replace(/undefined\s*étoiles/gi, '').trim() : hId;
  };

  // Build the complete list of pilgrims across all records with rich pelerins table details
  const allPelerinsList = useMemo(() => {
    const list = [];

    enregistrements.forEach((enr) => {
      const groupe = groupes.find(g => g.id === enr.groupe_id);
      const enrHotelConfig = groupe?.hotels?.find(h => 
        h.hotelId === enr.hotel_id || 
        h.id === enr.hotel_id || 
        (typeof enr.hotel_id === 'string' && typeof h.hotelId === 'string' && (enr.hotel_id.includes(h.hotelId) || h.hotelId.includes(enr.hotel_id))) ||
        (typeof enr.hotel_id === 'string' && typeof h.location === 'string' && enr.hotel_id.toLowerCase().includes(h.location.toLowerCase()))
      ) || groupe?.hotels?.[0];
      
      const enrPaiements = paiements.filter(p => p.enregistrement_id === enr.id);
      const totalEnrPaid = enrPaiements.reduce((sum, p) => sum + (Number(p.montant_dzd) || 0), 0);
      let remainingPayment = totalEnrPaid;

      const pelerinsFromEnr = [
        ...(enr.pelerins || []).map(p => ({ ...p, isEnfantSansLit: false })),
        ...(enr.enfants_sans_lit || []).map(enf => ({ ...enf, tarifPerso: enf.tarif, chd: true, isEnfantSansLit: true }))
      ];

      const passagersAdultes = pelerinsFromEnr.filter(p => !p.guide && !p.chd && !p.isEnfantSansLit);
      const reductionPartagee = passagersAdultes.length > 0 ? Number(enr.reduction || 0) / passagersAdultes.length : 0;

      pelerinsFromEnr.forEach((pelerin, pIdx) => {
        if (!pelerin.nom || pelerin.nom.trim() === '') return;

        // Try to find matching master profile from pelerins table
        const masterProfile = pelerinsTableData.find(pel => 
          (pelerin.pelerin_id && pel.id === pelerin.pelerin_id) ||
          (pel.nom && pel.nom.trim().toLowerCase() === pelerin.nom.trim().toLowerCase())
        );

        const isAdult = !pelerin.guide && !pelerin.chd && !pelerin.isEnfantSansLit;
        const tarifLit = pelerin.guide 
          ? 0 
          : (pelerin.isEnfantSansLit 
              ? Number(pelerin.tarifPerso || 0) 
              : (pelerin.tarifPerso ? Number(pelerin.tarifPerso) : (Number(enrHotelConfig?.[CHAMBRE_KEYS[enr.type_chambre]]) || 0)));
        
        let reduction = (pelerin.guide || !pelerin.chd || pelerin.isEnfantSansLit) ? 0 : (Number(enrHotelConfig?.reductionChd) || 0);
        if (isAdult) reduction += reductionPartagee;
        
        const extraCosts = (pelerin.restauration && !pelerin.guide && !pelerin.isEnfantSansLit) ? Number(enrHotelConfig?.restauration || 0) : 0;
        const commission = (pelerin.guide || pelerin.isEnfantSansLit) ? 0 : Number(enr.commission_custom || 0);
        
        let totalDu = tarifLit - reduction + extraCosts;
        if (enr.paiement_rabatteur) {
          totalDu -= commission;
        }
        totalDu = Math.max(0, totalDu);

        const totalPaye = Math.min(totalDu, remainingPayment);
        remainingPayment -= totalPaye;

        const reste = totalDu - totalPaye;

        let etat = 'pending';
        if (reste === 0 && totalDu > 0) etat = 'payé';
        else if (totalDu === 0 && reste === 0) etat = 'payé';
        else if (totalPaye > 0) etat = 'versement';

        const rawNom = masterProfile?.nom || pelerin.nom;
        const rawPrenom = masterProfile?.prenom || '';
        const fullName = rawPrenom ? `${rawNom} ${rawPrenom}` : rawNom;

        list.push({
          id: `${enr.id}-${pIdx}`,
          pelerin_id: masterProfile?.id || pelerin.pelerin_id || null,
          enrId: enr.id,
          groupeId: enr.groupe_id,
          groupeNom: groupe?.nom || 'Groupe sans nom',
          groupeDateDepart: groupe?.date_depart || '—',
          groupeDateRetour: groupe?.date_retour || '—',
          groupeCompagnie: groupe?.compagnie || '—',
          hotelId: enr.hotel_id,
          hotelNom: getHotelName(enr.hotel_id),
          chambreId: enr.chambre_id ? `Chambre N°${enr.chambre_id}` : 'Non attribuée',
          typeChambre: enr.type_chambre || '—',
          telephone: masterProfile?.telephone || enr.telephone || pelerin.tel || '—',
          nom: rawNom,
          prenom: rawPrenom,
          fullName,
          passport: masterProfile?.num_passeport || pelerin.num_passeport || pelerin.passport || '—',
          dateExpirationPassport: masterProfile?.date_expiration_passeport || null,
          dateNaissance: masterProfile?.date_naissance || null,
          nationalite: masterProfile?.nationalite || 'Algérienne',
          photoUrl: masterProfile?.photo_url || null,
          numVisa: masterProfile?.num_visa || '',
          notes: masterProfile?.notes || '',
          sexe: masterProfile?.sexe || pelerin.sexe || 'H',
          isAdult,
          isChd: pelerin.chd && !pelerin.isEnfantSansLit,
          isEnfantSansLit: !!pelerin.isEnfantSansLit,
          isGuide: !!pelerin.guide,
          restauration: !!pelerin.restauration,
          tarifLit,
          tarifResto: extraCosts,
          reduction,
          commission,
          totalDu,
          totalPaye,
          reste,
          etat
        });
      });
    });

    return list;
  }, [enregistrements, groupes, paiements, hotels, pelerinsTableData]);

  // Apply Search & Filters
  const filteredPelerins = useMemo(() => {
    return allPelerinsList.filter(p => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesNom = p.fullName.toLowerCase().includes(q);
        const matchesGroupe = p.groupeNom.toLowerCase().includes(q);
        const matchesChambre = p.chambreId.toLowerCase().includes(q);
        const matchesPassport = p.passport.toLowerCase().includes(q);
        const matchesTel = p.telephone.toLowerCase().includes(q);
        if (!matchesNom && !matchesGroupe && !matchesChambre && !matchesPassport && !matchesTel) {
          return false;
        }
      }

      // Groupe Filter
      if (selectedGroupeId !== 'all' && p.groupeId !== selectedGroupeId) {
        return false;
      }

      // Hotel Filter
      if (selectedHotelId !== 'all') {
        const selectedHotel = hotels.find(h => h.id === selectedHotelId);
        const matchesId = p.hotelId === selectedHotelId;
        const matchesName = selectedHotel && (
          (typeof p.hotelId === 'string' && p.hotelId.toLowerCase().includes(selectedHotel.nom.toLowerCase())) ||
          p.hotelNom === selectedHotel.nom
        );
        if (!matchesId && !matchesName) return false;
      }

      // Genre Filter
      if (selectedGenre !== 'all' && p.sexe !== selectedGenre) {
        return false;
      }

      // Category Filter
      if (selectedCategory === 'adulte' && !p.isAdult) return false;
      if (selectedCategory === 'chd' && !p.isChd) return false;
      if (selectedCategory === 'sans_lit' && !p.isEnfantSansLit) return false;
      if (selectedCategory === 'guide' && !p.isGuide) return false;

      // Payment Status Filter
      if (selectedPaymentStatus !== 'all' && p.etat !== selectedPaymentStatus) {
        return false;
      }

      // Resto Filter
      if (selectedResto === 'with_resto' && !p.restauration) return false;
      if (selectedResto === 'no_resto' && p.restauration) return false;

      return true;
    });
  }, [allPelerinsList, searchQuery, selectedGroupeId, selectedHotelId, selectedGenre, selectedCategory, selectedPaymentStatus, selectedResto]);

  // KPIs
  const kpis = useMemo(() => {
    const total = filteredPelerins.length;
    const hommes = filteredPelerins.filter(p => p.sexe === 'H').length;
    const femmes = filteredPelerins.filter(p => p.sexe === 'F').length;
    const adultes = filteredPelerins.filter(p => p.isAdult).length;
    const chd = filteredPelerins.filter(p => p.isChd).length;
    const sansLit = filteredPelerins.filter(p => p.isEnfantSansLit).length;
    const guides = filteredPelerins.filter(p => p.isGuide).length;

    const totalDu = filteredPelerins.reduce((s, p) => s + p.totalDu, 0);
    const totalPaye = filteredPelerins.reduce((s, p) => s + p.totalPaye, 0);
    const totalReste = filteredPelerins.reduce((s, p) => s + p.reste, 0);
    const payesCount = filteredPelerins.filter(p => p.etat === 'payé').length;

    const recouvrementRate = totalDu > 0 ? Math.round((totalPaye / totalDu) * 100) : 100;

    return {
      total,
      hommes,
      femmes,
      adultes,
      chd,
      sansLit,
      guides,
      totalDu,
      totalPaye,
      totalReste,
      payesCount,
      recouvrementRate
    };
  }, [filteredPelerins]);

  // Pagination Slice
  const totalPages = Math.ceil(filteredPelerins.length / itemsPerPage) || 1;
  const paginatedPelerins = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredPelerins.slice(start, start + itemsPerPage);
  }, [filteredPelerins, currentPage, itemsPerPage]);

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedGroupeId('all');
    setSelectedHotelId('all');
    setSelectedGenre('all');
    setSelectedCategory('all');
    setSelectedPaymentStatus('all');
    setSelectedResto('all');
    setCurrentPage(1);
  };

  const hasActiveFilters = searchQuery !== '' || selectedGroupeId !== 'all' || selectedHotelId !== 'all' || selectedGenre !== 'all' || selectedCategory !== 'all' || selectedPaymentStatus !== 'all' || selectedResto !== 'all';

  // Open Fiche Pèlerin Modal
  const handleOpenFichePelerin = (pelerin) => {
    setSelectedPelerin(pelerin);
    setPelerinFormData({
      id: pelerin.pelerin_id || '',
      nom: pelerin.nom || '',
      prenom: pelerin.prenom || '',
      sexe: pelerin.sexe || 'H',
      date_naissance: pelerin.dateNaissance || '',
      num_passeport: pelerin.passport !== '—' ? pelerin.passport : '',
      date_expiration_passeport: pelerin.dateExpirationPassport || '',
      nationalite: pelerin.nationalite || 'Algérienne',
      telephone: pelerin.telephone !== '—' ? pelerin.telephone : '',
      photo_url: pelerin.photoUrl || '',
      num_visa: pelerin.numVisa || '',
      notes: pelerin.notes || ''
    });
    setIsModalOpen(true);
  };

  // Upload Photo / Passport Scan to Supabase storage
  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingPhoto(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `pelerins/${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('agency-media')
        .upload(fileName, file, { upsert: true });

      if (uploadError) {
        alert("Erreur lors de l'upload: " + uploadError.message);
      } else {
        const { data: publicUrlData } = supabase.storage
          .from('agency-media')
          .getPublicUrl(fileName);

        setPelerinFormData(prev => ({ ...prev, photo_url: publicUrlData.publicUrl }));
      }
    } catch (err) {
      console.error(err);
      alert("Erreur lors de l'envoi de la photo.");
    } finally {
      setUploadingPhoto(false);
    }
  };

  // Save Fiche Pèlerin (Upsert into 'pelerins' table)
  const handleSavePelerin = async (e) => {
    e.preventDefault();
    if (!pelerinFormData.nom.trim()) {
      alert('Le nom du pèlerin est obligatoire.');
      return;
    }

    setIsSavingPelerin(true);
    try {
      const pelerinId = pelerinFormData.id || (crypto.randomUUID ? crypto.randomUUID() : `p_${Date.now()}`);

      const payload = {
        id: pelerinId,
        nom: pelerinFormData.nom.trim(),
        prenom: pelerinFormData.prenom.trim() || null,
        sexe: pelerinFormData.sexe || 'H',
        date_naissance: pelerinFormData.date_naissance || null,
        num_passeport: pelerinFormData.num_passeport.trim() || null,
        date_expiration_passeport: pelerinFormData.date_expiration_passeport || null,
        nationalite: pelerinFormData.nationalite || 'Algérienne',
        telephone: pelerinFormData.telephone.trim() || null,
        photo_url: pelerinFormData.photo_url || null,
        num_visa: pelerinFormData.num_visa.trim() || null,
        notes: pelerinFormData.notes.trim() || null,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase.from('pelerins').upsert(payload, { onConflict: 'id' });

      if (error) {
        alert("Erreur d'enregistrement: " + error.message);
      } else {
        // Update local pelerinsTableData state
        setPelerinsTableData(prev => {
          const exists = prev.some(p => p.id === pelerinId);
          if (exists) {
            return prev.map(p => p.id === pelerinId ? { ...p, ...payload } : p);
          }
          return [...prev, payload];
        });

        setIsModalOpen(false);
      }
    } catch (err) {
      console.error(err);
      alert("Erreur lors de l'enregistrement du pèlerin.");
    } finally {
      setIsSavingPelerin(false);
    }
  };

  // PDF Print Export
  const handlePrintPDF = () => {
    const exportDate = new Date().toLocaleDateString('fr-FR', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });

    const activeGroupName = selectedGroupeId !== 'all' 
      ? (groupes.find(g => g.id === selectedGroupeId)?.nom || 'Groupe sélectionné')
      : 'Tous les Groupes Omra';

    const agencyName = agencySettings?.nom_agence || 'EL-MOKHTAR VOYAGES & OMRA';
    const agencyPhone = agencySettings?.telephone || '';
    const agencyLogo = agencySettings?.logo_url || '';

    const rows = filteredPelerins.map((p, idx) => {
      let etatLabel = 'En attente';
      let etatBg = '#ef4444';
      if (p.etat === 'payé') {
        etatLabel = 'Payé';
        etatBg = '#16a34a';
      } else if (p.etat === 'versement') {
        etatLabel = 'Versement';
        etatBg = '#d97706';
      }

      const tags = [];
      if (p.isEnfantSansLit) tags.push('<span class="tag tag-purple">Sans Lit</span>');
      if (p.isChd) tags.push('<span class="tag tag-amber">CHD</span>');
      if (p.restauration) tags.push('<span class="tag tag-orange">Resto</span>');
      if (p.isGuide) tags.push('<span class="tag tag-blue">Guide</span>');

      return `
        <tr>
          <td style="text-align: center; color: #64748b; font-weight: bold;">${idx + 1}</td>
          <td>
            <div class="pax-name">${p.fullName}</div>
            <div style="font-size: 8.5px; color: #64748b;">${p.passport !== '—' ? 'Pass: ' + p.passport : ''} ${p.dateNaissance ? '&bull; Né(e): ' + p.dateNaissance : ''}</div>
            ${tags.length > 0 ? `<div class="tags-row">${tags.join(' ')}</div>` : ''}
          </td>
          <td style="text-align: center; font-weight: 600;">${p.sexe || 'H'}</td>
          <td>
            <b>${p.groupeNom}</b>
            <div style="font-size: 8.5px; color: #64748b;">${p.groupeDateDepart} &bull; ${p.groupeCompagnie}</div>
          </td>
          <td>
            <div>${p.hotelNom}</div>
            <div style="font-size: 8.5px; color: #64748b;">${p.chambreId} (${p.typeChambre})</div>
          </td>
          <td style="text-align: right;">${fmtDZD(p.tarifLit)}</td>
          <td style="text-align: right; color: #ea580c; font-weight: 500;">${p.tarifResto > 0 ? fmtDZD(p.tarifResto) : '0,00'}</td>
          <td style="text-align: right; color: #d97706;">${p.reduction > 0 ? '-' + fmtDZD(p.reduction) : '0,00'}</td>
          <td style="text-align: right; font-weight: 700; color: #1d4ed8; background-color: #eff6ff;">${fmtDZD(p.totalDu)}</td>
          <td style="text-align: right; font-weight: 700; color: #059669; background-color: #f0fdf4;">${fmtDZD(p.totalPaye)}</td>
          <td style="text-align: right; font-weight: 700; color: #dc2626; background-color: #fef2f2;">${fmtDZD(p.reste)}</td>
          <td style="text-align: center;">
            <span class="status-badge" style="background-color: ${etatBg};">${etatLabel}</span>
          </td>
        </tr>
      `;
    }).join('');

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Répertoire des Pèlerins - ${activeGroupName}</title>
          <style>
            @page { size: A4 landscape; margin: 8mm; }
            * { box-sizing: border-box; }
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
              font-size: 10.5px;
              color: #1e293b;
              margin: 0;
              padding: 12px;
              background: #ffffff;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              border-bottom: 2px solid #059669;
              padding-bottom: 10px;
              margin-bottom: 12px;
            }
            .header-left { display: flex; align-items: center; gap: 12px; }
            .logo { max-height: 45px; max-width: 130px; object-fit: contain; }
            .title {
              font-size: 17px;
              font-weight: 800;
              color: #065f46;
              margin: 0;
              text-transform: uppercase;
              letter-spacing: -0.5px;
            }
            .subtitle { font-size: 11px; color: #475569; margin-top: 2px; font-weight: 600; }
            .meta { text-align: right; font-size: 10px; color: #475569; line-height: 1.5; }
            .kpis {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 8px;
              margin-bottom: 12px;
            }
            .kpi-card {
              background: #f8fafc;
              border: 1px solid #e2e8f0;
              border-radius: 6px;
              padding: 6px 10px;
            }
            .kpi-label {
              font-size: 8px;
              text-transform: uppercase;
              color: #64748b;
              font-weight: 700;
              letter-spacing: 0.5px;
            }
            .kpi-value { font-size: 13px; font-weight: 800; margin-top: 2px; }
            table { width: 100%; border-collapse: collapse; font-size: 9.5px; margin-bottom: 12px; }
            th {
              background: #f1f5f9;
              color: #334155;
              padding: 5px 6px;
              font-weight: 700;
              text-transform: uppercase;
              font-size: 8.5px;
              border: 1px solid #cbd5e1;
              letter-spacing: 0.3px;
            }
            td { padding: 4px 6px; border: 1px solid #e2e8f0; vertical-align: middle; }
            tr { page-break-inside: avoid; }
            tr:nth-child(even) { background-color: #fafafa; }
            .pax-name { font-weight: 600; color: #0f172a; }
            .tags-row { margin-top: 1px; display: flex; gap: 2px; }
            .tag {
              display: inline-block;
              font-size: 7px;
              font-weight: 700;
              padding: 1px 3px;
              border-radius: 3px;
              text-transform: uppercase;
            }
            .tag-purple { background: #f3e8ff; color: #7e22ce; }
            .tag-amber { background: #fef3c7; color: #b45309; }
            .tag-orange { background: #ffedd5; color: #c2410c; }
            .tag-blue { background: #dbeafe; color: #1d4ed8; }
            .status-badge {
              display: inline-block;
              color: #ffffff;
              font-size: 7.5px;
              font-weight: 700;
              padding: 2px 4px;
              border-radius: 3px;
              text-transform: uppercase;
            }
            tfoot tr {
              background: #f1f5f9 !important;
              font-weight: 800;
              border-top: 2px solid #94a3b8;
            }
            tfoot td { padding: 6px; }
            .footer {
              margin-top: 15px;
              display: flex;
              justify-content: space-between;
              align-items: center;
              font-size: 8.5px;
              color: #94a3b8;
              border-top: 1px solid #e2e8f0;
              padding-top: 6px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="header-left">
              ${agencyLogo ? `<img src="${agencyLogo}" class="logo" alt="Logo" />` : ''}
              <div>
                <h1 class="title">RÉPERTOIRE DES PÈLERINS OMRA</h1>
                <div class="subtitle">${activeGroupName} &bull; ${filteredPelerins.length} pèlerin(s) listé(s)</div>
              </div>
            </div>
            <div class="meta">
              <div><b>Agence :</b> ${agencyName} ${agencyPhone ? `(${agencyPhone})` : ''}</div>
              <div><b>Document émis le :</b> ${exportDate}</div>
            </div>
          </div>

          <div class="kpis">
            <div class="kpi-card">
              <div class="kpi-label">Pèlerins Filtrés</div>
              <div class="kpi-value" style="color: #0f172a;">${kpis.total} <span style="font-size: 9px; font-weight: normal; color: #64748b;">(${kpis.hommes}H / ${kpis.femmes}F)</span></div>
            </div>
            <div class="kpi-card">
              <div class="kpi-label">Total Dû</div>
              <div class="kpi-value" style="color: #1d4ed8;">${fmtDZD(kpis.totalDu)} <span style="font-size: 9px; font-weight: normal;">DZD</span></div>
            </div>
            <div class="kpi-card">
              <div class="kpi-label">Total Encaissé</div>
              <div class="kpi-value" style="color: #059669;">${fmtDZD(kpis.totalPaye)} <span style="font-size: 9px; font-weight: normal;">DZD</span></div>
            </div>
            <div class="kpi-card">
              <div class="kpi-label">Reste à Recouvrer</div>
              <div class="kpi-value" style="color: #dc2626;">${fmtDZD(kpis.totalReste)} <span style="font-size: 9px; font-weight: normal;">DZD</span></div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 3%; text-align: center;">#</th>
                <th style="width: 22%;">Nom du Pèlerin</th>
                <th style="width: 4%; text-align: center;">Genre</th>
                <th style="width: 14%;">Groupe Omra</th>
                <th style="width: 13%;">Hôtel & Chambre</th>
                <th style="width: 8%; text-align: right;">Tarif Lit</th>
                <th style="width: 7%; text-align: right; color: #ea580c;">Restau</th>
                <th style="width: 7%; text-align: right;">Réduction</th>
                <th style="width: 8%; text-align: right;">Total Dû</th>
                <th style="width: 8%; text-align: right;">Total Payé</th>
                <th style="width: 8%; text-align: right;">Reste</th>
                <th style="width: 6%; text-align: center;">Etat</th>
              </tr>
            </thead>
            <tbody>
              ${rows || '<tr><td colspan="12" style="text-align: center; padding: 15px; color: #64748b;">Aucun pèlerin correspondant aux critères.</td></tr>'}
            </tbody>
            ${filteredPelerins.length > 0 ? `
            <tfoot>
              <tr>
                <td colspan="5" style="text-align: right; text-transform: uppercase;">TOTAUX (${filteredPelerins.length} pèlerins) :</td>
                <td style="text-align: right;">${fmtDZD(filteredPelerins.reduce((s, p) => s + p.tarifLit, 0))}</td>
                <td style="text-align: right; color: #ea580c;">${fmtDZD(filteredPelerins.reduce((s, p) => s + p.tarifResto, 0))}</td>
                <td style="text-align: right; color: #d97706;">-${fmtDZD(filteredPelerins.reduce((s, p) => s + p.reduction, 0))}</td>
                <td style="text-align: right; color: #1d4ed8; background-color: #dbeafe;">${fmtDZD(kpis.totalDu)}</td>
                <td style="text-align: right; color: #059669; background-color: #dcfce7;">${fmtDZD(kpis.totalPaye)}</td>
                <td style="text-align: right; color: #dc2626; background-color: #fee2e2;">${fmtDZD(kpis.totalReste)}</td>
                <td></td>
              </tr>
            </tfoot>
            ` : ''}
          </table>

          <div class="footer">
            <div>${agencyName} &bull; Répertoire Général des Pèlerins Omra</div>
            <div>Imprimé le ${exportDate}</div>
          </div>

          <script>
            window.onload = function() {
              setTimeout(function() { window.print(); }, 300);
            };
          </script>
        </body>
      </html>
    `;

    const printWindow = window.open('', '_blank', 'height=850,width=1200');
    if (!printWindow) {
      alert("Veuillez autoriser les popups pour imprimer la liste des pèlerins.");
      return;
    }
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  // CSV Export
  const handleExportCSV = () => {
    if (filteredPelerins.length === 0) {
      alert('Aucune donnée à exporter.');
      return;
    }

    const headers = [
      'Nom Complet', 'Nom', 'Prénom', 'Genre', 'Date de Naissance', 'Passeport', 'Expiration Passeport',
      'Nationalité', 'Téléphone', 'Catégorie', 'Groupe', 'Départ', 'Retour',
      'Compagnie', 'Hôtel', 'Chambre', 'Type Chambre',
      'Tarif Lit (DZD)', 'Tarif Restau (DZD)', 'Réduction (DZD)', 'Total Dû (DZD)', 'Total Payé (DZD)', 'Reste (DZD)', 'État Paiement'
    ];

    const rows = filteredPelerins.map(p => [
      `"${(p.fullName || '').replace(/"/g, '""')}"`,
      `"${(p.nom || '').replace(/"/g, '""')}"`,
      `"${(p.prenom || '').replace(/"/g, '""')}"`,
      `"${p.sexe || 'H'}"`,
      `"${p.dateNaissance || ''}"`,
      `"${p.passport !== '—' ? p.passport : ''}"`,
      `"${p.dateExpirationPassport || ''}"`,
      `"${p.nationalite || 'Algérienne'}"`,
      `"${p.telephone !== '—' ? p.telephone : ''}"`,
      `"${p.isGuide ? 'Guide' : (p.isEnfantSansLit ? 'Sans Lit' : (p.isChd ? 'CHD' : 'Adulte'))}"`,
      `"${(p.groupeNom || '').replace(/"/g, '""')}"`,
      `"${p.groupeDateDepart}"`,
      `"${p.groupeDateRetour}"`,
      `"${p.groupeCompagnie}"`,
      `"${(p.hotelNom || '').replace(/"/g, '""')}"`,
      `"${p.chambreId}"`,
      `"${p.typeChambre}"`,
      p.tarifLit,
      p.tarifResto,
      p.reduction,
      p.totalDu,
      p.totalPaye,
      p.reste,
      `"${p.etat}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `repertoire_pelerins_omra_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* ── Page Header ────────────────────────────────────────── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black tracking-tight flex items-center gap-3">
              <Users size={28} className="text-emerald-600" /> Répertoire des Pèlerins
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Vue centralisée et filtrable de tous les pèlerins inscrits sur l'ensemble des groupes Omra.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchData}
              disabled={loading}
              className="h-9 gap-1.5"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              Actualiser
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              className="h-9 gap-1.5"
            >
              <Download size={14} />
              Exporter Excel / CSV
            </Button>
            <Button
              size="sm"
              onClick={handlePrintPDF}
              className="h-9 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-sm"
            >
              <Printer size={14} />
              Imprimer / PDF
            </Button>
          </div>
        </div>

        {/* ── KPI Cards ─────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-l-4 border-l-emerald-500 shadow-sm">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Total Pèlerins</span>
                <div className="text-2xl font-black text-foreground">
                  {kpis.total} <span className="text-xs font-semibold text-muted-foreground font-normal">pax</span>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground pt-0.5">
                  <span className="text-blue-600 font-bold">{kpis.hommes} H</span> &bull; 
                  <span className="text-pink-600 font-bold">{kpis.femmes} F</span> &bull; 
                  <span>{kpis.chd + kpis.sansLit} Enfants</span>
                </div>
              </div>
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                <Users size={24} />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-blue-500 shadow-sm">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Total Dû</span>
                <div className="text-2xl font-black text-blue-700">
                  {fmtDZD(kpis.totalDu)} <span className="text-xs font-semibold text-muted-foreground font-normal">DZD</span>
                </div>
                <div className="text-[11px] text-muted-foreground">
                  {kpis.adultes} Adultes &bull; {kpis.guides} Guides
                </div>
              </div>
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                <CreditCard size={24} />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-emerald-600 shadow-sm">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Total Encaissé</span>
                <div className="text-2xl font-black text-emerald-600">
                  {fmtDZD(kpis.totalPaye)} <span className="text-xs font-semibold text-muted-foreground font-normal">DZD</span>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-emerald-700 font-semibold">
                  <CheckCircle2 size={12} />
                  <span>{kpis.payesCount} dossiers soldés ({kpis.recouvrementRate}%)</span>
                </div>
              </div>
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                <TrendingUp size={24} />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-rose-500 shadow-sm">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Reste à Recouvrer</span>
                <div className="text-2xl font-black text-rose-600">
                  {fmtDZD(kpis.totalReste)} <span className="text-xs font-semibold text-muted-foreground font-normal">DZD</span>
                </div>
                <div className="text-[11px] text-rose-600 font-medium">
                  {filteredPelerins.filter(p => p.reste > 0).length} pèlerins avec solde
                </div>
              </div>
              <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
                <AlertCircle size={24} />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── Search & Filter Panel ────────────────────────────────── */}
        <Card className="border shadow-sm">
          <CardContent className="p-4 space-y-3">
            {/* Search Bar */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <Input
                  placeholder="Rechercher par nom, prénom, passeport, téléphone, groupe ou chambre..."
                  value={searchQuery}
                  onChange={e => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="pl-9 h-10 bg-muted/20"
                />
              </div>

              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={resetFilters}
                  className="h-10 text-xs text-muted-foreground hover:text-foreground shrink-0"
                >
                  Réinitialiser
                </Button>
              )}
            </div>

            {/* Filter Dropdowns */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 pt-1">
              <div>
                <Label className="text-[11px] font-bold text-muted-foreground block mb-1">Groupe Omra</Label>
                <Select
                  value={selectedGroupeId}
                  onChange={e => { setSelectedGroupeId(e.target.value); setCurrentPage(1); }}
                  className="h-9 text-xs"
                >
                  <option value="all">Tous les groupes ({groupes.length})</option>
                  {groupes.map(g => (
                    <option key={g.id} value={g.id}>{g.nom}</option>
                  ))}
                </Select>
              </div>

              <div>
                <Label className="text-[11px] font-bold text-muted-foreground block mb-1">Hôtel</Label>
                <Select
                  value={selectedHotelId}
                  onChange={e => { setSelectedHotelId(e.target.value); setCurrentPage(1); }}
                  className="h-9 text-xs"
                >
                  <option value="all">Tous les hôtels</option>
                  {hotels.map(h => (
                    <option key={h.id} value={h.id}>{h.nom}</option>
                  ))}
                </Select>
              </div>

              <div>
                <Label className="text-[11px] font-bold text-muted-foreground block mb-1">Genre</Label>
                <Select
                  value={selectedGenre}
                  onChange={e => { setSelectedGenre(e.target.value); setCurrentPage(1); }}
                  className="h-9 text-xs"
                >
                  <option value="all">Tous les genres</option>
                  <option value="H">Hommes (H)</option>
                  <option value="F">Femmes (F)</option>
                </Select>
              </div>

              <div>
                <Label className="text-[11px] font-bold text-muted-foreground block mb-1">Catégorie</Label>
                <Select
                  value={selectedCategory}
                  onChange={e => { setSelectedCategory(e.target.value); setCurrentPage(1); }}
                  className="h-9 text-xs"
                >
                  <option value="all">Toutes catégories</option>
                  <option value="adulte">Adultes</option>
                  <option value="chd">CHD (avec lit)</option>
                  <option value="sans_lit">Enfants sans lit</option>
                  <option value="guide">Guides</option>
                </Select>
              </div>

              <div>
                <Label className="text-[11px] font-bold text-muted-foreground block mb-1">Restauration</Label>
                <Select
                  value={selectedResto}
                  onChange={e => { setSelectedResto(e.target.value); setCurrentPage(1); }}
                  className="h-9 text-xs"
                >
                  <option value="all">Toutes options</option>
                  <option value="with_resto">Avec Restauration</option>
                  <option value="no_resto">Sans Restauration</option>
                </Select>
              </div>

              <div>
                <Label className="text-[11px] font-bold text-muted-foreground block mb-1">État Paiement</Label>
                <Select
                  value={selectedPaymentStatus}
                  onChange={e => { setSelectedPaymentStatus(e.target.value); setCurrentPage(1); }}
                  className="h-9 text-xs"
                >
                  <option value="all">Tous les états</option>
                  <option value="payé">Soldé (Payé)</option>
                  <option value="versement">Versement Partiel</option>
                  <option value="pending">En attente (0 Payé)</option>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Pèlerins Table ────────────────────────────────────── */}
        <Card className="overflow-hidden border shadow-sm bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse">
              <thead className="bg-slate-100/80 text-slate-700 text-[11px] uppercase font-bold border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3.5 w-10 text-center">#</th>
                  <th className="px-4 py-3.5">Pèlerin</th>
                  <th className="px-4 py-3.5 text-center">Genre</th>
                  <th className="px-4 py-3.5">Identité & Passeport</th>
                  <th className="px-4 py-3.5">Groupe Omra</th>
                  <th className="px-4 py-3.5">Hôtel & Chambre</th>
                  <th className="px-4 py-3.5 text-right">Tarif Lit</th>
                  <th className="px-4 py-3.5 text-right text-orange-600">Tarif Restau</th>
                  <th className="px-4 py-3.5 text-right text-amber-600">Réduction</th>
                  <th className="px-4 py-3.5 text-right text-blue-700">Total Dû</th>
                  <th className="px-4 py-3.5 text-right text-emerald-700">Total Payé</th>
                  <th className="px-4 py-3.5 text-right text-rose-600">Reste</th>
                  <th className="px-4 py-3.5 text-center">État</th>
                  <th className="px-4 py-3.5 text-center w-20">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={14} className="px-4 py-16 text-center text-muted-foreground">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <RefreshCw size={24} className="animate-spin text-emerald-600" />
                        <span>Chargement des pèlerins...</span>
                      </div>
                    </td>
                  </tr>
                ) : paginatedPelerins.length === 0 ? (
                  <tr>
                    <td colSpan={14} className="px-4 py-16 text-center text-muted-foreground">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Users size={36} className="opacity-20 text-slate-400" />
                        <span className="font-semibold text-slate-700">Aucun pèlerin trouvé</span>
                        <span className="text-xs text-muted-foreground">Modifiez vos critères de recherche ou réinitialisez les filtres.</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedPelerins.map((p, index) => {
                    const rowNumber = (currentPage - 1) * itemsPerPage + index + 1;
                    const age = calculateAge(p.dateNaissance);

                    let etatBadgeClass = 'bg-rose-500 text-white';
                    let etatLabel = 'En attente';
                    if (p.etat === 'payé') {
                      etatBadgeClass = 'bg-emerald-500 text-white';
                      etatLabel = 'Soldé';
                    } else if (p.etat === 'versement') {
                      etatBadgeClass = 'bg-amber-500 text-white';
                      etatLabel = 'Versement';
                    }

                    return (
                      <tr key={p.id} className="hover:bg-slate-50/70 transition-colors group">
                        <td className="px-4 py-3 text-center text-xs text-slate-400 font-mono">
                          {rowNumber}
                        </td>

                        {/* Pèlerin Info & Avatar */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            {p.photoUrl ? (
                              <img 
                                src={p.photoUrl} 
                                alt={p.fullName} 
                                className="w-9 h-9 rounded-full object-cover border border-slate-200 shrink-0 shadow-sm"
                              />
                            ) : (
                              <div className={cn(
                                "w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0 shadow-sm",
                                p.sexe === 'F' ? "bg-pink-100 text-pink-700" : "bg-blue-100 text-blue-700"
                              )}>
                                {p.nom.charAt(0).toUpperCase()}
                              </div>
                            )}
                            <div>
                              <div 
                                onClick={() => handleOpenFichePelerin(p)}
                                className="font-bold text-slate-900 leading-snug hover:text-emerald-700 cursor-pointer hover:underline"
                              >
                                {p.fullName}
                              </div>
                              <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                                {p.isEnfantSansLit && (
                                  <span className="px-1.5 py-0.2 rounded bg-purple-100 text-purple-800 text-[9px] font-bold uppercase">Sans Lit</span>
                                )}
                                {p.isChd && (
                                  <span className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 text-[9px] font-bold uppercase">CHD</span>
                                )}
                                {p.restauration && (
                                  <span className="px-1.5 py-0.2 rounded bg-orange-100 text-orange-800 text-[9px] font-bold uppercase flex items-center gap-0.5">
                                    <Utensils size={8} /> Resto
                                  </span>
                                )}
                                {p.isGuide && (
                                  <span className="px-1.5 py-0.2 rounded bg-blue-100 text-blue-800 text-[9px] font-bold uppercase">Guide</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Genre */}
                        <td className="px-4 py-3 text-center">
                          <span className={cn(
                            "inline-flex items-center justify-center w-6 h-6 rounded-md font-bold text-xs",
                            p.sexe === 'F' ? "bg-pink-50 text-pink-700 border border-pink-200" : "bg-blue-50 text-blue-700 border border-blue-200"
                          )}>
                            {p.sexe || 'H'}
                          </span>
                        </td>

                        {/* Identité & Passeport */}
                        <td className="px-4 py-3">
                          <div className="space-y-0.5 text-xs">
                            {p.passport !== '—' ? (
                              <div className="font-mono font-semibold text-slate-800 flex items-center gap-1">
                                <FileText size={11} className="text-slate-400" />
                                <span>{p.passport}</span>
                              </div>
                            ) : (
                              <span className="text-slate-400 text-[11px] italic">Passeport non renseigné</span>
                            )}

                            {p.dateNaissance ? (
                              <div className="text-[11px] text-slate-500">
                                {p.dateNaissance} {age !== null ? `(${age} ans)` : ''}
                              </div>
                            ) : null}
                          </div>
                        </td>

                        {/* Groupe Omra */}
                        <td className="px-4 py-3">
                          <div 
                            onClick={() => navigate(`/omra/group/${p.groupeId}`)}
                            className="font-semibold text-slate-800 hover:text-emerald-700 hover:underline cursor-pointer flex items-center gap-1 group/grp"
                          >
                            <Globe size={13} className="text-emerald-600 shrink-0" />
                            <span className="truncate max-w-[140px]">{p.groupeNom}</span>
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1.5">
                            <Calendar size={11} /> {p.groupeDateDepart} &bull; <Plane size={11} /> {p.groupeCompagnie}
                          </div>
                        </td>

                        {/* Hôtel & Chambre */}
                        <td className="px-4 py-3">
                          <div className="font-medium text-slate-800 flex items-center gap-1">
                            <Building2 size={13} className="text-slate-400 shrink-0" />
                            <span className="truncate max-w-[130px]">{p.hotelNom}</span>
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5 font-medium">
                            {p.chambreId} <span className="text-slate-400 font-normal">({p.typeChambre})</span>
                          </div>
                        </td>

                        {/* Pricing Columns */}
                        <td className="px-4 py-3 text-right font-medium text-slate-700">
                          {fmtDZD(p.tarifLit)}
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-orange-600">
                          {p.tarifResto > 0 ? fmtDZD(p.tarifResto) : '—'}
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-amber-600">
                          {p.reduction > 0 ? `-${fmtDZD(p.reduction)}` : '—'}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-blue-700 bg-blue-50/20">
                          {fmtDZD(p.totalDu)}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-emerald-700 bg-emerald-50/20">
                          {fmtDZD(p.totalPaye)}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-rose-600 bg-rose-50/20">
                          {fmtDZD(p.reste)}
                        </td>

                        {/* État */}
                        <td className="px-4 py-3 text-center">
                          <span className={cn("px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider", etatBadgeClass)}>
                            {etatLabel}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => handleOpenFichePelerin(p)}
                              title="Modifier la fiche pèlerin (passeport, photo, naissance)"
                              className="h-7 w-7 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50"
                            >
                              <Edit size={14} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => navigate(`/omra/group/${p.groupeId}`)}
                              title="Ouvrir le groupe Omra"
                              className="h-7 w-7 text-slate-500 hover:text-blue-700 hover:bg-blue-50"
                            >
                              <ChevronRight size={15} />
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

          {/* ── Table Pagination ──────────────────────────────────── */}
          {!loading && filteredPelerins.length > 0 && (
            <div className="p-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <span>Affichage de <b>{(currentPage - 1) * itemsPerPage + 1}</b> à <b>{Math.min(currentPage * itemsPerPage, filteredPelerins.length)}</b> sur <b>{filteredPelerins.length}</b> pèlerin(s)</span>
                <Select
                  value={String(itemsPerPage)}
                  onChange={e => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="h-8 w-20 text-xs ml-2"
                >
                  <option value="25">25 / p.</option>
                  <option value="50">50 / p.</option>
                  <option value="100">100 / p.</option>
                  <option value="500">500 / p.</option>
                </Select>
              </div>

              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 px-2.5 text-xs"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  Précédent
                </Button>
                <div className="px-2 font-bold text-foreground">
                  Page {currentPage} / {totalPages}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 px-2.5 text-xs"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Suivant
                </Button>
              </div>
            </div>
          )}
        </Card>

        {/* ── Modal Fiche Pèlerin (View & Edit) ────────────────────────── */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                    <UserCheck size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-slate-900">Fiche d'Identité du Pèlerin</h3>
                    <p className="text-xs text-muted-foreground">Passeport, date de naissance, photo et informations personnelles.</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-full hover:bg-slate-200/60"
                >
                  <X size={18} />
                </Button>
              </div>

              {/* Modal Body */}
              <form onSubmit={handleSavePelerin} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto custom-scrollbar">
                {/* Photo & Basic Info Row */}
                <div className="flex flex-col sm:flex-row items-center gap-5 p-4 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="relative group shrink-0">
                    {pelerinFormData.photo_url ? (
                      <img 
                        src={pelerinFormData.photo_url} 
                        alt="Pèlerin" 
                        className="w-24 h-24 rounded-2xl object-cover border-2 border-emerald-500 shadow-md"
                      />
                    ) : (
                      <div className="w-24 h-24 rounded-2xl bg-slate-200 border border-slate-300 flex flex-col items-center justify-center text-slate-400 gap-1 shadow-inner">
                        <Camera size={24} />
                        <span className="text-[10px] font-medium">Photo</span>
                      </div>
                    )}
                    <label className="absolute inset-0 bg-black/40 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white cursor-pointer gap-1">
                      <Upload size={18} />
                      <span className="text-[10px] font-bold">Changer</span>
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handlePhotoUpload} 
                        className="hidden" 
                        disabled={uploadingPhoto}
                      />
                    </label>
                    {uploadingPhoto && (
                      <div className="absolute inset-0 bg-white/80 rounded-2xl flex items-center justify-center">
                        <RefreshCw size={20} className="animate-spin text-emerald-600" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 w-full space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs font-bold text-slate-700">Nom de Famille *</Label>
                        <Input
                          required
                          value={pelerinFormData.nom}
                          onChange={e => setPelerinFormData(p => ({ ...p, nom: e.target.value }))}
                          placeholder="Nom"
                          className="h-9 text-xs mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-xs font-bold text-slate-700">Prénom(s)</Label>
                        <Input
                          value={pelerinFormData.prenom}
                          onChange={e => setPelerinFormData(p => ({ ...p, prenom: e.target.value }))}
                          placeholder="Prénom"
                          className="h-9 text-xs mt-1"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs font-bold text-slate-700">Genre</Label>
                        <div className="flex items-center gap-2 mt-1">
                          <Button
                            type="button"
                            size="sm"
                            variant={pelerinFormData.sexe === 'H' ? 'default' : 'outline'}
                            onClick={() => setPelerinFormData(p => ({ ...p, sexe: 'H' }))}
                            className={cn("h-8 flex-1 text-xs font-bold", pelerinFormData.sexe === 'H' && "bg-blue-600 hover:bg-blue-700 text-white")}
                          >
                            Homme (H)
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant={pelerinFormData.sexe === 'F' ? 'default' : 'outline'}
                            onClick={() => setPelerinFormData(p => ({ ...p, sexe: 'F' }))}
                            className={cn("h-8 flex-1 text-xs font-bold", pelerinFormData.sexe === 'F' && "bg-pink-600 hover:bg-pink-700 text-white")}
                          >
                            Femme (F)
                          </Button>
                        </div>
                      </div>

                      <div>
                        <Label className="text-xs font-bold text-slate-700">Téléphone</Label>
                        <Input
                          value={pelerinFormData.telephone}
                          onChange={e => setPelerinFormData(p => ({ ...p, telephone: e.target.value }))}
                          placeholder="05 / 06 / 07..."
                          className="h-9 text-xs mt-1"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Passport & Dates Details */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs font-bold text-slate-700">N° de Passeport</Label>
                    <Input
                      value={pelerinFormData.num_passeport}
                      onChange={e => setPelerinFormData(p => ({ ...p, num_passeport: e.target.value }))}
                      placeholder="Ex: 219874563"
                      className="h-9 text-xs font-mono mt-1"
                    />
                  </div>

                  <div>
                    <Label className="text-xs font-bold text-slate-700">Date d'Expiration Passeport</Label>
                    <Input
                      type="date"
                      value={pelerinFormData.date_expiration_passeport}
                      onChange={e => setPelerinFormData(p => ({ ...p, date_expiration_passeport: e.target.value }))}
                      className="h-9 text-xs mt-1"
                    />
                  </div>

                  <div>
                    <Label className="text-xs font-bold text-slate-700">Date de Naissance</Label>
                    <Input
                      type="date"
                      value={pelerinFormData.date_naissance}
                      onChange={e => setPelerinFormData(p => ({ ...p, date_naissance: e.target.value }))}
                      className="h-9 text-xs mt-1"
                    />
                  </div>
                </div>

                {/* Nationality & Visa */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs font-bold text-slate-700">Nationalité</Label>
                    <Input
                      value={pelerinFormData.nationalite}
                      onChange={e => setPelerinFormData(p => ({ ...p, nationalite: e.target.value }))}
                      placeholder="Algérienne"
                      className="h-9 text-xs mt-1"
                    />
                  </div>

                  <div>
                    <Label className="text-xs font-bold text-slate-700">N° de Visa (Nusuk / Omra)</Label>
                    <Input
                      value={pelerinFormData.num_visa}
                      onChange={e => setPelerinFormData(p => ({ ...p, num_visa: e.target.value }))}
                      placeholder="Optionnel"
                      className="h-9 text-xs font-mono mt-1"
                    />
                  </div>
                </div>

                {/* Notes & Medical */}
                <div>
                  <Label className="text-xs font-bold text-slate-700">Notes & Informations Médicales</Label>
                  <textarea
                    rows={2}
                    value={pelerinFormData.notes}
                    onChange={e => setPelerinFormData(p => ({ ...p, notes: e.target.value }))}
                    placeholder="Remarques spécifiques, fauteuil roulant, régime alimentaire, etc."
                    className="w-full mt-1 p-2.5 rounded-lg border border-input text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white"
                  />
                </div>

                {/* Modal Footer */}
                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsModalOpen(false)}
                    disabled={isSavingPelerin}
                    className="h-9 text-xs"
                  >
                    Annuler
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSavingPelerin}
                    className="h-9 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-1.5 shadow-sm"
                  >
                    {isSavingPelerin ? (
                      <>
                        <RefreshCw size={14} className="animate-spin" />
                        Enregistrement...
                      </>
                    ) : (
                      <>
                        <Check size={14} />
                        Enregistrer la Fiche
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Pelerins;
