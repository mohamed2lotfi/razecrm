import React, { useState, useEffect, useMemo } from 'react';
import { 
  Stamp, Plane, Building, Plus, Search, Trash2, Edit3, 
  RefreshCw, AlertCircle, CheckCircle2, Copy, Check,
  Layers, Users, DollarSign, Bus,
  ShieldAlert, ShieldCheck, ArrowUpDown, Download
} from 'lucide-react';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

export default function OmraTracking() {
  const { isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState('visas'); // 'visas' | 'billets' | 'diwan'

  // Master Data
  const [omraGroups, setOmraGroups] = useState([]);
  const [compagnies, setCompagnies] = useState([]);
  const [, setLoadingMaster] = useState(true);

  // Tab 1: Visas
  const [visas, setVisas] = useState([]);
  const [loadingVisas, setLoadingVisas] = useState(true);
  const [visasSearch, setVisasSearch] = useState('');
  const [visasFilterType, setVisasFilterType] = useState('all'); // all | libre | groupe
  const [visasFilterGroup, setVisasFilterGroup] = useState('all');
  const [isVisaModalOpen, setIsVisaModalOpen] = useState(false);
  const [editingVisa, setEditingVisa] = useState(null);
  const [visaForm, setVisaForm] = useState({
    type: 'groupe', // 'libre' | 'groupe'
    groupe_id: '',
    nusuk_group_no: '',
    date_emission: new Date().toISOString().split('T')[0],
    tarif_total_sar: '',
    avec_transport: false,
    frais_transport_sar: '',
    nbr_visas: '',
    description: ''
  });

  // Tab 2: Billets
  const [billets, setBillets] = useState([]);
  const [loadingBillets, setLoadingBillets] = useState(true);
  const [billetsSearch, setBilletsSearch] = useState('');
  const [billetsFilterCompagnie, setBilletsFilterCompagnie] = useState('all');
  const [isBilletModalOpen, setIsBilletModalOpen] = useState(false);
  const [editingBillet, setEditingBillet] = useState(null);
  const [billetForm, setBilletForm] = useState({
    date_vol: new Date().toISOString().split('T')[0],
    compagnie_id: '',
    compagnie_nom: '',
    pnr: '',
    adt_count: '',
    chd_count: '',
    inf_count: '',
    tarif_adt: '',
    tarif_chd: '',
    tarif_inf: '',
    groupe_id: '',
    description: ''
  });

  // Tab 3: Diwan
  const [diwanList, setDiwanList] = useState([]);
  const [loadingDiwan, setLoadingDiwan] = useState(true);
  const [diwanSearch, setDiwanSearch] = useState('');
  const [diwanFilterGroup, setDiwanFilterGroup] = useState('all');
  const [diwanFilterStatut, setDiwanFilterStatut] = useState('all');
  const [isDiwanModalOpen, setIsDiwanModalOpen] = useState(false);
  const [editingDiwan, setEditingDiwan] = useState(null);
  const [diwanForm, setDiwanForm] = useState({
    nom_groupe: '',
    groupe_id: '',
    adt_count: '',
    chd_count: '',
    tarif_par_assafir: 5000,
    tarif_total: 0,
    statut: 'DÉCLARÉ',
    date_declaration: new Date().toISOString().split('T')[0],
    description: ''
  });

  // Global SQL table missing warning
  const [sqlErrorNotice, setSqlErrorNotice] = useState(null);
  const [copiedSql, setCopiedSql] = useState(false);
  const [saving, setSaving] = useState(false);

  // Fetch Master Data
  const fetchMasterData = async () => {
    setLoadingMaster(true);
    try {
      const [gRes, cRes] = await Promise.all([
        supabase.from('omra_groupes').select('id, nom, code, date_depart').order('date_depart', { ascending: false }),
        supabase.from('compagnies_aeriennes').select('id, nom, code').order('nom')
      ]);
      if (gRes.data) setOmraGroups(gRes.data);
      if (cRes.data) setCompagnies(cRes.data);
    } catch (err) {
      console.error('Error fetching master data:', err);
    } finally {
      setLoadingMaster(false);
    }
  };

  // Fetch Visas
  const fetchVisas = async () => {
    setLoadingVisas(true);
    try {
      const { data, error } = await supabase
        .from('omra_tracking_visas')
        .select('*')
        .order('date_emission', { ascending: false });
      if (error) {
        if (error.code === '42P01' || error.message?.includes('does not exist')) {
          setSqlErrorNotice('omra_tracking_visas');
        }
        setVisas([]);
      } else {
        setVisas(data || []);
      }
    } catch (err) {
      console.error('Fetch visas error:', err);
    } finally {
      setLoadingVisas(false);
    }
  };

  // Fetch Billets
  const fetchBillets = async () => {
    setLoadingBillets(true);
    try {
      const { data, error } = await supabase
        .from('omra_tracking_billets')
        .select('*')
        .order('date_vol', { ascending: false });
      if (error) {
        if (error.code === '42P01' || error.message?.includes('does not exist')) {
          setSqlErrorNotice('omra_tracking_billets');
        }
        setBillets([]);
      } else {
        setBillets(data || []);
      }
    } catch (err) {
      console.error('Fetch billets error:', err);
    } finally {
      setLoadingBillets(false);
    }
  };

  // Fetch Diwan
  const fetchDiwan = async () => {
    setLoadingDiwan(true);
    try {
      const { data, error } = await supabase
        .from('omra_tracking_diwan')
        .select('*')
        .order('date_declaration', { ascending: false });
      if (error) {
        if (error.code === '42P01' || error.message?.includes('does not exist')) {
          setSqlErrorNotice('omra_tracking_diwan');
        }
        setDiwanList([]);
      } else {
        setDiwanList(data || []);
      }
    } catch (err) {
      console.error('Fetch diwan error:', err);
    } finally {
      setLoadingDiwan(false);
    }
  };

  useEffect(() => {
    fetchMasterData();
    fetchVisas();
    fetchBillets();
    fetchDiwan();
  }, []);

  // Computed Values - Visas
  const filteredVisas = useMemo(() => {
    return visas.filter(v => {
      const matchSearch = 
        !visasSearch || 
        (v.nusuk_group_no && v.nusuk_group_no.toLowerCase().includes(visasSearch.toLowerCase())) ||
        (v.groupe_nom && v.groupe_nom.toLowerCase().includes(visasSearch.toLowerCase())) ||
        (v.description && v.description.toLowerCase().includes(visasSearch.toLowerCase()));

      const matchType = visasFilterType === 'all' || v.type === visasFilterType;
      const matchGroup = visasFilterGroup === 'all' || v.groupe_id === visasFilterGroup;

      return matchSearch && matchType && matchGroup;
    });
  }, [visas, visasSearch, visasFilterType, visasFilterGroup]);

  const visaStats = useMemo(() => {
    const totalCount = visas.length;
    const countGroupe = visas.filter(v => v.type === 'groupe').length;
    const countLibre = visas.filter(v => v.type === 'libre').length;
    const totalSAR = visas.reduce((sum, v) => sum + (Number(v.tarif_total_sar) || 0), 0);
    const totalTransportSAR = visas.reduce((sum, v) => sum + (v.avec_transport ? (Number(v.frais_transport_sar) || 0) : 0), 0);
    const totalVisasCount = visas.reduce((sum, v) => sum + (Number(v.nbr_visas) || 0), 0);

    return { totalCount, countGroupe, countLibre, totalSAR, totalTransportSAR, totalVisasCount };
  }, [visas]);

  // Computed Values - Billets
  const computedBilletFormTotal = useMemo(() => {
    const adt = Number(billetForm.adt_count) || 0;
    const chd = Number(billetForm.chd_count) || 0;
    const inf = Number(billetForm.inf_count) || 0;
    const tAdt = Number(billetForm.tarif_adt) || 0;
    const tChd = Number(billetForm.tarif_chd) || 0;
    const tInf = Number(billetForm.tarif_inf) || 0;

    const totalPlaces = adt + chd + inf;
    const totalCost = (adt * tAdt) + (chd * tChd) + (inf * tInf);

    return { totalPlaces, totalCost };
  }, [billetForm]);

  const filteredBillets = useMemo(() => {
    return billets.filter(b => {
      const matchSearch = 
        !billetsSearch || 
        (b.pnr && b.pnr.toLowerCase().includes(billetsSearch.toLowerCase())) ||
        (b.compagnie_nom && b.compagnie_nom.toLowerCase().includes(billetsSearch.toLowerCase())) ||
        (b.groupe_nom && b.groupe_nom.toLowerCase().includes(billetsSearch.toLowerCase())) ||
        (b.description && b.description.toLowerCase().includes(billetsSearch.toLowerCase()));

      const matchCompagnie = billetsFilterCompagnie === 'all' || b.compagnie_nom === billetsFilterCompagnie;

      return matchSearch && matchCompagnie;
    });
  }, [billets, billetsSearch, billetsFilterCompagnie]);

  const billetStats = useMemo(() => {
    const totalBlocks = billets.length;
    const totalPlaces = billets.reduce((sum, b) => sum + (Number(b.total_places) || (Number(b.adt_count) + Number(b.chd_count) + Number(b.inf_count)) || 0), 0);
    const totalADT = billets.reduce((sum, b) => sum + (Number(b.adt_count) || 0), 0);
    const totalCHD = billets.reduce((sum, b) => sum + (Number(b.chd_count) || 0), 0);
    const totalINF = billets.reduce((sum, b) => sum + (Number(b.inf_count) || 0), 0);
    const totalDZD = billets.reduce((sum, b) => sum + (Number(b.tarif_total) || 0), 0);

    return { totalBlocks, totalPlaces, totalADT, totalCHD, totalINF, totalDZD };
  }, [billets]);

  // Computed Values - Diwan
  const computedDiwanFormTotal = useMemo(() => {
    const adt = Number(diwanForm.adt_count) || 0;
    const chd = Number(diwanForm.chd_count) || 0;
    const unit = Number(diwanForm.tarif_par_assafir) || 0;
    const totalAssafers = adt + chd;
    const totalCost = adt * unit; // Montant total = 5000 DZD * ADT

    return { totalAssafers, totalCost };
  }, [diwanForm.adt_count, diwanForm.chd_count, diwanForm.tarif_par_assafir]);

  const filteredDiwan = useMemo(() => {
    return diwanList.filter(d => {
      const matchSearch = 
        !diwanSearch || 
        (d.nom_groupe && d.nom_groupe.toLowerCase().includes(diwanSearch.toLowerCase())) ||
        (d.groupe_nom && d.groupe_nom.toLowerCase().includes(diwanSearch.toLowerCase())) ||
        (d.description && d.description.toLowerCase().includes(diwanSearch.toLowerCase()));

      const matchGroup = diwanFilterGroup === 'all' || d.groupe_id === diwanFilterGroup;
      const matchStatut = diwanFilterStatut === 'all' || d.statut === diwanFilterStatut;

      return matchSearch && matchGroup && matchStatut;
    });
  }, [diwanList, diwanSearch, diwanFilterGroup, diwanFilterStatut]);

  const diwanStats = useMemo(() => {
    const totalGroups = diwanList.length;
    const totalADT = diwanList.reduce((sum, d) => sum + (Number(d.adt_count) || (Number(d.nombre_assafers) > 0 && d.chd_count === undefined ? Number(d.nombre_assafers) : 0) || 0), 0);
    const totalCHD = diwanList.reduce((sum, d) => sum + (Number(d.chd_count) || 0), 0);
    const totalAssafers = diwanList.reduce((sum, d) => sum + (Number(d.nombre_assafers) || (Number(d.adt_count) + Number(d.chd_count)) || 0), 0);
    const totalDZD = diwanList.reduce((sum, d) => sum + (Number(d.tarif_total) || 0), 0);
    const declaredCount = diwanList.filter(d => d.statut === 'DÉCLARÉ' || d.statut === 'VALIDÉ').length;

    return { totalGroups, totalADT, totalCHD, totalAssafers, totalDZD, declaredCount };
  }, [diwanList]);

  // Helper Copy SQL notification
  const handleCopySqlNotice = () => {
    navigator.clipboard.writeText(`Veuillez exécuter le script SQL "create_omra_tracking_tables.sql" dans l'éditeur SQL de votre console Supabase.`);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 3000);
  };

  // ==========================================
  // TAB 1: VISAS HANDLERS
  // ==========================================
  const handleOpenVisaModal = (visa = null) => {
    if (visa) {
      setEditingVisa(visa);
      setVisaForm({
        type: visa.type || 'groupe',
        groupe_id: visa.groupe_id || '',
        nusuk_group_no: visa.nusuk_group_no || '',
        date_emission: visa.date_emission || new Date().toISOString().split('T')[0],
        tarif_total_sar: visa.tarif_total_sar ?? '',
        avec_transport: !!visa.avec_transport,
        frais_transport_sar: visa.frais_transport_sar ?? '',
        nbr_visas: visa.nbr_visas ?? '',
        description: visa.description || ''
      });
    } else {
      setEditingVisa(null);
      setVisaForm({
        type: 'groupe',
        groupe_id: omraGroups[0]?.id || '',
        nusuk_group_no: '',
        date_emission: new Date().toISOString().split('T')[0],
        tarif_total_sar: '',
        avec_transport: false,
        frais_transport_sar: '',
        nbr_visas: '',
        description: ''
      });
    }
    setIsVisaModalOpen(true);
  };

  const handleSaveVisa = async (e) => {
    e.preventDefault();
    if (!visaForm.nusuk_group_no) {
      alert('Veuillez renseigner le numéro de groupe Nusuk.');
      return;
    }

    setSaving(true);
    try {
      const selectedGroup = omraGroups.find(g => g.id === visaForm.groupe_id);
      const payload = {
        type: visaForm.type,
        groupe_id: visaForm.type === 'groupe' && visaForm.groupe_id ? visaForm.groupe_id : null,
        groupe_nom: visaForm.type === 'groupe' && selectedGroup ? selectedGroup.nom : null,
        nusuk_group_no: visaForm.nusuk_group_no.trim(),
        date_emission: visaForm.date_emission,
        tarif_total_sar: Number(visaForm.tarif_total_sar) || 0,
        avec_transport: !!visaForm.avec_transport,
        frais_transport_sar: visaForm.avec_transport ? (Number(visaForm.frais_transport_sar) || 0) : 0,
        nbr_visas: Number(visaForm.nbr_visas) || 0,
        description: visaForm.description?.trim() || null,
        updated_at: new Date().toISOString()
      };

      if (editingVisa) {
        const { error } = await supabase
          .from('omra_tracking_visas')
          .update(payload)
          .eq('id', editingVisa.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('omra_tracking_visas')
          .insert([payload]);
        if (error) throw error;
      }

      setIsVisaModalOpen(false);
      fetchVisas();
    } catch (err) {
      console.error('Error saving visa:', err);
      alert('Erreur lors de la sauvegarde : ' + (err.message || 'Vérifiez la table SQL'));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteVisa = async (id, nusukNo) => {
    if (!window.confirm(`Supprimer définitivement le groupe visa Nusuk "${nusukNo}" ?`)) return;
    try {
      const { error } = await supabase.from('omra_tracking_visas').delete().eq('id', id);
      if (error) throw error;
      fetchVisas();
    } catch (err) {
      alert('Erreur suppression : ' + err.message);
    }
  };

  // ==========================================
  // TAB 2: BILLETS HANDLERS
  // ==========================================
  const handleOpenBilletModal = (billet = null) => {
    if (billet) {
      setEditingBillet(billet);
      setBilletForm({
        date_vol: billet.date_vol || new Date().toISOString().split('T')[0],
        compagnie_id: billet.compagnie_id || '',
        compagnie_nom: billet.compagnie_nom || '',
        pnr: billet.pnr || '',
        adt_count: billet.adt_count ?? '',
        chd_count: billet.chd_count ?? '',
        inf_count: billet.inf_count ?? '',
        tarif_adt: billet.tarif_adt ?? '',
        tarif_chd: billet.tarif_chd ?? '',
        tarif_inf: billet.tarif_inf ?? '',
        groupe_id: billet.groupe_id || '',
        description: billet.description || ''
      });
    } else {
      setEditingBillet(null);
      setBilletForm({
        date_vol: new Date().toISOString().split('T')[0],
        compagnie_id: compagnies[0]?.id || '',
        compagnie_nom: compagnies[0]?.nom || '',
        pnr: '',
        adt_count: '',
        chd_count: '',
        inf_count: '',
        tarif_adt: '',
        tarif_chd: '',
        tarif_inf: '',
        groupe_id: '',
        description: ''
      });
    }
    setIsBilletModalOpen(true);
  };

  const handleSaveBillet = async (e) => {
    e.preventDefault();
    if (!billetForm.pnr || !billetForm.compagnie_nom) {
      alert('Veuillez renseigner le PNR et la compagnie aérienne.');
      return;
    }

    setSaving(true);
    try {
      const selectedGroup = omraGroups.find(g => g.id === billetForm.groupe_id);
      const adt = Number(billetForm.adt_count) || 0;
      const chd = Number(billetForm.chd_count) || 0;
      const inf = Number(billetForm.inf_count) || 0;
      const tAdt = Number(billetForm.tarif_adt) || 0;
      const tChd = Number(billetForm.tarif_chd) || 0;
      const tInf = Number(billetForm.tarif_inf) || 0;
      const totalPlaces = adt + chd + inf;
      const tarifTotal = (adt * tAdt) + (chd * tChd) + (inf * tInf);

      const payload = {
        date_vol: billetForm.date_vol,
        compagnie_id: billetForm.compagnie_id || null,
        compagnie_nom: billetForm.compagnie_nom.trim(),
        pnr: billetForm.pnr.trim().toUpperCase(),
        adt_count: adt,
        chd_count: chd,
        inf_count: inf,
        total_places: totalPlaces,
        tarif_adt: tAdt,
        tarif_chd: tChd,
        tarif_inf: tInf,
        tarif_total: tarifTotal,
        groupe_id: billetForm.groupe_id || null,
        groupe_nom: selectedGroup ? selectedGroup.nom : null,
        description: billetForm.description?.trim() || null,
        updated_at: new Date().toISOString()
      };

      if (editingBillet) {
        const { error } = await supabase
          .from('omra_tracking_billets')
          .update(payload)
          .eq('id', editingBillet.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('omra_tracking_billets')
          .insert([payload]);
        if (error) throw error;
      }

      setIsBilletModalOpen(false);
      fetchBillets();
    } catch (err) {
      console.error('Error saving billet:', err);
      alert('Erreur lors de la sauvegarde : ' + (err.message || 'Vérifiez la table SQL'));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteBillet = async (id, pnr) => {
    if (!window.confirm(`Supprimer définitivement le bloc de sièges PNR "${pnr}" ?`)) return;
    try {
      const { error } = await supabase.from('omra_tracking_billets').delete().eq('id', id);
      if (error) throw error;
      fetchBillets();
    } catch (err) {
      alert('Erreur suppression : ' + err.message);
    }
  };

  // ==========================================
  // TAB 3: DIWAN HANDLERS
  // ==========================================
  const handleOpenDiwanModal = (diwan = null) => {
    if (diwan) {
      setEditingDiwan(diwan);
      setDiwanForm({
        nom_groupe: diwan.nom_groupe || '',
        groupe_id: diwan.groupe_id || '',
        adt_count: diwan.adt_count ?? (diwan.nombre_assafers || ''),
        chd_count: diwan.chd_count ?? '',
        tarif_par_assafir: diwan.tarif_par_assafir ?? 5000,
        tarif_total: diwan.tarif_total ?? 0,
        statut: diwan.statut || 'DÉCLARÉ',
        date_declaration: diwan.date_declaration || new Date().toISOString().split('T')[0],
        description: diwan.description || ''
      });
    } else {
      setEditingDiwan(null);
      setDiwanForm({
        nom_groupe: '',
        groupe_id: omraGroups[0]?.id || '',
        adt_count: '',
        chd_count: '',
        tarif_par_assafir: 5000,
        tarif_total: 0,
        statut: 'DÉCLARÉ',
        date_declaration: new Date().toISOString().split('T')[0],
        description: ''
      });
    }
    setIsDiwanModalOpen(true);
  };

  const handleSaveDiwan = async (e) => {
    e.preventDefault();
    if (!diwanForm.nom_groupe) {
      alert('Veuillez renseigner le nom du groupe Diwan.');
      return;
    }

    setSaving(true);
    try {
      const selectedGroup = omraGroups.find(g => g.id === diwanForm.groupe_id);
      const adt = Number(diwanForm.adt_count) || 0;
      const chd = Number(diwanForm.chd_count) || 0;
      const unit = Number(diwanForm.tarif_par_assafir) || 0;
      const totalAssafers = adt + chd;
      const totalCost = adt * unit; // Montant total = 5000 DZD * ADT

      const payload = {
        nom_groupe: diwanForm.nom_groupe.trim(),
        groupe_id: diwanForm.groupe_id || null,
        groupe_nom: selectedGroup ? selectedGroup.nom : null,
        adt_count: adt,
        chd_count: chd,
        nombre_assafers: totalAssafers,
        tarif_par_assafir: unit,
        tarif_total: totalCost,
        statut: diwanForm.statut,
        date_declaration: diwanForm.date_declaration,
        description: diwanForm.description?.trim() || null,
        updated_at: new Date().toISOString()
      };

      if (editingDiwan) {
        const { error } = await supabase
          .from('omra_tracking_diwan')
          .update(payload)
          .eq('id', editingDiwan.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('omra_tracking_diwan')
          .insert([payload]);
        if (error) throw error;
      }

      setIsDiwanModalOpen(false);
      fetchDiwan();
    } catch (err) {
      console.error('Error saving diwan:', err);
      alert('Erreur lors de la sauvegarde : ' + (err.message || 'Vérifiez la table SQL'));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteDiwan = async (id, nom) => {
    if (!window.confirm(`Supprimer définitivement le groupe Diwan "${nom}" ?`)) return;
    try {
      const { error } = await supabase.from('omra_tracking_diwan').delete().eq('id', id);
      if (error) throw error;
      fetchDiwan();
    } catch (err) {
      alert('Erreur suppression : ' + err.message);
    }
  };

  // CSV Exporters
  const exportVisasCSV = () => {
    if (!filteredVisas.length) return alert('Aucune donnée à exporter.');
    const headers = ['Type', 'Groupe Omra Lié', 'N° Nusuk', 'Date Émission', 'Nbr Visas', 'Tarif Total (SAR)', 'Transport', 'Frais Transport (SAR)', 'Description'];
    const rows = filteredVisas.map(v => [
      v.type === 'groupe' ? 'En Groupe' : 'Libre',
      `"${v.groupe_nom || '—'}"`,
      `"${v.nusuk_group_no}"`,
      v.date_emission,
      v.nbr_visas || 0,
      v.tarif_total_sar || 0,
      v.avec_transport ? 'Oui' : 'Non',
      v.frais_transport_sar || 0,
      `"${v.description || ''}"`
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `tracking_visas_omra_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportBilletsCSV = () => {
    if (!filteredBillets.length) return alert('Aucune donnée à exporter.');
    const headers = ['Date Vol', 'Compagnie', 'PNR', 'Adultes', 'Enfants', 'Bébés', 'Total Places', 'Tarif ADT (DZD)', 'Tarif CHD (DZD)', 'Tarif INF (DZD)', 'Tarif Total (DZD)', 'Groupe Lié', 'Description'];
    const rows = filteredBillets.map(b => [
      b.date_vol,
      `"${b.compagnie_nom}"`,
      `"${b.pnr}"`,
      b.adt_count || 0,
      b.chd_count || 0,
      b.inf_count || 0,
      b.total_places || (b.adt_count + b.chd_count + b.inf_count) || 0,
      b.tarif_adt || 0,
      b.tarif_chd || 0,
      b.tarif_inf || 0,
      b.tarif_total || 0,
      `"${b.groupe_nom || '—'}"`,
      `"${b.description || ''}"`
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `tracking_blocs_sieges_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportDiwanCSV = () => {
    if (!filteredDiwan.length) return alert('Aucune donnée à exporter.');
    const headers = ['Nom Groupe Diwan', 'Groupe Omra Lié', 'Adultes (ADT)', 'Enfants (CHD)', 'Total Assafers', 'Tarif / ADT (DZD)', 'Total Déclaration (DZD)', 'Statut', 'Date Déclaration', 'Description'];
    const rows = filteredDiwan.map(d => [
      `"${d.nom_groupe}"`,
      `"${d.groupe_nom || '—'}"`,
      d.adt_count || 0,
      d.chd_count || 0,
      d.nombre_assafers || ((d.adt_count || 0) + (d.chd_count || 0)),
      d.tarif_par_assafir || 5000,
      d.tarif_total || ((d.adt_count || 0) * (d.tarif_par_assafir || 5000)),
      `"${d.statut}"`,
      d.date_declaration,
      `"${d.description || ''}"`
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `tracking_diwan_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Check admin rights
  if (!isAdmin) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center mb-4">
            <ShieldAlert size={36} />
          </div>
          <h2 className="text-xl font-bold text-slate-100">Accès Restreint</h2>
          <p className="text-sm text-slate-400 max-w-md mt-2">
            Ce module de tracking Omra est strictement réservé aux administrateurs. Veuillez contacter votre responsable si vous pensez qu'il s'agit d'une erreur.
          </p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6 max-w-7xl mx-auto pb-16">
        
        {/* En-tête Principal */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/40 pb-5">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 shadow-sm">
                <Layers className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-black tracking-tight text-foreground">
                    Tracking & Contrôle Omra
                  </h1>
                  <Badge variant="outline" className="bg-amber-500/15 text-amber-400 border-amber-500/30 text-[10px] font-bold uppercase tracking-wider">
                    <ShieldCheck size={12} className="mr-1" /> Admin Only
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Suivi des groupes visas saoudiens (Nusuk), blocs sièges aériens et déclarations au Diwan
                </p>
              </div>
            </div>
          </div>

          {/* Boutons d'Action Rapides */}
          <div className="flex items-center gap-2.5">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => {
                if (activeTab === 'visas') fetchVisas();
                if (activeTab === 'billets') fetchBillets();
                if (activeTab === 'diwan') fetchDiwan();
              }}
              className="text-xs font-semibold"
            >
              <RefreshCw size={14} className="mr-1.5" />
              Actualiser
            </Button>

            {activeTab === 'visas' && (
              <>
                <Button variant="outline" size="sm" onClick={exportVisasCSV} className="text-xs font-semibold">
                  <Download size={14} className="mr-1.5 text-emerald-500" />
                  Export CSV
                </Button>
                <Button size="sm" onClick={() => handleOpenVisaModal()} className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-md shadow-amber-600/20">
                  <Plus size={15} className="mr-1" />
                  Nouveau Groupe Visa
                </Button>
              </>
            )}

            {activeTab === 'billets' && (
              <>
                <Button variant="outline" size="sm" onClick={exportBilletsCSV} className="text-xs font-semibold">
                  <Download size={14} className="mr-1.5 text-blue-500" />
                  Export CSV
                </Button>
                <Button size="sm" onClick={() => handleOpenBilletModal()} className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-600/20">
                  <Plus size={15} className="mr-1" />
                  Nouveau Bloc Sièges
                </Button>
              </>
            )}

            {activeTab === 'diwan' && (
              <>
                <Button variant="outline" size="sm" onClick={exportDiwanCSV} className="text-xs font-semibold">
                  <Download size={14} className="mr-1.5 text-violet-500" />
                  Export CSV
                </Button>
                <Button size="sm" onClick={() => handleOpenDiwanModal()} className="bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs shadow-md shadow-violet-600/20">
                  <Plus size={15} className="mr-1" />
                  Nouveau Groupe Diwan
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Warning si les tables SQL n'ont pas encore été créées */}
        {sqlErrorNotice && (
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start justify-between gap-3 text-sm text-amber-200">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-400 mt-0.5 shrink-0" />
              <div>
                <p className="font-bold text-amber-300">Initialisation de la base de données requise</p>
                <p className="text-xs text-amber-200/80 mt-1">
                  La table <code className="bg-black/30 px-1 py-0.5 rounded font-mono text-amber-300">{sqlErrorNotice}</code> n'est pas encore créée dans votre base Supabase. Le fichier de migration <code className="bg-black/30 px-1 py-0.5 rounded font-mono text-amber-300">create_omra_tracking_tables.sql</code> est prêt à la racine du projet.
                </p>
              </div>
            </div>
            <Button size="sm" variant="outline" onClick={handleCopySqlNotice} className="shrink-0 text-xs border-amber-500/40 hover:bg-amber-500/20 text-amber-300">
              {copiedSql ? <Check size={13} className="mr-1 text-emerald-400" /> : <Copy size={13} className="mr-1" />}
              {copiedSql ? 'Copié !' : 'Aide Script SQL'}
            </Button>
          </div>
        )}

        {/* Onglets Élégants (3 Tabs) */}
        <div className="flex items-center gap-2 border-b border-border/60 pb-px">
          <button
            onClick={() => setActiveTab('visas')}
            className={cn(
              "flex items-center gap-2.5 px-4 py-3 text-sm font-bold border-b-2 transition-all cursor-pointer rounded-t-lg",
              activeTab === 'visas'
                ? "border-amber-500 text-amber-400 bg-amber-500/10"
                : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/30"
            )}
          >
            <Stamp size={18} className={cn(activeTab === 'visas' ? "text-amber-400" : "text-muted-foreground")} />
            <span>1. Visas Omra (Nusuk / Arabie)</span>
            <Badge variant="secondary" className="text-[11px] font-bold px-1.5 py-0 h-5">
              {visas.length}
            </Badge>
          </button>

          <button
            onClick={() => setActiveTab('billets')}
            className={cn(
              "flex items-center gap-2.5 px-4 py-3 text-sm font-bold border-b-2 transition-all cursor-pointer rounded-t-lg",
              activeTab === 'billets'
                ? "border-blue-500 text-blue-400 bg-blue-500/10"
                : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/30"
            )}
          >
            <Plane size={18} className={cn(activeTab === 'billets' ? "text-blue-400" : "text-muted-foreground")} />
            <span>2. Billets (Blocs Sièges Omra)</span>
            <Badge variant="secondary" className="text-[11px] font-bold px-1.5 py-0 h-5">
              {billets.length}
            </Badge>
          </button>

          <button
            onClick={() => setActiveTab('diwan')}
            className={cn(
              "flex items-center gap-2.5 px-4 py-3 text-sm font-bold border-b-2 transition-all cursor-pointer rounded-t-lg",
              activeTab === 'diwan'
                ? "border-violet-500 text-violet-400 bg-violet-500/10"
                : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/30"
            )}
          >
            <Building size={18} className={cn(activeTab === 'diwan' ? "text-violet-400" : "text-muted-foreground")} />
            <span>3. Groupes Diwan</span>
            <Badge variant="secondary" className="text-[11px] font-bold px-1.5 py-0 h-5">
              {diwanList.length}
            </Badge>
          </button>
        </div>

        {/* ========================================================================= */}
        {/* TAB 1: VISAS OMRA */}
        {/* ========================================================================= */}
        {activeTab === 'visas' && (
          <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="bg-card/50 backdrop-blur-sm border-border/60 shadow-sm">
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Groupes Visas</p>
                    <h3 className="text-2xl font-black text-foreground mt-1">{visaStats.totalCount}</h3>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      <span className="text-amber-400 font-bold">{visaStats.countGroupe}</span> en groupe &bull; <span className="text-blue-400 font-bold">{visaStats.countLibre}</span> libres
                    </p>
                  </div>
                  <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                    <Stamp size={22} />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card/50 backdrop-blur-sm border-border/60 shadow-sm">
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Pèlerins / Visas</p>
                    <h3 className="text-2xl font-black text-emerald-400 mt-1">{visaStats.totalVisasCount}</h3>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Visas émis par nos associés</p>
                  </div>
                  <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                    <Users size={22} />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card/50 backdrop-blur-sm border-border/60 shadow-sm">
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Visas (SAR)</p>
                    <h3 className="text-2xl font-black text-amber-400 mt-1">
                      {visaStats.totalSAR.toLocaleString('fr-FR')} <span className="text-xs font-bold text-amber-500">SAR</span>
                    </h3>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Règlement direct Arabie</p>
                  </div>
                  <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                    <DollarSign size={22} />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card/50 backdrop-blur-sm border-border/60 shadow-sm">
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Transport Inclus (SAR)</p>
                    <h3 className="text-2xl font-black text-violet-400 mt-1">
                      {visaStats.totalTransportSAR.toLocaleString('fr-FR')} <span className="text-xs font-bold text-violet-500">SAR</span>
                    </h3>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Frais bus & navettes saoudiennes</p>
                  </div>
                  <div className="w-11 h-11 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400">
                    <Bus size={22} />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Filtres & Recherche */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-card/40 p-3 rounded-xl border border-border/60">
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                <Input
                  value={visasSearch}
                  onChange={e => setVisasSearch(e.target.value)}
                  placeholder="Recherche (N° Nusuk, groupe, mot-clé)..."
                  className="pl-9 h-9 text-xs"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                <Select
                  value={visasFilterType}
                  onChange={e => setVisasFilterType(e.target.value)}
                  className="h-9 text-xs w-full sm:w-36"
                >
                  <option value="all">Tous les types</option>
                  <option value="groupe">En Groupe</option>
                  <option value="libre">Libre</option>
                </Select>

                <Select
                  value={visasFilterGroup}
                  onChange={e => setVisasFilterGroup(e.target.value)}
                  className="h-9 text-xs w-full sm:w-48"
                >
                  <option value="all">Tous les groupes Omra</option>
                  {omraGroups.map(g => (
                    <option key={g.id} value={g.id}>{g.nom}</option>
                  ))}
                </Select>
              </div>
            </div>

            {/* Tableau des Visas */}
            <Card className="border-border/60 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/40 text-muted-foreground font-bold border-b border-border/60 uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Type</th>
                      <th className="py-3 px-4">N° Groupe Nusuk</th>
                      <th className="py-3 px-4">Groupe Omra Lié</th>
                      <th className="py-3 px-4">Date Émission</th>
                      <th className="py-3 px-4 text-center">Nbr Visas</th>
                      <th className="py-3 px-4 text-right">Tarif Visas (SAR)</th>
                      <th className="py-3 px-4">Transport</th>
                      <th className="py-3 px-4">Description</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {loadingVisas ? (
                      <tr>
                        <td colSpan="9" className="py-12 text-center text-muted-foreground">
                          <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-amber-500" />
                          Chargement des groupes visas...
                        </td>
                      </tr>
                    ) : filteredVisas.length === 0 ? (
                      <tr>
                        <td colSpan="9" className="py-12 text-center text-muted-foreground">
                          <Stamp size={32} className="mx-auto mb-2 text-muted-foreground/40" />
                          Aucun groupe visa trouvé. Cliquez sur <b className="text-amber-400">"Nouveau Groupe Visa"</b> pour en ajouter un.
                        </td>
                      </tr>
                    ) : (
                      filteredVisas.map(v => (
                        <tr key={v.id} className="hover:bg-muted/30 transition-colors group">
                          <td className="py-3.5 px-4 font-semibold">
                            {v.type === 'groupe' ? (
                              <Badge variant="outline" className="bg-amber-500/10 text-amber-400 border-amber-500/30 text-[10px] font-bold">
                                🕋 En Groupe
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/30 text-[10px] font-bold">
                                👤 Libre
                              </Badge>
                            )}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="font-mono font-bold text-amber-300 bg-amber-500/10 px-2 py-1 rounded border border-amber-500/20 text-xs">
                              {v.nusuk_group_no}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            {v.type === 'groupe' ? (
                              <div className="font-medium text-foreground flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                {v.groupe_nom || 'Groupe Omra'}
                              </div>
                            ) : (
                              <span className="text-muted-foreground italic">— Non lié (Libre) —</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-muted-foreground">
                            {v.date_emission ? new Date(v.date_emission).toLocaleDateString('fr-FR') : '—'}
                          </td>
                          <td className="py-3.5 px-4 text-center font-bold text-foreground">
                            {v.nbr_visas ? `${v.nbr_visas} pax` : '—'}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <span className="font-extrabold text-amber-400 text-sm">
                              {Number(v.tarif_total_sar || 0).toLocaleString('fr-FR')}
                            </span>
                            <span className="text-[10px] font-bold text-amber-500 ml-1">SAR</span>
                          </td>
                          <td className="py-3.5 px-4">
                            {v.avec_transport ? (
                              <div className="flex flex-col">
                                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-[10px] w-fit font-bold">
                                  🚌 Avec transport
                                </Badge>
                                {Number(v.frais_transport_sar) > 0 && (
                                  <span className="text-[11px] font-bold text-emerald-300 mt-0.5">
                                    +{Number(v.frais_transport_sar).toLocaleString('fr-FR')} SAR
                                  </span>
                                )}
                              </div>
                            ) : (
                              <Badge variant="outline" className="bg-zinc-500/10 text-zinc-400 border-zinc-500/20 text-[10px] w-fit">
                                Sans transport
                              </Badge>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-muted-foreground max-w-[200px] truncate" title={v.description || ''}>
                            {v.description || '—'}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleOpenVisaModal(v)}
                                className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                                title="Modifier"
                              >
                                <Edit3 size={14} />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDeleteVisa(v.id, v.nusuk_group_no)}
                                className="h-7 w-7 p-0 text-muted-foreground hover:text-rose-400"
                                title="Supprimer"
                              >
                                <Trash2 size={14} />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: BILLETS & BLOCS SIÈGES */}
        {/* ========================================================================= */}
        {activeTab === 'billets' && (
          <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="bg-card/50 backdrop-blur-sm border-border/60 shadow-sm">
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Blocs / PNR</p>
                    <h3 className="text-2xl font-black text-foreground mt-1">{billetStats.totalBlocks}</h3>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Réservations de groupe actives</p>
                  </div>
                  <div className="w-11 h-11 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                    <Plane size={22} />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card/50 backdrop-blur-sm border-border/60 shadow-sm">
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Sièges Aériens</p>
                    <h3 className="text-2xl font-black text-blue-400 mt-1">{billetStats.totalPlaces}</h3>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      <span className="font-bold text-foreground">{billetStats.totalADT}</span> ADT &bull; <span className="font-bold text-foreground">{billetStats.totalCHD}</span> CHD &bull; <span className="font-bold text-foreground">{billetStats.totalINF}</span> INF
                    </p>
                  </div>
                  <div className="w-11 h-11 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                    <Users size={22} />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card/50 backdrop-blur-sm border-border/60 shadow-sm">
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Coût Total Billetterie</p>
                    <h3 className="text-2xl font-black text-emerald-400 mt-1">
                      {billetStats.totalDZD.toLocaleString('fr-DZ')} <span className="text-xs font-bold text-emerald-500">DZD</span>
                    </h3>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Montant engagé compagnies</p>
                  </div>
                  <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                    <DollarSign size={22} />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card/50 backdrop-blur-sm border-border/60 shadow-sm">
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Moyenne / Siège</p>
                    <h3 className="text-2xl font-black text-violet-400 mt-1">
                      {billetStats.totalPlaces > 0 ? Math.round(billetStats.totalDZD / billetStats.totalPlaces).toLocaleString('fr-DZ') : 0} <span className="text-xs font-bold text-violet-500">DZD</span>
                    </h3>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Prix moyen par pèlerin</p>
                  </div>
                  <div className="w-11 h-11 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400">
                    <ArrowUpDown size={22} />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Filtres & Recherche */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-card/40 p-3 rounded-xl border border-border/60">
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                <Input
                  value={billetsSearch}
                  onChange={e => setBilletsSearch(e.target.value)}
                  placeholder="Recherche (PNR, compagnie, groupe)..."
                  className="pl-9 h-9 text-xs"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                <Select
                  value={billetsFilterCompagnie}
                  onChange={e => setBilletsFilterCompagnie(e.target.value)}
                  className="h-9 text-xs w-full sm:w-48"
                >
                  <option value="all">Toutes les compagnies</option>
                  {compagnies.map(c => (
                    <option key={c.id} value={c.nom}>{c.nom} ({c.code})</option>
                  ))}
                </Select>
              </div>
            </div>

            {/* Tableau des Blocs Sièges */}
            <Card className="border-border/60 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/40 text-muted-foreground font-bold border-b border-border/60 uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Date Vol</th>
                      <th className="py-3 px-4">Compagnie</th>
                      <th className="py-3 px-4">PNR</th>
                      <th className="py-3 px-4 text-center">Répartition Pax</th>
                      <th className="py-3 px-4 text-center">Total Sièges</th>
                      <th className="py-3 px-4">Tarifs Unitaires (ADT / CHD / INF)</th>
                      <th className="py-3 px-4 text-right">Tarif Total (DZD)</th>
                      <th className="py-3 px-4">Groupe Omra Lié</th>
                      <th className="py-3 px-4">Description</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {loadingBillets ? (
                      <tr>
                        <td colSpan="10" className="py-12 text-center text-muted-foreground">
                          <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-blue-500" />
                          Chargement des blocs sièges...
                        </td>
                      </tr>
                    ) : filteredBillets.length === 0 ? (
                      <tr>
                        <td colSpan="10" className="py-12 text-center text-muted-foreground">
                          <Plane size={32} className="mx-auto mb-2 text-muted-foreground/40" />
                          Aucun bloc de sièges trouvé. Cliquez sur <b className="text-blue-400">"Nouveau Bloc Sièges"</b> pour en ajouter un.
                        </td>
                      </tr>
                    ) : (
                      filteredBillets.map(b => (
                        <tr key={b.id} className="hover:bg-muted/30 transition-colors group">
                          <td className="py-3.5 px-4 font-medium text-muted-foreground">
                            {b.date_vol ? new Date(b.date_vol).toLocaleDateString('fr-FR') : '—'}
                          </td>
                          <td className="py-3.5 px-4">
                            <Badge variant="outline" className="bg-blue-500/10 text-blue-300 border-blue-500/30 text-[11px] font-bold">
                              ✈️ {b.compagnie_nom}
                            </Badge>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="font-mono font-black text-blue-400 bg-blue-500/10 px-2 py-1 rounded border border-blue-500/20 text-xs">
                              {b.pnr}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5 font-medium text-[11px]">
                              <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300" title="Adultes">{b.adt_count || 0} ADT</span>
                              <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300" title="Enfants">{b.chd_count || 0} CHD</span>
                              <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300" title="Bébés">{b.inf_count || 0} INF</span>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-center font-extrabold text-foreground text-sm">
                            {b.total_places || (b.adt_count + b.chd_count + b.inf_count) || 0}
                          </td>
                          <td className="py-3.5 px-4 text-muted-foreground">
                            <div className="text-[11px] space-y-0.5">
                              <div>ADT: <b className="text-foreground">{Number(b.tarif_adt || 0).toLocaleString('fr-DZ')}</b> DZD</div>
                              {Number(b.tarif_chd) > 0 && <div>CHD: <b className="text-foreground">{Number(b.tarif_chd).toLocaleString('fr-DZ')}</b> DZD</div>}
                              {Number(b.tarif_inf) > 0 && <div>INF: <b className="text-foreground">{Number(b.tarif_inf).toLocaleString('fr-DZ')}</b> DZD</div>}
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <span className="font-extrabold text-emerald-400 text-sm">
                              {Number(b.tarif_total || 0).toLocaleString('fr-DZ')}
                            </span>
                            <span className="text-[10px] font-bold text-emerald-500 ml-1">DZD</span>
                          </td>
                          <td className="py-3.5 px-4">
                            {b.groupe_nom ? (
                              <span className="text-foreground font-medium">{b.groupe_nom}</span>
                            ) : (
                              <span className="text-muted-foreground italic">— Non assigné —</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-muted-foreground max-w-[180px] truncate" title={b.description || ''}>
                            {b.description || '—'}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleOpenBilletModal(b)}
                                className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                                title="Modifier"
                              >
                                <Edit3 size={14} />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDeleteBillet(b.id, b.pnr)}
                                className="h-7 w-7 p-0 text-muted-foreground hover:text-rose-400"
                                title="Supprimer"
                              >
                                <Trash2 size={14} />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: GROUPES DIWAN */}
        {/* ========================================================================= */}
        {activeTab === 'diwan' && (
          <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="bg-card/50 backdrop-blur-sm border-border/60 shadow-sm">
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Groupes Diwan</p>
                    <h3 className="text-2xl font-black text-foreground mt-1">{diwanStats.totalGroups}</h3>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Dossiers et groupes officiels</p>
                  </div>
                  <div className="w-11 h-11 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400">
                    <Building size={22} />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card/50 backdrop-blur-sm border-border/60 shadow-sm">
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Assafers Déclarés</p>
                    <h3 className="text-2xl font-black text-violet-400 mt-1">{diwanStats.totalAssafers}</h3>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      <span className="font-bold text-foreground">{diwanStats.totalADT}</span> ADT &bull; <span className="font-bold text-foreground">{diwanStats.totalCHD}</span> CHD
                    </p>
                  </div>
                  <div className="w-11 h-11 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400">
                    <Users size={22} />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card/50 backdrop-blur-sm border-border/60 shadow-sm">
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Montant Total Déclarations</p>
                    <h3 className="text-2xl font-black text-amber-400 mt-1">
                      {diwanStats.totalDZD.toLocaleString('fr-DZ')} <span className="text-xs font-bold text-amber-500">DZD</span>
                    </h3>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Base 5 000 DZD &times; ADT</p>
                  </div>
                  <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                    <DollarSign size={22} />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card/50 backdrop-blur-sm border-border/60 shadow-sm">
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Groupes Validés</p>
                    <h3 className="text-2xl font-black text-emerald-400 mt-1">{diwanStats.declaredCount}</h3>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Sur {diwanStats.totalGroups} dossiers</p>
                  </div>
                  <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                    <CheckCircle2 size={22} />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Filtres & Recherche */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-card/40 p-3 rounded-xl border border-border/60">
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                <Input
                  value={diwanSearch}
                  onChange={e => setDiwanSearch(e.target.value)}
                  placeholder="Recherche (Nom groupe Diwan, Omra lié)..."
                  className="pl-9 h-9 text-xs"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                <Select
                  value={diwanFilterStatut}
                  onChange={e => setDiwanFilterStatut(e.target.value)}
                  className="h-9 text-xs w-full sm:w-36"
                >
                  <option value="all">Tous les statuts</option>
                  <option value="DÉCLARÉ">Déclaré</option>
                  <option value="VALIDÉ">Validé</option>
                  <option value="EN_ATTENTE">En attente</option>
                  <option value="PAYÉ">Payé</option>
                </Select>

                <Select
                  value={diwanFilterGroup}
                  onChange={e => setDiwanFilterGroup(e.target.value)}
                  className="h-9 text-xs w-full sm:w-48"
                >
                  <option value="all">Tous les groupes Omra</option>
                  {omraGroups.map(g => (
                    <option key={g.id} value={g.id}>{g.nom}</option>
                  ))}
                </Select>
              </div>
            </div>

            {/* Tableau des Groupes Diwan */}
            <Card className="border-border/60 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/40 text-muted-foreground font-bold border-b border-border/60 uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Nom du Groupe Diwan</th>
                      <th className="py-3 px-4">Groupe Omra Lié</th>
                      <th className="py-3 px-4 text-center">Répartition Pax</th>
                      <th className="py-3 px-4 text-center">Total Assafers</th>
                      <th className="py-3 px-4 text-right">Tarif / ADT</th>
                      <th className="py-3 px-4 text-right">Tarif Total (5 000 &times; ADT)</th>
                      <th className="py-3 px-4">Statut</th>
                      <th className="py-3 px-4">Date Déclaration</th>
                      <th className="py-3 px-4">Description</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {loadingDiwan ? (
                      <tr>
                        <td colSpan="10" className="py-12 text-center text-muted-foreground">
                          <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-violet-500" />
                          Chargement des groupes Diwan...
                        </td>
                      </tr>
                    ) : filteredDiwan.length === 0 ? (
                      <tr>
                        <td colSpan="10" className="py-12 text-center text-muted-foreground">
                          <Building size={32} className="mx-auto mb-2 text-muted-foreground/40" />
                          Aucun groupe Diwan trouvé. Cliquez sur <b className="text-violet-400">"Nouveau Groupe Diwan"</b> pour en ajouter un.
                        </td>
                      </tr>
                    ) : (
                      filteredDiwan.map(d => {
                        const adtCount = Number(d.adt_count) || (Number(d.nombre_assafers) > 0 && d.chd_count === undefined ? Number(d.nombre_assafers) : 0);
                        const chdCount = Number(d.chd_count) || 0;
                        const totalAssafers = Number(d.nombre_assafers) || (adtCount + chdCount);
                        const unitRate = Number(d.tarif_par_assafir || 5000);
                        const totalCalculated = Number(d.tarif_total) || (adtCount * unitRate);

                        return (
                          <tr key={d.id} className="hover:bg-muted/30 transition-colors group">
                            <td className="py-3.5 px-4 font-bold text-foreground">
                              <span className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-violet-400"></span>
                                {d.nom_groupe}
                              </span>
                            </td>
                            <td className="py-3.5 px-4">
                              {d.groupe_nom ? (
                                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-[10px] font-bold">
                                  🕋 {d.groupe_nom}
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground italic">— Non lié —</span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              <div className="flex items-center justify-center gap-1.5 font-medium text-[11px]">
                                <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300" title="Adultes">{adtCount} ADT</span>
                                <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300" title="Enfants">{chdCount} CHD</span>
                              </div>
                            </td>
                            <td className="py-3.5 px-4 text-center font-black text-violet-300 text-sm">
                              {totalAssafers}
                            </td>
                            <td className="py-3.5 px-4 text-right font-medium text-muted-foreground">
                              {unitRate.toLocaleString('fr-DZ')} DZD
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              <span className="font-extrabold text-amber-400 text-sm">
                                {totalCalculated.toLocaleString('fr-DZ')}
                              </span>
                              <span className="text-[10px] font-bold text-amber-500 ml-1">DZD</span>
                            </td>
                            <td className="py-3.5 px-4">
                              <Badge 
                                variant="outline" 
                                className={cn(
                                  "text-[10px] font-bold",
                                  d.statut === 'VALIDÉ' && "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
                                  d.statut === 'DÉCLARÉ' && "bg-blue-500/15 text-blue-400 border-blue-500/30",
                                  d.statut === 'EN_ATTENTE' && "bg-amber-500/15 text-amber-400 border-amber-500/30",
                                  d.statut === 'PAYÉ' && "bg-purple-500/15 text-purple-400 border-purple-500/30"
                                )}
                              >
                                {d.statut}
                              </Badge>
                            </td>
                            <td className="py-3.5 px-4 text-muted-foreground">
                              {d.date_declaration ? new Date(d.date_declaration).toLocaleDateString('fr-FR') : '—'}
                            </td>
                            <td className="py-3.5 px-4 text-muted-foreground max-w-[180px] truncate" title={d.description || ''}>
                              {d.description || '—'}
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleOpenDiwanModal(d)}
                                  className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                                  title="Modifier"
                                >
                                  <Edit3 size={14} />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleDeleteDiwan(d.id, d.nom_groupe)}
                                  className="h-7 w-7 p-0 text-muted-foreground hover:text-rose-400"
                                  title="Supprimer"
                                >
                                  <Trash2 size={14} />
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
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODAL AJOUT / ÉDITION : VISAS OMRA */}
        {/* ========================================================================= */}
        {isVisaModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-card border border-border/80 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
              <div className="px-6 py-4 border-b border-border/60 flex items-center justify-between bg-muted/20">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
                    <Stamp size={18} />
                  </div>
                  <h3 className="font-bold text-foreground">
                    {editingVisa ? 'Modifier Groupe Visa' : 'Ajouter un Groupe Visa (Saudi / Nusuk)'}
                  </h3>
                </div>
                <Button size="sm" variant="ghost" onClick={() => setIsVisaModalOpen(false)} className="h-8 w-8 p-0">
                  &times;
                </Button>
              </div>

              <form onSubmit={handleSaveVisa} className="p-6 space-y-4">
                {/* Type : Libre vs En Groupe */}
                <div>
                  <Label className="text-xs font-bold text-muted-foreground mb-1.5 block">
                    Type de Visa <span className="text-rose-500">*</span>
                  </Label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setVisaForm({ ...visaForm, type: 'groupe' })}
                      className={cn(
                        "p-3 rounded-xl border text-left flex flex-col gap-1 transition-all",
                        visaForm.type === 'groupe'
                          ? "border-amber-500 bg-amber-500/10 text-amber-300 font-bold"
                          : "border-border/60 hover:bg-muted/40 text-muted-foreground"
                      )}
                    >
                      <span className="text-sm">🕋 En Groupe</span>
                      <span className="text-[10px] opacity-80">Rattaché à un départ Omra</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setVisaForm({ ...visaForm, type: 'libre' })}
                      className={cn(
                        "p-3 rounded-xl border text-left flex flex-col gap-1 transition-all",
                        visaForm.type === 'libre'
                          ? "border-blue-500 bg-blue-500/10 text-blue-300 font-bold"
                          : "border-border/60 hover:bg-muted/40 text-muted-foreground"
                      )}
                    >
                      <span className="text-sm">👤 Visa Libre</span>
                      <span className="text-[10px] opacity-80">Indépendant / Sans départ</span>
                    </button>
                  </div>
                </div>

                {/* Si En Groupe : Choix du Groupe Omra */}
                {visaForm.type === 'groupe' && (
                  <div>
                    <Label className="text-xs font-bold text-muted-foreground mb-1.5 block">
                      Groupe Omra Associé <span className="text-rose-500">*</span>
                    </Label>
                    <Select
                      value={visaForm.groupe_id}
                      onChange={e => setVisaForm({ ...visaForm, groupe_id: e.target.value })}
                      className="h-10 text-xs w-full"
                    >
                      <option value="">-- Sélectionner un groupe Omra --</option>
                      {omraGroups.map(g => (
                        <option key={g.id} value={g.id}>
                          {g.nom} {g.code ? `(${g.code})` : ''} {g.date_depart ? `— Départ ${new Date(g.date_depart).toLocaleDateString('fr-FR')}` : ''}
                        </option>
                      ))}
                    </Select>
                  </div>
                )}

                {/* Numéro de Groupe Nusuk & Date d'Émission */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs font-bold text-muted-foreground mb-1.5 block">
                      N° Groupe Nusuk <span className="text-rose-500">*</span>
                    </Label>
                    <Input
                      required
                      placeholder="ex: NSK-98432"
                      value={visaForm.nusuk_group_no}
                      onChange={e => setVisaForm({ ...visaForm, nusuk_group_no: e.target.value })}
                      className="h-10 text-xs font-mono font-bold"
                    />
                  </div>

                  <div>
                    <Label className="text-xs font-bold text-muted-foreground mb-1.5 block">
                      Date d'Émission Visa <span className="text-rose-500">*</span>
                    </Label>
                    <Input
                      type="date"
                      required
                      value={visaForm.date_emission}
                      onChange={e => setVisaForm({ ...visaForm, date_emission: e.target.value })}
                      className="h-10 text-xs"
                    />
                  </div>
                </div>

                {/* Nombre de Visas & Tarif Total en SAR */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs font-bold text-muted-foreground mb-1.5 block">
                      Nombre de Visas (Pax)
                    </Label>
                    <Input
                      type="number"
                      min="0"
                      placeholder="ex: 45"
                      value={visaForm.nbr_visas}
                      onChange={e => setVisaForm({ ...visaForm, nbr_visas: e.target.value })}
                      className="h-10 text-xs"
                    />
                  </div>

                  <div>
                    <Label className="text-xs font-bold text-muted-foreground mb-1.5 block">
                      Tarif Total Groupe (SAR) <span className="text-rose-500">*</span>
                    </Label>
                    <div className="relative">
                      <Input
                        type="number"
                        step="any"
                        min="0"
                        required
                        placeholder="0.00"
                        value={visaForm.tarif_total_sar}
                        onChange={e => setVisaForm({ ...visaForm, tarif_total_sar: e.target.value })}
                        className="h-10 text-xs pr-12 font-bold text-amber-400"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-amber-500 pointer-events-none">
                        SAR
                      </span>
                    </div>
                  </div>
                </div>

                {/* Avec / Sans Transport */}
                <div className="p-3.5 rounded-xl border border-border/60 bg-muted/20 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-xs font-bold text-foreground cursor-pointer" htmlFor="transport-toggle">
                        Transport Saoudien Inclus ?
                      </Label>
                      <p className="text-[11px] text-muted-foreground">Bus internes / navettes en Arabie</p>
                    </div>
                    <input
                      id="transport-toggle"
                      type="checkbox"
                      checked={visaForm.avec_transport}
                      onChange={e => setVisaForm({ ...visaForm, avec_transport: e.target.checked })}
                      className="w-4 h-4 rounded border-border text-amber-500 focus:ring-amber-400 cursor-pointer"
                    />
                  </div>

                  {visaForm.avec_transport && (
                    <div className="pt-2 border-t border-border/40">
                      <Label className="text-xs font-bold text-muted-foreground mb-1.5 block">
                        Frais du Transport (SAR)
                      </Label>
                      <div className="relative">
                        <Input
                          type="number"
                          step="any"
                          min="0"
                          placeholder="0.00"
                          value={visaForm.frais_transport_sar}
                          onChange={e => setVisaForm({ ...visaForm, frais_transport_sar: e.target.value })}
                          className="h-9 text-xs pr-12 font-semibold text-emerald-400"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-emerald-500 pointer-events-none">
                          SAR
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Description / Remarques */}
                <div>
                  <Label className="text-xs font-bold text-muted-foreground mb-1.5 block">
                    Description & Remarques
                  </Label>
                  <Textarea
                    rows={2}
                    placeholder="Nom du contact en Arabie, référence dossier, etc."
                    value={visaForm.description}
                    onChange={e => setVisaForm({ ...visaForm, description: e.target.value })}
                    className="text-xs resize-none"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-2 border-t border-border/40">
                  <Button type="button" variant="outline" size="sm" onClick={() => setIsVisaModalOpen(false)}>
                    Annuler
                  </Button>
                  <Button type="submit" size="sm" disabled={saving} className="bg-amber-600 hover:bg-amber-700 text-white font-bold">
                    {saving ? 'Enregistrement...' : editingVisa ? 'Mettre à jour' : 'Enregistrer le Groupe Visa'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODAL AJOUT / ÉDITION : BILLETS / BLOCS SIÈGES */}
        {/* ========================================================================= */}
        {isBilletModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-card border border-border/80 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
              <div className="px-6 py-4 border-b border-border/60 flex items-center justify-between bg-muted/20">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
                    <Plane size={18} />
                  </div>
                  <h3 className="font-bold text-foreground">
                    {editingBillet ? 'Modifier Bloc Sièges' : 'Ajouter un Bloc de Sièges Omra'}
                  </h3>
                </div>
                <Button size="sm" variant="ghost" onClick={() => setIsBilletModalOpen(false)} className="h-8 w-8 p-0">
                  &times;
                </Button>
              </div>

              <form onSubmit={handleSaveBillet} className="p-6 space-y-4">
                {/* Date & PNR */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs font-bold text-muted-foreground mb-1.5 block">
                      Date du Vol / Départ <span className="text-rose-500">*</span>
                    </Label>
                    <Input
                      type="date"
                      required
                      value={billetForm.date_vol}
                      onChange={e => setBilletForm({ ...billetForm, date_vol: e.target.value })}
                      className="h-10 text-xs"
                    />
                  </div>

                  <div>
                    <Label className="text-xs font-bold text-muted-foreground mb-1.5 block">
                      Code PNR <span className="text-rose-500">*</span>
                    </Label>
                    <Input
                      required
                      placeholder="ex: X7YT2P"
                      value={billetForm.pnr}
                      onChange={e => setBilletForm({ ...billetForm, pnr: e.target.value.toUpperCase() })}
                      className="h-10 text-xs font-mono font-black text-blue-400"
                    />
                  </div>
                </div>

                {/* Compagnie Aérienne */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs font-bold text-muted-foreground mb-1.5 block">
                      Compagnie (Sélection) <span className="text-rose-500">*</span>
                    </Label>
                    <Select
                      value={billetForm.compagnie_id}
                      onChange={e => {
                        const comp = compagnies.find(c => c.id === e.target.value);
                        setBilletForm({
                          ...billetForm,
                          compagnie_id: e.target.value,
                          compagnie_nom: comp ? comp.nom : billetForm.compagnie_nom
                        });
                      }}
                      className="h-10 text-xs w-full"
                    >
                      <option value="">-- Choisir une compagnie --</option>
                      {compagnies.map(c => (
                        <option key={c.id} value={c.id}>{c.nom} ({c.code})</option>
                      ))}
                    </Select>
                  </div>

                  <div>
                    <Label className="text-xs font-bold text-muted-foreground mb-1.5 block">
                      Nom Compagnie (Affichage) <span className="text-rose-500">*</span>
                    </Label>
                    <Input
                      required
                      placeholder="ex: Saudi Arabian Airlines"
                      value={billetForm.compagnie_nom}
                      onChange={e => setBilletForm({ ...billetForm, compagnie_nom: e.target.value })}
                      className="h-10 text-xs font-medium"
                    />
                  </div>
                </div>

                {/* Optionnel : Groupe Omra Lié */}
                <div>
                  <Label className="text-xs font-bold text-muted-foreground mb-1.5 block">
                    Groupe Omra Associé (Optionnel)
                  </Label>
                  <Select
                    value={billetForm.groupe_id}
                    onChange={e => setBilletForm({ ...billetForm, groupe_id: e.target.value })}
                    className="h-10 text-xs w-full"
                  >
                    <option value="">-- Non assigné (Bloc général) --</option>
                    {omraGroups.map(g => (
                      <option key={g.id} value={g.id}>{g.nom}</option>
                    ))}
                  </Select>
                </div>

                {/* Breakdown Sièges & Tarifs Unitaires */}
                <div className="p-3.5 rounded-xl border border-border/60 bg-muted/20 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground">Nombre de Places & Tarifs Unitaires</span>
                    <Badge variant="outline" className="bg-blue-500/10 text-blue-300 border-blue-500/30 text-[10px]">
                      Total Places : <b className="ml-1 text-foreground">{computedBilletFormTotal.totalPlaces}</b>
                    </Badge>
                  </div>

                  {/* ADT */}
                  <div className="grid grid-cols-2 gap-3 items-center">
                    <div>
                      <Label className="text-[11px] font-semibold text-muted-foreground">Nombre Adultes (ADT)</Label>
                      <Input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={billetForm.adt_count}
                        onChange={e => setBilletForm({ ...billetForm, adt_count: e.target.value })}
                        className="h-9 text-xs"
                      />
                    </div>
                    <div>
                      <Label className="text-[11px] font-semibold text-muted-foreground">Tarif par ADT (DZD)</Label>
                      <Input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={billetForm.tarif_adt}
                        onChange={e => setBilletForm({ ...billetForm, tarif_adt: e.target.value })}
                        className="h-9 text-xs"
                      />
                    </div>
                  </div>

                  {/* CHD */}
                  <div className="grid grid-cols-2 gap-3 items-center">
                    <div>
                      <Label className="text-[11px] font-semibold text-muted-foreground">Nombre Enfants (CHD)</Label>
                      <Input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={billetForm.chd_count}
                        onChange={e => setBilletForm({ ...billetForm, chd_count: e.target.value })}
                        className="h-9 text-xs"
                      />
                    </div>
                    <div>
                      <Label className="text-[11px] font-semibold text-muted-foreground">Tarif par CHD (DZD)</Label>
                      <Input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={billetForm.tarif_chd}
                        onChange={e => setBilletForm({ ...billetForm, tarif_chd: e.target.value })}
                        className="h-9 text-xs"
                      />
                    </div>
                  </div>

                  {/* INF */}
                  <div className="grid grid-cols-2 gap-3 items-center">
                    <div>
                      <Label className="text-[11px] font-semibold text-muted-foreground">Nombre Bébés (INF)</Label>
                      <Input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={billetForm.inf_count}
                        onChange={e => setBilletForm({ ...billetForm, inf_count: e.target.value })}
                        className="h-9 text-xs"
                      />
                    </div>
                    <div>
                      <Label className="text-[11px] font-semibold text-muted-foreground">Tarif par INF (DZD)</Label>
                      <Input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={billetForm.tarif_inf}
                        onChange={e => setBilletForm({ ...billetForm, tarif_inf: e.target.value })}
                        className="h-9 text-xs"
                      />
                    </div>
                  </div>

                  {/* Calcul en direct du total */}
                  <div className="pt-2 border-t border-border/40 flex items-center justify-between">
                    <span className="text-xs font-bold text-muted-foreground">Coût Total Calculé :</span>
                    <span className="text-sm font-black text-emerald-400">
                      {computedBilletFormTotal.totalCost.toLocaleString('fr-DZ')} DZD
                    </span>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <Label className="text-xs font-bold text-muted-foreground mb-1.5 block">
                    Description & Remarques (N° Vol, horaires...)
                  </Label>
                  <Textarea
                    rows={2}
                    placeholder="ex: SV380 Alger - Djeddah / SV381 Médine - Alger"
                    value={billetForm.description}
                    onChange={e => setBilletForm({ ...billetForm, description: e.target.value })}
                    className="text-xs resize-none"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-2 border-t border-border/40">
                  <Button type="button" variant="outline" size="sm" onClick={() => setIsBilletModalOpen(false)}>
                    Annuler
                  </Button>
                  <Button type="submit" size="sm" disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white font-bold">
                    {saving ? 'Enregistrement...' : editingBillet ? 'Mettre à jour' : 'Enregistrer le Bloc'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODAL AJOUT / ÉDITION : DIWAN */}
        {/* ========================================================================= */}
        {isDiwanModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-card border border-border/80 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
              <div className="px-6 py-4 border-b border-border/60 flex items-center justify-between bg-muted/20">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-violet-500/10 border border-violet-500/20 text-violet-400 flex items-center justify-center">
                    <Building size={18} />
                  </div>
                  <h3 className="font-bold text-foreground">
                    {editingDiwan ? 'Modifier Groupe Diwan' : 'Ajouter un Groupe Diwan'}
                  </h3>
                </div>
                <Button size="sm" variant="ghost" onClick={() => setIsDiwanModalOpen(false)} className="h-8 w-8 p-0">
                  &times;
                </Button>
              </div>

              <form onSubmit={handleSaveDiwan} className="p-6 space-y-4">
                {/* Nom du Groupe Diwan */}
                <div>
                  <Label className="text-xs font-bold text-muted-foreground mb-1.5 block">
                    Nom du Groupe Diwan <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    required
                    placeholder="ex: DIWAN-OMRA-01-1448"
                    value={diwanForm.nom_groupe}
                    onChange={e => setDiwanForm({ ...diwanForm, nom_groupe: e.target.value })}
                    className="h-10 text-xs font-bold"
                  />
                </div>

                {/* Lié à quel Groupe Omra */}
                <div>
                  <Label className="text-xs font-bold text-muted-foreground mb-1.5 block">
                    Lié à quel Groupe Omra ? <span className="text-rose-500">*</span>
                  </Label>
                  <Select
                    value={diwanForm.groupe_id}
                    onChange={e => setDiwanForm({ ...diwanForm, groupe_id: e.target.value })}
                    className="h-10 text-xs w-full"
                  >
                    <option value="">-- Sélectionner le groupe Omra lié --</option>
                    {omraGroups.map(g => (
                      <option key={g.id} value={g.id}>
                        {g.nom} {g.code ? `(${g.code})` : ''}
                      </option>
                    ))}
                  </Select>
                </div>

                {/* Nombre ADT & CHD */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs font-bold text-muted-foreground mb-1.5 block">
                      Nombre Adultes (ADT) <span className="text-rose-500">*</span>
                    </Label>
                    <Input
                      type="number"
                      min="0"
                      required
                      placeholder="0"
                      value={diwanForm.adt_count}
                      onChange={e => setDiwanForm({ ...diwanForm, adt_count: e.target.value })}
                      className="h-10 text-xs font-black text-violet-400"
                    />
                  </div>

                  <div>
                    <Label className="text-xs font-bold text-muted-foreground mb-1.5 block">
                      Nombre Enfants (CHD)
                    </Label>
                    <Input
                      type="number"
                      min="0"
                      placeholder="0"
                      value={diwanForm.chd_count}
                      onChange={e => setDiwanForm({ ...diwanForm, chd_count: e.target.value })}
                      className="h-10 text-xs font-semibold text-blue-400"
                    />
                  </div>
                </div>

                {/* Tarif par Adulte */}
                <div>
                  <Label className="text-xs font-bold text-muted-foreground mb-1.5 block">
                    Tarif / Adulte (DZD) <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    required
                    value={diwanForm.tarif_par_assafir}
                    onChange={e => setDiwanForm({ ...diwanForm, tarif_par_assafir: e.target.value })}
                    className="h-10 text-xs font-semibold"
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">
                    * 5 000 DZD par défaut, appliqué uniquement sur le nombre d'adultes (ADT).
                  </p>
                </div>

                {/* Calcul Automatique du Total */}
                <div className="p-3.5 rounded-xl border border-border/60 bg-muted/20 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground">Total Assafers (Pax) :</span>
                    <Badge variant="outline" className="bg-violet-500/10 text-violet-300 border-violet-500/30 font-bold">
                      {computedDiwanFormTotal.totalAssafers} assafers ({Number(diwanForm.adt_count) || 0} ADT + {Number(diwanForm.chd_count) || 0} CHD)
                    </Badge>
                  </div>
                  <div className="pt-2 border-t border-border/40 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-foreground">Tarif Total Déclaration :</span>
                      <p className="text-[11px] text-muted-foreground">
                        {Number(diwanForm.adt_count) || 0} ADT &times; {Number(diwanForm.tarif_par_assafir || 5000).toLocaleString('fr-DZ')} DZD
                      </p>
                    </div>
                    <span className="text-base font-black text-amber-400">
                      {computedDiwanFormTotal.totalCost.toLocaleString('fr-DZ')} DZD
                    </span>
                  </div>
                </div>

                {/* Statut & Date Déclaration */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs font-bold text-muted-foreground mb-1.5 block">
                      Statut Déclaration
                    </Label>
                    <Select
                      value={diwanForm.statut}
                      onChange={e => setDiwanForm({ ...diwanForm, statut: e.target.value })}
                      className="h-10 text-xs w-full"
                    >
                      <option value="DÉCLARÉ">Déclaré</option>
                      <option value="VALIDÉ">Validé</option>
                      <option value="EN_ATTENTE">En attente</option>
                      <option value="PAYÉ">Payé</option>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-xs font-bold text-muted-foreground mb-1.5 block">
                      Date de Déclaration
                    </Label>
                    <Input
                      type="date"
                      value={diwanForm.date_declaration}
                      onChange={e => setDiwanForm({ ...diwanForm, date_declaration: e.target.value })}
                      className="h-10 text-xs"
                    />
                  </div>
                </div>

                {/* Description */}
                <div>
                  <Label className="text-xs font-bold text-muted-foreground mb-1.5 block">
                    Description & Notes
                  </Label>
                  <Textarea
                    rows={2}
                    placeholder="Bordereau Diwan, numéro de quittance..."
                    value={diwanForm.description}
                    onChange={e => setDiwanForm({ ...diwanForm, description: e.target.value })}
                    className="text-xs resize-none"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-2 border-t border-border/40">
                  <Button type="button" variant="outline" size="sm" onClick={() => setIsDiwanModalOpen(false)}>
                    Annuler
                  </Button>
                  <Button type="submit" size="sm" disabled={saving} className="bg-violet-600 hover:bg-violet-700 text-white font-bold">
                    {saving ? 'Enregistrement...' : editingDiwan ? 'Mettre à jour' : 'Enregistrer le Groupe Diwan'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </Layout>
  );
}
