import React, { useState, useEffect } from 'react';
import { 
  Scan, FileText, Receipt, Printer, Folder, FolderOpen, 
  Settings, Plus, Check, Loader2, Sparkles, BadgeCheck, 
  CreditCard, RefreshCw, FileCheck, Sliders, HardDrive, 
  Hash, CheckCircle2, Play, AlertCircle, Globe, History
} from 'lucide-react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import useLocalStorage from '@/hooks/useLocalStorage';
import { supabase } from '@/lib/supabase';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || (typeof window !== 'undefined' ? `http://${window.location.hostname}:3000` : 'http://localhost:3000');

const DEFAULT_CONFIG = {
  globalScanPath: 'D:\\AgencyCRM\\Documents_Scannes',
  printerIp: '192.168.1.11',
  dpi: '300',
  format: 'pdf',
  colorMode: 'color',
  autoCrop: true,
  autoDuplex: false,
  actions: [
    {
      id: 1,
      title: 'Scanner un passeport',
      subtitle: 'Numériser & enregistrer le passeport client',
      icon: 'BadgeCheck',
      active: true,
      folder: 'D:\\AgencyCRM\\Scans\\Passeports',
      naming: 'PASSEPORT_{nom_client}_{date}',
      color: 'from-blue-600 to-indigo-700'
    },
    {
      id: 2,
      title: 'Scanner un reçu de paiement',
      subtitle: 'Numériser un bon ou reçu de caisse',
      icon: 'Receipt',
      active: true,
      folder: 'D:\\AgencyCRM\\Scans\\Recus',
      naming: 'RECU_{reference}_{date}',
      color: 'from-emerald-600 to-teal-700'
    },
    {
      id: 3,
      title: 'Scanner un visa / attestation',
      subtitle: 'Numériser un document de voyage',
      icon: 'FileCheck',
      active: true,
      folder: 'D:\\AgencyCRM\\Scans\\Visas',
      naming: 'VISA_{nom_client}_{date}',
      color: 'from-violet-600 to-purple-700'
    },
    {
      id: 4,
      title: 'Scanner une décharge / contrat',
      subtitle: 'Numériser les contrats & décharges signées',
      icon: 'FileText',
      active: true,
      folder: 'D:\\AgencyCRM\\Scans\\Contrats',
      naming: 'CONTRAT_{reference}_{date}',
      color: 'from-amber-600 to-orange-700'
    },
    { id: 5, title: 'Emplacement Libre #5', subtitle: 'Action rapide non configurée', icon: 'Plus', active: false, folder: 'D:\\AgencyCRM\\Scans\\Dossier_5', naming: 'DOC_05_{date}' },
    { id: 6, title: 'Emplacement Libre #6', subtitle: 'Action rapide non configurée', icon: 'Plus', active: false, folder: 'D:\\AgencyCRM\\Scans\\Dossier_6', naming: 'DOC_06_{date}' },
    { id: 7, title: 'Emplacement Libre #7', subtitle: 'Action rapide non configurée', icon: 'Plus', active: false, folder: 'D:\\AgencyCRM\\Scans\\Dossier_7', naming: 'DOC_07_{date}' },
    { id: 8, title: 'Emplacement Libre #8', subtitle: 'Action rapide non configurée', icon: 'Plus', active: false, folder: 'D:\\AgencyCRM\\Scans\\Dossier_8', naming: 'DOC_08_{date}' },
    { id: 9, title: 'Emplacement Libre #9', subtitle: 'Action rapide non configurée', icon: 'Plus', active: false, folder: 'D:\\AgencyCRM\\Scans\\Dossier_9', naming: 'DOC_09_{date}' },
    { id: 10, title: 'Emplacement Libre #10', subtitle: 'Action rapide non configurée', icon: 'Plus', active: false, folder: 'D:\\AgencyCRM\\Scans\\Dossier_10', naming: 'DOC_10_{date}' },
    { id: 11, title: 'Emplacement Libre #11', subtitle: 'Action rapide non configurée', icon: 'Plus', active: false, folder: 'D:\\AgencyCRM\\Scans\\Dossier_11', naming: 'DOC_11_{date}' },
    { id: 12, title: 'Emplacement Libre #12', subtitle: 'Action rapide non configurée', icon: 'Plus', active: false, folder: 'D:\\AgencyCRM\\Scans\\Dossier_12', naming: 'DOC_12_{date}' }
  ]
};

