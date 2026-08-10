import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useClientAuth } from '@/contexts/ClientAuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/lib/supabase';
import { 
  CreditCard, KanbanSquare, FileText, Stamp, 
  LogOut, Plus, Download, Loader2, Sun, Moon 
} from 'lucide-react';
import { formatDZD } from '@/lib/utils';
import { jsPDF } from 'jspdf';

export const ClientDashboard = ({ onOpenQuoteModal }) => {
  const { user, clientProfile, signOut, isAuthenticated, loading: authLoading } = useClientAuth();
  const { isDark, toggleTheme } = useTheme();
  const { t, isArabic, toggleLang } = useLanguage();
  const [activeTab, setActiveTab] = useState('ventes');
  const [ventes, setVentes] = useState([]);
  const [devis, setDevis] = useState([]);
  const [visas, setVisas] = useState([]);
  const [factures, setFactures] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/connexion');
    }
  }, [isAuthenticated, authLoading, navigate]);

  useEffect(() => {
    if (user?.email) {
      fetchClientData();
    }
  }, [user]);

  const fetchClientData = async () => {
    setLoadingData(true);
    try {
      const clientName = clientProfile?.nom || user?.email?.split('@')[0];
      const clientId = clientProfile?.clientId;

      // 1. Ventes
      let vQuery = supabase.from('ventes').select('*, services(nom), fournisseurs(nom)');
      if (clientId) {
        vQuery = vQuery.or(`client_id.eq.${clientId},client_nom.ilike.%${clientName}%`);
      } else {
        vQuery = vQuery.ilike('client_nom', `%${clientName}%`);
      }
      const { data: vData } = await vQuery.order('created_at', { ascending: false });
      if (vData) setVentes(vData);

      // 2. Devis (Pipeline)
      let pQuery = supabase.from('pipeline').select('*, services(nom)').eq('email', user.email);
      const { data: pData } = await pQuery.order('date_creation', { ascending: false });
      if (pData) setDevis(pData);

      // 3. Visas
      const { data: vsData } = await supabase
        .from('visa_demandes')
        .select('*, visa_types(nom), visa_countries(nom)')
        .ilike('passager_nom', `%${clientName}%`)
        .order('created_at', { ascending: false });
      if (vsData) setVisas(vsData);

      // 4. Factures
      const { data: fData } = await supabase
        .from('factures')
        .select('*')
        .ilike('client_nom', `%${clientName}%`)
        .order('date_creation', { ascending: false });
      if (fData) setFactures(fData);

    } catch (err) {
      console.warn('Erreur chargement données client:', err);
    } finally {
      setLoadingData(false);
    }
  };

  const handleDownloadPDF = (doc) => {
    const pdf = new jsPDF();
    pdf.setFontSize(18);
    pdf.text(`Facture N° ${doc.numero || 'N/A'}`, 20, 30);
    pdf.setFontSize(12);
    pdf.text(`Agence El-Mokhtar Voyages & Omra`, 20, 40);
    pdf.text(`Client : ${doc.client_nom}`, 20, 50);
    pdf.text(`Date : ${new Date(doc.date_creation || doc.created_at).toLocaleDateString('fr-FR')}`, 20, 60);
    pdf.text(`Montant Total : ${formatDZD(doc.total_ttc)}`, 20, 70);
    pdf.save(`Facture_ElMokhtar_${doc.numero || 'client'}.pdf`);
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  if (authLoading || loadingData) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-20">
        <Loader2 className="animate-spin text-brand-500" size={36} />
      </div>
    );
  }

  const displayName = clientProfile?.nom || user?.email?.split('@')[0] || (isArabic ? 'المسافر' : 'Client');

  return (
    <div className="min-h-screen pt-28 pb-20 px-4 sm:px-6 max-w-7xl mx-auto text-left rtl:text-right">
      
      {/* Client Welcome Banner */}
      <div className="card-bezel-outer mb-8">
        <div className="card-bezel-inner p-6 sm:p-7 bg-gradient-to-r from-slate-50 via-white to-brand-50/40 dark:from-obsidian-900 dark:via-obsidian-900 dark:to-brand-950/40 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-brand-600 via-brand-500 to-emerald-500 flex items-center justify-center text-white text-xl font-extrabold shadow-lg shadow-brand-500/20 flex-shrink-0">
              {displayName.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                  {t('dash_hello')}, <span className="text-brand-600 dark:text-brand-400">{displayName}</span>
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-brand-500/10 text-brand-600 dark:bg-brand-500/20 dark:text-brand-300 border border-brand-500/20">
                  {t('dash_badge')}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1" dir="ltr">{user?.email}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onOpenQuoteModal}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-brand-600 to-emerald-600 hover:from-brand-500 hover:to-emerald-500 text-white font-bold text-xs shadow-md shadow-brand-500/20 flex items-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Plus size={14} /> {t('dash_new_quote')}
            </button>

            <button
              onClick={handleLogout}
              className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-red-500/10 hover:text-red-500 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 text-xs font-bold transition-all flex items-center gap-1.5"
            >
              <LogOut size={14} /> {t('nav_logout')}
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-6 border-b border-slate-200 dark:border-white/10">
        {[
          { id: 'ventes', label: `${t('dash_tab_bookings')} (${ventes.length})`, icon: CreditCard },
          { id: 'devis', label: `${t('dash_tab_quotes')} (${devis.length})`, icon: KanbanSquare },
          { id: 'visas', label: `${t('dash_tab_visas')} (${visas.length})`, icon: Stamp },
          { id: 'factures', label: `${t('dash_tab_invoices')} (${factures.length})`, icon: FileText },
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-xs font-bold transition-all whitespace-nowrap ${
                isActive
                  ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/20'
                  : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Icon size={15} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Content Panes */}
      <div className="space-y-4">
        
        {/* 1. Réservations */}
        {activeTab === 'ventes' && (
          <div className="space-y-4">
            {ventes.length === 0 ? (
              <div className="card-bezel-outer p-12 text-center">
                <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-white/5 mx-auto flex items-center justify-center text-slate-400 mb-3">
                  <CreditCard size={20} />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
                  {isArabic ? 'لا توجد حجوزات مؤكدة حالياً' : 'Aucune réservation confirmée'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-6">
                  {isArabic ? 'لم يتم العثور على أي حجز مسجل باسمكم حتى الآن.' : "Vous n'avez pas encore de séjour ou de vol réservé à votre nom."}
                </p>
                <button
                  onClick={onOpenQuoteModal}
                  className="px-6 py-2.5 rounded-xl bg-brand-500 text-white font-bold text-xs shadow-md"
                >
                  {isArabic ? 'تصفح برامج العمرة المتاحة' : 'Explorer nos séjours Omra'}
                </button>
              </div>
            ) : (
              ventes.map(v => (
                <div key={v.id} className="card-bezel-outer">
                  <div className="card-bezel-inner p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-base font-bold text-slate-900 dark:text-white">
                          {v.services?.nom || (isArabic ? 'رحلة عمرة وسياحة' : 'Prestation de Voyage')}
                        </span>
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          v.etat === 'Payé' 
                            ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30' 
                            : 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                        }`}>
                          {v.etat === 'Payé' ? (isArabic ? 'تم السداد' : 'Payé') : (isArabic ? 'مؤكد' : 'Réservé')}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400">{v.details || (isArabic ? 'تفاصيل الحجز' : 'Détails du séjour')}</p>
                      <div className="flex items-center gap-4 text-xs text-slate-400 pt-1">
                        <span>{isArabic ? 'التاريخ' : 'Date'} : {new Date(v.date_vente || v.created_at).toLocaleDateString(isArabic ? 'ar-DZ' : 'fr-FR')}</span>
                        {v.fournisseurs?.nom && <span>{isArabic ? 'الجهة الموفرة' : 'Partenaire'} : {v.fournisseurs.nom}</span>}
                      </div>
                    </div>

                    <div className="text-right rtl:text-left">
                      <span className="text-xs text-slate-400 block">{isArabic ? 'إجمالي الحجز' : 'Total Réservation'}</span>
                      <span className="text-xl font-black text-slate-900 dark:text-white font-mono">
                        {formatDZD(v.total)}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* 2. Devis */}
        {activeTab === 'devis' && (
          <div className="space-y-4">
            {devis.length === 0 ? (
              <div className="card-bezel-outer p-12 text-center">
                <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-white/5 mx-auto flex items-center justify-center text-slate-400 mb-3">
                  <KanbanSquare size={20} />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
                  {isArabic ? 'لا توجد طلبات عروض أسعار قيد الدراسة' : 'Aucun devis en cours'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-6">
                  {isArabic ? 'يمكنكم طلب عرض أسعار مخصص لرحلتكم القادمة في أي وقت.' : 'Faites une demande de devis personnalisée pour votre prochain voyage.'}
                </p>
                <button
                  onClick={onOpenQuoteModal}
                  className="px-6 py-2.5 rounded-xl bg-brand-500 text-white font-bold text-xs shadow-md"
                >
                  {t('dash_new_quote')}
                </button>
              </div>
            ) : (
              devis.map(d => (
                <div key={d.id} className="card-bezel-outer">
                  <div className="card-bezel-inner p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-base font-bold text-slate-900 dark:text-white">
                          {isArabic ? 'طلب' : 'Demande'} : {d.services?.nom || (isArabic ? 'رحلة عمرة' : 'Voyage & Séjour')}
                        </span>
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          d.status === 'converti' ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30' :
                          d.status === 'envoye' ? 'bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30' :
                          'bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/30'
                        }`}>
                          {d.status === 'nouvelle' ? (isArabic ? 'قيد الدراسة' : 'En attente de traitement') :
                           d.status === 'envoye' ? (isArabic ? 'تم إرسال العرض' : 'Proposition envoyée') :
                           d.status === 'converti' ? (isArabic ? 'تم تأكيد الحجز' : 'Réservation confirmée') : d.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300">{d.details_demande || 'Demande de devis'}</p>
                      <span className="text-[11px] text-slate-400 block pt-1">
                        {isArabic ? 'تاريخ الإرسال' : 'Envoyé le'} : {new Date(d.date_creation).toLocaleDateString(isArabic ? 'ar-DZ' : 'fr-FR')}
                      </span>
                    </div>

                    {d.details_devis && (
                      <div className="p-3 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10 max-w-sm text-xs text-brand-700 dark:text-brand-300">
                        <span className="font-bold block mb-0.5">{isArabic ? 'عرض وكالة المختار :' : "Proposition de l'Agence El-Mokhtar :"}</span>
                        <span>{d.details_devis}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* 3. Visas */}
        {activeTab === 'visas' && (
          <div className="space-y-4">
            {visas.length === 0 ? (
              <div className="card-bezel-outer p-12 text-center">
                <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-white/5 mx-auto flex items-center justify-center text-slate-400 mb-3">
                  <Stamp size={20} />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
                  {isArabic ? 'لا توجد تأشيرات قيد المعالجة' : 'Aucun dossier visa en cours'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-6">
                  {isArabic ? 'هل تحتاج إلى تأشيرة عمرة، سياحة دبي أو تركيا ؟' : "Besoin d'un visa pour l'Arabie Saoudite, Dubaï ou la Turquie ?"}
                </p>
                <button
                  onClick={onOpenQuoteModal}
                  className="px-6 py-2.5 rounded-xl bg-brand-500 text-white font-bold text-xs shadow-md"
                >
                  {isArabic ? 'طلب استخراج تأشيرة' : 'Demander un Visa'}
                </button>
              </div>
            ) : (
              visas.map(visa => (
                <div key={visa.id} className="card-bezel-outer">
                  <div className="card-bezel-inner p-6 flex items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-base font-bold text-slate-900 dark:text-white">
                          {visa.visa_countries?.nom || (isArabic ? 'تأشيرة' : 'Visa')} — {visa.visa_types?.nom || (isArabic ? 'سياحة' : 'Tourisme')}
                        </span>
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          visa.statut === 'Délivré' ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30' :
                          'bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                        }`}>
                          {visa.statut === 'Délivré' ? (isArabic ? 'صادرة وجاهزة' : 'Délivré') : (isArabic ? 'قيد المعالجة' : 'En cours')}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400">{isArabic ? 'المسافر' : 'Passager'} : {visa.passager_nom}</p>
                      <span className="text-[11px] text-slate-400 block">
                        {isArabic ? 'تاريخ الإيداع' : 'Déposé le'} : {new Date(visa.created_at).toLocaleDateString(isArabic ? 'ar-DZ' : 'fr-FR')}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* 4. Factures */}
        {activeTab === 'factures' && (
          <div className="space-y-4">
            {factures.length === 0 ? (
              <div className="card-bezel-outer p-12 text-center">
                <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-white/5 mx-auto flex items-center justify-center text-slate-400 mb-3">
                  <FileText size={20} />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
                  {isArabic ? 'لا توجد فواتير صادرة حالياً' : 'Aucune facture disponible'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                  {isArabic ? 'ستظهر فواتيرك وإيصالات السداد هنا فور اعتماد المدفوعات.' : 'Vos factures et reçus apparaîtront ici dès confirmation de vos règlements.'}
                </p>
              </div>
            ) : (
              factures.map(f => (
                <div key={f.id} className="card-bezel-outer">
                  <div className="card-bezel-inner p-6 flex items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-base font-bold text-slate-900 dark:text-white">
                          {isArabic ? 'فاتورة رقم' : 'Facture N°'} {f.numero || 'N/A'}
                        </span>
                        <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                          {formatDZD(f.total_ttc)}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">{f.details || (isArabic ? 'فاتورة رحلة' : 'Facture de séjour')}</p>
                      <span className="text-[11px] text-slate-400 block pt-0.5">
                        {isArabic ? 'تاريخ الإصدار' : 'Émise le'} : {new Date(f.date_creation || f.created_at).toLocaleDateString(isArabic ? 'ar-DZ' : 'fr-FR')}
                      </span>
                    </div>

                    <button
                      onClick={() => handleDownloadPDF(f)}
                      className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-white/10 hover:bg-brand-500 hover:text-white dark:hover:bg-brand-500 text-slate-900 dark:text-white font-bold text-xs flex items-center gap-2 transition-all"
                    >
                      <Download size={14} /> {t('dash_download_pdf')}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

      </div>
    </div>
  );
};
