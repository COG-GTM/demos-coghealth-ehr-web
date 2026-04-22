import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Save, Plus, Trash2 } from 'lucide-react';
import { patientService } from '../services';
import type { Gender, MaritalStatus, IdentifierType } from '../types';
import { AlertDialog } from '../components/ui/Modal';
import { LoadingOverlay } from '../components/ui/LoadingOverlay';

const genderOptions: Gender[] = ['MALE', 'FEMALE', 'OTHER', 'UNKNOWN'];
const maritalStatusOptions: MaritalStatus[] = [
  'SINGLE', 'MARRIED', 'DIVORCED', 'WIDOWED', 'SEPARATED', 'DOMESTIC_PARTNER', 'UNKNOWN',
];
const identifierTypeOptions: IdentifierType[] = [
  'MRN', 'SSN', 'DRIVERS_LICENSE', 'PASSPORT', 'INSURANCE_MEMBER_ID',
  'INSURANCE_GROUP_ID', 'MEDICARE_ID', 'MEDICAID_ID', 'MILITARY_ID', 'OTHER',
];

const addressSchema = z.object({
  street1: z.string().optional(),
  street2: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  country: z.string().optional(),
});

const emergencyContactSchema = z.object({
  firstName: z.string(),
  lastName: z.string(),
  relationship: z.string().optional(),
  phoneHome: z.string().optional(),
  phoneMobile: z.string().optional(),
  email: z.string().optional(),
  priority: z.number().optional(),
});

const identifierSchema = z.object({
  identifierType: z.string().optional(),
  identifierValue: z.string().optional(),
  issuingAuthority: z.string().optional(),
  effectiveDate: z.string().optional(),
  expirationDate: z.string().optional(),
});

const newPatientSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  middleName: z.string().optional(),
  lastName: z.string().min(1, 'Last name is required'),
  dateOfBirth: z.string().min(1, 'Date of birth is required').refine(
    (val) => new Date(val) < new Date(),
    'Date of birth must be in the past',
  ),
  gender: z.string().optional(),
  maritalStatus: z.string().optional(),
  email: z.string().optional(),
  phoneHome: z.string().optional(),
  phoneMobile: z.string().optional(),
  phoneWork: z.string().optional(),
  address: addressSchema.optional(),
  mailingAddress: addressSchema.optional(),
  preferredLanguage: z.string().optional(),
  ethnicity: z.string().optional(),
  race: z.string().optional(),
  religion: z.string().optional(),
  emergencyContacts: z.array(emergencyContactSchema).optional(),
  identifiers: z.array(identifierSchema).optional(),
});

type NewPatientFormData = z.input<typeof newPatientSchema>;

