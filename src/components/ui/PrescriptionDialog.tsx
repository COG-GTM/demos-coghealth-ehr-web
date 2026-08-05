import { useMemo, useState } from 'react';
import { Pill, Search, AlertTriangle, AlertCircle } from 'lucide-react';
import { Modal } from './Modal';
import { logCdsAlertOverride } from '../../services/auditService';
import { requiresPrescriptionOverride, screenPrescription, type CdsAlert, type InteractionMedication } from '../../services/interactionService';

export interface PrescriptionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  patientName?: string;
  patientMrn?: string;
  patientAllergies?: string[];
  activeMedications?: (InteractionMedication | string)[];
  patientId?: string;
  onSubmit: (prescription: PrescriptionData) => void;
}

export interface PrescriptionOverride {
  reason: string;
  acknowledgedAlertIds: string[];
  acknowledgingUser: string;
  timestamp: string;
}

export interface PrescriptionData {
  medication: string;
  strength: string;
  form: string;
  sig: string;
  quantity: number;
  refills: number;
  daw: boolean;
  pharmacy: string;
  notes?: string;
  alerts: CdsAlert[];
  override?: PrescriptionOverride;
}

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

export function PrescriptionDialog({ isOpen, onClose, patientName, patientMrn, patientAllergies = [], activeMedications = [], patientId, onSubmit }: PrescriptionDialogProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMed, setSelectedMed] = useState<typeof commonMedications[0] | null>(null);
  const [acknowledgedAlerts, setAcknowledgedAlerts] = useState<Record<string, boolean>>({});
  const [overrideReason, setOverrideReason] = useState('');
  const [overrideOther, setOverrideOther] = useState('');
  const [prescription, setPrescription] = useState<Partial<PrescriptionData>>({
    strength: '',
    sig: 'Take 1 tablet by mouth once daily',
    quantity: 30,
    refills: 3,
    daw: false,
    pharmacy: pharmacies[0],
    notes: '',
  });

  const filteredMeds = commonMedications.filter(med =>
    med.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    med.class.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const alerts = useMemo(
    () => selectedMed ? screenPrescription({ medication: selectedMed, activeMedications, allergies: patientAllergies }) : [],
    [selectedMed, activeMedications, patientAllergies]
  );
  const blockingAlerts = alerts.filter(alert => alert.severity === 'CONTRAINDICATED' || alert.severity === 'MAJOR');
  const overrideReady = !requiresPrescriptionOverride(alerts) ||
    (blockingAlerts.every(alert => acknowledgedAlerts[alert.id]) && Boolean(overrideReason) && (overrideReason !== 'Other' || Boolean(overrideOther.trim())));

  const selectMedication = (med: typeof commonMedications[0]) => {
    setSelectedMed(med);
    setAcknowledgedAlerts({});
    setOverrideReason('');
    setOverrideOther('');
    setPrescription(prev => ({
      ...prev,
      medication: med.name,
      form: med.form,
      strength: med.strengths[0],
    }));
  };

  const handleSubmit = () => {
    if (selectedMed && prescription.strength && prescription.sig) {
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
        alerts,
        override: blockingAlerts.length > 0 ? {
          reason: overrideReason === 'Other' ? overrideOther.trim() : overrideReason,
          acknowledgedAlertIds: blockingAlerts.map(alert => alert.id),
          acknowledgingUser: 'Dr. Sarah Anderson',
          timestamp: new Date().toISOString(),
        } : undefined,
      });
      if (blockingAlerts.length > 0) {
        blockingAlerts.forEach(alert => logCdsAlertOverride(patientId || patientMrn || 'unknown', selectedMed.name, alert.severity, overrideReason === 'Other' ? overrideOther.trim() : overrideReason));
      }
      setSelectedMed(null);
      setAcknowledgedAlerts({});
      setOverrideReason('');
      setOverrideOther('');
      setSearchQuery('');
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
            className="ehr-button ehr-button-primary px-4"
            disabled={!selectedMed || !prescription.strength || !overrideReady}
          >
            Sign & Send to Pharmacy
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
                {filteredMeds.map((med) => (
                  <div
                    key={med.name}
                    onClick={() => selectMedication(med)}
                    className={`px-2 py-1 text-[11px] cursor-pointer border-b border-gray-200 ${
                      selectedMed?.name === med.name ? 'bg-blue-100' : 'hover:bg-blue-50'
                    }`}
                  >
                    <div className="font-medium">{med.name}</div>
                    <div className="text-[10px] text-gray-500">{med.class} • {med.form}</div>
                  </div>
                ))}
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

        {selectedMed && (
          <div className="space-y-1">
            {alerts.length === 0 ? (
              <div className="ehr-alert-info p-2 flex items-start text-[10px]">
                <AlertCircle className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                <div><strong>CDS screening:</strong> No alerts identified for this medication and the documented patient history.</div>
              </div>
            ) : alerts.map(alert => {
              const alertClass = alert.severity === 'CONTRAINDICATED' || alert.severity === 'MAJOR'
                ? 'ehr-alert-critical'
                : alert.severity === 'MODERATE' ? 'ehr-alert-warning' : 'ehr-alert-info';
              return (
                <div key={alert.id} className={`${alertClass} p-2 text-[10px]`}>
                  <div className="flex items-start">
                    <AlertTriangle className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <div className="font-bold">{alert.severity} — {alert.title}</div>
                      <div><strong>Conflicting agent:</strong> {alert.conflictingAgents.join(' + ')}</div>
                      <div><strong>Mechanism:</strong> {alert.mechanism}</div>
                      <div><strong>Management:</strong> {alert.management}</div>
                      {(alert.severity === 'CONTRAINDICATED' || alert.severity === 'MAJOR') && (
                        <label className="flex items-center mt-1 font-semibold">
                          <input
                            type="checkbox"
                            checked={Boolean(acknowledgedAlerts[alert.id])}
                            onChange={event => setAcknowledgedAlerts(prev => ({ ...prev, [alert.id]: event.target.checked }))}
                            className="ehr-checkbox mr-1"
                          />
                          I acknowledge this blocking alert
                        </label>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            {blockingAlerts.length > 0 && (
              <div className="ehr-fieldset p-2">
                <div className="text-[10px] font-bold mb-1">Override justification required for blocking alerts</div>
                <select value={overrideReason} onChange={event => setOverrideReason(event.target.value)} className="ehr-input w-full">
                  <option value="">Select reason...</option>
                  <option>Benefit outweighs risk</option>
                  <option>Patient previously tolerated</option>
                  <option>Dose adjusted / will monitor labs</option>
                  <option>Documented tolerance / allergy not reproducible</option>
                  <option>Other</option>
                </select>
                {overrideReason === 'Other' && (
                  <input
                    value={overrideOther}
                    onChange={event => setOverrideOther(event.target.value)}
                    className="ehr-input w-full mt-1"
                    placeholder="Enter override reason"
                  />
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
