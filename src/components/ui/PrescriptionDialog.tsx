import { useState } from 'react';
import { Pill, Search, AlertCircle, ShieldCheck, ShieldAlert, Info } from 'lucide-react';
import { Modal } from './Modal';
import {
  checkPrescriptionSafety,
  highestSeverity,
  requiresOverride,
  type SafetyAlert,
  type SafetyAlertSeverity,
} from '../../services/drugSafetyService';
import { logSafetyOverride } from '../../services/auditService';

interface PrescriptionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  patientName?: string;
  patientMrn?: string;
  patientAllergies?: string[];
  currentMedications?: string[];
  onSubmit: (prescription: PrescriptionData) => void;
}

interface PrescriptionData {
  medication: string;
  strength: string;
  form: string;
  sig: string;
  quantity: number;
  refills: number;
  daw: boolean;
  pharmacy: string;
  notes?: string;
  safetyOverrideReason?: string;
}

const overrideReasons = [
  'Benefit outweighs risk',
  'Patient has tolerated this combination previously',
  'Will monitor labs / patient closely',
  'Allergy history reviewed - not a true allergy',
  'Existing medication will be discontinued',
];

const severityStyles: Record<SafetyAlertSeverity, { label: string; box: string; badge: string }> = {
  contraindicated: { label: 'CONTRAINDICATED', box: 'ehr-alert-critical', badge: 'bg-[#cc0000] text-white' },
  major: { label: 'MAJOR', box: 'ehr-alert-critical', badge: 'bg-[#990000] text-white' },
  moderate: { label: 'MODERATE', box: 'ehr-alert-warning', badge: 'bg-[#cc9900] text-white' },
  minor: { label: 'MINOR', box: 'ehr-alert-info', badge: 'bg-[#0066cc] text-white' },
};

const commonMedications = [
  { name: 'Lisinopril', strengths: ['2.5mg', '5mg', '10mg', '20mg', '40mg'], form: 'tablet', class: 'ACE Inhibitor' },
  { name: 'Metformin', strengths: ['500mg', '850mg', '1000mg'], form: 'tablet', class: 'Antidiabetic' },
  { name: 'Amlodipine', strengths: ['2.5mg', '5mg', '10mg'], form: 'tablet', class: 'Calcium Channel Blocker' },
  { name: 'Metoprolol Succinate', strengths: ['25mg', '50mg', '100mg', '200mg'], form: 'tablet ER', class: 'Beta Blocker' },
  { name: 'Atorvastatin', strengths: ['10mg', '20mg', '40mg', '80mg'], form: 'tablet', class: 'Statin' },
  { name: 'Omeprazole', strengths: ['20mg', '40mg'], form: 'capsule', class: 'PPI' },
  { name: 'Levothyroxine', strengths: ['25mcg', '50mcg', '75mcg', '88mcg', '100mcg', '112mcg', '125mcg', '150mcg'], form: 'tablet', class: 'Thyroid' },
  { name: 'Sertraline', strengths: ['25mg', '50mg', '100mg'], form: 'tablet', class: 'SSRI' },
  { name: 'Gabapentin', strengths: ['100mg', '300mg', '400mg', '600mg', '800mg'], form: 'capsule', class: 'Anticonvulsant' },
  { name: 'Hydrochlorothiazide', strengths: ['12.5mg', '25mg', '50mg'], form: 'tablet', class: 'Diuretic' },
  { name: 'Losartan', strengths: ['25mg', '50mg', '100mg'], form: 'tablet', class: 'ARB' },
  { name: 'Furosemide', strengths: ['20mg', '40mg', '80mg'], form: 'tablet', class: 'Loop Diuretic' },
  { name: 'Prednisone', strengths: ['5mg', '10mg', '20mg'], form: 'tablet', class: 'Corticosteroid' },
  { name: 'Amoxicillin', strengths: ['250mg', '500mg', '875mg'], form: 'capsule', class: 'Antibiotic' },
  { name: 'Azithromycin', strengths: ['250mg', '500mg'], form: 'tablet', class: 'Antibiotic' },
];

const pharmacies = [
  'CVS Pharmacy - 123 Main St',
  'Walgreens - 456 Oak Ave',
  'Walmart Pharmacy - 789 Commerce Dr',
  'Rite Aid - 321 Elm St',
  'Costco Pharmacy - 555 Warehouse Blvd',
  'Mail Order - Express Scripts',
];

const sigTemplates = [
  'Take 1 tablet by mouth once daily',
  'Take 1 tablet by mouth twice daily',
  'Take 1 tablet by mouth three times daily',
  'Take 1 tablet by mouth at bedtime',
  'Take 1 tablet by mouth in the morning',
  'Take 1 tablet by mouth with food',
  'Take 2 tablets by mouth once daily',
  'Take 1 capsule by mouth once daily',
  'Take 1 capsule by mouth twice daily',
];

