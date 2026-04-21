import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  ArrowLeft,
  Save,
  X,
  UserPlus,
  CheckCircle2,
} from 'lucide-react';
import { patientService } from '../services/patientService';
import { AlertDialog } from '../components/ui/Modal';
import { LoadingOverlay } from '../components/ui/LoadingOverlay';
import type { Patient, Gender } from '../types';

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA',
  'HI','ID','IL','IN','IA','KS','KY','LA','ME','MD',
  'MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC',
  'SD','TN','TX','UT','VT','VA','WA','WV','WI','WY','DC',
];

const patientIntakeSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(100),
  middleName: z.string().max(100).optional().or(z.literal('')),
  lastName: z.string().min(1, 'Last name is required').max(100),
  dateOfBirth: z.string().min(1, 'Date of birth is required').refine((val) => {
    const date = new Date(val);
    return !isNaN(date.getTime()) && date < new Date();
  }, 'Date of birth must be a valid date in the past'),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER', 'UNKNOWN'], {
    message: 'Gender is required',
  }),
  phoneHome: z.string().max(20).optional().or(z.literal('')),
  phoneMobile: z.string().max(20).optional().or(z.literal('')),
  phoneWork: z.string().max(20).optional().or(z.literal('')),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  street1: z.string().max(200).optional().or(z.literal('')),
  street2: z.string().max(200).optional().or(z.literal('')),
  city: z.string().max(100).optional().or(z.literal('')),
  state: z.string().max(2).optional().or(z.literal('')),
  zipCode: z.string().max(10).optional().or(z.literal('')),
});

type PatientIntakeFormData = z.infer<typeof patientIntakeSchema>;

