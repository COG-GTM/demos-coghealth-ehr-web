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
          <button onClick={onClose} className="px-4 py-2.5 bg-white border border-[#dddddd] rounded-lg text-sm font-medium text-[#222222] hover:bg-[#f7f7f7] transition-colors">
            Cancel
          </button>
          <button onClick={() => handlePrint('preview')} className="px-4 py-2.5 bg-white border border-[#dddddd] rounded-lg text-sm font-medium text-[#222222] hover:bg-[#f7f7f7] transition-colors flex items-center">
            <FileText className="w-4 h-4 mr-1.5" /> Preview
          </button>
          <button onClick={() => handlePrint('pdf')} className="px-4 py-2.5 bg-white border border-[#dddddd] rounded-lg text-sm font-medium text-[#222222] hover:bg-[#f7f7f7] transition-colors flex items-center">
            <Download className="w-4 h-4 mr-1.5" /> Save PDF
          </button>
          <button onClick={() => handlePrint('print')} className="px-4 py-2.5 bg-[#FF385C] text-white rounded-lg text-sm font-medium hover:bg-[#e31c5f] transition-colors flex items-center">
            <Printer className="w-4 h-4 mr-1.5" /> Print
          </button>
        </>
      }
    >
      <div className="space-y-5">
        <div>
          <label className="block text-xs font-semibold text-[#222222] mb-2 uppercase tracking-wider">Document</label>
          <div className="flex items-center space-x-3 p-4 bg-[#f7f7f7] rounded-xl">
            <FileText className="w-5 h-5 text-[#717171]" />
            <span className="text-sm font-medium text-[#222222]">{documentName}</span>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#222222] mb-2 uppercase tracking-wider">Print Options</label>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-[#717171] mb-1">Copies</label>
              <input
                type="number"
                min="1"
                max="99"
                value={options.copies}
                onChange={(e) => setOptions({ ...options, copies: parseInt(e.target.value) || 1 })}
                className="w-20 px-3 py-2 border border-[#dddddd] rounded-lg text-sm focus:outline-none focus:border-[#222222] transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs text-[#717171] mb-1">Orientation</label>
              <select
                value={options.orientation}
                onChange={(e) => setOptions({ ...options, orientation: e.target.value as 'portrait' | 'landscape' })}
                className="w-full px-3 py-2 border border-[#dddddd] rounded-lg text-sm focus:outline-none focus:border-[#222222] transition-colors bg-white"
              >
                <option value="portrait">Portrait</option>
                <option value="landscape">Landscape</option>
              </select>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#222222] mb-2 uppercase tracking-wider">Include</label>
          <div className="space-y-3">
            <label className="flex items-center cursor-pointer group">
              <input
                type="checkbox"
                checked={options.includeHeader}
                onChange={(e) => setOptions({ ...options, includeHeader: e.target.checked })}
                className="w-4 h-4 rounded border-[#dddddd] text-[#FF385C] focus:ring-[#FF385C]"
              />
              <span className="ml-3 text-sm text-[#222222] group-hover:text-[#000000]">Header (facility name, date)</span>
            </label>
            <label className="flex items-center cursor-pointer group">
              <input
                type="checkbox"
                checked={options.includeFooter}
                onChange={(e) => setOptions({ ...options, includeFooter: e.target.checked })}
                className="w-4 h-4 rounded border-[#dddddd] text-[#FF385C] focus:ring-[#FF385C]"
              />
              <span className="ml-3 text-sm text-[#222222] group-hover:text-[#000000]">Footer (page numbers, confidentiality notice)</span>
            </label>
          </div>
        </div>

        <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-800">
          <strong>Note:</strong> This document contains Protected Health Information (PHI). 
          Ensure compliance with HIPAA regulations when printing or sharing.
        </div>
      </div>
    </Modal>
  );
}
