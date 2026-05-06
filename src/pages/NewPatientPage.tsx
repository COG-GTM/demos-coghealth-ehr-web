import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Save, X, UserPlus, Loader2 } from 'lucide-react';
import { patientService } from '../services/patientService';
import { ConfirmDialog } from '../components/ui/Modal';
import type {
  Patient,
  Address,
  Gender,
  MaritalStatus,
} from '../types';

interface FormState {
  firstName: string;
  middleName: string;
  lastName: string;
  dateOfBirth: string;
  gender: Gender | '';
  maritalStatus: MaritalStatus | '';
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
}

type FieldErrors = Partial<Record<keyof FormState, string>>;

const initialState: FormState = {
  firstName: '',
  middleName: '',
  lastName: '',
  dateOfBirth: '',
  gender: '',
  maritalStatus: '',
  email: '',
  phoneHome: '',
  phoneMobile: '',
  phoneWork: '',
  street1: '',
  street2: '',
  city: '',
  state: '',
  zipCode: '',
  country: 'USA',
};

const genderOptions: { value: Gender; label: string }[] = [
  { value: 'MALE', label: 'Male' },
  { value: 'FEMALE', label: 'Female' },
  { value: 'OTHER', label: 'Other' },
  { value: 'UNKNOWN', label: 'Unknown' },
];

const maritalStatusOptions: { value: MaritalStatus; label: string }[] = [
  { value: 'SINGLE', label: 'Single' },
  { value: 'MARRIED', label: 'Married' },
  { value: 'DIVORCED', label: 'Divorced' },
  { value: 'WIDOWED', label: 'Widowed' },
  { value: 'SEPARATED', label: 'Separated' },
  { value: 'DOMESTIC_PARTNER', label: 'Domestic Partner' },
  { value: 'UNKNOWN', label: 'Unknown' },
];

const usStates = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
  'DC',
];

function validate(form: FormState): FieldErrors {
  const errors: FieldErrors = {};

  if (!form.firstName.trim()) errors.firstName = 'First name is required';
  if (!form.lastName.trim()) errors.lastName = 'Last name is required';

  if (!form.dateOfBirth) {
    errors.dateOfBirth = 'Date of birth is required';
  } else {
    const dob = new Date(form.dateOfBirth);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (Number.isNaN(dob.getTime())) {
      errors.dateOfBirth = 'Invalid date';
    } else if (dob >= today) {
      errors.dateOfBirth = 'Date of birth must be in the past';
    }
  }

  if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
    errors.email = 'Invalid email address';
  }

  if (form.zipCode && !/^\d{5}(-\d{4})?$/.test(form.zipCode)) {
    errors.zipCode = 'Use format 12345 or 12345-6789';
  }

  return errors;
}

function buildPayload(form: FormState): Partial<Patient> {
  const hasAddress =
    form.street1 || form.street2 || form.city || form.state || form.zipCode;
  const address: Address | undefined = hasAddress
    ? {
        street1: form.street1 || undefined,
        street2: form.street2 || undefined,
        city: form.city || undefined,
        state: form.state || undefined,
        zipCode: form.zipCode || undefined,
        country: form.country || undefined,
      }
    : undefined;

  return {
    firstName: form.firstName.trim(),
    middleName: form.middleName.trim() || undefined,
    lastName: form.lastName.trim(),
    dateOfBirth: form.dateOfBirth,
    gender: form.gender || undefined,
    maritalStatus: form.maritalStatus || undefined,
    email: form.email.trim() || undefined,
    phoneHome: form.phoneHome.trim() || undefined,
    phoneMobile: form.phoneMobile.trim() || undefined,
    phoneWork: form.phoneWork.trim() || undefined,
    address,
    active: true,
  };
}

interface FieldProps {
  label: string;
  name: keyof FormState;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}

function Field({ label, name, required, error, children }: FieldProps) {
  return (
    <div className="flex flex-col">
      <label htmlFor={name} className="ehr-label mb-0.5">
        {label}
        {required && <span className="text-red-600 ml-0.5">*</span>}
      </label>
      {children}
      {error && <span className="text-[10px] text-red-600 mt-0.5">{error}</span>}
    </div>
  );
}

