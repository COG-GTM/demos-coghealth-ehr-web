import { BrowserRouter, Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  Users, 
  Calendar, 
  Pill, 
  FileText, 
  Settings,
  LayoutDashboard,
  Menu,
  User,
  LogOut,
  Search,
  Lock,
  Shield,
  FlaskConical,
  Activity
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
      {/* Application Header - Airbnb style */}
      <header className="bg-white border-b border-[#ebebeb] px-6 py-3">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-r from-[#E61E4D] to-[#D70466] rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">C</span>
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-[#222222] text-base leading-tight">CogHealth EHR</span>
              <span className="text-[#717171] text-[10px]">v4.2.1</span>
            </div>
          </div>

          {/* Center Nav - Airbnb-style icon tabs */}
          <nav className="hidden md:flex items-center space-x-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path || 
                (item.path === '/patients' && location.pathname.startsWith('/patients/'));
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex flex-col items-center px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-150 ${
                    isActive
                      ? 'text-[#FF385C] border-b-2 border-[#FF385C]'
                      : 'text-[#717171] hover:text-[#222222] hover:bg-[#f7f7f7]'
                  }`}
                >
                  <Icon className="w-5 h-5 mb-0.5" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Right section */}
          <div className="flex items-center space-x-4">
            {/* Global Patient Search - Airbnb search bar style */}
            <div className="relative">
              <div className="flex items-center bg-white border border-[#dddddd] rounded-full px-4 py-2 shadow-sm hover:shadow-md transition-shadow duration-200">
                <Search className="w-4 h-4 text-[#FF385C] mr-2" />
                <input
                  type="text"
                  placeholder="Patient search..."
                  value={globalSearch}
                  onChange={(e) => handleSearch(e.target.value)}
                  onFocus={() => globalSearch.length >= 2 && setShowSearchDropdown(true)}
                  onBlur={() => setTimeout(() => setShowSearchDropdown(false), 200)}
                  className="bg-transparent text-sm text-[#222222] placeholder-[#717171] w-40 focus:outline-none"
                />
              </div>
              {showSearchDropdown && searchResults.length > 0 && (
                <div className="absolute top-full left-0 mt-2 w-72 bg-white border border-[#ebebeb] rounded-xl shadow-lg z-50 overflow-hidden">
                  {searchResults.map((patient) => (
                    <div
                      key={patient.id}
                      onClick={() => selectPatient(patient.id)}
                      className="px-4 py-3 hover:bg-[#f7f7f7] cursor-pointer border-b border-[#ebebeb] last:border-b-0 transition-colors"
                    >
                      <div className="font-semibold text-[#222222] text-sm">{patient.name}</div>
                      <div className="text-[#717171] text-xs mt-0.5">{patient.mrn} &middot; DOB: {patient.dob}</div>
                    </div>
                  ))}
                </div>
              )}
              {showSearchDropdown && searchResults.length === 0 && globalSearch.length >= 2 && (
                <div className="absolute top-full left-0 mt-2 w-72 bg-white border border-[#ebebeb] rounded-xl shadow-lg z-50 p-4 text-sm text-[#717171]">
                  No patients found
                </div>
              )}
            </div>

            {/* Session & User Info */}
            <div className="hidden lg:flex items-center space-x-3 text-xs text-[#717171]">
              <span className="text-[#717171]">Springfield Medical Center</span>
              <div className="w-px h-4 bg-[#ebebeb]" />
              <div className="flex items-center space-x-1">
                <Lock className="w-3.5 h-3.5" />
                <span className={sessionTime < SESSION_WARNING_MS ? 'text-amber-500 font-semibold' : ''}>
                  Session: {formatSessionTime()}
                </span>
              </div>
            </div>

            {/* User Menu - Airbnb hamburger style */}
            <div className="relative">
              <div className="flex items-center border border-[#dddddd] rounded-full px-3 py-1.5 hover:shadow-md transition-shadow cursor-pointer space-x-2"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                <Menu className="w-4 h-4 text-[#717171]" />
                <div className="w-7 h-7 bg-[#717171] rounded-full flex items-center justify-center">
                  <User className="w-4 h-4 text-white" />
                </div>
              </div>

              {/* User dropdown */}
              {mobileMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-64 bg-white border border-[#ebebeb] rounded-xl shadow-lg z-50 overflow-hidden">
                <div className="px-4 py-3 border-b border-[#ebebeb]">
                  <div className="font-semibold text-sm text-[#222222]">Dr. Sarah Anderson</div>
                  <div className="text-xs text-[#717171]">Internal Medicine</div>
                </div>
                <div className="md:hidden">
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex items-center px-4 py-3 hover:bg-[#f7f7f7] text-sm text-[#222222] transition-colors"
                      >
                        <Icon className="w-4 h-4 mr-3 text-[#717171]" />
                        {item.label}
                      </Link>
                    );
                  })}
                  <div className="border-t border-[#ebebeb]" />
                </div>
                <button
                  onClick={() => { setMobileMenuOpen(false); onLogout(); }}
                  className="w-full flex items-center px-4 py-3 hover:bg-[#f7f7f7] text-sm text-[#222222] transition-colors"
                >
                  <LogOut className="w-4 h-4 mr-3 text-[#717171]" />
                  Logout
                </button>
              </div>
            )}
            </div>
          </div>
        </div>
      </header>
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
      <div className="h-screen flex flex-col bg-white" style={{ fontFamily: "'Nunito Sans', system-ui, -apple-system, sans-serif" }}>
        <Navigation 
          onSessionWarning={handleSessionWarning}
          onSessionExpired={handleSessionExpired}
          onLogout={handleLogout}
        />
        <main className="flex-1 overflow-hidden bg-[#f7f7f7]">
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

        {/* Status Bar - Airbnb-inspired clean style */}
        <div className="bg-white border-t border-[#ebebeb] flex items-center justify-between px-6 py-2 text-xs text-[#717171]">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1.5">
              <Shield className="w-3.5 h-3.5 text-emerald-500" />
              <span className="font-semibold">HIPAA Compliant</span>
            </div>
            <div className="w-px h-3 bg-[#ebebeb]" />
            <span>Encrypted Connection (TLS 1.3)</span>
            <div className="w-px h-3 bg-[#ebebeb]" />
            <span>Audit Logging: Active</span>
          </div>
          <div className="flex items-center space-x-4">
            <span>Database: Connected</span>
            <div className="w-px h-3 bg-[#ebebeb]" />
            <span>Last Sync: Just now</span>
            <div className="w-px h-3 bg-[#ebebeb]" />
            <span className="text-[#b0b0b0]">CogHealth EHR v4.2.1 - For Demo Use Only</span>
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
