import React, { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { 
  Plus, Users, Search, Loader2, Phone, Mail, Calendar, 
  CreditCard, ShieldCheck, Coins, Key, UserCheck, Trash2, UserPlus, Lock 
} from 'lucide-react';
import UserAvatar from '@/components/UserAvatar';

// Composant utilitaire pour l'avatar généré avec les initiales
const Avatar = ({ firstName, lastName }) => {
  const initials = `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase();
  const colors = [
    'from-indigo-500 to-blue-500', 'from-emerald-500 to-teal-500', 
    'from-amber-500 to-orange-500', 'from-rose-500 to-pink-500',
    'from-violet-500 to-purple-500'
  ];
  const colorIndex = (firstName?.length + lastName?.length) % colors.length || 0;
  
  return (
    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm bg-gradient-to-br ${colors[colorIndex]} shadow-sm ring-2 ring-white`}>
      {initials}
    </div>
  );
};

const RH = () => {
  const { isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState('employees');
  const [employees, setEmployees] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [selectedEmpForAccount, setSelectedEmpForAccount] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Formulaire d'ajout collaborateur + compte
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    birth_date: '',
    ssn: '',
    bank_details: '',
    email: '',
    phone: '',
    salary: '',
    salary_date: '',
    // Option compte d'accès
    create_account: false,
    account_email: '',
    account_password: '',
    account_role: 'agent'
  });

  // Formulaire modal compte existant
  const [accountFormData, setAccountFormData] = useState({
    email: '',
    password: '',
    role: 'agent'
  });

  useEffect(() => {
    fetchEmployeesAndProfiles();
  }, []);

  const fetchEmployeesAndProfiles = async () => {
    setLoading(true);
    try {
      const [empRes, profRes] = await Promise.all([
        supabase.from('employees').select('*').order('created_at', { ascending: false }),
        supabase.from('profiles').select('*')
      ]);
      
      if (empRes.error) throw empRes.error;
      setEmployees(empRes.data || []);
      setProfiles(profRes.data || []);
    } catch (err) {
      console.error('Erreur chargement RH:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const { create_account, account_email, account_password, account_role, ...employeeData } = formData;

      // 1. Insertion dans la table employees
      const { data: empInserted, error: empError } = await supabase
        .from('employees')
        .insert([employeeData])
        .select();
      
      if (empError) throw empError;

      // 2. Si création de compte d'accès activée
      if (create_account) {
        const emailToUse = (account_email || employeeData.email || '').trim();
        const pwdToUse = account_password.trim();
        const fullName = `${employeeData.first_name} ${employeeData.last_name}`.trim();

        if (!emailToUse || !pwdToUse) {
          alert("L'employé a été enregistré, mais l'email et le mot de passe sont requis pour créer le compte utilisateur.");
        } else if (pwdToUse.length < 6) {
          alert("L'employé a été enregistré, mais le mot de passe doit comporter au moins 6 caractères pour créer le compte.");
        } else {
          // Création du compte Auth Supabase
          const { data: authData, error: authError } = await supabase.auth.signUp({
            email: emailToUse,
            password: pwdToUse,
            options: {
              data: {
                nom: fullName,
                role: account_role || 'agent'
              }
            }
          });

          if (authError) {
            console.error('Erreur création compte auth:', authError);
            alert(`Employé créé, mais erreur lors de la création du compte d'accès : ${authError.message}`);
          } else if (authData?.user) {
            // Insérer/synchroniser dans profiles
            await supabase.from('profiles').upsert({
              id: authData.user.id,
              email: emailToUse,
              nom: fullName,
              role: account_role || 'agent'
            });
            alert(`Collaborateur et compte d'accès (${account_role === 'admin' ? 'Administrateur' : 'Agent'}) créés avec succès !`);
          }
        }
      } else {
        alert("Collaborateur enregistré avec succès !");
      }
      
      setIsAddModalOpen(false);
      setFormData({
        first_name: '', last_name: '', birth_date: '',
        ssn: '', bank_details: '', email: '', phone: '',
        salary: '', salary_date: '',
        create_account: false, account_email: '', account_password: '', account_role: 'agent'
      });
      fetchEmployeesAndProfiles();
    } catch (err) {
      console.error('Erreur ajout employé:', err);
      alert("Erreur lors de l'enregistrement de l'employé : " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenCreateAccountForEmp = (emp) => {
    setSelectedEmpForAccount(emp);
    setAccountFormData({
      email: emp.email || '',
      password: '',
      role: 'agent'
    });
    setIsAccountModalOpen(true);
  };

  const handleCreateAccountForExisting = async (e) => {
    e.preventDefault();
    if (!accountFormData.email || !accountFormData.password) {
      alert('Veuillez renseigner un email et un mot de passe.');
      return;
    }
    if (accountFormData.password.length < 6) {
      alert('Le mot de passe doit comporter au moins 6 caractères.');
      return;
    }

    setIsSubmitting(true);
    try {
      const fullName = `${selectedEmpForAccount.first_name} ${selectedEmpForAccount.last_name}`.trim();
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: accountFormData.email.trim(),
        password: accountFormData.password.trim(),
        options: {
          data: {
            nom: fullName,
            role: accountFormData.role || 'agent'
          }
        }
      });

      if (authError) throw authError;

      if (authData?.user) {
        await supabase.from('profiles').upsert({
          id: authData.user.id,
          email: accountFormData.email.trim(),
          nom: fullName,
          role: accountFormData.role || 'agent'
        });

        // Mettre à jour l'email de l'employé si différent
        if (selectedEmpForAccount.email !== accountFormData.email.trim()) {
          await supabase
            .from('employees')
            .update({ email: accountFormData.email.trim() })
            .eq('id', selectedEmpForAccount.id);
        }
      }

      alert(`Compte d'accès créé avec succès pour ${fullName} !`);
      setIsAccountModalOpen(false);
      fetchEmployeesAndProfiles();
    } catch (err) {
      console.error('Erreur création compte:', err);
      alert("Erreur lors de la création du compte : " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteEmployee = async (id, name) => {
    if (window.confirm(`Voulez-vous vraiment supprimer le collaborateur ${name} ?`)) {
      try {
        const { error } = await supabase.from('employees').delete().eq('id', id);
        if (error) throw error;
        setEmployees(prev => prev.filter(e => e.id !== id));
      } catch (err) {
        console.error('Erreur suppression:', err);
        alert('Erreur lors de la suppression : ' + err.message);
      }
    }
  };

  const getProfileForEmployee = (emp) => {
    if (!emp.email) return null;
    return profiles.find(p => p.email?.toLowerCase() === emp.email?.toLowerCase());
  };

  const filteredEmployees = employees.filter(emp => 
    `${emp.first_name} ${emp.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (emp.email && emp.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <Layout>
      <div className="flex flex-col gap-6 max-w-7xl mx-auto w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        {/* En-tête Premium avec gradient subtil */}
        <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-8 shadow-xl shadow-indigo-900/10">
          <div className="absolute top-0 right-0 -translate-y-12 translate-x-1/4 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 translate-y-1/3 -translate-x-1/4 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl pointer-events-none"></div>
          
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-3">
                <div className="p-3 bg-white/10 rounded-xl backdrop-blur-md border border-white/10 shadow-inner">
                  <Users className="w-6 h-6 text-indigo-300" />
                </div>
                <h1 className="text-3xl font-black text-white tracking-tight">
                  Ressources Humaines & Équipe
                </h1>
              </div>
              <p className="text-sm text-indigo-200 font-medium mt-3 max-w-xl leading-relaxed">
                Gérez vos collaborateurs, leurs fiches administratives et créez leurs comptes d'accès à l'application avec leurs rôles (Admin ou Agent).
              </p>
            </div>
            
            <Button 
              onClick={() => setIsAddModalOpen(true)}
              className="bg-white hover:bg-indigo-50 text-indigo-900 font-bold shadow-lg shadow-white/10 gap-2 h-11 px-6 rounded-xl transition-all duration-300 hover:scale-[1.02]"
            >
              <Plus size={18} className="text-indigo-600" />
              Nouveau Collaborateur
            </Button>
          </div>
        </div>

        {/* Système d'onglets dynamique */}
        <div className="flex space-x-1 bg-white p-1.5 rounded-xl w-fit shadow-sm border border-slate-200/60">
          <button
            onClick={() => setActiveTab('employees')}
            className={`px-5 py-2.5 text-sm font-bold rounded-lg transition-all duration-300 ${
              activeTab === 'employees' 
                ? 'bg-slate-900 text-white shadow-md shadow-slate-900/20' 
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            Membres de l'équipe ({employees.length})
          </button>
        </div>

        {/* Contenu - Liste des employés */}
        {activeTab === 'employees' && (
          <Card className="shadow-xl shadow-slate-200/40 border-slate-200/60 rounded-2xl overflow-hidden bg-white/80 backdrop-blur-xl">
            <CardHeader className="pb-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/50">
              <CardTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <span className="w-1.5 h-6 bg-indigo-600 rounded-full"></span>
                Annuaire & Comptes d'accès
                <span className="ml-2 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 text-xs font-semibold border border-slate-200">
                  {employees.length}
                </span>
              </CardTitle>
              <div className="relative w-full sm:w-80 group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                <Input
                  placeholder="Rechercher par nom ou email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-10 text-sm bg-slate-50 border-slate-200 rounded-xl focus:ring-indigo-600/20 transition-all"
                />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-slate-500 bg-slate-50 border-b border-slate-100 font-semibold tracking-wider">
                    <tr>
                      <th className="px-6 py-4 uppercase">Collaborateur</th>
                      <th className="px-6 py-4 uppercase">Coordonnées</th>
                      <th className="px-6 py-4 uppercase">Compte CRM</th>
                      <th className="px-6 py-4 uppercase">Détails administratifs</th>
                      <th className="px-6 py-4 uppercase">Rémunération</th>
                      <th className="px-6 py-4 text-right uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {loading ? (
                      <tr>
                        <td colSpan="6" className="px-6 py-12 text-center">
                          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-indigo-500" />
                          <p className="text-sm text-slate-500 font-medium">Chargement de l'équipe...</p>
                        </td>
                      </tr>
                    ) : filteredEmployees.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="px-6 py-12 text-center">
                          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100">
                            <Users className="w-8 h-8 text-slate-300" />
                          </div>
                          <p className="text-slate-600 font-medium text-base">Aucun employé trouvé.</p>
                          <p className="text-slate-400 text-sm mt-1">Essayez une autre recherche ou ajoutez un nouveau membre.</p>
                        </td>
                      </tr>
                    ) : (
                      filteredEmployees.map((emp) => {
                        const userProfile = getProfileForEmployee(emp);
                        const fullName = `${emp.first_name} ${emp.last_name}`;

                        return (
                          <tr key={emp.id} className="hover:bg-slate-50/80 transition-all duration-200 group">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-4">
                                <UserAvatar user={userProfile} name={fullName} size="md" />
                                <div>
                                  <div className="font-bold text-slate-900 text-base group-hover:text-indigo-700 transition-colors">
                                    {fullName}
                                  </div>
                                  <div className="text-slate-500 text-xs font-medium">Ajouté le {new Date(emp.created_at).toLocaleDateString()}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2 text-slate-600">
                                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                                  <span className={!emp.email ? "italic text-slate-400" : ""}>{emp.email || 'Non renseigné'}</span>
                                </div>
                                <div className="flex items-center gap-2 text-slate-600">
                                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                                  <span className={!emp.phone ? "italic text-slate-400" : ""}>{emp.phone || 'Non renseigné'}</span>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              {userProfile ? (
                                <div className="flex flex-col gap-1">
                                  {userProfile.role === 'admin' ? (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-700 border border-amber-500/30 w-fit">
                                      <ShieldCheck size={12} /> Compte Admin
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-500/15 text-blue-700 border border-blue-500/30 w-fit">
                                      <UserCheck size={12} /> Compte Agent
                                    </span>
                                  )}
                                  <span className="text-[10px] text-slate-400 font-mono truncate max-w-[150px]">{userProfile.email}</span>
                                </div>
                              ) : (
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  onClick={() => handleOpenCreateAccountForEmp(emp)}
                                  className="h-7 text-xs font-semibold text-indigo-700 border-indigo-200 bg-indigo-50/50 hover:bg-indigo-100 hover:text-indigo-900 rounded-lg"
                                >
                                  <Key size={12} className="mr-1 text-indigo-500" /> Créer un accès
                                </Button>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              <div className="space-y-1.5">
                                <div className="flex items-center gap-2 text-slate-600 text-xs">
                                  <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                                  {emp.birth_date ? new Date(emp.birth_date).toLocaleDateString('fr-FR') : 'Date naissance ?'}
                                </div>
                                <div className="flex items-center gap-2 text-slate-600 text-xs font-mono">
                                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                                  {emp.ssn || 'SSN manquant'}
                                </div>
                                <div className="flex items-center gap-2 text-slate-600 text-xs font-mono">
                                  <CreditCard className="w-3.5 h-3.5 text-amber-500" />
                                  {emp.bank_details ? 'RIB configuré' : 'RIB manquant'}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="space-y-1.5">
                                <div className="flex items-center gap-2 font-bold text-slate-800">
                                  <Coins className="w-4 h-4 text-emerald-500" />
                                  {emp.salary ? `${parseFloat(emp.salary).toLocaleString('fr-FR')} DZD` : 'Non défini'}
                                </div>
                                <div className="flex items-center gap-2 text-slate-500 text-xs">
                                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                  Versement: Le {emp.salary_date || '?'} du mois
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-right align-middle">
                              {isAdmin && (
                                <Button 
                                  variant="ghost" 
                                  size="icon-sm" 
                                  onClick={() => handleDeleteEmployee(emp.id, fullName)}
                                  className="text-slate-400 hover:text-red-600 hover:bg-red-50"
                                  title="Supprimer le collaborateur"
                                >
                                  <Trash2 size={15} />
                                </Button>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Modal Ajout Collaborateur & Compte d'accès */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="max-w-2xl p-0 overflow-hidden border-0 shadow-2xl shadow-indigo-900/20 rounded-2xl">
          <div className="bg-gradient-to-r from-slate-900 to-indigo-900 p-6 text-white relative overflow-hidden">
            <div className="absolute right-0 top-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/4"></div>
            <DialogTitle className="text-2xl font-black flex items-center gap-2 z-10 relative">
              <Users className="w-6 h-6 text-indigo-300" />
              Nouveau Collaborateur
            </DialogTitle>
            <DialogDescription className="text-indigo-200 mt-1.5 z-10 relative text-sm font-medium">
              Saisissez les informations administratives du collaborateur et créez éventuellement son compte de connexion.
            </DialogDescription>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6 bg-slate-50/50 max-h-[75vh] overflow-y-auto custom-scrollbar">
            {/* 1. Infos Personnelles */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-indigo-900 uppercase tracking-wider flex items-center gap-2 border-b pb-2">
                <span className="w-6 h-6 rounded bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold">1</span>
                Identité
              </h3>
              <div className="grid grid-cols-2 gap-5">
                <div className="space-y-2 group">
                  <Label htmlFor="first_name" className="text-slate-600 font-bold group-focus-within:text-indigo-600 transition-colors">Prénom <span className="text-red-500">*</span></Label>
                  <Input id="first_name" name="first_name" required value={formData.first_name} onChange={handleInputChange} placeholder="Ex: Amine" className="h-11 bg-white border-slate-200 focus:border-indigo-500 shadow-sm rounded-xl transition-all" />
                </div>
                <div className="space-y-2 group">
                  <Label htmlFor="last_name" className="text-slate-600 font-bold group-focus-within:text-indigo-600 transition-colors">Nom <span className="text-red-500">*</span></Label>
                  <Input id="last_name" name="last_name" required value={formData.last_name} onChange={handleInputChange} placeholder="Ex: Benali" className="h-11 bg-white border-slate-200 focus:border-indigo-500 shadow-sm rounded-xl transition-all" />
                </div>
              </div>
            </div>

            {/* 2. Contact */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-indigo-900 uppercase tracking-wider flex items-center gap-2 border-b pb-2 mt-2">
                <span className="w-6 h-6 rounded bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold">2</span>
                Contact
              </h3>
              <div className="grid grid-cols-2 gap-5">
                <div className="space-y-2 group">
                  <Label htmlFor="email" className="text-slate-600 font-bold group-focus-within:text-indigo-600 transition-colors">Adresse Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500" />
                    <Input id="email" name="email" type="email" value={formData.email} onChange={handleInputChange} placeholder="amine@agence.com" className="pl-10 h-11 bg-white border-slate-200 focus:border-indigo-500 shadow-sm rounded-xl transition-all" />
                  </div>
                </div>
                <div className="space-y-2 group">
                  <Label htmlFor="phone" className="text-slate-600 font-bold group-focus-within:text-indigo-600 transition-colors">Téléphone</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500" />
                    <Input id="phone" name="phone" value={formData.phone} onChange={handleInputChange} placeholder="06 00 00 00 00" className="pl-10 h-11 bg-white border-slate-200 focus:border-indigo-500 shadow-sm rounded-xl transition-all" />
                  </div>
                </div>
              </div>
            </div>

            {/* 3. Admin */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-indigo-900 uppercase tracking-wider flex items-center gap-2 border-b pb-2 mt-2">
                <span className="w-6 h-6 rounded bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold">3</span>
                Administratif
              </h3>
              <div className="grid grid-cols-2 gap-5">
                <div className="space-y-2 group">
                  <Label htmlFor="birth_date" className="text-slate-600 font-bold group-focus-within:text-indigo-600 transition-colors">Date de naissance</Label>
                  <Input id="birth_date" name="birth_date" type="date" value={formData.birth_date} onChange={handleInputChange} className="h-11 bg-white border-slate-200 focus:border-indigo-500 shadow-sm rounded-xl transition-all" />
                </div>
                <div className="space-y-2 group">
                  <Label htmlFor="ssn" className="text-slate-600 font-bold group-focus-within:text-indigo-600 transition-colors">Numéro de Sécurité Sociale</Label>
                  <div className="relative">
                    <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500" />
                    <Input id="ssn" name="ssn" value={formData.ssn} onChange={handleInputChange} placeholder="N° SSN" className="pl-10 h-11 font-mono text-sm bg-white border-slate-200 focus:border-indigo-500 shadow-sm rounded-xl transition-all" />
                  </div>
                </div>
                <div className="col-span-2 space-y-2 group">
                  <Label htmlFor="bank_details" className="text-slate-600 font-bold group-focus-within:text-indigo-600 transition-colors">Coordonnées Bancaires (RIB / IBAN)</Label>
                  <div className="relative">
                    <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500" />
                    <Input id="bank_details" name="bank_details" value={formData.bank_details} onChange={handleInputChange} placeholder="Ex: 007 1234567890 00" className="pl-10 h-11 font-mono text-sm bg-white border-slate-200 focus:border-indigo-500 shadow-sm rounded-xl transition-all" />
                  </div>
                </div>
              </div>
            </div>

            {/* 4. Rémunération */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-indigo-900 uppercase tracking-wider flex items-center gap-2 border-b pb-2 mt-2">
                <span className="w-6 h-6 rounded bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold">4</span>
                Rémunération
              </h3>
              <div className="grid grid-cols-2 gap-5">
                <div className="space-y-2 group">
                  <Label htmlFor="salary" className="text-slate-600 font-bold group-focus-within:text-indigo-600 transition-colors">Salaire Mensuel (DZD)</Label>
                  <div className="relative">
                    <Coins className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500" />
                    <Input id="salary" name="salary" type="number" step="0.01" value={formData.salary} onChange={handleInputChange} placeholder="Ex: 50000" className="pl-10 h-11 font-mono text-sm bg-white border-slate-200 focus:border-indigo-500 shadow-sm rounded-xl transition-all" />
                  </div>
                </div>
                <div className="space-y-2 group">
                  <Label htmlFor="salary_date" className="text-slate-600 font-bold group-focus-within:text-indigo-600 transition-colors">Date de virement (Jour du mois)</Label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500" />
                    <Input id="salary_date" name="salary_date" type="number" min="1" max="31" value={formData.salary_date} onChange={handleInputChange} placeholder="Ex: 01" className="pl-10 h-11 font-mono text-sm bg-white border-slate-200 focus:border-indigo-500 shadow-sm rounded-xl transition-all" />
                  </div>
                </div>
              </div>
            </div>

            {/* 5. Option Compte d'accès CRM (Email + Mot de passe) */}
            <div className="space-y-4 bg-indigo-50/70 p-5 rounded-2xl border border-indigo-200/80 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded bg-indigo-600 text-white flex items-center justify-center text-xs font-bold">5</span>
                  <h3 className="text-sm font-bold text-indigo-950 uppercase tracking-wider">
                    Compte d'accès CRM
                  </h3>
                </div>
                <label className="flex items-center gap-2.5 cursor-pointer bg-white px-3 py-1.5 rounded-lg border border-indigo-200 shadow-sm hover:border-indigo-400 transition-colors">
                  <input
                    type="checkbox"
                    name="create_account"
                    checked={formData.create_account}
                    onChange={handleInputChange}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 cursor-pointer"
                  />
                  <span className="text-xs font-bold text-indigo-900">Créer un compte d'accès</span>
                </label>
              </div>

              {formData.create_account && (
                <div className="space-y-4 pt-2 animate-in fade-in slide-in-from-top-2 duration-300">
                  <p className="text-xs text-indigo-800">
                    Définissez les identifiants pour permettre à cet employé de se connecter au CRM.
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5 group">
                      <Label htmlFor="account_email" className="text-slate-700 font-bold text-xs">Email de connexion <span className="text-red-500">*</span></Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input
                          id="account_email"
                          name="account_email"
                          type="email"
                          required={formData.create_account}
                          value={formData.account_email || formData.email}
                          onChange={handleInputChange}
                          placeholder="agent@agence.com"
                          className="pl-10 h-10 bg-white border-slate-200 focus:border-indigo-500 rounded-xl text-sm"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5 group">
                      <Label htmlFor="account_password" className="text-slate-700 font-bold text-xs">Mot de passe initial <span className="text-red-500">*</span></Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input
                          id="account_password"
                          name="account_password"
                          type="password"
                          required={formData.create_account}
                          minLength={6}
                          value={formData.account_password}
                          onChange={handleInputChange}
                          placeholder="Min. 6 caractères"
                          className="pl-10 h-10 bg-white border-slate-200 focus:border-indigo-500 rounded-xl text-sm"
                        />
                      </div>
                    </div>

                    <div className="col-span-2 space-y-1.5">
                      <Label htmlFor="account_role" className="text-slate-700 font-bold text-xs">Rôle attribué</Label>
                      <select
                        id="account_role"
                        name="account_role"
                        value={formData.account_role}
                        onChange={handleInputChange}
                        className="w-full h-10 px-3 text-sm font-semibold rounded-xl border border-slate-200 bg-white focus:border-indigo-500 focus:outline-none cursor-pointer"
                      >
                        <option value="agent">Agent (Opérationnel : Ventes, Devis, Omra, Visas, Facturation, Clients...)</option>
                        <option value="admin">Administrateur (Accès total)</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="pt-6 flex items-center justify-end gap-3 border-t">
              <Button 
                type="button" 
                variant="ghost" 
                onClick={() => setIsAddModalOpen(false)}
                disabled={isSubmitting}
                className="font-bold text-slate-500 hover:text-slate-800 rounded-xl"
              >
                Annuler
              </Button>
              <Button 
                type="submit" 
                disabled={isSubmitting}
                className="bg-slate-900 hover:bg-indigo-600 text-white font-bold h-11 px-8 rounded-xl shadow-lg transition-all duration-300 hover:scale-105"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Création en cours...
                  </>
                ) : (
                  'Enregistrer le collaborateur'
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Création Compte pour employé existant */}
      <Dialog open={isAccountModalOpen} onOpenChange={setIsAccountModalOpen}>
        <DialogContent className="max-w-md p-0 overflow-hidden border-0 shadow-2xl rounded-2xl">
          <div className="bg-gradient-to-r from-indigo-900 to-slate-900 p-6 text-white">
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Key className="text-indigo-300" size={20} />
              Créer un Compte CRM
            </DialogTitle>
            <DialogDescription className="text-indigo-200 mt-1 text-xs">
              Pour <strong>{selectedEmpForAccount?.first_name} {selectedEmpForAccount?.last_name}</strong>
            </DialogDescription>
          </div>

          <form onSubmit={handleCreateAccountForExisting} className="p-6 space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">Email de connexion</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  type="email"
                  required
                  value={accountFormData.email}
                  onChange={(e) => setAccountFormData({ ...accountFormData, email: e.target.value })}
                  placeholder="employe@agence.com"
                  className="pl-10 h-10 rounded-xl"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">Mot de passe temporaire</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  type="password"
                  required
                  minLength={6}
                  value={accountFormData.password}
                  onChange={(e) => setAccountFormData({ ...accountFormData, password: e.target.value })}
                  placeholder="Min. 6 caractères"
                  className="pl-10 h-10 rounded-xl"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">Rôle attribué</Label>
              <select
                value={accountFormData.role}
                onChange={(e) => setAccountFormData({ ...accountFormData, role: e.target.value })}
                className="w-full h-10 px-3 text-sm font-semibold rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                <option value="agent">Agent (Opérationnel, sans accès finance/admin)</option>
                <option value="admin">Administrateur (Accès total)</option>
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t mt-6">
              <Button type="button" variant="outline" onClick={() => setIsAccountModalOpen(false)}>
                Annuler
              </Button>
              <Button type="submit" disabled={isSubmitting} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold">
                {isSubmitting ? <><Loader2 size={16} className="animate-spin mr-2" /> Création...</> : 'Créer les identifiants'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default RH;
