import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  FileText, Save, PenLine, Printer, Trash2, Plus, ChevronRight, Lock,
  AlertTriangle, CheckCircle2, Zap, SkipForward, Info
} from 'lucide-react';
import { Modal, AlertDialog, ConfirmDialog } from '../components/ui/Modal';
import { PrintDialog } from '../components/ui/PrintDialog';
import { logAuditEvent, logPrint } from '../services/auditService';
import {
  smartPhrases, expandTokens, expandSmartPhrase, getDotPhraseAtCaret, matchSmartPhrases,
  countPlaceholders, findNextPlaceholder, countWords, PLACEHOLDER,
  type NotePatientContext, type SmartPhrase,
} from '../services/smartPhraseService';

const AUTHOR = 'Sarah Anderson, MD';
const NOTES_STORAGE_KEY = 'coghealth_clinical_notes';

type NoteType = 'Progress Note' | 'H&P' | 'Consult Note' | 'Discharge Summary' | 'Procedure Note';
const NOTE_TYPES: NoteType[] = ['Progress Note', 'H&P', 'Consult Note', 'Discharge Summary', 'Procedure Note'];

interface ClinicalNote {
  id: number;
  patientId: number;
  type: NoteType;
  content: string;
  status: 'draft' | 'signed';
  author: string;
  createdAt: string;
  updatedAt: string;
  signedAt?: string;
  signedBy?: string;
}

const notePatients: NotePatientContext[] = [
  { id: 1, name: 'Smith, John', firstName: 'John', mrn: 'MRN001234', dob: '03/15/1965', age: 58, sex: 'M', room: '412A',
    allergies: ['Penicillin (rash)', 'Sulfa drugs (hives)'],
    problems: ['Hypertension', 'CKD stage 3', 'Type 2 diabetes mellitus'],
    medications: ['Lisinopril 20 mg PO daily', 'Metformin 500 mg PO BID', 'Atorvastatin 40 mg PO nightly'],
    vitals: { bp: '158/94', hr: 98, temp: 98.6, rr: 20, spo2: 94, weight: 82.5 },
    labs: ['Potassium 6.8 mEq/L (CRITICAL HIGH)', 'Creatinine 3.2 mg/dL (CRITICAL HIGH)', 'BUN 42 mg/dL (H)', 'Glucose 156 mg/dL (H)', 'Hemoglobin 10.2 g/dL (L)'] },
  { id: 2, name: 'Johnson, Sarah', firstName: 'Sarah', mrn: 'MRN001235', dob: '07/22/1978', age: 45, sex: 'F',
    allergies: [],
    problems: ['Type 2 diabetes mellitus, uncontrolled', 'Hyperlipidemia', 'Obesity'],
    medications: ['Metformin 1000 mg PO BID', 'Empagliflozin 10 mg PO daily', 'Rosuvastatin 20 mg PO nightly'],
    vitals: { bp: '132/84', hr: 78, temp: 98.2, rr: 16, spo2: 98, weight: 94.0 },
    labs: ['HbA1c 9.2 % (H)', 'LDL 165 mg/dL (H)', 'HDL 38 mg/dL (L)', 'Triglycerides 195 mg/dL (H)'] },
  { id: 3, name: 'Williams, Michael', firstName: 'Michael', mrn: 'MRN001236', dob: '11/08/1952', age: 71, sex: 'M',
    allergies: ['Codeine (nausea)'],
    problems: ['Benign prostatic hyperplasia', 'Osteoarthritis, bilateral knees'],
    medications: ['Tamsulosin 0.4 mg PO nightly', 'Acetaminophen 650 mg PO q6h PRN pain'],
    vitals: { bp: '128/78', hr: 72, temp: 98.0, rr: 14, spo2: 97, weight: 88.1 },
    labs: ['Urinalysis: within normal limits'] },
  { id: 4, name: 'Brown, Emily', firstName: 'Emily', mrn: 'MRN001237', dob: '04/30/1989', age: 34, sex: 'F',
    allergies: ['Latex'],
    problems: ['Asthma, mild persistent', 'Seasonal allergic rhinitis'],
    medications: ['Fluticasone 110 mcg inhaled BID', 'Albuterol HFA 2 puffs q4h PRN wheeze'],
    vitals: { bp: '118/72', hr: 68, temp: 98.4, rr: 14, spo2: 99, weight: 61.2 },
    labs: [] },
  { id: 5, name: 'Davis, Robert', firstName: 'Robert', mrn: 'MRN001238', dob: '08/20/1945', age: 78, sex: 'M', room: 'CCU-3',
    allergies: ['Aspirin (GI bleed)'],
    problems: ['Acute decompensated heart failure', 'Atrial fibrillation', 'Coronary artery disease s/p CABG 2015'],
    medications: ['Furosemide 40 mg IV BID', 'Apixaban 5 mg PO BID', 'Carvedilol 12.5 mg PO BID', 'Sacubitril/valsartan 49/51 mg PO BID'],
    vitals: { bp: '104/62', hr: 112, temp: 98.9, rr: 24, spo2: 91, weight: 79.4 },
    labs: ['BNP 890 pg/mL (H)', 'Troponin I 2.4 ng/mL (CRITICAL HIGH)', 'Sodium 133 mEq/L (L)'] },
  { id: 6, name: 'Martinez, Maria', firstName: 'Maria', mrn: 'MRN001240', dob: '12/05/1970', age: 53, sex: 'F',
    allergies: [],
    problems: ['Hypothyroidism', 'Migraine without aura'],
    medications: ['Levothyroxine 75 mcg PO daily', 'Sumatriptan 50 mg PO PRN migraine'],
    vitals: { bp: '122/80', hr: 74, temp: 98.1, rr: 16, spo2: 98, weight: 66.8 },
    labs: ['TSH 2.1 mIU/L', 'Free T4 1.1 ng/dL'] },
];

