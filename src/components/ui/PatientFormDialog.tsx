import { useState, type FormEvent } from 'react';
import type { Gender, Patient } from '../../types';
import Input from './Input';
import { Modal } from './Modal';

interface PatientFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (patient: Partial<Patient>) => void;
  initialValues?: Partial<Patient>;
}

interface PatientFormValues {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: Gender | '';
  phoneMobile: string;
  email: string;
  allergies: string;
}

function getFormValues(initialValues?: Partial<Patient>): PatientFormValues {
  return {
    firstName: initialValues?.firstName || '',
    lastName: initialValues?.lastName || '',
    dateOfBirth: initialValues?.dateOfBirth || '',
    gender: initialValues?.gender || '',
    phoneMobile: initialValues?.phoneMobile || '',
    email: initialValues?.email || '',
    allergies: initialValues?.allergies || '',
  };
}

export default function PatientFormDialog({
  isOpen,
  onClose,
  onSubmit,
  initialValues,
}: PatientFormDialogProps) {
  const [values, setValues] = useState<PatientFormValues>(() => getFormValues(initialValues));
  const [errors, setErrors] = useState<Record<string, string>>({});

  const updateValue = <K extends keyof PatientFormValues>(field: K, value: PatientFormValues[K]) => {
    setValues(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors: Record<string, string> = {};
    const firstName = values.firstName.trim();
    const lastName = values.lastName.trim();

    if (!firstName) nextErrors.firstName = 'First name is required';
    if (!lastName) nextErrors.lastName = 'Last name is required';
    if (!values.dateOfBirth) nextErrors.dateOfBirth = 'Date of birth is required';

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    onSubmit({
      firstName,
      lastName,
      dateOfBirth: values.dateOfBirth,
      gender: values.gender || undefined,
      phoneMobile: values.phoneMobile.trim() || undefined,
      email: values.email.trim() || undefined,
      allergies: values.allergies.trim() || undefined,
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="New Patient"
      width="lg"
      footer={
        <>
          <button type="button" onClick={onClose} className="ehr-button px-4">
            Cancel
          </button>
          <button type="submit" form="patient-form" className="ehr-button ehr-button-primary px-4">
            Save
          </button>
        </>
      }
    >
      <form id="patient-form" onSubmit={handleSubmit} className="space-y-3">
        <fieldset className="ehr-fieldset">
          <legend>Patient Information</legend>
          <div className="grid grid-cols-2 gap-2">
            <Input
              label="First Name *"
              value={values.firstName}
              onChange={event => updateValue('firstName', event.target.value)}
              error={errors.firstName}
              autoFocus
            />
            <Input
              label="Last Name *"
              value={values.lastName}
              onChange={event => updateValue('lastName', event.target.value)}
              error={errors.lastName}
            />
            <Input
              label="Date of Birth *"
              type="date"
              value={values.dateOfBirth}
              onChange={event => updateValue('dateOfBirth', event.target.value)}
              error={errors.dateOfBirth}
            />
            <div>
              <label htmlFor="patient-gender" className="ehr-label block mb-1">Gender</label>
              <select
                id="patient-gender"
                value={values.gender}
                onChange={event => updateValue('gender', event.target.value as Gender | '')}
                className="ehr-input w-full"
              >
                <option value="">Select gender</option>
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
                <option value="OTHER">Other</option>
                <option value="UNKNOWN">Unknown</option>
              </select>
            </div>
          </div>
        </fieldset>

        <fieldset className="ehr-fieldset">
          <legend>Contact Information</legend>
          <div className="grid grid-cols-2 gap-2">
            <Input
              label="Mobile Phone"
              type="tel"
              value={values.phoneMobile}
              onChange={event => updateValue('phoneMobile', event.target.value)}
            />
            <Input
              label="Email"
              type="email"
              value={values.email}
              onChange={event => updateValue('email', event.target.value)}
            />
          </div>
        </fieldset>

        <fieldset className="ehr-fieldset">
          <legend>Clinical Information</legend>
          <label htmlFor="patient-allergies" className="ehr-label block mb-1">Allergies</label>
          <textarea
            id="patient-allergies"
            value={values.allergies}
            onChange={event => updateValue('allergies', event.target.value)}
            placeholder="e.g. Penicillin, Latex, Peanuts"
            className="ehr-input w-full"
            rows={3}
          />
          <p className="mt-1 text-[10px] text-gray-500">Free-text; comma separated</p>
        </fieldset>
      </form>
    </Modal>
  );
}
