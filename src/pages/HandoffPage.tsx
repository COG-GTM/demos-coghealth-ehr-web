import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeftRight,
  CheckCircle2,
  Circle,
  ClipboardCopy,
  FileText,
  Plus,
  RotateCcw,
  Trash2,
  AlertTriangle,
  Eye,
  Unlock,
} from 'lucide-react';
import { Modal } from '../components/ui/Modal';
import { logAuditEvent, logPrint } from '../services/auditService';
import {
  type HandoffEntry,
  type IllnessSeverity,
  SEVERITY_LABEL,
  buildHandoffReport,
  canAccept,
  getHandoffStatus,
  getIpassChecks,
  sortBySeverity,
  summarizeUnit,
} from '../utils/handoff';

const STORAGE_KEY = 'coghealth_handoff_v1';
const UNIT_NAME = '4 West - Medical/Surgical';
const OUTGOING = 'Dr. Sarah Anderson';
const RECEIVERS = ['Dr. James Park (Night Hospitalist)', 'Dr. Priya Shah (Night Resident)', 'Lisa Wong, NP (Cross-cover)'];

const newId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const seedEntries: HandoffEntry[] = [
  {
    patientId: 1,
    patientName: 'Smith, John',
    mrn: 'MRN001234',
    bed: '4W-412',
    age: 59,
    sex: 'M',
    codeStatus: 'Full Code',
    severity: 'unstable',
    summary:
      'AKI on CKD3 (Cr 3.2 from baseline 1.4) with K 6.8 this AM. Got calcium gluconate, insulin/D50 and Lokelma at 10:30. Nephrology aware, considering HD if K not trending down.',
    actions: [
      { id: 'a1', text: 'Repeat BMP and K at 22:00', due: '22:00', done: false },
      { id: 'a2', text: 'Check POC glucose q1h x3 after insulin', due: '20:00', done: true },
      { id: 'a3', text: 'Strict I&O, call if UOP < 30 mL/hr x2h', done: false },
    ],
    contingencies: [
      { id: 'c1', ifCondition: 'K > 6.0 on repeat or new ECG changes', thenAction: 'Repeat calcium gluconate, page Nephrology fellow for emergent HD' },
      { id: 'c2', ifCondition: 'Glucose < 70', thenAction: 'D50 1 amp IV, recheck in 15 min' },
    ],
    receiver: '',
    synthesis: '',
  },
  {
    patientId: 6,
    patientName: 'Martinez, Ana',
    mrn: 'MRN001241',
    bed: '4W-418',
    age: 67,
    sex: 'F',
    codeStatus: 'DNR / OK to intubate',
    severity: 'unstable',
    summary:
      'NSTEMI, troponin 2.4 trending up, BNP 890. On heparin gtt and nitro gtt. Cath lab tomorrow 07:00, NPO after midnight.',
    actions: [
      { id: 'a4', text: 'aPTT at 23:00, titrate heparin per nomogram', due: '23:00', done: false },
      { id: 'a5', text: 'Make NPO at midnight, hold AM metformin', due: '00:00', done: false },
    ],
    contingencies: [],
    receiver: '',
    synthesis: '',
  },
  {
    patientId: 3,
    patientName: 'Williams, Michael',
    mrn: 'MRN001236',
    bed: '4W-405',
    age: 73,
    sex: 'M',
    codeStatus: 'Full Code',
    severity: 'watcher',
    summary: 'Post-op day 2 right hip ORIF. Intermittent confusion overnight, likely delirium; UA negative.',
    actions: [
      { id: 'a6', text: 'CAM-ICU screen at 21:00 and 03:00', due: '21:00', done: false },
    ],
    contingencies: [
      { id: 'c3', ifCondition: 'Agitated and pulling at lines', thenAction: 'Re-orient, sitter; haloperidol 0.5 mg IV x1 if unsafe' },
    ],
    receiver: '',
    synthesis: '',
  },
  {
    patientId: 2,
    patientName: 'Johnson, Sarah',
    mrn: 'MRN001235',
    bed: '4W-409',
    age: 46,
    sex: 'F',
    codeStatus: 'Full Code',
    severity: 'watcher',
    summary: 'DKA',
    actions: [],
    contingencies: [],
    receiver: '',
    synthesis: '',
  },
  {
    patientId: 4,
    patientName: 'Brown, Emily',
    mrn: 'MRN001237',
    bed: '4W-402',
    age: 35,
    sex: 'F',
    codeStatus: 'Full Code',
    severity: 'stable',
    summary: 'Cellulitis L lower leg improving on IV cefazolin day 3. Afebrile 36h. Plan PO cephalexin and discharge AM.',
    actions: [{ id: 'a7', text: 'No overnight labs; discharge paperwork pended for AM team', done: false }],
    contingencies: [],
    receiver: '',
    synthesis: '',
  },
  {
    patientId: 5,
    patientName: 'Davis, Robert',
    mrn: 'MRN001238',
    bed: '4W-415',
    age: 80,
    sex: 'M',
    codeStatus: 'DNR/DNI',
    severity: 'stable',
    summary: 'CAP on ceftriaxone/azithro day 4, now on room air. Awaiting SNF bed, family updated today.',
    actions: [{ id: 'a8', text: 'Nothing to do overnight', done: true }],
    contingencies: [],
    receiver: 'Dr. James Park (Night Hospitalist)',
    synthesis: 'Stable CAP, room air, DNR/DNI, waiting on SNF - nothing overnight.',
    acceptedAt: '18:42',
  },
];

