import { useState } from 'react';
import { Search, Plus, X, AlertTriangle } from 'lucide-react';
import { Modal } from './Modal';

interface OrderDialogProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'lab' | 'imaging';
  patientName?: string;
  patientMrn?: string;
  onSubmit: (orders: OrderItem[]) => void;
}

interface OrderItem {
  id: string;
  code: string;
  name: string;
  priority: 'routine' | 'stat' | 'asap';
  notes?: string;
}

const labTests = [
  { code: 'CBC', name: 'Complete Blood Count with Differential' },
  { code: 'BMP', name: 'Basic Metabolic Panel' },
  { code: 'CMP', name: 'Comprehensive Metabolic Panel' },
  { code: 'LFT', name: 'Liver Function Tests' },
  { code: 'LIPID', name: 'Lipid Panel' },
  { code: 'TSH', name: 'Thyroid Stimulating Hormone' },
  { code: 'HBA1C', name: 'Hemoglobin A1c' },
  { code: 'UA', name: 'Urinalysis' },
  { code: 'PT/INR', name: 'Prothrombin Time / INR' },
  { code: 'BNP', name: 'B-type Natriuretic Peptide' },
  { code: 'TROP', name: 'Troponin I' },
  { code: 'D-DIMER', name: 'D-Dimer' },
  { code: 'ESR', name: 'Erythrocyte Sedimentation Rate' },
  { code: 'CRP', name: 'C-Reactive Protein' },
  { code: 'IRON', name: 'Iron Studies' },
  { code: 'B12', name: 'Vitamin B12' },
  { code: 'FOLATE', name: 'Folate Level' },
  { code: 'PSA', name: 'Prostate Specific Antigen' },
];

const imagingStudies = [
  { code: 'CXR', name: 'Chest X-Ray (PA & Lateral)' },
  { code: 'CXR-PORT', name: 'Chest X-Ray (Portable)' },
  { code: 'CT-CHEST', name: 'CT Chest without Contrast' },
  { code: 'CT-CHEST-C', name: 'CT Chest with Contrast' },
  { code: 'CT-ABD', name: 'CT Abdomen/Pelvis without Contrast' },
  { code: 'CT-ABD-C', name: 'CT Abdomen/Pelvis with Contrast' },
  { code: 'CT-HEAD', name: 'CT Head without Contrast' },
  { code: 'MRI-BRAIN', name: 'MRI Brain without Contrast' },
  { code: 'MRI-SPINE', name: 'MRI Spine (specify region)' },
  { code: 'US-ABD', name: 'Ultrasound Abdomen Complete' },
  { code: 'US-RUQ', name: 'Ultrasound Right Upper Quadrant' },
  { code: 'US-RENAL', name: 'Ultrasound Renal' },
  { code: 'ECHO', name: 'Echocardiogram (TTE)' },
  { code: 'EKG', name: 'Electrocardiogram (12-lead)' },
  { code: 'DEXA', name: 'Bone Density Scan (DEXA)' },
  { code: 'MAMMO', name: 'Mammogram Screening' },
];

