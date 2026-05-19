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
  Bell
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
      {/* Top Header Bar */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-[#ebebeb] bg-white">
        <div className="flex items-center space-x-4">
          <Link to="/" className="flex items-center space-x-2 group">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(to right, #e61e4d, #e31c5f, #d70466)' }}>
              <span className="text-white font-extrabold text-sm">C</span>
            </div>
            <span className="font-bold text-lg text-[#222222] group-hover:text-[#ff385c] transition-colors">CogHealth</span>
          </Link>
          <span className="text-[11px] font-semibold text-[#717171] bg-[#f7f7f7] px-2 py-0.5 rounded-full">v4.2.1</span>
        </div>

        {/* Center Search Bar - Airbnb pill style */}
        <div className="relative flex-1 max-w-xl mx-8">
          <div className="flex items-center bg-white border border-[#dddddd] rounded-full px-4 py-2.5 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
            <Search className="w-4 h-4 text-[#ff385c] mr-3 flex-shrink-0" />
            <input
              type="text"
              placeholder="Search patients by name or MRN..."
              value={globalSearch}
              onChange={(e) => handleSearch(e.target.value)}
              onFocus={() => globalSearch.length >= 2 && setShowSearchDropdown(true)}
              onBlur={() => setTimeout(() => setShowSearchDropdown(false), 200)}
              className="flex-1 bg-transparent outline-none text-sm text-[#222222] placeholder-[#717171]"
            />
            {globalSearch && (
              <button onClick={() => { setGlobalSearch(''); setShowSearchDropdown(false); }} className="ml-2">
                <X className="w-4 h-4 text-[#717171] hover:text-[#222222]" />
              </button>
            )}
          </div>
          {showSearchDropdown && searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-[#ebebeb] rounded-2xl shadow-lg z-50 overflow-hidden animate-fadeIn">
              {searchResults.map((patient) => (
                <div
                  key={patient.id}
                  onClick={() => selectPatient(patient.id)}
                  className="px-5 py-3.5 hover:bg-[#f7f7f7] cursor-pointer transition-colors border-b border-[#f0f0f0] last:border-b-0"
                >
                  <div className="font-semibold text-[#222222] text-sm">{patient.name}</div>
                  <div className="text-[#717171] text-xs mt-0.5">{patient.mrn} · DOB: {patient.dob}</div>
                </div>
              ))}
            </div>
          )}
          {showSearchDropdown && searchResults.length === 0 && globalSearch.length >= 2 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-[#ebebeb] rounded-2xl shadow-lg z-50 p-5 text-sm text-[#717171] animate-fadeIn">
              No patients found
            </div>
          )}
        </div>

        {/* Right side controls */}
        <div className="flex items-center space-x-3">
          <span className="text-xs text-[#717171] hidden lg:block">Springfield Medical Center</span>
          <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-[#f7f7f7]">
            <Lock className="w-3.5 h-3.5 text-[#717171]" />
            <span className={`text-xs font-semibold ${sessionTime < SESSION_WARNING_MS ? 'text-[#ff385c]' : 'text-[#484848]'}`}>
              {formatSessionTime()}
            </span>
          </div>
          <button className="relative p-2 rounded-full hover:bg-[#f7f7f7] transition-colors">
            <Bell className="w-5 h-5 text-[#484848]" />
            <span className="absolute top-0.5 right-0.5 w-4 h-4 bg-[#ff385c] text-white text-[9px] font-bold flex items-center justify-center rounded-full">3</span>
          </button>
          <div className="flex items-center space-x-2 pl-3 border-l border-[#ebebeb]">
            <div className="w-8 h-8 rounded-full bg-[#222222] flex items-center justify-center">
              <User className="w-4 h-4 text-white" />
            </div>
            <div className="hidden md:block">
              <div className="text-xs font-semibold text-[#222222]">Dr. Sarah Anderson</div>
              <div className="text-[10px] text-[#717171]">Internal Medicine</div>
            </div>
          </div>
          <button 
            onClick={onLogout} 
            className="p-2 rounded-full hover:bg-[#fff1f2] text-[#717171] hover:text-[#ff385c] transition-colors"
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Navigation Bar */}
      <div className="flex items-center justify-between px-6 py-2 border-b border-[#ebebeb] bg-white">
        <div className="flex items-center space-x-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path || 
              (item.path === '/patients' && location.pathname.startsWith('/patients/'));
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center space-x-1.5 px-3 py-2 rounded-full text-sm font-semibold transition-all ${
                  isActive 
                    ? 'bg-[#222222] text-white' 
                    : 'text-[#484848] hover:bg-[#f7f7f7] hover:text-[#222222]'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>

        <div className="flex items-center space-x-3 text-xs text-[#717171]">
          <span>{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
          <span className="w-1 h-1 rounded-full bg-[#d1d1d1]" />
          <span>{new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
        </div>

        {/* Mobile menu button */}
        <button
          className="md:hidden p-2 rounded-full hover:bg-[#f7f7f7]"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {mobileMenuOpen && (
        <div className="md:hidden border-b border-[#ebebeb] bg-white animate-fadeIn">
          <div className="px-4 py-2 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center px-4 py-3 rounded-xl text-sm font-semibold ${
                    isActive
                      ? 'bg-[#f7f7f7] text-[#ff385c]'
                      : 'hover:bg-[#f7f7f7] text-[#484848]'
                  }`}
                >
                  <Icon className="w-5 h-5 mr-3" />
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
      <div className="h-screen flex flex-col bg-white">
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

        {/* Status Bar - Clean Airbnb-style footer */}
        <div className="h-10 bg-white border-t border-[#ebebeb] flex items-center justify-between px-6 text-xs text-[#717171]">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1.5">
              <Shield className="w-3.5 h-3.5 text-emerald-500" />
              <span>HIPAA Compliant</span>
            </div>
            <span className="w-1 h-1 rounded-full bg-[#d1d1d1]" />
            <span>Encrypted (TLS 1.3)</span>
            <span className="w-1 h-1 rounded-full bg-[#d1d1d1]" />
            <span>Audit Logging Active</span>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 pulse-dot" />
              <span>Connected</span>
            </div>
            <span className="w-1 h-1 rounded-full bg-[#d1d1d1]" />
            <span>Synced just now</span>
            <span className="w-1 h-1 rounded-full bg-[#d1d1d1]" />
            <span className="text-[#b0b0b0]">CogHealth EHR v4.2.1</span>
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
