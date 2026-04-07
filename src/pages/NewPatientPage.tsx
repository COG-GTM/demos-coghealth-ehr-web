import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Save, X, UserPlus, AlertCircle, FileText, CheckCircle } from 'lucide-react';
import { patientService } from '../services/patientService';
import type { Patient, Gender, MaritalStatus } from '../types';

export default function NewPatientPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Patient>>({
    firstName: '',
    middleName: '',
    lastName: '',
    dateOfBirth: '',
    gender: 'UNKNOWN' as Gender,
    maritalStatus: 'UNKNOWN' as MaritalStatus,
    email: '',
    phoneHome: '',
    phoneMobile: '',
    phoneWork: '',
    address: {
      street1: '',
      street2: '',
      city: '',
      state: '',
      zipCode: '',
    },
    preferredLanguage: 'English',
    ethnicity: '',
    race: '',
    active: true,
    deceased: false,
  });

  const handleChange = (field: keyof Patient, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAddressChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      address: { ...prev.address, [field]: value },
    }));
  };

  const loadSamplePatient = () => {
    setFormData({
      firstName: 'Sarah',
      middleName: 'Marie',
      lastName: 'Mitchell',
      dateOfBirth: '1988-11-03',
      gender: 'FEMALE' as Gender,
      maritalStatus: 'MARRIED' as MaritalStatus,
      email: 'sarah.mitchell@email.com',
      phoneHome: '(555) 234-5678',
      phoneMobile: '(555) 987-6543',
      phoneWork: '(555) 111-2233',
      address: {
        street1: '742 Evergreen Terrace',
        street2: 'Unit 2B',
        city: 'Springfield',
        state: 'IL',
        zipCode: '62704',
      },
      preferredLanguage: 'English',
      ethnicity: 'Not Hispanic or Latino',
      race: 'White',
      active: true,
      deceased: false,
    });
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.firstName || !formData.lastName || !formData.dateOfBirth) {
      setError('First Name, Last Name, and Date of Birth are required fields.');
      return;
    }

    setLoading(true);
    try {
      const created = await patientService.create(formData);
      setSuccess(`Patient ${created.firstName} ${created.lastName} registered successfully (MRN: ${created.mrn})`);
      setLoading(false);
      setTimeout(() => navigate(`/patients/${created.id}`), 1500);
    } catch (err) {
      setError('Failed to register patient. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col" style={{ background: '#d4d0c8' }}>
      {/* Header */}
      <div className="ehr-header text-xs flex items-center">
        <UserPlus className="w-3.5 h-3.5 mr-1.5" />
        <span>New Patient Registration</span>
      </div>

      {/* Toolbar */}
      <div className="ehr-toolbar flex items-center justify-between">
        <div className="flex items-center space-x-1">
          <button
            className="ehr-toolbar-button flex items-center"
            onClick={() => navigate('/patients')}
          >
            <X className="w-3.5 h-3.5 mr-1" /> Cancel
          </button>
          <span className="text-gray-400">|</span>
          <button
            className="ehr-toolbar-button flex items-center"
            onClick={handleSubmit}
            disabled={loading}
          >
            <Save className="w-3.5 h-3.5 mr-1" /> {loading ? 'Saving...' : 'Save Patient'}
          </button>
          <span className="text-gray-400">|</span>
          <button
            className="ehr-toolbar-button flex items-center"
            onClick={loadSamplePatient}
          >
            <FileText className="w-3.5 h-3.5 mr-1" /> Load Sample
          </button>
        </div>
        <span className="text-[10px] text-gray-500">* Required fields</span>
      </div>

      {/* Main Form */}
      <div className="flex-1 overflow-auto p-3">
        <div className="max-w-4xl mx-auto">
          {success && (
            <div className="ehr-alert-info p-2 mb-3 flex items-center">
              <CheckCircle className="w-4 h-4 mr-2 flex-shrink-0" />
              <span className="text-[11px]">{success}</span>
            </div>
          )}

          {error && (
            <div className="ehr-alert-critical p-2 mb-3 flex items-center">
              <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />
              <span className="text-[11px]">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            {/* Demographics */}
            <fieldset className="ehr-fieldset">
              <legend>Demographics</legend>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] text-gray-600 mb-0.5">First Name *</label>
                  <input
                    type="text"
                    value={formData.firstName}
                    onChange={e => handleChange('firstName', e.target.value)}
                    className="ehr-input w-full"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-600 mb-0.5">Middle Name</label>
                  <input
                    type="text"
                    value={formData.middleName || ''}
                    onChange={e => handleChange('middleName', e.target.value)}
                    className="ehr-input w-full"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-600 mb-0.5">Last Name *</label>
                  <input
                    type="text"
                    value={formData.lastName}
                    onChange={e => handleChange('lastName', e.target.value)}
                    className="ehr-input w-full"
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3 mt-2">
                <div>
                  <label className="block text-[10px] text-gray-600 mb-0.5">Date of Birth *</label>
                  <input
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={e => handleChange('dateOfBirth', e.target.value)}
                    className="ehr-input w-full"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-600 mb-0.5">Gender</label>
                  <select
                    value={formData.gender || 'UNKNOWN'}
                    onChange={e => handleChange('gender', e.target.value)}
                    className="ehr-input w-full"
                  >
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                    <option value="OTHER">Other</option>
                    <option value="UNKNOWN">Unknown</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] text-gray-600 mb-0.5">Marital Status</label>
                  <select
                    value={formData.maritalStatus || 'UNKNOWN'}
                    onChange={e => handleChange('maritalStatus', e.target.value)}
                    className="ehr-input w-full"
                  >
                    <option value="SINGLE">Single</option>
                    <option value="MARRIED">Married</option>
                    <option value="DIVORCED">Divorced</option>
                    <option value="WIDOWED">Widowed</option>
                    <option value="SEPARATED">Separated</option>
                    <option value="DOMESTIC_PARTNER">Domestic Partner</option>
                    <option value="UNKNOWN">Unknown</option>
                  </select>
                </div>
              </div>
            </fieldset>

            {/* Contact Information */}
            <fieldset className="ehr-fieldset">
              <legend>Contact Information</legend>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-gray-600 mb-0.5">Email</label>
                  <input
                    type="email"
                    value={formData.email || ''}
                    onChange={e => handleChange('email', e.target.value)}
                    className="ehr-input w-full"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-600 mb-0.5">Mobile Phone</label>
                  <input
                    type="tel"
                    value={formData.phoneMobile || ''}
                    onChange={e => handleChange('phoneMobile', e.target.value)}
                    className="ehr-input w-full"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-600 mb-0.5">Home Phone</label>
                  <input
                    type="tel"
                    value={formData.phoneHome || ''}
                    onChange={e => handleChange('phoneHome', e.target.value)}
                    className="ehr-input w-full"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-600 mb-0.5">Work Phone</label>
                  <input
                    type="tel"
                    value={formData.phoneWork || ''}
                    onChange={e => handleChange('phoneWork', e.target.value)}
                    className="ehr-input w-full"
                  />
                </div>
              </div>
            </fieldset>

            {/* Address */}
            <fieldset className="ehr-fieldset">
              <legend>Address</legend>
              <div className="space-y-2">
                <div>
                  <label className="block text-[10px] text-gray-600 mb-0.5">Street Address</label>
                  <input
                    type="text"
                    value={formData.address?.street1 || ''}
                    onChange={e => handleAddressChange('street1', e.target.value)}
                    className="ehr-input w-full"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-600 mb-0.5">Street Address 2</label>
                  <input
                    type="text"
                    value={formData.address?.street2 || ''}
                    onChange={e => handleAddressChange('street2', e.target.value)}
                    className="ehr-input w-full"
                  />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] text-gray-600 mb-0.5">City</label>
                    <input
                      type="text"
                      value={formData.address?.city || ''}
                      onChange={e => handleAddressChange('city', e.target.value)}
                      className="ehr-input w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-600 mb-0.5">State</label>
                    <input
                      type="text"
                      value={formData.address?.state || ''}
                      onChange={e => handleAddressChange('state', e.target.value)}
                      className="ehr-input w-full"
                      maxLength={2}
                      placeholder="CA"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-600 mb-0.5">ZIP Code</label>
                    <input
                      type="text"
                      value={formData.address?.zipCode || ''}
                      onChange={e => handleAddressChange('zipCode', e.target.value)}
                      className="ehr-input w-full"
                      placeholder="12345"
                    />
                  </div>
                </div>
              </div>
            </fieldset>

            {/* Additional Information */}
            <fieldset className="ehr-fieldset">
              <legend>Additional Information</legend>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] text-gray-600 mb-0.5">Preferred Language</label>
                  <input
                    type="text"
                    value={formData.preferredLanguage || ''}
                    onChange={e => handleChange('preferredLanguage', e.target.value)}
                    className="ehr-input w-full"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-600 mb-0.5">Ethnicity</label>
                  <input
                    type="text"
                    value={formData.ethnicity || ''}
                    onChange={e => handleChange('ethnicity', e.target.value)}
                    className="ehr-input w-full"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-600 mb-0.5">Race</label>
                  <input
                    type="text"
                    value={formData.race || ''}
                    onChange={e => handleChange('race', e.target.value)}
                    className="ehr-input w-full"
                  />
                </div>
              </div>
            </fieldset>

            {/* Submit */}
            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-gray-400">
              <button
                type="button"
                onClick={() => navigate('/patients')}
                className="ehr-button px-4"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="ehr-button ehr-button-primary px-4 flex items-center"
              >
                <Save className="w-3 h-3 mr-1" />
                {loading ? 'Registering...' : 'Register Patient'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Status Bar */}
      <div className="ehr-status-bar flex items-center justify-between">
        <span>New Patient Registration</span>
        <span>{new Date().toLocaleTimeString()}</span>
      </div>
    </div>
  );
}
