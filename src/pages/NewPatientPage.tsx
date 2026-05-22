import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  UserPlus,
  Save,
  X,
  AlertCircle,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { patientService } from '../services/patientService';
import type { Patient, Gender, MaritalStatus } from '../types';
import { AlertDialog } from '../components/ui/Modal';

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA',
  'KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT',
  'VA','WA','WV','WI','WY','DC',
];

const patientSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(100),
  middleName: z.string().max(100).optional().or(z.literal('')),
  lastName: z.string().min(1, 'Last name is required').max(100),
  dateOfBirth: z.string().min(1, 'Date of birth is required').refine((val) => {
    const date = new Date(val);
    return !isNaN(date.getTime()) && date <= new Date();
  }, 'Must be a valid date in the past'),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER', 'UNKNOWN'] as const, {
    message: 'Gender is required',
  }),
  maritalStatus: z.enum([
    'SINGLE','MARRIED','DIVORCED','WIDOWED','SEPARATED','DOMESTIC_PARTNER','UNKNOWN',
  ] as const).optional(),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  phoneHome: z.string().max(20).optional().or(z.literal('')),
  phoneMobile: z.string().max(20).optional().or(z.literal('')),
  phoneWork: z.string().max(20).optional().or(z.literal('')),
  street1: z.string().max(200).optional().or(z.literal('')),
  street2: z.string().max(200).optional().or(z.literal('')),
  city: z.string().max(100).optional().or(z.literal('')),
  state: z.string().max(2).optional().or(z.literal('')),
  zipCode: z.string().max(10).optional().or(z.literal('')),
  preferredLanguage: z.string().max(50).optional().or(z.literal('')),
  ethnicity: z.string().max(50).optional().or(z.literal('')),
  race: z.string().max(50).optional().or(z.literal('')),
});

type PatientFormData = z.infer<typeof patientSchema>;

function buildPatientPayload(data: PatientFormData): Partial<Patient> {
  const patient: Partial<Patient> = {
    firstName: data.firstName.trim(),
    lastName: data.lastName.trim(),
    dateOfBirth: data.dateOfBirth,
    gender: data.gender as Gender,
    active: true,
  };

  if (data.middleName) patient.middleName = data.middleName.trim();
  if (data.maritalStatus) patient.maritalStatus = data.maritalStatus as MaritalStatus;
  if (data.email) patient.email = data.email.trim();
  if (data.phoneHome) patient.phoneHome = data.phoneHome.trim();
  if (data.phoneMobile) patient.phoneMobile = data.phoneMobile.trim();
  if (data.phoneWork) patient.phoneWork = data.phoneWork.trim();
  if (data.preferredLanguage) patient.preferredLanguage = data.preferredLanguage.trim();
  if (data.ethnicity) patient.ethnicity = data.ethnicity.trim();
  if (data.race) patient.race = data.race.trim();

  if (data.street1 || data.city || data.state || data.zipCode) {
    patient.address = {
      street1: data.street1?.trim() || undefined,
      street2: data.street2?.trim() || undefined,
      city: data.city?.trim() || undefined,
      state: data.state?.trim() || undefined,
      zipCode: data.zipCode?.trim() || undefined,
      country: 'US',
    };
  }

  return patient;
}

