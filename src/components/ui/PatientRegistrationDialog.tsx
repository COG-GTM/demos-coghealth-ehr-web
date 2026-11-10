import { useState } from 'react';
import { Modal } from './Modal';
import type { Patient, Gender, MaritalStatus } from '../../types';

interface PatientRegistrationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (patient: Partial<Patient>) => Promise<void>;
}

interface FormData {
  firstName: string;
  middleName: string;
  lastName: string;
  dateOfBirth: string;
  gender: Gender;
  maritalStatus: MaritalStatus;
  email: string;
  phoneHome: string;
  phoneMobile: string;
  phoneWork: string;
  street1: string;
  street2: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  preferredLanguage: string;
  ethnicity: string;
  race: string;
  religion: string;
  emergencyFirstName: string;
  emergencyLastName: string;
  emergencyRelationship: string;
  emergencyPhone: string;
}

const initialFormData: FormData = {
  firstName: '',
  middleName: '',
  lastName: '',
  dateOfBirth: '',
  gender: 'UNKNOWN',
  maritalStatus: 'UNKNOWN',
  email: '',
  phoneHome: '',
  phoneMobile: '',
  phoneWork: '',
  street1: '',
  street2: '',
  city: '',
  state: '',
  zipCode: '',
  country: 'US',
  preferredLanguage: 'English',
  ethnicity: '',
  race: '',
  religion: '',
  emergencyFirstName: '',
  emergencyLastName: '',
  emergencyRelationship: '',
  emergencyPhone: '',
};

