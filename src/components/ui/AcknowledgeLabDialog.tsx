import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Modal } from './Modal';
import { CURRENT_USER_NAME, getCriticalResults } from '../../services/labAcknowledgmentService';
import type { LabPanel } from '../../types';

interface AcknowledgeLabDialogProps {
  panel: LabPanel | null;
  onCancel: () => void;
  onConfirm: (note: string) => void;
}

export function AcknowledgeLabDialog({ panel, onCancel, onConfirm }: AcknowledgeLabDialogProps) {
  const [note, setNote] = useState('');

  const handleCancel = () => {
    setNote('');
    onCancel();
  };

  const handleConfirm = () => {
    onConfirm(note);
    setNote('');
  };

  return (
    <Modal
      isOpen={panel !== null}
      onClose={handleCancel}
      title="Acknowledge Critical Lab Result"
      width="md"
      footer={
        <>
          <button onClick={handleCancel} className="ehr-button px-4">
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="ehr-button ehr-button-primary px-4"
            data-testid="ack-confirm"
          >
            Acknowledge
          </button>
        </>
      }
    >
      {panel && (
        <div className="space-y-3">
          <div className="ehr-alert-critical px-2 py-1.5 flex items-center space-x-2 text-[11px]">
            <AlertTriangle className="w-4 h-4" />
            <span>
              <strong>{panel.panelName}</strong> for <strong>{panel.patientName}</strong> ({panel.patientMrn}) contains critical values.
            </span>
          </div>

          <fieldset className="ehr-fieldset">
            <legend>Critical Values</legend>
            <table className="w-full text-[11px]">
              <thead>
                <tr className="bg-gradient-to-b from-[#f0f0f0] to-[#e0e0e0]">
                  <th className="text-left px-2 py-1 border-b border-gray-400">Test</th>
                  <th className="text-left px-2 py-1 border-b border-gray-400">Result</th>
                  <th className="text-left px-2 py-1 border-b border-gray-400">Reference Range</th>
                </tr>
              </thead>
              <tbody>
                {getCriticalResults(panel).map(result => (
                  <tr key={result.id} style={{ background: '#ffcccc', color: '#990000', fontWeight: 'bold' }}>
                    <td className="px-2 py-1 border-b border-gray-200">{result.testName}</td>
                    <td className="px-2 py-1 border-b border-gray-200 font-mono">{result.value} {result.unit}</td>
                    <td className="px-2 py-1 border-b border-gray-200">{result.referenceRange}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </fieldset>

          <fieldset className="ehr-fieldset">
            <legend>Note (optional)</legend>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="ehr-input w-full text-[11px]"
              rows={3}
              placeholder="e.g. Called patient, repeat labs ordered, nephrology consulted"
              data-testid="ack-note"
            />
          </fieldset>

          <p className="text-[10px] text-gray-600">
            Acknowledging as <strong>{CURRENT_USER_NAME}</strong>. This action is recorded in the audit log.
          </p>
        </div>
      )}
    </Modal>
  );
}
