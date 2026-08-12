import React, { useState, useRef, useEffect } from 'react';
import { 
  User, Mail, Lock, Shield, Phone, Camera, Save, CheckCircle2, 
  AlertCircle, Loader2, Sparkles, KeyRound, Eye, EyeOff, Trash2, 
  Calendar, Check, ShieldCheck, UserCheck, KanbanSquare, ArrowRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import UserAvatar from '@/components/UserAvatar';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

const Profile = () => {
  const { user, profile, updateProfile, uploadAvatar, updateEmail, updatePassword, isAdmin } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  // Form states
  const [activeTab, setActiveTab] = useState('info'); // 'info' | 'security' | 'activity'
  const [nom, setNom] = useState(profile?.nom || '');
  const [telephone, setTelephone] = useState(profile?.telephone || '');
  const [avatarPreview, setAvatarPreview] = useState(profile?.avatar_url || null);
  
  // Security states
  const [newEmail, setNewEmail] = useState(user?.email || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Loading & status states
  const [savingInfo, setSavingInfo] = useState(false);
  const [savingEmail, setSavingEmail] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  // Agent quote stats
  const [agentStats, setAgentStats] = useState({ totalQuotes: 0, convertedQuotes: 0 });

  useEffect(() => {
    if (profile) {
      setNom(profile.nom || '');
      setTelephone(profile.telephone || '');
      setAvatarPreview(profile.avatar_url || null);
    }
    if (user?.email) {
      setNewEmail(user.email);
    }
    fetchAgentStats();
  }, [profile, user]);

  const fetchAgentStats = async () => {
    if (!user?.id) return;
    try {
      const { data } = await supabase.from('pipeline').select('id, status, details_devis');
      if (data) {
        const myQuotes = data.filter(t => {
          if (!t.details_devis) return false;
          try {
            const meta = JSON.parse(t.details_devis);
            return meta.agent_id === user.id || meta.agent_nom === profile?.nom;
          } catch {
            return false;
          }
        });
        const converted = myQuotes.filter(t => t.status === 'converti_vente' || t.status === 'converti_omra' || t.status === 'termine').length;
        setAgentStats({ totalQuotes: myQuotes.length, convertedQuotes: converted });
      }
    } catch (e) {
      console.warn("Could not load agent stats", e);
    }
  };

  const showNotification = (type, message) => {
    setFeedback({ type, message });
    setTimeout(() => {
      setFeedback({ type: '', message: '' });
    }, 4500);
  };

  // Handle Photo File Selection
  const handlePhotoSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showNotification('error', "Veuillez sélectionner un fichier image valide (JPG, PNG, WebP)");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showNotification('error', "L'image ne doit pas dépasser 5 Mo");
      return;
    }

    setUploadingPhoto(true);
    try {
      const url = await uploadAvatar(file);
      setAvatarPreview(url);
      showNotification('success', "Photo de profil mise à jour avec succès !");
    } catch (err) {
      showNotification('error', "Erreur lors de l'upload : " + err.message);
    } finally {
      setUploadingPhoto(false);
    }
  };

  // Handle Remove Photo
  const handleRemovePhoto = async () => {
    if (window.confirm("Supprimer votre photo de profil ?")) {
      try {
        await updateProfile({ avatar_url: null });
        setAvatarPreview(null);
        showNotification('success', "Photo de profil supprimée");
      } catch (err) {
        showNotification('error', "Erreur : " + err.message);
      }
    }
  };

  // Save General Info
  const handleSaveInfo = async (e) => {
    e.preventDefault();
    if (!nom.trim()) {
      showNotification('error', "Le nom ne peut pas être vide");
      return;
    }

    setSavingInfo(true);
    try {
      await updateProfile({ nom: nom.trim(), telephone: telephone.trim() });
      showNotification('success', "Informations personnelles enregistrées !");
    } catch (err) {
      showNotification('error', "Erreur lors de l'enregistrement : " + err.message);
    } finally {
      setSavingInfo(false);
    }
  };

  // Save Email
  const handleSaveEmail = async (e) => {
    e.preventDefault();
    if (!newEmail.trim() || newEmail.trim() === user?.email) {
      showNotification('error', "Veuillez spécifier une nouvelle adresse email différente");
      return;
    }

    setSavingEmail(true);
    try {
      await updateEmail(newEmail.trim());
      showNotification('success', "Email mis à jour ! Un lien de confirmation peut vous avoir été envoyé.");
    } catch (err) {
      showNotification('error', "Erreur email : " + err.message);
    } finally {
      setSavingEmail(false);
    }
  };

  // Save Password
  const handleSavePassword = async (e) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      showNotification('error', "Le mot de passe doit contenir au moins 6 caractères");
      return;
    }
    if (newPassword !== confirmPassword) {
      showNotification('error', "Les mots de passe ne correspondent pas");
      return;
    }

    setSavingPassword(true);
    try {
      await updatePassword(newPassword);
      setNewPassword('');
      setConfirmPassword('');
      showNotification('success', "Mot de passe modifié avec succès !");
    } catch (err) {
      showNotification('error', "Erreur mot de passe : " + err.message);
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6 pb-12">
        {/* ── Profile Hero Header ─────────────────────────────────────────────── */}
        <div className="relative rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-slate-800 p-6 md:p-8 text-white shadow-xl overflow-hidden">
          {/* Subtle background flare */}
          <div className="absolute -right-16 -top-16 w-64 h-64 bg-primary/20 rounded-full blur-3xl pointer-events-none" />
          
          <div className="relative z-10 flex flex-col sm:flex-row items-center sm:items-start gap-6 text-center sm:text-left">
            {/* Avatar with Upload Trigger */}
            <div className="relative group shrink-0">
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handlePhotoSelect} 
                accept="image/*" 
                className="hidden" 
              />
              
              <UserAvatar 
                user={profile || user} 
                avatarUrl={avatarPreview} 
                name={nom || profile?.nom} 
                size="3xl"
                className="ring-4 ring-white/20 shadow-2xl"
                editable={true}
                onEditClick={() => fileInputRef.current?.click()}
              />

              {uploadingPhoto && (
                <div className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center">
                  <Loader2 className="animate-spin text-white" size={24} />
                </div>
              )}
            </div>

            {/* Profile Meta */}
            <div className="flex-1 min-w-0 space-y-2">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
                <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white">
                  {nom || profile?.nom || 'Mon Profil'}
                </h1>
                {isAdmin ? (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-xs">
                    <ShieldCheck size={13} /> Administrateur
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black bg-blue-500/20 text-blue-300 border border-blue-500/40 shadow-xs">
                    <UserCheck size={13} /> Conseiller Voyages & Omra
                  </span>
                )}
              </div>

              <p className="text-xs md:text-sm text-slate-300 flex items-center justify-center sm:justify-start gap-1.5 font-medium">
                <Mail size={14} className="text-slate-400" />
                <span>{user?.email}</span>
              </p>

              {/* Photo Action Buttons */}
              <div className="flex items-center justify-center sm:justify-start gap-2 pt-2">
                <Button 
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="h-8 text-xs bg-white/10 hover:bg-white/20 text-white border-white/20 font-bold gap-1.5"
                >
                  <Camera size={13} />
                  <span>{avatarPreview ? 'Changer photo' : 'Ajouter photo'}</span>
                </Button>

                {avatarPreview && (
                  <Button 
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={handleRemovePhoto}
                    className="h-8 text-xs text-red-300 hover:text-red-200 hover:bg-red-500/20 font-bold gap-1.5"
                  >
                    <Trash2 size={13} />
                    <span>Supprimer</span>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── Feedback Notification Toast ─────────────────────────────────────── */}
        {feedback.message && (
          <div className={cn(
            "p-3.5 rounded-2xl border text-xs font-bold flex items-center gap-2.5 animate-in fade-in-0 duration-200",
            feedback.type === 'success' 
              ? "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800" 
              : "bg-red-50 text-red-800 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800"
          )}>
            {feedback.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            <span>{feedback.message}</span>
          </div>
        )}

        {/* ── Tabs Navigation ─────────────────────────────────────────────────── */}
        <div className="flex items-center gap-2 bg-muted/60 p-1 rounded-2xl border border-border/80 shadow-2xs max-w-md">
          <button
            type="button"
            onClick={() => setActiveTab('info')}
            className={cn(
              "flex-1 py-2 text-xs font-extrabold rounded-xl flex items-center justify-center gap-2 transition-all duration-200",
              activeTab === 'info' 
                ? "bg-background text-foreground shadow-xs border border-border/60" 
                : "text-muted-foreground hover:text-foreground hover:bg-background/40"
            )}
          >
            <User size={14} className={activeTab === 'info' ? "text-primary" : ""} />
            <span>Informations</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('security')}
            className={cn(
              "flex-1 py-2 text-xs font-extrabold rounded-xl flex items-center justify-center gap-2 transition-all duration-200",
              activeTab === 'security' 
                ? "bg-background text-foreground shadow-xs border border-border/60" 
                : "text-muted-foreground hover:text-foreground hover:bg-background/40"
            )}
          >
            <Lock size={14} className={activeTab === 'security' ? "text-primary" : ""} />
            <span>Sécurité</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('activity')}
            className={cn(
              "flex-1 py-2 text-xs font-extrabold rounded-xl flex items-center justify-center gap-2 transition-all duration-200",
              activeTab === 'activity' 
                ? "bg-background text-foreground shadow-xs border border-border/60" 
                : "text-muted-foreground hover:text-foreground hover:bg-background/40"
            )}
          >
            <Sparkles size={14} className={activeTab === 'activity' ? "text-primary" : ""} />
            <span>Statistiques</span>
          </button>
        </div>

        {/* ── Tab 1: Informations Personnelles ─────────────────────────────────── */}
        {activeTab === 'info' && (
          <div className="bg-card rounded-3xl border border-border/80 p-6 md:p-8 shadow-xs space-y-6">
            <div>
              <h2 className="text-base font-extrabold text-foreground">Coordonnées du Profil</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Mettez à jour vos informations publiques visibles sur les devis et les dossiers clients.
              </p>
            </div>

            <form onSubmit={handleSaveInfo} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Nom */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <User size={13} className="text-primary" /> Nom & Prénom
                  </Label>
                  <Input 
                    value={nom}
                    onChange={e => setNom(e.target.value)}
                    placeholder="Ex: Mohamed Lotfi"
                    className="h-10 text-xs rounded-xl font-medium"
                    required
                  />
                </div>

                {/* Téléphone */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Phone size={13} className="text-emerald-600" /> Numéro de téléphone
                  </Label>
                  <Input 
                    value={telephone}
                    onChange={e => setTelephone(e.target.value)}
                    placeholder="Ex: +213 555 12 34 56"
                    className="h-10 text-xs rounded-xl font-medium"
                  />
                </div>
              </div>

              {/* Rôle & Agence */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div className="p-3.5 rounded-2xl bg-muted/40 border border-border/60 space-y-1">
                  <span className="text-[10px] font-extrabold uppercase text-muted-foreground tracking-wider">Rôle système</span>
                  <p className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Shield size={13} className="text-primary" />
                    <span>{isAdmin ? 'Administrateur Principal' : 'Agent Conseiller de Vente'}</span>
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-muted/40 border border-border/60 space-y-1">
                  <span className="text-[10px] font-extrabold uppercase text-muted-foreground tracking-wider">Agence</span>
                  <p className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <span>🏢</span>
                    <span>Agence El-Mokhtar Voyages & Omra</span>
                  </p>
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-border/60">
                <Button 
                  type="submit" 
                  disabled={savingInfo}
                  className="h-10 px-6 font-extrabold text-xs gap-2 shadow-sm"
                >
                  {savingInfo ? (
                    <>
                      <Loader2 className="animate-spin" size={14} />
                      <span>Enregistrement...</span>
                    </>
                  ) : (
                    <>
                      <Save size={14} />
                      <span>Enregistrer les modifications</span>
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* ── Tab 2: Sécurité & Authentification ───────────────────────────────── */}
        {activeTab === 'security' && (
          <div className="space-y-6">
            {/* Update Email */}
            <div className="bg-card rounded-3xl border border-border/80 p-6 md:p-8 shadow-xs space-y-5">
              <div>
                <h2 className="text-base font-extrabold text-foreground flex items-center gap-2">
                  <Mail size={16} className="text-primary" />
                  <span>Adresse Email de Connexion</span>
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Modifiez l'adresse email associée à votre compte CRM.
                </p>
              </div>

              <form onSubmit={handleSaveEmail} className="space-y-4">
                <div className="space-y-1.5 max-w-md">
                  <Label className="text-xs font-bold text-foreground">Nouvelle adresse email</Label>
                  <Input 
                    type="email"
                    value={newEmail}
                    onChange={e => setNewEmail(e.target.value)}
                    className="h-10 text-xs rounded-xl font-medium"
                    required
                  />
                </div>

                <Button 
                  type="submit" 
                  disabled={savingEmail || newEmail === user?.email}
                  className="h-9 px-5 font-bold text-xs gap-1.5"
                >
                  {savingEmail ? <Loader2 className="animate-spin" size={13} /> : <Save size={13} />}
                  <span>Mettre à jour l'email</span>
                </Button>
              </form>
            </div>

            {/* Update Password */}
            <div className="bg-card rounded-3xl border border-border/80 p-6 md:p-8 shadow-xs space-y-5">
              <div>
                <h2 className="text-base font-extrabold text-foreground flex items-center gap-2">
                  <KeyRound size={16} className="text-amber-600" />
                  <span>Changer le Mot de Passe</span>
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Choisissez un mot de passe sécurisé d'au moins 6 caractères.
                </p>
              </div>

              <form onSubmit={handleSavePassword} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl">
                  {/* Nouveau mot de passe */}
                  <div className="space-y-1.5 relative">
                    <Label className="text-xs font-bold text-foreground">Nouveau mot de passe</Label>
                    <div className="relative">
                      <Input 
                        type={showPassword ? 'text' : 'password'}
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                        placeholder="••••••••"
                        className="h-10 text-xs rounded-xl pr-9 font-medium"
                        required
                        minLength={6}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(p => !p)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </div>

                  {/* Confirmer mot de passe */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-foreground">Confirmer le mot de passe</Label>
                    <Input 
                      type={showPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="h-10 text-xs rounded-xl font-medium"
                      required
                      minLength={6}
                    />
                  </div>
                </div>

                <Button 
                  type="submit" 
                  disabled={savingPassword || !newPassword || !confirmPassword}
                  className="h-9 px-5 font-bold text-xs gap-1.5"
                >
                  {savingPassword ? <Loader2 className="animate-spin" size={13} /> : <Lock size={13} />}
                  <span>Modifier le mot de passe</span>
                </Button>
              </form>
            </div>
          </div>
        )}

        {/* ── Tab 3: Statistiques & Activité Agent ──────────────────────────────── */}
        {activeTab === 'activity' && (
          <div className="bg-card rounded-3xl border border-border/80 p-6 md:p-8 shadow-xs space-y-6">
            <div>
              <h2 className="text-base font-extrabold text-foreground">Activité Commerciale</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Aperçu de vos performances et devis assignés.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-primary/5 border border-primary/20 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-primary">Devis assignés</span>
                  <KanbanSquare size={18} className="text-primary" />
                </div>
                <p className="text-2xl font-black text-foreground">{agentStats.totalQuotes}</p>
                <p className="text-[11px] text-muted-foreground">Demandes de devis gérées par vous</p>
              </div>

              <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300">Ventes Converties</span>
                  <CheckCircle2 size={18} className="text-emerald-600" />
                </div>
                <p className="text-2xl font-black text-emerald-700 dark:text-emerald-300">{agentStats.convertedQuotes}</p>
                <p className="text-[11px] text-muted-foreground">Devis transformés en contrats de vente</p>
              </div>
            </div>

            <div className="pt-2">
              <Button 
                variant="outline" 
                onClick={() => navigate('/pipeline')}
                className="h-10 font-bold text-xs gap-2 rounded-xl"
              >
                <span>Accéder à mes devis dans le Pipeline</span>
                <ArrowRight size={14} />
              </Button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Profile;
