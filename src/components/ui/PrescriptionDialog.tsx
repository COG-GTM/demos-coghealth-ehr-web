import { useState, useMemo } from 'react';
import { Pill, Search, AlertTriangle, AlertCircle, ShieldAlert, ShieldCheck, Ban, Copy } from 'lucide-react';
import { Modal } from './Modal';
import { checkPrescriptionSafety, severityLabels, type SafetyAlert, type AlertSeverity } from '../../services/interactionService';
import { logInteractionOverride } from '../../services/auditService';

interface PrescriptionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  patientId?: string;
  patientName?: string;
  patientMrn?: string;
  patientAllergies?: string[];
  currentMedications?: string[];
  onSubmit: (prescription: PrescriptionData) => void;
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
  safetyAlerts: SafetyAlert[];
  overrideReason?: string;
}

const overrideReasons = [
  'Benefit outweighs risk',
  'Patient previously tolerated combination',
  'Will monitor closely (labs / ECG / vitals)',
  'Allergy documented in error / not clinically significant',
  'Short course; interaction not clinically relevant',
  'Specialist recommendation',
];

const severityStyles: Record<AlertSeverity, { container: string; badge: string; icon: typeof AlertTriangle }> = {
  contraindicated: { container: 'ehr-alert-critical', badge: 'bg-[#cc0000] text-white', icon: Ban },
  major: { container: 'ehr-alert-critical', badge: 'bg-[#cc0000] text-white', icon: ShieldAlert },
  moderate: { container: 'ehr-alert-warning', badge: 'bg-[#cc9900] text-white', icon: AlertTriangle },
  minor: { container: 'ehr-alert-info', badge: 'bg-[#0066cc] text-white', icon: AlertCircle },
};

const EMPTY_LIST: string[] = [];

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

export function PrescriptionDialog({ isOpen, onClose, patientId, patientName, patientMrn, patientAllergies = EMPTY_LIST, currentMedications = EMPTY_LIST, onSubmit }: PrescriptionDialogProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMed, setSelectedMed] = useState<typeof commonMedications[0] | null>(null);
  const [overrideReason, setOverrideReason] = useState('');
  const [acknowledged, setAcknowledged] = useState(false);
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

  const safety = useMemo(() => {
    if (!selectedMed) return null;
    return checkPrescriptionSafety({
      medication: selectedMed.name,
      drugClass: selectedMed.class,
      currentMedications,
      allergies: patientAllergies,
    });
  }, [selectedMed, currentMedications, patientAllergies]);

  const isBlocked = safety?.highestSeverity === 'contraindicated';
  const needsOverride = !!safety?.requiresOverride;
  const overrideSatisfied = !needsOverride || (acknowledged && overrideReason !== '');
  const canSubmit = !!selectedMed && !!prescription.strength && overrideSatisfied;

  const selectMedication = (med: typeof commonMedications[0]) => {
    setSelectedMed(med);
    setOverrideReason('');
    setAcknowledged(false);
    setPrescription(prev => ({
      ...prev,
      medication: med.name,
      form: med.form,
      strength: med.strengths[0],
    }));
  };

  const handleSubmit = () => {
    if (selectedMed && prescription.strength && prescription.sig && canSubmit) {
      const alerts = safety?.alerts ?? [];
      if (needsOverride) {
        logInteractionOverride({
          patientId,
          patientMrn,
          patientName,
          medication: `${selectedMed.name} ${prescription.strength}`,
          alerts: alerts.map(a => `${severityLabels[a.severity]}: ${a.title} (${a.interactsWith})`),
          reason: overrideReason,
        });
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
        safetyAlerts: alerts,
        overrideReason: needsOverride ? overrideReason : undefined,
      });
      setSelectedMed(null);
      setSearchQuery('');
      setOverrideReason('');
      setAcknowledged(false);
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
            className={`ehr-button px-4 ${canSubmit ? 'ehr-button-primary' : 'opacity-60 cursor-not-allowed'}`}
            disabled={!canSubmit}
            title={needsOverride && !overrideSatisfied ? 'Acknowledge safety alerts and select an override reason to continue' : undefined}
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

        {selectedMed && safety && (
          <fieldset className="ehr-fieldset" data-testid="safety-check">
            <legend className="flex items-center">
              {safety.alerts.length === 0
                ? <ShieldCheck className="w-3.5 h-3.5 mr-1 text-green-700" />
                : <ShieldAlert className="w-3.5 h-3.5 mr-1 text-red-700" />}
              Clinical Decision Support
              {safety.highestSeverity && (
                <span className={`ml-2 px-1.5 py-0.5 text-[9px] font-bold ${severityStyles[safety.highestSeverity].badge}`}>
                  {severityLabels[safety.highestSeverity]}
                </span>
              )}
            </legend>

            {safety.alerts.length === 0 ? (
              <div className="flex items-start text-[10px] text-gray-700">
                <ShieldCheck className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0 text-green-700" />
                <div>
                  <strong>No interactions or allergy conflicts found.</strong> Checked {selectedMed.name} against{' '}
                  {currentMedications.length} active medication{currentMedications.length === 1 ? '' : 's'} and{' '}
                  {patientAllergies.length} documented allerg{patientAllergies.length === 1 ? 'y' : 'ies'}.
                </div>
              </div>
            ) : (
              <div className="space-y-1.5">
                {safety.alerts.map((alert, idx) => {
                  const style = severityStyles[alert.severity];
                  const Icon = alert.kind === 'duplicate' ? Copy : style.icon;
                  return (
                    <div key={idx} className={`${style.container} p-2 text-[10px] flex items-start`}>
                      <Icon className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <div className="flex items-center">
                          <span className={`px-1 py-0.5 mr-2 text-[9px] font-bold ${style.badge}`}>{severityLabels[alert.severity]}</span>
                          <strong>{alert.title}</strong>
                          <span className="ml-1 opacity-80">— {selectedMed.name} + {alert.interactsWith}</span>
                        </div>
                        <div className="mt-0.5">{alert.mechanism}</div>
                        <div className="mt-0.5 italic">Recommendation: {alert.recommendation}</div>
                      </div>
                    </div>
                  );
                })}

                {needsOverride && (
                  <div className="border border-gray-400 bg-white p-2 mt-1">
                    <div className="text-[10px] font-semibold mb-1">
                      {isBlocked ? 'Contraindicated order — override requires documented justification' : 'Major alert — override requires documented justification'}
                    </div>
                    <label className="flex items-center cursor-pointer mb-1">
                      <input
                        type="checkbox"
                        checked={acknowledged}
                        onChange={(e) => setAcknowledged(e.target.checked)}
                        className="ehr-checkbox"
                      />
                      <span className="ehr-label">I have reviewed the alerts above and accept clinical responsibility</span>
                    </label>
                    <select
                      value={overrideReason}
                      onChange={(e) => setOverrideReason(e.target.value)}
                      className="ehr-input w-full"
                    >
                      <option value="">Select override reason...</option>
                      {overrideReasons.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                    <div className="text-[9px] text-gray-500 mt-1">Override will be recorded in the HIPAA audit log with your credentials.</div>
                  </div>
                )}
              </div>
            )}
          </fieldset>
        )}
      </div>
    </Modal>
  );
}
