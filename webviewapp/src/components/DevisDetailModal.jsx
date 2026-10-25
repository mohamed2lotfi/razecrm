import React, { useState, useRef } from 'react';
import { 
  X, Send, Camera, Image as ImageIcon, Trash2, CheckCircle2, 
  Calendar, MapPin, User, Clock, AlertCircle, Loader2, Sparkles,
  ZoomIn, ExternalLink, MessageSquare
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

const DevisDetailModal = ({ isOpen, onClose, devis, onSaved }) => {
  if (!isOpen || !devis) return null;

  const { profile } = useAuth();
  const [reponseTexte, setReponseTexte] = useState(devis.reponse_texte || '');
  const [photoPreview, setPhotoPreview] = useState(devis.reponse_photo_url || null);
  const [photoFile, setPhotoFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [showFullPhoto, setShowFullPhoto] = useState(false);

  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  // Quick suggestions for manager response
  const quickResponses = [
    "✅ Tarif disponible : ",
    "✈️ Vol confirmé, en attente hôtel.",
    "🏨 Hôtels 5★ sélectionnés : ",
    "⚠️ Période haute saison, tarif ajusté.",
  ];

  const handleSelectQuick = (txt) => {
    setReponseTexte((prev) => (prev ? `${prev}\n${txt}` : txt));
  };

  // Format dates
  const formatDate = (dStr) => {
    if (!dStr) return '-';
    try {
      return new Date(dStr).toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return dStr;
    }
  };

  // Handle Photo selection from camera or gallery
  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMsg('Veuillez sélectionner un fichier image valide.');
      return;
    }

    setPhotoFile(file);
    const reader = new FileReader();
    reader.onload = (event) => {
      setPhotoPreview(event.target.result);
      setErrorMsg(null);
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = () => {
    setPhotoPreview(null);
    setPhotoFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  // Upload photo to Supabase storage with fallback
  const uploadPhotoToSupabase = async (file) => {
    try {
      const fileExt = file.name ? file.name.split('.').pop() : 'jpg';
      const fileName = `reponse_${devis.id}_${Date.now()}.${fileExt}`;
      const filePath = `responses/${fileName}`;

      const { data, error } = await supabase.storage
        .from('manager_devis_photos')
        .upload(filePath, file, { upsert: true });

      if (error) {
        console.warn('Storage upload warning, fallback to data url:', error);
        return photoPreview; // fallback to base64 preview
      }

      const { data: publicUrlData } = supabase.storage
        .from('manager_devis_photos')
        .getPublicUrl(filePath);

      return publicUrlData?.publicUrl || photoPreview;
    } catch (err) {
      console.warn('Upload error, using fallback:', err);
      return photoPreview;
    }
  };

  // Save Response
  const handleSubmitResponse = async () => {
    if (!reponseTexte.trim() && !photoPreview && !photoFile) {
      setErrorMsg('Veuillez écrire un message ou joindre une photo pour répondre.');
      return;
    }

    setIsSaving(true);
    setErrorMsg(null);

    try {
      let finalPhotoUrl = devis.reponse_photo_url || null;

      if (photoFile) {
        setIsUploading(true);
        finalPhotoUrl = await uploadPhotoToSupabase(photoFile);
        setIsUploading(false);
      } else if (!photoPreview) {
        finalPhotoUrl = null;
      }

      const managerName = profile?.nom || profile?.email || 'Manager';
      const now = new Date().toISOString();

      const updatePayload = {
        reponse_texte: reponseTexte.trim(),
        reponse_photo_url: finalPhotoUrl,
        reponse_date: now,
        reponse_manager_nom: managerName,
        manager_id: profile?.id || devis.manager_id,
        manager_nom: managerName,
        status: 'repondu',
        updated_at: now
      };

      // 1. Update in manager_devis table
      const { error: devisError } = await supabase
        .from('manager_devis')
        .update(updatePayload)
        .eq('id', devis.id);

      if (devisError) {
        console.warn('Update manager_devis error:', devisError);
      }

      // 2. Also sync to pipeline table if pipeline_id exists
      if (devis.pipeline_id) {
        try {
          const { data: pipeData } = await supabase
            .from('pipeline')
            .select('details_devis')
            .eq('id', devis.pipeline_id)
            .single();

          let detailsObj = {};
          if (pipeData?.details_devis && pipeData.details_devis.trim().startsWith('{')) {
            try {
              detailsObj = JSON.parse(pipeData.details_devis);
            } catch (e) {}
          }

          detailsObj.manager_response = {
            manager_nom: managerName,
            manager_id: profile?.id,
            reponse_texte: reponseTexte.trim(),
            reponse_photo_url: finalPhotoUrl,
            reponse_date: now,
            status: 'repondu'
          };

          // Also append to remarques if helpful
          if (!Array.isArray(detailsObj.remarques)) detailsObj.remarques = [];
          detailsObj.remarques.unshift({
            id: `mgr_resp_${Date.now()}`,
            auteur_nom: `Manager (${managerName})`,
            auteur_role: 'manager',
            texte: `Réponse au devis : ${reponseTexte.trim()} ${finalPhotoUrl ? '[Photo jointe]' : ''}`,
            created_at: now
          });

          await supabase
            .from('pipeline')
            .update({ details_devis: JSON.stringify(detailsObj) })
            .eq('id', devis.pipeline_id);
        } catch (pipeErr) {
          console.warn('Sync to pipeline warning:', pipeErr);
        }
      }

      if (onSaved) {
        onSaved({
          ...devis,
          ...updatePayload
        });
      }
      onClose();
    } catch (err) {
      console.error('Error submitting response:', err);
      setErrorMsg('Erreur lors de l\'enregistrement de votre réponse. Réessayez.');
    } finally {
      setIsSaving(false);
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      {/* Modal / Bottom Sheet Box */}
      <div className="w-full max-w-md mx-auto bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700/80 rounded-t-3xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden pb-[env(safe-area-inset-bottom,16px)]">
        
        {/* Handle bar & Header */}
        <div className="pt-3 px-4 pb-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xl">{devis.destination_emoji || '✈️'}</span>
            <div>
              <h2 className="text-sm font-extrabold text-slate-900 dark:text-white truncate max-w-[220px]">
                {devis.destination || 'Détails du Devis'}
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Envoyé par <span className="text-emerald-600 dark:text-emerald-400 font-bold">{devis.agent_nom || 'Agent'}</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white flex items-center justify-center transition-all"
          >
            <X size={16} />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          
          {/* Section 1: Customer Demande & Information Card */}
          <div className="bg-slate-50 dark:bg-slate-950/70 rounded-2xl p-3.5 border border-slate-200/80 dark:border-slate-800/80 space-y-3">
            <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-200 dark:border-slate-800/60">
              <span className="text-slate-500 dark:text-slate-400 font-semibold">Client</span>
              <span className="font-extrabold text-slate-900 dark:text-white text-sm">
                {devis.client_nom || 'Client non spécifié'}
              </span>
            </div>

            {/* Travel Dates */}
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                <Calendar size={13} className="text-emerald-500 shrink-0" />
                <span>Dates :</span>
              </div>
              <span className="font-bold text-slate-800 dark:text-slate-200">
                {formatDate(devis.date_depart)} ➔ {formatDate(devis.date_retour)}
              </span>
            </div>

            {/* Demand Description */}
            <div className="pt-1">
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider block mb-1">
                Description de la demande client :
              </span>
              <div className="text-xs text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-900/90 p-3 rounded-xl border border-slate-200 dark:border-slate-800 leading-relaxed whitespace-pre-line shadow-2xs">
                {devis.description_demande || 'Aucune description détaillée.'}
              </div>
            </div>

            {/* Internal agent notes if any */}
            {devis.notes_agent && (
              <div className="pt-1">
                <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold uppercase tracking-wider block mb-1">
                  Note de l'agent :
                </span>
                <p className="text-xs text-amber-900 dark:text-amber-200/90 bg-amber-50 dark:bg-amber-950/30 p-2.5 rounded-xl border border-amber-200 dark:border-amber-500/20">
                  {devis.notes_agent}
                </p>
              </div>
            )}
          </div>

          {/* Section 2: Manager Response Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                <Sparkles size={14} /> Votre Réponse (Texte ou Photo)
              </label>
              {devis.status === 'repondu' && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                  Déjà répondu
                </span>
              )}
            </div>

            {/* Quick response suggestions */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
              {quickResponses.map((qr, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectQuick(qr)}
                  className="shrink-0 text-[10px] font-medium px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700/80 active:scale-95 transition-all shadow-2xs"
                >
                  {qr}
                </button>
              ))}
            </div>

            {/* Textarea for written response */}
            <textarea
              value={reponseTexte}
              onChange={(e) => setReponseTexte(e.target.value)}
              placeholder="Écrivez votre réponse pour l'agent (tarifs, options d'hôtels, horaires de vols, remarques...)"
              rows={4}
              className="w-full bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-xs p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700/80 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 leading-relaxed placeholder:text-slate-400 dark:placeholder:text-slate-500 resize-none shadow-xs"
            />

            {/* Photo / Screenshot Response Section */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                  <ImageIcon size={13} className="text-emerald-500" />
                  Répondre par une photo / capture :
                </span>
                {photoPreview && (
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    className="text-[11px] font-bold text-red-500 hover:text-red-400 flex items-center gap-1"
                  >
                    <Trash2 size={12} /> Supprimer
                  </button>
                )}
              </div>

              {/* Photo Preview if attached */}
              {photoPreview ? (
                <div className="relative rounded-2xl overflow-hidden border border-emerald-500/40 bg-slate-100 dark:bg-slate-950 max-h-48 flex items-center justify-center group shadow-sm">
                  <img
                    src={photoPreview}
                    alt="Aperçu photo réponse"
                    className="w-full h-48 object-cover cursor-pointer"
                    onClick={() => setShowFullPhoto(true)}
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 pointer-events-none">
                    <span className="text-white text-xs font-bold flex items-center gap-1 bg-black/60 px-2.5 py-1 rounded-full">
                      <ZoomIn size={12} /> Agrandir
                    </span>
                  </div>
                </div>
              ) : (
                /* Photo Actions: Camera + Gallery */
                <div className="grid grid-cols-2 gap-2">
                  {/* Camera Button (Native Camera trigger) */}
                  <button
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
                    className="flex items-center justify-center gap-2 py-3 px-3 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/90 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold active:scale-95 transition-all shadow-xs"
                  >
                    <Camera size={16} className="text-emerald-500" />
                    <span>Prendre photo</span>
                  </button>

                  {/* Gallery/File Button */}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center justify-center gap-2 py-3 px-3 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/90 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold active:scale-95 transition-all shadow-xs"
                  >
                    <ImageIcon size={16} className="text-amber-500" />
                    <span>Galerie / Fichier</span>
                  </button>
                </div>
              )}

              {/* Hidden Inputs */}
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handlePhotoChange}
                className="hidden"
              />
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
                className="hidden"
              />
            </div>

            {errorMsg && (
              <div className="p-2.5 rounded-xl bg-red-500/15 border border-red-500/30 text-red-600 dark:text-red-300 text-xs font-semibold flex items-center gap-2">
                <AlertCircle size={14} className="shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}
          </div>
        </div>

        {/* Footer Submit Button */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-950/80 shrink-0">
          <button
            onClick={handleSubmitResponse}
            disabled={isSaving || isUploading}
            className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 active:scale-98 transition-all disabled:opacity-50"
          >
            {isSaving || isUploading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>{isUploading ? 'Téléchargement de la photo...' : 'Envoi de la réponse...'}</span>
              </>
            ) : (
              <>
                <Send size={16} />
                <span>Envoyer la réponse à l'agent</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Fullscreen Photo Modal */}
      {showFullPhoto && photoPreview && (
        <div
          onClick={() => setShowFullPhoto(false)}
          className="fixed inset-0 z-60 bg-black/95 flex flex-col items-center justify-center p-4 animate-in fade-in"
        >
          <button
            onClick={() => setShowFullPhoto(false)}
            className="absolute top-6 right-6 w-10 h-10 rounded-full bg-slate-800 text-white flex items-center justify-center"
          >
            <X size={20} />
          </button>
          <img
            src={photoPreview}
            alt="Plein écran"
            className="max-w-full max-h-[85vh] rounded-2xl object-contain shadow-2xl"
          />
        </div>
      )}
    </div>
  );
};

export default DevisDetailModal;