export function OrderDialog({ isOpen, onClose, type, patientName, patientMrn, onSubmit }: OrderDialogProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrders, setSelectedOrders] = useState<OrderItem[]>([]);
  const [priority, setPriority] = useState<'routine' | 'stat' | 'asap'>('routine');
  const [notes, setNotes] = useState('');

  const items = type === 'lab' ? labTests : imagingStudies;
  const filteredItems = items.filter(item => 
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const addOrder = (item: typeof items[0]) => {
    if (!selectedOrders.find(o => o.code === item.code)) {
      setSelectedOrders([...selectedOrders, {
        id: `${item.code}-${selectedOrders.length + 1}`,
        code: item.code,
        name: item.name,
        priority,
        notes: '',
      }]);
    }
  };

  const removeOrder = (id: string) => {
    setSelectedOrders(selectedOrders.filter(o => o.id !== id));
  };

  const handleSubmit = () => {
    if (selectedOrders.length > 0) {
      const ordersWithNotes = selectedOrders.map(o => ({ ...o, notes }));
      onSubmit(ordersWithNotes);
      setSelectedOrders([]);
      setSearchQuery('');
      setNotes('');
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={type === 'lab' ? 'Order Laboratory Tests' : 'Order Imaging Studies'}
      width="lg"
      footer={
        <>
          <button onClick={onClose} className="px-5 py-2.5 bg-white border border-[#DDDDDD] rounded-full text-sm font-semibold text-[#222222] hover:border-[#222222] transition-all">
            Cancel
          </button>
          <button 
            onClick={handleSubmit} 
            className="px-5 py-2.5 bg-[#FF385C] text-white rounded-full text-sm font-semibold hover:bg-[#E31C5F] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={selectedOrders.length === 0}
          >
            Sign & Submit ({selectedOrders.length})
          </button>
        </>
      }
    >
      <div className="space-y-3">
        {/* Patient Info */}
        {patientName && (
          <div className="ehr-alert-info p-2 flex items-center justify-between">
            <span className="text-[11px]">
              <strong>Patient:</strong> {patientName} {patientMrn && `(${patientMrn})`}
            </span>
            <span className="text-[10px] text-gray-600">Orders will be signed by Dr. Sarah Anderson</span>
          </div>
        )}

        <div className="flex space-x-3">
          {/* Order Selection */}
          <div className="flex-1">
            <fieldset className="ehr-fieldset h-64 flex flex-col">
              <legend>Available {type === 'lab' ? 'Tests' : 'Studies'}</legend>
              <div className="flex items-center space-x-2 mb-2">
                <Search className="w-3.5 h-3.5 text-gray-500" />
                <input
                  type="text"
                  placeholder={`Search ${type === 'lab' ? 'tests' : 'studies'}...`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="ehr-input flex-1"
                />
              </div>
              <div className="flex-1 overflow-auto border border-gray-300 bg-white">
                {filteredItems.map((item) => {
                  const isSelected = selectedOrders.some(o => o.code === item.code);
                  return (
                    <div
                      key={item.code}
                      onClick={() => !isSelected && addOrder(item)}
                      className={`px-2 py-1 text-[11px] cursor-pointer border-b border-gray-200 flex items-center justify-between ${
                        isSelected ? 'bg-gray-200 text-gray-500' : 'hover:bg-blue-50'
                      }`}
                    >
                      <div>
                        <span className="font-mono text-[10px] text-gray-500 mr-2">{item.code}</span>
                        <span>{item.name}</span>
                      </div>
                      {!isSelected && <Plus className="w-3 h-3 text-blue-600" />}
                    </div>
                  );
                })}
              </div>
            </fieldset>
          </div>

          {/* Selected Orders */}
          <div className="w-64">
            <fieldset className="ehr-fieldset h-64 flex flex-col">
              <legend>Selected Orders ({selectedOrders.length})</legend>
              <div className="flex-1 overflow-auto border border-gray-300 bg-white">
                {selectedOrders.length === 0 ? (
                  <div className="p-4 text-center text-gray-500 text-[11px]">
                    Click items on the left to add orders
                  </div>
                ) : (
                  selectedOrders.map((order) => (
                    <div key={order.id} className="px-2 py-1 text-[11px] border-b border-gray-200 flex items-center justify-between">
                      <div>
                        <div className="font-medium">{order.code}</div>
                        <div className="text-[10px] text-gray-500 truncate max-w-[180px]">{order.name}</div>
                      </div>
                      <button onClick={() => removeOrder(order.id)} className="text-red-600 hover:text-red-800">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </fieldset>
          </div>
        </div>

        {/* Order Options */}
        <div className="flex space-x-3">
          <fieldset className="ehr-fieldset flex-1">
            <legend>Priority</legend>
            <div className="flex space-x-4">
              {[
                { value: 'routine', label: 'Routine' },
                { value: 'asap', label: 'ASAP' },
                { value: 'stat', label: 'STAT' },
              ].map((p) => (
                <label key={p.value} className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    name="priority"
                    value={p.value}
                    checked={priority === p.value}
                    onChange={(e) => setPriority(e.target.value as typeof priority)}
                    className="mr-1"
                  />
                  <span className={`ehr-label ${p.value === 'stat' ? 'text-red-700 font-semibold' : ''}`}>
                    {p.label}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        </div>

        <fieldset className="ehr-fieldset">
          <legend>Clinical Notes / Indication</legend>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Enter clinical indication or special instructions..."
            className="ehr-input w-full h-16 resize-none"
          />
        </fieldset>

        {priority === 'stat' && (
          <div className="ehr-alert-warning p-2 flex items-center text-[11px]">
            <AlertTriangle className="w-4 h-4 mr-2" />
            <span><strong>STAT orders</strong> should only be used for emergent situations. Results expected within 1 hour.</span>
          </div>
        )}
      </div>
    </Modal>
  );
}