export default function PatientIntakePage() {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showError, setShowError] = useState<string | null>(null);
  const [createdPatientId, setCreatedPatientId] = useState<number | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PatientIntakeFormData>({
    resolver: zodResolver(patientIntakeSchema),
    defaultValues: {
      firstName: '',
      middleName: '',
      lastName: '',
      dateOfBirth: '',
      gender: undefined,
      phoneHome: '',
      phoneMobile: '',
      phoneWork: '',
      email: '',
      street1: '',
      street2: '',
      city: '',
      state: '',
      zipCode: '',
    },
  });

  const onSubmit = async (data: PatientIntakeFormData) => {
    setSubmitting(true);
    try {
      const payload: Partial<Patient> = {
        firstName: data.firstName,
        lastName: data.lastName,
        middleName: data.middleName || undefined,
        dateOfBirth: data.dateOfBirth,
        gender: data.gender as Gender,
        phoneHome: data.phoneHome || undefined,
        phoneMobile: data.phoneMobile || undefined,
        phoneWork: data.phoneWork || undefined,
        email: data.email || undefined,
        active: true,
      };

      if (data.street1 || data.city || data.state || data.zipCode) {
        payload.address = {
          street1: data.street1 || undefined,
          street2: data.street2 || undefined,
          city: data.city || undefined,
          state: data.state || undefined,
          zipCode: data.zipCode || undefined,
        };
      }

      const created = await patientService.create(payload);
      setCreatedPatientId(created.id ?? null);
      setShowSuccess(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An unexpected error occurred';
      setShowError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSuccessClose = () => {
    setShowSuccess(false);
    if (createdPatientId) {
      navigate(`/patients/${createdPatientId}`);
    } else {
      navigate('/patients');
    }
  };

  const handleRegisterAnother = () => {
    setShowSuccess(false);
    setCreatedPatientId(null);
    reset();
  };

  return (
    <div className="h-full flex flex-col relative" style={{ background: '#d4d0c8' }}>
      <LoadingOverlay isLoading={submitting} text="Registering patient..." />

      {/* Toolbar */}
      <div className="ehr-toolbar flex items-center justify-between">
        <div className="flex items-center space-x-1">
          <button
            className="ehr-toolbar-button flex items-center"
            onClick={() => navigate('/patients')}
          >
            <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Back to Patients
          </button>
          <span className="text-gray-400">|</span>
          <span className="flex items-center text-gray-700 font-semibold px-1">
            <UserPlus className="w-3.5 h-3.5 mr-1" /> New Patient Registration
          </span>
        </div>
        <div className="flex items-center space-x-1">
          <button
            className="ehr-button flex items-center"
            onClick={() => navigate('/patients')}
          >
            <X className="w-3 h-3 mr-1" /> Cancel
          </button>
          <button
            className="ehr-button ehr-button-primary flex items-center"
            onClick={handleSubmit(onSubmit)}
            disabled={submitting}
          >
            <Save className="w-3 h-3 mr-1" /> Register Patient
          </button>
        </div>
      </div>

      {/* Form Content */}
      <div className="flex-1 overflow-auto p-2">
        <form onSubmit={handleSubmit(onSubmit)} className="max-w-4xl mx-auto space-y-2">

          {/* Patient Demographics */}
          <fieldset className="ehr-fieldset">
            <legend>Patient Demographics</legend>
            <div className="grid grid-cols-3 gap-x-4 gap-y-2">
              {/* Last Name */}
              <div>
                <label htmlFor="lastName" className="ehr-label block mb-0.5">
                  Last Name <span className="text-red-600">*</span>
                </label>
                <input
                  id="lastName"
                  type="text"
                  className={`ehr-input w-full ${errors.lastName ? 'border-red-500' : ''}`}
                  placeholder="Last Name"
                  {...register('lastName')}
                />
                {errors.lastName && (
                  <p className="text-[10px] text-red-600 mt-0.5">{errors.lastName.message}</p>
                )}
              </div>

              {/* First Name */}
              <div>
                <label htmlFor="firstName" className="ehr-label block mb-0.5">
                  First Name <span className="text-red-600">*</span>
                </label>
                <input
                  id="firstName"
                  type="text"
                  className={`ehr-input w-full ${errors.firstName ? 'border-red-500' : ''}`}
                  placeholder="First Name"
                  {...register('firstName')}
                />
                {errors.firstName && (
                  <p className="text-[10px] text-red-600 mt-0.5">{errors.firstName.message}</p>
                )}
              </div>

              {/* Middle Name */}
              <div>
                <label htmlFor="middleName" className="ehr-label block mb-0.5">
                  Middle Name
                </label>
                <input
                  id="middleName"
                  type="text"
                  className="ehr-input w-full"
                  placeholder="Middle Name"
                  {...register('middleName')}
                />
              </div>

              {/* Date of Birth */}
              <div>
                <label htmlFor="dateOfBirth" className="ehr-label block mb-0.5">
                  Date of Birth <span className="text-red-600">*</span>
                </label>
                <input
                  id="dateOfBirth"
                  type="date"
                  className={`ehr-input w-full ${errors.dateOfBirth ? 'border-red-500' : ''}`}
                  max={new Date().toISOString().split('T')[0]}
                  {...register('dateOfBirth')}
                />
                {errors.dateOfBirth && (
                  <p className="text-[10px] text-red-600 mt-0.5">{errors.dateOfBirth.message}</p>
                )}
              </div>

              {/* Gender */}
              <div>
                <label htmlFor="gender" className="ehr-label block mb-0.5">
                  Gender <span className="text-red-600">*</span>
                </label>
                <select
                  id="gender"
                  className={`ehr-input w-full ${errors.gender ? 'border-red-500' : ''}`}
                  {...register('gender')}
                >
                  <option value="">-- Select --</option>
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                  <option value="OTHER">Other</option>
                  <option value="UNKNOWN">Unknown</option>
                </select>
                {errors.gender && (
                  <p className="text-[10px] text-red-600 mt-0.5">{errors.gender.message}</p>
                )}
              </div>
            </div>
          </fieldset>

          {/* Contact Information */}
          <fieldset className="ehr-fieldset">
            <legend>Contact Information</legend>
            <div className="grid grid-cols-3 gap-x-4 gap-y-2">
              {/* Phone Mobile */}
              <div>
                <label htmlFor="phoneMobile" className="ehr-label block mb-0.5">
                  Mobile Phone
                </label>
                <input
                  id="phoneMobile"
                  type="tel"
                  className="ehr-input w-full"
                  placeholder="(555) 555-5555"
                  {...register('phoneMobile')}
                />
              </div>

              {/* Phone Home */}
              <div>
                <label htmlFor="phoneHome" className="ehr-label block mb-0.5">
                  Home Phone
                </label>
                <input
                  id="phoneHome"
                  type="tel"
                  className="ehr-input w-full"
                  placeholder="(555) 555-5555"
                  {...register('phoneHome')}
                />
              </div>

              {/* Phone Work */}
              <div>
                <label htmlFor="phoneWork" className="ehr-label block mb-0.5">
                  Work Phone
                </label>
                <input
                  id="phoneWork"
                  type="tel"
                  className="ehr-input w-full"
                  placeholder="(555) 555-5555"
                  {...register('phoneWork')}
                />
              </div>

              {/* Email */}
              <div className="col-span-2">
                <label htmlFor="email" className="ehr-label block mb-0.5">
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  className={`ehr-input w-full ${errors.email ? 'border-red-500' : ''}`}
                  placeholder="patient@example.com"
                  {...register('email')}
                />
                {errors.email && (
                  <p className="text-[10px] text-red-600 mt-0.5">{errors.email.message}</p>
                )}
              </div>
            </div>
          </fieldset>

          {/* Address */}
          <fieldset className="ehr-fieldset">
            <legend>Address</legend>
            <div className="grid grid-cols-3 gap-x-4 gap-y-2">
              {/* Street 1 */}
              <div className="col-span-2">
                <label htmlFor="street1" className="ehr-label block mb-0.5">
                  Street Address
                </label>
                <input
                  id="street1"
                  type="text"
                  className="ehr-input w-full"
                  placeholder="123 Main Street"
                  {...register('street1')}
                />
              </div>

              {/* Street 2 */}
              <div>
                <label htmlFor="street2" className="ehr-label block mb-0.5">
                  Apt / Suite / Unit
                </label>
                <input
                  id="street2"
                  type="text"
                  className="ehr-input w-full"
                  placeholder="Apt 4B"
                  {...register('street2')}
                />
              </div>

              {/* City */}
              <div>
                <label htmlFor="city" className="ehr-label block mb-0.5">
                  City
                </label>
                <input
                  id="city"
                  type="text"
                  className="ehr-input w-full"
                  placeholder="City"
                  {...register('city')}
                />
              </div>

              {/* State */}
              <div>
                <label htmlFor="state" className="ehr-label block mb-0.5">
                  State
                </label>
                <select
                  id="state"
                  className="ehr-input w-full"
                  {...register('state')}
                >
                  <option value="">-- Select --</option>
                  {US_STATES.map((st) => (
                    <option key={st} value={st}>{st}</option>
                  ))}
                </select>
              </div>

              {/* Zip Code */}
              <div>
                <label htmlFor="zipCode" className="ehr-label block mb-0.5">
                  ZIP Code
                </label>
                <input
                  id="zipCode"
                  type="text"
                  className="ehr-input w-full"
                  placeholder="12345"
                  {...register('zipCode')}
                />
              </div>
            </div>
          </fieldset>

          {/* Form Actions (bottom) */}
          <div className="flex items-center justify-between pt-1 pb-2">
            <div className="text-[10px] text-gray-500">
              <span className="text-red-600">*</span> Required fields
            </div>
            <div className="flex items-center space-x-2">
              <button
                type="button"
                className="ehr-button flex items-center"
                onClick={() => navigate('/patients')}
              >
                <X className="w-3 h-3 mr-1" /> Cancel
              </button>
              <button
                type="submit"
                className="ehr-button ehr-button-primary flex items-center"
                disabled={submitting}
              >
                <Save className="w-3 h-3 mr-1" /> Register Patient
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Success Dialog */}
      {showSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" />
          <div className="relative w-80" style={{ fontFamily: 'Tahoma, sans-serif' }}>
            <div className="bg-white border-2 border-gray-400 shadow-lg" style={{ boxShadow: '2px 2px 8px rgba(0,0,0,0.3)' }}>
              <div
                className="flex items-center justify-between px-2 py-1"
                style={{ background: 'linear-gradient(to bottom, #6699cc 0%, #336699 100%)' }}
              >
                <span className="text-white font-semibold text-[11px]">Patient Registered</span>
              </div>
              <div className="p-3 bg-[#ece9d8]">
                <div className="flex items-start space-x-2 mb-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <p className="text-[11px] text-gray-700">
                    Patient has been successfully registered and assigned an MRN. You can now view their chart or register another patient.
                  </p>
                </div>
                <div className="flex justify-end space-x-2">
                  <button
                    className="ehr-button px-3"
                    onClick={handleRegisterAnother}
                  >
                    Register Another
                  </button>
                  <button
                    className="ehr-button ehr-button-primary px-3"
                    onClick={handleSuccessClose}
                  >
                    View Patient Chart
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error Dialog */}
      <AlertDialog
        isOpen={showError !== null}
        onClose={() => setShowError(null)}
        title="Registration Error"
        message={showError || 'An unexpected error occurred while registering the patient.'}
        type="error"
      />
    </div>
  );
}
