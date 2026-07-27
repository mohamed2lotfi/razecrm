import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import Login from '@/pages/Login';
import Ventes from '@/pages/Ventes';
import Clients from '@/pages/Clients';
import Facturation from '@/pages/Facturation';
import MasterData from '@/pages/MasterData';
import Pipeline from '@/pages/Pipeline';
import Omra from '@/pages/Omra';
import OmraGroupDetails from '@/pages/OmraGroupDetails';
import Outcomes from '@/pages/Outcomes';
import Rapports from '@/pages/Rapports';

const PrivateRoute = ({ children }) => {
  const { session } = useAuth();
  
  if (!session) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          {/* Protected Routes */}
          <Route path="/" element={<PrivateRoute><Ventes /></PrivateRoute>} />
          <Route path="/pipeline" element={<PrivateRoute><Pipeline /></PrivateRoute>} />
          <Route path="/omra" element={<PrivateRoute><Omra /></PrivateRoute>} />
          <Route path="/omra/group/:id" element={<PrivateRoute><OmraGroupDetails /></PrivateRoute>} />
          <Route path="/clients" element={<PrivateRoute><Clients /></PrivateRoute>} />
          <Route path="/facturation" element={<PrivateRoute><Facturation /></PrivateRoute>} />
          <Route path="/outcomes" element={<PrivateRoute><Outcomes /></PrivateRoute>} />
          <Route path="/reports" element={<PrivateRoute><Rapports /></PrivateRoute>} />
          <Route path="/master-data" element={<PrivateRoute><MasterData /></PrivateRoute>} />
          
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
