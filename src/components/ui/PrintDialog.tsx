import { useState } from 'react';
import { Printer, FileText, Download } from 'lucide-react';
import { Modal } from './Modal';

interface PrintDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  documentName: string;
  onPrint: (options: PrintOptions) => void;
}

interface PrintOptions {
  copies: number;
  orientation: 'portrait' | 'landscape';
  includeHeader: boolean;
  includeFooter: boolean;
  action: 'print' | 'preview' | 'pdf';
}

export function PrintDialog({ isOpen, onClose, title, documentName, onPrint }: PrintDialogProps) {
  const [options, setOptions] = useState<PrintOptions>({
    copies: 1,
    orientation: 'portrait',
    includeHeader: true,
    includeFooter: true,
    action: 'print',
  });

  const handlePrint = (action: 'print' | 'preview' | 'pdf') => {
    onPrint({ ...options, action });
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      width="md"
      footer={
        <>
          <button onClick={onClose} className="px-5 py-2.5 bg-white border border-[#DDDDDD] rounded-full text-sm font-semibold text-[#222222] hover:border-[#222222] transition-all">
            Cancel
          </button>
          <button onClick={() => handlePrint('preview')} className="px-5 py-2.5 bg-white border border-[#DDDDDD] rounded-full text-sm font-semibold text-[#222222] hover:border-[#222222] transition-all flex items-center">
            <FileText className="w-4 h-4 mr-1.5" /> Preview
          </button>
          <button onClick={() => handlePrint('pdf')} className="px-5 py-2.5 bg-white border border-[#DDDDDD] rounded-full text-sm font-semibold text-[#222222] hover:border-[#222222] transition-all flex items-center">
            <Download className="w-4 h-4 mr-1.5" /> Save PDF
          </button>
          <button onClick={() => handlePrint('print')} className="px-5 py-2.5 bg-[#FF385C] text-white rounded-full text-sm font-semibold hover:bg-[#E31C5F] transition-all flex items-center">
            <Printer className="w-4 h-4 mr-1.5" /> Print
          </button>
        </>
      }
    >
      <div className="space-y-3">
        <fieldset className="ehr-fieldset">
          <legend>Document</legend>
          <div className="flex items-center space-x-2">
            <FileText className="w-4 h-4 text-gray-500" />
            <span className="text-[11px] font-medium">{documentName}</span>
          </div>
        </fieldset>

        <fieldset className="ehr-fieldset">
          <legend>Print Options</legend>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] text-gray-600 mb-0.5">Copies</label>
              <input
                type="number"
                min="1"
                max="99"
                value={options.copies}
                onChange={(e) => setOptions({ ...options, copies: parseInt(e.target.value) || 1 })}
                className="ehr-input w-20"
              />
            </div>
            <div>
              <label className="block text-[10px] text-gray-600 mb-0.5">Orientation</label>
              <select
                value={options.orientation}
                onChange={(e) => setOptions({ ...options, orientation: e.target.value as 'portrait' | 'landscape' })}
                className="ehr-input w-full"
              >
                <option value="portrait">Portrait</option>
                <option value="landscape">Landscape</option>
              </select>
            </div>
          </div>
        </fieldset>

        <fieldset className="ehr-fieldset">
          <legend>Include</legend>
          <div className="space-y-1">
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={options.includeHeader}
                onChange={(e) => setOptions({ ...options, includeHeader: e.target.checked })}
                className="ehr-checkbox"
              />
              <span className="ehr-label">Header (facility name, date)</span>
            </label>
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={options.includeFooter}
                onChange={(e) => setOptions({ ...options, includeFooter: e.target.checked })}
                className="ehr-checkbox"
              />
              <span className="ehr-label">Footer (page numbers, confidentiality notice)</span>
            </label>
          </div>
        </fieldset>

        <div className="ehr-alert-info p-2 text-[10px]">
          <strong>Note:</strong> This document contains Protected Health Information (PHI). 
          Ensure compliance with HIPAA regulations when printing or sharing.
        </div>
      </div>
    </Modal>
  );
}