export default function NewPatientPage() {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [alert, setAlert] = useState<{ title: string; message: string; type: 'success' | 'error' } | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    demographics: true,
    contact: true,
    address: false,
    additional: false,
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<PatientFormData>({
    resolver: zodResolver(patientSchema),
    defaultValues: {
      firstName: '',
      middleName: '',
      lastName: '',
      dateOfBirth: '',
      gender: undefined,
      maritalStatus: undefined,
      email: '',
      phoneHome: '',
      phoneMobile: '',
      phoneWork: '',
      street1: '',
      street2: '',
      city: '',
      state: '',
      zipCode: '',
      preferredLanguage: '',
      ethnicity: '',
      race: '',
    },
  });

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const onSubmit = async (data: PatientFormData) => {
    setSubmitting(true);
    try {
      const patient = buildPatientPayload(data);
      const created = await patientService.create(patient);
      setAlert({
        title: 'Patient Registered',
        message: `Patient ${created.firstName} ${created.lastName} has been successfully registered (MRN: ${created.mrn || 'Pending'}).`,
        type: 'success',
      });
      reset();
    } catch {
      setAlert({
        title: 'Registration Failed',
        message: 'Unable to register patient. Please verify all fields and try again.',
        type: 'error',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleAlertClose = () => {
    const wasSuccess = alert?.type === 'success';
    setAlert(null);
    if (wasSuccess) {
      navigate('/patients');
    }
  };

  const errorCount = Object.keys(errors).length;

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Page Header */}
      <div className="ehr-header flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <UserPlus className="w-4 h-4" />
          <span className="text-[12px] font-semibold">New Patient Registration</span>
        </div>
        <div className="flex items-center space-x-1">
          <button
            type="button"
            onClick={handleSubmit(onSubmit)}
            disabled={submitting}
            className="ehr-button ehr-button-primary flex items-center"
          >
            <Save className="w-3 h-3 mr-1" />
            {submitting ? 'Saving...' : 'Register Patient'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/patients')}
            className="ehr-button flex items-center"
          >
            <X className="w-3 h-3 mr-1" />
            Cancel
          </button>
        </div>
      </div>

      {/* Validation Summary */}
      {errorCount > 0 && (
        <div className="ehr-alert-critical px-3 py-1.5 flex items-center space-x-2">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
          <span className="text-[10px]">
            {errorCount} validation {errorCount === 1 ? 'error' : 'errors'} — please correct the highlighted fields before submitting.
          </span>
        </div>
      )}

      {/* Form Content */}
      <div className="flex-1 overflow-auto p-2">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-1">
          {/* Demographics Section */}
          <fieldset className="ehr-fieldset">
            <legend
              className="cursor-pointer flex items-center space-x-1 select-none"
              onClick={() => toggleSection('demographics')}
            >
              {expandedSections.demographics ? (
                <ChevronDown className="w-3 h-3" />
              ) : (
                <ChevronRight className="w-3 h-3" />
              )}
              <span>Demographics *</span>
            </legend>

            {expandedSections.demographics && (
              <div className="space-y-2 mt-2">
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label htmlFor="lastName" className="ehr-label block mb-0.5">
                      Last Name <span className="text-red-600">*</span>
                    </label>
                    <input
                      id="lastName"
                      {...register('lastName')}
                      className={`ehr-input w-full ${errors.lastName ? 'border-red-500' : ''}`}
                      placeholder="Last Name"
                    />
                    {errors.lastName && (
                      <p className="text-[10px] text-red-600 mt-0.5">{errors.lastName.message}</p>
                    )}
                  </div>
                  <div>
                    <label htmlFor="firstName" className="ehr-label block mb-0.5">
                      First Name <span className="text-red-600">*</span>
                    </label>
                    <input
                      id="firstName"
                      {...register('firstName')}
                      className={`ehr-input w-full ${errors.firstName ? 'border-red-500' : ''}`}
                      placeholder="First Name"
                    />
                    {errors.firstName && (
                      <p className="text-[10px] text-red-600 mt-0.5">{errors.firstName.message}</p>
                    )}
                  </div>
                  <div>
                    <label htmlFor="middleName" className="ehr-label block mb-0.5">
                      Middle Name
                    </label>
                    <input
                      id="middleName"
                      {...register('middleName')}
                      className="ehr-input w-full"
                      placeholder="Middle Name"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label htmlFor="dateOfBirth" className="ehr-label block mb-0.5">
                      Date of Birth <span className="text-red-600">*</span>
                    </label>
                    <input
                      id="dateOfBirth"
                      type="date"
                      {...register('dateOfBirth')}
                      className={`ehr-input w-full ${errors.dateOfBirth ? 'border-red-500' : ''}`}
                    />
                    {errors.dateOfBirth && (
                      <p className="text-[10px] text-red-600 mt-0.5">{errors.dateOfBirth.message}</p>
                    )}
                  </div>
                  <div>
                    <label htmlFor="gender" className="ehr-label block mb-0.5">
                      Gender <span className="text-red-600">*</span>
                    </label>
                    <select
                      id="gender"
                      {...register('gender')}
                      className={`ehr-input w-full ${errors.gender ? 'border-red-500' : ''}`}
                    >
                      <option value="">— Select —</option>
                      <option value="MALE">Male</option>
                      <option value="FEMALE">Female</option>
                      <option value="OTHER">Other</option>
                      <option value="UNKNOWN">Unknown</option>
                    </select>
                    {errors.gender && (
                      <p className="text-[10px] text-red-600 mt-0.5">{errors.gender.message}</p>
                    )}
                  </div>
                  <div>
                    <label htmlFor="maritalStatus" className="ehr-label block mb-0.5">
                      Marital Status
                    </label>
                    <select
                      id="maritalStatus"
                      {...register('maritalStatus')}
                      className="ehr-input w-full"
                    >
                      <option value="">— Select —</option>
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
              </div>
            )}
          </fieldset>

          {/* Contact Information Section */}
          <fieldset className="ehr-fieldset">
            <legend
              className="cursor-pointer flex items-center space-x-1 select-none"
              onClick={() => toggleSection('contact')}
            >
              {expandedSections.contact ? (
                <ChevronDown className="w-3 h-3" />
              ) : (
                <ChevronRight className="w-3 h-3" />
              )}
              <span>Contact Information</span>
            </legend>

            {expandedSections.contact && (
              <div className="space-y-2 mt-2">
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label htmlFor="phoneMobile" className="ehr-label block mb-0.5">
                      Mobile Phone
                    </label>
                    <input
                      id="phoneMobile"
                      type="tel"
                      {...register('phoneMobile')}
                      className="ehr-input w-full"
                      placeholder="(555) 555-5555"
                    />
                  </div>
                  <div>
                    <label htmlFor="phoneHome" className="ehr-label block mb-0.5">
                      Home Phone
                    </label>
                    <input
                      id="phoneHome"
                      type="tel"
                      {...register('phoneHome')}
                      className="ehr-input w-full"
                      placeholder="(555) 555-5555"
                    />
                  </div>
                  <div>
                    <label htmlFor="phoneWork" className="ehr-label block mb-0.5">
                      Work Phone
                    </label>
                    <input
                      id="phoneWork"
                      type="tel"
                      {...register('phoneWork')}
                      className="ehr-input w-full"
                      placeholder="(555) 555-5555"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label htmlFor="email" className="ehr-label block mb-0.5">
                      Email Address
                    </label>
                    <input
                      id="email"
                      type="email"
                      {...register('email')}
                      className={`ehr-input w-full ${errors.email ? 'border-red-500' : ''}`}
                      placeholder="patient@example.com"
                    />
                    {errors.email && (
                      <p className="text-[10px] text-red-600 mt-0.5">{errors.email.message}</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </fieldset>

          {/* Address Section */}
          <fieldset className="ehr-fieldset">
            <legend
              className="cursor-pointer flex items-center space-x-1 select-none"
              onClick={() => toggleSection('address')}
            >
              {expandedSections.address ? (
                <ChevronDown className="w-3 h-3" />
              ) : (
                <ChevronRight className="w-3 h-3" />
              )}
              <span>Address</span>
            </legend>

            {expandedSections.address && (
              <div className="space-y-2 mt-2">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="street1" className="ehr-label block mb-0.5">
                      Street Address
                    </label>
                    <input
                      id="street1"
                      {...register('street1')}
                      className="ehr-input w-full"
                      placeholder="123 Main St"
                    />
                  </div>
                  <div>
                    <label htmlFor="street2" className="ehr-label block mb-0.5">
                      Apt / Suite / Unit
                    </label>
                    <input
                      id="street2"
                      {...register('street2')}
                      className="ehr-input w-full"
                      placeholder="Apt 4B"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label htmlFor="city" className="ehr-label block mb-0.5">
                      City
                    </label>
                    <input
                      id="city"
                      {...register('city')}
                      className="ehr-input w-full"
                      placeholder="Springfield"
                    />
                  </div>
                  <div>
                    <label htmlFor="state" className="ehr-label block mb-0.5">
                      State
                    </label>
                    <select
                      id="state"
                      {...register('state')}
                      className="ehr-input w-full"
                    >
                      <option value="">— Select —</option>
                      {US_STATES.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="zipCode" className="ehr-label block mb-0.5">
                      ZIP Code
                    </label>
                    <input
                      id="zipCode"
                      {...register('zipCode')}
                      className="ehr-input w-full"
                      placeholder="62701"
                    />
                  </div>
                </div>
              </div>
            )}
          </fieldset>

          {/* Additional Information Section */}
          <fieldset className="ehr-fieldset">
            <legend
              className="cursor-pointer flex items-center space-x-1 select-none"
              onClick={() => toggleSection('additional')}
            >
              {expandedSections.additional ? (
                <ChevronDown className="w-3 h-3" />
              ) : (
                <ChevronRight className="w-3 h-3" />
              )}
              <span>Additional Information</span>
            </legend>

            {expandedSections.additional && (
              <div className="space-y-2 mt-2">
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label htmlFor="preferredLanguage" className="ehr-label block mb-0.5">
                      Preferred Language
                    </label>
                    <select
                      id="preferredLanguage"
                      {...register('preferredLanguage')}
                      className="ehr-input w-full"
                    >
                      <option value="">— Select —</option>
                      <option value="English">English</option>
                      <option value="Spanish">Spanish</option>
                      <option value="French">French</option>
                      <option value="Mandarin">Mandarin</option>
                      <option value="Arabic">Arabic</option>
                      <option value="Portuguese">Portuguese</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="ethnicity" className="ehr-label block mb-0.5">
                      Ethnicity
                    </label>
                    <select
                      id="ethnicity"
                      {...register('ethnicity')}
                      className="ehr-input w-full"
                    >
                      <option value="">— Select —</option>
                      <option value="Hispanic or Latino">Hispanic or Latino</option>
                      <option value="Not Hispanic or Latino">Not Hispanic or Latino</option>
                      <option value="Unknown">Unknown</option>
                      <option value="Declined to Answer">Declined to Answer</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="race" className="ehr-label block mb-0.5">
                      Race
                    </label>
                    <select
                      id="race"
                      {...register('race')}
                      className="ehr-input w-full"
                    >
                      <option value="">— Select —</option>
                      <option value="American Indian or Alaska Native">American Indian or Alaska Native</option>
                      <option value="Asian">Asian</option>
                      <option value="Black or African American">Black or African American</option>
                      <option value="Native Hawaiian or Other Pacific Islander">Native Hawaiian or Other Pacific Islander</option>
                      <option value="White">White</option>
                      <option value="Two or More Races">Two or More Races</option>
                      <option value="Unknown">Unknown</option>
                      <option value="Declined to Answer">Declined to Answer</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </fieldset>

          {/* Bottom Action Bar */}
          <div className="ehr-toolbar flex items-center justify-between mt-2 px-2 py-1">
            <div className="text-[10px] text-gray-500">
              Fields marked with <span className="text-red-600">*</span> are required
            </div>
            <div className="flex items-center space-x-1">
              <button
                type="submit"
                disabled={submitting}
                className="ehr-button ehr-button-primary flex items-center"
              >
                <Save className="w-3 h-3 mr-1" />
                {submitting ? 'Saving...' : 'Register Patient'}
              </button>
              <button
                type="button"
                onClick={() => navigate('/patients')}
                className="ehr-button flex items-center"
              >
                <X className="w-3 h-3 mr-1" />
                Cancel
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Alert Dialog */}
      <AlertDialog
        isOpen={alert !== null}
        onClose={handleAlertClose}
        title={alert?.title || ''}
        message={alert?.message || ''}
        type={alert?.type === 'success' ? 'success' : 'error'}
      />
    </div>
  );
}