const seedTime = (daysAgo: number, hour: number) => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
};

function buildSeedNotes(): ClinicalNote[] {
  const ctx = (id: number, when: string) => ({ patient: notePatients.find(p => p.id === id)!, author: AUTHOR, now: new Date(when) });
  const n1 = seedTime(0, 7);
  const n2 = seedTime(1, 16);
  const n3 = seedTime(2, 9);
  const n4 = seedTime(3, 11);
  const n5 = seedTime(5, 14);
  return [
    { id: 101, patientId: 1, type: 'Progress Note', status: 'draft', author: AUTHOR, createdAt: n1, updatedAt: n1,
      content: expandTokens(smartPhrases.find(p => p.key === 'soap')!.template, ctx(1, n1)) },
    { id: 102, patientId: 5, type: 'H&P', status: 'draft', author: AUTHOR, createdAt: n2, updatedAt: n2,
      content: expandTokens(
        `HISTORY AND PHYSICAL - @DATE@\nPatient: @NAME@ | @AGE@ y/o @SEX@ | MRN @MRN@ | Room @ROOM@\n\nCHIEF COMPLAINT: Shortness of breath x 3 days\n\n${smartPhrases.find(p => p.key === 'hpi')!.template}\n\nALLERGIES: @ALLERGIES@\n\n${smartPhrases.find(p => p.key === 'meds')!.template}\n\n${smartPhrases.find(p => p.key === 'labs')!.template}\n\n${smartPhrases.find(p => p.key === 'ap')!.template}`,
        ctx(5, n2)) },
    { id: 103, patientId: 2, type: 'Discharge Summary', status: 'draft', author: AUTHOR, createdAt: n3, updatedAt: n3,
      content: expandTokens(smartPhrases.find(p => p.key === 'dc')!.template, ctx(2, n3)) },
    { id: 104, patientId: 3, type: 'Progress Note', status: 'signed', author: AUTHOR, createdAt: n4, updatedAt: n4, signedAt: n4, signedBy: AUTHOR,
      content: expandTokens(
        `PROGRESS NOTE - @DATE@\nPatient: @NAME@ | @AGE@ y/o @SEX@ | MRN @MRN@\n\nSUBJECTIVE:\n@FIRSTNAME@ is a @AGE@ y/o @SEX@ seen today for follow-up of BPH and knee osteoarthritis. Reports improved nocturia on tamsulosin, 1-2 episodes nightly. Knee pain 3/10, controlled with acetaminophen.\n\nOBJECTIVE:\nVitals: @VITALS@\nExam: NAD. Knees with mild crepitus bilaterally, no effusion. Abdomen soft, non-tender.\n\nASSESSMENT:\n1. BPH - improved on alpha blocker.\n2. OA bilateral knees - stable.\n\nPLAN:\n- Continue tamsulosin 0.4 mg nightly.\n- Continue acetaminophen PRN; avoid NSAIDs.\n- PT referral for quadriceps strengthening.\n- RTC 6 months.\n\n@SIGNATURE@`,
        ctx(3, n4)) },
    { id: 105, patientId: 6, type: 'Progress Note', status: 'signed', author: AUTHOR, createdAt: n5, updatedAt: n5, signedAt: n5, signedBy: AUTHOR,
      content: expandTokens(
        `PROGRESS NOTE - @DATE@\nPatient: @NAME@ | @AGE@ y/o @SEX@ | MRN @MRN@\n\nSUBJECTIVE:\n@FIRSTNAME@ presents for annual thyroid follow-up. Denies fatigue, weight change, palpitations. Migraines 1-2/month, responsive to sumatriptan.\n\nOBJECTIVE:\nVitals: @VITALS@\n@LABS@\n\nASSESSMENT:\n1. Hypothyroidism - euthyroid on current dose.\n2. Migraine without aura - well controlled.\n\nPLAN:\n- Continue levothyroxine 75 mcg daily; repeat TSH in 12 months.\n- Continue sumatriptan PRN.\n- RTC 12 months.\n\n@SIGNATURE@`,
        ctx(6, n5)) },
  ];
}