export default function NewPatientPage() {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [sameAsHome, setSameAsHome] = useState(false);
  const [alertError, setAlertError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(newPatientSchema),
    defaultValues: {
      emergencyContacts: [],
      identifiers: [],
      address: {},
      mailingAddress: {},
    },
  });

  const {
    fields: ecFields,
    append: appendEc,
    remove: removeEc,
  } = useFieldArray({ control, name: 'emergencyContacts' });

  const {
    fields: idFields,
    append: appendId,
    remove: removeId,
  } = useFieldArray({ control, name: 'identifiers' });

  const homeAddress = watch('address');

  const handleSameAsHome = (checked: boolean) => {
    setSameAsHome(checked);
    if (checked && homeAddress) {
      setValue('mailingAddress.street1', homeAddress.street1 ?? '');
      setValue('mailingAddress.street2', homeAddress.street2 ?? '');
      setValue('mailingAddress.city', homeAddress.city ?? '');
      setValue('mailingAddress.state', homeAddress.state ?? '');
      setValue('mailingAddress.zipCode', homeAddress.zipCode ?? '');
      setValue('mailingAddress.country', homeAddress.country ?? '');
    }
  };

  const onSubmit = async (data: NewPatientFormData) => {
    setSubmitting(true);
    try {
      const payload: Parameters<typeof patientService.create>[0] = {
        firstName: data.firstName,
        lastName: data.lastName,
        dateOfBirth: data.dateOfBirth,
        middleName: data.middleName,
        gender: (data.gender || undefined) as Gender | undefined,
        maritalStatus: (data.maritalStatus || undefined) as MaritalStatus | undefined,
        email: data.email,
        phoneHome: data.phoneHome,
        phoneMobile: data.phoneMobile,
        phoneWork: data.phoneWork,
        address: data.address,
        mailingAddress: data.mailingAddress,
        preferredLanguage: data.preferredLanguage,
        ethnicity: data.ethnicity,
        race: data.race,
        religion: data.religion,
        active: true,
        deceased: false,
        emergencyContacts: data.emergencyContacts?.map((ec) => ({
          firstName: ec.firstName ?? '',
          lastName: ec.lastName ?? '',
          relationship: ec.relationship,
          phoneHome: ec.phoneHome,
          phoneMobile: ec.phoneMobile,
          email: ec.email,
          priority: ec.priority,
        })),
        identifiers: data.identifiers?.map((id) => ({
          identifierType: (id.identifierType || 'OTHER') as IdentifierType,
          identifierValue: id.identifierValue ?? '',
          issuingAuthority: id.issuingAuthority,
          effectiveDate: id.effectiveDate,
          expirationDate: id.expirationDate,
        })),
      };
      const created = await patientService.create(payload);
      navigate(`/patients/${created.id}`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred while creating the patient.';
      setAlertError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="h-full flex flex-col relative" style={{ background: '#d4d0c8' }}>
      <LoadingOverlay isLoading={submitting} text="Saving patient..." />

      {/* Toolbar */}
      <div className="ehr-toolbar flex items-center justify-between">
        <div className="flex items-center space-x-1">
          <button
            type="button"
            className="ehr-toolbar-button flex items-center"
            onClick={() => navigate('/patients')}
          >
            <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Back
          </button>
          <span className="text-gray-400">|</span>
          <button
            type="button"
            className="ehr-button ehr-button-primary flex items-center"
            onClick={handleSubmit(onSubmit)}
          >
            <Save className="w-3.5 h-3.5 mr-1" /> Save
          </button>
          <button
            type="button"
            className="ehr-button flex items-center"
            onClick={() => navigate('/patients')}
          >
            Cancel
          </button>
        </div>
        <span className="text-[10px] text-gray-600">New Patient Registration</span>
      </div>

      {/* Form Body */}
      <div className="flex-1 overflow-auto p-3">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 max-w-4xl mx-auto">

          {/* Demographics */}
          <fieldset className="ehr-fieldset">
            <legend>Demographics</legend>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] text-gray-600 mb-0.5">First Name *</label>
                <input type="text" {...register('firstName')} className="ehr-input w-full" />
                {errors.firstName && <span className="text-red-600 text-[10px]">{errors.firstName.message}</span>}
              </div>
              <div>
                <label className="block text-[10px] text-gray-600 mb-0.5">Middle Name</label>
                <input type="text" {...register('middleName')} className="ehr-input w-full" />
              </div>
              <div>
                <label className="block text-[10px] text-gray-600 mb-0.5">Last Name *</label>
                <input type="text" {...register('lastName')} className="ehr-input w-full" />
                {errors.lastName && <span className="text-red-600 text-[10px]">{errors.lastName.message}</span>}
              </div>
              <div>
                <label className="block text-[10px] text-gray-600 mb-0.5">Date of Birth *</label>
                <input type="date" {...register('dateOfBirth')} className="ehr-input w-full" />
                {errors.dateOfBirth && <span className="text-red-600 text-[10px]">{errors.dateOfBirth.message}</span>}
              </div>
              <div>
                <label className="block text-[10px] text-gray-600 mb-0.5">Gender</label>
                <select {...register('gender')} className="ehr-input w-full">
                  <option value="">-- Select --</option>
                  {genderOptions.map((g) => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] text-gray-600 mb-0.5">Marital Status</label>
                <select {...register('maritalStatus')} className="ehr-input w-full">
                  <option value="">-- Select --</option>
                  {maritalStatusOptions.map((ms) => (
                    <option key={ms} value={ms}>{ms.replace(/_/g, ' ')}</option>
                  ))}
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
                <input type="email" {...register('email')} className="ehr-input w-full" />
              </div>
              <div>
                <label className="block text-[10px] text-gray-600 mb-0.5">Home Phone</label>
                <input type="text" {...register('phoneHome')} className="ehr-input w-full" />
              </div>
              <div>
                <label className="block text-[10px] text-gray-600 mb-0.5">Mobile Phone</label>
                <input type="text" {...register('phoneMobile')} className="ehr-input w-full" />
              </div>
              <div>
                <label className="block text-[10px] text-gray-600 mb-0.5">Work Phone</label>
                <input type="text" {...register('phoneWork')} className="ehr-input w-full" />
              </div>
            </div>
          </fieldset>

          {/* Home Address */}
          <fieldset className="ehr-fieldset">
            <legend>Home Address</legend>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] text-gray-600 mb-0.5">Street 1</label>
                <input type="text" {...register('address.street1')} className="ehr-input w-full" />
              </div>
              <div>
                <label className="block text-[10px] text-gray-600 mb-0.5">Street 2</label>
                <input type="text" {...register('address.street2')} className="ehr-input w-full" />
              </div>
              <div>
                <label className="block text-[10px] text-gray-600 mb-0.5">City</label>
                <input type="text" {...register('address.city')} className="ehr-input w-full" />
              </div>
              <div>
                <label className="block text-[10px] text-gray-600 mb-0.5">State</label>
                <input type="text" {...register('address.state')} className="ehr-input w-full" />
              </div>
              <div>
                <label className="block text-[10px] text-gray-600 mb-0.5">Zip Code</label>
                <input type="text" {...register('address.zipCode')} className="ehr-input w-full" />
              </div>
              <div>
                <label className="block text-[10px] text-gray-600 mb-0.5">Country</label>
                <input type="text" {...register('address.country')} className="ehr-input w-full" />
              </div>
            </div>
          </fieldset>

          {/* Mailing Address */}
          <fieldset className="ehr-fieldset">
            <legend>Mailing Address</legend>
            <div className="mb-2">
              <label className="flex items-center text-[11px] text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  className="ehr-checkbox"
                  checked={sameAsHome}
                  onChange={(e) => handleSameAsHome(e.target.checked)}
                />
                Same as home address
              </label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] text-gray-600 mb-0.5">Street 1</label>
                <input type="text" {...register('mailingAddress.street1')} disabled={sameAsHome} className="ehr-input w-full" />
              </div>
              <div>
                <label className="block text-[10px] text-gray-600 mb-0.5">Street 2</label>
                <input type="text" {...register('mailingAddress.street2')} disabled={sameAsHome} className="ehr-input w-full" />
              </div>
              <div>
                <label className="block text-[10px] text-gray-600 mb-0.5">City</label>
                <input type="text" {...register('mailingAddress.city')} disabled={sameAsHome} className="ehr-input w-full" />
              </div>
              <div>
                <label className="block text-[10px] text-gray-600 mb-0.5">State</label>
                <input type="text" {...register('mailingAddress.state')} disabled={sameAsHome} className="ehr-input w-full" />
              </div>
              <div>
                <label className="block text-[10px] text-gray-600 mb-0.5">Zip Code</label>
                <input type="text" {...register('mailingAddress.zipCode')} disabled={sameAsHome} className="ehr-input w-full" />
              </div>
              <div>
                <label className="block text-[10px] text-gray-600 mb-0.5">Country</label>
                <input type="text" {...register('mailingAddress.country')} disabled={sameAsHome} className="ehr-input w-full" />
              </div>
            </div>
          </fieldset>

          {/* Emergency Contacts */}
          <fieldset className="ehr-fieldset">
            <legend>Emergency Contacts</legend>
            {ecFields.map((field, index) => (
              <div key={field.id} className="border border-gray-300 p-2 mb-2 bg-white">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-semibold text-gray-600">Contact #{index + 1}</span>
                  <button type="button" onClick={() => removeEc(index)} className="ehr-button flex items-center text-[10px]">
                    <Trash2 className="w-3 h-3 mr-0.5" /> Remove
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] text-gray-600 mb-0.5">First Name</label>
                    <input type="text" {...register(`emergencyContacts.${index}.firstName`)} className="ehr-input w-full" />
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-600 mb-0.5">Last Name</label>
                    <input type="text" {...register(`emergencyContacts.${index}.lastName`)} className="ehr-input w-full" />
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-600 mb-0.5">Relationship</label>
                    <input type="text" {...register(`emergencyContacts.${index}.relationship`)} className="ehr-input w-full" />
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-600 mb-0.5">Home Phone</label>
                    <input type="text" {...register(`emergencyContacts.${index}.phoneHome`)} className="ehr-input w-full" />
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-600 mb-0.5">Mobile Phone</label>
                    <input type="text" {...register(`emergencyContacts.${index}.phoneMobile`)} className="ehr-input w-full" />
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-600 mb-0.5">Email</label>
                    <input type="text" {...register(`emergencyContacts.${index}.email`)} className="ehr-input w-full" />
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-600 mb-0.5">Priority</label>
                    <input type="number" {...register(`emergencyContacts.${index}.priority`)} className="ehr-input w-full" />
                  </div>
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={() => appendEc({ firstName: '', lastName: '', relationship: '', phoneHome: '', phoneMobile: '', email: '', priority: ecFields.length + 1 })}
              className="ehr-button flex items-center text-[10px]"
            >
              <Plus className="w-3 h-3 mr-0.5" /> Add Contact
            </button>
          </fieldset>

          {/* Identifiers */}
          <fieldset className="ehr-fieldset">
            <legend>Identifiers</legend>
            {idFields.map((field, index) => (
              <div key={field.id} className="border border-gray-300 p-2 mb-2 bg-white">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-semibold text-gray-600">Identifier #{index + 1}</span>
                  <button type="button" onClick={() => removeId(index)} className="ehr-button flex items-center text-[10px]">
                    <Trash2 className="w-3 h-3 mr-0.5" /> Remove
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] text-gray-600 mb-0.5">Type</label>
                    <select {...register(`identifiers.${index}.identifierType`)} className="ehr-input w-full">
                      <option value="">-- Select --</option>
                      {identifierTypeOptions.map((it) => (
                        <option key={it} value={it}>{it.replace(/_/g, ' ')}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-600 mb-0.5">Value</label>
                    <input type="text" {...register(`identifiers.${index}.identifierValue`)} className="ehr-input w-full" />
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-600 mb-0.5">Issuing Authority</label>
                    <input type="text" {...register(`identifiers.${index}.issuingAuthority`)} className="ehr-input w-full" />
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-600 mb-0.5">Effective Date</label>
                    <input type="date" {...register(`identifiers.${index}.effectiveDate`)} className="ehr-input w-full" />
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-600 mb-0.5">Expiration Date</label>
                    <input type="date" {...register(`identifiers.${index}.expirationDate`)} className="ehr-input w-full" />
                  </div>
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={() => appendId({ identifierType: '', identifierValue: '', issuingAuthority: '', effectiveDate: '', expirationDate: '' })}
              className="ehr-button flex items-center text-[10px]"
            >
              <Plus className="w-3 h-3 mr-0.5" /> Add Identifier
            </button>
          </fieldset>

          {/* Additional Information */}
          <fieldset className="ehr-fieldset">
            <legend>Additional Information</legend>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] text-gray-600 mb-0.5">Preferred Language</label>
                <input type="text" {...register('preferredLanguage')} className="ehr-input w-full" />
              </div>
              <div>
                <label className="block text-[10px] text-gray-600 mb-0.5">Ethnicity</label>
                <input type="text" {...register('ethnicity')} className="ehr-input w-full" />
              </div>
              <div>
                <label className="block text-[10px] text-gray-600 mb-0.5">Race</label>
                <input type="text" {...register('race')} className="ehr-input w-full" />
              </div>
              <div>
                <label className="block text-[10px] text-gray-600 mb-0.5">Religion</label>
                <input type="text" {...register('religion')} className="ehr-input w-full" />
              </div>
            </div>
          </fieldset>

        </form>
      </div>

      {/* Status Bar */}
      <div className="ehr-status-bar flex items-center justify-between">
        <span>New Patient Registration</span>
        <span>All fields marked with * are required</span>
      </div>

      {/* Error Alert Dialog */}
      {alertError && (
        <AlertDialog
          isOpen={true}
          onClose={() => setAlertError(null)}
          title="Error"
          message={alertError}
          type="error"
        />
      )}
    </div>
  );
}
