import React, { useState, useEffect } from 'react';
import { 
  PlaneTakeoff, PlaneLanding, Plus, Trash2, Copy, Download, 
  RotateCcw, Sparkles, Check, Search, Calendar, User, Users, 
  Ticket, Building, ArrowRightLeft, CheckCircle2, History, Eye, RefreshCw,
  Luggage, ArrowRight, ShieldCheck
} from 'lucide-react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import useLocalStorage from '@/hooks/useLocalStorage';

// Aéroports fréquents avec codes IATA pour suggestions rapides
const COMMON_AIRPORTS = [
  { code: 'ALG', name: 'Alger (Houari Boumédiène)' },
  { code: 'ORN', name: 'Oran (Ahmed Ben Bella)' },
  { code: 'CZL', name: 'Constantine (Mohamed Boudiaf)' },
  { code: 'AAE', name: 'Annaba (Rabah Bitat)' },
  { code: 'BJA', name: 'Béjaïa (Soummam)' },
  { code: 'IST', name: 'Istanbul (Aéroport IST)' },
  { code: 'SAW', name: 'Istanbul (Sabiha Gökçen)' },
  { code: 'JED', name: 'Djeddah (King Abdulaziz)' },
  { code: 'MED', name: 'Médine (Prince Mohammad)' },
  { code: 'DXB', name: 'Dubaï International' },
  { code: 'DOH', name: 'Doha (Hamad International)' },
  { code: 'CDG', name: 'Paris (Charles de Gaulle)' },
  { code: 'ORY', name: 'Paris (Orly)' },
  { code: 'MRS', name: 'Marseille (Provence)' },
  { code: 'LYS', name: 'Lyon (Saint-Exupéry)' },
  { code: 'TUN', name: 'Tunis (Carthage)' },
  { code: 'CMN', name: 'Casablanca (Mohammed V)' },
  { code: 'CAI', name: 'Le Caire International' },
  { code: 'FRA', name: 'Francfort International' },
  { code: 'LHR', name: 'Londres (Heathrow)' },
  { code: 'MAD', name: 'Madrid (Barajas)' },
  { code: 'BCN', name: 'Barcelone (El Prat)' },
  { code: 'FCO', name: 'Rome (Fiumicino)' },
  { code: 'YUL', name: 'Montréal (Trudeau)' }
];