function loadEntries(): HandoffEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as HandoffEntry[];
  } catch {
    // fall through to seed data
  }
  return seedEntries;
}

const severityStyles: Record<IllnessSeverity, { stripe: string; chip: string; button: string }> = {
  unstable: { stripe: '#cc0000', chip: 'bg-red-100 text-red-800 border-red-400', button: 'bg-red-600 text-white border-red-800' },
  watcher: { stripe: '#e6a700', chip: 'bg-yellow-100 text-yellow-800 border-yellow-400', button: 'bg-yellow-400 text-yellow-950 border-yellow-700' },
  stable: { stripe: '#2e8b2e', chip: 'bg-green-100 text-green-800 border-green-400', button: 'bg-green-600 text-white border-green-800' },
};

const statusBadge = {
  draft: 'bg-gray-100 text-gray-600 border-gray-300',
  ready: 'bg-blue-100 text-blue-800 border-blue-300',
  accepted: 'bg-green-100 text-green-800 border-green-400',
};

export default function HandoffPage() {
  const [entries, setEntries] = useState<HandoffEntry[]>(loadEntries);
  const [selectedId, setSelectedId] = useState<number>(() => sortBySeverity(loadEntries())[0]?.patientId ?? 1);
  const [showReport, setShowReport] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  }, [entries]);

  const sorted = useMemo(() => sortBySeverity(entries), [entries]);
  const unit = useMemo(() => summarizeUnit(entries), [entries]);
  const selected = entries.find(e => e.patientId === selectedId) ?? sorted[0];
  const report = useMemo(() => buildHandoffReport(entries, OUTGOING, UNIT_NAME), [entries]);
  const locked = Boolean(selected?.acceptedAt);
  const checks = selected ? getIpassChecks(selected) : [];
  const missing = checks.filter(c => !c.complete);

  const update = (patch: Partial<HandoffEntry> | ((e: HandoffEntry) => Partial<HandoffEntry>)) => {
    setEntries(prev =>
      prev.map(e => (e.patientId === selected.patientId ? { ...e, ...(typeof patch === 'function' ? patch(e) : patch) } : e))
    );
  };

  const acceptHandoff = () => {
    if (!canAccept(selected)) return;
    const acceptedAt = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
    update({ acceptedAt });
    logAuditEvent('NOTE_SIGN', {
      patientId: String(selected.patientId),
      patientMrn: selected.mrn,
      patientName: selected.patientName,
      resourceType: 'HANDOFF',
      action: 'ACCEPT',
      details: `I-PASS handoff accepted by ${selected.receiver}`,
    });
    const next = sorted.find(e => e.patientId !== selected.patientId && !e.acceptedAt);
    if (next) setSelectedId(next.patientId);
  };

  const copyReport = async () => {
    try {
      await navigator.clipboard.writeText(report);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = report;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }
    logAuditEvent('PHI_EXPORT', { resourceType: 'HANDOFF', action: 'COPY', details: `Unit handoff report (${entries.length} patients)` });
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const resetDemo = () => {
    setEntries(seedEntries);
    setSelectedId(sortBySeverity(seedEntries)[0].patientId);
  };

  const progressPct = Math.round((unit.accepted / entries.length) * 100);

  return (
    <div className="h-full flex flex-col overflow-hidden p-2" data-testid="handoff-page">
      <div className="ehr-panel flex-1 flex flex-col overflow-hidden">
        <div className="ehr-header flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <ArrowLeftRight className="w-4 h-4" />
            <span>Shift Handoff (I-PASS)</span>
            <span className="text-blue-200 text-[10px] font-normal">{UNIT_NAME}</span>
          </div>
          <div className="flex items-center space-x-2">
            <button className="ehr-button flex items-center space-x-1 text-gray-800" onClick={() => setShowReport(true)}>
              <Eye className="w-3 h-3" />
              <span>Preview Report</span>
            </button>
            <button className="ehr-button flex items-center space-x-1 text-gray-800" onClick={copyReport}>
              <ClipboardCopy className="w-3 h-3" />
              <span>{copied ? 'Copied!' : 'Copy Report'}</span>
            </button>
            <button className="ehr-button flex items-center space-x-1 text-gray-800" onClick={resetDemo} title="Restore demo data">
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          </div>
        </div>

        <div className="ehr-toolbar flex items-center justify-between py-1">
          <div className="flex items-center space-x-3 text-[10px]">
            <span className="text-gray-600">Outgoing: <b>{OUTGOING}</b></span>
            <span className="text-gray-400">|</span>
            <span className="px-2 py-0.5 border bg-red-100 text-red-800 border-red-300">{unit.unstable} Unstable</span>
            <span className="px-2 py-0.5 border bg-yellow-100 text-yellow-800 border-yellow-300">{unit.watcher} Watcher</span>
            <span className="px-2 py-0.5 border bg-green-100 text-green-800 border-green-300">{unit.stable} Stable</span>
            <span className="text-gray-400">|</span>
            <span className="text-gray-700" data-testid="open-actions">{unit.openActions} open action item(s)</span>
          </div>
          <div className="flex items-center space-x-2 text-[10px]">
            <span className="text-gray-700" data-testid="handoff-progress">
              {unit.accepted}/{entries.length} handed off
            </span>
            <div className="w-32 h-3 bg-white border border-gray-500">
              <div className="h-full bg-gradient-to-b from-[#6c6] to-[#393]" style={{ width: `${progressPct}%` }} />
            </div>
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Patient list */}
          <div className="w-72 flex-shrink-0 overflow-auto bg-white border border-gray-400" role="listbox" aria-label="Handoff patients">
            {sorted.map(e => {
              const status = getHandoffStatus(e);
              const isSel = e.patientId === selected.patientId;
              return (
                <div
                  key={e.patientId}
                  role="option"
                  aria-selected={isSel}
                  tabIndex={0}
                  data-testid={`handoff-patient-${e.patientId}`}
                  onClick={() => setSelectedId(e.patientId)}
                  onKeyDown={ev => (ev.key === 'Enter' || ev.key === ' ') && setSelectedId(e.patientId)}
                  className={`flex border-b border-gray-200 cursor-pointer ${isSel ? 'bg-[#cfe0f5]' : 'hover:bg-[#eef3fa]'}`}
                >
                  <div className="w-1.5 flex-shrink-0" style={{ background: severityStyles[e.severity].stripe }} />
                  <div className="flex-1 px-2 py-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-[11px]">{e.patientName}</span>
                      <span className={`px-1.5 py-0.5 text-[9px] border uppercase ${statusBadge[status]}`}>{status}</span>
                    </div>
                    <div className="text-[10px] text-gray-500">
                      {e.bed} • {e.age}{e.sex} • {e.codeStatus}
                    </div>
                    <div className="flex items-center space-x-0.5 mt-1">
                      {getIpassChecks(e).map(c => (
                        <span
                          key={c.key}
                          title={`${c.label}: ${c.complete ? 'complete' : 'missing'}`}
                          className={`w-4 h-4 text-[9px] font-bold flex items-center justify-center border ${
                            c.complete ? 'bg-green-600 text-white border-green-800' : 'bg-gray-100 text-gray-400 border-gray-300'
                          }`}
                        >
                          {c.letter}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Editor */}
          {selected && (
            <div className="flex-1 overflow-auto p-2 space-y-1" data-testid="handoff-editor">
              <div className="flex items-center justify-between bg-white border border-gray-400 px-2 py-1.5">
                <div className="text-[11px]">
                  <span className="font-bold text-[13px]">{selected.patientName}</span>
                  <span className="ml-2 text-gray-600">{selected.mrn} • Bed {selected.bed} • {selected.age}{selected.sex}</span>
                  <span className="ml-2 px-1.5 py-0.5 text-[10px] border border-purple-300 bg-purple-50 text-purple-800">{selected.codeStatus}</span>
                </div>
                <div className="flex items-center space-x-1">
                  {checks.map(c => (
                    <span key={c.key} className="flex items-center text-[10px] text-gray-700 mr-1.5">
                      {c.complete ? <CheckCircle2 className="w-3 h-3 text-green-600 mr-0.5" /> : <Circle className="w-3 h-3 text-gray-400 mr-0.5" />}
                      {c.label}
                    </span>
                  ))}
                </div>
              </div>

              {locked && (
                <div className="flex items-center justify-between bg-green-50 border border-green-500 text-green-900 px-2 py-1.5 text-[11px]" data-testid="accepted-banner">
                  <span className="flex items-center">
                    <CheckCircle2 className="w-4 h-4 mr-1 text-green-600" />
                    Handoff accepted by <b className="mx-1">{selected.receiver}</b> at {selected.acceptedAt}. Fields are locked.
                  </span>
                  <button className="ehr-button flex items-center space-x-1" onClick={() => update({ acceptedAt: undefined })}>
                    <Unlock className="w-3 h-3" />
                    <span>Reopen</span>
                  </button>
                </div>
              )}

              <fieldset className="ehr-fieldset" disabled={locked}>
                <legend><span className="text-blue-700">I</span> - Illness Severity</legend>
                <div className="flex space-x-2">
                  {(['stable', 'watcher', 'unstable'] as IllnessSeverity[]).map(s => (
                    <button
                      key={s}
                      type="button"
                      aria-pressed={selected.severity === s}
                      data-testid={`severity-${s}`}
                      onClick={() => update({ severity: s })}
                      className={`px-3 py-1 text-[11px] border font-semibold ${
                        selected.severity === s ? severityStyles[s].button : 'bg-white text-gray-700 border-gray-400 hover:bg-gray-50'
                      }`}
                    >
                      {SEVERITY_LABEL[s]}
                    </button>
                  ))}
                </div>
              </fieldset>

              <fieldset className="ehr-fieldset" disabled={locked}>
                <legend><span className="text-blue-700">P</span> - Patient Summary</legend>
                <textarea
                  aria-label="Patient summary"
                  data-testid="summary-input"
                  className="ehr-input w-full h-16 resize-none"
                  placeholder="One-liner, hospital course, active problems, assessment and plan..."
                  value={selected.summary}
                  onChange={ev => update({ summary: ev.target.value })}
                />
                <div className="text-[10px] text-gray-500 text-right">{selected.summary.trim().length} chars (min 20)</div>
              </fieldset>

              <fieldset className="ehr-fieldset" disabled={locked}>
                <legend><span className="text-blue-700">A</span> - Action List</legend>
                <div className="space-y-1">
                  {selected.actions.map(a => (
                    <div key={a.id} className="flex items-center space-x-1">
                      <input
                        type="checkbox"
                        className="ehr-checkbox"
                        aria-label={`Mark "${a.text || 'action'}" done`}
                        checked={a.done}
                        onChange={() => update(e => ({ actions: e.actions.map(x => (x.id === a.id ? { ...x, done: !x.done } : x)) }))}
                      />
                      <input
                        className={`ehr-input flex-1 ${a.done ? 'line-through text-gray-400' : ''}`}
                        aria-label="Action item"
                        value={a.text}
                        placeholder="To-do for the receiving clinician..."
                        onChange={ev => update(e => ({ actions: e.actions.map(x => (x.id === a.id ? { ...x, text: ev.target.value } : x)) }))}
                      />
                      <input
                        type="time"
                        className="ehr-input w-24"
                        aria-label="Due time"
                        value={a.due ?? ''}
                        onChange={ev => update(e => ({ actions: e.actions.map(x => (x.id === a.id ? { ...x, due: ev.target.value || undefined } : x)) }))}
                      />
                      <button
                        type="button"
                        aria-label="Remove action"
                        className="ehr-button px-1.5"
                        onClick={() => update(e => ({ actions: e.actions.filter(x => x.id !== a.id) }))}
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    data-testid="add-action"
                    className="ehr-button flex items-center space-x-1"
                    onClick={() => update(e => ({ actions: [...e.actions, { id: newId(), text: '', done: false }] }))}
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add action</span>
                  </button>
                </div>
              </fieldset>

              <fieldset className="ehr-fieldset" disabled={locked}>
                <legend>
                  <span className="text-blue-700">S</span> - Situation Awareness &amp; Contingency Planning
                  {selected.severity === 'stable' && <span className="ml-2 text-[10px] font-normal text-gray-500">(optional for stable patients)</span>}
                </legend>
                <div className="space-y-1">
                  {selected.contingencies.map(c => (
                    <div key={c.id} className="flex items-center space-x-1 text-[11px]">
                      <span className="font-bold text-gray-600 w-5">IF</span>
                      <input
                        className="ehr-input flex-1"
                        aria-label="If condition"
                        value={c.ifCondition}
                        placeholder="e.g. SBP < 90"
                        onChange={ev =>
                          update(e => ({ contingencies: e.contingencies.map(x => (x.id === c.id ? { ...x, ifCondition: ev.target.value } : x)) }))
                        }
                      />
                      <span className="font-bold text-gray-600 w-10 text-center">THEN</span>
                      <input
                        className="ehr-input flex-1"
                        aria-label="Then action"
                        value={c.thenAction}
                        placeholder="e.g. 500 mL LR bolus, call MD"
                        onChange={ev =>
                          update(e => ({ contingencies: e.contingencies.map(x => (x.id === c.id ? { ...x, thenAction: ev.target.value } : x)) }))
                        }
                      />
                      <button
                        type="button"
                        aria-label="Remove contingency"
                        className="ehr-button px-1.5"
                        onClick={() => update(e => ({ contingencies: e.contingencies.filter(x => x.id !== c.id) }))}
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    data-testid="add-contingency"
                    className="ehr-button flex items-center space-x-1"
                    onClick={() => update(e => ({ contingencies: [...e.contingencies, { id: newId(), ifCondition: '', thenAction: '' }] }))}
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add if/then</span>
                  </button>
                </div>
              </fieldset>

              <fieldset className="ehr-fieldset" disabled={locked}>
                <legend><span className="text-blue-700">S</span> - Synthesis by Receiver</legend>
                <div className="flex items-center space-x-2 mb-1">
                  <label className="ehr-label" htmlFor="handoff-receiver">Receiving clinician:</label>
                  <select
                    id="handoff-receiver"
                    data-testid="receiver-select"
                    className="ehr-input"
                    value={selected.receiver}
                    onChange={ev => update({ receiver: ev.target.value })}
                  >
                    <option value="">-- Select --</option>
                    {RECEIVERS.map(r => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
                <textarea
                  aria-label="Receiver read-back"
                  data-testid="synthesis-input"
                  className="ehr-input w-full h-12 resize-none"
                  placeholder="Receiver restates the key points and plan in their own words..."
                  value={selected.synthesis}
                  onChange={ev => update({ synthesis: ev.target.value })}
                />
                {!locked && (
                  <div className="flex items-center justify-between mt-1">
                    <div className="text-[10px]">
                      {missing.length > 0 ? (
                        <span className="flex items-center text-orange-700">
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          Missing: {missing.map(m => m.label).join(', ')}
                        </span>
                      ) : (
                        <span className="text-green-700">All I-PASS elements complete.</span>
                      )}
                    </div>
                    <button
                      type="button"
                      data-testid="accept-handoff"
                      className="ehr-button ehr-button-primary flex items-center space-x-1 disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={!canAccept(selected)}
                      onClick={acceptHandoff}
                    >
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Accept Handoff</span>
                    </button>
                  </div>
                )}
              </fieldset>
            </div>
          )}
        </div>

        <div className="ehr-status-bar flex items-center justify-between">
          <span>{entries.length} patient(s) on unit • sorted by illness severity</span>
          <span>Handoff drafts auto-saved locally</span>
        </div>
      </div>

      <Modal
        isOpen={showReport}
        onClose={() => setShowReport(false)}
        title="I-PASS Handoff Report"
        width="xl"
        footer={
          <div className="flex justify-end space-x-2">
            <button className="ehr-button flex items-center space-x-1" onClick={copyReport}>
              <ClipboardCopy className="w-3 h-3" />
              <span>{copied ? 'Copied!' : 'Copy'}</span>
            </button>
            <button
              className="ehr-button flex items-center space-x-1"
              onClick={() => {
                logPrint(undefined, 'I-PASS Handoff Report');
                window.print();
              }}
            >
              <FileText className="w-3 h-3" />
              <span>Print</span>
            </button>
            <button className="ehr-button ehr-button-primary" onClick={() => setShowReport(false)}>Close</button>
          </div>
        }
      >
        <pre className="bg-white border border-gray-400 p-2 text-[10px] leading-snug font-mono whitespace-pre-wrap" data-testid="handoff-report">
          {report}
        </pre>
      </Modal>
    </div>
  );
}
