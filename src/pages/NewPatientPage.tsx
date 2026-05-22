import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Save, X, User } from 'lucide-react';
import { ConfirmDialog } from '../components/ui/Modal';

interface FormData {
  firstName: string;
  lastName: string;
  middleName: string;
  dateOfBirth: string;
  gender: string;
  email: string;
  phoneMobile: string;
  phoneHome: string;
  street1: string;
  street2: string;
  city: string;
  state: string;
  zip: string;
  ssn: string;
}

interface FormErrors {
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  email?: string;
  zip?: string;
}

const initialFormData: FormData = {
  firstName: '',
  lastName: '',
  middleName: '',
  dateOfBirth: '',
  gender: '',
  email: '',
  phoneMobile: '',
  phoneHome: '',
  street1: '',
  street2: '',
  city: '',
  state: '',
  zip: '',
  ssn: '',
};

export default function NewPatientPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [errors, setErrors] = useState<FormErrors>({});
  const [showDiscardDialog, setShowDiscardDialog] = useState(false);

  const isDirty = Object.values(formData).some(v => v !== '');

  const validate = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }
    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    }
    if (!formData.dateOfBirth) {
      newErrors.dateOfBirth = 'Date of birth is required';
    }
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email address';
    }
    if (formData.zip && !/^\d{5}(-\d{4})?$/.test(formData.zip)) {
      newErrors.zip = 'Invalid ZIP code (use 5-digit or ZIP+4 format)';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    navigate('/patients');
  };

  const handleCancel = () => {
    if (isDirty) {
      setShowDiscardDialog(true);
    } else {
      navigate('/patients');
    }
  };

  const handleChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  return (
    <div className="h-full flex flex-col" style={{ background: '#d4d0c8' }}>
      {/* Toolbar */}
      <div className="ehr-toolbar flex items-center justify-between">
        <div className="flex items-center space-x-1">
          <button className="ehr-toolbar-button flex items-center" onClick={handleSave}>
            <Save className="w-3.5 h-3.5 mr-1" /> Save Patient
          </button>
          <span className="text-gray-400">|</span>
          <button className="ehr-toolbar-button flex items-center" onClick={handleCancel}>
            <X className="w-3.5 h-3.5 mr-1" /> Cancel
          </button>
        </div>
      </div>

      {/* Status Bar */}
      <div className="ehr-status-bar flex items-center px-2 py-1 text-[11px]">
        <User className="w-3 h-3 mr-1" />
        <span>New Patient Registration</span>
      </div>

      {/* Form */}
      <div className="flex-1 overflow-auto p-3">
        <div className="bg-white border border-gray-400 shadow-sm max-w-4xl mx-auto">
          <div 
            className="px-3 py-1.5 text-[11px] font-semibold text-white"
            style={{ background: 'linear-gradient(to bottom, #6699cc 0%, #336699 100%)' }}
          >
            Patient Demographics
          </div>
          <div className="p-4 space-y-4">
            {/* Name Section */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">First Name *</label>
                <input
                  type="text"
                  placeholder="First name"
                  value={formData.firstName}
                  onChange={e => handleChange('firstName', e.target.value)}
                  className="w-full px-2 py-1 text-[11px] border border-gray-400 focus:border-blue-500 focus:outline-none"
                />
                {errors.firstName && <p className="text-red-500 text-[10px] mt-0.5">{errors.firstName}</p>}
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">Middle Name</label>
                <input
                  type="text"
                  placeholder="Middle name"
                  value={formData.middleName}
                  onChange={e => handleChange('middleName', e.target.value)}
                  className="w-full px-2 py-1 text-[11px] border border-gray-400 focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">Last Name *</label>
                <input
                  type="text"
                  placeholder="Last name"
                  value={formData.lastName}
                  onChange={e => handleChange('lastName', e.target.value)}
                  className="w-full px-2 py-1 text-[11px] border border-gray-400 focus:border-blue-500 focus:outline-none"
                />
                {errors.lastName && <p className="text-red-500 text-[10px] mt-0.5">{errors.lastName}</p>}
              </div>
            </div>

            {/* DOB / Gender / SSN */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">Date of Birth *</label>
                <input
                  type="date"
                  value={formData.dateOfBirth}
                  onChange={e => handleChange('dateOfBirth', e.target.value)}
                  className="w-full px-2 py-1 text-[11px] border border-gray-400 focus:border-blue-500 focus:outline-none"
                />
                {errors.dateOfBirth && <p className="text-red-500 text-[10px] mt-0.5">{errors.dateOfBirth}</p>}
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">Gender</label>
                <select
                  value={formData.gender}
                  onChange={e => handleChange('gender', e.target.value)}
                  className="w-full px-2 py-1 text-[11px] border border-gray-400 focus:border-blue-500 focus:outline-none"
                >
                  <option value="">Select...</option>
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">SSN</label>
                <input
                  type="text"
                  placeholder="XXX-XX-XXXX"
                  value={formData.ssn}
                  onChange={e => handleChange('ssn', e.target.value)}
                  className="w-full px-2 py-1 text-[11px] border border-gray-400 focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Contact Information */}
            <div 
              className="px-3 py-1.5 text-[11px] font-semibold text-white -mx-4 mt-4"
              style={{ background: 'linear-gradient(to bottom, #6699cc 0%, #336699 100%)' }}
            >
              Contact Information
            </div>

            <div className="grid grid-cols-3 gap-3 mt-3">
              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  placeholder="patient@example.com"
                  value={formData.email}
                  onChange={e => handleChange('email', e.target.value)}
                  className="w-full px-2 py-1 text-[11px] border border-gray-400 focus:border-blue-500 focus:outline-none"
                />
                {errors.email && <p className="text-red-500 text-[10px] mt-0.5">{errors.email}</p>}
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">Mobile Phone</label>
                <input
                  type="text"
                  placeholder="(555) 123-4567"
                  value={formData.phoneMobile}
                  onChange={e => handleChange('phoneMobile', e.target.value)}
                  className="w-full px-2 py-1 text-[11px] border border-gray-400 focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">Home Phone</label>
                <input
                  type="text"
                  placeholder="(555) 987-6543"
                  value={formData.phoneHome}
                  onChange={e => handleChange('phoneHome', e.target.value)}
                  className="w-full px-2 py-1 text-[11px] border border-gray-400 focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Address */}
            <div 
              className="px-3 py-1.5 text-[11px] font-semibold text-white -mx-4 mt-4"
              style={{ background: 'linear-gradient(to bottom, #6699cc 0%, #336699 100%)' }}
            >
              Address
            </div>

            <div className="space-y-3 mt-3">
              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">Street Address</label>
                <input
                  type="text"
                  placeholder="123 Main St"
                  value={formData.street1}
                  onChange={e => handleChange('street1', e.target.value)}
                  className="w-full px-2 py-1 text-[11px] border border-gray-400 focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">Street Address 2</label>
                <input
                  type="text"
                  placeholder="Apt, Suite, etc."
                  value={formData.street2}
                  onChange={e => handleChange('street2', e.target.value)}
                  className="w-full px-2 py-1 text-[11px] border border-gray-400 focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-700 mb-1">City</label>
                  <input
                    type="text"
                    placeholder="City"
                    value={formData.city}
                    onChange={e => handleChange('city', e.target.value)}
                    className="w-full px-2 py-1 text-[11px] border border-gray-400 focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-700 mb-1">State</label>
                  <input
                    type="text"
                    placeholder="State"
                    value={formData.state}
                    onChange={e => handleChange('state', e.target.value)}
                    className="w-full px-2 py-1 text-[11px] border border-gray-400 focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-700 mb-1">ZIP Code</label>
                  <input
                    type="text"
                    placeholder="12345"
                    value={formData.zip}
                    onChange={e => handleChange('zip', e.target.value)}
                    className="w-full px-2 py-1 text-[11px] border border-gray-400 focus:border-blue-500 focus:outline-none"
                  />
                  {errors.zip && <p className="text-red-500 text-[10px] mt-0.5">{errors.zip}</p>}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Discard Changes Dialog */}
      <ConfirmDialog
        isOpen={showDiscardDialog}
        onClose={() => setShowDiscardDialog(false)}
        onConfirm={() => navigate('/patients')}
        title="Discard Changes"
        message="You have unsaved changes. Are you sure you want to discard them and go back?"
        confirmText="Discard"
        cancelText="Stay"
        type="warning"
      />
    </div>
  );
}
