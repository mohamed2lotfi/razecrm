import React, { useState, useEffect, useMemo, useRef } from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { 
  Calculator, Plus, Trash2, Users, BedDouble, Plane, 
  Building2, Stamp, MapPin, Bus, Printer, Copy, Check, 
  Share2, ArrowRight, Sparkles, RefreshCw, FileText, 
  Baby, DollarSign, Percent, UserCheck, Shield, Award,
  CheckCircle2, Info, Send, Phone, Download, Search, X,
  Layers, Home
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import ClientForm from '@/components/ClientForm';

// Round to nearest 1,000 DZD
const round1000 = (val) => Math.round((Number(val) || 0) / 1000) * 1000;

// Format numbers nicely without decimals
const fmtDZD = (n) => Number(Math.round(n || 0)).toLocaleString('fr-DZ', {
  maximumFractionDigits: 0
});

const SimulateurDevis = () => {
  const { isAdmin } = useAuth();

  // Agency info
  const [agencySettings, setAgencySettings] = useState(null);

  // Clients database & search selection
  const [clientsList, setClientsList] = useState([]);
  const [clientSearch, setClientSearch] = useState('');
  const [selectedClientId, setSelectedClientId] = useState('');
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [isAddingClient, setIsAddingClient] = useState(false);
  const clientWrapperRef = useRef(null);

  // Client info (for quote)
  const [clientInfo, setClientInfo] = useState({
    nom: '',
    telephone: '',
    destination: '',
    dateDepart: '',
    dateRetour: '',
    remarques: ''
  });

  // Rooms & Pax State
  const [chambres, setChambres] = useState([
    { id: 'ch_1', nom: 'Chambre 1', type: 'Double', adultes: 2, chd: 0, inf: 0 }
  ]);

  // Cost items state
  const [billetMode, setBilletMode] = useState('personne'); // 'personne' | 'groupe'
  const [billetAdulte, setBilletAdulte] = useState('');
  const [billetChd, setBilletChd] = useState('');
  const [billetGroupeTotal, setBilletGroupeTotal] = useState('');

  const [hotelTotal, setHotelTotal] = useState('');
  
  const [visaMode, setVisaMode] = useState('personne'); // 'personne' | 'groupe'
  const [visaParPersonne, setVisaParPersonne] = useState('');
  const [visaGroupeTotal, setVisaGroupeTotal] = useState('');

  const [excursionsTotal, setExcursionsTotal] = useState('');
  const [transfertTotal, setTransfertTotal] = useState('');

  // Total Inf (Bébé)
  const [infTotal, setInfTotal] = useState('');

  // Margin
  const [margeMode, setMargeMode] = useState('personne'); // 'personne' | 'groupe' | 'pourcentage'
  const [margeValeur, setMargeValeur] = useState('');

  // UI state
  const [copied, setCopied] = useState(false);
  const [savingPipeline, setSavingPipeline] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Load agency settings & clients list
  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: agency } = await supabase.from('agency_settings').select('*').single();
        if (agency) setAgencySettings(agency);

        const { data: clients } = await supabase.from('clients').select('*').order('nom', { ascending: true });
        if (clients) setClientsList(clients);
      } catch (err) {
        console.error(err);
      }
    };
    fetchData();
  }, []);

  // Handle click outside client dropdown
  useEffect(() => {
    function handleClickOutside(event) {
      if (clientWrapperRef.current && !clientWrapperRef.current.contains(event.target)) {
        setShowClientDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filter clients based on search input
  const filteredClients = useMemo(() => {
    if (!clientSearch) return clientsList.slice(0, 15);
    const query = clientSearch.toLowerCase();
    return clientsList.filter(c => 
      c.nom?.toLowerCase().includes(query) || 
      c.telephone?.includes(query) ||
      c.email?.toLowerCase().includes(query)
    ).slice(0, 15);
  }, [clientsList, clientSearch]);

  // Client Selection Handlers
  const handleSelectClient = (client) => {
    setSelectedClientId(client.id);
    setClientSearch(client.nom);
    setClientInfo(prev => ({
      ...prev,
      nom: client.nom || '',
      telephone: client.telephone || ''
    }));
    setShowClientDropdown(false);
  };

  const handleSaveNewClient = async (newClientData) => {
    try {
      const { data, error } = await supabase.from('clients').insert([newClientData]).select();
      if (error) {
        alert("Erreur lors de la création du client : " + error.message);
        return;
      }
      if (data && data[0]) {
        const created = data[0];
        setClientsList(prev => [created, ...prev]);
        handleSelectClient(created);
        setIsAddingClient(false);
      }
    } catch (err) {
      alert("Une erreur inattendue est survenue : " + err.message);
    }
  };

  const handleClearClient = () => {
    setSelectedClientId('');
    setClientSearch('');
    setClientInfo(prev => ({ ...prev, nom: '', telephone: '' }));
  };

  // --- Total Pax Calculations ---
  const paxCounts = useMemo(() => {
    let adultes = 0;
    let chd = 0;
    let inf = 0;

    chambres.forEach(ch => {
      adultes += Number(ch.adultes || 0);
      chd += Number(ch.chd || 0);
      inf += Number(ch.inf || 0);
    });

    const payingPax = adultes + chd;
    const totalPax = adultes + chd + inf;

    return { adultes, chd, inf, payingPax, totalPax };
  }, [chambres]);

  // --- Room Management Handlers ---
  const handleAddChambre = () => {
    const nextIdx = chambres.length + 1;
    setChambres(prev => [
      ...prev,
      {
        id: `ch_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        nom: `Chambre ${nextIdx}`,
        type: 'Double',
        adultes: 2,
        chd: 0,
        inf: 0
      }
    ]);
  };

  const handleRemoveChambre = (id) => {
    if (chambres.length <= 1) {
      alert("Il doit y avoir au moins une chambre dans la simulation.");
      return;
    }
    setChambres(prev => prev.filter(c => c.id !== id));
  };

  const handleUpdateChambre = (id, field, value) => {
    setChambres(prev => prev.map(c => {
      if (c.id !== id) return c;
      const updated = { ...c, [field]: value };
      
      // Auto-detect suggested room type based on occupants
      if (field === 'adultes' || field === 'chd') {
        const beds = Number(updated.adultes || 0) + Number(updated.chd || 0);
        if (beds === 1) updated.type = 'Single';
        else if (beds === 2) updated.type = 'Double';
        else if (beds === 3) updated.type = 'Triple';
        else if (beds === 4) updated.type = 'Quadruple';
        else if (beds >= 5) updated.type = `Chambre ${beds} Lits`;
      }
      return updated;
    }));
  };

  // --- Cost & Quote Calculations with 1,000 DZD Rounding & Room Type Breakdown ---
  const calculation = useMemo(() => {
    const { adultes, chd, inf, payingPax } = paxCounts;

    // 1. Billetterie
    let costBillet = 0;
    if (billetMode === 'personne') {
      const bAdulte = Number(billetAdulte || 0);
      const bChd = billetChd !== '' ? Number(billetChd) : bAdulte;
      costBillet = (adultes * bAdulte) + (chd * bChd);
    } else {
      costBillet = Number(billetGroupeTotal || 0);
    }

    // 2. Hébergement
    const costHotel = Number(hotelTotal || 0);

    // 3. Visa
    let costVisa = 0;
    if (visaMode === 'personne') {
      costVisa = (adultes + chd) * Number(visaParPersonne || 0);
    } else {
      costVisa = Number(visaGroupeTotal || 0);
    }

    // 4. Excursions & Guide
    const costExcursions = Number(excursionsTotal || 0);

    // 5. Transferts
    const costTransfert = Number(transfertTotal || 0);

    // 6. Total Inf (Bébé)
    const costInfTotal = inf > 0 ? Number(infTotal || 0) : 0;

    // Total Coût de Revient
    const totalCoutRevient = costBillet + costHotel + costVisa + costExcursions + costTransfert + costInfTotal;

    // 7. Marge Agence
    let montantMarge = 0;
    const valMarge = Number(margeValeur || 0);
    if (margeMode === 'personne') {
      montantMarge = payingPax * valMarge;
    } else if (margeMode === 'groupe') {
      montantMarge = valMarge;
    } else if (margeMode === 'pourcentage') {
      montantMarge = totalCoutRevient * (valMarge / 100);
    }

    // Total Général Brut
    const totalDevisBrut = totalCoutRevient + montantMarge;

    // Non-hotel cost per paying passenger
    const totalHorsHotelEtInf = totalDevisBrut - costHotel - costInfTotal;
    const baseHorsHotelParPax = payingPax > 0 ? (totalHorsHotelEtInf / payingPax) : 0;

    // Average hotel cost per room
    const nbChambres = Math.max(1, chambres.length);
    const coutHotelParChambre = costHotel / nbChambres;
    const margeHotelParChambre = margeMode === 'pourcentage' ? (coutHotelParChambre * (valMarge / 100)) : 0;
    const prixChambreMoyen = coutHotelParChambre + margeHotelParChambre;

    // Unit INF price rounded to 1000 DZD
    const prixInf = inf > 0 ? round1000(costInfTotal / inf) : 0;

    // Room-by-room calculation with 1,000 DZD rounding and -10k CHD rule
    const chambresCalculees = chambres.map(ch => {
      const nbLits = Number(ch.adultes || 0) + Number(ch.chd || 0);
      const chAdultes = Number(ch.adultes || 0);
      const chChd = Number(ch.chd || 0);
      const chInf = Number(ch.inf || 0);

      // Base total for this room (without INF)
      const baseChambreHorsInf = (baseHorsHotelParPax * nbLits) + prixChambreMoyen;

      let prixAdulte = 0;
      let prixChd = 0;

      if (nbLits > 0) {
        const rawAdulte = (baseChambreHorsInf + (chChd * 10000)) / nbLits;
        prixAdulte = round1000(rawAdulte);
        prixChd = Math.max(0, prixAdulte - 10000);
      }

      const sousTotal = (chAdultes * prixAdulte) + (chChd * prixChd) + (chInf * prixInf);

      return {
        ...ch,
        nbLits,
        prixAdulte,
        prixChd,
        prixInf,
        sousTotal
      };
    });

    // Consolidated room types summary
    const typesMap = {};
    chambresCalculees.forEach(ch => {
      if (!typesMap[ch.type]) {
        typesMap[ch.type] = {
          type: ch.type,
          prixAdulte: ch.prixAdulte,
          prixChd: ch.prixChd,
          prixInf: ch.prixInf,
          nbChambres: 1,
          totalPax: ch.adultes + ch.chd + ch.inf,
          adultes: ch.adultes,
          chd: ch.chd,
          inf: ch.inf
        };
      } else {
        typesMap[ch.type].nbChambres += 1;
        typesMap[ch.type].totalPax += ch.adultes + ch.chd + ch.inf;
        typesMap[ch.type].adultes += ch.adultes;
        typesMap[ch.type].chd += ch.chd;
        typesMap[ch.type].inf += ch.inf;
      }
    });

    const tarifsParType = Object.values(typesMap);

    // Total quote rounded to 1000 DZD
    const totalDevis = round1000(chambresCalculees.reduce((sum, c) => sum + c.sousTotal, 0));

    // Global average per adult/child for quick display
    const avgPrixAdulte = round1000(
      adultes > 0 
        ? chambresCalculees.reduce((s, c) => s + (c.adultes * c.prixAdulte), 0) / adultes 
        : (tarifsParType[0]?.prixAdulte || 0)
    );
    const avgPrixChd = Math.max(0, avgPrixAdulte - 10000);

    return {
      costBillet: round1000(costBillet),
      costHotel: round1000(costHotel),
      costVisa: round1000(costVisa),
      costExcursions: round1000(costExcursions),
      costTransfert: round1000(costTransfert),
      costInfTotal: round1000(costInfTotal),
      totalCoutRevient: round1000(totalCoutRevient),
      montantMarge: round1000(montantMarge),
      totalDevis,
      avgPrixAdulte,
      avgPrixChd,
      prixInf,
      chambresCalculees,
      tarifsParType
    };
  }, [
    chambres, paxCounts, billetMode, billetAdulte, billetChd, billetGroupeTotal,
    hotelTotal, visaMode, visaParPersonne, visaGroupeTotal,
    excursionsTotal, transfertTotal, infTotal, margeMode, margeValeur
  ]);

  // Generate formatted text for WhatsApp & CRM
  const generateFormattedQuoteText = () => {
    const agencyName = agencySettings?.nom_agence || 'EL-MOKHTAR VOYAGES & OMRA';
    const agencyPhone = agencySettings?.telephone || '';

    return `🌟 *DEVIS VOYAGE / OMRA - ${agencyName.toUpperCase()}* 🌟
${clientInfo.nom ? `👤 *Client :* ${clientInfo.nom}\n` : ''}${clientInfo.destination ? `📍 *Destination :* ${clientInfo.destination}\n` : ''}${clientInfo.dateDepart ? `📅 *Départ :* ${clientInfo.dateDepart}${clientInfo.dateRetour ? ` ➔ Retour : ${clientInfo.dateRetour}` : ''}\n` : ''}
👥 *Composition : ${chambres.length} Chambre(s) | ${paxCounts.totalPax} Passagers* (${paxCounts.adultes} Adultes${paxCounts.chd > 0 ? `, ${paxCounts.chd} Enfants` : ''}${paxCounts.inf > 0 ? `, ${paxCounts.inf} Bébés` : ''})

🏨 *GRILLE DES TARIFS PAR TYPE DE CHAMBRE (Arrondis à 1 000 DZD) :*
${calculation.tarifsParType.map(t => ` • 🏠 *Chambre ${t.type}* : 
   - 👤 Adulte : *${fmtDZD(t.prixAdulte)} DZD* / pers
   ${paxCounts.chd > 0 ? `- 🧒 Enfant (CHD) : *${fmtDZD(t.prixChd)} DZD* / enfant (-10 000 DZD)\n` : ''}`).join('')}${paxCounts.inf > 0 ? ` • 👶 *Bébé (INF) :* ${fmtDZD(calculation.prixInf)} DZD / bébé\n` : ''}
📋 *DÉTAIL PAR CHAMBRE :*
${calculation.chambresCalculees.map(c => ` • *${c.nom} (${c.type})* : ${c.adultes} Adulte(s)${c.chd > 0 ? `, ${c.chd} Enfant(s)` : ''}${c.inf > 0 ? `, ${c.inf} Bébé(s)` : ''} ➔ *${fmtDZD(c.sousTotal)} DZD*`).join('\n')}

💵 *TOTAL GLOBAL DU DEVIS :* *${fmtDZD(calculation.totalDevis)} DZD*

✨ *Prestations incluses :*
 • Billets d'avion aller-retour
 • Hébergement en hôtel
 • Visas d'entrée
 • Assistance & Guide
 • Transferts

${clientInfo.remarques ? `📝 *Remarques :* ${clientInfo.remarques}\n\n` : ''}📞 *Contact & Réservations :* ${agencyPhone}
_Offre valable sous réserve de disponibilité des places et chambres lors de la confirmation._`;
  };

  // Copy quote text for WhatsApp / Email
  const handleCopyWhatsApp = () => {
    const text = generateFormattedQuoteText();
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // Print / PDF Export
  const handlePrint = () => {
    const agencyName = agencySettings?.nom_agence || 'EL-MOKHTAR VOYAGES & OMRA';
    const agencyPhone = agencySettings?.telephone || '';
    const agencyEmail = agencySettings?.email || '';
    const agencyLogo = agencySettings?.logo_url || '';
    const dateToday = new Date().toLocaleDateString('fr-FR');

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Devis Estimatif - ${clientInfo.nom || 'Client'}</title>
          <style>
            @page { size: A4 portrait; margin: 10mm; }
            * { box-sizing: border-box; }
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
              font-size: 11px;
              color: #1e293b;
              margin: 0;
              padding: 10px;
              background: #fff;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              border-bottom: 2px solid #059669;
              padding-bottom: 10px;
              margin-bottom: 14px;
            }
            .logo { max-height: 50px; max-width: 140px; object-fit: contain; }
            .title { font-size: 17px; font-weight: 800; color: #065f46; margin: 0; text-transform: uppercase; }
            .subtitle { font-size: 10.5px; color: #475569; margin-top: 2px; }
            .meta-box {
              background: #f8fafc;
              border: 1px solid #e2e8f0;
              border-radius: 8px;
              padding: 10px 12px;
              margin-bottom: 14px;
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 8px;
              font-size: 11px;
            }
            .section-title {
              font-size: 11.5px;
              font-weight: 800;
              text-transform: uppercase;
              color: #065f46;
              border-bottom: 1px solid #cbd5e1;
              padding-bottom: 4px;
              margin: 12px 0 6px 0;
            }
            table { width: 100%; border-collapse: collapse; margin-bottom: 12px; font-size: 10.5px; }
            th { background: #f1f5f9; text-align: left; padding: 6px 8px; border: 1px solid #cbd5e1; font-weight: 700; }
            td { padding: 6px 8px; border: 1px solid #e2e8f0; vertical-align: middle; }
            .price-card {
              background: #ecfdf5;
              border: 2px solid #059669;
              border-radius: 8px;
              padding: 12px;
              text-align: center;
              margin-top: 10px;
            }
            .price-val { font-size: 22px; font-weight: 900; color: #065f46; }
            .footer {
              margin-top: 20px;
              border-top: 1px solid #e2e8f0;
              padding-top: 8px;
              display: flex;
              justify-content: space-between;
              font-size: 9px;
              color: #64748b;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              ${agencyLogo ? `<img src="${agencyLogo}" class="logo" />` : ''}
              <h1 class="title">${agencyName}</h1>
              <div class="subtitle">Devis & Simulation Tarifaire (Arrondis à 1 000 DZD)</div>
            </div>
            <div style="text-align: right;">
              <div><b>Date :</b> ${dateToday}</div>
              <div><b>Tél :</b> ${agencyPhone || '—'}</div>
              <div><b>Email :</b> ${agencyEmail || '—'}</div>
            </div>
          </div>

          <div class="meta-box">
            <div>
              <div><b>Nom du Client :</b> ${clientInfo.nom || 'Client Particulier / Groupe'}</div>
              <div><b>Téléphone :</b> ${clientInfo.telephone || '—'}</div>
              <div><b>Destination :</b> ${clientInfo.destination || 'Omra / Voyage Organisé'}</div>
            </div>
            <div>
              <div><b>Nombre Total de Passagers :</b> ${paxCounts.totalPax} pax (${paxCounts.adultes} Adulte(s), ${paxCounts.chd} Enfant(s), ${paxCounts.inf} Bébé(s))</div>
              <div><b>Nombre de Chambres :</b> ${chambres.length} chambre(s)</div>
              <div><b>Période :</b> ${clientInfo.dateDepart || 'À définir'} ${clientInfo.dateRetour ? 'au ' + clientInfo.dateRetour : ''}</div>
            </div>
          </div>

          <div class="section-title">1. Grille Tarifaire par Type de Chambre & par Personne</div>
          <table>
            <thead>
              <tr>
                <th>Type de Chambre</th>
                <th style="text-align: center;">Chambres</th>
                <th style="text-align: right;">Tarif / Adulte (DZD)</th>
                ${paxCounts.chd > 0 ? '<th style="text-align: right; color: #ea580c;">Tarif / Enfant CHD (-10k)</th>' : ''}
                ${paxCounts.inf > 0 ? '<th style="text-align: right; color: #7c3aed;">Tarif / Bébé INF</th>' : ''}
              </tr>
            </thead>
            <tbody>
              ${calculation.tarifsParType.map(t => `
                <tr>
                  <td><b>Chambre ${t.type}</b></td>
                  <td style="text-align: center;">${t.nbChambres}</td>
                  <td style="text-align: right; font-weight: bold; color: #065f46;">${fmtDZD(t.prixAdulte)} DZD</td>
                  ${paxCounts.chd > 0 ? `<td style="text-align: right; font-weight: bold; color: #ea580c;">${fmtDZD(t.prixChd)} DZD</td>` : ''}
                  ${paxCounts.inf > 0 ? `<td style="text-align: right; font-weight: bold; color: #7c3aed;">${fmtDZD(calculation.prixInf)} DZD</td>` : ''}
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="section-title">2. Répartition Détaillée des Chambres</div>
          <table>
            <thead>
              <tr>
                <th>Chambre</th>
                <th>Type</th>
                <th style="text-align: center;">Occupants</th>
                <th style="text-align: right;">Tarif Adulte</th>
                ${paxCounts.chd > 0 ? '<th style="text-align: right;">Tarif Enfant</th>' : ''}
                <th style="text-align: right;">Sous-Total Chambre (DZD)</th>
              </tr>
            </thead>
            <tbody>
              ${calculation.chambresCalculees.map(c => `
                <tr>
                  <td><b>${c.nom}</b></td>
                  <td>${c.type}</td>
                  <td style="text-align: center;">${c.adultes} Adulte(s)${c.chd > 0 ? `, ${c.chd} Enfant(s)` : ''}${c.inf > 0 ? `, ${c.inf} Bébé(s)` : ''}</td>
                  <td style="text-align: right; font-weight: bold;">${fmtDZD(c.prixAdulte)} DZD</td>
                  ${paxCounts.chd > 0 ? `<td style="text-align: right; font-weight: bold; color: #ea580c;">${fmtDZD(c.prixChd)} DZD</td>` : ''}
                  <td style="text-align: right; font-weight: 800; color: #065f46;">${fmtDZD(c.sousTotal)} DZD</td>
                </tr>
              `).join('')}
            </tbody>
            <tfoot>
              <tr style="background: #f8fafc; font-weight: 800;">
                <td colspan="${paxCounts.chd > 0 ? 5 : 4}" style="text-align: right; text-transform: uppercase;">TOTAL GÉNÉRAL DU DEVIS :</td>
                <td style="text-align: right; font-size: 13px; color: #065f46;">${fmtDZD(calculation.totalDevis)} DZD</td>
              </tr>
            </tfoot>
          </table>

          <div class="price-card">
            <div style="font-size: 10.5px; text-transform: uppercase; font-weight: bold; color: #065f46;">Montant Total Estimatif du Devis</div>
            <div class="price-val">${fmtDZD(calculation.totalDevis)} DZD</div>
            <div style="font-size: 9.5px; color: #047857; margin-top: 2px;">Montants arrondis à 1 000 DZD près &bull; Valable sous réserve de disponibilité</div>
          </div>

          ${clientInfo.remarques ? `
            <div style="margin-top: 12px; font-size: 10px; background: #fffbeb; border: 1px solid #fef3c7; padding: 6px 10px; border-radius: 6px;">
              <b>Notes / Prestations incluses :</b> ${clientInfo.remarques}
            </div>
          ` : ''}

          <div class="footer">
            <div>Document émis par le système CRM El-Mokhtar</div>
            <div>${agencyName} &bull; Service Devis & Chiffrages</div>
          </div>

          <script>
            window.onload = function() { setTimeout(function() { window.print(); }, 250); };
          </script>
        </body>
      </html>
    `;

    const printWindow = window.open('', '_blank', 'height=850,width=900');
    if (!printWindow) {
      alert("Veuillez autoriser les fenêtres surgissantes (popups) pour imprimer le devis.");
      return;
    }
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  // Save as lead in Pipeline / CRM
  const handleSaveToPipeline = async () => {
    const clientNomToSave = clientInfo.nom.trim() || clientSearch.trim();
    if (!clientNomToSave) {
      alert("Veuillez sélectionner ou saisir le nom du client / prospect.");
      return;
    }

    try {
      setSavingPipeline(true);
      const quoteText = generateFormattedQuoteText();

      const simulationPayload = {
        service_type: 'simulation_devis',
        options: [{ text: quoteText, images: [] }],
        simulation: {
          chambres,
          paxCounts,
          calculation,
          clientInfo: { ...clientInfo, nom: clientNomToSave, client_id: selectedClientId || null },
          costItems: {
            billetMode, billetAdulte, billetChd, billetGroupeTotal,
            hotelTotal, visaMode, visaParPersonne, visaGroupeTotal,
            excursionsTotal, transfertTotal, infTotal, margeMode, margeValeur
          }
        }
      };

      const { error } = await supabase.from('pipeline').insert([{
        nom_prospect: clientNomToSave,
        client_id: selectedClientId || null,
        phone: clientInfo.telephone.trim() || null,
        status: 'nouvelle',
        details_demande: `Simulateur de Devis : ${paxCounts.totalPax} Pax (${chambres.length} ch.) - Destination: ${clientInfo.destination || 'Non spécifiée'}${clientInfo.remarques ? ` | Remarques: ${clientInfo.remarques}` : ''}`,
        details_devis: JSON.stringify(simulationPayload),
        date_creation: new Date().toISOString()
      }]);

      if (error) {
        alert("Erreur lors de l'enregistrement dans le CRM : " + error.message);
      } else {
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 3000);
      }
    } catch (err) {
      alert("Une erreur est survenue : " + err.message);
    } finally {
      setSavingPipeline(false);
    }
  };

  // Reset simulator
  const handleReset = () => {
    if (window.confirm("Réinitialiser tous les champs du simulateur ?")) {
      setChambres([{ id: 'ch_1', nom: 'Chambre 1', type: 'Double', adultes: 2, chd: 0, inf: 0 }]);
      setBilletMode('personne');
      setBilletAdulte('');
      setBilletChd('');
      setBilletGroupeTotal('');
      setHotelTotal('');
      setVisaMode('personne');
      setVisaParPersonne('');
      setVisaGroupeTotal('');
      setExcursionsTotal('');
      setTransfertTotal('');
      setInfTotal('');
      setMargeMode('personne');
      setMargeValeur('');
      setSelectedClientId('');
      setClientSearch('');
      setClientInfo({ nom: '', telephone: '', destination: '', dateDepart: '', dateRetour: '', remarques: '' });
    }
  };

  return (
    <Layout>
      <div className="space-y-6 pb-12">
        {/* ── Page Header ────────────────────────────────────────── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white p-6 rounded-2xl shadow-lg border border-emerald-800/40">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold uppercase tracking-wider border border-emerald-400/30">
              <Sparkles size={13} /> Chiffrage Automatique & Arrondi 1 000 DZD
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight flex items-center gap-3">
              <Calculator size={30} className="text-emerald-400" /> Simulateur de Devis
            </h1>
            <p className="text-xs md:text-sm text-emerald-100/70 max-w-2xl">
              Calculez instantanément vos tarifs par personne et par type de chambre (Single, Double, Triple, Quadruple) avec règle enfant (-10 000 DZD) et arrondi à 1 000 DZD près.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              className="bg-white/10 hover:bg-white/20 text-white border-white/20 text-xs h-9 gap-1.5"
            >
              <RefreshCw size={14} /> Réinitialiser
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyWhatsApp}
              className="bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 border-emerald-400/30 text-xs h-9 gap-1.5 font-bold"
            >
              {copied ? <Check size={14} className="text-emerald-300" /> : <Copy size={14} />}
              {copied ? "Copié !" : "Copier WhatsApp"}
            </Button>
            <Button
              size="sm"
              onClick={handlePrint}
              className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs h-9 gap-1.5 shadow-md"
            >
              <Printer size={14} /> Imprimer / PDF
            </Button>
          </div>
        </div>

        {/* ── Main 2-Column Grid ─────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* ── Left Column: Config Inputs (7 cols) ──────────────── */}
          <div className="lg:col-span-7 space-y-6">

            {/* 1. Client / Prospect Selection */}
            <Card className="shadow-sm border-slate-200">
              <CardHeader className="pb-3 border-b bg-slate-50/50 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-800">
                    <Users size={16} className="text-emerald-600" /> Sélection du Client / Prospect
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Recherchez parmi vos clients existants ou ajoutez-en un nouveau directement.
                  </CardDescription>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsAddingClient(true)}
                  className="text-xs font-bold bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 gap-1.5 h-8"
                >
                  <Plus size={14} /> Nouveau Client
                </Button>
              </CardHeader>

              <CardContent className="p-4 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Searchable Client Input */}
                  <div className="space-y-1.5 relative" ref={clientWrapperRef}>
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-bold text-slate-800">
                        Client <span className="text-red-500">*</span>
                      </Label>
                      {selectedClientId && (
                        <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                          Client Enregistré
                        </span>
                      )}
                    </div>
                    
                    <div className="relative">
                      <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <Input
                        className="pl-9 pr-8 h-9 bg-white border-slate-200 text-xs focus-visible:ring-emerald-500"
                        placeholder="Rechercher ou saisir un nom..."
                        value={clientSearch}
                        onChange={e => {
                          setClientSearch(e.target.value);
                          setClientInfo(p => ({ ...p, nom: e.target.value }));
                          setShowClientDropdown(true);
                          if (selectedClientId) setSelectedClientId('');
                        }}
                        onFocus={() => setShowClientDropdown(true)}
                      />
                      {clientSearch && (
                        <button
                          type="button"
                          onClick={handleClearClient}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>

                    {/* Autocomplete Dropdown */}
                    {showClientDropdown && (
                      <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border rounded-xl shadow-xl z-50 max-h-[220px] overflow-y-auto overflow-x-hidden border-slate-200">
                        {filteredClients.map(c => (
                          <div 
                            key={c.id} 
                            onClick={() => handleSelectClient(c)}
                            className="flex items-center justify-between px-3.5 py-2.5 cursor-pointer hover:bg-emerald-50/50 transition-colors border-b border-slate-100 last:border-0"
                          >
                            <div className="flex flex-col">
                              <span className="font-bold text-xs text-slate-900">{c.nom}</span>
                              {c.telephone && (
                                <span className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                                  <Phone size={10} className="text-slate-400" /> {c.telephone}
                                </span>
                              )}
                            </div>
                            <span className={cn(
                              "text-[9px] font-bold uppercase px-2 py-0.5 rounded-full",
                              c.type === 'Entreprise' ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"
                            )}>
                              {c.type || 'Particulier'}
                            </span>
                          </div>
                        ))}

                        {filteredClients.length === 0 && clientSearch && (
                          <div className="px-3.5 py-2.5 text-xs text-slate-500 italic bg-slate-50">
                            Aucun client existant pour "{clientSearch}".
                          </div>
                        )}

                        <div 
                          onClick={() => { setShowClientDropdown(false); setIsAddingClient(true); }}
                          className="flex items-center gap-2 px-3.5 py-2.5 cursor-pointer text-emerald-700 font-bold text-xs bg-emerald-50/80 hover:bg-emerald-100 transition-colors border-t border-emerald-100"
                        >
                          <Plus size={14} /> Ajouter un nouveau client
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Phone Input */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700">Téléphone / WhatsApp</Label>
                    <Input
                      placeholder="Ex: 0555 12 34 56"
                      value={clientInfo.telephone}
                      onChange={e => setClientInfo(p => ({ ...p, telephone: e.target.value }))}
                      className="h-9 text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  <div>
                    <Label className="text-xs font-semibold text-slate-700">Destination / Type</Label>
                    <Input
                      placeholder="Ex: Omra Confort, Istanbul..."
                      value={clientInfo.destination}
                      onChange={e => setClientInfo(p => ({ ...p, destination: e.target.value }))}
                      className="h-9 text-xs mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold text-slate-700">Date de départ</Label>
                    <Input
                      type="date"
                      value={clientInfo.dateDepart}
                      onChange={e => setClientInfo(p => ({ ...p, dateDepart: e.target.value }))}
                      className="h-9 text-xs mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold text-slate-700">Date de retour</Label>
                    <Input
                      type="date"
                      value={clientInfo.dateRetour}
                      onChange={e => setClientInfo(p => ({ ...p, dateRetour: e.target.value }))}
                      className="h-9 text-xs mt-1"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-xs font-semibold text-slate-700">Remarques / Prestations spécifiques</Label>
                  <Input
                    placeholder="Ex: Hôtel 5 étoiles en face du Haram, vol direct Air Algérie..."
                    value={clientInfo.remarques}
                    onChange={e => setClientInfo(p => ({ ...p, remarques: e.target.value }))}
                    className="h-9 text-xs mt-1"
                  />
                </div>
              </CardContent>
            </Card>

            {/* 2. Chambres & Passagers Configuration */}
            <Card className="shadow-sm border-slate-200">
              <CardHeader className="pb-3 border-b bg-slate-50/50 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-800">
                    <BedDouble size={16} className="text-emerald-600" /> Composition des Chambres & Passagers
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Ajoutez les chambres et ajustez le nombre d'adultes, enfants et bébés.
                  </CardDescription>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleAddChambre}
                  className="text-xs font-bold bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 gap-1.5 h-8"
                >
                  <Plus size={14} /> Ajouter une chambre
                </Button>
              </CardHeader>

              <CardContent className="p-4 space-y-3.5">
                {/* Global Pax counter badges */}
                <div className="grid grid-cols-4 gap-2 bg-slate-100/70 p-2.5 rounded-xl border border-slate-200 text-center">
                  <div className="p-1">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Total Pax</span>
                    <span className="text-lg font-black text-slate-900">{paxCounts.totalPax}</span>
                  </div>
                  <div className="p-1 border-l border-slate-200">
                    <span className="text-[10px] uppercase font-bold text-blue-600 block">Adultes</span>
                    <span className="text-lg font-black text-blue-700">{paxCounts.adultes}</span>
                  </div>
                  <div className="p-1 border-l border-slate-200">
                    <span className="text-[10px] uppercase font-bold text-amber-600 block">Enfants (CHD)</span>
                    <span className="text-lg font-black text-amber-700">{paxCounts.chd}</span>
                  </div>
                  <div className="p-1 border-l border-slate-200">
                    <span className="text-[10px] uppercase font-bold text-purple-600 block">Bébés (INF)</span>
                    <span className="text-lg font-black text-purple-700">{paxCounts.inf}</span>
                  </div>
                </div>

                {/* Rooms List */}
                <div className="space-y-3">
                  {chambres.map((ch, idx) => {
                    const roomTotal = Number(ch.adultes || 0) + Number(ch.chd || 0) + Number(ch.inf || 0);
                    return (
                      <div 
                        key={ch.id}
                        className="p-3.5 rounded-xl border border-slate-200 bg-white hover:border-emerald-300 transition-all shadow-xs space-y-3"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2 flex-1">
                            <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold flex items-center justify-center">
                              {idx + 1}
                            </span>
                            <Input
                              value={ch.nom}
                              onChange={e => handleUpdateChambre(ch.id, 'nom', e.target.value)}
                              className="h-8 text-xs font-bold max-w-[130px] bg-slate-50"
                            />
                            <Select
                              value={ch.type}
                              onChange={e => handleUpdateChambre(ch.id, 'type', e.target.value)}
                              className="h-8 text-xs max-w-[140px]"
                            >
                              <option value="Single">Single (1 lit)</option>
                              <option value="Double">Double (2 lits)</option>
                              <option value="Triple">Triple (3 lits)</option>
                              <option value="Quadruple">Quadruple (4 lits)</option>
                              <option value="Familiale">Familiale</option>
                              <option value="Suite">Suite</option>
                            </Select>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                              {roomTotal} pax
                            </span>
                            {chambres.length > 1 && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                onClick={() => handleRemoveChambre(ch.id)}
                                className="h-7 w-7 text-red-400 hover:text-red-600 hover:bg-red-50"
                                title="Supprimer cette chambre"
                              >
                                <Trash2 size={13} />
                              </Button>
                            )}
                          </div>
                        </div>

                        {/* Pax counters in this room */}
                        <div className="grid grid-cols-3 gap-3 pt-1">
                          {/* Adultes */}
                          <div className="p-2 rounded-lg bg-blue-50/50 border border-blue-100 flex flex-col items-center">
                            <Label className="text-[11px] font-bold text-blue-800 mb-1">Adultes</Label>
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleUpdateChambre(ch.id, 'adultes', Math.max(0, Number(ch.adultes || 0) - 1))}
                                className="w-6 h-6 rounded bg-white text-blue-700 border border-blue-200 font-bold hover:bg-blue-100 flex items-center justify-center text-xs"
                              >
                                -
                              </button>
                              <Input
                                type="number"
                                min="0"
                                value={ch.adultes}
                                onChange={e => handleUpdateChambre(ch.id, 'adultes', Math.max(0, parseInt(e.target.value) || 0))}
                                className="w-12 h-7 text-xs text-center font-bold bg-white"
                              />
                              <button
                                type="button"
                                onClick={() => handleUpdateChambre(ch.id, 'adultes', Number(ch.adultes || 0) + 1)}
                                className="w-6 h-6 rounded bg-blue-600 text-white font-bold hover:bg-blue-700 flex items-center justify-center text-xs"
                              >
                                +
                              </button>
                            </div>
                          </div>

                          {/* CHD */}
                          <div className="p-2 rounded-lg bg-amber-50/50 border border-amber-100 flex flex-col items-center">
                            <Label className="text-[11px] font-bold text-amber-800 mb-1">Enfants (CHD)</Label>
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleUpdateChambre(ch.id, 'chd', Math.max(0, Number(ch.chd || 0) - 1))}
                                className="w-6 h-6 rounded bg-white text-amber-700 border border-amber-200 font-bold hover:bg-amber-100 flex items-center justify-center text-xs"
                              >
                                -
                              </button>
                              <Input
                                type="number"
                                min="0"
                                value={ch.chd}
                                onChange={e => handleUpdateChambre(ch.id, 'chd', Math.max(0, parseInt(e.target.value) || 0))}
                                className="w-12 h-7 text-xs text-center font-bold bg-white"
                              />
                              <button
                                type="button"
                                onClick={() => handleUpdateChambre(ch.id, 'chd', Number(ch.chd || 0) + 1)}
                                className="w-6 h-6 rounded bg-amber-600 text-white font-bold hover:bg-amber-700 flex items-center justify-center text-xs"
                              >
                                +
                              </button>
                            </div>
                          </div>

                          {/* INF */}
                          <div className="p-2 rounded-lg bg-purple-50/50 border border-purple-100 flex flex-col items-center">
                            <Label className="text-[11px] font-bold text-purple-800 mb-1">Bébés (INF)</Label>
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleUpdateChambre(ch.id, 'inf', Math.max(0, Number(ch.inf || 0) - 1))}
                                className="w-6 h-6 rounded bg-white text-purple-700 border border-purple-200 font-bold hover:bg-purple-100 flex items-center justify-center text-xs"
                              >
                                -
                              </button>
                              <Input
                                type="number"
                                min="0"
                                value={ch.inf}
                                onChange={e => handleUpdateChambre(ch.id, 'inf', Math.max(0, parseInt(e.target.value) || 0))}
                                className="w-12 h-7 text-xs text-center font-bold bg-white"
                              />
                              <button
                                type="button"
                                onClick={() => handleUpdateChambre(ch.id, 'inf', Number(ch.inf || 0) + 1)}
                                className="w-6 h-6 rounded bg-purple-600 text-white font-bold hover:bg-purple-700 flex items-center justify-center text-xs"
                              >
                                +
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* 3. Paramètres des Coûts & Tarifs */}
            <Card className="shadow-sm border-slate-200">
              <CardHeader className="pb-3 border-b bg-slate-50/50">
                <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-800">
                  <DollarSign size={16} className="text-emerald-600" /> Éléments de Coûts & Prestations
                </CardTitle>
                <CardDescription className="text-xs">
                  Saisissez les tarifs d'achats ou coûts estimés pour chaque poste.
                </CardDescription>
              </CardHeader>

              <CardContent className="p-4 space-y-4">
                {/* 1. Billet d'avion */}
                <div className="p-3 rounded-xl border bg-slate-50/30 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <Plane size={14} className="text-blue-600" /> Billet d'Avion
                    </Label>
                    <div className="flex items-center gap-1 bg-muted p-0.5 rounded-lg">
                      <button
                        type="button"
                        onClick={() => setBilletMode('personne')}
                        className={cn("px-2.5 py-1 text-[11px] font-bold rounded-md transition-all", billetMode === 'personne' ? "bg-white shadow-xs text-slate-900" : "text-slate-500")}
                      >
                        Par Personne
                      </button>
                      <button
                        type="button"
                        onClick={() => setBilletMode('groupe')}
                        className={cn("px-2.5 py-1 text-[11px] font-bold rounded-md transition-all", billetMode === 'groupe' ? "bg-white shadow-xs text-slate-900" : "text-slate-500")}
                      >
                        Total Groupe
                      </button>
                    </div>
                  </div>

                  {billetMode === 'personne' ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <span className="text-[10px] font-semibold text-slate-500 block mb-1">Tarif Billet Adulte (DZD)</span>
                        <Input
                          type="number"
                          min="0"
                          placeholder="Ex: 85000"
                          value={billetAdulte}
                          onChange={e => setBilletAdulte(e.target.value)}
                          className="h-9 text-xs"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] font-semibold text-slate-500 block mb-1">Tarif Billet Enfant CHD (DZD) (Optionnel)</span>
                        <Input
                          type="number"
                          min="0"
                          placeholder={billetAdulte ? `Ex: ${billetAdulte}` : "Optionnel"}
                          value={billetChd}
                          onChange={e => setBilletChd(e.target.value)}
                          className="h-9 text-xs"
                        />
                      </div>
                    </div>
                  ) : (
                    <div>
                      <span className="text-[10px] font-semibold text-slate-500 block mb-1">Montant Total Billetterie Groupe (DZD)</span>
                      <Input
                        type="number"
                        min="0"
                        placeholder="Ex: 500000"
                        value={billetGroupeTotal}
                        onChange={e => setBilletGroupeTotal(e.target.value)}
                        className="h-9 text-xs"
                      />
                    </div>
                  )}
                </div>

                {/* 2. Hôtel Total */}
                <div className="p-3 rounded-xl border bg-slate-50/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <Building2 size={14} className="text-emerald-600" /> Hébergement / Hôtel
                    </Label>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      Montant Global
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-semibold text-slate-500 block mb-1">Tarif Total Hôtel (DZD)</span>
                    <Input
                      type="number"
                      min="0"
                      placeholder="Ex: 350000"
                      value={hotelTotal}
                      onChange={e => setHotelTotal(e.target.value)}
                      className="h-9 text-xs font-semibold text-emerald-800"
                    />
                  </div>
                </div>

                {/* 3. Visa */}
                <div className="p-3 rounded-xl border bg-slate-50/30 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <Stamp size={14} className="text-amber-600" /> Visa
                    </Label>
                    <div className="flex items-center gap-1 bg-muted p-0.5 rounded-lg">
                      <button
                        type="button"
                        onClick={() => setVisaMode('personne')}
                        className={cn("px-2.5 py-1 text-[11px] font-bold rounded-md transition-all", visaMode === 'personne' ? "bg-white shadow-xs text-slate-900" : "text-slate-500")}
                      >
                        Par Personne
                      </button>
                      <button
                        type="button"
                        onClick={() => setVisaMode('groupe')}
                        className={cn("px-2.5 py-1 text-[11px] font-bold rounded-md transition-all", visaMode === 'groupe' ? "bg-white shadow-xs text-slate-900" : "text-slate-500")}
                      >
                        Total Groupe
                      </button>
                    </div>
                  </div>

                  {visaMode === 'personne' ? (
                    <div>
                      <span className="text-[10px] font-semibold text-slate-500 block mb-1">Frais de Visa par Personne (DZD)</span>
                      <Input
                        type="number"
                        min="0"
                        placeholder="Ex: 25000"
                        value={visaParPersonne}
                        onChange={e => setVisaParPersonne(e.target.value)}
                        className="h-9 text-xs"
                      />
                    </div>
                  ) : (
                    <div>
                      <span className="text-[10px] font-semibold text-slate-500 block mb-1">Montant Total Visas Groupe (DZD)</span>
                      <Input
                        type="number"
                        min="0"
                        placeholder="Ex: 100000"
                        value={visaGroupeTotal}
                        onChange={e => setVisaGroupeTotal(e.target.value)}
                        className="h-9 text-xs"
                      />
                    </div>
                  )}
                </div>

                {/* 4. Excursions & Transferts */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl border bg-slate-50/30 space-y-1.5">
                    <Label className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <MapPin size={14} className="text-purple-600" /> Excursions & Guide (DZD)
                    </Label>
                    <Input
                      type="number"
                      min="0"
                      placeholder="Ex: 45000 (Total)"
                      value={excursionsTotal}
                      onChange={e => setExcursionsTotal(e.target.value)}
                      className="h-9 text-xs"
                    />
                  </div>

                  <div className="p-3 rounded-xl border bg-slate-50/30 space-y-1.5">
                    <Label className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <Bus size={14} className="text-teal-600" /> Transferts & Véhicules (DZD)
                    </Label>
                    <Input
                      type="number"
                      min="0"
                      placeholder="Ex: 60000 (Total)"
                      value={transfertTotal}
                      onChange={e => setTransfertTotal(e.target.value)}
                      className="h-9 text-xs"
                    />
                  </div>
                </div>

                {/* 5. Bébé INF Total */}
                {paxCounts.inf > 0 && (
                  <div className="p-3.5 rounded-xl border-2 border-purple-200 bg-purple-50/40 space-y-2 animate-in fade-in">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-bold text-purple-900 flex items-center gap-1.5">
                        <Baby size={15} className="text-purple-600" /> Forfait Total Bébés / Infants ({paxCounts.inf} bébés)
                      </Label>
                      <span className="text-[10px] font-bold text-purple-800 bg-purple-100 px-2 py-0.5 rounded-full">
                        {paxCounts.inf} INF détecté(s)
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] font-semibold text-purple-800/80 block mb-1">
                        Montant Total Global pour tous les bébés (DZD)
                      </span>
                      <Input
                        type="number"
                        min="0"
                        placeholder="Ex: 35000"
                        value={infTotal}
                        onChange={e => setInfTotal(e.target.value)}
                        className="h-9 text-xs font-bold text-purple-900 bg-white border-purple-300"
                      />
                    </div>
                  </div>
                )}

                {/* 6. Marge Agence */}
                <div className="p-3.5 rounded-xl border-2 border-emerald-200 bg-emerald-50/40 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                      <Award size={15} className="text-emerald-700" /> Marge & Bénéfice de l'Agence
                    </Label>
                    <div className="flex items-center gap-1 bg-emerald-100/70 p-0.5 rounded-lg border border-emerald-200">
                      <button
                        type="button"
                        onClick={() => setMargeMode('personne')}
                        className={cn("px-2 py-0.5 text-[10px] font-bold rounded transition-all", margeMode === 'personne' ? "bg-white shadow-xs text-emerald-900" : "text-emerald-700")}
                      >
                        Par Pax
                      </button>
                      <button
                        type="button"
                        onClick={() => setMargeMode('groupe')}
                        className={cn("px-2 py-0.5 text-[10px] font-bold rounded transition-all", margeMode === 'groupe' ? "bg-white shadow-xs text-emerald-900" : "text-emerald-700")}
                      >
                        Total Groupe
                      </button>
                      <button
                        type="button"
                        onClick={() => setMargeMode('pourcentage')}
                        className={cn("px-2 py-0.5 text-[10px] font-bold rounded transition-all", margeMode === 'pourcentage' ? "bg-white shadow-xs text-emerald-900" : "text-emerald-700")}
                      >
                        % Marge
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <Input
                        type="number"
                        min="0"
                        placeholder={margeMode === 'pourcentage' ? "Ex: 15 (%)" : "Ex: 15000 (DZD)"}
                        value={margeValeur}
                        onChange={e => setMargeValeur(e.target.value)}
                        className="h-9 text-xs font-bold bg-white border-emerald-300 text-emerald-950"
                      />
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-semibold text-emerald-700 block">Gain Total Estimé</span>
                      <span className="text-sm font-extrabold text-emerald-900">{fmtDZD(calculation.montantMarge)} DZD</span>
                    </div>
                  </div>
                </div>

              </CardContent>
            </Card>

          </div>

          {/* ── Right Column: Live Results & Detailed Quote (5 cols) ── */}
          <div className="lg:col-span-5 space-y-6 sticky top-6">

            {/* 1. Grand Total Card */}
            <div className="rounded-2xl bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 text-white p-6 shadow-xl relative overflow-hidden">
              <div className="absolute -right-8 -bottom-8 opacity-10 pointer-events-none">
                <Calculator size={180} />
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-extrabold uppercase tracking-widest text-emerald-200">
                    Total Global du Devis
                  </span>
                  <span className="text-xs font-bold bg-white/20 px-2 py-0.5 rounded-full backdrop-blur-xs">
                    {paxCounts.totalPax} Pax &bull; {chambres.length} Ch.
                  </span>
                </div>
                <div className="text-3xl sm:text-4xl font-black tracking-tight text-white py-1">
                  {fmtDZD(calculation.totalDevis)} <span className="text-lg font-normal text-emerald-200">DZD</span>
                </div>
                <p className="text-[11px] text-emerald-100/80">
                  Arrondi à 1 000 DZD &bull; Coût : <b>{fmtDZD(calculation.totalCoutRevient)} DZD</b> &bull; Marge : <b className="text-emerald-200">+{fmtDZD(calculation.montantMarge)} DZD</b>
                </p>
              </div>
            </div>

            {/* 2. Tarifs par Type de Chambre (Cards & Badges) */}
            <Card className="shadow-sm border-emerald-200 bg-emerald-50/30">
              <CardHeader className="pb-3 border-b bg-emerald-100/40">
                <CardTitle className="text-sm font-bold flex items-center gap-2 text-emerald-950">
                  <Home size={16} className="text-emerald-700" /> Tarifs par Type de Chambre & par Personne
                </CardTitle>
                <CardDescription className="text-xs text-emerald-800/80">
                  Chiffres arrondis à 1 000 DZD avec réduction enfant (-10 000 DZD).
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {calculation.tarifsParType.map((t, idx) => (
                    <div 
                      key={idx}
                      className="p-3 rounded-xl bg-white border border-emerald-200 shadow-xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-slate-800 flex items-center gap-1">
                          <BedDouble size={14} className="text-emerald-600" /> Chambre {t.type}
                        </span>
                        <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded">
                          {t.nbChambres} ch.
                        </span>
                      </div>

                      <div className="pt-1 space-y-1">
                        <div className="flex justify-between items-baseline">
                          <span className="text-[11px] text-slate-600 font-semibold">👤 Adulte :</span>
                          <span className="text-sm font-black text-emerald-700">{fmtDZD(t.prixAdulte)} DZD</span>
                        </div>
                        {paxCounts.chd > 0 && (
                          <div className="flex justify-between items-baseline">
                            <span className="text-[10px] text-amber-700 font-semibold">🧒 Enfant (-10k) :</span>
                            <span className="text-xs font-bold text-amber-800">{fmtDZD(t.prixChd)} DZD</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* Bébé INF card if any */}
                  {paxCounts.inf > 0 && (
                    <div className="p-3 rounded-xl bg-purple-50 border border-purple-200 shadow-xs space-y-1.5 sm:col-span-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-purple-900 flex items-center gap-1">
                          <Baby size={14} className="text-purple-600" /> Bébés / Infants (INF)
                        </span>
                        <span className="text-[10px] font-bold text-purple-700 bg-purple-100 px-1.5 py-0.2 rounded">
                          {paxCounts.inf} bébés
                        </span>
                      </div>
                      <div className="flex justify-between items-baseline pt-1">
                        <span className="text-[11px] text-purple-800 font-semibold">👶 Tarif unitaire :</span>
                        <span className="text-sm font-black text-purple-900">{fmtDZD(calculation.prixInf)} DZD / bébé</span>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* 3. Breakdown Table Room by Room */}
            <Card className="shadow-sm border-slate-200">
              <CardHeader className="pb-3 border-b bg-slate-50/50">
                <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-800">
                  <FileText size={16} className="text-emerald-600" /> Détail Calculé par Chambre
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b text-slate-500 font-semibold text-[11px]">
                      <th className="pb-2 text-left">Chambre</th>
                      <th className="pb-2 text-center">Type</th>
                      <th className="pb-2 text-right">Tarif / Adulte</th>
                      <th className="pb-2 text-right">Sous-Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {calculation.chambresCalculees.map((c, i) => (
                      <tr key={i}>
                        <td className="py-2.5 font-bold text-slate-900">
                          {c.nom}
                          <span className="text-[10px] text-slate-500 block font-normal">
                            {c.adultes}A {c.chd > 0 ? `${c.chd}C ` : ''}{c.inf > 0 ? `${c.inf}I` : ''}
                          </span>
                        </td>
                        <td className="py-2.5 text-center font-semibold text-slate-700">
                          <span className="px-1.5 py-0.5 rounded bg-slate-100 font-mono text-[10px]">{c.type}</span>
                        </td>
                        <td className="py-2.5 text-right font-bold text-emerald-700">{fmtDZD(c.prixAdulte)}</td>
                        <td className="py-2.5 text-right font-black text-slate-900">{fmtDZD(c.sousTotal)} DZD</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-slate-300 font-extrabold bg-slate-50/80">
                      <td className="py-2.5 text-slate-900" colSpan={2}>TOTAL DEVIS</td>
                      <td className="py-2.5 text-right text-slate-400">—</td>
                      <td className="py-2.5 text-right text-emerald-700 text-sm font-black">{fmtDZD(calculation.totalDevis)} DZD</td>
                    </tr>
                  </tfoot>
                </table>

                {/* Costs breakdown badges */}
                <div className="pt-2 border-t space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Ventilation des Coûts Globaux :
                  </span>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between text-slate-600">
                      <span>• Billetterie vols :</span>
                      <span className="font-semibold">{fmtDZD(calculation.costBillet)} DZD</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>• Hébergement hôtel :</span>
                      <span className="font-semibold">{fmtDZD(calculation.costHotel)} DZD</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>• Visas :</span>
                      <span className="font-semibold">{fmtDZD(calculation.costVisa)} DZD</span>
                    </div>
                    {(calculation.costExcursions > 0 || calculation.costTransfert > 0) && (
                      <div className="flex justify-between text-slate-600">
                        <span>• Excursions & Transferts :</span>
                        <span className="font-semibold">{fmtDZD(calculation.costExcursions + calculation.costTransfert)} DZD</span>
                      </div>
                    )}
                    {calculation.costInfTotal > 0 && (
                      <div className="flex justify-between text-purple-700">
                        <span>• Forfait Bébés (INF) :</span>
                        <span className="font-semibold">{fmtDZD(calculation.costInfTotal)} DZD</span>
                      </div>
                    )}
                    <div className="flex justify-between text-emerald-700 font-bold pt-1 border-t">
                      <span>• Marge / Bénéfice Agence :</span>
                      <span>+{fmtDZD(calculation.montantMarge)} DZD</span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="pt-3 border-t space-y-2">
                  <Button
                    onClick={handleCopyWhatsApp}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-10 gap-2 shadow-xs"
                  >
                    {copied ? <Check size={16} /> : <Share2 size={16} />}
                    {copied ? "Texte Copié pour WhatsApp !" : "Copier le Devis pour WhatsApp"}
                  </Button>

                  <Button
                    variant="outline"
                    onClick={handleSaveToPipeline}
                    disabled={savingPipeline}
                    className="w-full font-bold h-10 gap-2 text-slate-700 border-slate-300 hover:bg-slate-50"
                  >
                    {savedSuccess ? (
                      <>
                        <CheckCircle2 size={16} className="text-emerald-600" />
                        <span className="text-emerald-700">Enregistré dans le CRM (Devis) !</span>
                      </>
                    ) : (
                      <>
                        <Send size={16} className="text-slate-500" />
                        <span>Enregistrer dans le CRM (Devis Pipeline)</span>
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

          </div>

        </div>

        {/* ── Add Client Modal ────────────────────────────────────── */}
        {isAddingClient && (
          <ClientForm
            onClose={() => setIsAddingClient(false)}
            onSave={handleSaveNewClient}
          />
        )}
      </div>
    </Layout>
  );
};

export default SimulateurDevis;