export default function NewPatientPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState<FormState>(initialState);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  const isDirty = Object.keys(form).some(
    (key) =>
      form[key as keyof FormState] !==
      initialState[key as keyof FormState],
  );

  const updateField = <K extends keyof FormState>(name: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const validationErrors = validate(form);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    setErrors({});
    setSubmitError(null);
    setSubmitting(true);
    try {
      const created = await patientService.create(buildPayload(form));
      if (created.id) {
        navigate(`/patients/${created.id}`);
      } else {
        navigate('/patients');
      }
    } catch (err) {
      console.error('Failed to create patient:', err);
      setSubmitError(
        err instanceof Error
          ? err.message
          : 'Failed to register patient. Please try again.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (isDirty) {
      setShowCancelConfirm(true);
    } else {
      navigate('/patients');
    }
  };

  return (
    <div className="h-full flex flex-col" style={{ background: '#d4d0c8' }}>
      {/* Toolbar */}
      <div className="ehr-toolbar flex items-center justify-between">
        <div className="flex items-center space-x-1">
          <button
            type="submit"
            form="new-patient-form"
            disabled={submitting}
            className="ehr-toolbar-button flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5 mr-1" />
            )}
            {submitting ? 'Saving...' : 'Save Patient'}
          </button>
          <span className="text-gray-400">|</span>
          <button
            type="button"
            onClick={handleCancel}
            className="ehr-toolbar-button flex items-center"
          >
            <X className="w-3.5 h-3.5 mr-1" /> Cancel
          </button>
        </div>
        <div className="flex items-center space-x-2 text-gray-600 pr-2">
          <UserPlus className="w-3.5 h-3.5" />
          <span className="font-semibold">New Patient Registration</span>
        </div>
      </div>

      {/* Form Content */}
      <div className="flex-1 overflow-auto p-3">
        <form
          id="new-patient-form"
          onSubmit={handleSubmit}
          className="max-w-4xl mx-auto space-y-3"
          noValidate
        >
          {submitError && (
            <div className="ehr-alert-critical p-2 text-[11px]">
              {submitError}
            </div>
          )}

          {/* Demographics */}
          <fieldset className="ehr-fieldset">
            <legend>Demographics</legend>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Field label="First Name" name="firstName" required error={errors.firstName}>
                <input
                  id="firstName"
                  type="text"
                  className="ehr-input w-full"
                  value={form.firstName}
                  onChange={(e) => updateField('firstName', e.target.value)}
                  maxLength={100}
                  autoComplete="given-name"
                />
              </Field>
              <Field label="Middle Name" name="middleName" error={errors.middleName}>
                <input
                  id="middleName"
                  type="text"
                  className="ehr-input w-full"
                  value={form.middleName}
                  onChange={(e) => updateField('middleName', e.target.value)}
                  maxLength={100}
                  autoComplete="additional-name"
                />
              </Field>
              <Field label="Last Name" name="lastName" required error={errors.lastName}>
                <input
                  id="lastName"
                  type="text"
                  className="ehr-input w-full"
                  value={form.lastName}
                  onChange={(e) => updateField('lastName', e.target.value)}
                  maxLength={100}
                  autoComplete="family-name"
                />
              </Field>
              <Field
                label="Date of Birth"
                name="dateOfBirth"
                required
                error={errors.dateOfBirth}
              >
                <input
                  id="dateOfBirth"
                  type="date"
                  className="ehr-input w-full"
                  value={form.dateOfBirth}
                  onChange={(e) => updateField('dateOfBirth', e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                  autoComplete="bday"
                />
              </Field>
              <Field label="Gender" name="gender" error={errors.gender}>
                <select
                  id="gender"
                  className="ehr-input w-full"
                  value={form.gender}
                  onChange={(e) =>
                    updateField('gender', e.target.value as Gender | '')
                  }
                >
                  <option value="">Select...</option>
                  {genderOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field
                label="Marital Status"
                name="maritalStatus"
                error={errors.maritalStatus}
              >
                <select
                  id="maritalStatus"
                  className="ehr-input w-full"
                  value={form.maritalStatus}
                  onChange={(e) =>
                    updateField(
                      'maritalStatus',
                      e.target.value as MaritalStatus | '',
                    )
                  }
                >
                  <option value="">Select...</option>
                  {maritalStatusOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          </fieldset>

          {/* Contact */}
          <fieldset className="ehr-fieldset">
            <legend>Contact Information</legend>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field label="Email" name="email" error={errors.email}>
                <input
                  id="email"
                  type="email"
                  className="ehr-input w-full"
                  value={form.email}
                  onChange={(e) => updateField('email', e.target.value)}
                  maxLength={150}
                  autoComplete="email"
                />
              </Field>
              <Field label="Mobile Phone" name="phoneMobile" error={errors.phoneMobile}>
                <input
                  id="phoneMobile"
                  type="tel"
                  className="ehr-input w-full"
                  value={form.phoneMobile}
                  onChange={(e) => updateField('phoneMobile', e.target.value)}
                  placeholder="(555) 555-5555"
                  autoComplete="tel"
                />
              </Field>
              <Field label="Home Phone" name="phoneHome" error={errors.phoneHome}>
                <input
                  id="phoneHome"
                  type="tel"
                  className="ehr-input w-full"
                  value={form.phoneHome}
                  onChange={(e) => updateField('phoneHome', e.target.value)}
                  placeholder="(555) 555-5555"
                />
              </Field>
              <Field label="Work Phone" name="phoneWork" error={errors.phoneWork}>
                <input
                  id="phoneWork"
                  type="tel"
                  className="ehr-input w-full"
                  value={form.phoneWork}
                  onChange={(e) => updateField('phoneWork', e.target.value)}
                  placeholder="(555) 555-5555"
                />
              </Field>
            </div>
          </fieldset>

          {/* Address */}
          <fieldset className="ehr-fieldset">
            <legend>Address</legend>
            <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
              <div className="md:col-span-6">
                <Field label="Street Address" name="street1" error={errors.street1}>
                  <input
                    id="street1"
                    type="text"
                    className="ehr-input w-full"
                    value={form.street1}
                    onChange={(e) => updateField('street1', e.target.value)}
                    maxLength={200}
                    autoComplete="address-line1"
                  />
                </Field>
              </div>
              <div className="md:col-span-6">
                <Field
                  label="Apt / Suite / Unit"
                  name="street2"
                  error={errors.street2}
                >
                  <input
                    id="street2"
                    type="text"
                    className="ehr-input w-full"
                    value={form.street2}
                    onChange={(e) => updateField('street2', e.target.value)}
                    maxLength={100}
                    autoComplete="address-line2"
                  />
                </Field>
              </div>
              <div className="md:col-span-3">
                <Field label="City" name="city" error={errors.city}>
                  <input
                    id="city"
                    type="text"
                    className="ehr-input w-full"
                    value={form.city}
                    onChange={(e) => updateField('city', e.target.value)}
                    maxLength={100}
                    autoComplete="address-level2"
                  />
                </Field>
              </div>
              <div className="md:col-span-1">
                <Field label="State" name="state" error={errors.state}>
                  <select
                    id="state"
                    className="ehr-input w-full"
                    value={form.state}
                    onChange={(e) => updateField('state', e.target.value)}
                  >
                    <option value="">--</option>
                    {usStates.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
              <div className="md:col-span-1">
                <Field label="ZIP Code" name="zipCode" error={errors.zipCode}>
                  <input
                    id="zipCode"
                    type="text"
                    className="ehr-input w-full"
                    value={form.zipCode}
                    onChange={(e) => updateField('zipCode', e.target.value)}
                    placeholder="12345"
                    maxLength={10}
                    autoComplete="postal-code"
                  />
                </Field>
              </div>
              <div className="md:col-span-1">
                <Field label="Country" name="country" error={errors.country}>
                  <input
                    id="country"
                    type="text"
                    className="ehr-input w-full"
                    value={form.country}
                    onChange={(e) => updateField('country', e.target.value)}
                    maxLength={100}
                    autoComplete="country-name"
                  />
                </Field>
              </div>
            </div>
          </fieldset>

          {/* Footer actions */}
          <div className="flex items-center justify-end space-x-2 pt-2">
            <button
              type="button"
              onClick={handleCancel}
              className="ehr-button px-4"
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="ehr-button ehr-button-primary px-4 flex items-center"
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                  Registering...
                </>
              ) : (
                <>
                  <Save className="w-3 h-3 mr-1" />
                  Register Patient
                </>
              )}
            </button>
          </div>
          <p className="text-[10px] text-gray-500 text-center pb-2">
            <span className="text-red-600">*</span> indicates a required field. An
            MRN will be generated automatically on registration.
          </p>
        </form>
      </div>

      {/* Status Bar */}
      <div className="ehr-status-bar flex items-center justify-between">
        <span>New Patient Registration</span>
        <span>{submitting ? 'Submitting...' : 'Ready'}</span>
      </div>

      <ConfirmDialog
        isOpen={showCancelConfirm}
        onClose={() => setShowCancelConfirm(false)}
        onConfirm={() => navigate('/patients')}
        title="Discard changes?"
        message="You have unsaved changes. Are you sure you want to discard this patient registration?"
        type="warning"
        confirmText="Discard"
        cancelText="Keep Editing"
      />
    </div>
  );
}
