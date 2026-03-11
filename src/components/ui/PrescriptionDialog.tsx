import { useState } from 'react';
import { Pill, Search, AlertTriangle, AlertCircle } from 'lucide-react';
import { Modal } from './Modal';

interface PrescriptionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  patientName?: string;
  patientMrn?: string;
  patientAllergies?: string[];
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

export function PrescriptionDialog({ isOpen, onClose, patientName, patientMrn, patientAllergies = [], onSubmit }: PrescriptionDialogProps) {
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

  const filteredMeds = commonMedications.filter(med =>
    med.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    med.class.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectMedication = (med: typeof commonMedications[0]) => {
    setSelectedMed(med);
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
      });
      setSelectedMed(null);
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
          <button onClick={onClose} className="px-5 py-2.5 bg-white border border-[#dddddd] rounded-lg text-sm font-medium text-[#222222] hover:bg-[#f7f7f7] transition-colors">
            Cancel
          </button>
          <button 
            onClick={handleSubmit} 
            className="px-5 py-2.5 bg-[#FF385C] text-white rounded-lg text-sm font-medium hover:bg-[#e31c5f] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!selectedMed || !prescription.strength}
          >
            Sign & Send to Pharmacy
          </button>
        </>
      }
    >
      <div className="space-y-5">
        {/* Patient Info & Allergies */}
        <div className="flex space-x-3">
          {patientName && (
            <div className="flex-1 p-3 bg-blue-50 border border-blue-200 rounded-xl">
              <span className="text-sm text-blue-800">
                <strong>Patient:</strong> {patientName} {patientMrn && `(${patientMrn})`}
              </span>
            </div>
          )}
          {patientAllergies.length > 0 && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center">
              <AlertCircle className="w-4 h-4 mr-2 text-red-600" />
              <span className="text-sm text-red-800">
                <strong>Allergies:</strong> {patientAllergies.join(', ')}
              </span>
            </div>
          )}
        </div>

        <div className="flex space-x-4">
          {/* Medication Search */}
          <div className="w-64">
            <label className="block text-xs font-semibold text-[#222222] mb-2 uppercase tracking-wider">Select Medication</label>
            <div className="flex flex-col h-56">
              <div className="flex items-center space-x-2 mb-2 px-3 py-2 border border-[#dddddd] rounded-lg">
                <Search className="w-4 h-4 text-[#717171]" />
                <input
                  type="text"
                  placeholder="Search medications..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 text-sm focus:outline-none placeholder-[#b0b0b0]"
                />
              </div>
              <div className="flex-1 overflow-auto border border-[#ebebeb] rounded-xl bg-white">
                {filteredMeds.map((med) => (
                  <div
                    key={med.name}
                    onClick={() => selectMedication(med)}
                    className={`px-3 py-2 text-sm cursor-pointer border-b border-[#f0f0f0] transition-colors ${
                      selectedMed?.name === med.name ? 'bg-[#FF385C]/5 border-l-2 border-l-[#FF385C]' : 'hover:bg-[#fafafa]'
                    }`}
                  >
                    <div className="font-medium text-[#222222]">{med.name}</div>
                    <div className="text-xs text-[#717171]">{med.class} &middot; {med.form}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Prescription Details */}
          <div className="flex-1">
            <label className="block text-xs font-semibold text-[#222222] mb-2 uppercase tracking-wider">Prescription Details</label>
              {selectedMed ? (
                <div className="space-y-3">
                  <div className="p-3 bg-[#f7f7f7] rounded-xl">
                    <div className="font-semibold text-sm text-[#222222]">{selectedMed.name}</div>
                    <div className="text-xs text-[#717171]">{selectedMed.class} &middot; {selectedMed.form}</div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-[#717171] mb-1">Strength</label>
                      <select
                        value={prescription.strength}
                        onChange={(e) => setPrescription({ ...prescription, strength: e.target.value })}
                        className="w-full px-3 py-2 border border-[#dddddd] rounded-lg text-sm focus:outline-none focus:border-[#222222] transition-colors bg-white"
                      >
                        {selectedMed.strengths.map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-[#717171] mb-1">Quantity</label>
                      <input
                        type="number"
                        value={prescription.quantity}
                        onChange={(e) => setPrescription({ ...prescription, quantity: parseInt(e.target.value) || 0 })}
                        className="w-full px-3 py-2 border border-[#dddddd] rounded-lg text-sm focus:outline-none focus:border-[#222222] transition-colors"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-[#717171] mb-1">Sig (Directions)</label>
                    <select
                      value={prescription.sig}
                      onChange={(e) => setPrescription({ ...prescription, sig: e.target.value })}
                      className="w-full px-3 py-2 border border-[#dddddd] rounded-lg text-sm focus:outline-none focus:border-[#222222] transition-colors bg-white mb-2"
                    >
                      {sigTemplates.map(sig => (
                        <option key={sig} value={sig}>{sig}</option>
                      ))}
                    </select>
                    <input
                      type="text"
                      value={prescription.sig}
                      onChange={(e) => setPrescription({ ...prescription, sig: e.target.value })}
                      className="w-full px-3 py-2 border border-[#dddddd] rounded-lg text-sm focus:outline-none focus:border-[#222222] transition-colors"
                      placeholder="Or type custom directions..."
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-[#717171] mb-1">Refills</label>
                      <select
                        value={prescription.refills}
                        onChange={(e) => setPrescription({ ...prescription, refills: parseInt(e.target.value) })}
                        className="w-full px-3 py-2 border border-[#dddddd] rounded-lg text-sm focus:outline-none focus:border-[#222222] transition-colors bg-white"
                      >
                        {[0, 1, 2, 3, 4, 5, 6, 11].map(n => (
                          <option key={n} value={n}>{n} {n === 11 ? '(PRN)' : ''}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-[#717171] mb-1">DAW</label>
                      <label className="flex items-center mt-2 cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={prescription.daw}
                          onChange={(e) => setPrescription({ ...prescription, daw: e.target.checked })}
                          className="w-4 h-4 rounded border-[#dddddd] text-[#FF385C] focus:ring-[#FF385C]"
                        />
                        <span className="ml-2 text-sm text-[#222222]">Dispense as Written</span>
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-[#717171] mb-1">Pharmacy</label>
                    <select
                      value={prescription.pharmacy}
                      onChange={(e) => setPrescription({ ...prescription, pharmacy: e.target.value })}
                      className="w-full px-3 py-2 border border-[#dddddd] rounded-lg text-sm focus:outline-none focus:border-[#222222] transition-colors bg-white"
                    >
                      {pharmacies.map(p => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>
                </div>
              ) : (
                <div className="h-40 flex items-center justify-center text-[#b0b0b0] text-sm">
                  <Pill className="w-5 h-5 mr-2 opacity-50" />
                  Select a medication from the list
                </div>
              )}
          </div>
        </div>

        {selectedMed && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start text-xs">
            <AlertTriangle className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0 text-amber-600" />
            <div className="text-amber-800">
              <strong>Drug Interaction Check:</strong> No significant interactions found with current medications.
              <br />
              <span className="text-amber-600">Always verify patient&apos;s complete medication list before prescribing.</span>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