const Telex = () => {
  const [activeTab, setActiveTab] = useState('generator'); // 'generator' | 'history'
  
  // Settings & DB Data
  const [agencySettings, setAgencySettings] = useState(null);
  const [airlinesList, setAirlinesList] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [selectedAirlineId, setSelectedAirlineId] = useState('');
  const [selectedAirlineNom, setSelectedAirlineNom] = useState('Turkish Airlines');
  const [selectedAirlineCode, setSelectedAirlineCode] = useState('TK');
  const [customAirline, setCustomAirline] = useState(false);

  const [pnr, setPnr] = useState('TK89XA');
  const [mainTicketNumber, setMainTicketNumber] = useState('235-9847291034');
  const [prix, setPrix] = useState('85000');
  const [devise, setDevise] = useState('DZD');
  const [statutBillet, setStatutBillet] = useState('CONFIRMÉ');
  const [dateEmission, setDateEmission] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('Prière de vous présenter à l\'aéroport 3 heures avant le décollage pour l\'enregistrement des bagages.');

  // Passengers State
  const [passagers, setPassagers] = useState([
    { civilite: 'MR', nom: 'BENALI', prenom: 'MOHAMED', type: 'Adulte', numero_billet: '235-9847291034' }
  ]);

  // Flight Segments State
  const [vols, setVols] = useState([
    {
      ville_depart: 'ALG',
      ville_arrivee: 'IST',
      date_heure_depart: '2026-09-22T23:00',
      date_heure_arrivee: '2026-09-23T04:00',
      numero_vol: 'TK 652',
      classe: 'Économique (Y)',
      bagage: '2 x 23 Kg',
      statut: 'CONFIRMÉ (HK1)',
      terminal_depart: 'T4 (International)',
      terminal_arrivee: 'Main Terminal'
    },
    {
      ville_depart: 'IST',
      ville_arrivee: 'ALG',
      date_heure_depart: '2026-09-27T16:00',
      date_heure_arrivee: '2026-09-27T22:00',
      numero_vol: 'TK 651',
      classe: 'Économique (Y)',
      bagage: '2 x 23 Kg',
      statut: 'CONFIRMÉ (HK1)',
      terminal_depart: 'Main Terminal',
      terminal_arrivee: 'T4 (International)'
    }
  ]);

  // History State
  const [historyList, setHistoryList] = useState([]);
  const [localHistory, setLocalHistory] = useLocalStorage('agencycrm_telex_history', []);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [successAlert, setSuccessAlert] = useState(false);

  // Fetch Airlines & Agency Settings
  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Agency Settings
      const { data: agencyData } = await supabase.from('agency_settings').select('*').single();
      if (agencyData) {
        setAgencySettings(agencyData);
      }

      // 2. Fetch Airlines from both tables (airlines & compagnies_aeriennes)
      const [airlinesRes, compRes] = await Promise.all([
        supabase.from('airlines').select('*').order('nom'),
        supabase.from('compagnies_aeriennes').select('*').order('nom')
      ]);

      let combinedAirlines = [];
      if (airlinesRes.data && airlinesRes.data.length > 0) {
        combinedAirlines = airlinesRes.data.map(a => ({
          id: a.id,
          code: a.code_iata || a.code || 'XX',
          nom: a.nom
        }));
      }

      if (compRes.data && compRes.data.length > 0) {
        compRes.data.forEach(c => {
          if (!combinedAirlines.some(a => a.nom.toLowerCase() === c.nom.toLowerCase())) {
            combinedAirlines.push({
              id: c.id,
              code: c.code || 'XX',
              nom: c.nom
            });
          }
        });
      }

      // Default fallback airlines if database is empty
      if (combinedAirlines.length === 0) {
        combinedAirlines = [
          { id: '1', code: 'AH', nom: 'Air Algérie' },
          { id: '2', code: 'TK', nom: 'Turkish Airlines' },
          { id: '3', code: 'QR', nom: 'Qatar Airways' },
          { id: '4', code: 'SV', nom: 'Saudia Airlines' },
          { id: '5', code: 'AF', nom: 'Air France' },
          { id: '6', code: 'EK', nom: 'Emirates' },
          { id: '7', code: 'TU', nom: 'Tunisair' },
          { id: '8', code: 'AT', nom: 'Royal Air Maroc' },
          { id: '9', code: 'LH', nom: 'Lufthansa' },
          { id: '10', code: 'MS', nom: 'EgyptAir' }
        ];
      }

      setAirlinesList(combinedAirlines);
      fetchHistory();
    } catch (err) {
      console.error('Error fetching initial telex data:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    try {
      const { data, error } = await supabase.from('billets_telex').select('*').order('created_at', { ascending: false });
      if (!error && data) {
        setHistoryList(data);
      } else {
        setHistoryList(localHistory || []);
      }
    } catch {
      setHistoryList(localHistory || []);
    }
  };

  // Airline change handler
  const handleAirlineChange = (e) => {
    const val = e.target.value;
    if (val === 'custom') {
      setCustomAirline(true);
      setSelectedAirlineId('custom');
      setSelectedAirlineNom('');
      setSelectedAirlineCode('');
    } else {
      setCustomAirline(false);
      const found = airlinesList.find(a => a.id === val || a.nom === val);
      if (found) {
        setSelectedAirlineId(found.id);
        setSelectedAirlineNom(found.nom);
        setSelectedAirlineCode(found.code);
      }
    }
  };

  // Passenger Handlers
  const handleAddPassenger = () => {
    setPassagers([
      ...passagers,
      { civilite: 'MR', nom: '', prenom: '', type: 'Adulte', numero_billet: mainTicketNumber }
    ]);
  };

  const handleRemovePassenger = (index) => {
    if (passagers.length === 1) return;
    setPassagers(passagers.filter((_, i) => i !== index));
  };

  const handlePassengerChange = (index, field, value) => {
    const updated = [...passagers];
    updated[index][field] = value;
    setPassagers(updated);
  };

  // Flight Segment Handlers
  const handleAddSegment = () => {
    const lastSeg = vols[vols.length - 1];
    const newDepart = lastSeg ? lastSeg.ville_arrivee : 'ALG';
    const newArrivee = 'IST';

    setVols([
      ...vols,
      {
        ville_depart: newDepart,
        ville_arrivee: newArrivee,
        date_heure_depart: lastSeg?.date_heure_arrivee || '2026-09-24T10:00',
        date_heure_arrivee: '2026-09-24T14:00',
        numero_vol: selectedAirlineCode ? `${selectedAirlineCode} ${Math.floor(100 + Math.random() * 900)}` : 'VOL 101',
        classe: 'Économique (Y)',
        bagage: '2 x 23 Kg',
        statut: 'CONFIRMÉ (HK1)',
        terminal_depart: '',
        terminal_arrivee: ''
      }
    ]);
  };

  const handleAddReturnFlight = () => {
    if (vols.length === 0) {
      handleAddSegment();
      return;
    }
    const lastSeg = vols[vols.length - 1];
    setVols([
      ...vols,
      {
        ville_depart: lastSeg.ville_arrivee,
        ville_arrivee: lastSeg.ville_depart,
        date_heure_depart: '2026-09-28T14:00',
        date_heure_arrivee: '2026-09-28T18:00',
        numero_vol: selectedAirlineCode ? `${selectedAirlineCode} ${Math.floor(100 + Math.random() * 900)}` : 'VOL 102',
        classe: lastSeg.classe || 'Économique (Y)',
        bagage: lastSeg.bagage || '2 x 23 Kg',
        statut: 'CONFIRMÉ (HK1)',
        terminal_depart: lastSeg.terminal_arrivee || '',
        terminal_arrivee: lastSeg.terminal_depart || ''
      }
    ]);
  };

  const handleRemoveSegment = (index) => {
    if (vols.length === 1) return;
    setVols(vols.filter((_, i) => i !== index));
  };

  const handleDuplicateSegment = (index) => {
    const seg = vols[index];
    setVols([...vols, { ...seg }]);
  };

  const handleSegmentChange = (index, field, value) => {
    const updated = [...vols];
    updated[index][field] = value;
    setVols(updated);
  };

  // Quick Random PNR generator
  const generateRandomPNR = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPnr(result);
  };

  // Format Dates
  const formatFlightDateTime = (dtStr) => {
    if (!dtStr) return { date: '—', time: '—' };
    try {
      const dt = parseISO(dtStr);
      return {
        date: format(dt, 'EEE dd MMM yyyy', { locale: fr }),
        time: format(dt, 'HH:mm')
      };
    } catch {
      return { date: dtStr, time: '' };
    }
  };

  // Generate Current Object
  const getTicketData = () => {
    const mainPassengerName = passagers.map(p => `${p.nom.toUpperCase()} / ${p.prenom.toUpperCase()} ${p.civilite}`).join(', ');
    return {
      pnr: pnr.toUpperCase(),
      numero_billet: mainTicketNumber,
      compagnie_id: selectedAirlineId !== 'custom' ? selectedAirlineId : null,
      compagnie_nom: selectedAirlineNom,
      compagnie_code: selectedAirlineCode.toUpperCase(),
      passagers: passagers,
      passager_nom: mainPassengerName || 'PASSAGER',
      prix: parseFloat(prix) || 0,
      devise: devise || 'DZD',
      vols: vols,
      statut: statutBillet,
      date_emission: dateEmission,
      notes: notes,
      created_at: new Date().toISOString()
    };
  };

  // Save to DB and LocalStorage
  const handleSaveTicket = async () => {
    setIsSaving(true);
    const ticketData = getTicketData();

    try {
      const { data, error } = await supabase.from('billets_telex').insert([ticketData]).select();
      if (!error && data && data.length > 0) {
        setHistoryList([data[0], ...historyList]);
      } else {
        const newLocal = [{ id: 'local_' + Date.now(), ...ticketData }, ...localHistory];
        setLocalHistory(newLocal);
        setHistoryList(newLocal);
      }
      setSuccessAlert(true);
      setTimeout(() => setSuccessAlert(false), 4000);
    } catch (err) {
      console.warn('Saving to local storage due to DB sync error:', err);
      const newLocal = [{ id: 'local_' + Date.now(), ...ticketData }, ...localHistory];
      setLocalHistory(newLocal);
      setHistoryList(newLocal);
      setSuccessAlert(true);
      setTimeout(() => setSuccessAlert(false), 4000);
    } finally {
      setIsSaving(false);
    }
  };

  // Delete from DB
  const handleDeleteHistory = async (id) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce billet télex de l\'historique ?')) return;
    try {
      await supabase.from('billets_telex').delete().eq('id', id);
    } catch (err) {
      console.error(err);
    }
    const updated = historyList.filter(h => h.id !== id);
    setHistoryList(updated);
    setLocalHistory(updated);
  };

  // Load from history into form
  const handleLoadFromHistory = (item) => {
    setPnr(item.pnr || '');
    setMainTicketNumber(item.numero_billet || '');
    setSelectedAirlineNom(item.compagnie_nom || '');
    setSelectedAirlineCode(item.compagnie_code || '');
    setPrix(String(item.prix || '0'));
    setDevise(item.devise || 'DZD');
    setStatutBillet(item.statut || 'CONFIRMÉ');
    setNotes(item.notes || '');
    if (item.passagers && Array.isArray(item.passagers) && item.passagers.length > 0) {
      setPassagers(item.passagers);
    }
    if (item.vols && Array.isArray(item.vols) && item.vols.length > 0) {
      setVols(item.vols);
    }
    setActiveTab('generator');
  };

  // ==================== PDF GENERATOR PROFESSIONNEL & ÉPURÉ ====================
  const handleGeneratePDF = async (customDoc = null) => {
    const docData = customDoc || getTicketData();
    const pdf = new jsPDF('p', 'pt', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const marginX = 36;
    const rightMarginX = pageWidth - marginX;
    const contentWidth = pageWidth - marginX * 2;

    // Palette de couleurs Airline & Travel haut de gamme
    const PRIMARY_COLOR = [15, 23, 42]; // #0F172A Slate 900
    const ACCENT_COLOR = [14, 116, 144]; // #0E7490 Cyan 700
    const TEXT_MUTED = [100, 116, 139]; // #64748B Slate 500
    const CARD_BG = [248, 250, 252]; // #F8FAFC
    const CARD_BORDER = [226, 232, 240]; // #E2E8F0

    // 1. En-tête Agence (Logo & Coordonnées)
    let currentY = 34;
    let logoDrawn = false;

    if (agencySettings?.logo_url) {
      try {
        const match = agencySettings.logo_url.match(/^data:image\/(png|jpeg|jpg);base64,/);
        let format = 'JPEG';
        if (match && match[1] === 'png') format = 'PNG';

        const dim = await new Promise(resolve => {
          const img = new window.Image();
          img.onload = () => resolve({ w: img.width, h: img.height });
          img.onerror = () => resolve({ w: 140, h: 55 });
          img.src = agencySettings.logo_url;
        });

        const MAX_W = 135;
        const MAX_H = 55;
        let finalW = dim.w;
        let finalH = dim.h;
        if (finalW > MAX_W) {
          finalH = (MAX_W * finalH) / finalW;
          finalW = MAX_W;
        }
        if (finalH > MAX_H) {
          finalW = (MAX_H * finalW) / finalH;
          finalH = MAX_H;
        }

        pdf.addImage(agencySettings.logo_url, format, marginX, currentY, finalW, finalH);
        logoDrawn = true;
      } catch (err) {
        console.warn('Could not load logo into PDF:', err);
      }
    }

    // Coordonnées Agence
    const infoX = logoDrawn ? marginX + 150 : marginX;
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(16);
    pdf.setTextColor(...PRIMARY_COLOR);
    pdf.text(agencySettings?.nom_agence || 'EL MOKHTAR TOURISME & VOYAGE', infoX, currentY + 14);

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8.5);
    pdf.setTextColor(...TEXT_MUTED);
    let agencyDetailsY = currentY + 28;
    if (agencySettings?.adresse) {
      pdf.text(agencySettings.adresse, infoX, agencyDetailsY);
      agencyDetailsY += 12;
    }
    const contacts = [
      agencySettings?.telephone ? `Tél : ${agencySettings.telephone}` : '',
      agencySettings?.email ? `Email : ${agencySettings.email}` : ''
    ].filter(Boolean).join('   |   ');
    if (contacts) {
      pdf.text(contacts, infoX, agencyDetailsY);
      agencyDetailsY += 12;
    }

    // 2. Bannière Titre Billet Électronique
    currentY = Math.max(currentY + 64, agencyDetailsY + 10);
    
    // Header Bar
    pdf.setFillColor(15, 23, 42); // Deep Slate
    pdf.roundedRect(marginX, currentY, contentWidth, 26, 3, 3, 'F');

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(10.5);
    pdf.setTextColor(255, 255, 255);
    pdf.text('BILLET ÉLECTRONIQUE  /  ELECTRONIC TICKET & ITINÉRAIRE', marginX + 12, currentY + 17);

    pdf.setFontSize(9);
    pdf.text(`STATUT : ${docData.statut || 'CONFIRMÉ'}`, rightMarginX - 12, currentY + 17, { align: 'right' });

    currentY += 34;

    // 3. Cadre Résumé de Réservation (Sans mention 'Émis par')
    pdf.setFillColor(...CARD_BG);
    pdf.setDrawColor(...CARD_BORDER);
    pdf.setLineWidth(0.8);
    pdf.roundedRect(marginX, currentY, contentWidth, 58, 4, 4, 'FD');

    // Colonne 1 : PNR
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7.5);
    pdf.setTextColor(...TEXT_MUTED);
    pdf.text('CODE DE RÉSERVATION (PNR)', marginX + 16, currentY + 18);

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(16);
    pdf.setTextColor(...ACCENT_COLOR);
    pdf.text(docData.pnr || 'N/A', marginX + 16, currentY + 38);

    // Colonne 2 : Compagnie Aérienne & N° Billet
    const col2X = marginX + 160;
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7.5);
    pdf.setTextColor(...TEXT_MUTED);
    pdf.text('COMPAGNIE ÉMETTRICE', col2X, currentY + 18);

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(11);
    pdf.setTextColor(...PRIMARY_COLOR);
    pdf.text(`${docData.compagnie_nom || 'Compagnie Aérienne'} (${docData.compagnie_code || '—'})`, col2X, currentY + 34);
    
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(...TEXT_MUTED);
    pdf.text(`N° Billet Principal : ${docData.numero_billet || 'N/A'}`, col2X, currentY + 47);

    // Colonne 3 : Date d'émission
    const col3X = marginX + 370;
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7.5);
    pdf.setTextColor(...TEXT_MUTED);
    pdf.text('DATE D\'ÉMISSION', col3X, currentY + 18);

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(11);
    pdf.setTextColor(...PRIMARY_COLOR);
    const dateFormatted = docData.date_emission 
      ? format(parseISO(docData.date_emission), 'dd/MM/yyyy') 
      : format(new Date(), 'dd/MM/yyyy');
    pdf.text(dateFormatted, col3X, currentY + 36);

    currentY += 68;

    // 4. Section 1 : Passagers
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(9.5);
    pdf.setTextColor(...PRIMARY_COLOR);
    pdf.text('1. DÉTAILS DU / DES PASSAGER(S)', marginX, currentY);

    currentY += 8;

    const passengerRows = (docData.passagers && docData.passagers.length > 0)
      ? docData.passagers.map((p, idx) => [
          `${idx + 1}`,
          `${p.nom.toUpperCase()} / ${p.prenom.toUpperCase()} ${p.civilite || ''}`,
          p.type || 'Adulte',
          p.numero_billet || docData.numero_billet || '—',
          'OK'
        ])
      : [
          ['1', docData.passager_nom || 'PASSAGER', 'Adulte', docData.numero_billet || '—', 'OK']
        ];

    autoTable(pdf, {
      startY: currentY,
      margin: { left: marginX, right: marginX },
      head: [['#', 'Nom & Prénom du Passager', 'Type', 'Numéro de Billet Électronique', 'Statut']],
      body: passengerRows,
      theme: 'grid',
      headStyles: {
        fillColor: [15, 23, 42],
        textColor: 255,
        fontSize: 8.5,
        fontStyle: 'bold',
        cellPadding: 5
      },
      styles: {
        fontSize: 8.5,
        cellPadding: 5.5,
        textColor: [30, 41, 59]
      },
      columnStyles: {
        0: { cellWidth: 26, halign: 'center' },
        1: { fontStyle: 'bold' },
        2: { cellWidth: 75, halign: 'center' },
        3: { cellWidth: 155, halign: 'center' },
        4: { cellWidth: 50, halign: 'center', textColor: [16, 149, 106], fontStyle: 'bold' }
      }
    });

    currentY = pdf.lastAutoTable.finalY + 16;

    // 5. Section 2 : Itinéraire Multi-Destinations
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(9.5);
    pdf.setTextColor(...PRIMARY_COLOR);
    pdf.text('2. ITINÉRAIRE DÉTAILLÉ DES VOLS (MULTI-DESTINATIONS)', marginX, currentY);

    currentY += 8;

    const flightRows = (docData.vols || []).map((v, i) => {
      const dep = formatFlightDateTime(v.date_heure_depart);
      const arr = formatFlightDateTime(v.date_heure_arrivee);

      return [
        `Vol ${i + 1}`,
        `${v.numero_vol || (docData.compagnie_code || 'VOL') + ' ' + (i + 100)}\n${v.classe || 'Éco'}`,
        `${v.ville_depart}\n${dep.date}\n${dep.time}${v.terminal_depart ? '\nTerm: ' + v.terminal_depart : ''}`,
        `${v.ville_arrivee}\n${arr.date}\n${arr.time}${v.terminal_arrivee ? '\nTerm: ' + v.terminal_arrivee : ''}`,
        v.bagage || '2 x 23 Kg',
        v.statut || 'CONFIRMÉ'
      ];
    });

    autoTable(pdf, {
      startY: currentY,
      margin: { left: marginX, right: marginX },
      head: [['Vol', 'N° Vol & Classe', 'Départ (Ville & Heure)', 'Arrivée (Ville & Heure)', 'Franchise Bagage', 'Statut']],
      body: flightRows,
      theme: 'grid',
      headStyles: {
        fillColor: [14, 116, 144],
        textColor: 255,
        fontSize: 8.5,
        fontStyle: 'bold',
        cellPadding: 5.5
      },
      styles: {
        fontSize: 8,
        cellPadding: 6,
        valign: 'middle'
      },
      columnStyles: {
        0: { cellWidth: 48, halign: 'center', fontStyle: 'bold', fillColor: [248, 250, 252] },
        1: { cellWidth: 85, halign: 'center', fontStyle: 'bold' },
        2: { cellWidth: 125 },
        3: { cellWidth: 125 },
        4: { cellWidth: 80, halign: 'center' },
        5: { halign: 'center', textColor: [16, 149, 106], fontStyle: 'bold' }
      }
    });

    currentY = pdf.lastAutoTable.finalY + 16;

    // 6. Section 3 : Tarification Totale
    pdf.setFillColor(...CARD_BG);
    pdf.setDrawColor(...CARD_BORDER);
    pdf.setLineWidth(0.8);
    pdf.roundedRect(marginX, currentY, contentWidth, 38, 3, 3, 'FD');

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(...TEXT_MUTED);
    pdf.text('MONTANT TOTAL DU BILLET (TTC) :', marginX + 16, currentY + 15);

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(13);
    pdf.setTextColor(...PRIMARY_COLOR);
    const cleanPrice = String(docData.prix || '0').replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    pdf.text(`${cleanPrice} ${docData.devise || 'DZD'}`, marginX + 16, currentY + 29);

    currentY += 46;

    // 7. Section 4 : Consignes & Conditions Importantes de Voyage
    pdf.setFillColor(254, 243, 199); // Soft amber
    pdf.setDrawColor(245, 158, 11); // Amber 500
    pdf.setLineWidth(0.5);
    pdf.roundedRect(marginX, currentY, contentWidth, 68, 3, 3, 'FD');

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8);
    pdf.setTextColor(146, 64, 14);
    pdf.text('CONSIGNES ET CONDITIONS IMPORTANTES DU VOYAGEUR :', marginX + 12, currentY + 14);

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7.5);
    pdf.setTextColor(120, 53, 15);
    pdf.text('- ENREGISTREMENT : Présentation obligatoire au comptoir au moins 3 heures avant le départ international.', marginX + 12, currentY + 27);
    pdf.text('- PASSEPORT & VISAS : Passeport valide au minimum 6 mois après la date de retour. Visas sous la responsabilité du client.', marginX + 12, currentY + 39);
    pdf.text('- FRANCHISE BAGAGES : Respectez les poids indiqués ci-dessus. Tout excédent sera facturé directement à l\'aéroport.', marginX + 12, currentY + 51);
    pdf.text('- MODIFICATION / ANNULATION : Billet soumis aux règles tarifaires de la compagnie. Contactez l\'agence pour toute modification.', marginX + 12, currentY + 63);

    // 8. Bas de Page
    const footerY = pageHeight - 34;
    pdf.setDrawColor(226, 232, 240);
    pdf.setLineWidth(0.6);
    pdf.line(marginX, footerY - 8, rightMarginX, footerY - 8);

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7.5);
    pdf.setTextColor(...TEXT_MUTED);
    pdf.text(`Document officiel généré le ${format(new Date(), 'dd/MM/yyyy à HH:mm')}`, marginX, footerY + 4);
    pdf.text('Ce billet électronique fait office de reçu et d\'itinéraire officiel', rightMarginX, footerY + 4, { align: 'right' });

    // Enregistrement
    const filename = `TELEX_${docData.pnr || 'BILLET'}_${(docData.passagers?.[0]?.nom || 'PASSAGER').toUpperCase()}.pdf`;
    pdf.save(filename);
  };

  return (
    <Layout>
      <div className="space-y-6 max-w-7xl mx-auto pb-12">
        {/* Header Title */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 rounded-2xl text-white shadow-xl border border-slate-800 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
          
          <div className="space-y-1 relative z-10">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-primary/20 backdrop-blur-md rounded-xl border border-primary/30 text-primary-foreground">
                <PlaneTakeoff className="h-6 w-6 text-cyan-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                  Générateur de Billet Télex
                  <Badge variant="outline" className="border-cyan-500/40 text-cyan-300 bg-cyan-950/40 font-mono text-xs">
                    Multi-destinations
                  </Badge>
                </h1>
                <p className="text-sm text-slate-400">
                  Composez vos itinéraires de vol personnalisés, générez et imprimez des billets électroniques officiels avec votre marque.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 relative z-10">
            <Button
              variant={activeTab === 'generator' ? 'default' : 'outline'}
              onClick={() => setActiveTab('generator')}
              className={cn(
                "gap-2 transition-all",
                activeTab === 'generator' 
                  ? "bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg shadow-cyan-900/30" 
                  : "bg-slate-800/80 border-slate-700 text-slate-300 hover:text-white"
              )}
            >
              <Ticket size={16} /> Nouveau Télex
            </Button>
            <Button
              variant={activeTab === 'history' ? 'default' : 'outline'}
              onClick={() => { setActiveTab('history'); fetchHistory(); }}
              className={cn(
                "gap-2 transition-all",
                activeTab === 'history' 
                  ? "bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg shadow-cyan-900/30" 
                  : "bg-slate-800/80 border-slate-700 text-slate-300 hover:text-white"
              )}
            >
              <History size={16} /> Historique ({historyList.length})
            </Button>
          </div>
        </div>

        {/* Alert Notification */}
        {successAlert && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-4 py-3 rounded-xl flex items-center justify-between animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={18} className="text-emerald-400" />
              <span className="text-sm font-medium">Billet télex sauvegardé avec succès dans l'historique !</span>
            </div>
            <Button size="sm" variant="ghost" onClick={() => setSuccessAlert(false)} className="h-7 text-xs text-emerald-300 hover:bg-emerald-500/20">
              Fermer
            </Button>
          </div>
        )}

        {/* TAB 1 : GENERATEUR DE BILLET TELEX */}
        {activeTab === 'generator' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Colonne Gauche : Formulaire de Saisie */}
            <div className="lg:col-span-7 space-y-6">
              
              {/* Carte 1 : Compagnie & Informations Générales */}
              <Card className="border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                <div className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800/50 px-5 py-3.5 border-b flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Building size={18} className="text-primary" />
                    <span className="font-semibold text-sm">Compagnie Aérienne & Référence Dossier</span>
                  </div>
                  <Badge variant="secondary" className="text-[11px] font-mono">
                    Étape 1
                  </Badge>
                </div>

                <CardContent className="p-5 space-y-4">
                  {/* Compagnie Aérienne Selector */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Compagnie Aérienne <span className="text-rose-500">*</span>
                      </Label>
                      <select
                        className="w-full h-10 border rounded-lg px-3 bg-white dark:bg-slate-950 text-sm font-medium focus:ring-2 focus:ring-primary outline-none transition"
                        value={customAirline ? 'custom' : (selectedAirlineNom || '')}
                        onChange={handleAirlineChange}
                      >
                        <optgroup label="Compagnies enregistrées (Base de données)">
                          {airlinesList.map((a) => (
                            <option key={a.id} value={a.nom}>
                              [{a.code}] {a.nom}
                            </option>
                          ))}
                        </optgroup>
                        <option value="custom">✏️ Autre compagnie (saisie manuelle)...</option>
                      </select>
                    </div>

                    {customAirline ? (
                      <div className="grid grid-cols-3 gap-2">
                        <div className="col-span-2 space-y-1.5">
                          <Label className="text-xs font-semibold">Nom Compagnie</Label>
                          <Input
                            placeholder="Ex: Flynas"
                            value={selectedAirlineNom}
                            onChange={(e) => setSelectedAirlineNom(e.target.value)}
                            className="h-10 text-sm"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold">Code IATA</Label>
                          <Input
                            placeholder="XY"
                            value={selectedAirlineCode}
                            onChange={(e) => setSelectedAirlineCode(e.target.value.toUpperCase())}
                            className="h-10 text-sm uppercase text-center font-mono font-bold"
                            maxLength={3}
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                          Code Compagnie (IATA)
                        </Label>
                        <Input
                          value={selectedAirlineCode}
                          onChange={(e) => setSelectedAirlineCode(e.target.value.toUpperCase())}
                          className="h-10 font-mono font-bold text-cyan-600 dark:text-cyan-400 uppercase tracking-widest text-sm"
                          maxLength={3}
                        />
                      </div>
                    )}
                  </div>

                  {/* PNR & N° Billet */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                          Code PNR (GDS) <span className="text-rose-500">*</span>
                        </Label>
                        <button
                          type="button"
                          onClick={generateRandomPNR}
                          className="text-[11px] text-cyan-600 hover:text-cyan-500 font-medium flex items-center gap-1"
                        >
                          <Sparkles size={11} /> Auto
                        </button>
                      </div>
                      <Input
                        placeholder="Ex: TK789X"
                        value={pnr}
                        onChange={(e) => setPnr(e.target.value.toUpperCase())}
                        className="h-10 font-mono font-bold text-base tracking-widest uppercase bg-cyan-50/50 dark:bg-cyan-950/30 border-cyan-200 dark:border-cyan-800"
                        maxLength={8}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        N° de Billet Électronique
                      </Label>
                      <Input
                        placeholder="Ex: 235-9847291034"
                        value={mainTicketNumber}
                        onChange={(e) => setMainTicketNumber(e.target.value)}
                        className="h-10 font-mono text-sm"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Statut du Billet
                      </Label>
                      <select
                        className="w-full h-10 border rounded-lg px-3 bg-white dark:bg-slate-950 text-xs font-semibold focus:ring-2 focus:ring-primary outline-none"
                        value={statutBillet}
                        onChange={(e) => setStatutBillet(e.target.value)}
                      >
                        <option value="CONFIRMÉ">CONFIRMÉ (OK)</option>
                        <option value="ÉMIS">ÉMIS</option>
                        <option value="RÉSERVÉ">RÉSERVÉ</option>
                        <option value="EN ATTENTE">EN ATTENTE</option>
                      </select>
                    </div>
                  </div>

                  {/* Prix, Devise & Date d'émission */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Prix Total (TTC) <span className="text-rose-500">*</span>
                      </Label>
                      <div className="relative">
                        <Input
                          type="number"
                          placeholder="85000"
                          value={prix}
                          onChange={(e) => setPrix(e.target.value)}
                          className="h-10 font-bold text-sm pr-14"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">
                          {devise}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Devise
                      </Label>
                      <select
                        className="w-full h-10 border rounded-lg px-3 bg-white dark:bg-slate-950 text-sm font-medium focus:ring-2 focus:ring-primary outline-none"
                        value={devise}
                        onChange={(e) => setDevise(e.target.value)}
                      >
                        <option value="DZD">DZD (Dinar Algérien)</option>
                        <option value="EUR">EUR (€)</option>
                        <option value="USD">USD ($)</option>
                        <option value="SAR">SAR (Riyal Saoudien)</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Date d'Émission
                      </Label>
                      <Input
                        type="date"
                        value={dateEmission}
                        onChange={(e) => setDateEmission(e.target.value)}
                        className="h-10 text-sm"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Carte 2 : Passager(s) */}
              <Card className="border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                <div className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800/50 px-5 py-3.5 border-b flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users size={18} className="text-primary" />
                    <span className="font-semibold text-sm">Passager(s) ({passagers.length})</span>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleAddPassenger}
                    className="h-8 text-xs gap-1 border-primary/30 text-primary hover:bg-primary/10"
                  >
                    <Plus size={14} /> Ajouter un passager
                  </Button>
                </div>

                <CardContent className="p-5 space-y-3">
                  {passagers.map((p, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl border bg-slate-50/50 dark:bg-slate-900/40 space-y-3 relative group transition hover:border-slate-300 dark:hover:border-slate-700"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                          <User size={13} className="text-primary" /> Passager #{idx + 1}
                        </span>
                        {passagers.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemovePassenger(idx)}
                            className="h-7 w-7 text-rose-500 hover:bg-rose-500/10 hover:text-rose-600"
                          >
                            <Trash2 size={13} />
                          </Button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                        <div className="md:col-span-2 space-y-1">
                          <Label className="text-[11px] text-muted-foreground">Civilité</Label>
                          <select
                            className="w-full h-9 border rounded-md px-2 bg-white dark:bg-slate-950 text-xs font-medium"
                            value={p.civilite}
                            onChange={(e) => handlePassengerChange(idx, 'civilite', e.target.value)}
                          >
                            <option value="MR">MR</option>
                            <option value="MME">MME</option>
                            <option value="MLLE">MLLE</option>
                            <option value="CHD">CHD (Enfant)</option>
                            <option value="INF">INF (Bébé)</option>
                          </select>
                        </div>

                        <div className="md:col-span-4 space-y-1">
                          <Label className="text-[11px] text-muted-foreground">Nom de Famille</Label>
                          <Input
                            placeholder="Ex: BENALI"
                            value={p.nom}
                            onChange={(e) => handlePassengerChange(idx, 'nom', e.target.value.toUpperCase())}
                            className="h-9 text-xs font-bold uppercase"
                          />
                        </div>

                        <div className="md:col-span-3 space-y-1">
                          <Label className="text-[11px] text-muted-foreground">Prénom(s)</Label>
                          <Input
                            placeholder="Ex: MOHAMED"
                            value={p.prenom}
                            onChange={(e) => handlePassengerChange(idx, 'prenom', e.target.value.toUpperCase())}
                            className="h-9 text-xs font-medium uppercase"
                          />
                        </div>

                        <div className="md:col-span-3 space-y-1">
                          <Label className="text-[11px] text-muted-foreground">Type</Label>
                          <select
                            className="w-full h-9 border rounded-md px-2 bg-white dark:bg-slate-950 text-xs font-medium"
                            value={p.type}
                            onChange={(e) => handlePassengerChange(idx, 'type', e.target.value)}
                          >
                            <option value="Adulte">Adulte (ADT)</option>
                            <option value="Enfant">Enfant (CNN)</option>
                            <option value="Bébé">Bébé (INF)</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Carte 3 : Itinéraire des Vols Multi-Destinations */}
              <Card className="border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                <div className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800/50 px-5 py-3.5 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <PlaneTakeoff size={18} className="text-primary" />
                    <div>
                      <span className="font-semibold text-sm">Vols & Itinéraire Multi-destinations</span>
                      <span className="text-xs text-muted-foreground ml-2">({vols.length} segment{vols.length > 1 ? 's' : ''})</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={handleAddReturnFlight}
                      className="h-8 text-xs gap-1 text-slate-700 dark:text-slate-300"
                    >
                      <ArrowRightLeft size={13} /> + Vol Retour
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleAddSegment}
                      className="h-8 text-xs gap-1 bg-cyan-600 hover:bg-cyan-500 text-white"
                    >
                      <Plus size={14} /> + Nouveau Vol
                    </Button>
                  </div>
                </div>

                <CardContent className="p-5 space-y-4">
                  {vols.map((vol, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/50 space-y-4 shadow-sm relative group"
                    >
                      {/* En-tête Segment */}
                      <div className="flex items-center justify-between border-b pb-2.5">
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-300">
                            VOL {idx + 1}
                          </span>
                          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                            {vol.ville_depart || '???'} <ArrowRight size={12} className="text-muted-foreground" /> {vol.ville_arrivee || '???'}
                          </span>
                        </div>

                        <div className="flex items-center gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            title="Dupliquer ce vol"
                            onClick={() => handleDuplicateSegment(idx)}
                            className="h-7 w-7 text-slate-500 hover:text-slate-700"
                          >
                            <Copy size={13} />
                          </Button>
                          {vols.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              title="Supprimer ce vol"
                              onClick={() => handleRemoveSegment(idx)}
                              className="h-7 w-7 text-rose-500 hover:bg-rose-500/10 hover:text-rose-600"
                            >
                              <Trash2 size={13} />
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Villes Départ & Arrivée */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                            <PlaneTakeoff size={13} className="text-cyan-600" /> Ville / Aéroport Départ (Code IATA)
                          </Label>
                          <div className="flex gap-2">
                            <Input
                              placeholder="Ex: ALG (Alger)"
                              value={vol.ville_depart}
                              onChange={(e) => handleSegmentChange(idx, 'ville_depart', e.target.value.toUpperCase())}
                              className="h-9 text-xs font-bold uppercase"
                            />
                            <select
                              className="h-9 border rounded-md px-2 bg-muted/40 text-[11px] font-medium max-w-[130px]"
                              onChange={(e) => {
                                if (e.target.value) handleSegmentChange(idx, 'ville_depart', e.target.value);
                              }}
                              value=""
                            >
                              <option value="">Aéroports...</option>
                              {COMMON_AIRPORTS.map(a => (
                                <option key={a.code} value={a.code}>
                                  {a.code} - {a.name.split(' ')[0]}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                            <PlaneLanding size={13} className="text-cyan-600" /> Ville / Aéroport Arrivée (Code IATA)
                          </Label>
                          <div className="flex gap-2">
                            <Input
                              placeholder="Ex: IST (Istanbul)"
                              value={vol.ville_arrivee}
                              onChange={(e) => handleSegmentChange(idx, 'ville_arrivee', e.target.value.toUpperCase())}
                              className="h-9 text-xs font-bold uppercase"
                            />
                            <select
                              className="h-9 border rounded-md px-2 bg-muted/40 text-[11px] font-medium max-w-[130px]"
                              onChange={(e) => {
                                if (e.target.value) handleSegmentChange(idx, 'ville_arrivee', e.target.value);
                              }}
                              value=""
                            >
                              <option value="">Aéroports...</option>
                              {COMMON_AIRPORTS.map(a => (
                                <option key={a.code} value={a.code}>
                                  {a.code} - {a.name.split(' ')[0]}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>

                      {/* Dates & Heures */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                            <Calendar size={13} className="text-primary" /> Date et Heure Départ <span className="text-rose-500">*</span>
                          </Label>
                          <Input
                            type="datetime-local"
                            value={vol.date_heure_depart}
                            onChange={(e) => handleSegmentChange(idx, 'date_heure_depart', e.target.value)}
                            className="h-9 text-xs font-medium"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                            <Calendar size={13} className="text-primary" /> Date et Heure Arrivée <span className="text-rose-500">*</span>
                          </Label>
                          <Input
                            type="datetime-local"
                            value={vol.date_heure_arrivee}
                            onChange={(e) => handleSegmentChange(idx, 'date_heure_arrivee', e.target.value)}
                            className="h-9 text-xs font-medium"
                          />
                        </div>
                      </div>

                      {/* Détails Complémentaires (N° Vol, Classe, Bagage) */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
                        <div className="space-y-1">
                          <Label className="text-[11px] text-muted-foreground">N° de Vol</Label>
                          <Input
                            placeholder="Ex: TK 652"
                            value={vol.numero_vol}
                            onChange={(e) => handleSegmentChange(idx, 'numero_vol', e.target.value.toUpperCase())}
                            className="h-8 text-xs font-bold uppercase font-mono"
                          />
                        </div>

                        <div className="space-y-1">
                          <Label className="text-[11px] text-muted-foreground">Classe de Voyage</Label>
                          <Input
                            placeholder="Économique (Y)"
                            value={vol.classe}
                            onChange={(e) => handleSegmentChange(idx, 'classe', e.target.value)}
                            className="h-8 text-xs"
                          />
                        </div>

                        <div className="space-y-1">
                          <Label className="text-[11px] text-muted-foreground">Franchise Bagage</Label>
                          <Input
                            placeholder="2 x 23 Kg"
                            value={vol.bagage}
                            onChange={(e) => handleSegmentChange(idx, 'bagage', e.target.value)}
                            className="h-8 text-xs"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Remarques & Notes */}
              <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
                <CardContent className="p-4 space-y-2">
                  <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Consignes / Notes d'itinéraires sur le billet
                  </Label>
                  <Input
                    placeholder="Remarques personnalisées pour le voyageur..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="h-9 text-xs"
                  />
                </CardContent>
              </Card>

              {/* Boutons d'actions principaux */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Button
                  type="button"
                  onClick={() => handleGeneratePDF()}
                  className="flex-1 h-12 text-sm font-bold bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white shadow-lg shadow-cyan-900/20 gap-2"
                >
                  <Download size={18} /> Télécharger le Billet Télex (PDF)
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={handleSaveTicket}
                  disabled={isSaving}
                  className="h-12 px-5 text-sm font-semibold border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 gap-2"
                >
                  <Check size={16} /> {isSaving ? 'Enregistrement...' : 'Sauvegarder'}
                </Button>
              </div>
            </div>

            {/* Colonne Droite : Prévisualisation Réaliste du Billet Télex */}
            <div className="lg:col-span-5 space-y-4">
              <div className="sticky top-6 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <Eye size={14} /> Aperçu en Direct du Télex
                  </span>
                  <Badge variant="outline" className="text-[10px] text-cyan-600 border-cyan-300 bg-cyan-50 dark:bg-cyan-950/50">
                    Format E-Ticket IATA
                  </Badge>
                </div>

                {/* Modèle de Billet Télex Visuel */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden text-slate-800 dark:text-slate-100 text-xs">
                  {/* Agency Header */}
                  <div className="p-5 border-b border-slate-100 dark:border-slate-800/80 flex items-start justify-between gap-4 bg-slate-50/50 dark:bg-slate-900/50">
                    <div>
                      {agencySettings?.logo_url ? (
                        <img
                          src={agencySettings.logo_url}
                          alt="Logo Agence"
                          className="h-10 max-w-[120px] object-contain mb-2"
                        />
                      ) : (
                        <div className="flex items-center gap-2 mb-1.5 text-primary font-black tracking-tight text-sm">
                          <PlaneTakeoff size={18} />
                          {agencySettings?.nom_agence || 'EL MOKHTAR TOURISME'}
                        </div>
                      )}
                      <p className="text-[11px] font-bold text-slate-800 dark:text-slate-200">
                        {agencySettings?.nom_agence || 'EL MOKHTAR TOURISME & VOYAGE'}
                      </p>
                      <p className="text-[10px] text-slate-500 truncate max-w-[220px]">
                        {agencySettings?.adresse || 'Adresse officielle de l\'agence'}
                      </p>
                      <p className="text-[10px] text-slate-500">
                        {agencySettings?.telephone ? `Tél: ${agencySettings.telephone}` : ''}
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block">
                        RÉFÉRENCE DOSSIER
                      </span>
                      <span className="font-mono font-extrabold text-base text-cyan-600 dark:text-cyan-400 tracking-widest block">
                        {pnr || 'PNR-XXXX'}
                      </span>
                      <span className="inline-block mt-1 px-2 py-0.5 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                        {statutBillet}
                      </span>
                    </div>
                  </div>

                  {/* Passenger & Ticket Summary */}
                  <div className="p-4 bg-slate-900 text-white space-y-2">
                    <div className="flex justify-between items-center text-[10px] text-slate-400">
                      <span>PASSAGER(S)</span>
                      <span>N° BILLET</span>
                    </div>
                    {passagers.map((p, i) => (
                      <div key={i} className="flex justify-between items-center font-bold text-[11px]">
                        <span className="text-cyan-300 uppercase tracking-wide">
                          {p.nom || 'NOM'} / {p.prenom || 'PRÉNOM'} {p.civilite}
                        </span>
                        <span className="font-mono text-slate-300">
                          {p.numero_billet || mainTicketNumber || 'N/A'}
                        </span>
                      </div>
                    ))}
                    <div className="pt-2 border-t border-slate-800 flex justify-between items-center text-[10px]">
                      <span className="text-slate-400">Compagnie : <b className="text-white">{selectedAirlineNom} ({selectedAirlineCode})</b></span>
                      <span className="text-emerald-400 font-extrabold text-xs">
                        {String(prix || '0').replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} {devise}
                      </span>
                    </div>
                  </div>

                  {/* Flight Segments List (Timeline style) */}
                  <div className="p-4 space-y-3 max-h-[360px] overflow-y-auto">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      ITINÉRAIRE DES VOLS MULTI-DESTINATIONS
                    </span>

                    {vols.map((v, i) => {
                      const dep = formatFlightDateTime(v.date_heure_depart);
                      const arr = formatFlightDateTime(v.date_heure_arrivee);
                      return (
                        <div
                          key={i}
                          className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 space-y-2.5"
                        >
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-bold text-primary flex items-center gap-1.5">
                              <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-black">
                                {i + 1}
                              </span>
                              {v.numero_vol || 'VOL'}
                            </span>
                            <span className="text-[10px] text-muted-foreground font-medium">
                              {v.classe || 'Éco'} • {v.bagage || 'Bagage 23kg'}
                            </span>
                          </div>

                          <div className="grid grid-cols-5 items-center gap-2">
                            <div className="col-span-2">
                              <span className="font-extrabold text-sm text-slate-900 dark:text-white block font-mono">
                                {v.ville_depart}
                              </span>
                              <span className="text-[10px] text-slate-500 block">
                                {dep.date}
                              </span>
                              <span className="font-bold text-xs text-cyan-600 dark:text-cyan-400">
                                {dep.time}
                              </span>
                            </div>

                            <div className="col-span-1 flex flex-col items-center justify-center">
                              <ArrowRight size={14} className="text-slate-400" />
                              <span className="text-[8px] uppercase tracking-widest text-slate-400 mt-0.5">DIRECT</span>
                            </div>

                            <div className="col-span-2 text-right">
                              <span className="font-extrabold text-sm text-slate-900 dark:text-white block font-mono">
                                {v.ville_arrivee}
                              </span>
                              <span className="text-[10px] text-slate-500 block">
                                {arr.date}
                              </span>
                              <span className="font-bold text-xs text-cyan-600 dark:text-cyan-400">
                                {arr.time}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Travel Advice Box */}
                  <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border-t border-amber-200/50 text-amber-900 dark:text-amber-200 text-[10px] space-y-1">
                    <p className="font-bold flex items-center gap-1">
                      <Luggage size={12} /> Présentation à l'aéroport 3h avant le décollage
                    </p>
                    <p className="text-[9px] opacity-80">
                      Passeport obligatoire avec validité minimum de 6 mois. Billet électronique officiel.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2 : HISTORIQUE DES BILLETS TELEX */}
        {activeTab === 'history' && (
          <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
            <CardHeader className="pb-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <History className="text-primary" size={20} />
                    Historique des Billets Télex Générés
                  </CardTitle>
                  <CardDescription>
                    Retrouvez, réimprimez ou rechargez tous les billets télex créés par votre équipe.
                  </CardDescription>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
                    <Input
                      placeholder="Rechercher PNR, passager, vol..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="h-9 pl-9 text-xs"
                    />
                  </div>
                  <Button variant="outline" size="sm" onClick={fetchHistory} className="h-9">
                    <RefreshCw size={14} />
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent>
              {historyList.length === 0 ? (
                <div className="text-center py-16 border-2 border-dashed rounded-xl border-slate-200 dark:border-slate-800">
                  <Ticket className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-700 mb-3" />
                  <h3 className="text-sm font-semibold">Aucun billet télex enregistré</h3>
                  <p className="text-xs text-muted-foreground mt-1 mb-4">
                    Générez votre premier billet télex multi-destinations dès maintenant.
                  </p>
                  <Button size="sm" onClick={() => setActiveTab('generator')} className="bg-cyan-600 hover:bg-cyan-500 text-white">
                    <Plus size={14} className="mr-1" /> Créer un Billet Télex
                  </Button>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {historyList
                    .filter((item) => {
                      if (!searchQuery) return true;
                      const q = searchQuery.toLowerCase();
                      return (
                        (item.pnr && item.pnr.toLowerCase().includes(q)) ||
                        (item.passager_nom && item.passager_nom.toLowerCase().includes(q)) ||
                        (item.compagnie_nom && item.compagnie_nom.toLowerCase().includes(q)) ||
                        (item.numero_billet && item.numero_billet.toLowerCase().includes(q))
                      );
                    })
                    .map((item) => (
                      <div
                        key={item.id}
                        className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/60 dark:hover:bg-slate-900/30 px-3 rounded-xl transition"
                      >
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2.5">
                            <span className="font-mono font-bold text-sm bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-300 px-2.5 py-0.5 rounded-md">
                              {item.pnr || 'PNR'}
                            </span>
                            <span className="font-bold text-sm text-slate-900 dark:text-white">
                              {item.passager_nom || 'PASSAGER'}
                            </span>
                            <Badge variant="outline" className="text-[10px]">
                              {item.compagnie_nom} ({item.compagnie_code || '—'})
                            </Badge>
                          </div>

                          {/* Flight Itinerary Summary Chips */}
                          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground pt-0.5">
                            {(item.vols || []).map((v, vIdx) => (
                              <span
                                key={vIdx}
                                className="inline-flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-[11px] font-medium"
                              >
                                <b>{v.ville_depart}</b> <ArrowRight size={10} /> <b>{v.ville_arrivee}</b> ({v.numero_vol || 'Vol'})
                              </span>
                            ))}
                            <span className="text-[11px] text-slate-400">
                              • Émis le {item.date_emission ? format(parseISO(item.date_emission), 'dd/MM/yyyy') : '—'}
                            </span>
                          </div>
                        </div>

                        {/* Price & Actions */}
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <span className="font-extrabold text-sm text-emerald-600 block">
                              {String(item.prix || '0').replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} {item.devise || 'DZD'}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              {item.passagers?.length || 1} passager(s)
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleGeneratePDF(item)}
                              className="h-8 gap-1 text-xs text-cyan-600 border-cyan-200 hover:bg-cyan-50 dark:hover:bg-cyan-950"
                            >
                              <Download size={13} /> PDF
                            </Button>

                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleLoadFromHistory(item)}
                              className="h-8 gap-1 text-xs"
                              title="Recharger dans le formulaire"
                            >
                              <RotateCcw size={13} /> Charger
                            </Button>

                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteHistory(item.id)}
                              className="h-8 w-8 p-0 text-rose-500 hover:bg-rose-500/10 hover:text-rose-600"
                              title="Supprimer"
                            >
                              <Trash2 size={14} />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
};

export default Telex;