const Documents = () => {
  const [activeTab, setActiveTab] = useState('actions'); // 'actions' | 'settings' | 'history'
  const [config, setConfig] = useLocalStorage('agencycrm_scan_config', DEFAULT_CONFIG);
  
  // Printers List State
  const [printersList, setPrintersList] = useState([]);

  // Scanning Modal & History State
  const [isScanModalOpen, setIsScanModalOpen] = useState(false);
  const [currentScanningAction, setCurrentScanningAction] = useState(null);
  const [scanStep, setScanStep] = useState('ready'); // 'ready' | 'scanning' | 'done'
  const [scanProgress, setScanProgress] = useState(0);
  const [clientInputName, setClientInputName] = useState('');
  const [generatedFilePath, setGeneratedFilePath] = useState('');

  // Scanned History Data from Supabase
  const [scanHistory, setScanHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Sync settings with Supabase document_scan_settings
  useEffect(() => {
    const loadSettingsFromSupabase = async () => {
      try {
        const { data } = await supabase.from('document_scan_settings').select('*').eq('id', 1).single();
        if (data) {
          setConfig({
            globalScanPath: data.global_scan_path || DEFAULT_CONFIG.globalScanPath,
            printerName: data.printer_ip || '',
            dpi: String(data.dpi || 300),
            format: data.format || 'pdf',
            colorMode: data.color_mode || 'color',
            autoCrop: data.auto_crop ?? true,
            autoDuplex: data.auto_duplex ?? false,
            actions: data.actions || DEFAULT_CONFIG.actions
          });
        }
      } catch (err) {
        console.warn("Utilisation du stockage local pour les paramètres de scan");
      }
    };

    const fetchPrinters = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/printers`);
        const data = await res.json();
        if (data && data.printers) {
          setPrintersList(data.printers);
        }
      } catch (err) {
        console.warn("Erreur chargement des imprimantes", err);
      }
    };

    loadSettingsFromSupabase();
    fetchScanHistory();
    fetchPrinters();
  }, []);

  const fetchScanHistory = async () => {
    setLoadingHistory(true);
    try {
      const { data } = await supabase.from('document_scans').select('*').order('created_at', { ascending: false });
      if (data) setScanHistory(data);
    } catch (err) {
      console.warn("Impossible de charger l'historique des scans depuis Supabase");
    } finally {
      setLoadingHistory(false);
    }
  };

  const saveSettingsToSupabase = async (newConfig) => {
    try {
      await supabase.from('document_scan_settings').upsert({
        id: 1,
        global_scan_path: newConfig.globalScanPath,
        printer_ip: newConfig.printerIp,
        dpi: Number(newConfig.dpi),
        format: newConfig.format,
        color_mode: newConfig.colorMode,
        auto_crop: newConfig.autoCrop,
        autoDuplex: newConfig.autoDuplex,
        actions: newConfig.actions,
        updated_at: new Date().toISOString()
      });
    } catch (err) {
      console.warn("Erreur sauvegarde Supabase settings:", err);
    }
  };

  const handleTestIp = async () => {
    if (!config.printerIp || !config.printerIp.trim()) return;
    setIsTestingIp(true);
    setIpTestResult(null);

    try {
      const res = await fetch(`${BACKEND_URL}/printers/test-ip`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ip: config.printerIp.trim() })
      });
      if (res.ok) {
        const data = await res.json();
        setIpTestResult(data);
      } else {
        setIpTestResult({ success: false, message: 'Erreur lors du test de l\'adresse IP' });
      }
    } catch (err) {
      setIpTestResult({ success: false, message: 'Impossible de joindre le service backend local' });
    } finally {
      setIsTestingIp(false);
    }
  };

  // Function to get Icon component
  const getActionIcon = (iconName) => {
    switch (iconName) {
      case 'BadgeCheck': return BadgeCheck;
      case 'Receipt': return Receipt;
      case 'FileCheck': return FileCheck;
      case 'FileText': return FileText;
      case 'CreditCard': return CreditCard;
      default: return Plus;
    }
  };

  const handleLaunchHardwareScanner = async () => {
    try {
      await fetch(`${BACKEND_URL}/scan/launch-hardware`, { method: 'POST' });
    } catch (err) {
      console.warn("Erreur ouverture assistant scanner:", err);
    }
  };

  const handleOpenKyoceraPanel = async () => {
    try {
      await fetch(`${BACKEND_URL}/scan/launch-kyocera-panel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ip: config.printerIp || '192.168.1.11' })
      });
    } catch (err) {
      console.warn("Erreur ouverture Kyocera Command Center:", err);
    }
  };

  const handleStartScan = (action) => {
    setCurrentScanningAction(action);
    setScanStep('ready');
    setScanProgress(0);
    setClientInputName('');
    setIsScanModalOpen(true);
  };

  const buildFileName = () => {
    const nowStr = new Date().toISOString().slice(0, 10);
    const safeClient = (clientInputName || 'CLIENT').toUpperCase().replace(/\s+/g, '_');
    const baseFileName = currentScanningAction.naming
      .replace('{nom_client}', safeClient)
      .replace('{date}', nowStr)
      .replace('{reference}', 'REF-' + Math.floor(1000 + Math.random() * 9000));
    return `${baseFileName}.${config.format}`;
  };

  const saveToSupabase = async (fileNameWithExt, filePath) => {
    try {
      await supabase.from('document_scans').insert([{
        action_id: currentScanningAction.id,
        action_title: currentScanningAction.title,
        client_nom: clientInputName || null,
        file_name: fileNameWithExt,
        file_path: filePath,
        format: config.format,
        dpi: Number(config.dpi),
        printer_ip: config.printerIp || null
      }]);
      fetchScanHistory();
    } catch (subErr) {
      console.warn("Erreur Supabase:", subErr);
    }
  };

  const executeScanning = async () => {
    setScanStep('scanning');
    setScanProgress(20);
    const fileNameWithExt = buildFileName();

    try {
      // 1. Ouvrir l'outil de scan Windows (wiaacmgr.exe)
      await handleLaunchHardwareScanner();
      setScanProgress(30);

      // 2. Ouvrir le dossier de réception pour que l'utilisateur puisse y sauvegarder
      await handleOpenFolder(currentScanningAction?.folder);
      setScanProgress(50);

      // 3. Surveiller le dossier pour l'arrivée du nouveau fichier scanné
      const response = await fetch(`${BACKEND_URL}/scan/watch-folder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          folder: currentScanningAction.folder,
          fileName: fileNameWithExt,
          format: config.format || 'pdf'
        })
      });
      
      const data = await response.json();
      
      if (data && data.success) {
        setGeneratedFilePath(data.filePath);
        await saveToSupabase(fileNameWithExt, data.filePath);
        setScanProgress(100);
        setScanStep('done');
      } else {
        setGeneratedFilePath('');
        setScanProgress(100);
        setScanStep('timeout');
      }
    } catch (err) {
      console.error("Erreur scan:", err);
      setScanProgress(100);
      setScanStep('timeout');
    }
  };

  // Mode 2: Scan Kyocera réseau — ouvre le panneau web + surveille le dossier de réception
  const executeKyoceraScan = async () => {
    setScanStep('scanning');
    setScanProgress(10);
    const fileNameWithExt = buildFileName();

    // 1. Ouvrir le panneau Kyocera Command Center dans le navigateur
    await handleOpenKyoceraPanel();
    setScanProgress(20);

    // 2. Ouvrir le dossier de réception en parallèle
    await handleOpenFolder(currentScanningAction?.folder);
    setScanProgress(30);

    // 3. Surveiller le dossier pour un nouveau fichier (le Kyocera y envoie le scan)
    try {
      const response = await fetch(`${BACKEND_URL}/scan/watch-folder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          folder: currentScanningAction.folder,
          fileName: fileNameWithExt,
          format: config.format || 'pdf'
        })
      });
      const data = await response.json();

      if (data && data.success) {
        setGeneratedFilePath(data.filePath);
        await saveToSupabase(fileNameWithExt, data.filePath);
        setScanProgress(100);
        setScanStep('done');
      } else {
        // Timeout — scan pas reçu dans les 60s
        setGeneratedFilePath('');
        setScanProgress(100);
        setScanStep('timeout');
      }
    } catch (err) {
      console.error("Erreur watch scan:", err);
      setScanProgress(100);
      setScanStep('timeout');
    }
  };

  const handleOpenFolder = async (targetFilePath) => {
    try {
      await fetch(`${BACKEND_URL}/open-folder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath: targetFilePath || generatedFilePath })
      });
    } catch (err) {
      console.warn("Impossible d'ouvrir l'explorateur Windows:", err);
    }
  };

  const updateActionConfig = (id, field, value) => {
    const updatedActions = config.actions.map(act => {
      if (act.id === id) {
        return { ...act, [field]: value };
      }
      return act;
    });
    const newConfig = { ...config, actions: updatedActions };
    setConfig(newConfig);
    saveSettingsToSupabase(newConfig);
  };

  const updateGlobalSetting = (field, value) => {
    const newConfig = { ...config, [field]: value };
    setConfig(newConfig);
    saveSettingsToSupabase(newConfig);
  };

  return (
    <Layout>
      <div className="space-y-6 pb-12">
        {/* Header Title */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-900 text-white p-6 rounded-2xl shadow-xl border border-indigo-800/40">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="p-2.5 rounded-xl bg-white/10 text-blue-300 backdrop-blur-md">
                <Scan size={26} />
              </div>
              <div>
                <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
                  Documents & Numérisation
                </h1>
                <p className="text-xs text-blue-200">
                  Numérisation réseau par adresse IP et gestion du stockage Supabase & PC local
                </p>
              </div>
            </div>
          </div>

          {/* Scanner Device Badge */}
          <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/10 text-xs shrink-0">
            <Globe size={18} className="text-emerald-400 animate-pulse" />
            <div>
              <span className="text-[10px] text-slate-300 uppercase font-bold block">IP Scanner Réseau</span>
              <span className="font-mono font-extrabold text-white truncate max-w-[200px] block">
                {config.printerIp ? config.printerIp : "Non configurée"}
              </span>
            </div>
          </div>
        </div>

        {/* Custom Tabs Navigation */}
        <div className="flex border-b border-border gap-2">
          <button
            onClick={() => setActiveTab('actions')}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-bold border-b-2 transition-all ${
              activeTab === 'actions'
                ? 'border-primary text-primary bg-primary/5 rounded-t-lg'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/30 rounded-t-lg'
            }`}
          >
            <Play size={16} />
            <span>Actions Rapides (Numérisation)</span>
            <Badge variant="secondary" className="ml-1 text-[10px] bg-primary/20 text-primary border-primary/30">
              12 emplacements (4×3)
            </Badge>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-bold border-b-2 transition-all ${
              activeTab === 'settings'
                ? 'border-primary text-primary bg-primary/5 rounded-t-lg'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/30 rounded-t-lg'
            }`}
          >
            <Settings size={16} />
            <span>Configuration Adresse IP & Dossiers</span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-bold border-b-2 transition-all ${
              activeTab === 'history'
                ? 'border-primary text-primary bg-primary/5 rounded-t-lg'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/30 rounded-t-lg'
            }`}
          >
            <History size={16} />
            <span>Historique Supabase ({scanHistory.length})</span>
          </button>
        </div>

        {/* ── TAB 1 : ACTIONS RAPIDES (GRILLE 4x3) ── */}
        {activeTab === 'actions' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                <Sparkles size={16} className="text-amber-500" />
                Grille des Boutons de Scan Rapide (4 × 3)
              </h2>
              <span className="text-xs text-muted-foreground">
                IP Cible : <b className="font-mono text-foreground">{config.printerIp || '—'}</b>
              </span>
            </div>

            {/* 4x3 Large Buttons Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {config.actions.map((action, index) => {
                const IconComponent = getActionIcon(action.icon);
                const isConfigured = action.active;

                return (
                  <Card
                    key={action.id}
                    className={`relative overflow-hidden transition-all duration-200 hover:shadow-lg border group ${
                      isConfigured 
                        ? 'bg-card border-border hover:border-primary/50' 
                        : 'bg-muted/20 border-dashed border-slate-300 opacity-75 hover:opacity-100'
                    }`}
                  >
                    {/* Badge Slot Number */}
                    <div className="absolute top-3 right-3 text-[10px] font-mono font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded border">
                      #{index + 1}
                    </div>

                    <CardContent className="p-5 flex flex-col h-full justify-between space-y-4">
                      <div className="space-y-3">
                        {/* Icon Header */}
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-md bg-gradient-to-br ${action.color || 'from-slate-600 to-slate-800'}`}>
                          <IconComponent size={24} />
                        </div>

                        <div>
                          <h3 className="font-extrabold text-slate-900 text-base leading-snug group-hover:text-primary transition-colors">
                            {action.title}
                          </h3>
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {action.subtitle}
                          </p>
                        </div>
                      </div>

                      {/* Folder Target Info */}
                      <div className="pt-2 border-t border-border/60 text-[11px] space-y-1">
                        <div className="flex items-center gap-1.5 text-slate-600 font-medium truncate" title={action.folder}>
                          <FolderOpen size={13} className="text-amber-500 shrink-0" />
                          <span className="truncate">{action.folder}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-500 font-mono text-[10px] truncate" title={action.naming}>
                          <Hash size={12} className="text-blue-500 shrink-0" />
                          <span className="truncate">{action.naming}</span>
                        </div>
                      </div>

                      {/* Action Button */}
                      {isConfigured ? (
                        <Button
                          onClick={() => handleStartScan(action)}
                          className="w-full bg-slate-900 hover:bg-primary text-white font-bold gap-2 text-xs shadow-md transition-all h-10 mt-2"
                        >
                          <Scan size={15} />
                          <span>Lancer le Scan</span>
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          onClick={() => setActiveTab('settings')}
                          className="w-full border-dashed text-xs text-muted-foreground hover:text-foreground gap-2 h-10 mt-2"
                        >
                          <Plus size={14} />
                          <span>Activer dans l'Onglet 2</span>
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* ── TAB 2 : CONFIGURATION & PARAMÈTRES ── */}
        {activeTab === 'settings' && (
          <div className="space-y-8">
            {/* 1. ADRESSE IP RÉSEAU ET OPTIONS DE SCAN */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Card Scanner IP Config */}
              <Card className="shadow-md border-primary/20 lg:col-span-2">
                <CardHeader className="bg-muted/30 pb-3 border-b">
                  <CardTitle className="text-base font-bold flex items-center gap-2 text-slate-900">
                    <Globe size={18} className="text-blue-600" />
                    1. Configuration Adresse IP du Scanner Réseau
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-5">
                  {/* Adresse IP unique */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-800 block">
                        Imprimante / Scanner par défaut :
                      </label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => window.location.reload()}
                        className="h-7 text-[11px] gap-1.5 font-bold text-slate-500 hover:text-slate-800"
                      >
                        <RefreshCw size={13} />
                        <span>Actualiser la liste</span>
                      </Button>
                    </div>

                    <select
                      value={config.printerName || ''}
                      onChange={(e) => updateGlobalSetting('printerName', e.target.value)}
                      className="w-full text-xs font-semibold p-3 rounded-lg border border-blue-200 bg-white text-blue-900 focus:ring-2 focus:ring-blue-600 outline-none shadow-sm"
                    >
                      <option value="">-- Sélectionnez une imprimante --</option>
                      {printersList.map((printer, index) => (
                        <option key={index} value={printer}>
                          {printer}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700 block">Résolution d'acquisition (DPI) :</label>
                      <select
                        value={config.dpi}
                        onChange={(e) => updateGlobalSetting('dpi', e.target.value)}
                        className="w-full text-xs font-semibold p-2.5 rounded-lg border border-input bg-background focus:ring-2 focus:ring-primary outline-none"
                      >
                        <option value="150">150 DPI (Brouillon rapide)</option>
                        <option value="300">300 DPI (Recommandé / Standard)</option>
                        <option value="600">600 DPI (Haute Définition)</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700 block">Format de fichier de sortie :</label>
                      <select
                        value={config.format}
                        onChange={(e) => updateGlobalSetting('format', e.target.value)}
                        className="w-full text-xs font-semibold p-2.5 rounded-lg border border-input bg-background focus:ring-2 focus:ring-primary outline-none"
                      >
                        <option value="pdf">PDF Multipage (.pdf)</option>
                        <option value="png">Image PNG (.png)</option>
                        <option value="jpg">Image JPEG (.jpg)</option>
                      </select>
                    </div>
                  </div>

                  <div className="pt-3 border-t flex flex-wrap gap-6 text-xs font-medium text-slate-700">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={config.autoCrop}
                        onChange={(e) => updateGlobalSetting('autoCrop', e.target.checked)}
                        className="rounded border-gray-300 text-primary focus:ring-primary"
                      />
                      <span>Rognage et cadrage automatique des bords</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={config.autoDuplex}
                        onChange={(e) => updateGlobalSetting('autoDuplex', e.target.checked)}
                        className="rounded border-gray-300 text-primary focus:ring-primary"
                      />
                      <span>Recto/Verso automatique (Duplex)</span>
                    </label>
                  </div>
                </CardContent>
              </Card>

              {/* Global Folder Card */}
              <Card className="shadow-md">
                <CardHeader className="bg-muted/30 pb-3 border-b">
                  <CardTitle className="text-base font-bold flex items-center gap-2 text-slate-900">
                    <HardDrive size={18} className="text-amber-600" />
                    Dossier Racine Global
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 block">Emplacement Racine PC :</label>
                    <Input
                      value={config.globalScanPath}
                      onChange={(e) => updateGlobalSetting('globalScanPath', e.target.value)}
                      className="text-xs font-mono"
                    />
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Les sous-dossiers de chaque bouton seront créés dans ce répertoire.
                    </p>
                  </div>

                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-950 text-xs space-y-1">
                    <span className="font-bold block flex items-center gap-1.5 text-emerald-800">
                      <Sparkles size={14} className="text-emerald-600 shrink-0" />
                      Adaptation multi-postes (D:\ vs Z:\) :
                    </span>
                    <p className="text-[11px] leading-relaxed text-emerald-900">
                      Si votre disque HDD externe est sur <b>D:\</b> sur votre PC principal et sur <b>Z:\</b> sur les autres PC de l'agence, le backend redirige <b>automatiquement</b> le chemin vers la bonne lettre de disque disponible sur chaque machine !
                    </p>
                  </div>

                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-900 text-xs space-y-1">
                    <span className="font-bold block flex items-center gap-1">
                      <CheckCircle2 size={14} className="text-blue-600 shrink-0" /> Synchronisation Supabase :
                    </span>
                    <p className="text-[11px]">
                      Toutes les modifications de cette configuration sont synchronisées dans votre base de données Supabase.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* 2. CONFIGURATION PAR BOUTON D'ACTION (DOSSIER LOCAL & NOM) */}
            <Card className="shadow-md">
              <CardHeader className="bg-muted/30 pb-3 border-b flex flex-row items-center justify-between">
                <CardTitle className="text-base font-bold flex items-center gap-2 text-slate-900">
                  <Sliders size={18} className="text-violet-600" />
                  2. Personnalisation des 12 Boutons (Dossiers Locaux & Noms de Fichiers)
                </CardTitle>
                <Badge variant="outline" className="text-xs">12 Emplacements</Badge>
              </CardHeader>

              <CardContent className="p-6">
                <div className="space-y-6">
                  {/* Helper tag chips */}
                  <div className="bg-slate-50 border rounded-xl p-3.5 space-y-2">
                    <span className="text-xs font-bold text-slate-700 block">
                      Variables dynamiques utilisables pour les noms de fichiers :
                    </span>
                    <div className="flex flex-wrap gap-2 text-xs">
                      <span className="bg-white border text-blue-800 font-mono font-bold px-2 py-1 rounded shadow-sm">
                        {"{nom_client}"}
                      </span>
                      <span className="bg-white border text-emerald-800 font-mono font-bold px-2 py-1 rounded shadow-sm">
                        {"{date}"}
                      </span>
                      <span className="bg-white border text-purple-800 font-mono font-bold px-2 py-1 rounded shadow-sm">
                        {"{reference}"}
                      </span>
                      <span className="bg-white border text-amber-800 font-mono font-bold px-2 py-1 rounded shadow-sm">
                        {"{heure}"}
                      </span>
                    </div>
                  </div>

                  {/* Config Table for 12 buttons */}
                  <div className="overflow-x-auto border rounded-xl">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-muted/50 text-muted-foreground uppercase font-bold border-b">
                        <tr>
                          <th className="px-4 py-3 w-12 text-center">Slot</th>
                          <th className="px-4 py-3 w-56">Titre du Bouton</th>
                          <th className="px-4 py-3">Dossier Local d'Enregistrement sur PC</th>
                          <th className="px-4 py-3">Modèle du Nom de Fichier Scanné</th>
                          <th className="px-4 py-3 text-center w-24">Actif</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {config.actions.map((act) => (
                          <tr key={act.id} className="hover:bg-muted/20">
                            <td className="px-4 py-3 font-mono text-center font-bold text-slate-500">
                              #{act.id}
                            </td>

                            <td className="px-4 py-3">
                              <Input
                                value={act.title}
                                onChange={(e) => updateActionConfig(act.id, 'title', e.target.value)}
                                className="text-xs font-bold h-8"
                              />
                            </td>

                            <td className="px-4 py-3">
                              <div className="flex gap-2 items-center">
                                <Folder className="text-amber-500 shrink-0" size={16} />
                                <Input
                                  value={act.folder}
                                  onChange={(e) => updateActionConfig(act.id, 'folder', e.target.value)}
                                  className="text-xs font-mono h-8"
                                />
                              </div>
                            </td>

                            <td className="px-4 py-3">
                              <div className="flex gap-2 items-center">
                                <Hash className="text-blue-500 shrink-0" size={15} />
                                <Input
                                  value={act.naming}
                                  onChange={(e) => updateActionConfig(act.id, 'naming', e.target.value)}
                                  className="text-xs font-mono h-8"
                                />
                              </div>
                            </td>

                            <td className="px-4 py-3 text-center">
                              <input
                                type="checkbox"
                                checked={act.active}
                                onChange={(e) => updateActionConfig(act.id, 'active', e.target.checked)}
                                className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ── TAB 3 : HISTORIQUE SUPABASE ── */}
        {activeTab === 'history' && (
          <Card className="shadow-md">
            <CardHeader className="bg-muted/30 py-4 border-b flex flex-row items-center justify-between">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <History size={18} className="text-primary" />
                Historique des Documents Numérisés (Supabase)
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchScanHistory}
                disabled={loadingHistory}
                className="gap-1.5 text-xs font-semibold"
              >
                <RefreshCw size={13} className={loadingHistory ? "animate-spin" : ""} />
                Actualiser
              </Button>
            </CardHeader>

            <CardContent className="p-0">
              {loadingHistory ? (
                <div className="py-12 text-center text-muted-foreground flex items-center justify-center gap-2 text-xs">
                  <Loader2 size={18} className="animate-spin text-primary" /> Chargement de l'historique...
                </div>
              ) : scanHistory.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground italic text-xs">
                  Aucun document numérisé enregistré pour le moment.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-muted/50 text-muted-foreground uppercase font-bold border-b">
                      <tr>
                        <th className="px-4 py-3">Date & Heure</th>
                        <th className="px-4 py-3">Action</th>
                        <th className="px-4 py-3">Client</th>
                        <th className="px-4 py-3">Nom du Fichier</th>
                        <th className="px-4 py-3">Chemin d'accès PC</th>
                        <th className="px-4 py-3">IP Scanner</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {scanHistory.map((scan) => (
                        <tr key={scan.id} className="hover:bg-muted/20">
                          <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                            {new Date(scan.created_at).toLocaleString('fr-FR')}
                          </td>
                          <td className="px-4 py-3 font-bold text-foreground">{scan.action_title}</td>
                          <td className="px-4 py-3 font-medium text-blue-700">{scan.client_nom || '—'}</td>
                          <td className="px-4 py-3 font-mono font-bold text-slate-800">{scan.file_name}</td>
                          <td className="px-4 py-3 font-mono text-[11px] text-slate-600 truncate max-w-[220px]" title={scan.file_path}>
                            {scan.file_path}
                          </td>
                          <td className="px-4 py-3 font-mono text-emerald-700 font-bold">{scan.printer_ip || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* ── MODAL SIMULATION NUMÉRISATION ── */}
        <Dialog open={isScanModalOpen} onOpenChange={setIsScanModalOpen}>
          <DialogContent className="max-w-md p-6">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold flex items-center gap-2">
                <Scan className="text-primary" size={20} />
                {currentScanningAction?.title}
              </DialogTitle>
              <DialogDescription className="text-xs">
                Scanner : <b className="font-mono">{config.printerName || 'Par défaut'}</b> ({config.dpi} DPI - {config.format.toUpperCase()})
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 pt-3">
              {scanStep === 'ready' && (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 block">
                      Nom / Identifiant du Client (pour le fichier) :
                    </label>
                    <Input
                      placeholder="ex: Benali Mohamed"
                      value={clientInputName}
                      onChange={(e) => setClientInputName(e.target.value)}
                      className="text-xs"
                    />
                  </div>

                  <div className="bg-slate-50 border rounded-lg p-3 text-xs space-y-1 text-slate-700">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Dossier cible :</span>
                      <span className="font-mono font-bold truncate max-w-[200px]">{currentScanningAction?.folder}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Nom généré :</span>
                      <span className="font-mono font-bold">{currentScanningAction?.naming}</span>
                    </div>
                  </div>

                  <div className="space-y-2 pt-2">
                    <Button
                      onClick={executeScanning}
                      className="w-full bg-slate-900 hover:bg-primary text-white font-bold gap-2 text-xs h-11 shadow-lg"
                    >
                      <Scan size={16} />
                      <span>Scanner</span>
                    </Button>
                  </div>
                </div>
              )}

              {scanStep === 'scanning' && (
                <div className="py-6 text-center space-y-4">
                  <div className="w-16 h-16 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center mx-auto">
                    <Loader2 size={32} className="animate-spin" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">En attente du scan Kyocera...</h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      Lancez le scan depuis le panneau Kyocera ({config.printerIp}) ou depuis l'écran tactile de votre imprimante.
                      <br />Le fichier sera automatiquement détecté dans le dossier de réception.
                    </p>
                  </div>
                  <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden border">
                    <div
                      className="bg-gradient-to-r from-blue-500 to-indigo-600 h-full transition-all duration-500 animate-pulse"
                      style={{ width: `${scanProgress}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground">Surveillance du dossier en cours (max 60 secondes)...</p>
                </div>
              )}

              {scanStep === 'timeout' && (
                <div className="py-4 space-y-4">
                  <div className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl">
                    <AlertCircle size={24} className="text-amber-600 shrink-0" />
                    <div>
                      <h4 className="font-bold text-xs">Aucun fichier reçu dans les 60 secondes</h4>
                      <p className="text-[11px] text-amber-800 mt-1">
                        Vérifiez que le scan a bien été lancé depuis votre Kyocera (panneau tactile ou Command Center web).
                        Le fichier doit être envoyé vers le dossier partagé configuré.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button
                      onClick={() => setScanStep('ready')}
                      className="flex-1 bg-primary text-white font-bold gap-2 text-xs h-9"
                    >
                      Réessayer
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleOpenFolder(currentScanningAction?.folder)}
                      className="flex-1 text-xs font-bold gap-1.5 h-9"
                    >
                      <FolderOpen size={14} />
                      Ouvrir le dossier
                    </Button>
                  </div>
                </div>
              )}

              {scanStep === 'done' && (
                <div className="py-4 space-y-4">
                  <div className="flex items-center gap-3 p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl">
                    <CheckCircle2 size={24} className="text-emerald-600 shrink-0" />
                    <div>
                      <h4 className="font-bold text-xs">Document Numérisé avec Succès !</h4>
                      <p className="text-[11px] text-emerald-800">Enregistré dans le dossier PC local et sur Supabase.</p>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-900 text-white rounded-xl text-xs font-mono space-y-1 overflow-x-auto">
                    <span className="text-slate-400 text-[10px] uppercase font-bold block">Chemin d'accès local :</span>
                    <span className="text-emerald-400 font-bold block break-all">{generatedFilePath}</span>
                  </div>

                  <div className="flex flex-col gap-2 pt-2">
                    <Button
                      onClick={() => handleOpenFolder(generatedFilePath)}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-2 text-xs h-10 shadow-md"
                    >
                      <FolderOpen size={16} />
                      <span>Ouvrir l'emplacement du fichier sur PC</span>
                    </Button>

                    <Button
                      variant="outline"
                      onClick={() => setIsScanModalOpen(false)}
                      className="w-full text-xs font-bold"
                    >
                      Fermer
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default Documents;
