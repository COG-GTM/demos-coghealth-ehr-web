import { BrowserRouter, Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  Users, 
  Calendar, 
  Pill, 
  FileText, 
  Settings,
  LayoutDashboard,
  Menu,
  X,
  User,
  LogOut,
  Search,
  Lock,
  Shield,
  FlaskConical,
  Activity,
  Globe
} from 'lucide-react';
import { useState, useEffect, useCallback, useRef } from 'react';
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
import { logLogout } from './services/auditService';

const SESSION_TIMEOUT_MS = 15 * 60 * 1000;
const SESSION_WARNING_MS = 2 * 60 * 1000;

const defaultPatientSearch = [
  { id: 1, name: 'Smith, John', mrn: 'MRN001234', dob: '03/15/1965' },
  { id: 2, name: 'Johnson, Sarah', mrn: 'MRN001235', dob: '07/22/1978' },
  { id: 3, name: 'Williams, Michael', mrn: 'MRN001236', dob: '11/08/1952' },
  { id: 4, name: 'Brown, Emily', mrn: 'MRN001237', dob: '04/30/1989' },
  { id: 5, name: 'Davis, Robert', mrn: 'MRN001238', dob: '08/20/1945' },
  { id: 6, name: 'Martinez, Maria', mrn: 'MRN001240', dob: '12/05/1970' },
];

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
  const [searchResults, setSearchResults] = useState<typeof defaultPatientSearch>([]);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [sessionTime, setSessionTime] = useState(SESSION_TIMEOUT_MS);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close user menu on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };
    if (showUserMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showUserMenu]);

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
      const results = defaultPatientSearch.filter(p =>
        p.name.toLowerCase().includes(query.toLowerCase()) ||
        p.mrn.toLowerCase().includes(query.toLowerCase())
      );
      setSearchResults(results);
      setShowSearchDropdown(true);
    } else {
      setSearchResults([]);
      setShowSearchDropdown(false);
    }
  };

  const selectPatient = (patientId: number) => {
    setGlobalSearch('');
    setShowSearchDropdown(false);
    navigate(`/patients/${patientId}`);
  };

  const formatSessionTime = () => {
    const mins = Math.floor(sessionTime / 60000);
    const secs = Math.floor((sessionTime % 60000) / 1000);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const navItems = [
    { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/patients', icon: Users, label: 'Patients' },
    { path: '/schedule', icon: Calendar, label: 'Schedule' },
    { path: '/labs', icon: FlaskConical, label: 'Lab Results' },
    { path: '/vitals', icon: Activity, label: 'Vitals' },
    { path: '/medications', icon: Pill, label: 'Medications' },
    { path: '/reports', icon: FileText, label: 'Reports' },
    { path: '/settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <>
      {/* Airbnb-style Application Header */}
      <div className="bg-white border-b border-[#EBEBEB] px-6 py-3">
        <div className="flex items-center justify-between max-w-[1760px] mx-auto">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2 shrink-0">
            <div className="w-8 h-8 bg-gradient-to-br from-[#FF385C] to-[#E31C5F] rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-sm">C</span>
            </div>
            <span className="font-bold text-[#FF385C] text-xl tracking-tight hidden sm:inline">coghealth</span>
          </Link>

          {/* Airbnb-style pill search bar */}
          <div className="relative flex-1 max-w-2xl mx-8">
            <div className="flex items-center bg-white border border-[#DDDDDD] rounded-full shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center flex-1 px-6 py-2.5">
                <Search className="w-4 h-4 text-[#222222] mr-3 shrink-0" />
                <input
                  type="text"
                  placeholder="Patient search..."
                  value={globalSearch}
                  onChange={(e) => handleSearch(e.target.value)}
                  onFocus={() => globalSearch.length >= 2 && setShowSearchDropdown(true)}
                  onBlur={() => setTimeout(() => setShowSearchDropdown(false), 200)}
                  className="w-full bg-transparent text-[#222222] placeholder-[#717171] text-sm focus:outline-none"
                />
              </div>
              <button className="bg-[#FF385C] hover:bg-[#E0294D] text-white rounded-full p-2.5 mr-1.5 transition-colors">
                <Search className="w-4 h-4" />
              </button>
            </div>

            {/* Search dropdown */}
            {showSearchDropdown && searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-lg border border-[#EBEBEB] z-50 overflow-hidden">
                {searchResults.map((patient) => (
                  <div
                    key={patient.id}
                    onClick={() => selectPatient(patient.id)}
                    className="px-5 py-3.5 hover:bg-[#F7F7F7] cursor-pointer transition-colors"
                  >
                    <div className="font-semibold text-[#222222] text-sm">{patient.name}</div>
                    <div className="text-[#717171] text-xs mt-0.5">{patient.mrn} · DOB: {patient.dob}</div>
                  </div>
                ))}
              </div>
            )}
            {showSearchDropdown && searchResults.length === 0 && globalSearch.length >= 2 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-lg border border-[#EBEBEB] z-50 p-5 text-sm text-[#717171]">
                No patients found
              </div>
            )}
          </div>

          {/* Right side controls */}
          <div className="flex items-center space-x-3 shrink-0">
            <span className="text-[#222222] text-sm font-medium hidden lg:inline">Springfield Medical Center</span>
            <div className="flex items-center space-x-1 px-3 py-1.5 rounded-full bg-[#F7F7F7]">
              <Lock className="w-3.5 h-3.5 text-[#717171]" />
              <span className={`text-xs font-medium ${sessionTime < SESSION_WARNING_MS ? 'text-[#FF385C]' : 'text-[#717171]'}`}>
                Session: {formatSessionTime()}
              </span>
            </div>
            <button className="p-2.5 rounded-full hover:bg-[#F7F7F7] transition-colors">
              <Globe className="w-4 h-4 text-[#222222]" />
            </button>
            {/* User menu */}
            <div className="relative" ref={userMenuRef}>
              <button 
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center space-x-2 border border-[#DDDDDD] rounded-full py-1.5 px-3 hover:shadow-md transition-shadow"
              >
                <Menu className="w-4 h-4 text-[#222222]" />
                <div className="w-7 h-7 bg-[#222222] rounded-full flex items-center justify-center">
                  <User className="w-4 h-4 text-white" />
                </div>
              </button>
              {showUserMenu && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-2xl shadow-lg border border-[#EBEBEB] z-50 py-2">
                  <div className="px-4 py-3 border-b border-[#EBEBEB]">
                    <div className="font-semibold text-sm text-[#222222]">Dr. Sarah Anderson</div>
                    <div className="text-xs text-[#717171] mt-0.5">Internal Medicine</div>
                  </div>
                  <button 
                    onClick={onLogout} 
                    className="w-full text-left px-4 py-2.5 text-sm text-[#222222] hover:bg-[#F7F7F7] flex items-center space-x-2 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Logout</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Airbnb-style category navigation */}
      <div className="bg-white border-b border-[#EBEBEB] px-6">
        <div className="max-w-[1760px] mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-1 overflow-x-auto py-3 hide-scrollbar">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path || 
                (item.path === '/patients' && location.pathname.startsWith('/patients/'));
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex flex-col items-center px-4 py-2 rounded-xl min-w-fit transition-all ${
                    isActive 
                      ? 'text-[#222222] bg-[#F7F7F7]' 
                      : 'text-[#717171] hover:text-[#222222] hover:bg-[#F7F7F7]'
                  }`}
                >
                  <Icon className={`w-5 h-5 mb-1 ${isActive ? 'text-[#FF385C]' : ''}`} />
                  <span className={`text-xs whitespace-nowrap ${isActive ? 'font-bold' : 'font-medium'}`}>{item.label}</span>
                  {isActive && <div className="w-6 h-0.5 bg-[#222222] rounded-full mt-1" />}
                </Link>
              );
            })}
          </div>

          <div className="flex items-center space-x-3 text-xs text-[#717171] shrink-0 ml-4">
            <span>{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
            <span className="w-1 h-1 bg-[#DDDDDD] rounded-full" />
            <span>{new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden p-2 rounded-full hover:bg-[#F7F7F7]"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="md:hidden border-b border-[#EBEBEB] bg-white">
          <div className="px-4 py-2 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center px-4 py-3 rounded-xl text-sm ${
                    isActive
                      ? 'bg-[#F7F7F7] text-[#222222] font-semibold'
                      : 'text-[#717171] hover:bg-[#F7F7F7]'
                  }`}
                >
                  <Icon className={`w-5 h-5 mr-3 ${isActive ? 'text-[#FF385C]' : ''}`} />
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
    logLogout(reason);
    window.location.reload();
  };

  return (
    <BrowserRouter>
      <div className="h-screen flex flex-col bg-white" style={{ fontFamily: "'Nunito Sans', 'DM Sans', system-ui, sans-serif" }}>
        <Navigation 
          onSessionWarning={handleSessionWarning}
          onSessionExpired={handleSessionExpired}
          onLogout={handleLogout}
        />
        <main className="flex-1 overflow-hidden bg-white">
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

        {/* Airbnb-style footer status bar */}
        <div className="bg-white border-t border-[#EBEBEB] flex items-center justify-between px-6 py-2">
          <div className="flex items-center space-x-4 text-xs text-[#717171]">
            <div className="flex items-center space-x-1.5">
              <Shield className="w-3.5 h-3.5 text-emerald-500" />
              <span>HIPAA Compliant</span>
            </div>
            <span className="w-1 h-1 bg-[#DDDDDD] rounded-full" />
            <span>Encrypted Connection (TLS 1.3)</span>
            <span className="w-1 h-1 bg-[#DDDDDD] rounded-full" />
            <span>Audit Logging: Active</span>
          </div>
          <div className="flex items-center space-x-4 text-xs text-[#717171]">
            <span>Database: Connected</span>
            <span className="w-1 h-1 bg-[#DDDDDD] rounded-full" />
            <span>Last Sync: Just now</span>
            <span className="w-1 h-1 bg-[#DDDDDD] rounded-full" />
            <span>CogHealth EHR v4.2.1 - For Demo Use Only</span>
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
