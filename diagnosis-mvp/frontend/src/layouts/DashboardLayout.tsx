import React, { useState, useEffect } from 'react'
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../App.tsx'
import { 
  LayoutDashboard, 
  HeartPulse, 
  Users, 
  BedDouble, 
  BarChart3, 
  LogOut, 
  Menu, 
  X, 
  FolderLock,
  MapPin
} from 'lucide-react'
import { DiagnosisLogo } from '../components/DiagnosisLogo.tsx'

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (!mobile) {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    // Run once on mount to ensure correct state
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Fechar menu mobile ao navegar
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const getMenuLinks = () => {
    console.log("Rendering menu for user role:", user?.role);
    const links = [
      { path: '/', label: 'Painel Geral', icon: LayoutDashboard, roles: ['ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST', 'SUPER_ADMIN'] },
      { path: '/triagem', label: 'Triagem / Fila', icon: HeartPulse, roles: ['ADMIN', 'NURSE', 'SUPER_ADMIN'] },
      { path: '/pacientes', label: 'Gestão de Pacientes', icon: Users, roles: ['ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST', 'SUPER_ADMIN'] },
      { path: '/leitos', label: 'Controle de Leitos', icon: BedDouble, roles: ['ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST', 'SUPER_ADMIN'] },
      { path: '/relatorios', label: 'Relatórios / UBS', icon: BarChart3, roles: ['ADMIN', 'DOCTOR', 'SUPER_ADMIN'] },
      { path: '/vigilancia', label: 'Vigilância Territorial', icon: MapPin, roles: ['ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST', 'SUPER_ADMIN'] },
      { path: '/admin', label: 'Gestão e Auditoria', icon: FolderLock, roles: ['ADMIN', 'SUPER_ADMIN'] }
    ];
    return links;
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const menuLinks = getMenuLinks();

  const SidebarContent = ({ onLinkClick }: { onLinkClick?: () => void }) => (
    <>
      {/* Logo */}
      <div style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '14px', borderBottom: '1px solid #E9EDF2' }}>
        <div style={{ background: '#F0F4F9', padding: '10px', borderRadius: '18px', width: '56px', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <DiagnosisLogo size={50} />
        </div>
        <div>
          <h1 style={{ fontWeight: 700, color: '#1A2C3E', fontSize: '15px', lineHeight: '1.2', margin: 0 }}>Diagnosis</h1>
          <span style={{ fontSize: '10px', color: '#5B6E8C', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 500 }}>Cuidado Clínico Inteligente</span>
        </div>
      </div>

      {/* Nav Links */}
      <nav style={{ flex: 1, padding: '24px 16px', overflowY: 'auto' }}>
        {menuLinks.map((link) => {
          const Icon = link.icon;
          const isActive = location.pathname === link.path;
          return (
            <Link
              key={link.path}
              to={link.path}
              onClick={onLinkClick}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 16px',
                borderRadius: '12px',
                fontSize: '14px',
                fontWeight: 500,
                textDecoration: 'none',
                marginBottom: '4px',
                transition: 'background 0.15s, color 0.15s',
                background: isActive ? '#F0F4F9' : 'transparent',
                color: isActive ? '#2C6E9C' : '#5B6E8C',
              }}
            >
              <Icon size={18} />
              {link.label}
            </Link>
          );
        })}
      </nav>

      {/* User Profile */}
      <div style={{ padding: '16px', borderTop: '1px solid #E9EDF2' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px', background: '#fff', padding: '12px', borderRadius: '16px', border: '1px solid #E9EDF2' }}>
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <div style={{ background: '#F0F4F9', border: '1px solid #E9EDF2', width: '44px', height: '44px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#2C6E9C', fontSize: '15px' }}>
              {user?.name?.substring(0, 2)?.toUpperCase() || 'US'}
            </div>
            <span style={{ position: 'absolute', bottom: 0, right: 0, width: '12px', height: '12px', borderRadius: '50%', background: '#2C7A4D', border: '2px solid white' }}></span>
          </div>
          <div style={{ overflow: 'hidden' }}>
            <p style={{ fontSize: '12px', fontWeight: 600, color: '#1A2C3E', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.name}</p>
            <span style={{ display: 'inline-block', fontSize: '9px', background: '#F0F4F9', color: '#2C6E9C', padding: '2px 8px', borderRadius: '20px', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, marginTop: '4px' }}>
              {user?.role === 'DOCTOR' ? 'MÉDICO' : user?.role === 'NURSE' ? 'ENFERMEIRO' : user?.role === 'RECEPTIONIST' ? 'RECEPÇÃO' : 'ADMINISTRADOR'}
            </span>
          </div>
        </div>
        <button
          onClick={handleLogout}
          style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '8px 16px', borderRadius: '12px', border: '1px solid #E9EDF2', background: '#fff', color: '#5B6E8C', fontSize: '12px', fontWeight: 600, cursor: 'pointer', transition: 'background 0.15s, color 0.15s' }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#FEF2F2'; (e.currentTarget as HTMLButtonElement).style.color = '#DC2626'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#fff'; (e.currentTarget as HTMLButtonElement).style.color = '#5B6E8C'; }}
        >
          <LogOut size={14} />
          Sair da conta
        </button>
      </div>
    </>
  );

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#F7F9FC', overflow: 'hidden', fontFamily: 'Inter, -apple-system, sans-serif', color: '#1A2C3E', position: 'relative' }}>
      
      {/* SIDEBAR - apenas desktop */}
      {!isMobile && (
        <aside style={{ width: '260px', flexShrink: 0, background: '#fff', borderRight: '1px solid #E9EDF2', display: 'flex', flexDirection: 'column', zIndex: 10 }}>
          <SidebarContent />
        </aside>
      )}

      {/* ÁREA PRINCIPAL */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative', zIndex: 1 }}>
        
        {/* TOP BAR - apenas mobile */}
        {isMobile && (
          <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderBottom: '1px solid #E9EDF2', background: '#fff', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <DiagnosisLogo size={40} />
              <span style={{ fontWeight: 700, fontSize: '20px', color: '#1A2C3E' }}>Diagnosis</span>
            </div>
            <button
              onClick={() => setMobileMenuOpen(true)}
              style={{ padding: '6px', borderRadius: '8px', border: '1px solid #E9EDF2', background: '#fff', color: '#5B6E8C', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <Menu size={20} />
            </button>
          </header>
        )}

        {/* MOBILE DRAWER OVERLAY */}
        {isMobile && (
          <div
            onClick={() => setMobileMenuOpen(false)}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 50,
              background: 'rgba(26, 44, 62, 0.5)',
              backdropFilter: mobileMenuOpen ? 'blur(4px)' : 'none',
              transition: 'opacity 0.25s ease',
              opacity: mobileMenuOpen ? 1 : 0,
              pointerEvents: mobileMenuOpen ? 'auto' : 'none',
            }}
          >
            <div
              onClick={e => e.stopPropagation()}
              style={{
                position: 'fixed',
                top: 0,
                right: 0,
                bottom: 0,
                width: '280px',
                maxWidth: '85vw',
                background: '#fff',
                borderLeft: '1px solid #E9EDF2',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '-8px 0 32px rgba(0,0,0,0.12)',
                transform: mobileMenuOpen ? 'translateX(0)' : 'translateX(100%)',
                transition: 'transform 0.25s ease',
              }}
            >
              {/* Botão fechar */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '16px', borderBottom: '1px solid #E9EDF2' }}>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  style={{ padding: '6px', borderRadius: '8px', border: '1px solid #E9EDF2', background: '#F7F9FC', color: '#5B6E8C', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                >
                  <X size={20} />
                </button>
              </div>
              <SidebarContent onLinkClick={() => setMobileMenuOpen(false)} />
            </div>
          </div>
        )}

        {/* CONTEÚDO PRINCIPAL */}
        <main style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '24px' : '32px' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
