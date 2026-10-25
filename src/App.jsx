import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { SidebarProvider } from '@/contexts/SidebarContext';
import Login from '@/pages/Login';
import Dashboard from '@/pages/Dashboard';
import Ventes from '@/pages/Ventes';
import Paiements from '@/pages/Paiements';
import Clients from '@/pages/Clients';
import Facturation from '@/pages/Facturation';
import MasterData from '@/pages/MasterData';
import Pipeline from '@/pages/Pipeline';
import Omra from '@/pages/Omra';
import OmraGroupDetails from '@/pages/OmraGroupDetails';
import Pelerins from '@/pages/Pelerins';
import Outcomes from '@/pages/Outcomes';
import Rapports from '@/pages/Rapports';
import Documents from '@/pages/Documents';
import RH from '@/pages/RH';
import Visas from '@/pages/Visas';
import BanqueContacts from '@/pages/BanqueContacts';
import EmailMarketing from '@/pages/EmailMarketing';
import Packages from '@/pages/Packages';
import SimulateurDevis from '@/pages/SimulateurDevis';
import Profile from '@/pages/Profile';
import WebsiteManagement from '@/pages/WebsiteManagement';
import Telex from '@/pages/Telex';
import OmraTracking from '@/pages/OmraTracking';
import BadgeBuilder from '@/pages/BadgeBuilder';

const RoleRoute = ({ children, allowedRoles = ['admin', 'agent', 'manager'] }) => {
  const { session, role } = useAuth();
  
  if (!session) {
    return <Navigate to="/login" replace />;
  }

  // Vérifier si le rôle de l'utilisateur est autorisé
  const userRole = role || 'agent';
  if (!allowedRoles.includes(userRole)) {
    return <Navigate to="/" replace />;
  }
  
  return children;
};

function App() {
  return (
    <AuthProvider>
      <SidebarProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            
            {/* Routes Opérationnelles (Admin, Agent & Manager) */}
            <Route path="/" element={<RoleRoute allowedRoles={['admin', 'agent', 'manager']}><Dashboard /></RoleRoute>} />
            <Route path="/dashboard" element={<RoleRoute allowedRoles={['admin', 'agent', 'manager']}><Dashboard /></RoleRoute>} />
            <Route path="/ventes" element={<RoleRoute allowedRoles={['admin', 'agent', 'manager']}><Ventes /></RoleRoute>} />
            <Route path="/paiements" element={<RoleRoute allowedRoles={['admin', 'agent', 'manager']}><Paiements /></RoleRoute>} />
            <Route path="/pipeline" element={<RoleRoute allowedRoles={['admin', 'agent', 'manager']}><Pipeline /></RoleRoute>} />
            <Route path="/simulateur-devis" element={<RoleRoute allowedRoles={['admin', 'agent', 'manager']}><SimulateurDevis /></RoleRoute>} />
            <Route path="/profil" element={<RoleRoute allowedRoles={['admin', 'agent', 'manager']}><Profile /></RoleRoute>} />
            <Route path="/profile" element={<RoleRoute allowedRoles={['admin', 'agent', 'manager']}><Profile /></RoleRoute>} />
            <Route path="/omra" element={<RoleRoute allowedRoles={['admin', 'agent', 'manager']}><Omra /></RoleRoute>} />
            <Route path="/omra/pelerins" element={<RoleRoute allowedRoles={['admin', 'agent', 'manager']}><Pelerins /></RoleRoute>} />
            <Route path="/omra/badges" element={<RoleRoute allowedRoles={['admin', 'agent', 'manager']}><BadgeBuilder /></RoleRoute>} />
            <Route path="/badges" element={<RoleRoute allowedRoles={['admin', 'agent', 'manager']}><BadgeBuilder /></RoleRoute>} />
            <Route path="/omra/group/:id" element={<RoleRoute allowedRoles={['admin', 'agent', 'manager']}><OmraGroupDetails /></RoleRoute>} />
            <Route path="/packages" element={<RoleRoute allowedRoles={['admin', 'agent', 'manager']}><Packages /></RoleRoute>} />
            <Route path="/clients" element={<RoleRoute allowedRoles={['admin', 'agent', 'manager']}><Clients /></RoleRoute>} />
            <Route path="/documents" element={<RoleRoute allowedRoles={['admin', 'agent', 'manager']}><Documents /></RoleRoute>} />
            <Route path="/telex" element={<RoleRoute allowedRoles={['admin', 'agent', 'manager']}><Telex /></RoleRoute>} />
            <Route path="/billets-telex" element={<RoleRoute allowedRoles={['admin', 'agent', 'manager']}><Telex /></RoleRoute>} />
            <Route path="/facturation" element={<RoleRoute allowedRoles={['admin', 'agent', 'manager']}><Facturation /></RoleRoute>} />
            <Route path="/visas" element={<RoleRoute allowedRoles={['admin', 'agent', 'manager']}><Visas /></RoleRoute>} />
            <Route path="/banque-contacts" element={<RoleRoute allowedRoles={['admin', 'agent', 'manager']}><BanqueContacts /></RoleRoute>} />
            <Route path="/marketing" element={<RoleRoute allowedRoles={['admin', 'agent', 'manager']}><EmailMarketing /></RoleRoute>} />
            <Route path="/website" element={<RoleRoute allowedRoles={['admin', 'agent', 'manager']}><WebsiteManagement /></RoleRoute>} />
            
            {/* Routes Administratives & Financières (Admin Uniquement) */}
            <Route path="/omra/tracking" element={<RoleRoute allowedRoles={['admin']}><OmraTracking /></RoleRoute>} />
            <Route path="/outcomes" element={<RoleRoute allowedRoles={['admin']}><Outcomes /></RoleRoute>} />
            <Route path="/reports" element={<RoleRoute allowedRoles={['admin']}><Rapports /></RoleRoute>} />
            <Route path="/rh" element={<RoleRoute allowedRoles={['admin']}><RH /></RoleRoute>} />
            <Route path="/master-data" element={<RoleRoute allowedRoles={['admin', 'agent']}><MasterData /></RoleRoute>} />
            
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </SidebarProvider>
    </AuthProvider>
  );
}


export default App;
