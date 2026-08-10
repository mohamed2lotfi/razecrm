import React, { useState, useEffect } from 'react';
import { Mail, Plus, Send, Clock, Edit3, Trash2, ArrowRight, CheckCircle2, Users, Briefcase, Loader2 } from 'lucide-react';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import CampaignModal from '@/components/CampaignModal';

const EmailMarketing = () => {
  const { isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState('B2B');
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState(null);

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('campagnes_email')
      .select('*')
      .order('created_at', { ascending: false });
      
    if (data) {
      setCampaigns(data);
    }
    setLoading(false);
  };

  const handleDelete = async (id) => {
    if (window.confirm("Êtes-vous sûr de vouloir supprimer cette campagne ?")) {
      await supabase.from('campagnes_email').delete().eq('id', id);
      fetchCampaigns();
    }
  };

  const openNewCampaign = () => {
    setEditingCampaign(null);
    setIsModalOpen(true);
  };

  const openEditCampaign = (campagne) => {
    setEditingCampaign(campagne);
    setIsModalOpen(true);
  };

  const filteredCampaigns = campaigns.filter(c => c.type_audience === activeTab);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Envoyé':
        return <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-none shadow-sm"><CheckCircle2 size={12} className="mr-1" /> Envoyé</Badge>;
      case 'Planifié':
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 border-none shadow-sm"><Clock size={12} className="mr-1" /> Planifié</Badge>;
      case 'Brouillon':
      default:
        return <Badge className="bg-slate-100 text-slate-800 hover:bg-slate-100 border-none shadow-sm"><Edit3 size={12} className="mr-1" /> Brouillon</Badge>;
    }
  };

  return (
    <Layout>
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-primary flex items-center gap-3">
            <Mail size={32} className="text-violet-600" /> Email Marketing
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">Créez et gérez vos campagnes d'emailing (Envoi réel via Resend prochainement).</p>
        </div>
        <Button className="bg-violet-600 hover:bg-violet-700 shadow-md" onClick={openNewCampaign}>
          <Plus size={16} className="mr-2" /> Nouvelle Campagne {activeTab}
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-slate-100/50 p-1 rounded-xl mb-8 w-fit border border-slate-200/60 shadow-sm">
        <button
          onClick={() => setActiveTab('B2B')}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-semibold text-sm transition-all duration-200 ${
            activeTab === 'B2B' 
              ? 'bg-white text-violet-700 shadow-sm' 
              : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
          }`}
        >
          <Briefcase size={16} /> Campagnes B2B (Contacts)
        </button>
        <button
          onClick={() => setActiveTab('B2C')}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-semibold text-sm transition-all duration-200 ${
            activeTab === 'B2C' 
              ? 'bg-white text-violet-700 shadow-sm' 
              : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
          }`}
        >
          <Users size={16} /> Campagnes B2C (Clients)
        </button>
      </div>

      {/* Grid of campaigns */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="animate-spin text-violet-600" size={48} />
        </div>
      ) : filteredCampaigns.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center">
          <div className="w-16 h-16 bg-violet-100 text-violet-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner border border-violet-200">
            <Mail size={32} />
          </div>
          <h3 className="text-lg font-bold text-slate-800 mb-2">Aucune campagne {activeTab}</h3>
          <p className="text-slate-500 max-w-md mx-auto mb-6">Vous n'avez pas encore créé de campagne email pour cette audience. Commencez dès maintenant !</p>
          <Button className="bg-violet-600 hover:bg-violet-700 shadow-sm" onClick={openNewCampaign}>
            <Plus size={16} className="mr-2" /> Créer ma première campagne
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredCampaigns.map(campagne => (
            <Card key={campagne.id} className="border-slate-100 shadow-sm hover:shadow-md transition-shadow group overflow-hidden bg-white/80 backdrop-blur-sm flex flex-col">
              <CardHeader className="pb-3 bg-slate-50/50 border-b border-slate-100 relative">
                <div className="flex justify-between items-start mb-2 relative z-10">
                  {getStatusBadge(campagne.statut)}
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" onClick={() => openEditCampaign(campagne)} className="h-7 w-7 text-slate-400 hover:text-violet-600 bg-white shadow-sm border border-slate-100" title="Modifier">
                      <Edit3 size={13} />
                    </Button>
                    {isAdmin && (
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(campagne.id)} className="h-7 w-7 text-slate-400 hover:text-red-600 bg-white shadow-sm border border-slate-100" title="Supprimer la campagne">
                        <Trash2 size={13} />
                      </Button>
                    )}
                  </div>
                </div>
                <CardTitle className="text-lg font-bold text-slate-800 leading-tight relative z-10 truncate" title={campagne.nom}>
                  {campagne.nom}
                </CardTitle>
                <CardDescription className="text-slate-500 font-medium mt-1.5 line-clamp-1 relative z-10 text-xs" title={campagne.sujet}>
                  Sujet : {campagne.sujet || '—'}
                </CardDescription>
                
                {/* Decorative background element */}
                <div className="absolute -top-6 -right-6 w-24 h-24 bg-violet-100/50 rounded-full blur-2xl opacity-50"></div>
              </CardHeader>
              <CardContent className="pt-4 pb-3 flex-1">
                <div className="flex flex-col gap-2.5 text-sm">
                  <div className="flex items-center gap-2 text-slate-600 bg-slate-50 px-3 py-1.5 rounded-md border border-slate-100 w-fit">
                    <Users size={14} className="text-slate-400" />
                    <span className="font-bold text-slate-700">{campagne.destinataires_count || 0}</span> <span className="text-xs">destinataires</span>
                  </div>
                  {campagne.date_envoi && (
                    <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                      <Clock size={12} className="text-slate-400" />
                      {new Date(campagne.date_envoi).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </div>
                  )}
                </div>
              </CardContent>
              <CardFooter className="pt-0 pb-4 shrink-0">
                <Button variant="ghost" onClick={() => openEditCampaign(campagne)} className="w-full text-violet-600 hover:text-violet-700 hover:bg-violet-50 flex items-center justify-between group/btn border border-transparent hover:border-violet-100 h-9">
                  <span className="text-sm font-semibold">{campagne.statut === 'Brouillon' ? 'Continuer l\'édition' : 'Voir les détails'}</span>
                  <ArrowRight size={16} className="opacity-50 group-hover/btn:opacity-100 group-hover/btn:translate-x-1 transition-all" />
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Campaign Wizard Modal */}
      {isModalOpen && (
        <CampaignModal 
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSaved={fetchCampaigns}
          initialTypeAudience={activeTab}
          campaignToEdit={editingCampaign}
        />
      )}
    </Layout>
  );
};

export default EmailMarketing;