export function PatientRegistrationDialog({ isOpen, onClose, onSubmit }: PatientRegistrationDialogProps) {
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.firstName.trim()) newErrors.firstName = 'First name is required';
    if (!formData.lastName.trim()) newErrors.lastName = 'Last name is required';
    if (!formData.dateOfBirth) newErrors.dateOfBirth = 'Date of birth is required';
    if (formData.dateOfBirth && new Date(formData.dateOfBirth) >= new Date()) {
      newErrors.dateOfBirth = 'Date of birth must be in the past';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    try {
      const patient: Partial<Patient> = {
        firstName: formData.firstName.trim(),
        middleName: formData.middleName.trim() || undefined,
        lastName: formData.lastName.trim(),
        dateOfBirth: formData.dateOfBirth,
        gender: formData.gender,
        maritalStatus: formData.maritalStatus,
        email: formData.email.trim() || undefined,
        phoneHome: formData.phoneHome.trim() || undefined,
        phoneMobile: formData.phoneMobile.trim() || undefined,
        phoneWork: formData.phoneWork.trim() || undefined,
        preferredLanguage: formData.preferredLanguage.trim() || undefined,
        ethnicity: formData.ethnicity.trim() || undefined,
        race: formData.race.trim() || undefined,
        religion: formData.religion.trim() || undefined,
        active: true,
        deceased: false,
      };

      if (formData.street1.trim()) {
        patient.address = {
          street1: formData.street1.trim(),
          street2: formData.street2.trim() || undefined,
          city: formData.city.trim() || undefined,
          state: formData.state.trim() || undefined,
          zipCode: formData.zipCode.trim() || undefined,
          country: formData.country.trim() || undefined,
        };
      }

      if (formData.emergencyFirstName.trim() && formData.emergencyLastName.trim()) {
        patient.emergencyContacts = [{
          firstName: formData.emergencyFirstName.trim(),
          lastName: formData.emergencyLastName.trim(),
          relationship: formData.emergencyRelationship.trim() || undefined,
          phoneMobile: formData.emergencyPhone.trim() || undefined,
          active: true,
        }];
      }

      await onSubmit(patient);
      setFormData(initialFormData);
      setErrors({});
      onClose();
    } catch (error) {
      console.error('Failed to create patient:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setFormData(initialFormData);
    setErrors({});
    onClose();
  };

  const inputClass = (field: string) =>
    `ehr-input w-full ${errors[field] ? 'border-red-500' : ''}`;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="New Patient Registration"
      width="xl"
      footer={
        <>
          <button onClick={handleClose} className="ehr-button px-4" disabled={submitting}>
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="ehr-button ehr-button-primary px-4"
            disabled={submitting}
          >
            {submitting ? 'Registering...' : 'Register Patient'}
          </button>
        </>
      }
    >
      <div className="space-y-3">
        {/* Section: Demographics */}
        <fieldset className="border border-gray-400 p-2">
          <legend className="text-[11px] font-semibold text-gray-700 px-1">Patient Demographics *</legend>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="ehr-label block">First Name *</label>
              <input
                type="text"
                value={formData.firstName}
                onChange={(e) => handleChange('firstName', e.target.value)}
                className={inputClass('firstName')}
                placeholder="First name"
              />
              {errors.firstName && <span className="text-[9px] text-red-600">{errors.firstName}</span>}
            </div>
            <div>
              <label className="ehr-label block">Middle Name</label>
              <input
                type="text"
                value={formData.middleName}
                onChange={(e) => handleChange('middleName', e.target.value)}
                className="ehr-input w-full"
                placeholder="Middle name"
              />
            </div>
            <div>
              <label className="ehr-label block">Last Name *</label>
              <input
                type="text"
                value={formData.lastName}
                onChange={(e) => handleChange('lastName', e.target.value)}
                className={inputClass('lastName')}
                placeholder="Last name"
              />
              {errors.lastName && <span className="text-[9px] text-red-600">{errors.lastName}</span>}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 mt-2">
            <div>
              <label className="ehr-label block">Date of Birth *</label>
              <input
                type="date"
                value={formData.dateOfBirth}
                onChange={(e) => handleChange('dateOfBirth', e.target.value)}
                className={inputClass('dateOfBirth')}
              />
              {errors.dateOfBirth && <span className="text-[9px] text-red-600">{errors.dateOfBirth}</span>}
            </div>
            <div>
              <label className="ehr-label block">Gender</label>
              <select
                value={formData.gender}
                onChange={(e) => handleChange('gender', e.target.value)}
                className="ehr-input w-full"
              >
                <option value="UNKNOWN">Unknown</option>
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
            <div>
              <label className="ehr-label block">Marital Status</label>
              <select
                value={formData.maritalStatus}
                onChange={(e) => handleChange('maritalStatus', e.target.value)}
                className="ehr-input w-full"
              >
                <option value="UNKNOWN">Unknown</option>
                <option value="SINGLE">Single</option>
                <option value="MARRIED">Married</option>
                <option value="DIVORCED">Divorced</option>
                <option value="WIDOWED">Widowed</option>
                <option value="SEPARATED">Separated</option>
                <option value="DOMESTIC_PARTNER">Domestic Partner</option>
              </select>
            </div>
          </div>
        </fieldset>

        {/* Section: Contact Information */}
        <fieldset className="border border-gray-400 p-2">
          <legend className="text-[11px] font-semibold text-gray-700 px-1">Contact Information</legend>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="ehr-label block">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                className="ehr-input w-full"
                placeholder="email@example.com"
              />
            </div>
            <div>
              <label className="ehr-label block">Home Phone</label>
              <input
                type="text"
                value={formData.phoneHome}
                onChange={(e) => handleChange('phoneHome', e.target.value)}
                className="ehr-input w-full"
                placeholder="555-0000"
              />
            </div>
            <div>
              <label className="ehr-label block">Mobile Phone</label>
              <input
                type="text"
                value={formData.phoneMobile}
                onChange={(e) => handleChange('phoneMobile', e.target.value)}
                className="ehr-input w-full"
                placeholder="555-0000"
              />
            </div>
          </div>
        </fieldset>

        {/* Section: Address */}
        <fieldset className="border border-gray-400 p-2">
          <legend className="text-[11px] font-semibold text-gray-700 px-1">Address</legend>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="ehr-label block">Street Address</label>
              <input
                type="text"
                value={formData.street1}
                onChange={(e) => handleChange('street1', e.target.value)}
                className="ehr-input w-full"
                placeholder="123 Main St"
              />
            </div>
            <div>
              <label className="ehr-label block">Apt/Suite</label>
              <input
                type="text"
                value={formData.street2}
                onChange={(e) => handleChange('street2', e.target.value)}
                className="ehr-input w-full"
                placeholder="Apt 4B"
              />
            </div>
          </div>
          <div className="grid grid-cols-4 gap-2 mt-2">
            <div>
              <label className="ehr-label block">City</label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => handleChange('city', e.target.value)}
                className="ehr-input w-full"
                placeholder="City"
              />
            </div>
            <div>
              <label className="ehr-label block">State</label>
              <input
                type="text"
                value={formData.state}
                onChange={(e) => handleChange('state', e.target.value)}
                className="ehr-input w-full"
                placeholder="ST"
              />
            </div>
            <div>
              <label className="ehr-label block">ZIP Code</label>
              <input
                type="text"
                value={formData.zipCode}
                onChange={(e) => handleChange('zipCode', e.target.value)}
                className="ehr-input w-full"
                placeholder="12345"
              />
            </div>
            <div>
              <label className="ehr-label block">Country</label>
              <input
                type="text"
                value={formData.country}
                onChange={(e) => handleChange('country', e.target.value)}
                className="ehr-input w-full"
              />
            </div>
          </div>
        </fieldset>

        {/* Section: Additional Info */}
        <fieldset className="border border-gray-400 p-2">
          <legend className="text-[11px] font-semibold text-gray-700 px-1">Additional Information</legend>
          <div className="grid grid-cols-4 gap-2">
            <div>
              <label className="ehr-label block">Language</label>
              <input
                type="text"
                value={formData.preferredLanguage}
                onChange={(e) => handleChange('preferredLanguage', e.target.value)}
                className="ehr-input w-full"
              />
            </div>
            <div>
              <label className="ehr-label block">Ethnicity</label>
              <input
                type="text"
                value={formData.ethnicity}
                onChange={(e) => handleChange('ethnicity', e.target.value)}
                className="ehr-input w-full"
                placeholder="Ethnicity"
              />
            </div>
            <div>
              <label className="ehr-label block">Race</label>
              <input
                type="text"
                value={formData.race}
                onChange={(e) => handleChange('race', e.target.value)}
                className="ehr-input w-full"
                placeholder="Race"
              />
            </div>
            <div>
              <label className="ehr-label block">Religion</label>
              <input
                type="text"
                value={formData.religion}
                onChange={(e) => handleChange('religion', e.target.value)}
                className="ehr-input w-full"
                placeholder="Religion"
              />
            </div>
          </div>
        </fieldset>

        {/* Section: Emergency Contact */}
        <fieldset className="border border-gray-400 p-2">
          <legend className="text-[11px] font-semibold text-gray-700 px-1">Emergency Contact</legend>
          <div className="grid grid-cols-4 gap-2">
            <div>
              <label className="ehr-label block">First Name</label>
              <input
                type="text"
                value={formData.emergencyFirstName}
                onChange={(e) => handleChange('emergencyFirstName', e.target.value)}
                className="ehr-input w-full"
                placeholder="First name"
              />
            </div>
            <div>
              <label className="ehr-label block">Last Name</label>
              <input
                type="text"
                value={formData.emergencyLastName}
                onChange={(e) => handleChange('emergencyLastName', e.target.value)}
                className="ehr-input w-full"
                placeholder="Last name"
              />
            </div>
            <div>
              <label className="ehr-label block">Relationship</label>
              <select
                value={formData.emergencyRelationship}
                onChange={(e) => handleChange('emergencyRelationship', e.target.value)}
                className="ehr-input w-full"
              >
                <option value="">Select...</option>
                <option value="SPOUSE">Spouse</option>
                <option value="PARENT">Parent</option>
                <option value="CHILD">Child</option>
                <option value="SIBLING">Sibling</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
            <div>
              <label className="ehr-label block">Phone</label>
              <input
                type="text"
                value={formData.emergencyPhone}
                onChange={(e) => handleChange('emergencyPhone', e.target.value)}
                className="ehr-input w-full"
                placeholder="555-0000"
              />
            </div>
          </div>
        </fieldset>
      </div>
    </Modal>
  );
}
