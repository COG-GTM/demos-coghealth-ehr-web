import { useMemo, useState, type ReactNode } from 'react';
import { Calculator, ClipboardCopy, RotateCcw, Check } from 'lucide-react';
import {
  anionGap,
  bmi,
  bsaMosteller,
  cha2ds2Vasc,
  cha2ds2VascStrokeRisk,
  cockcroftGault,
  correctedCalcium,
  interpretAnionGap,
  interpretBmi,
  interpretCalcium,
  interpretCha2ds2Vasc,
  interpretCrCl,
  interpretMap,
  meanArterialPressure,
  type Interpretation,
  type Sex,
} from '../utils/clinicalCalculators';

const patientInfo = { name: 'Smith, John', mrn: 'MRN001234', room: '412A' };

const defaultInputs = {
  age: '58',
  sex: 'M' as Sex,
  weight: '82.5',
  height: '178',
  creatinine: '1.4',
  systolic: '158',
  diastolic: '94',
  sodium: '138',
  chloride: '101',
  bicarbonate: '19',
  albumin: '3.1',
  calcium: '8.2',
};

const defaultRiskFactors = {
  chf: false,
  hypertension: true,
  diabetes: true,
  strokeOrTia: false,
  vascularDisease: false,
};

type Inputs = typeof defaultInputs;
type NumericField = Exclude<keyof Inputs, 'sex'>;

const severityStyles: Record<Interpretation['severity'], string> = {
  normal: 'bg-[#e6f4e6] border-green-600 text-green-900',
  abnormal: 'bg-[#fff3cd] border-yellow-600 text-[#664d00]',
  critical: 'bg-[#ffcccc] border-red-600 text-[#990000]',
};

interface ResultBoxProps {
  label: string;
  value: number | null;
  unit: string;
  interpretation?: Interpretation;
  testId: string;
}

function ResultBox({ label, value, unit, interpretation, testId }: ResultBoxProps) {
  const style = value !== null && interpretation ? severityStyles[interpretation.severity] : 'bg-[#f4f4f4] border-gray-400 text-gray-500';
  return (
    <div className={`border px-2 py-1.5 ${style}`} data-testid={testId}>
      <div className="flex items-baseline justify-between">
        <span className="text-[10px] uppercase tracking-wide">{label}</span>
        <span className="font-mono text-[15px] font-bold">
          {value ?? '--'} <span className="text-[10px] font-normal">{value !== null ? unit : ''}</span>
        </span>
      </div>
      <div className="text-[10px] mt-0.5">{value !== null && interpretation ? interpretation.label : 'Enter valid values'}</div>
    </div>
  );
}

interface FieldProps {
  label: string;
  unit: string;
  field: NumericField;
  inputs: Inputs;
  onChange: (field: NumericField, value: string) => void;
}

function Field({ label, unit, field, inputs, onChange }: FieldProps) {
  return (
    <label className="flex items-center space-x-2 text-[11px]">
      <span className="w-24 text-gray-700">{label}:</span>
      <input
        type="number"
        step="any"
        className="ehr-input w-20 text-[11px]"
        value={inputs[field]}
        onChange={(e) => onChange(field, e.target.value)}
        aria-label={label}
      />
      <span className="text-[10px] text-gray-500 w-14">{unit}</span>
    </label>
  );
}

function Panel({ title, formula, children }: { title: string; formula: string; children: ReactNode }) {
  return (
    <fieldset className="ehr-fieldset bg-white">
      <legend className="font-semibold">{title}</legend>
      <div className="space-y-2">{children}</div>
      <div className="text-[9px] text-gray-500 mt-2 italic">{formula}</div>
    </fieldset>
  );
}

