import { BrowserRouter, Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Menu,
  X,
  User,
  LogOut,
  Search,
  Lock,
  Shield
} from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import PatientSearchPage from './pages/PatientSearchPage';
import PatientChartPage from './pages/PatientChartPage';
import DashboardPage from './pages/DashboardPage';
import SchedulePage from './pages/SchedulePage';
import MedicationsPage from './pages/MedicationsPage';
import ReportsPage from './pages/ReportsPage';
import SettingsPage from './pages/SettingsPage';
import LabResultsPage from './pages/LabResultsPage';
import VitalsPage from './pages/VitalsPage';
import { AlertDialog, ConfirmDialog } from './components/ui/Modal';
import ClinicalCommandPalette from './components/ui/ClinicalCommandPalette';
import { logLogout } from './services/auditService';
import { demoPatients, formatPatientDob, formatPatientName } from './data/demoPatients';
import { navItems } from './data/navigation';
import { clearRecentPatients } from './utils/commandPalette';

const SESSION_TIMEOUT_MS = 15 * 60 * 1000;
const SESSION_WARNING_MS = 2 * 60 * 1000;

interface NavigationProps {
  onSessionWarning: () => void;
  onSessionExpired: () => void;
  onLogout: () => void;
}

function Navigation({ onSessionWarning, onSessionExpired, onLogout }: NavigationProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');
  const [searchResults, setSearchResults] = useState<typeof demoPatients>([]);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [sessionTime, setSessionTime] = useState(SESSION_TIMEOUT_MS);

  useEffect(() => {
    const interval = setInterval(() => {
      setSessionTime(prev => {
        const newTime = prev - 1000;
        if (newTime <= 0) {
          onSessionExpired();
          return SESSION_TIMEOUT_MS;
        }
        if (newTime === SESSION_WARNING_MS) {
          onSessionWarning();
        }
        return newTime;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [onSessionWarning, onSessionExpired]);

  const resetSession = useCallback(() => {
    setSessionTime(SESSION_TIMEOUT_MS);
  }, []);

  useEffect(() => {
    const handleActivity = () => resetSession();
    window.addEventListener('click', handleActivity);
    window.addEventListener('keypress', handleActivity);
    return () => {
      window.removeEventListener('click', handleActivity);
      window.removeEventListener('keypress', handleActivity);
    };
  }, [resetSession]);

  const handleSearch = (query: string) => {
    setGlobalSearch(query);
    if (query.length >= 2) {
      const results = demoPatients.filter(p =>
        formatPatientName(p).toLowerCase().includes(query.toLowerCase()) ||
        (p.mrn ?? '').toLowerCase().includes(query.toLowerCase()) ||
        formatPatientDob(p.dateOfBirth).includes(query)
      );
      setSearchResults(results);
      setShowSearchDropdown(true);
    } else {
      setSearchResults([]);
      setShowSearchDropdown(false);
    }
  };

  const selectPatient = (patientId: number | undefined) => {
    if (!patientId) return;
    setGlobalSearch('');
    setShowSearchDropdown(false);
    navigate(`/patients/${patientId}`);
  };

  const formatSessionTime = () => {
    const mins = Math.floor(sessionTime / 60000);
    const secs = Math.floor((sessionTime % 60000) / 1000);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <>
      {/* Application Header */}
      <div className="ehr-header flex items-center justify-between px-3">
        <div className="flex items-center space-x-3">
          <div className="w-5 h-5 bg-white flex items-center justify-center border border-blue-300">
            <span className="text-blue-800 font-bold text-[11px]">C</span>
          </div>
          <span className="font-semibold">CogHealth EHR</span>
          <span className="text-blue-200 text-[10px]">v4.2.1</span>
          <span className="text-blue-300">|</span>
          {/* Global Patient Search */}
          <div className="relative">
            <div className="flex items-center">
              <Search className="w-3 h-3 text-blue-200 mr-1" />
              <input
                type="text"
                placeholder="Patient search..."
                value={globalSearch}
                onChange={(e) => handleSearch(e.target.value)}
                onFocus={() => globalSearch.length >= 2 && setShowSearchDropdown(true)}
                onBlur={() => setTimeout(() => setShowSearchDropdown(false), 200)}
                className="bg-blue-900/50 border border-blue-400 text-white placeholder-blue-300 text-[10px] px-2 py-0.5 w-40 focus:outline-none focus:border-white"
              />
              <span className="ml-1 text-[9px] text-blue-200 border border-blue-300/60 px-1">Ctrl+K</span>
            </div>
            {showSearchDropdown && searchResults.length > 0 && (
              <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-gray-400 shadow-lg z-50">
                {searchResults.map((patient) => (
                  <div
                    key={patient.id}
                    onClick={() => selectPatient(patient.id)}
                    className="px-2 py-1.5 hover:bg-blue-100 cursor-pointer text-[11px] text-gray-800 border-b border-gray-200"
                  >
                    <div className="font-semibold">{formatPatientName(patient)}</div>
                    <div className="text-gray-500 text-[10px]">{patient.mrn} • DOB: {formatPatientDob(patient.dateOfBirth)}</div>
                  </div>
                ))}
              </div>
            )}
            {showSearchDropdown && searchResults.length === 0 && globalSearch.length >= 2 && (
              <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-gray-400 shadow-lg z-50 p-2 text-[11px] text-gray-500">
                No patients found
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center space-x-3 text-[10px]">
          <span className="text-blue-100">Springfield Medical Center</span>
          <span className="text-blue-300">|</span>
          <div className="flex items-center space-x-1">
            <Lock className="w-3 h-3" />
            <span className={sessionTime < SESSION_WARNING_MS ? 'text-yellow-300' : 'text-blue-200'}>
              Session: {formatSessionTime()}
            </span>
          </div>
          <span className="text-blue-300">|</span>
          <div className="flex items-center space-x-1">
            <User className="w-3 h-3" />
            <span>Dr. Sarah Anderson</span>
          </div>
          <button onClick={onLogout} className="flex items-center space-x-1 hover:text-white text-blue-200">
            <LogOut className="w-3 h-3" />
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* Navigation Toolbar */}
      <div className="ehr-toolbar flex items-center justify-between">
        <div className="flex items-center space-x-0.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path || 
              (item.path === '/patients' && location.pathname.startsWith('/patients/'));
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`ehr-toolbar-button flex items-center ${isActive ? 'ehr-toolbar-button-active' : ''}`}
              >
                <Icon className="w-3.5 h-3.5 mr-1" />
                {item.label}
              </Link>
            );
          })}
        </div>

        <div className="flex items-center space-x-2 text-[10px] text-gray-600">
          <span>{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
          <span className="text-gray-400">|</span>
          <span>{new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
        </div>

        {/* Mobile menu button */}
        <button
          className="md:hidden p-1 hover:bg-gray-200"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
        </button>
      </div>

      {mobileMenuOpen && (
        <div className="md:hidden border-t border-gray-300 bg-white">
          <div className="px-2 py-1 space-y-0.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center px-2 py-1.5 text-[11px] ${
                    isActive
                      ? 'bg-blue-100 border border-blue-300'
                      : 'hover:bg-gray-100'
                  }`}
                >
                  <Icon className="w-4 h-4 mr-2" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}

function App() {
  const [showSessionWarning, setShowSessionWarning] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showSessionExpired, setShowSessionExpired] = useState(false);

  const handleSessionWarning = useCallback(() => {
    setShowSessionWarning(true);
  }, []);

  const handleSessionExpired = useCallback(() => {
    setShowSessionExpired(true);
  }, []);

  const handleLogout = useCallback(() => {
    setShowLogoutConfirm(true);
  }, []);

  const performLogout = (reason: 'manual' | 'timeout' = 'manual') => {
    clearRecentPatients();
    logLogout(reason);
    window.location.reload();
  };

  return (
    <BrowserRouter>
      <div className="h-screen flex flex-col" style={{ background: '#d4d0c8', fontFamily: 'Tahoma, sans-serif' }}>
        <Navigation 
          onSessionWarning={handleSessionWarning}
          onSessionExpired={handleSessionExpired}
          onLogout={handleLogout}
        />
        <main className="flex-1 overflow-hidden">
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/patients" element={<PatientSearchPage />} />
            <Route path="/patients/:id" element={<PatientChartPage />} />
            <Route path="/schedule" element={<SchedulePage />} />
            <Route path="/labs" element={<LabResultsPage />} />
            <Route path="/vitals" element={<VitalsPage />} />
            <Route path="/medications" element={<MedicationsPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </main>

        <ClinicalCommandPalette onLogout={handleLogout} />

        {/* Status Bar - Windows XP style */}
        <div className="h-5 bg-gradient-to-b from-[#ece9d8] to-[#d4d0c8] border-t border-gray-400 flex items-center justify-between px-2 text-[10px] text-gray-600">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1">
              <Shield className="w-3 h-3 text-green-600" />
              <span>HIPAA Compliant</span>
            </div>
            <span className="text-gray-400">|</span>
            <span>Encrypted Connection (TLS 1.3)</span>
            <span className="text-gray-400">|</span>
            <span>Audit Logging: Active</span>
          </div>
          <div className="flex items-center space-x-4">
            <span>Database: Connected</span>
            <span className="text-gray-400">|</span>
            <span>Last Sync: Just now</span>
            <span className="text-gray-400">|</span>
            <span className="text-gray-500">CogHealth EHR v4.2.1 - For Demo Use Only</span>
          </div>
        </div>

        {/* Session Warning Dialog */}
        <ConfirmDialog
          isOpen={showSessionWarning}
          onClose={() => setShowSessionWarning(false)}
          onConfirm={() => setShowSessionWarning(false)}
          title="Session Timeout Warning"
          message="Your session will expire in 2 minutes due to inactivity. Click 'Continue' to extend your session."
          confirmText="Continue Session"
          cancelText="Logout Now"
          type="warning"
        />

        {/* Session Expired Dialog */}
        <AlertDialog
          isOpen={showSessionExpired}
          onClose={() => performLogout('timeout')}
          title="Session Expired"
          message="Your session has expired due to inactivity. You will be logged out for security purposes. Please log in again to continue."
          type="warning"
        />

        {/* Logout Confirmation */}
        <ConfirmDialog
          isOpen={showLogoutConfirm}
          onClose={() => setShowLogoutConfirm(false)}
          onConfirm={() => performLogout('manual')}
          title="Confirm Logout"
          message="Are you sure you want to log out? Any unsaved changes will be lost."
          confirmText="Logout"
          cancelText="Cancel"
          type="warning"
        />
      </div>
    </BrowserRouter>
  );
}

export default App;
