import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plane, Lock, Mail, AlertCircle } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await signIn(email, password);
      navigate('/');
    } catch (err) {
      console.error(err);
      setError('Identifiants incorrects. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-muted/20 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md bg-card rounded-2xl shadow-xl border overflow-hidden">
        <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent px-8 py-10 text-center border-b">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-4">
            <Plane className="text-primary" size={32} />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground">CRM Agence</h1>
          <p className="text-sm text-muted-foreground mt-2">Connectez-vous pour accéder à votre espace de gestion</p>
        </div>

        <div className="p-8">
          {error && (
            <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-xl flex items-center gap-3 text-destructive text-sm font-medium">
              <AlertCircle size={18} />
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <Label className="text-sm font-bold text-foreground flex items-center gap-2">
                <Mail size={14} className="text-muted-foreground" /> Email
              </Label>
              <Input 
                type="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@agence.com" 
                required
                className="h-11 bg-muted/20 focus-visible:bg-transparent transition-colors"
              />
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Lock size={14} className="text-muted-foreground" /> Mot de passe
                </Label>
              </div>
              <Input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••" 
                required
                className="h-11 bg-muted/20 focus-visible:bg-transparent transition-colors"
              />
            </div>

            <Button type="submit" disabled={loading} className="w-full h-11 text-base font-bold mt-4">
              {loading ? 'Connexion en cours...' : 'Se connecter'}
            </Button>
          </form>
        </div>
      </div>
      <p className="text-xs text-muted-foreground mt-8 font-medium tracking-wider uppercase">
        © {new Date().getFullYear()} Antigravity CRM
      </p>
    </div>
  );
};

export default Login;