export default function CalculatorsPage() {
  const [inputs, setInputs] = useState<Inputs>(defaultInputs);
  const [riskFactors, setRiskFactors] = useState(defaultRiskFactors);
  const [copied, setCopied] = useState(false);

  const setField = (field: NumericField, value: string) => setInputs(prev => ({ ...prev, [field]: value }));
  const num = (field: NumericField) => parseFloat(inputs[field]);

  const results = useMemo(() => {
    const n = (field: NumericField) => parseFloat(inputs[field]);
    const crcl = cockcroftGault(n('age'), n('weight'), n('creatinine'), inputs.sex);
    const bmiValue = bmi(n('weight'), n('height'));
    const map = meanArterialPressure(n('systolic'), n('diastolic'));
    const ag = anionGap(n('sodium'), n('chloride'), n('bicarbonate'), n('albumin'));
    const ca = correctedCalcium(n('calcium'), n('albumin'));
    const chads = Number.isFinite(n('age')) ? cha2ds2Vasc({ age: n('age'), sex: inputs.sex, ...riskFactors }) : null;
    return {
      crcl,
      bmi: bmiValue,
      bsa: bsaMosteller(n('weight'), n('height')),
      map,
      anionGap: ag,
      calcium: ca,
      chads,
    };
  }, [inputs, riskFactors]);

  const interpretations = {
    crcl: results.crcl !== null ? interpretCrCl(results.crcl) : undefined,
    bmi: results.bmi !== null ? interpretBmi(results.bmi) : undefined,
    map: results.map !== null ? interpretMap(results.map) : undefined,
    anionGap: results.anionGap !== null ? interpretAnionGap(results.anionGap) : undefined,
    calcium: results.calcium !== null ? interpretCalcium(results.calcium) : undefined,
    chads: results.chads !== null ? interpretCha2ds2Vasc(results.chads, inputs.sex) : undefined,
  };

  const flagged = Object.values(interpretations).filter(i => i && i.severity !== 'normal').length;

  const noteText = () => {
    const line = (label: string, value: number | null, unit: string, interp?: Interpretation) =>
      `${label}: ${value ?? '--'}${value !== null && unit ? ` ${unit}` : ''}${interp && value !== null ? ` (${interp.label})` : ''}`;
    return [
      `CLINICAL CALCULATIONS - ${patientInfo.name} (${patientInfo.mrn})`,
      `Calculated ${new Date().toLocaleString('en-US')} by Dr. Sarah Anderson`,
      line('CrCl (Cockcroft-Gault)', results.crcl, 'mL/min', interpretations.crcl),
      line('BMI', results.bmi, 'kg/m2', interpretations.bmi),
      line('BSA (Mosteller)', results.bsa, 'm2'),
      line('MAP', results.map, 'mmHg', interpretations.map),
      line('Anion Gap (albumin-corrected)', results.anionGap, 'mEq/L', interpretations.anionGap),
      line('Corrected Calcium', results.calcium, 'mg/dL', interpretations.calcium),
      line('CHA2DS2-VASc', results.chads, `pts, ~${results.chads !== null ? cha2ds2VascStrokeRisk(results.chads) : '--'}%/yr stroke risk`, interpretations.chads),
    ].join('\n');
  };

  const copyToNote = async () => {
    try {
      await navigator.clipboard.writeText(noteText());
    } catch {
      // Clipboard can be unavailable on insecure origins; the preview below still shows the text.
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const riskFactorLabels: { key: keyof typeof defaultRiskFactors; label: string; points: number }[] = [
    { key: 'chf', label: 'Congestive heart failure', points: 1 },
    { key: 'hypertension', label: 'Hypertension', points: 1 },
    { key: 'diabetes', label: 'Diabetes mellitus', points: 1 },
    { key: 'strokeOrTia', label: 'Prior stroke / TIA / thromboembolism', points: 2 },
    { key: 'vascularDisease', label: 'Vascular disease (MI, PAD, aortic plaque)', points: 1 },
  ];

  return (
    <div className="h-full flex flex-col p-2 space-y-2 overflow-hidden">
      <div className="ehr-subheader flex items-center justify-between px-2 py-1">
        <div className="flex items-center space-x-2">
          <Calculator className="w-4 h-4" />
          <span className="font-semibold text-[12px]">Clinical Calculators</span>
          <span className="text-[10px] text-gray-600">
            {patientInfo.name} ({patientInfo.mrn}) - Room {patientInfo.room} - pre-filled with demo values
          </span>
        </div>
        <div className="flex items-center space-x-2">
          {flagged > 0 && (
            <span className="ehr-alert-warning text-[10px] px-2 py-0.5" data-testid="flagged-count">
              {flagged} result{flagged === 1 ? '' : 's'} need attention
            </span>
          )}
          <button
            className="ehr-button flex items-center"
            onClick={() => { setInputs(defaultInputs); setRiskFactors(defaultRiskFactors); }}
          >
            <RotateCcw className="w-3 h-3 mr-1" />Reset
          </button>
          <button className="ehr-button ehr-button-primary flex items-center" onClick={copyToNote}>
            {copied ? <Check className="w-3 h-3 mr-1" /> : <ClipboardCopy className="w-3 h-3 mr-1" />}
            {copied ? 'Copied!' : 'Copy to Note'}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-2">
          <Panel title="Renal Function (Cockcroft-Gault CrCl)" formula="CrCl = ((140 - age) x weight) / (72 x SCr) x 0.85 if female">
            <Field label="Age" unit="years" field="age" inputs={inputs} onChange={setField} />
            <label className="flex items-center space-x-2 text-[11px]">
              <span className="w-24 text-gray-700">Sex:</span>
              <select
                className="ehr-input text-[11px]"
                value={inputs.sex}
                onChange={(e) => setInputs(prev => ({ ...prev, sex: e.target.value as Sex }))}
                aria-label="Sex"
              >
                <option value="M">Male</option>
                <option value="F">Female</option>
              </select>
            </label>
            <Field label="Weight" unit="kg" field="weight" inputs={inputs} onChange={setField} />
            <Field label="Serum Cr" unit="mg/dL" field="creatinine" inputs={inputs} onChange={setField} />
            <ResultBox label="CrCl" value={results.crcl} unit="mL/min" interpretation={interpretations.crcl} testId="result-crcl" />
          </Panel>

          <Panel title="Body Size (BMI / BSA)" formula="BMI = kg / m^2   |   BSA (Mosteller) = sqrt(cm x kg / 3600)">
            <Field label="Weight" unit="kg" field="weight" inputs={inputs} onChange={setField} />
            <Field label="Height" unit="cm" field="height" inputs={inputs} onChange={setField} />
            <ResultBox label="BMI" value={results.bmi} unit="kg/m2" interpretation={interpretBmiOrUndefined(results.bmi)} testId="result-bmi" />
            <ResultBox label="BSA" value={results.bsa} unit="m2" interpretation={results.bsa !== null ? { label: 'For chemotherapy / weight-based dosing', severity: 'normal' } : undefined} testId="result-bsa" />
          </Panel>

          <Panel title="Hemodynamics (MAP)" formula="MAP = (SBP + 2 x DBP) / 3">
            <Field label="Systolic BP" unit="mmHg" field="systolic" inputs={inputs} onChange={setField} />
            <Field label="Diastolic BP" unit="mmHg" field="diastolic" inputs={inputs} onChange={setField} />
            <ResultBox label="MAP" value={results.map} unit="mmHg" interpretation={interpretations.map} testId="result-map" />
          </Panel>

          <Panel title="Acid-Base (Anion Gap)" formula="AG = Na - (Cl + HCO3), corrected: + 2.5 x (4 - albumin)">
            <Field label="Sodium" unit="mEq/L" field="sodium" inputs={inputs} onChange={setField} />
            <Field label="Chloride" unit="mEq/L" field="chloride" inputs={inputs} onChange={setField} />
            <Field label="Bicarbonate" unit="mEq/L" field="bicarbonate" inputs={inputs} onChange={setField} />
            <Field label="Albumin" unit="g/dL" field="albumin" inputs={inputs} onChange={setField} />
            <ResultBox label="Anion Gap" value={results.anionGap} unit="mEq/L" interpretation={interpretations.anionGap} testId="result-anion-gap" />
          </Panel>

          <Panel title="Corrected Calcium" formula="Corrected Ca = Ca + 0.8 x (4 - albumin)">
            <Field label="Calcium" unit="mg/dL" field="calcium" inputs={inputs} onChange={setField} />
            <Field label="Albumin" unit="g/dL" field="albumin" inputs={inputs} onChange={setField} />
            <ResultBox label="Corrected Ca" value={results.calcium} unit="mg/dL" interpretation={interpretations.calcium} testId="result-calcium" />
          </Panel>

          <Panel title="Stroke Risk in AFib (CHA2DS2-VASc)" formula="Age 65-74 +1, >=75 +2, female +1; annual stroke rate per Lip et al. 2010">
            <div className="text-[10px] text-gray-600">Age {Number.isFinite(num('age')) ? num('age') : '--'}, {inputs.sex === 'F' ? 'female' : 'male'} (from renal panel)</div>
            {riskFactorLabels.map(({ key, label, points }) => (
              <label key={key} className="flex items-center space-x-2 text-[11px] cursor-pointer">
                <input
                  type="checkbox"
                  className="ehr-checkbox"
                  checked={riskFactors[key]}
                  onChange={(e) => setRiskFactors(prev => ({ ...prev, [key]: e.target.checked }))}
                />
                <span className="flex-1">{label}</span>
                <span className="text-[10px] text-gray-500">+{points}</span>
              </label>
            ))}
            <ResultBox
              label="Score"
              value={results.chads}
              unit={results.chads !== null ? `pts (~${cha2ds2VascStrokeRisk(results.chads)}%/yr)` : ''}
              interpretation={interpretations.chads}
              testId="result-chads"
            />
          </Panel>
        </div>

        <fieldset className="ehr-fieldset bg-white mt-2">
          <legend className="font-semibold">Note Preview</legend>
          <pre className="text-[10px] font-mono whitespace-pre-wrap text-gray-800" data-testid="note-preview">{noteText()}</pre>
        </fieldset>
      </div>

      <div className="ehr-status-bar flex items-center justify-between">
        <span>Results update as you type. Decision support only - verify before ordering.</span>
        <span>6 calculators</span>
      </div>
    </div>
  );
}

function interpretBmiOrUndefined(value: number | null) {
  return value !== null ? interpretBmi(value) : undefined;
}
