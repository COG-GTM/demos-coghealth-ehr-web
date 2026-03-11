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
      <div className="ehr-header flex items-center justify-between px-6 py-3 bg-white border-b border-[#ebebeb]" style={{ borderBottom: '1px solid #ebebeb' }}>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-[#FF385C] rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">C</span>
            </div>
            <span className="font-semibold text-[16px] text-[#222222]">CogHealth EHR</span>
            <span className="text-[11px] text-[#b0b0b0] font-normal">v4.2.1</span>
          </div>
          <span className="text-[#ebebeb]">|</span>
          {/* Global Patient Search */}
          <div className="relative">
            <div className="flex items-center bg-[#f7f7f7] rounded-full px-4 py-2 border border-[#ebebeb] hover:shadow-md transition-shadow">
              <Search className="w-4 h-4 text-[#717171] mr-2" />
              <input
                type="text"
                placeholder="Patient search..."
                value={globalSearch}
                onChange={(e) => handleSearch(e.target.value)}
                onFocus={() => globalSearch.length >= 2 && setShowSearchDropdown(true)}
                onBlur={() => setTimeout(() => setShowSearchDropdown(false), 200)}
                className="bg-transparent text-[14px] text-[#222222] placeholder-[#b0b0b0] w-48 focus:outline-none"
              />
            </div>
            {showSearchDropdown && searchResults.length > 0 && (
              <div className="absolute top-full left-0 mt-2 w-72 bg-white border border-[#ebebeb] rounded-xl shadow-lg z-50 overflow-hidden">
                {searchResults.map((patient) => (
                  <div
                    key={patient.id}
                    onClick={() => selectPatient(patient.id)}
                    className="px-4 py-3 hover:bg-[#f7f7f7] cursor-pointer text-[14px] text-[#222222] border-b border-[#f0f0f0] transition-colors"
                  >
                    <div className="font-medium">{patient.name}</div>
                    <div className="text-[#717171] text-[12px] mt-0.5">{patient.mrn} · DOB: {patient.dob}</div>
                  </div>
                ))}
              </div>
            )}
            {showSearchDropdown && searchResults.length === 0 && globalSearch.length >= 2 && (
              <div className="absolute top-full left-0 mt-2 w-72 bg-white border border-[#ebebeb] rounded-xl shadow-lg z-50 p-4 text-[14px] text-[#717171]">
                No patients found
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center space-x-4 text-[13px]">
          <span className="text-[#717171]">Springfield Medical Center</span>
          <span className="text-[#ebebeb]">|</span>
          <div className="flex items-center space-x-1.5">
            <Lock className="w-3.5 h-3.5 text-[#717171]" />
            <span className={sessionTime < SESSION_WARNING_MS ? 'text-amber-500 font-medium' : 'text-[#717171]'}>
              Session: {formatSessionTime()}
            </span>
          </div>
          <span className="text-[#ebebeb]">|</span>
          <div className="flex items-center space-x-1.5">
            <div className="w-7 h-7 bg-[#222222] rounded-full flex items-center justify-center">
              <User className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-[#222222] font-medium">Dr. Sarah Anderson</span>
          </div>
          <button onClick={onLogout} className="flex items-center space-x-1.5 text-[#717171] hover:text-[#222222] transition-colors px-3 py-1.5 rounded-full hover:bg-[#f7f7f7]">
            <LogOut className="w-3.5 h-3.5" />
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* Navigation Toolbar - Airbnb tab style */}
      <div className="ehr-toolbar flex items-center justify-between px-6 bg-white" style={{ borderBottom: '1px solid #ebebeb' }}>
        <div className="flex items-center space-x-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path || 
              (item.path === '/patients' && location.pathname.startsWith('/patients/'));
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center px-4 py-3 text-[14px] font-medium transition-all border-b-2 ${
                  isActive
                    ? 'text-[#222222] border-[#222222]'
                    : 'text-[#717171] border-transparent hover:text-[#222222] hover:border-[#dddddd]'
                }`}
              >
                <Icon className="w-4 h-4 mr-2" />
                {item.label}
              </Link>
            );
          })}
        </div>

        <div className="flex items-center space-x-3 text-[13px] text-[#717171]">
          <span>{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
          <span className="text-[#ebebeb]">|</span>
          <span>{new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
        </div>

        {/* Mobile menu button */}
        <button
          className="md:hidden p-2 hover:bg-[#f7f7f7] rounded-full"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {mobileMenuOpen && (
        <div className="md:hidden border-t border-[#ebebeb] bg-white shadow-lg">
          <div className="px-4 py-2 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center px-4 py-3 text-[14px] rounded-lg ${
                    isActive
                      ? 'bg-[#f7f7f7] text-[#222222] font-medium'
                      : 'text-[#484848] hover:bg-[#f7f7f7]'
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
      <div className="h-screen flex flex-col bg-white" style={{ fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif" }}>
        <Navigation 
          onSessionWarning={handleSessionWarning}
          onSessionExpired={handleSessionExpired}
          onLogout={handleLogout}
        />
        <main className="flex-1 overflow-hidden bg-[#fafafa]">
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

        {/* Status Bar */}
        <div className="h-8 bg-white border-t border-[#ebebeb] flex items-center justify-between px-6 text-[12px] text-[#717171]">
          <div className="flex items-center space-x-5">
            <div className="flex items-center space-x-1.5">
              <Shield className="w-3.5 h-3.5 text-emerald-500" />
              <span>HIPAA Compliant</span>
            </div>
            <span className="text-[#ebebeb]">|</span>
            <span>Encrypted Connection (TLS 1.3)</span>
            <span className="text-[#ebebeb]">|</span>
            <span>Audit Logging: Active</span>
          </div>
          <div className="flex items-center space-x-5">
            <span>Database: Connected</span>
            <span className="text-[#ebebeb]">|</span>
            <span>Last Sync: Just now</span>
            <span className="text-[#ebebeb]">|</span>
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
