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
          <button onClick={onClose} className="px-5 py-2.5 bg-white border border-[#dddddd] rounded-lg text-sm font-medium text-[#222222] hover:bg-[#f7f7f7] transition-colors">
            Cancel
          </button>
          <button 
            onClick={handleSubmit} 
            className="px-5 py-2.5 bg-[#FF385C] text-white rounded-lg text-sm font-medium hover:bg-[#e31c5f] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between">
            <span className="text-sm text-blue-800">
              <strong>Patient:</strong> {patientName} {patientMrn && `(${patientMrn})`}
            </span>
            <span className="text-xs text-blue-600">Orders will be signed by Dr. Sarah Anderson</span>
          </div>
        )}

        <div className="flex space-x-3">
          {/* Order Selection */}
          <div className="flex-1">
            <label className="block text-xs font-semibold text-[#222222] mb-2 uppercase tracking-wider">Available {type === 'lab' ? 'Tests' : 'Studies'}</label>
            <div className="flex flex-col h-64">
              <div className="flex items-center space-x-2 mb-2 px-3 py-2 border border-[#dddddd] rounded-lg">
                <Search className="w-4 h-4 text-[#717171]" />
                <input
                  type="text"
                  placeholder={`Search ${type === 'lab' ? 'tests' : 'studies'}...`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 text-sm focus:outline-none placeholder-[#b0b0b0]"
                />
              </div>
              <div className="flex-1 overflow-auto border border-[#ebebeb] rounded-xl bg-white">
                {filteredItems.map((item) => {
                  const isSelected = selectedOrders.some(o => o.code === item.code);
                  return (
                    <div
                      key={item.code}
                      onClick={() => !isSelected && addOrder(item)}
                      className={`px-3 py-2 text-sm cursor-pointer border-b border-[#f0f0f0] flex items-center justify-between transition-colors ${
                        isSelected ? 'bg-[#f7f7f7] text-[#b0b0b0]' : 'hover:bg-[#fafafa]'
                      }`}
                    >
                      <div>
                        <span className="font-mono text-xs text-[#717171] mr-2">{item.code}</span>
                        <span className="text-[#222222]">{item.name}</span>
                      </div>
                      {!isSelected && <Plus className="w-4 h-4 text-[#FF385C]" />}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Selected Orders */}
          <div className="w-64">
            <label className="block text-xs font-semibold text-[#222222] mb-2 uppercase tracking-wider">Selected Orders ({selectedOrders.length})</label>
            <div className="flex flex-col h-64">
              <div className="flex-1 overflow-auto border border-[#ebebeb] rounded-xl bg-white">
                {selectedOrders.length === 0 ? (
                  <div className="p-6 text-center text-[#b0b0b0] text-sm">
                    Click items on the left to add orders
                  </div>
                ) : (
                  selectedOrders.map((order) => (
                    <div key={order.id} className="px-3 py-2 text-sm border-b border-[#f0f0f0] flex items-center justify-between hover:bg-[#fafafa] transition-colors">
                      <div>
                        <div className="font-medium text-[#222222]">{order.code}</div>
                        <div className="text-xs text-[#717171] truncate max-w-[180px]">{order.name}</div>
                      </div>
                      <button onClick={() => removeOrder(order.id)} className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-red-50 text-[#b0b0b0] hover:text-red-500 transition-colors">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Order Options */}
        <div>
          <label className="block text-xs font-semibold text-[#222222] mb-2 uppercase tracking-wider">Priority</label>
          <div className="flex space-x-2">
            {[
              { value: 'routine', label: 'Routine' },
              { value: 'asap', label: 'ASAP' },
              { value: 'stat', label: 'STAT' },
            ].map((p) => (
              <button
                key={p.value}
                onClick={() => setPriority(p.value as typeof priority)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  priority === p.value
                    ? p.value === 'stat' ? 'bg-red-600 text-white' : 'bg-[#222222] text-white'
                    : 'bg-white border border-[#dddddd] text-[#222222] hover:border-[#222222]'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#222222] mb-2 uppercase tracking-wider">Clinical Notes / Indication</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Enter clinical indication or special instructions..."
            className="w-full px-3 py-2 border border-[#dddddd] rounded-xl text-sm h-20 resize-none focus:outline-none focus:border-[#222222] transition-colors"
          />
        </div>

        {priority === 'stat' && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center text-xs">
            <AlertTriangle className="w-4 h-4 mr-2 text-red-600" />
            <span className="text-red-800"><strong>STAT orders</strong> should only be used for emergent situations. Results expected within 1 hour.</span>
          </div>
        )}
      </div>
    </Modal>
  );
}
