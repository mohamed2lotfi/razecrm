import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/lib/supabase';
import QRCode from 'qrcode';
import {
  IdCard,
  Printer,
  Settings2,
  Check,
  Search,
  Building2,
  Phone,
  Eye,
  Sparkles,
  Layers,
  ArrowRight
} from 'lucide-react';
import {
  BADGE_TOKENS_CONFIG,
  AVAILABLE_FONTS,
  DEFAULT_INITIAL_TEMPLATE,
  OFFICIAL_ONPO_TEMPLATE
} from '@/lib/badgeConstants';
import OfficialOnpoBadge, { generateOfficialBadgeHtml } from '@/components/OfficialOnpoBadge';

const LOCAL_STORAGE_KEY = 'el_mokhtar_badge_templates';

export default function OmraGroupBadgesTab({
  groupe,
  enregistrements = [],
  hotels = [],
  pelerinsMaster = [],
  getPelerinPhoto
}) {
  const navigate = useNavigate();

  // Templates state
  const [templates, setTemplates] = useState([OFFICIAL_ONPO_TEMPLATE]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('official_onpo');
  const [loadingTemplates, setLoadingTemplates] = useState(true);

  // 6 Dynamic Variables
  const [hotelMeccaText, setHotelMeccaText] = useState('فجر نسك أجياد');
  const [hotelMedinaText, setHotelMedinaText] = useState('ديوان روز');
  const [guidePhone1, setGuidePhone1] = useState('0547.50.52.93');
  const [guidePhone2, setGuidePhone2] = useState('+213.558.90.30.11');

  // Emergency official numbers
  const [onpoPhone, setOnpoPhone] = useState('0021323777864');
  const [makkahPhone, setMakkahPhone] = useState('00966555801433');
  const [medinaPhone, setMedinaPhone] = useState('00966555801866');
  const [consulatPhone, setConsulatPhone] = useState('0966/120985034/35');

  // Pilgrim selection & search
  const [selectedPilgrimIds, setSelectedPilgrimIds] = useState(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [filterGender, setFilterGender] = useState('all');

  // Print Layout
  const [badgesPerPage, setBadgesPerPage] = useState('4'); // '1', '2', '4', '6'
  const [showCutMarks, setShowCutMarks] = useState(true);
  const [previewPilgrimIdx, setPreviewPilgrimIdx] = useState(0);

  // QR Code Cache per pilgrim
  const [qrMap, setQrMap] = useState({});

  // 1. Initialisation des templates
  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    setLoadingTemplates(true);
    try {
      const { data, error } = await supabase
        .from('badge_templates')
        .select('*')
        .order('created_at', { ascending: false });

      let list = [OFFICIAL_ONPO_TEMPLATE];

      if (!error && data && data.length > 0) {
        list = [OFFICIAL_ONPO_TEMPLATE, ...data.filter(d => d.id !== 'official_onpo')];
      } else {
        const local = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (local) {
          try {
            const parsed = JSON.parse(local);
            if (Array.isArray(parsed) && parsed.length > 0) {
              list = [OFFICIAL_ONPO_TEMPLATE, ...parsed.filter(p => p.id !== 'official_onpo')];
            }
          } catch (e) {}
        }
      }

      setTemplates(list);
      const defaultTpl = list.find(t => t.is_default && t.id !== 'official_onpo') || list.find(t => t.id !== 'official_onpo') || list[0];
      setSelectedTemplateId(defaultTpl?.id || 'official_onpo');
    } catch (err) {
      console.warn("Erreur chargement templates badges:", err);
      setTemplates([OFFICIAL_ONPO_TEMPLATE, DEFAULT_INITIAL_TEMPLATE]);
      setSelectedTemplateId('official_onpo');
    } finally {
      setLoadingTemplates(false);
    }
  };

  // 2. Détection intelligente des hôtels Makkah & Médine du groupe
  useEffect(() => {
    if (!groupe) return;

    let meccaHotelNom = '';
    let medinaHotelNom = '';

    const groupHotelsConfig = groupe.hotels || [];

    groupHotelsConfig.forEach(hConf => {
      const hMaster = hotels.find(h => 
        h.id === hConf.hotelId || 
        h.id === hConf.id || 
        (h.nom && hConf.hotelId && typeof hConf.hotelId === 'string' && hConf.hotelId.includes(h.nom))
      );

      const isMedina = (hMaster?.location === 'medina') || 
                       (hConf.location === 'medina') ||
                       (hMaster?.nom && /m[eé]din/i.test(hMaster.nom));

      const isMecca = (hMaster?.location === 'mecca') || 
                      (hConf.location === 'mecca') ||
                      (hMaster?.nom && /(makkah|mecque|shada|tilal|clock|نسك|أجياد|نسيم)/i.test(hMaster.nom));

      if (isMedina && !medinaHotelNom) {
        medinaHotelNom = hMaster?.nom_ar || hMaster?.nom || '';
      } else if (isMecca && !meccaHotelNom) {
        meccaHotelNom = hMaster?.nom_ar || hMaster?.nom || '';
      }
    });

    if (meccaHotelNom) setHotelMeccaText(meccaHotelNom);
    if (medinaHotelNom) setHotelMedinaText(medinaHotelNom);

    if (groupe.guide_tel || groupe.tel_guide) {
      setGuidePhone1(groupe.guide_tel || groupe.tel_guide);
    }
  }, [groupe, hotels]);

  // 3. Construction de la liste consolidée de tous les pèlerins du groupe
  const allGroupPilgrims = useMemo(() => {
    const list = [];
    let pGlobalIdx = 0;

    enregistrements.forEach((enr) => {
      const occupants = [
        ...(enr.pelerins || []).map(p => ({ ...p, isEnfantSansLit: false })),
        ...(enr.enfantsSansLit || enr.enfants_sans_lit || []).map(e => ({ ...e, isEnfantSansLit: true }))
      ];

      occupants.forEach(occ => {
        pGlobalIdx++;
        const occNom = (occ.nom || '').trim();
        const occPrenom = (occ.prenom || '').trim();
        const occPass = (occ.num_passeport || occ.passport || '').trim().toUpperCase();

        // Matching avec pelerinsMaster
        const master = pelerinsMaster.find(m => {
          if (occPass && occPass !== '—' && m.num_passeport && m.num_passeport.trim().toUpperCase() === occPass) return true;
          if (occ.pelerin_id && m.id && occ.pelerin_id === m.id) return true;
          if (m.nom && occNom && m.nom.trim().toLowerCase() === occNom.toLowerCase()) {
            if (!occPrenom || !m.prenom || m.prenom.trim().toLowerCase() === occPrenom.toLowerCase()) return true;
          }
          return false;
        });

        const nomArabe = master?.nom_arabe || occ.nom_arabe || occNom;
        const prenomArabe = master?.prenom_arabe || occ.prenom_arabe || occPrenom;
        const fullNameAr = (prenomArabe || nomArabe) 
          ? `${prenomArabe} ${nomArabe}`.trim() 
          : (occPrenom ? `${occNom} ${occPrenom}` : occNom);

        const fullNameFr = occPrenom ? `${occNom} ${occPrenom}` : occNom;
        const passport = occPass || master?.num_passeport || '—';
        const photo = (typeof getPelerinPhoto === 'function' ? getPelerinPhoto(occ) : null) || master?.photo_url || null;
        const sexe = master?.sexe || occ.sexe || 'H';

        const uniqueKey = `${enr.id}-${occ.pelerin_id || occ.id || pGlobalIdx}`;

        list.push({
          uniqueKey,
          enrId: enr.id,
          chambreId: enr.chambreId || enr.chambre_id || '—',
          nom: occNom,
          prenom: occPrenom,
          fullNameFr,
          nomArabe,
          prenomArabe,
          fullNameAr,
          passport,
          sexe,
          isEnfantSansLit: occ.isEnfantSansLit,
          isGuide: !!occ.guide,
          photoUrl: photo,
          chd: !!occ.chd
        });
      });
    });

    return list;
  }, [enregistrements, pelerinsMaster, getPelerinPhoto]);

  // Initialiser la sélection avec tous les pèlerins par défaut
  useEffect(() => {
    if (allGroupPilgrims.length > 0 && selectedPilgrimIds.size === 0) {
      setSelectedPilgrimIds(new Set(allGroupPilgrims.map(p => p.uniqueKey)));
    }
  }, [allGroupPilgrims]);

  // Génération automatique des QR Codes pour chaque pèlerin
  useEffect(() => {
    let isMounted = true;
    const generateQrs = async () => {
      const map = {};
      for (const p of allGroupPilgrims) {
        try {
          const qrText = `PELERIN:${p.nomArabe} ${p.prenomArabe}|PASS:${p.passport}|AGENCE:EL_MOKHTAR|HOTEL_MECCA:${hotelMeccaText}|HOTEL_MEDINA:${hotelMedinaText}|GUIDE:${guidePhone1}`;
          const url = await QRCode.toDataURL(qrText, { margin: 1, width: 100, errorCorrectionLevel: 'M' });
          map[p.uniqueKey] = url;
        } catch (e) {
          console.warn("QR gen note:", e);
        }
      }
      if (isMounted) setQrMap(map);
    };

    if (allGroupPilgrims.length > 0) {
      generateQrs();
    }

    return () => { isMounted = false; };
  }, [allGroupPilgrims, hotelMeccaText, hotelMedinaText, guidePhone1]);

  // 4. Filtrage des pèlerins
  const filteredPilgrims = useMemo(() => {
    return allGroupPilgrims.filter(p => {
      if (filterGender !== 'all' && p.sexe !== filterGender) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = p.fullNameFr.toLowerCase().includes(q) || p.fullNameAr.toLowerCase().includes(q);
        const matchPass = p.passport.toLowerCase().includes(q);
        const matchChambre = String(p.chambreId).toLowerCase().includes(q);
        if (!matchName && !matchPass && !matchChambre) return false;
      }
      return true;
    });
  }, [allGroupPilgrims, filterGender, searchQuery]);

  // Sélectionner / désélectionner tout
  const handleToggleSelectAll = () => {
    if (selectedPilgrimIds.size === filteredPilgrims.length) {
      setSelectedPilgrimIds(new Set());
    } else {
      setSelectedPilgrimIds(new Set(filteredPilgrims.map(p => p.uniqueKey)));
    }
  };

  const handleTogglePilgrim = (key) => {
    setSelectedPilgrimIds(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  // Modèle actif sélectionné
  const currentTemplate = useMemo(() => {
    return templates.find(t => t.id === selectedTemplateId) || OFFICIAL_ONPO_TEMPLATE;
  }, [templates, selectedTemplateId]);

  const isOfficialTemplate = currentTemplate.id === 'official_onpo' || currentTemplate.isOfficial;

  // 5. Rendu d'un badge individuel en mode interactif
  const renderBadgeElement = (pilgrim, tpl, isForPrint = false) => {
    if (!pilgrim) return null;

    if (isOfficialTemplate) {
      return (
        <OfficialOnpoBadge
          pilgrim={pilgrim}
          hotelMakkah={hotelMeccaText}
          hotelMedina={hotelMedinaText}
          guidePhone1={guidePhone1}
          guidePhone2={guidePhone2}
          onpoPhone={onpoPhone}
          makkahPhone={makkahPhone}
          medinaPhone={medinaPhone}
          consulatPhone={consulatPhone}
          qrDataUrl={qrMap[pilgrim.uniqueKey]}
          isPrint={isForPrint}
          widthMm={tpl.width_mm || 75}
          heightMm={tpl.height_mm || 120}
        />
      );
    }

    // Custom Token Template Fallback
    const widthMm = Number(tpl.width_mm) || 75;
    const heightMm = Number(tpl.height_mm) || 120;

    return (
      <div
        key={pilgrim.uniqueKey}
        style={{
          width: isForPrint ? `${widthMm}mm` : '270px',
          height: isForPrint ? `${heightMm}mm` : '420px',
          backgroundImage: tpl.background_url ? `url("${tpl.background_url}")` : 'none',
          backgroundSize: '100% 100%',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          position: 'relative',
          overflow: 'hidden',
          backgroundColor: '#ffffff',
          borderRadius: isForPrint ? '0px' : '10px',
          boxShadow: isForPrint ? 'none' : '0 4px 12px rgba(0,0,0,0.12)',
          border: isForPrint ? 'none' : '1px solid #e2e8f0',
          pageBreakInside: 'avoid',
          breakInside: 'avoid',
          userSelect: 'none'
        }}
        className={!tpl.background_url ? 'bg-gradient-to-b from-slate-50 to-amber-50/40' : ''}
      >
        {(tpl.tokens || []).map((token, tIdx) => {
          const config = BADGE_TOKENS_CONFIG.find(c => c.id === token.tokenId);
          if (!config) return null;

          let value = '';
          if (token.tokenId === 'nom_arabe') value = pilgrim.nomArabe || pilgrim.nom;
          else if (token.tokenId === 'prenom_arabe') value = pilgrim.prenomArabe || pilgrim.prenom || '';
          else if (token.tokenId === 'num_passeport') value = pilgrim.passport;
          else if (token.tokenId === 'hotel_medina') value = hotelMedinaText;
          else if (token.tokenId === 'hotel_mecca' || token.tokenId === 'hotel_makkah') value = hotelMeccaText;
          else if (token.tokenId === 'tel_guide' || token.tokenId === 'num_tlfn_guide') value = guidePhone1;

          if (config.isImage) {
            const photoW = token.width || 60;
            const photoH = token.height || 75;
            return (
              <div
                key={tIdx}
                style={{
                  position: 'absolute',
                  left: `${token.xPercent}%`,
                  top: `${token.yPercent}%`,
                  transform: 'translate(-50%, -50%)',
                  width: `${photoW}px`,
                  height: `${photoH}px`,
                  borderRadius: `${token.borderRadius || 8}px`,
                  border: `${token.borderWidth || 2}px solid ${token.borderColor || '#e2e8f0'}`,
                  overflow: 'hidden',
                  backgroundColor: '#f1f5f9'
                }}
                className="flex items-center justify-center shadow-xs"
              >
                {pilgrim.photoUrl ? (
                  <img src={pilgrim.photoUrl} alt={pilgrim.nom} className="w-full h-full object-cover" />
                ) : (
                  <div className="flex flex-col items-center justify-center text-slate-400">
                    <IdCard size={20} />
                  </div>
                )}
              </div>
            );
          }

          const prefix = token.prefix || '';
          const textToDisplay = token.isRtl
            ? `${value}${prefix ? ` ${prefix}` : ''}`
            : `${prefix}${value}`;

          return (
            <div
              key={tIdx}
              style={{
                position: 'absolute',
                left: `${token.xPercent}%`,
                top: `${token.yPercent}%`,
                transform: 'translate(-50%, -50%)',
                width: '90%',
                pointerEvents: 'none'
              }}
            >
              <div
                dir={token.isRtl ? 'rtl' : 'ltr'}
                style={{
                  fontFamily: token.fontFamily ? AVAILABLE_FONTS.find(f => f.id === token.fontFamily)?.family || token.fontFamily : 'Cairo',
                  fontSize: `${token.fontSize || 14}px`,
                  fontWeight: token.fontWeight || 'bold',
                  color: token.color || '#000000',
                  textAlign: token.align || (token.isRtl ? 'right' : 'left'),
                  lineHeight: 1.25,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}
              >
                {textToDisplay}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // 6. Impression professionnelle PDF avec mise en page A4 exacte
  const handleLaunchPrint = () => {
    const selectedPilgrimsList = allGroupPilgrims.filter(p => selectedPilgrimIds.has(p.uniqueKey));
    if (selectedPilgrimsList.length === 0) {
      alert("Veuillez sélectionner au moins un pèlerin à imprimer.");
      return;
    }

    const tpl = currentTemplate;
    const widthMm = Number(tpl.width_mm) || 75;
    const heightMm = Number(tpl.height_mm) || 120;
    const countPerPage = Number(badgesPerPage) || 4;

    let gridCols = 2;
    if (countPerPage === 1) gridCols = 1;
    else if (countPerPage === 2) gridCols = 2;
    else if (countPerPage === 4) gridCols = 2;
    else if (countPerPage === 6) gridCols = 2;

    let badgesHtml = '';

    if (isOfficialTemplate) {
      badgesHtml = selectedPilgrimsList.map(p => {
        return generateOfficialBadgeHtml(p, {
          hotelMecca: hotelMeccaText,
          hotelMedinah: hotelMedinaText,
          guidePhone1,
          guidePhone2,
          onpoPhone,
          makkahPhone,
          medinaPhone,
          consulatPhone,
          qrDataUrl: qrMap[p.uniqueKey],
          widthMm,
          heightMm,
          showCutMarks
        });
      }).join('');
    } else {
      // Custom Template HTML
      badgesHtml = selectedPilgrimsList.map(p => {
        const tokensContent = (tpl.tokens || []).map(token => {
          const config = BADGE_TOKENS_CONFIG.find(c => c.id === token.tokenId);
          if (!config) return '';

          let val = '';
          if (token.tokenId === 'nom_arabe') val = p.nomArabe || p.nom;
          else if (token.tokenId === 'prenom_arabe') val = p.prenomArabe || p.prenom || '';
          else if (token.tokenId === 'num_passeport') val = p.passport;
          else if (token.tokenId === 'hotel_medina') val = hotelMedinaText;
          else if (token.tokenId === 'hotel_mecca' || token.tokenId === 'hotel_makkah') val = hotelMeccaText;
          else if (token.tokenId === 'tel_guide' || token.tokenId === 'num_tlfn_guide') val = guidePhone1;

          if (config.isImage) {
            return `
              <div style="position: absolute; left: ${token.xPercent}%; top: ${token.yPercent}%; transform: translate(-50%, -50%); width: ${token.width || 70}px; height: ${token.height || 90}px; border-radius: ${token.borderRadius || 6}px; border: ${token.borderWidth || 1}px solid ${token.borderColor || '#cbd5e1'}; overflow: hidden; background: #f8fafc; display: flex; align-items: center; justify-content: center;">
                ${p.photoUrl ? `<img src="${p.photoUrl}" style="width: 100%; height: 100%; object-fit: cover;" />` : `<span style="font-size: 10px; color: #94a3b8; font-weight: bold;">PHOTO</span>`}
              </div>
            `;
          }

          const prefix = token.prefix || '';
          const text = token.isRtl ? `${val}${prefix ? ` ${prefix}` : ''}` : `${prefix}${val}`;
          const fontFam = token.fontFamily ? AVAILABLE_FONTS.find(f => f.id === token.fontFamily)?.family || token.fontFamily : "'Cairo', sans-serif";
          return `
            <div style="position: absolute; left: ${token.xPercent}%; top: ${token.yPercent}%; transform: translate(-50%, -50%); width: 90%; text-align: ${token.align || (token.isRtl ? 'right' : 'left')}; pointer-events: none;">
              <div dir="${token.isRtl ? 'rtl' : 'ltr'}" style="font-family: ${fontFam}; font-size: ${token.fontSize || 14}px; font-weight: ${token.fontWeight || 'bold'}; color: ${token.color || '#000000'}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                ${text}
              </div>
            </div>
          `;
        }).join('');

        return `
          <div style="width: ${widthMm}mm; height: ${heightMm}mm; position: relative; background: #ffffff; background-image: url('${tpl.background_url || ''}'); background-size: 100% 100%; overflow: hidden; margin: 0 auto; border: ${showCutMarks ? '1px dashed #cbd5e1' : 'none'}; page-break-inside: avoid; break-inside: avoid;">
            ${tokensContent}
          </div>
        `;
      }).join('');
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="ar">
      <head>
        <meta charset="utf-8" />
        <title>Badges_Omra_${groupe?.code || 'GROUPE'}_${new Date().toISOString().split('T')[0]}</title>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=Cairo:wght@400;600;700;800;900&family=Tajawal:wght@400;500;700;800&family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
        <style>
          @page {
            size: A4 portrait;
            margin: 8mm;
          }
          * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body {
            margin: 0;
            padding: 0;
            background: #ffffff;
            font-family: 'Cairo', sans-serif;
          }
          .badges-sheet {
            display: grid;
            grid-template-columns: repeat(${gridCols}, auto);
            justify-content: center;
            align-content: start;
            gap: ${showCutMarks ? '4mm' : '2mm'};
            margin: 0 auto;
          }
          @media print {
            body {
              background: transparent;
            }
          }
        </style>
      </head>
      <body>
        <div class="badges-sheet">
          ${badgesHtml}
        </div>
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 600);
          };
        </script>
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank', 'height=850,width=1200');
    if (!printWindow) {
      alert("Veuillez autoriser les fenêtres surgissantes (popups) pour imprimer les badges.");
      return;
    }
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const previewPilgrim = filteredPilgrims[previewPilgrimIdx] || filteredPilgrims[0];

  return (
    <div className="space-y-6">
      {/* ── Top Bar / Action Card ─────────────────────────────── */}
      <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white rounded-2xl p-6 shadow-xl border border-emerald-500/20">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-3 py-0.5 rounded-full text-xs font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                Badge Officiel ONPO & El Mokhtar
              </span>
              <h2 className="text-xl md:text-2xl font-black tracking-tight">
                Impression des Badges Pèlerins
              </h2>
            </div>
            <p className="text-xs md:text-sm text-emerald-200/80">
              Générez les badges officiels pour <span className="font-bold text-white">« {groupe?.nom} »</span> avec vos 6 variables dynamiques en Arabe RTL.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={() => navigate('/omra/badges')}
              className="bg-white/10 hover:bg-white/20 text-white border-white/20 text-xs h-9 font-bold"
            >
              <Settings2 size={15} className="mr-1.5" /> Personnaliser dans le Builder
            </Button>

            <Button
              onClick={handleLaunchPrint}
              disabled={selectedPilgrimIds.size === 0}
              className="bg-emerald-500 hover:bg-emerald-600 text-white text-xs h-9 font-black shadow-lg gap-2 px-5"
            >
              <Printer size={16} /> Imprimer {selectedPilgrimIds.size} Badge(s)
            </Button>
          </div>
        </div>
      </div>

      {/* ── Controls Grid ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        
        {/* Left Column: The 6 Dynamic Variables (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          
          {/* Template Selection */}
          <Card className="shadow-sm border-slate-200">
            <CardHeader className="py-3 px-4 bg-slate-50 border-b border-slate-100">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <IdCard size={14} className="text-primary" /> Modèle Sélectionné
                </span>
                <span className="text-[10px] font-bold text-primary cursor-pointer hover:underline" onClick={() => navigate('/omra/badges')}>
                  Ouvrir le Builder →
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-600">Choisir le modèle :</Label>
                <select
                  className="w-full text-xs font-bold border border-slate-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-primary/20"
                  value={selectedTemplateId}
                  onChange={(e) => setSelectedTemplateId(e.target.value)}
                >
                  {templates.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.nom} {t.id === 'official_onpo' ? '★ Conforme à vos captures' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {isOfficialTemplate && (
                <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-[11px] text-emerald-800 flex items-center gap-2">
                  <Check size={14} className="text-emerald-600 shrink-0" />
                  <span><strong>Modèle Officiel Activé :</strong> Logos Agence & ONPO, contacts d'urgence, QR code et les 6 variables dynamiques.</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* THE 6 DYNAMIC VARIABLES CARD */}
          <Card className="shadow-sm border-amber-200 bg-amber-50/20">
            <CardHeader className="py-3 px-4 bg-amber-100/60 border-b border-amber-200">
              <CardTitle className="text-xs font-black uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
                <Sparkles size={14} className="text-amber-700" /> Les 6 Variables Dynamiques
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3.5">
              
              {/* Variable 1 & 2: Nom Arabe & Prénom Arabe */}
              <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                <p className="text-xs font-bold text-slate-800">1. Nom Arabe & 2. Prénom Arabe (RTL)</p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Remplis automatiquement pour chaque pèlerin depuis son dossier (ex : <span className="font-bold text-slate-700 font-['Cairo']">جهرة أميرة</span> ou <span className="font-bold text-slate-700 font-['Cairo']">بلحوت دانية</span>).
                </p>
              </div>

              {/* Variable 3: Numéro Passeport */}
              <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                <p className="text-xs font-bold text-slate-800">3. Numéro Passeport</p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Incrusté automatiquement sous le nom et encodé dans le QR code (ex : <span className="font-bold text-slate-700 font-mono">308619246</span>).
                </p>
              </div>

              {/* Variable 4: Hôtel Mecca */}
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <Label className="text-xs font-bold text-slate-800">4. Hôtel Mecca (مكة المكرمة) :</Label>
                  <span className="text-[10px] font-black uppercase text-amber-600">RTL</span>
                </div>
                <Input
                  dir="rtl"
                  value={hotelMeccaText}
                  onChange={(e) => setHotelMeccaText(e.target.value)}
                  placeholder="ex: فجر نسك أجياد ou ميلنيوم النسيم"
                  className="h-9 text-xs font-bold text-right font-['Cairo'] bg-white border-slate-300"
                />
              </div>

              {/* Variable 5: Hôtel Médine */}
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <Label className="text-xs font-bold text-slate-800">5. Hôtel Médine (المدينة المنورة) :</Label>
                  <span className="text-[10px] font-black uppercase text-emerald-600">RTL</span>
                </div>
                <Input
                  dir="rtl"
                  value={hotelMedinaText}
                  onChange={(e) => setHotelMedinaText(e.target.value)}
                  placeholder="ex: ديوان روز"
                  className="h-9 text-xs font-bold text-right font-['Cairo'] bg-white border-slate-300"
                />
              </div>

              {/* Variable 6: Numéros Téléphone Guide */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label className="text-xs font-bold text-slate-800">6. Numéro Téléphone Guide (Sous le QR Code) :</Label>
                  <span className="text-[10px] font-bold text-slate-400">LTR</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    value={guidePhone1}
                    onChange={(e) => setGuidePhone1(e.target.value)}
                    placeholder="0547.50.52.93"
                    className="h-8 text-xs font-bold font-mono bg-white"
                  />
                  <Input
                    value={guidePhone2}
                    onChange={(e) => setGuidePhone2(e.target.value)}
                    placeholder="+213.558.90.30.11"
                    className="h-8 text-xs font-bold font-mono bg-white"
                  />
                </div>
              </div>

            </CardContent>
          </Card>

          {/* Print Layout Options */}
          <Card className="shadow-sm border-slate-200">
            <CardHeader className="py-3 px-4 bg-slate-50 border-b border-slate-100">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Printer size={14} className="text-primary" /> Mise en Page A4
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-600">Badges par feuille A4 :</Label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { id: '1', label: '1 badge' },
                    { id: '2', label: '2 badges' },
                    { id: '4', label: '4 (2×2)' },
                    { id: '6', label: '6 (2×3)' },
                  ].map(opt => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setBadgesPerPage(opt.id)}
                      className={`py-2 px-1 text-xs font-bold rounded-lg border text-center transition-all ${
                        badgesPerPage === opt.id 
                          ? 'bg-primary text-white border-primary shadow-xs' 
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700 select-none">
                  <input
                    type="checkbox"
                    checked={showCutMarks}
                    onChange={(e) => setShowCutMarks(e.target.checked)}
                    className="rounded border-slate-300 text-primary focus:ring-primary h-3.5 w-3.5"
                  />
                  Afficher les repères de coupe (traits de découpe discrets)
                </label>
              </div>
            </CardContent>
          </Card>

        </div>

        {/* Right Column: Live Badge Preview & Pilgrims Selection (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          
          {/* Live Badge Preview Card */}
          <Card className="shadow-sm border-slate-200 overflow-hidden">
            <CardHeader className="py-3 px-4 bg-slate-50 border-b border-slate-100 flex flex-row items-center justify-between">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Eye size={14} className="text-primary" /> Aperçu Réel du Badge (Rendu Officiel)
              </CardTitle>
              {filteredPilgrims.length > 1 && (
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-500 font-medium">Changer pèlerin :</span>
                  <select
                    className="text-xs font-bold border border-slate-200 rounded px-2 py-1 bg-white font-['Cairo']"
                    value={previewPilgrimIdx}
                    onChange={(e) => setPreviewPilgrimIdx(Number(e.target.value))}
                  >
                    {filteredPilgrims.slice(0, 40).map((p, idx) => (
                      <option key={p.uniqueKey} value={idx}>
                        {p.nomArabe} {p.prenomArabe} ({p.fullNameFr})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </CardHeader>
            <CardContent className="p-6 bg-slate-100 flex items-center justify-center">
              {previewPilgrim ? (
                renderBadgeElement(previewPilgrim, currentTemplate, false)
              ) : (
                <p className="text-xs text-slate-400">Aucun pèlerin à afficher</p>
              )}
            </CardContent>
          </Card>

          {/* Pilgrims Selection Table */}
          <Card className="shadow-sm border-slate-200">
            <CardHeader className="py-3 px-4 bg-slate-50 border-b border-slate-100">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                  <span>Pèlerins à imprimer</span>
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-black bg-emerald-100 text-emerald-800">
                    {selectedPilgrimIds.size} / {allGroupPilgrims.length}
                  </span>
                </CardTitle>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleToggleSelectAll}
                    className="h-7 text-xs font-bold px-2.5"
                  >
                    {selectedPilgrimIds.size === filteredPilgrims.length ? "Tout désélectionner" : "Tout sélectionner"}
                  </Button>
                </div>
              </div>

              {/* Filters row */}
              <div className="flex items-center gap-2 mt-3">
                <div className="relative flex-1">
                  <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Rechercher par nom arabe, français, passeport..."
                    className="h-8 pl-8 text-xs bg-white"
                  />
                </div>
                <select
                  value={filterGender}
                  onChange={(e) => setFilterGender(e.target.value)}
                  className="h-8 text-xs font-semibold border border-slate-200 rounded-lg px-2 bg-white"
                >
                  <option value="all">Tous genres</option>
                  <option value="H">Hommes (H)</option>
                  <option value="F">Femmes (F)</option>
                </select>
              </div>
            </CardHeader>

            <CardContent className="p-0 max-h-96 overflow-y-auto custom-scrollbar">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50/80 text-[10px] uppercase font-bold text-slate-500 border-b sticky top-0">
                  <tr>
                    <th className="px-3 py-2 w-8 text-center">
                      <input
                        type="checkbox"
                        checked={filteredPilgrims.length > 0 && selectedPilgrimIds.size === filteredPilgrims.length}
                        onChange={handleToggleSelectAll}
                        className="rounded border-slate-300 text-primary focus:ring-primary h-3.5 w-3.5"
                      />
                    </th>
                    <th className="px-3 py-2">Pèlerin</th>
                    <th className="px-3 py-2 text-right">Nom & Prénom Arabe</th>
                    <th className="px-3 py-2">Passeport</th>
                    <th className="px-3 py-2">Chambre</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredPilgrims.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="text-center py-6 text-slate-400">
                        Aucun pèlerin trouvé
                      </td>
                    </tr>
                  ) : (
                    filteredPilgrims.map((p) => {
                      const isSelected = selectedPilgrimIds.has(p.uniqueKey);

                      return (
                        <tr
                          key={p.uniqueKey}
                          onClick={() => handleTogglePilgrim(p.uniqueKey)}
                          className={`hover:bg-slate-50/80 cursor-pointer transition-colors ${
                            isSelected ? 'bg-emerald-50/30' : ''
                          }`}
                        >
                          <td className="px-3 py-2 text-center" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleTogglePilgrim(p.uniqueKey)}
                              className="rounded border-slate-300 text-primary focus:ring-primary h-3.5 w-3.5"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-2">
                              {p.photoUrl ? (
                                <img src={p.photoUrl} alt={p.nom} className="w-6 h-6 rounded-full object-cover shrink-0 border border-slate-300" />
                              ) : (
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                                  p.sexe === 'F' ? 'bg-pink-100 text-pink-700' : 'bg-blue-100 text-blue-700'
                                }`}>
                                  {p.nom?.[0]?.toUpperCase() || 'P'}
                                </div>
                              )}
                              <div>
                                <p className="font-bold text-slate-800 leading-tight">{p.fullNameFr}</p>
                                {p.isEnfantSansLit && (
                                  <span className="text-[9px] font-bold text-amber-600">Sans lit</span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-2 text-right font-['Cairo'] font-bold text-slate-800" dir="rtl">
                            {p.nomArabe} {p.prenomArabe}
                          </td>
                          <td className="px-3 py-2 font-mono font-medium text-slate-600">
                            {p.passport}
                          </td>
                          <td className="px-3 py-2 text-slate-500">
                            {p.chambreId}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>

        </div>

      </div>
    </div>
  );
}
