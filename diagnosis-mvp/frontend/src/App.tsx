import React, { createContext, useContext, useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import Login from './pages/Login.tsx'
import DashboardLayout from './layouts/DashboardLayout.tsx'
import Dashboard from './pages/Dashboard.tsx'
import TriageQueue from './pages/TriageQueue.tsx'
import Patients from './pages/Patients.tsx'
import PatientTimeline from './pages/PatientTimeline.tsx'
import BedsGrid from './pages/BedsGrid.tsx'
import Reports from './pages/Reports.tsx'
import AdminPanel from './pages/AdminPanel.tsx'
import Surveillance from './pages/Surveillance.tsx'

interface AuthContextType {
  token: string | null;
  user: { name: string; email: string; role: string; crm?: string } | null;
  login: (token: string, refreshToken: string, name: string, email: string, role: string, crm?: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth deve ser usado dentro de um AuthProvider");
  return context;
};

export default function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [user, setUser] = useState<AuthContextType['user']>(() => {
    try {
      const savedUser = localStorage.getItem('user');
      return savedUser && savedUser !== 'undefined' ? JSON.parse(savedUser) : null;
    } catch (e) {
      localStorage.removeItem('user');
      return null;
    }
  });

  const login = (token: string, refreshToken: string, name: string, email: string, role: string, crm?: string) => {
    localStorage.setItem('token', token);
    localStorage.setItem('refreshToken', refreshToken);
    const userData = { name, email, role, crm };
    localStorage.setItem('user', JSON.stringify(userData));
    setToken(token);
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };

  // Rota privada guardada por autenticação
  const PrivateRoute = ({ children, allowedRoles }: { children: React.ReactNode; allowedRoles?: string[] }) => {
    if (!token) {
      return <Navigate to="/login" replace />;
    }
    if (allowedRoles && user && !allowedRoles.includes(user.role)) {
      return <Navigate to="/" replace />;
    }
    return <>{children}</>;
  };

  return (
    <AuthContext.Provider value={{ token, user, login, logout }}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={token ? <Navigate to="/" replace /> : <Login />} />
          
          <Route path="/" element={<PrivateRoute><DashboardLayout /></PrivateRoute>}>
            <Route index element={<Dashboard />} />
            
            <Route path="triagem" element={
              <PrivateRoute allowedRoles={['ADMIN', 'NURSE', 'SUPER_ADMIN']}><TriageQueue /></PrivateRoute>
            } />
            
            <Route path="pacientes" element={
              <PrivateRoute allowedRoles={['ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST', 'SUPER_ADMIN']}><Patients /></PrivateRoute>
            } />
            
            <Route path="pacientes/:patientId" element={
              <PrivateRoute allowedRoles={['ADMIN', 'DOCTOR', 'NURSE', 'SUPER_ADMIN']}><PatientTimeline /></PrivateRoute>
            } />
            
            <Route path="leitos" element={
              <PrivateRoute allowedRoles={['ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST', 'SUPER_ADMIN']}><BedsGrid /></PrivateRoute>
            } />
            
            <Route path="relatorios" element={
              <PrivateRoute allowedRoles={['ADMIN', 'DOCTOR', 'SUPER_ADMIN']}><Reports /></PrivateRoute>
            } />
            
            <Route path="vigilancia" element={
              <PrivateRoute allowedRoles={['ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST', 'SUPER_ADMIN']}><Surveillance /></PrivateRoute>
            } />
            
            <Route path="admin" element={
              <PrivateRoute allowedRoles={['ADMIN', 'SUPER_ADMIN']}><AdminPanel /></PrivateRoute>
            } />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthContext.Provider>
  )
}
