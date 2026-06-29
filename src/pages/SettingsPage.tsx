import { useState } from 'react';
import { 
  User, 
  Bell, 
  Shield, 
  Palette,
  Building2,
  Key,
  Monitor,
  Mail,
  Smartphone,
  Globe,
  Save,
  Check
} from 'lucide-react';
import { AlertDialog } from '../components/ui/Modal';

type SettingsTab = 'profile' | 'notifications' | 'security' | 'appearance' | 'practice';

interface UserProfile {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  npi: string;
  specialty: string;
  title: string;
}

const STORAGE_KEY = 'coghealth_settings';

const defaultProfile: UserProfile = {
  firstName: 'Sarah',
  lastName: 'Anderson',
  email: 'sarah.anderson@coghealth.com',
  phone: '(555) 123-4567',
  npi: '1234567890',
  specialty: 'Internal Medicine',
  title: 'MD',
};

const defaultNotifications = {
  emailAlerts: true,
  smsAlerts: false,
  labResults: true,
  appointments: true,
  messages: true,
  systemUpdates: false,
};

const defaultAppearance = {
  theme: 'light',
  compactMode: false,
  fontSize: 'medium',
};

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
  const [saved, setSaved] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['channels', 'alerts', 'security', 'hours']));
  const [showAlert, setShowAlert] = useState<{ title: string; message: string; type: 'success' | 'info' } | null>(null);

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const [profile, setProfile] = useState<UserProfile>(defaultProfile);
  const [notifications, setNotifications] = useState(defaultNotifications);
  const [appearance, setAppearance] = useState(defaultAppearance);

  const [initialized, setInitialized] = useState(false);
  if (!initialized) {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const data = JSON.parse(stored);
        if (data.profile) Object.assign(profile, data.profile);
        if (data.notifications) Object.assign(notifications, data.notifications);
        if (data.appearance) Object.assign(appearance, data.appearance);
      } catch (e) {
        console.error('Failed to load settings:', e);
      }
    }
    setInitialized(true);
  }

  const tabs = [
    { id: 'profile' as const, label: 'Profile', icon: User },
    { id: 'notifications' as const, label: 'Notifications', icon: Bell },
    { id: 'security' as const, label: 'Security', icon: Shield },
    { id: 'appearance' as const, label: 'Appearance', icon: Palette },
    { id: 'practice' as const, label: 'Practice', icon: Building2 },
  ];

  const handleSave = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ profile, notifications, appearance }));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="h-full flex flex-col ehr-app-bg">
      {/* Header */}
      <div className="ehr-header flex items-center justify-between">
        <span>System Settings</span>
        <button
          onClick={handleSave}
          className={`ehr-button flex items-center text-[10px] ${saved ? '' : 'ehr-button-primary'}`}
          style={saved ? { background: 'linear-gradient(to bottom, #66cc66 0%, #339933 100%)', color: 'white', border: '1px solid #206020' } : undefined}
        >
          {saved ? <><Check className="w-3 h-3 mr-1" /> Saved</> : <><Save className="w-3 h-3 mr-1" /> Save Changes</>}
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Navigation */}
        <div className="w-48 overflow-auto p-2 space-y-1 ehr-status-surface">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center px-2 py-1.5 text-[11px] ${
                  activeTab === tab.id
                    ? 'bg-white border border-gray-400 font-semibold'
                    : 'hover:bg-white/50'
                }`}
              >
                <Icon className="w-3.5 h-3.5 mr-2" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Right Content */}
        <div className="flex-1 overflow-auto bg-white border-l border-gray-500 p-3">
          {activeTab === 'profile' && (
            <div className="space-y-3">
              <fieldset className="ehr-fieldset">
                <legend>User Profile</legend>
                <div className="flex items-center space-x-4 mb-3">
                  <div className="w-14 h-14 bg-gray-100 flex items-center justify-center border border-gray-400">
                    <span className="text-[11px] font-bold text-gray-700">
                      {profile.firstName[0]}{profile.lastName[0]}
                    </span>
                  </div>
                  <button className="ehr-button text-[10px]" onClick={() => setShowAlert({ title: 'Change Photo', message: 'Photo upload dialog would open here.', type: 'info' })}>Change Photo</button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] text-gray-600 mb-0.5">First Name</label>
                    <input
                      type="text"
                      value={profile.firstName}
                      onChange={(e) => setProfile({ ...profile, firstName: e.target.value })}
                      className="ehr-input w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-600 mb-0.5">Last Name</label>
                    <input
                      type="text"
                      value={profile.lastName}
                      onChange={(e) => setProfile({ ...profile, lastName: e.target.value })}
                      className="ehr-input w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-600 mb-0.5">Email</label>
                    <input
                      type="email"
                      value={profile.email}
                      onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                      className="ehr-input w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-600 mb-0.5">Phone</label>
                    <input
                      type="tel"
                      value={profile.phone}
                      onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                      className="ehr-input w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-600 mb-0.5">NPI Number</label>
                    <input
                      type="text"
                      value={profile.npi}
                      onChange={(e) => setProfile({ ...profile, npi: e.target.value })}
                      className="ehr-input w-full font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-600 mb-0.5">Specialty</label>
                    <select
                      value={profile.specialty}
                      onChange={(e) => setProfile({ ...profile, specialty: e.target.value })}
                      className="ehr-input w-full"
                    >
                      <option>Internal Medicine</option>
                      <option>Family Medicine</option>
                      <option>Pediatrics</option>
                      <option>Cardiology</option>
                      <option>Neurology</option>
                    </select>
                  </div>
                </div>
              </fieldset>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="space-y-3">
              <div className="ehr-panel">
                <div 
                  className="ehr-header flex items-center justify-between cursor-pointer"
                  onClick={(e) => { e.stopPropagation(); toggleSection('channels'); }}
                >
                  <div className="flex items-center">
                    <span className="w-4 h-4 border border-gray-400 bg-white flex items-center justify-center text-[10px] font-bold mr-1">
                      {expandedSections.has('channels') ? '-' : '+'}
                    </span>
                    Notification Channels
                  </div>
                </div>
                {expandedSections.has('channels') && (
                  <div className="bg-white p-2 space-y-2">
                    <label className="flex items-center justify-between p-2 bg-gray-50 border border-gray-300 cursor-pointer hover:bg-gray-100">
                      <div className="flex items-center">
                        <Mail className="w-4 h-4 text-gray-500 mr-2" />
                        <div>
                          <div className="text-[11px] font-medium">Email Notifications</div>
                          <div className="text-[10px] text-gray-500">Receive alerts via email</div>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={notifications.emailAlerts}
                        onChange={(e) => setNotifications({ ...notifications, emailAlerts: e.target.checked })}
                        className="h-4 w-4"
                      />
                    </label>
                    <label className="flex items-center justify-between p-2 bg-gray-50 border border-gray-300 cursor-pointer hover:bg-gray-100">
                      <div className="flex items-center">
                        <Smartphone className="w-4 h-4 text-gray-500 mr-2" />
                        <div>
                          <div className="text-[11px] font-medium">SMS Notifications</div>
                          <div className="text-[10px] text-gray-500">Receive urgent alerts via text</div>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={notifications.smsAlerts}
                        onChange={(e) => setNotifications({ ...notifications, smsAlerts: e.target.checked })}
                        className="h-4 w-4"
                      />
                    </label>
                  </div>
                )}
              </div>

              <div className="ehr-panel">
                <div 
                  className="ehr-header flex items-center justify-between cursor-pointer"
                  onClick={(e) => { e.stopPropagation(); toggleSection('alerts'); }}
                >
                  <div className="flex items-center">
                    <span className="w-4 h-4 border border-gray-400 bg-white flex items-center justify-center text-[10px] font-bold mr-1">
                      {expandedSections.has('alerts') ? '-' : '+'}
                    </span>
                    Alert Types
                  </div>
                </div>
                {expandedSections.has('alerts') && (
                  <div className="bg-white">
                    {[
                      { key: 'labResults', label: 'Lab Results', desc: 'When new lab results are available' },
                      { key: 'appointments', label: 'Appointments', desc: 'Reminders and schedule changes' },
                      { key: 'messages', label: 'Messages', desc: 'New messages from patients or staff' },
                      { key: 'systemUpdates', label: 'System Updates', desc: 'Maintenance and feature announcements' },
                    ].map((item, idx) => (
                      <label key={item.key} className={`flex items-center justify-between px-2 py-1.5 cursor-pointer hover:bg-blue-50 ${idx % 2 === 1 ? 'bg-gray-50' : ''}`}>
                        <div>
                          <div className="text-[11px] font-medium">{item.label}</div>
                          <div className="text-[10px] text-gray-500">{item.desc}</div>
                        </div>
                        <input
                          type="checkbox"
                          checked={notifications[item.key as keyof typeof notifications]}
                          onChange={(e) => setNotifications({ ...notifications, [item.key]: e.target.checked })}
                          className="h-4 w-4"
                        />
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="space-y-3">
              <div className="ehr-panel">
                <div 
                  className="ehr-header flex items-center justify-between cursor-pointer"
                  onClick={(e) => { e.stopPropagation(); toggleSection('security'); }}
                >
                  <div className="flex items-center">
                    <span className="w-4 h-4 border border-gray-400 bg-white flex items-center justify-center text-[10px] font-bold mr-1">
                      {expandedSections.has('security') ? '-' : '+'}
                    </span>
                    Security Settings
                  </div>
                </div>
                {expandedSections.has('security') && (
                  <div className="bg-white p-2 space-y-2">
                    <div className="flex items-center justify-between p-2 bg-gray-50 border border-gray-300">
                      <div className="flex items-center">
                        <Key className="w-4 h-4 text-gray-500 mr-2" />
                        <div>
                          <div className="text-[11px] font-medium">Password</div>
                          <div className="text-[10px] text-gray-500">Last changed 30 days ago</div>
                        </div>
                      </div>
                      <button className="ehr-button text-[10px]" onClick={() => setShowAlert({ title: 'Change Password', message: 'Password change dialog would open here.', type: 'info' })}>Change</button>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-gray-50 border border-gray-300">
                      <div className="flex items-center">
                        <Smartphone className="w-4 h-4 text-gray-500 mr-2" />
                        <div>
                          <div className="text-[11px] font-medium">Two-Factor Authentication</div>
                          <div className="text-[10px] text-gray-500">Add an extra layer of security</div>
                        </div>
                      </div>
                      <span className="px-1.5 py-0.5 bg-gray-100 border border-gray-400 text-gray-700 text-[9px]">Enabled</span>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-gray-50 border border-gray-300">
                      <div className="flex items-center">
                        <Monitor className="w-4 h-4 text-gray-500 mr-2" />
                        <div>
                          <div className="text-[11px] font-medium">Active Sessions</div>
                          <div className="text-[10px] text-gray-500">Manage your logged-in devices</div>
                        </div>
                      </div>
                      <button className="ehr-button text-[10px]" onClick={() => setShowAlert({ title: 'Active Sessions', message: 'You have 2 active sessions: Chrome on MacOS, Safari on iPhone.', type: 'info' })}>View</button>
                    </div>
                  </div>
                )}
              </div>

              <fieldset className="ehr-fieldset">
                <legend>Recent Activity</legend>
                <table className="w-full text-[10px]">
                  <tbody>
                    {[
                      { action: 'Login from Chrome on MacOS', time: '2 hours ago', location: 'San Francisco, CA' },
                      { action: 'Password changed', time: '30 days ago', location: 'San Francisco, CA' },
                      { action: 'Login from Safari on iPhone', time: '2 days ago', location: 'San Francisco, CA' },
                    ].map((activity, idx) => (
                      <tr key={idx} className={idx % 2 === 1 ? 'bg-gray-50' : ''}>
                        <td className="px-2 py-1">{activity.action}</td>
                        <td className="px-2 py-1 text-gray-500">{activity.location}</td>
                        <td className="px-2 py-1 text-gray-400 text-right">{activity.time}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </fieldset>
            </div>
          )}

          {activeTab === 'appearance' && (
            <div className="space-y-3">
              <fieldset className="ehr-fieldset">
                <legend>Theme</legend>
                <div className="grid grid-cols-3 gap-2">
                  {['light', 'dark', 'system'].map((theme) => (
                    <button
                      key={theme}
                      onClick={() => setAppearance({ ...appearance, theme })}
                      className={`p-2 border text-center text-[11px] ${
                        appearance.theme === theme
                          ? 'border-gray-600 bg-white'
                          : 'border-gray-400 bg-gray-100 hover:bg-gray-50'
                      }`}
                    >
                      <Monitor className="w-4 h-4 mx-auto mb-1 text-gray-600" />
                      <span className="capitalize">{theme}</span>
                    </button>
                  ))}
                </div>
              </fieldset>

              <fieldset className="ehr-fieldset">
                <legend>Display Options</legend>
                <div className="space-y-2">
                  <div>
                    <label className="block text-[10px] text-gray-600 mb-0.5">Font Size</label>
                    <select
                      value={appearance.fontSize}
                      onChange={(e) => setAppearance({ ...appearance, fontSize: e.target.value })}
                      className="ehr-input w-48"
                    >
                      <option value="small">Small</option>
                      <option value="medium">Medium (Default)</option>
                      <option value="large">Large</option>
                    </select>
                  </div>
                  <label className="flex items-center justify-between p-2 bg-gray-50 border border-gray-300 cursor-pointer hover:bg-gray-100">
                    <div>
                      <div className="text-[11px] font-medium">Compact Mode</div>
                      <div className="text-[10px] text-gray-500">Reduce spacing for more content on screen</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={appearance.compactMode}
                      onChange={(e) => setAppearance({ ...appearance, compactMode: e.target.checked })}
                      className="h-4 w-4"
                    />
                  </label>
                </div>
              </fieldset>
            </div>
          )}

          {activeTab === 'practice' && (
            <div className="space-y-3">
              <fieldset className="ehr-fieldset">
                <legend>Practice Information</legend>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] text-gray-600 mb-0.5">Practice Name</label>
                    <input type="text" defaultValue="Anderson Family Medicine" className="ehr-input w-full" />
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-600 mb-0.5">Tax ID</label>
                    <input type="text" defaultValue="12-3456789" className="ehr-input w-full font-mono" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-[10px] text-gray-600 mb-0.5">Address</label>
                    <input type="text" defaultValue="123 Medical Center Drive, Suite 100" className="ehr-input w-full" />
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-600 mb-0.5">City</label>
                    <input type="text" defaultValue="Springfield" className="ehr-input w-full" />
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-600 mb-0.5">State</label>
                    <select className="ehr-input w-full">
                      <option>Illinois</option>
                      <option>California</option>
                      <option>New York</option>
                    </select>
                  </div>
                </div>
              </fieldset>

              <div className="ehr-panel">
                <div 
                  className="ehr-header flex items-center justify-between cursor-pointer"
                  onClick={(e) => { e.stopPropagation(); toggleSection('hours'); }}
                >
                  <div className="flex items-center">
                    <span className="w-4 h-4 border border-gray-400 bg-white flex items-center justify-center text-[10px] font-bold mr-1">
                      {expandedSections.has('hours') ? '-' : '+'}
                    </span>
                    Business Hours
                  </div>
                </div>
                {expandedSections.has('hours') && (
                  <div className="bg-white p-2 space-y-1.5">
                    {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map((day) => (
                      <div key={day} className="flex items-center space-x-2 text-[11px]">
                        <span className="w-20 text-gray-600">{day}</span>
                        <select className="ehr-input text-[10px]">
                          <option>8:00 AM</option>
                          <option>9:00 AM</option>
                        </select>
                        <span className="text-gray-400">to</span>
                        <select className="ehr-input text-[10px]">
                          <option>5:00 PM</option>
                          <option>6:00 PM</option>
                        </select>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <fieldset className="ehr-fieldset">
                <legend>Timezone</legend>
                <div className="flex items-center">
                  <Globe className="w-4 h-4 text-gray-600 mr-2" />
                  <span className="text-[11px]">America/Chicago (Central Time)</span>
                </div>
              </fieldset>
            </div>
          )}
        </div>
      </div>

      {/* Status Bar */}
      <div className="ehr-status-bar flex items-center justify-between">
        <span>Settings | {tabs.find(t => t.id === activeTab)?.label}</span>
        <span>User: Dr. Sarah Anderson, MD</span>
      </div>

      {showAlert && (
        <AlertDialog
          isOpen={true}
          onClose={() => setShowAlert(null)}
          title={showAlert.title}
          message={showAlert.message}
          type={showAlert.type}
        />
      )}
    </div>
  );
}
