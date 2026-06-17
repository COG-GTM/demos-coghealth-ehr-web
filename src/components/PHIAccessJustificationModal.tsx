import { useState } from 'react';
import { Shield, AlertTriangle } from 'lucide-react';
import { Modal } from './ui/Modal';
import { logPHIAccessJustification } from '../services/auditService';

const JUSTIFICATION_REASONS = [
  { value: 'treatment', label: 'Treatment' },
  { value: 'payment', label: 'Payment' },
  { value: 'healthcare_operations', label: 'Healthcare Operations' },
  { value: 'patient_request', label: 'Patient Request' },
  { value: 'emergency', label: 'Emergency Access Override' },
  { value: 'other', label: 'Other' },
] as const;

type JustificationReason = typeof JUSTIFICATION_REASONS[number]['value'];

interface PHIAccessJustificationModalProps {
  isOpen: boolean;
  patientId: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function PHIAccessJustificationModal({
  isOpen,
  patientId,
  onConfirm,
  onCancel,
}: PHIAccessJustificationModalProps) {
  const [selectedReason, setSelectedReason] = useState<JustificationReason | ''>('');
  const [otherDetails, setOtherDetails] = useState('');
  const [showEmergencyWarning, setShowEmergencyWarning] = useState(false);

  const isOtherSelected = selectedReason === 'other';
  const isEmergencySelected = selectedReason === 'emergency';
  const isValid = selectedReason !== '' && (!isOtherSelected || otherDetails.trim().length > 0);

  const handleReasonChange = (reason: JustificationReason) => {
    setSelectedReason(reason);
    setShowEmergencyWarning(reason === 'emergency');
    if (reason !== 'other') {
      setOtherDetails('');
    }
  };

  const handleConfirm = () => {
    if (!isValid) return;
    const reasonLabel = JUSTIFICATION_REASONS.find(r => r.value === selectedReason)?.label ?? selectedReason;
    logPHIAccessJustification(
      patientId,
      reasonLabel,
      isOtherSelected ? otherDetails.trim() : undefined
    );
    setSelectedReason('');
    setOtherDetails('');
    setShowEmergencyWarning(false);
    onConfirm();
  };

  const handleCancel = () => {
    setSelectedReason('');
    setOtherDetails('');
    setShowEmergencyWarning(false);
    onCancel();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleCancel}
      title="PHI Access Justification Required"
      width="md"
      footer={
        <>
          <button onClick={handleCancel} className="ehr-button px-4">
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="ehr-button ehr-button-primary px-4"
            disabled={!isValid}
          >
            Confirm Access
          </button>
        </>
      }
    >
      <div className="space-y-3">
        <div className="flex items-start space-x-2 p-2 border border-gray-400 bg-blue-50">
          <Shield className="w-4 h-4 text-blue-700 mt-0.5 flex-shrink-0" />
          <div className="text-[11px] text-gray-700">
            <strong>HIPAA Minimum Necessary Standard</strong>
            <p className="mt-0.5">
              Access to Protected Health Information (PHI) requires a documented
              justification. Select the reason for accessing this patient&apos;s records.
            </p>
          </div>
        </div>

        <fieldset className="ehr-fieldset">
          <legend>Access Justification</legend>
          <div className="space-y-1.5">
            {JUSTIFICATION_REASONS.map((reason) => (
              <label
                key={reason.value}
                className="flex items-center cursor-pointer hover:bg-gray-100 px-2 py-1"
              >
                <input
                  type="radio"
                  name="justification"
                  value={reason.value}
                  checked={selectedReason === reason.value}
                  onChange={() => handleReasonChange(reason.value)}
                  className="mr-2"
                />
                <span className={`text-[11px] ${reason.value === 'emergency' ? 'text-red-700 font-semibold' : 'text-gray-700'}`}>
                  {reason.label}
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        {isOtherSelected && (
          <fieldset className="ehr-fieldset">
            <legend>Please Explain</legend>
            <textarea
              value={otherDetails}
              onChange={(e) => setOtherDetails(e.target.value)}
              placeholder="Provide a detailed justification for accessing this patient's PHI..."
              className="ehr-input w-full h-16 resize-none"
              required
            />
            {otherDetails.trim().length === 0 && (
              <p className="text-[10px] text-red-600 mt-0.5">
                A justification is required when selecting &quot;Other&quot;.
              </p>
            )}
          </fieldset>
        )}

        {(showEmergencyWarning || isEmergencySelected) && (
          <div className="flex items-start space-x-2 p-2 border-2 border-red-500 bg-red-50">
            <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
            <div className="text-[11px] text-red-800">
              <strong>Emergency Access Warning</strong>
              <p className="mt-0.5">
                This access will be flagged for mandatory review by the Privacy Officer.
                Emergency overrides are logged with elevated severity and audited within 24 hours.
                Only use this option for genuine emergencies.
              </p>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
