import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';
import {
  BADGE_DIMENSIONS,
  AVAILABLE_FONTS,
  BADGE_TOKENS_CONFIG,
  SAMPLE_PILGRIM_PREVIEW,
  DEFAULT_INITIAL_TEMPLATE,
  OFFICIAL_ONPO_TEMPLATE
} from '@/lib/badgeConstants';
import OfficialOnpoBadge from '@/components/OfficialOnpoBadge';
import {
  IdCard,
  Upload,
  Save,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Move,
  Layers,
  Sparkles,
  RotateCcw,
  Check,
  ArrowLeft,
  Settings2,
  Type,
  Maximize2,
  FileText,
  Printer,
  ChevronDown
} from 'lucide-react';

const LOCAL_STORAGE_KEY = 'el_mokhtar_badge_templates';

export default function BadgeBuilder() {
  const navigate = useNavigate();

  // State des templates
  const [templates, setTemplates] = useState([]);
  const [currentTemplate, setCurrentTemplate] = useState(DEFAULT_INITIAL_TEMPLATE);
  const [selectedTokenIdx, setSelectedTokenIdx] = useState(null);
  const [previewMode, setPreviewMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [bgUploading, setBgUploading] = useState(false);

  // Dragging state
  const canvasRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragTokenIdx, setDragTokenIdx] = useState(null);
  const dragOffsetRef = useRef({ x: 0, y: 0 });

  // 1. Chargement des templates depuis Supabase / LocalStorage
  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('badge_templates')
        .select('*')
        .order('created_at', { ascending: false });

      let list = [];

      if (!error && data && data.length > 0) {
        list = data;
        setTemplates(list);
        const defaultTpl = list.find(t => t.is_default) || list[0];
        setCurrentTemplate(defaultTpl);
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(list));
      } else {
        // Fallback LocalStorage
        const local = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (local) {
          try {
            const parsed = JSON.parse(local);
            if (Array.isArray(parsed) && parsed.length > 0) {
              list = parsed;
              setTemplates(list);
              const defaultTpl = list.find(t => t.is_default) || list[0];
              setCurrentTemplate(defaultTpl);
              return;
            }
          } catch (e) {
            console.warn("Parse local templates note:", e);
          }
        }
        setTemplates([DEFAULT_INITIAL_TEMPLATE]);
        setCurrentTemplate(DEFAULT_INITIAL_TEMPLATE);
      }
    } catch (err) {
      console.warn("Chargement templates, fallback local:", err);
      setTemplates([DEFAULT_INITIAL_TEMPLATE]);
      setCurrentTemplate(DEFAULT_INITIAL_TEMPLATE);
    }
  };

  // 2. Gestion de l'upload du fond
  const handleBackgroundUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert("Veuillez sélectionner un fichier image valide (PNG, JPEG, WebP, SVG).");
      return;
    }

    setBgUploading(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64Data = event.target?.result;
      setCurrentTemplate(prev => ({
        ...prev,
        background_url: base64Data
      }));
      setBgUploading(false);
    };
    reader.onerror = () => {
      alert("Erreur lors de la lecture du fichier.");
      setBgUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveBackground = () => {
    setCurrentTemplate(prev => ({
      ...prev,
      background_url: null
    }));
  };

  // 3. Changement de dimensions prédéfinies
  const handleDimensionChange = (dimId) => {
    const dim = BADGE_DIMENSIONS.find(d => d.id === dimId);
    if (!dim) return;

    setCurrentTemplate(prev => ({
      ...prev,
      width_mm: dim.widthMm,
      height_mm: dim.heightMm,
      orientation: dim.orientation
    }));
  };

  // 4. Ajouter / Activer un token sur le canvas
  const handleAddToken = (config) => {
    const existingIdx = (currentTemplate.tokens || []).findIndex(t => t.tokenId === config.id);
    if (existingIdx !== -1) {
      // Déjà présent, le sélectionner
      setSelectedTokenIdx(existingIdx);
      return;
    }

    const newToken = {
      tokenId: config.id,
      xPercent: 50,
      yPercent: Math.min(85, 20 + ((currentTemplate.tokens || []).length * 8)),
      ...(config.defaultStyle || {})
    };

    const updatedTokens = [...(currentTemplate.tokens || []), newToken];
    setCurrentTemplate(prev => ({
      ...prev,
      tokens: updatedTokens
    }));
    setSelectedTokenIdx(updatedTokens.length - 1);
  };

  const handleRemoveToken = (idxToRemove) => {
    const updated = (currentTemplate.tokens || []).filter((_, i) => i !== idxToRemove);
    setCurrentTemplate(prev => ({
      ...prev,
      tokens: updated
    }));
    if (selectedTokenIdx === idxToRemove) {
      setSelectedTokenIdx(null);
    } else if (selectedTokenIdx > idxToRemove) {
      setSelectedTokenIdx(selectedTokenIdx - 1);
    }
  };

  const updateSelectedTokenProp = (prop, value) => {
    if (selectedTokenIdx === null || !currentTemplate.tokens?.[selectedTokenIdx]) return;
    const updatedTokens = [...currentTemplate.tokens];
    updatedTokens[selectedTokenIdx] = {
      ...updatedTokens[selectedTokenIdx],
      [prop]: value
    };
    setCurrentTemplate(prev => ({
      ...prev,
      tokens: updatedTokens
    }));
  };

  // 5. Drag & Drop interactif des tokens sur le canvas
  const handleTokenMouseDown = (e, index) => {
    e.stopPropagation();
    setSelectedTokenIdx(index);
    setDragTokenIdx(index);
    setIsDragging(true);

    if (!canvasRef.current) return;
    const canvasRect = canvasRef.current.getBoundingClientRect();
    const token = currentTemplate.tokens[index];
    const currentTokenX = (token.xPercent / 100) * canvasRect.width;
    const currentTokenY = (token.yPercent / 100) * canvasRect.height;

    dragOffsetRef.current = {
      x: (e.clientX - canvasRect.left) - currentTokenX,
      y: (e.clientY - canvasRect.top) - currentTokenY
    };
  };

  const handleCanvasMouseMove = (e) => {
    if (!isDragging || dragTokenIdx === null || !canvasRef.current) return;

    const canvasRect = canvasRef.current.getBoundingClientRect();
    const clickX = e.clientX - canvasRect.left - dragOffsetRef.current.x;
    const clickY = e.clientY - canvasRect.top - dragOffsetRef.current.y;

    let xPercent = Math.round((clickX / canvasRect.width) * 100);
    let yPercent = Math.round((clickY / canvasRect.height) * 100);

    // Contraintes 0-100%
    xPercent = Math.max(2, Math.min(98, xPercent));
    yPercent = Math.max(2, Math.min(98, yPercent));

    const updatedTokens = [...currentTemplate.tokens];
    updatedTokens[dragTokenIdx] = {
      ...updatedTokens[dragTokenIdx],
      xPercent,
      yPercent
    };

    setCurrentTemplate(prev => ({
      ...prev,
      tokens: updatedTokens
    }));
  };

  const handleCanvasMouseUp = () => {
    if (isDragging) {
      setIsDragging(false);
      setDragTokenIdx(null);
    }
  };

  // 6. Sauvegarde du template
  const handleSaveTemplate = async () => {
    if (!currentTemplate.nom?.trim()) {
      alert("Veuillez saisir un nom pour le modèle de badge.");
      return;
    }

    setIsSaving(true);
    try {
      const templatePayload = {
        nom: currentTemplate.nom.trim(),
        width_mm: Number(currentTemplate.width_mm) || 70,
        height_mm: Number(currentTemplate.height_mm) || 100,
        orientation: currentTemplate.orientation || 'vertical',
        background_url: currentTemplate.background_url || null,
        tokens: currentTemplate.tokens || [],
        is_default: !!currentTemplate.is_default,
        updated_at: new Date().toISOString()
      };

      let savedData = null;
      const isUuid = currentTemplate.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(currentTemplate.id);

      try {
        if (isUuid) {
          const { data, error } = await supabase
            .from('badge_templates')
            .update(templatePayload)
            .eq('id', currentTemplate.id)
            .select();
          if (!error && data?.[0]) savedData = data[0];
        } else {
          const { data, error } = await supabase
            .from('badge_templates')
            .insert([{ ...templatePayload, id: crypto.randomUUID() }])
            .select();
          if (!error && data?.[0]) savedData = data[0];
        }
      } catch (dbErr) {
        console.warn("Table badge_templates sync non active, stockage local garanti:", dbErr);
      }

      // Sync LocalStorage
      const finalTemplate = savedData || {
        ...currentTemplate,
        ...templatePayload,
        id: currentTemplate.id || `tpl-${Date.now()}`
      };

      const updatedList = templates.map(t => t.id === finalTemplate.id ? finalTemplate : t);
      if (!updatedList.some(t => t.id === finalTemplate.id)) {
        updatedList.unshift(finalTemplate);
      }

      // Si défini par défaut, désactiver les autres
      if (finalTemplate.is_default) {
        updatedList.forEach(t => {
          if (t.id !== finalTemplate.id) t.is_default = false;
        });
      }

      setTemplates(updatedList);
      setCurrentTemplate(finalTemplate);
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedList));

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error(err);
      alert("Erreur lors de la sauvegarde : " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // 7. Créer un nouveau template vierge
  const handleCreateNewTemplate = () => {
    const newTpl = {
      id: `tpl-${Date.now()}`,
      nom: `Nouveau Badge ${templates.length + 1}`,
      width_mm: 70,
      height_mm: 100,
      orientation: 'vertical',
      background_url: null,
      tokens: [...DEFAULT_INITIAL_TEMPLATE.tokens],
      is_default: false
    };
    setCurrentTemplate(newTpl);
    setSelectedTokenIdx(null);
  };

  // 8. Rendu du contenu d'un token (en mode édition ou aperçu)
  const renderTokenPreviewContent = (token) => {
    const config = BADGE_TOKENS_CONFIG.find(c => c.id === token.tokenId);
    if (!config) return null;

    if (config.isImage) {
      return (
        <div 
          style={{
            width: `${token.width || 60}px`,
            height: `${token.height || 75}px`,
            borderRadius: `${token.borderRadius || 8}px`,
            border: `${token.borderWidth || 2}px solid ${token.borderColor || '#cbd5e1'}`
          }}
          className="bg-slate-200 shadow-sm flex items-center justify-center overflow-hidden"
        >
          {previewMode && SAMPLE_PILGRIM_PREVIEW.photo_url ? (
            <img src={SAMPLE_PILGRIM_PREVIEW.photo_url} alt="Pèlerin" className="w-full h-full object-cover" />
          ) : (
            <div className="flex flex-col items-center justify-center text-slate-400">
              <IdCard size={24} />
              <span className="text-[9px] font-bold mt-1 uppercase">Photo</span>
            </div>
          )}
        </div>
      );
    }

    const value = previewMode 
      ? (SAMPLE_PILGRIM_PREVIEW[token.tokenId] || config.defaultText)
      : (config.defaultText);

    const prefix = token.prefix || '';
    const textToDisplay = token.isRtl 
      ? `${value}${prefix ? ` ${prefix}` : ''}`
      : `${prefix}${value}`;

    return (
      <span
        dir={token.isRtl ? 'rtl' : 'ltr'}
        style={{
          fontFamily: token.fontFamily ? AVAILABLE_FONTS.find(f => f.id === token.fontFamily)?.family || token.fontFamily : 'Cairo',
          fontSize: `${token.fontSize || 14}px`,
          fontWeight: token.fontWeight || 'bold',
          color: token.color || '#000000',
          textAlign: token.align || (token.isRtl ? 'right' : 'left'),
          lineHeight: 1.25,
          whiteSpace: 'nowrap',
          textShadow: previewMode ? '0px 1px 2px rgba(255,255,255,0.8)' : 'none'
        }}
        className="block select-none"
      >
        {textToDisplay}
      </span>
    );
  };

  // Calcul du ratio d'affichage du canvas
  const aspectWidth = Number(currentTemplate.width_mm) || 70;
  const aspectHeight = Number(currentTemplate.height_mm) || 100;
  const isLandscape = aspectWidth > aspectHeight;
  const canvasDisplayHeight = isLandscape ? 380 : 540;
  const canvasDisplayWidth = Math.round((aspectWidth / aspectHeight) * canvasDisplayHeight);

  const selectedToken = selectedTokenIdx !== null ? currentTemplate.tokens?.[selectedTokenIdx] : null;
  const selectedTokenConfig = selectedToken ? BADGE_TOKENS_CONFIG.find(c => c.id === selectedToken.tokenId) : null;

  return (
    <Layout>
      <div className="space-y-5 pb-16">
        {/* ── Top Header ────────────────────────────────────────── */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-sidebar p-5 rounded-xl border border-white/5 text-white">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/omra')}
              className="text-white/70 hover:text-white hover:bg-white/10"
              title="Retour aux groupes Omra"
            >
              <ArrowLeft size={18} />
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  Éditeur Visuel
                </span>
                <h1 className="text-xl md:text-2xl font-black tracking-tight">
                  Générateur de Badges Pèlerins (Badge Builder)
                </h1>
              </div>
              <p className="text-xs text-white/60 mt-0.5">
                Créez votre modèle de badge, uploadez l'arrière-plan et placez les informations arabes RTL avec précision.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCreateNewTemplate}
              className="bg-white/10 hover:bg-white/20 text-white border-white/20 text-xs h-9"
            >
              <Plus size={14} className="mr-1.5" /> Nouveau Modèle
            </Button>

            <Button
              variant={previewMode ? "secondary" : "outline"}
              size="sm"
              onClick={() => setPreviewMode(!previewMode)}
              className={previewMode 
                ? "bg-amber-500 hover:bg-amber-600 text-white text-xs h-9 font-bold border-amber-400" 
                : "bg-white/10 hover:bg-white/20 text-white border-white/20 text-xs h-9"
              }
            >
              {previewMode ? <EyeOff size={14} className="mr-1.5" /> : <Eye size={14} className="mr-1.5" />}
              {previewMode ? "Mode Éditeur" : "Aperçu Données Réelles"}
            </Button>

            <Button
              size="sm"
              onClick={handleSaveTemplate}
              disabled={isSaving}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-9 font-bold shadow-md gap-1.5 px-4"
            >
              {saveSuccess ? <Check size={15} /> : <Save size={15} />}
              {saveSuccess ? "Enregistré !" : isSaving ? "Enregistrement..." : "Enregistrer le Modèle"}
            </Button>
          </div>
        </div>

        {/* ── Main Workspace Grid ───────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          
          {/* ── Left Column: Configuration & Tokens (4 Cols) ───── */}
          <div className="lg:col-span-4 space-y-4">
            
            {/* Template Selector & General Info */}
            <Card className="shadow-sm border-slate-200">
              <CardHeader className="py-3 px-4 bg-slate-50 border-b border-slate-100">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <FileText size={14} className="text-primary" /> Modèle Actif
                  </span>
                  {templates.length > 1 && (
                    <span className="text-[10px] text-muted-foreground font-normal">
                      {templates.length} modèles disponibles
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                {templates.length > 1 && (
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-slate-600">Sélectionner un modèle :</Label>
                    <select
                      className="w-full text-xs font-medium border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-primary/20"
                      value={currentTemplate.id}
                      onChange={(e) => {
                        const tpl = templates.find(t => t.id === e.target.value);
                        if (tpl) {
                          setCurrentTemplate(tpl);
                          setSelectedTokenIdx(null);
                        }
                      }}
                    >
                      {templates.map(t => (
                        <option key={t.id} value={t.id}>
                          {t.nom} {t.is_default ? '(Par défaut)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-600">Nom du modèle :</Label>
                  <Input
                    value={currentTemplate.nom || ''}
                    onChange={(e) => setCurrentTemplate(prev => ({ ...prev, nom: e.target.value }))}
                    className="h-8 text-xs font-bold"
                    placeholder="ex: Badge Omra Standard"
                  />
                </div>

                <div className="flex items-center justify-between pt-1">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700 select-none">
                    <input
                      type="checkbox"
                      checked={!!currentTemplate.is_default}
                      onChange={(e) => setCurrentTemplate(prev => ({ ...prev, is_default: e.target.checked }))}
                      className="rounded border-slate-300 text-primary focus:ring-primary h-3.5 w-3.5"
                    />
                    Définir comme modèle par défaut pour l'agence
                  </label>
                </div>
              </CardContent>
            </Card>

            {/* Background Image Upload */}
            <Card className="shadow-sm border-slate-200">
              <CardHeader className="py-3 px-4 bg-slate-50 border-b border-slate-100">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <Upload size={14} className="text-primary" /> Arrière-plan du Badge
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                {currentTemplate.background_url ? (
                  <div className="space-y-2">
                    <div className="relative rounded-lg overflow-hidden border border-slate-200 max-h-36 bg-slate-100 flex items-center justify-center p-2">
                      <img 
                        src={currentTemplate.background_url} 
                        alt="Fond de badge" 
                        className="max-h-32 object-contain rounded"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon-sm"
                        onClick={handleRemoveBackground}
                        className="absolute top-2 right-2 h-7 w-7 rounded-full shadow-md"
                        title="Supprimer l'arrière-plan"
                      >
                        <Trash2 size={13} />
                      </Button>
                    </div>
                    <label className="block text-center cursor-pointer">
                      <span className="text-[11px] font-bold text-primary hover:underline">
                        Changer l'image de fond
                      </span>
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handleBackgroundUpload} 
                        className="hidden" 
                      />
                    </label>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-slate-300 rounded-xl p-5 text-center hover:border-primary/50 transition-colors bg-slate-50/50">
                    <Upload size={28} className="mx-auto text-slate-400 mb-2" />
                    <p className="text-xs font-bold text-slate-700 mb-0.5">Uploader le visuel de fond</p>
                    <p className="text-[11px] text-slate-500 mb-3">Format PNG, JPG ou WebP de haute qualité</p>
                    <label className="inline-block">
                      <Button
                        type="button"
                        size="sm"
                        className="text-xs h-8 pointer-events-none"
                      >
                        {bgUploading ? "Chargement..." : "Parcourir l'image"}
                      </Button>
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handleBackgroundUpload} 
                        className="hidden" 
                      />
                    </label>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Badge Dimensions & Orientation */}
            <Card className="shadow-sm border-slate-200">
              <CardHeader className="py-3 px-4 bg-slate-50 border-b border-slate-100">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <Maximize2 size={14} className="text-primary" /> Dimensions du Format
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-600">Format prédéfini :</Label>
                  <select
                    className="w-full text-xs font-medium border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-primary/20"
                    onChange={(e) => handleDimensionChange(e.target.value)}
                    defaultValue="event_v"
                  >
                    {BADGE_DIMENSIONS.map(d => (
                      <option key={d.id} value={d.id}>{d.label}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold text-slate-500">Largeur (mm)</Label>
                    <Input
                      type="number"
                      value={currentTemplate.width_mm || 70}
                      onChange={(e) => setCurrentTemplate(prev => ({ ...prev, width_mm: Number(e.target.value) || 10 }))}
                      className="h-8 text-xs font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold text-slate-500">Hauteur (mm)</Label>
                    <Input
                      type="number"
                      value={currentTemplate.height_mm || 100}
                      onChange={(e) => setCurrentTemplate(prev => ({ ...prev, height_mm: Number(e.target.value) || 10 }))}
                      className="h-8 text-xs font-mono"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tokens Palette */}
            <Card className="shadow-sm border-slate-200">
              <CardHeader className="py-3 px-4 bg-slate-50 border-b border-slate-100">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Layers size={14} className="text-primary" /> Données Dynamiques (Tokens)
                  </span>
                  <span className="text-[10px] text-muted-foreground font-semibold">
                    {(currentTemplate.tokens || []).length} placés
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 space-y-1.5 max-h-80 overflow-y-auto custom-scrollbar">
                {BADGE_TOKENS_CONFIG.map(config => {
                  const isPlaced = (currentTemplate.tokens || []).some(t => t.tokenId === config.id);
                  const isCurrent = selectedToken?.tokenId === config.id;

                  return (
                    <div
                      key={config.id}
                      onClick={() => handleAddToken(config)}
                      className={`flex items-center justify-between p-2 rounded-lg border text-xs cursor-pointer transition-all ${
                        isCurrent 
                          ? 'border-primary bg-primary/10 shadow-xs' 
                          : isPlaced 
                            ? 'border-emerald-200 bg-emerald-50/50 hover:bg-emerald-100/50' 
                            : 'border-slate-200 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className={`w-2 h-2 rounded-full shrink-0 ${isPlaced ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                        <div className="min-w-0">
                          <p className="font-bold text-slate-800 truncate">{config.label}</p>
                          <p className="text-[10px] text-slate-500 truncate" dir="rtl">{config.arabicLabel}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {config.isRtl && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase bg-amber-100 text-amber-800 border border-amber-300">
                            RTL
                          </span>
                        )}
                        <span className={`text-[11px] font-bold ${isPlaced ? 'text-emerald-700' : 'text-slate-500'}`}>
                          {isPlaced ? 'Actif' : '+ Ajouter'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

          </div>

          {/* ── Center Column: Interactive Canvas (5 Cols) ─────── */}
          <div className="lg:col-span-5 flex flex-col items-center">
            
            <div className="w-full flex items-center justify-between mb-2 px-1">
              <span className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
                <Move size={14} className="text-slate-500" />
                Glissez les éléments directement avec la souris
              </span>
              <span className="text-xs font-mono font-bold text-slate-500">
                {currentTemplate.width_mm} × {currentTemplate.height_mm} mm
              </span>
            </div>

            {/* Canvas Box */}
            <div
              className="relative p-6 bg-slate-200/80 rounded-2xl border border-slate-300/80 shadow-inner flex items-center justify-center overflow-hidden w-full select-none"
              onMouseMove={handleCanvasMouseMove}
              onMouseUp={handleCanvasMouseUp}
              onMouseLeave={handleCanvasMouseUp}
            >
              <div
                ref={canvasRef}
                style={{
                  width: `${canvasDisplayWidth}px`,
                  height: `${canvasDisplayHeight}px`,
                  backgroundImage: currentTemplate.background_url ? `url("${currentTemplate.background_url}")` : 'none',
                  backgroundSize: '100% 100%',
                  backgroundPosition: 'center',
                  backgroundRepeat: 'no-repeat'
                }}
                className={`relative rounded-xl overflow-hidden shadow-2xl transition-all ${
                  !currentTemplate.background_url 
                    ? 'bg-slate-50 border-2 border-dashed border-slate-300' 
                    : 'border border-slate-400 bg-white'
                }`}
              >
                {/* Overlay invitation d'upload si aucun fond n'est encore chargé */}
                {!currentTemplate.background_url && (
                  <label className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center cursor-pointer bg-slate-50/90 hover:bg-slate-100/90 transition-colors z-20 select-none">
                    <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-3 shadow-inner">
                      <Upload size={32} />
                    </div>
                    <p className="text-sm font-black text-slate-800">Uploader l'Arrière-plan du Badge</p>
                    <p className="text-xs text-slate-500 mt-1.5 max-w-[260px] leading-relaxed">
                      Importez votre visuel complet avec vos logos, cadres et textes officiels.
                    </p>
                    <span className="mt-4 px-4 py-2 bg-primary text-white rounded-xl text-xs font-bold shadow-md hover:bg-primary/90 transition-all">
                      {bgUploading ? "Chargement en cours..." : "Choisir une image (PNG / JPG)"}
                    </span>
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleBackgroundUpload} 
                      className="hidden" 
                    />
                  </label>
                )}

                {/* Tokens Placed on Canvas */}
                {(currentTemplate.tokens || []).map((token, idx) => {
                  const isSelected = selectedTokenIdx === idx;
                  const config = BADGE_TOKENS_CONFIG.find(c => c.id === token.tokenId);

                  return (
                    <div
                      key={`${token.tokenId}-${idx}`}
                      onMouseDown={(e) => handleTokenMouseDown(e, idx)}
                      style={{
                        position: 'absolute',
                        left: `${token.xPercent}%`,
                        top: `${token.yPercent}%`,
                        transform: 'translate(-50%, -50%)',
                        cursor: isDragging ? 'grabbing' : 'grab',
                        zIndex: isSelected ? 30 : 10
                      }}
                      className={`group transition-transform ${
                        !previewMode ? 'hover:scale-[1.02]' : ''
                      }`}
                    >
                      {/* Selection Box / Border */}
                      {!previewMode && (
                        <div className={`absolute -inset-1.5 rounded pointer-events-none transition-all ${
                          isSelected 
                            ? 'border-2 border-dashed border-blue-600 bg-blue-500/10 shadow-xs' 
                            : 'border border-transparent group-hover:border-slate-400/80 group-hover:bg-black/5'
                        }`}>
                          {isSelected && (
                            <span className="absolute -top-4 left-1/2 -translate-x-1/2 px-1.5 py-0.2 bg-blue-600 text-white text-[9px] font-bold rounded shadow-xs uppercase tracking-wider whitespace-nowrap">
                              {config?.label || token.tokenId}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Token Content */}
                      {renderTokenPreviewContent(token)}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Canvas Hint */}
            <div className="mt-3 text-center">
              <p className="text-xs text-slate-500">
                Aperçu à l'échelle <span className="font-semibold text-slate-700">{aspectWidth}mm × {aspectHeight}mm</span>. L'impression utilisera les dimensions exactes configurées.
              </p>
            </div>
          </div>

          {/* ── Right Column: Selected Token Inspector (3 Cols) ─ */}
          <div className="lg:col-span-3 space-y-4">
            <Card className="shadow-sm border-slate-200">
              <CardHeader className="py-3 px-4 bg-slate-50 border-b border-slate-100">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Settings2 size={14} className="text-primary" /> Propriétés de l'Élément
                  </span>
                  {selectedToken && (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => handleRemoveToken(selectedTokenIdx)}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50 h-6 w-6"
                      title="Supprimer cet élément du badge"
                    >
                      <Trash2 size={13} />
                    </Button>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3.5">
                {selectedToken ? (
                  <>
                    <div className="p-2.5 rounded-lg bg-primary/5 border border-primary/20">
                      <p className="text-xs font-black text-primary">{selectedTokenConfig?.label}</p>
                      <p className="text-[11px] text-slate-600" dir="rtl">{selectedTokenConfig?.arabicLabel}</p>
                    </div>

                    {/* Font Family (Only for text tokens) */}
                    {!selectedTokenConfig?.isImage && (
                      <div className="space-y-1">
                        <Label className="text-xs font-semibold text-slate-600">Police de caractères :</Label>
                        <select
                          className="w-full text-xs font-medium border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-primary/20"
                          value={selectedToken.fontFamily || 'Cairo'}
                          onChange={(e) => updateSelectedTokenProp('fontFamily', e.target.value)}
                        >
                          {AVAILABLE_FONTS.map(f => (
                            <option key={f.id} value={f.id}>{f.label}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* Font Size & Weight */}
                    {!selectedTokenConfig?.isImage && (
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label className="text-[11px] font-semibold text-slate-500">Taille (px) :</Label>
                          <Input
                            type="number"
                            min="8"
                            max="64"
                            value={selectedToken.fontSize || 14}
                            onChange={(e) => updateSelectedTokenProp('fontSize', Number(e.target.value) || 12)}
                            className="h-8 text-xs font-bold"
                          />
                        </div>

                        <div className="space-y-1">
                          <Label className="text-[11px] font-semibold text-slate-500">Épaisseur :</Label>
                          <select
                            className="w-full text-xs font-medium border border-slate-200 rounded-lg px-2 py-1.5 bg-white"
                            value={selectedToken.fontWeight || 'bold'}
                            onChange={(e) => updateSelectedTokenProp('fontWeight', e.target.value)}
                          >
                            <option value="normal">Normal</option>
                            <option value="600">Demi-Gras</option>
                            <option value="bold">Gras</option>
                            <option value="800">Extra Gras</option>
                          </select>
                        </div>
                      </div>
                    )}

                    {/* Color Picker */}
                    {!selectedTokenConfig?.isImage && (
                      <div className="space-y-1">
                        <Label className="text-xs font-semibold text-slate-600">Couleur du texte :</Label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={selectedToken.color || '#000000'}
                            onChange={(e) => updateSelectedTokenProp('color', e.target.value)}
                            className="w-8 h-8 rounded border border-slate-300 cursor-pointer p-0 bg-transparent"
                          />
                          <Input
                            value={selectedToken.color || '#000000'}
                            onChange={(e) => updateSelectedTokenProp('color', e.target.value)}
                            className="h-8 text-xs font-mono uppercase font-bold"
                          />
                        </div>
                      </div>
                    )}

                    {/* Alignment & Direction (RTL/LTR) */}
                    {!selectedTokenConfig?.isImage && (
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label className="text-[11px] font-semibold text-slate-500">Direction :</Label>
                          <div className="grid grid-cols-2 gap-1">
                            <button
                              type="button"
                              onClick={() => updateSelectedTokenProp('isRtl', true)}
                              className={`py-1 text-xs font-bold rounded border ${
                                selectedToken.isRtl 
                                  ? 'bg-amber-100 border-amber-300 text-amber-900' 
                                  : 'bg-white border-slate-200 text-slate-600'
                              }`}
                            >
                              RTL (عربي)
                            </button>
                            <button
                              type="button"
                              onClick={() => updateSelectedTokenProp('isRtl', false)}
                              className={`py-1 text-xs font-bold rounded border ${
                                !selectedToken.isRtl 
                                  ? 'bg-blue-100 border-blue-300 text-blue-900' 
                                  : 'bg-white border-slate-200 text-slate-600'
                              }`}
                            >
                              LTR (Fr)
                            </button>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <Label className="text-[11px] font-semibold text-slate-500">Alignement :</Label>
                          <select
                            className="w-full text-xs font-medium border border-slate-200 rounded-lg px-2 py-1.5 bg-white"
                            value={selectedToken.align || 'center'}
                            onChange={(e) => updateSelectedTokenProp('align', e.target.value)}
                          >
                            <option value="right">Droite (يمين)</option>
                            <option value="center">Centré (وسط)</option>
                            <option value="left">Gauche (يسار)</option>
                          </select>
                        </div>
                      </div>
                    )}

                    {/* Prefix / Label */}
                    {!selectedTokenConfig?.isImage && (
                      <div className="space-y-1">
                        <Label className="text-xs font-semibold text-slate-600">Préfixe personnalisé :</Label>
                        <Input
                          value={selectedToken.prefix || ''}
                          onChange={(e) => updateSelectedTokenProp('prefix', e.target.value)}
                          placeholder="ex: فندق : ou PASS : "
                          className="h-8 text-xs font-medium"
                        />
                      </div>
                    )}

                    {/* Image Size (For photo token) */}
                    {selectedTokenConfig?.isImage && (
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label className="text-[11px] font-semibold text-slate-500">Largeur (px) :</Label>
                          <Input
                            type="number"
                            value={selectedToken.width || 60}
                            onChange={(e) => updateSelectedTokenProp('width', Number(e.target.value) || 40)}
                            className="h-8 text-xs font-bold"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[11px] font-semibold text-slate-500">Hauteur (px) :</Label>
                          <Input
                            type="number"
                            value={selectedToken.height || 75}
                            onChange={(e) => updateSelectedTokenProp('height', Number(e.target.value) || 50)}
                            className="h-8 text-xs font-bold"
                          />
                        </div>
                      </div>
                    )}

                    {/* Position Sliders */}
                    <div className="space-y-2 pt-2 border-t border-slate-100">
                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px] font-bold text-slate-600">
                          <span>Position Horizontale (X)</span>
                          <span>{selectedToken.xPercent}%</span>
                        </div>
                        <input
                          type="range"
                          min="5"
                          max="95"
                          value={selectedToken.xPercent || 50}
                          onChange={(e) => updateSelectedTokenProp('xPercent', Number(e.target.value))}
                          className="w-full accent-primary"
                        />
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px] font-bold text-slate-600">
                          <span>Position Verticale (Y)</span>
                          <span>{selectedToken.yPercent}%</span>
                        </div>
                        <input
                          type="range"
                          min="5"
                          max="95"
                          value={selectedToken.yPercent || 50}
                          onChange={(e) => updateSelectedTokenProp('yPercent', Number(e.target.value))}
                          className="w-full accent-primary"
                        />
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="py-8 text-center text-slate-400">
                    <Settings2 size={32} className="mx-auto mb-2 opacity-50" />
                    <p className="text-xs font-bold text-slate-600">Aucun élément sélectionné</p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Cliquez sur un texte ou une photo sur le badge pour modifier son style.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Action to Omra Groups */}
            <Card className="shadow-sm border-emerald-200 bg-emerald-50/40">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs">
                  <Printer size={15} /> Prêt à imprimer ?
                </div>
                <p className="text-[11px] text-emerald-700 leading-relaxed">
                  Ouvrez n'importe quel <strong>Groupe Omra</strong> pour imprimer automatiquement les badges de tous les pèlerins avec ce modèle.
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => navigate('/omra')}
                  className="w-full text-xs h-8 bg-white text-emerald-800 border-emerald-300 font-bold hover:bg-emerald-50"
                >
                  Voir les Groupes Omra
                </Button>
              </CardContent>
            </Card>
          </div>

        </div>
      </div>
    </Layout>
  );
}