export function PrescriptionDialog({ isOpen, onClose, patientName, patientMrn, patientAllergies = [], currentMedications = [], onSubmit }: PrescriptionDialogProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMed, setSelectedMed] = useState<typeof commonMedications[0] | null>(null);
  const [prescription, setPrescription] = useState<Partial<PrescriptionData>>({
    strength: '',
    sig: 'Take 1 tablet by mouth once daily',
    quantity: 30,
    refills: 3,
    daw: false,
    pharmacy: pharmacies[0],
    notes: '',
  });

  const [overrideReason, setOverrideReason] = useState('');

  const alertsFor = (medName: string): SafetyAlert[] =>
    checkPrescriptionSafety(medName, currentMedications, patientAllergies);

  const selectedAlerts = selectedMed ? alertsFor(selectedMed.name) : [];
  const needsOverride = requiresOverride(selectedAlerts);
  const canSign = !!selectedMed && !!prescription.strength && (!needsOverride || overrideReason.trim().length > 0);

  const filteredMeds = commonMedications.filter(med =>
    med.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    med.class.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectMedication = (med: typeof commonMedications[0]) => {
    setSelectedMed(med);
    setOverrideReason('');
    setPrescription(prev => ({
      ...prev,
      medication: med.name,
      form: med.form,
      strength: med.strengths[0],
    }));
  };

  const handleSubmit = () => {
    if (selectedMed && prescription.strength && prescription.sig && canSign) {
      if (needsOverride) {
        logSafetyOverride(
          patientMrn,
          `${selectedMed.name} ${prescription.strength}`,
          selectedAlerts.map(a => a.title),
          overrideReason.trim()
        );
      }
      onSubmit({
        medication: selectedMed.name,
        strength: prescription.strength!,
        form: selectedMed.form,
        sig: prescription.sig!,
        quantity: prescription.quantity || 30,
        refills: prescription.refills || 0,
        daw: prescription.daw || false,
        pharmacy: prescription.pharmacy || pharmacies[0],
        notes: prescription.notes,
        safetyOverrideReason: needsOverride ? overrideReason.trim() : undefined,
      });
      setSelectedMed(null);
      setSearchQuery('');
      setOverrideReason('');
      setPrescription({
        strength: '',
        sig: 'Take 1 tablet by mouth once daily',
        quantity: 30,
        refills: 3,
        daw: false,
        pharmacy: pharmacies[0],
        notes: '',
      });
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="e-Prescribe Medication"
      width="lg"
      footer={
        <>
          <button onClick={onClose} className="ehr-button px-4">
            Cancel
          </button>
          <button 
            onClick={handleSubmit} 
            className="ehr-button ehr-button-primary px-4 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!canSign}
          >
            {needsOverride ? 'Override & Sign' : 'Sign & Send to Pharmacy'}
          </button>
        </>
      }
    >
      <div className="space-y-3">
        {/* Patient Info & Allergies */}
        <div className="flex space-x-2">
          {patientName && (
            <div className="ehr-alert-info p-2 flex-1">
              <span className="text-[11px]">
                <strong>Patient:</strong> {patientName} {patientMrn && `(${patientMrn})`}
              </span>
            </div>
          )}
          {patientAllergies.length > 0 && (
            <div className="ehr-alert-critical p-2 flex items-center">
              <AlertCircle className="w-4 h-4 mr-1" />
              <span className="text-[11px]">
                <strong>Allergies:</strong> {patientAllergies.join(', ')}
              </span>
            </div>
          )}
        </div>

        <div className="flex space-x-3">
          {/* Medication Search */}
          <div className="w-64">
            <fieldset className="ehr-fieldset h-56 flex flex-col">
              <legend>Select Medication</legend>
              <div className="flex items-center space-x-2 mb-2">
                <Search className="w-3.5 h-3.5 text-gray-500" />
                <input
                  type="text"
                  placeholder="Search medications..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="ehr-input flex-1"
                />
              </div>
              <div className="flex-1 overflow-auto border border-gray-300 bg-white">
                {filteredMeds.map((med) => {
                  const topSeverity = highestSeverity(alertsFor(med.name));
                  return (
                    <div
                      key={med.name}
                      onClick={() => selectMedication(med)}
                      data-testid={`rx-med-${med.name}`}
                      className={`px-2 py-1 text-[11px] cursor-pointer border-b border-gray-200 ${
                        selectedMed?.name === med.name ? 'bg-blue-100' : 'hover:bg-blue-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{med.name}</span>
                        {topSeverity && (
                          <span
                            className={`px-1 text-[8px] font-bold ${severityStyles[topSeverity].badge}`}
                            title={`${severityStyles[topSeverity].label} safety alert`}
                          >
                            {severityStyles[topSeverity].label}
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-gray-500">{med.class} • {med.form}</div>
                    </div>
                  );
                })}
              </div>
            </fieldset>
          </div>

          {/* Prescription Details */}
          <div className="flex-1">
            <fieldset className="ehr-fieldset">
              <legend>Prescription Details</legend>
              {selectedMed ? (
                <div className="space-y-2">
                  <div className="p-2 bg-gray-100 border border-gray-400 mb-2">
                    <div className="font-semibold text-[12px]">{selectedMed.name}</div>
                    <div className="text-[10px] text-gray-600">{selectedMed.class} • {selectedMed.form}</div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] text-gray-600 mb-0.5">Strength</label>
                      <select
                        value={prescription.strength}
                        onChange={(e) => setPrescription({ ...prescription, strength: e.target.value })}
                        className="ehr-input w-full"
                      >
                        {selectedMed.strengths.map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] text-gray-600 mb-0.5">Quantity</label>
                      <input
                        type="number"
                        value={prescription.quantity}
                        onChange={(e) => setPrescription({ ...prescription, quantity: parseInt(e.target.value) || 0 })}
                        className="ehr-input w-full"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] text-gray-600 mb-0.5">Sig (Directions)</label>
                    <select
                      value={prescription.sig}
                      onChange={(e) => setPrescription({ ...prescription, sig: e.target.value })}
                      className="ehr-input w-full mb-1"
                    >
                      {sigTemplates.map(sig => (
                        <option key={sig} value={sig}>{sig}</option>
                      ))}
                    </select>
                    <input
                      type="text"
                      value={prescription.sig}
                      onChange={(e) => setPrescription({ ...prescription, sig: e.target.value })}
                      className="ehr-input w-full"
                      placeholder="Or type custom directions..."
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] text-gray-600 mb-0.5">Refills</label>
                      <select
                        value={prescription.refills}
                        onChange={(e) => setPrescription({ ...prescription, refills: parseInt(e.target.value) })}
                        className="ehr-input w-full"
                      >
                        {[0, 1, 2, 3, 4, 5, 6, 11].map(n => (
                          <option key={n} value={n}>{n} {n === 11 ? '(PRN)' : ''}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] text-gray-600 mb-0.5">DAW</label>
                      <label className="flex items-center mt-1 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={prescription.daw}
                          onChange={(e) => setPrescription({ ...prescription, daw: e.target.checked })}
                          className="ehr-checkbox"
                        />
                        <span className="ehr-label">Dispense as Written</span>
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] text-gray-600 mb-0.5">Pharmacy</label>
                    <select
                      value={prescription.pharmacy}
                      onChange={(e) => setPrescription({ ...prescription, pharmacy: e.target.value })}
                      className="ehr-input w-full"
                    >
                      {pharmacies.map(p => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>
                </div>
              ) : (
                <div className="h-40 flex items-center justify-center text-gray-500 text-[11px]">
                  <Pill className="w-5 h-5 mr-2 opacity-50" />
                  Select a medication from the list
                </div>
              )}
            </fieldset>
          </div>
        </div>

        {selectedMed && selectedAlerts.length === 0 && (
          <div className="ehr-alert-info p-2 flex items-start text-[10px]" data-testid="rx-safety-clear">
            <ShieldCheck className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
            <div>
              <strong>Medication Safety Check:</strong> No allergy conflicts, interactions or duplicate therapy found
              {' '}({currentMedications.length} active medication{currentMedications.length === 1 ? '' : 's'}, {patientAllergies.length} allerg{patientAllergies.length === 1 ? 'y' : 'ies'} screened).
              <br />
              <span className="text-gray-600">Always verify patient's complete medication list before prescribing.</span>
            </div>
          </div>
        )}

        {selectedMed && selectedAlerts.length > 0 && (
          <fieldset className="ehr-fieldset" data-testid="rx-safety-alerts">
            <legend className="flex items-center">
              <ShieldAlert className="w-3.5 h-3.5 mr-1 text-[#cc0000]" />
              Medication Safety Alerts ({selectedAlerts.length})
            </legend>
            <div className="space-y-1 max-h-40 overflow-auto">
              {selectedAlerts.map(alert => {
                const style = severityStyles[alert.severity];
                return (
                  <div key={alert.id} className={`${style.box} p-1.5 text-[10px]`}>
                    <div className="flex items-center mb-0.5">
                      <span className={`px-1 mr-1.5 text-[8px] font-bold ${style.badge}`}>{style.label}</span>
                      <strong>{alert.title}</strong>
                    </div>
                    <div>{alert.description}</div>
                    <div className="flex items-start mt-0.5 text-gray-700">
                      <Info className="w-3 h-3 mr-1 mt-px flex-shrink-0" />
                      <span>{alert.recommendation}</span>
                    </div>
                  </div>
                );
              })}
            </div>
            {needsOverride && (
              <div className="mt-2 pt-2 border-t border-gray-300">
                <label className="block text-[10px] font-semibold text-[#990000] mb-0.5">
                  Override reason (required to sign)
                </label>
                <select
                  value={overrideReasons.includes(overrideReason) ? overrideReason : ''}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  className="ehr-input w-full mb-1"
                  data-testid="rx-override-reason"
                >
                  <option value="">-- Select reason --</option>
                  {overrideReasons.map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
                <input
                  type="text"
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  className="ehr-input w-full"
                  placeholder="Or type a clinical justification..."
                />
                <div className="text-[9px] text-gray-600 mt-0.5">Overrides are recorded in the HIPAA audit log.</div>
              </div>
            )}
          </fieldset>
        )}
      </div>
    </Modal>
  );
}