function loadNotes(): ClinicalNote[] {
  try {
    const raw = localStorage.getItem(NOTES_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as ClinicalNote[];
      if (Array.isArray(parsed) && parsed.length) return parsed;
    }
  } catch {
    /* fall through to seeds */
  }
  return buildSeedNotes();
}

function saveNotes(notes: ClinicalNote[]) {
  localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(notes));
}

const fmtDateTime = (iso: string) => {
  const d = new Date(iso);
  return `${d.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })} ${d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
};

const daysOld = (iso: string) => Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);

const EDITOR_LINE_HEIGHT = 18;
const EDITOR_CHAR_WIDTH = 7.2;
const EDITOR_PADDING = 8;

export default function ClinicalNotesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [notes, setNotes] = useState<ClinicalNote[]>(() => loadNotes());
  const [selectedId, setSelectedId] = useState<number | null>(() => {
    const initial = loadNotes();
    return initial.find(n => n.status === 'draft')?.id ?? initial[0]?.id ?? null;
  });
  const [listTab, setListTab] = useState<'draft' | 'signed'>('draft');
  const [draftContent, setDraftContent] = useState('');
  const [dirty, setDirty] = useState(false);

  const [suggestions, setSuggestions] = useState<SmartPhrase[]>([]);
  const [suggestionIndex, setSuggestionIndex] = useState(0);
  const [suggestionAnchor, setSuggestionAnchor] = useState<{ top: number; left: number; start: number } | null>(null);

  const [showNewNote, setShowNewNote] = useState(false);
  const [newNotePatientId, setNewNotePatientId] = useState<number>(notePatients[0].id);
  const [newNoteType, setNewNoteType] = useState<NoteType>('Progress Note');
  const [newNoteUseTemplate, setNewNoteUseTemplate] = useState(true);

  const [showSign, setShowSign] = useState(false);
  const [attested, setAttested] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [showPrint, setShowPrint] = useState(false);
  const [alert, setAlert] = useState<{ title: string; message: string; type: 'info' | 'success' | 'warning' | 'error' } | null>(null);
  const [lastExpanded, setLastExpanded] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const pendingSelection = useRef<{ start: number; end: number } | null>(null);

  const selectedNote = useMemo(() => notes.find(n => n.id === selectedId) ?? null, [notes, selectedId]);
  const patient = useMemo(() => selectedNote ? notePatients.find(p => p.id === selectedNote.patientId) ?? null : null, [selectedNote]);
  const isSigned = selectedNote?.status === 'signed';

  const draftNotes = useMemo(() => notes.filter(n => n.status === 'draft').sort((a, b) => a.updatedAt.localeCompare(b.updatedAt)), [notes]);
  const signedNotes = useMemo(() => notes.filter(n => n.status === 'signed').sort((a, b) => b.signedAt!.localeCompare(a.signedAt!)), [notes]);

  const placeholderCount = countPlaceholders(draftContent);
  const wordCount = countWords(draftContent);

  useEffect(() => {
    setDraftContent(selectedNote?.content ?? '');
    setDirty(false);
    setSuggestions([]);
    setLastExpanded(null);
  }, [selectedNote?.id, selectedNote?.content]);

  useEffect(() => {
    if (searchParams.get('new') === '1') {
      const pid = Number(searchParams.get('patient'));
      if (notePatients.some(p => p.id === pid)) setNewNotePatientId(pid);
      setShowNewNote(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    if (pendingSelection.current && textareaRef.current) {
      const { start, end } = pendingSelection.current;
      pendingSelection.current = null;
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(start, end);
    }
  }, [draftContent]);

  useEffect(() => {
    if (!lastExpanded) return;
    const t = setTimeout(() => setLastExpanded(null), 2500);
    return () => clearTimeout(t);
  }, [lastExpanded]);

  const updateSuggestions = useCallback((text: string, caret: number) => {
    const hit = getDotPhraseAtCaret(text, caret);
    if (!hit) {
      setSuggestions([]);
      setSuggestionAnchor(null);
      return;
    }
    const matches = matchSmartPhrases(hit.query);
    setSuggestions(matches);
    setSuggestionIndex(0);
    const ta = textareaRef.current;
    const lines = text.slice(0, caret).split('\n');
    const row = lines.length - 1;
    const col = lines[lines.length - 1].length;
    const top = EDITOR_PADDING + (row + 1) * EDITOR_LINE_HEIGHT - (ta?.scrollTop ?? 0);
    const maxLeft = Math.max(0, (ta?.clientWidth ?? 600) - 300);
    const left = Math.min(EDITOR_PADDING + col * EDITOR_CHAR_WIDTH, maxLeft);
    setSuggestionAnchor({ top, left, start: hit.start });
  }, []);

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setDraftContent(text);
    setDirty(true);
    updateSuggestions(text, e.target.selectionStart);
  };

  const insertText = useCallback((text: string, replaceFrom?: number) => {
    const ta = textareaRef.current;
    const caret = ta ? ta.selectionEnd : draftContent.length;
    const start = replaceFrom ?? (ta ? ta.selectionStart : caret);
    const next = draftContent.slice(0, start) + text + draftContent.slice(caret);
    const firstPlaceholder = text.indexOf(PLACEHOLDER);
    pendingSelection.current = firstPlaceholder >= 0
      ? { start: start + firstPlaceholder, end: start + firstPlaceholder + PLACEHOLDER.length }
      : { start: start + text.length, end: start + text.length };
    setDraftContent(next);
    setDirty(true);
    setSuggestions([]);
    setSuggestionAnchor(null);
  }, [draftContent]);

  const applySmartPhrase = useCallback((phrase: SmartPhrase, replaceFrom?: number) => {
    if (!patient) return;
    const expanded = expandSmartPhrase(phrase.key, { patient, author: AUTHOR });
    if (expanded === null) return;
    insertText(expanded, replaceFrom);
    setLastExpanded(`.${phrase.key}`);
  }, [patient, insertText]);

  const jumpToNextPlaceholder = useCallback(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    const hit = findNextPlaceholder(draftContent, ta.selectionEnd);
    if (!hit) {
      setAlert({ title: 'No Placeholders', message: 'All *** placeholders have been resolved.', type: 'success' });
      return;
    }
    ta.focus();
    ta.setSelectionRange(hit.start, hit.end);
  }, [draftContent]);

  const saveDraft = useCallback(() => {
    if (!selectedNote || isSigned) return;
    const now = new Date().toISOString();
    const updated = notes.map(n => n.id === selectedNote.id ? { ...n, content: draftContent, updatedAt: now } : n);
    setNotes(updated);
    saveNotes(updated);
    setDirty(false);
  }, [selectedNote, isSigned, notes, draftContent]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (suggestions.length && suggestionAnchor) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setSuggestionIndex(i => (i + 1) % suggestions.length); return; }
      if (e.key === 'ArrowUp') { e.preventDefault(); setSuggestionIndex(i => (i - 1 + suggestions.length) % suggestions.length); return; }
      if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); applySmartPhrase(suggestions[suggestionIndex], suggestionAnchor.start); return; }
      if (e.key === 'Escape') { e.preventDefault(); setSuggestions([]); setSuggestionAnchor(null); return; }
    }
    if (e.key === 'F2') { e.preventDefault(); jumpToNextPlaceholder(); return; }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); saveDraft(); return; }
  };

  const createNote = () => {
    const pt = notePatients.find(p => p.id === newNotePatientId)!;
    const now = new Date().toISOString();
    let content = '';
    if (newNoteUseTemplate) {
      const key = newNoteType === 'Discharge Summary' ? 'dc' : 'soap';
      content = expandSmartPhrase(key, { patient: pt, author: AUTHOR }) ?? '';
      if (newNoteType !== 'Progress Note' && newNoteType !== 'Discharge Summary') {
        content = content.replace(/^PROGRESS NOTE/, newNoteType.toUpperCase());
      }
    }
    const note: ClinicalNote = {
      id: Math.max(0, ...notes.map(n => n.id)) + 1,
      patientId: pt.id,
      type: newNoteType,
      content,
      status: 'draft',
      author: AUTHOR,
      createdAt: now,
      updatedAt: now,
    };
    const updated = [...notes, note];
    setNotes(updated);
    saveNotes(updated);
    logAuditEvent('NOTE_CREATE', { patientId: String(pt.id), patientMrn: pt.mrn, patientName: pt.name, resourceType: 'ClinicalNote', resourceId: String(note.id), details: newNoteType });
    setShowNewNote(false);
    setListTab('draft');
    setSelectedId(note.id);
    const firstPlaceholder = content.indexOf(PLACEHOLDER);
    pendingSelection.current = firstPlaceholder >= 0 ? { start: firstPlaceholder, end: firstPlaceholder + PLACEHOLDER.length } : { start: content.length, end: content.length };
  };

  const signNote = () => {
    if (!selectedNote || !patient) return;
    const now = new Date().toISOString();
    const updated: ClinicalNote[] = notes.map(n => n.id === selectedNote.id
      ? { ...n, content: draftContent, status: 'signed' as const, updatedAt: now, signedAt: now, signedBy: AUTHOR }
      : n);
    setNotes(updated);
    saveNotes(updated);
    logAuditEvent('NOTE_SIGN', { patientId: String(patient.id), patientMrn: patient.mrn, patientName: patient.name, resourceType: 'ClinicalNote', resourceId: String(selectedNote.id), details: `${selectedNote.type} electronically signed` });
    setShowSign(false);
    setAttested(false);
    setListTab('signed');
    setAlert({ title: 'Note Signed', message: `${selectedNote.type} for ${patient.name} has been electronically signed and locked.`, type: 'success' });
  };

  const deleteDraft = () => {
    if (!selectedNote || isSigned) return;
    const updated = notes.filter(n => n.id !== selectedNote.id);
    setNotes(updated);
    saveNotes(updated);
    setShowDelete(false);
    setSelectedId(updated.find(n => n.status === 'draft')?.id ?? updated[0]?.id ?? null);
  };

  const selectNote = (note: ClinicalNote) => {
    if (dirty && selectedNote && !isSigned) saveDraft();
    setSelectedId(note.id);
  };

  const groupedPhrases = useMemo(() => {
    const groups: Record<string, SmartPhrase[]> = {};
    smartPhrases.forEach(p => { (groups[p.category] ||= []).push(p); });
    return groups;
  }, []);

  const renderList = (items: ClinicalNote[]) => (
    items.length === 0 ? (
      <div className="px-2 py-4 text-[10px] text-gray-500 text-center">No {listTab === 'draft' ? 'unsigned' : 'signed'} notes</div>
    ) : items.map(note => {
      const pt = notePatients.find(p => p.id === note.patientId);
      const age = daysOld(note.updatedAt);
      const unresolved = countPlaceholders(note.content);
      const isSelected = note.id === selectedId;
      return (
        <div
          key={note.id}
          onClick={() => selectNote(note)}
          className={`ehr-grid-row px-2 py-1.5 border-b border-gray-200 cursor-pointer ${isSelected ? 'selected' : ''}`}
          data-testid={`note-row-${note.id}`}
        >
          <div className="flex items-center justify-between">
            <span className="font-semibold text-[11px]">{pt?.name}</span>
            {note.status === 'draft' && age >= 2 && <span className={`text-[9px] font-semibold ${isSelected ? 'text-red-200' : 'text-red-600'}`}>{age}d</span>}
            {note.status === 'signed' && <Lock className={`w-3 h-3 ${isSelected ? 'text-white' : 'text-green-700'}`} />}
          </div>
          <div className={`text-[10px] flex items-center justify-between ${isSelected ? 'text-blue-100' : 'text-gray-600'}`}>
            <span>{note.type}</span>
            <span>{new Date(note.updatedAt).toLocaleDateString()}</span>
          </div>
          {note.status === 'draft' && unresolved > 0 && (
            <div className={`text-[9px] flex items-center mt-0.5 ${isSelected ? 'text-amber-200' : 'text-amber-700'}`}><AlertTriangle className="w-2.5 h-2.5 mr-0.5" /> {unresolved} unresolved ***</div>
          )}
        </div>
      );
    })
  );

  return (
    <div className="h-full flex flex-col" style={{ fontFamily: 'Tahoma, sans-serif' }}>
      {/* Toolbar */}
      <div className="ehr-toolbar flex items-center justify-between">
        <div className="flex items-center space-x-0.5">
          <button className="ehr-toolbar-button flex items-center" onClick={() => setShowNewNote(true)} data-testid="new-note-btn">
            <Plus className="w-3.5 h-3.5 mr-1" /> New Note
          </button>
          <button className="ehr-toolbar-button flex items-center" onClick={saveDraft} disabled={!selectedNote || isSigned || !dirty} title="Ctrl+S" data-testid="save-draft-btn">
            <Save className="w-3.5 h-3.5 mr-1" /> Save Draft
          </button>
          <button className="ehr-toolbar-button flex items-center" onClick={jumpToNextPlaceholder} disabled={!selectedNote || isSigned} title="F2" data-testid="next-placeholder-btn">
            <SkipForward className="w-3.5 h-3.5 mr-1" /> Next *** (F2)
          </button>
          <button
            className={`ehr-toolbar-button flex items-center ${selectedNote && !isSigned && placeholderCount === 0 ? 'text-blue-800 font-semibold' : ''}`}
            onClick={() => setShowSign(true)}
            disabled={!selectedNote || isSigned}
            data-testid="sign-note-btn"
          >
            <PenLine className="w-3.5 h-3.5 mr-1" /> Sign Note
          </button>
          <button className="ehr-toolbar-button flex items-center" onClick={() => setShowPrint(true)} disabled={!selectedNote}>
            <Printer className="w-3.5 h-3.5 mr-1" /> Print
          </button>
          <button className="ehr-toolbar-button flex items-center" onClick={() => setShowDelete(true)} disabled={!selectedNote || isSigned}>
            <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete Draft
          </button>
        </div>
        <div className="flex items-center space-x-3 text-[10px] text-gray-600 pr-2">
          {lastExpanded && (
            <span className="flex items-center text-green-700 font-semibold" data-testid="expanded-toast"><Zap className="w-3 h-3 mr-0.5" /> Expanded {lastExpanded}</span>
          )}
          {selectedNote && !isSigned && (
            placeholderCount > 0 ? (
              <span className="flex items-center text-amber-700 font-semibold" data-testid="placeholder-count"><AlertTriangle className="w-3 h-3 mr-0.5" /> {placeholderCount} unresolved ***</span>
            ) : (
              <span className="flex items-center text-green-700 font-semibold" data-testid="placeholder-count"><CheckCircle2 className="w-3 h-3 mr-0.5" /> Ready to sign</span>
            )
          )}
          <span>{wordCount} words</span>
          <span className="text-gray-400">|</span>
          <span>{dirty ? 'Unsaved changes' : 'Saved'}</span>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Notes list */}
        <div className="w-60 ehr-panel flex flex-col border-r border-gray-400">
          <div className="ehr-header text-[11px] flex items-center"><FileText className="w-3.5 h-3.5 mr-1" /> Clinical Notes</div>
          <div className="flex bg-[#ece9d8] px-1 pt-1 border-b border-gray-400">
            <button className={`ehr-tab ${listTab === 'draft' ? 'active' : ''}`} onClick={() => setListTab('draft')} data-testid="tab-unsigned">Unsigned ({draftNotes.length})</button>
            <button className={`ehr-tab ${listTab === 'signed' ? 'active' : ''}`} onClick={() => setListTab('signed')} data-testid="tab-signed">Signed ({signedNotes.length})</button>
          </div>
          <div className="flex-1 overflow-auto bg-white">
            {renderList(listTab === 'draft' ? draftNotes : signedNotes)}
          </div>
        </div>

        {/* Editor */}
        <div className="flex-1 flex flex-col min-w-0">
          {selectedNote && patient ? (
            <>
              <div className="bg-gradient-to-b from-[#e8eef7] to-[#d4dff0] border-b border-gray-400 px-3 py-1.5 flex items-center justify-between">
                <div className="flex items-center space-x-3 text-[11px]">
                  <span className="font-bold text-[12px] text-blue-900">{patient.name}</span>
                  <span>{patient.age} y/o {patient.sex}</span>
                  <span>DOB {patient.dob}</span>
                  <span>{patient.mrn}</span>
                  {patient.room && <span>Rm {patient.room}</span>}
                  <span className={`px-1.5 py-0.5 text-[10px] font-semibold border ${patient.allergies.length ? 'bg-red-100 text-red-800 border-red-400' : 'bg-green-100 text-green-800 border-green-400'}`}>
                    {patient.allergies.length ? `ALLERGIES: ${patient.allergies.join(', ')}` : 'NKDA'}
                  </span>
                </div>
                <div className="flex items-center space-x-2 text-[10px] text-gray-700">
                  <span className="font-semibold">{selectedNote.type}</span>
                  <span className="text-gray-400">|</span>
                  {isSigned ? (
                    <span className="flex items-center text-green-800 font-semibold"><Lock className="w-3 h-3 mr-0.5" /> SIGNED</span>
                  ) : (
                    <span className="flex items-center text-amber-800 font-semibold"><PenLine className="w-3 h-3 mr-0.5" /> DRAFT</span>
                  )}
                </div>
              </div>

              <div className="flex-1 relative bg-white overflow-hidden">
                <textarea
                  ref={textareaRef}
                  value={draftContent}
                  onChange={handleContentChange}
                  onKeyDown={handleKeyDown}
                  onClick={(e) => updateSuggestions(draftContent, e.currentTarget.selectionStart)}
                  onBlur={() => setTimeout(() => { setSuggestions([]); setSuggestionAnchor(null); }, 150)}
                  readOnly={isSigned}
                  spellCheck={false}
                  data-testid="note-editor"
                  placeholder="Type a SmartPhrase such as .hpi, .pe or .soap and press Enter to expand it..."
                  className={`w-full h-full resize-none focus:outline-none text-[12px] ${isSigned ? 'bg-[#f7f7f7] text-gray-700' : 'bg-white'}`}
                  style={{ fontFamily: '"Courier New", Courier, monospace', lineHeight: `${EDITOR_LINE_HEIGHT}px`, padding: EDITOR_PADDING }}
                />
                {suggestions.length > 0 && suggestionAnchor && !isSigned && (
                  <div
                    className="absolute bg-white border border-gray-500 shadow-lg z-20 w-72"
                    style={{ top: suggestionAnchor.top, left: suggestionAnchor.left }}
                    data-testid="smartphrase-popup"
                  >
                    <div className="ehr-subheader flex items-center justify-between">
                      <span className="flex items-center"><Zap className="w-3 h-3 mr-1 text-blue-700" /> SmartPhrases</span>
                      <span className="text-gray-500 font-normal">↑↓ Enter/Tab Esc</span>
                    </div>
                    {suggestions.map((s, i) => (
                      <div
                        key={s.key}
                        onMouseDown={(e) => { e.preventDefault(); applySmartPhrase(s, suggestionAnchor.start); }}
                        onMouseEnter={() => setSuggestionIndex(i)}
                        className={`px-2 py-1 text-[11px] flex items-center justify-between cursor-pointer ${i === suggestionIndex ? 'bg-[#316ac5] text-white' : 'hover:bg-blue-50'}`}
                        data-testid={`smartphrase-option-${s.key}`}
                      >
                        <span className="font-mono font-semibold">.{s.key}</span>
                        <span className={`text-[10px] ${i === suggestionIndex ? 'text-blue-100' : 'text-gray-500'}`}>{s.description}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="ehr-status-bar border-t border-gray-400 flex items-center justify-between">
                <span>
                  Author: {selectedNote.author} • Created {fmtDateTime(selectedNote.createdAt)} • Last edited {fmtDateTime(selectedNote.updatedAt)}
                </span>
                {isSigned && selectedNote.signedAt && (
                  <span className="text-green-800 font-semibold flex items-center" data-testid="signature-line">
                    <Lock className="w-3 h-3 mr-1" /> Electronically signed by {selectedNote.signedBy} on {fmtDateTime(selectedNote.signedAt)}
                  </span>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-500 text-[11px] bg-white">
              <FileText className="w-10 h-10 mb-2 text-gray-300" />
              <p>Select a note from the list or create a new note.</p>
              <button className="ehr-button ehr-button-primary mt-3 flex items-center" onClick={() => setShowNewNote(true)}>
                <Plus className="w-3 h-3 mr-1" /> New Note
              </button>
            </div>
          )}
        </div>

        {/* SmartPhrase library */}
        <div className="w-60 ehr-panel flex flex-col border-l border-gray-400">
          <div className="ehr-header text-[11px] flex items-center"><Zap className="w-3.5 h-3.5 mr-1" /> SmartPhrase Library</div>
          <div className="flex-1 overflow-auto bg-white">
            {Object.entries(groupedPhrases).map(([category, phrases]) => (
              <div key={category}>
                <div className="ehr-subheader">{category}</div>
                {phrases.map(p => (
                  <button
                    key={p.key}
                    onClick={() => applySmartPhrase(p)}
                    disabled={!selectedNote || isSigned}
                    className="w-full text-left px-2 py-1 border-b border-gray-200 hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                    data-testid={`library-${p.key}`}
                    title={`Insert .${p.key} at cursor`}
                  >
                    <ChevronRight className="w-3 h-3 text-gray-400 mr-1 flex-shrink-0" />
                    <div className="min-w-0">
                      <div className="font-mono font-semibold text-[11px] text-blue-900">.{p.key}</div>
                      <div className="text-[10px] text-gray-600 truncate">{p.description}</div>
                    </div>
                  </button>
                ))}
              </div>
            ))}
          </div>
          <div className="bg-[#fffbe6] border-t border-gray-400 px-2 py-1.5 text-[10px] text-gray-700">
            <div className="flex items-center font-semibold mb-0.5"><Info className="w-3 h-3 mr-1" /> How it works</div>
            <div>Type <span className="font-mono">.</span> + phrase in the note, pick with ↑↓, expand with Enter. Tokens like <span className="font-mono">@VITALS@</span> auto-fill from the chart. <span className="font-mono">***</span> marks text you must complete; press F2 to jump to the next one. Notes cannot be signed with unresolved <span className="font-mono">***</span>.</div>
          </div>
        </div>
      </div>

      {/* New note dialog */}
      <Modal
        isOpen={showNewNote}
        onClose={() => setShowNewNote(false)}
        title="New Clinical Note"
        width="sm"
        footer={
          <>
            <button className="ehr-button" onClick={() => setShowNewNote(false)}>Cancel</button>
            <button className="ehr-button ehr-button-primary" onClick={createNote} data-testid="create-note-btn">Create Note</button>
          </>
        }
      >
        <div className="space-y-2 text-[11px]">
          <div>
            <label className="ehr-label block mb-0.5">Patient</label>
            <select className="ehr-input w-full" value={newNotePatientId} onChange={(e) => setNewNotePatientId(Number(e.target.value))} data-testid="new-note-patient">
              {notePatients.map(p => <option key={p.id} value={p.id}>{p.name} — {p.mrn}</option>)}
            </select>
          </div>
          <div>
            <label className="ehr-label block mb-0.5">Note Type</label>
            <select className="ehr-input w-full" value={newNoteType} onChange={(e) => setNewNoteType(e.target.value as NoteType)} data-testid="new-note-type">
              {NOTE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <label className="flex items-center ehr-label">
            <input type="checkbox" className="ehr-checkbox" checked={newNoteUseTemplate} onChange={(e) => setNewNoteUseTemplate(e.target.checked)} />
            Start from SmartPhrase template ({newNoteType === 'Discharge Summary' ? '.dc' : '.soap'})
          </label>
        </div>
      </Modal>

      {/* Sign dialog */}
      <Modal
        isOpen={showSign}
        onClose={() => { setShowSign(false); setAttested(false); }}
        title="Sign Clinical Note"
        width="md"
        footer={
          <>
            <button className="ehr-button" onClick={() => { setShowSign(false); setAttested(false); }}>Cancel</button>
            <button
              className="ehr-button ehr-button-primary disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={signNote}
              disabled={!attested || placeholderCount > 0}
              data-testid="confirm-sign-btn"
            >
              <span className="flex items-center"><PenLine className="w-3 h-3 mr-1" /> Sign &amp; Lock</span>
            </button>
          </>
        }
      >
        {selectedNote && patient && (
          <div className="space-y-2 text-[11px]">
            <div className="ehr-fieldset">
              <div><span className="font-semibold">Patient:</span> {patient.name} ({patient.mrn})</div>
              <div><span className="font-semibold">Note:</span> {selectedNote.type} • {wordCount} words</div>
              <div><span className="font-semibold">Signer:</span> {AUTHOR}</div>
            </div>
            {placeholderCount > 0 ? (
              <div className="ehr-alert-warning p-2 flex items-start" data-testid="sign-blocked">
                <AlertTriangle className="w-4 h-4 mr-2 flex-shrink-0" />
                <div>
                  <div className="font-semibold">Cannot sign: {placeholderCount} unresolved *** placeholder{placeholderCount > 1 ? 's' : ''}</div>
                  <div>Complete every *** in the note before signing. Use Next *** (F2) to find them.</div>
                </div>
              </div>
            ) : (
              <label className="flex items-start ehr-label p-2 bg-white border border-gray-300">
                <input type="checkbox" className="ehr-checkbox mt-0.5" checked={attested} onChange={(e) => setAttested(e.target.checked)} data-testid="attest-checkbox" />
                <span>I attest that I personally performed the services described in this documentation, that it is accurate and complete, and that I am the author of this note. This electronic signature is legally binding.</span>
              </label>
            )}
            <div className="text-[10px] text-gray-600">Signing locks the note. Changes after signing require an addendum. This action is recorded in the HIPAA audit log.</div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        isOpen={showDelete}
        onClose={() => setShowDelete(false)}
        onConfirm={deleteDraft}
        title="Delete Draft"
        message="Delete this unsigned draft note? This cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
      />

      <PrintDialog
        isOpen={showPrint}
        onClose={() => setShowPrint(false)}
        title="Print Clinical Note"
        documentName={selectedNote && patient ? `${selectedNote.type} - ${patient.name}` : 'Clinical Note'}
        onPrint={(options) => {
          if (patient) logPrint(String(patient.id), 'ClinicalNote');
          setShowPrint(false);
          setAlert({ title: 'Print Sent', message: `Note sent to printer (${options.action}).`, type: 'success' });
        }}
      />

      <AlertDialog
        isOpen={alert !== null}
        onClose={() => setAlert(null)}
        title={alert?.title ?? ''}
        message={alert?.message ?? ''}
        type={alert?.type}
      />
    </div>
  );
}
