import type { LabPanel } from '../types';

export const defaultLabPanels: LabPanel[] = [
  {
    id: 1,
    panelName: 'Basic Metabolic Panel (BMP)',
    patientName: 'Smith, John',
    patientMrn: 'MRN001234',
    collectedAt: '01/18/2024 08:30',
    resultedAt: '01/18/2024 10:15',
    status: 'final',
    results: [
      { id: 1, testName: 'Sodium', value: '138', unit: 'mEq/L', referenceRange: '136-145', status: 'normal', collectedAt: '01/18/2024 08:30', resultedAt: '01/18/2024 10:15', orderedBy: 'Dr. Anderson', performingLab: 'Main Lab' },
      { id: 2, testName: 'Potassium', value: '6.8', unit: 'mEq/L', referenceRange: '3.5-5.0', status: 'critical', collectedAt: '01/18/2024 08:30', resultedAt: '01/18/2024 10:15', orderedBy: 'Dr. Anderson', performingLab: 'Main Lab' },
      { id: 3, testName: 'Chloride', value: '102', unit: 'mEq/L', referenceRange: '98-106', status: 'normal', collectedAt: '01/18/2024 08:30', resultedAt: '01/18/2024 10:15', orderedBy: 'Dr. Anderson', performingLab: 'Main Lab' },
      { id: 4, testName: 'CO2', value: '18', unit: 'mEq/L', referenceRange: '23-29', status: 'abnormal', collectedAt: '01/18/2024 08:30', resultedAt: '01/18/2024 10:15', orderedBy: 'Dr. Anderson', performingLab: 'Main Lab' },
      { id: 5, testName: 'BUN', value: '42', unit: 'mg/dL', referenceRange: '7-20', status: 'abnormal', collectedAt: '01/18/2024 08:30', resultedAt: '01/18/2024 10:15', orderedBy: 'Dr. Anderson', performingLab: 'Main Lab' },
      { id: 6, testName: 'Creatinine', value: '3.2', unit: 'mg/dL', referenceRange: '0.7-1.3', status: 'critical', collectedAt: '01/18/2024 08:30', resultedAt: '01/18/2024 10:15', orderedBy: 'Dr. Anderson', performingLab: 'Main Lab' },
      { id: 7, testName: 'Glucose', value: '156', unit: 'mg/dL', referenceRange: '70-100', status: 'abnormal', collectedAt: '01/18/2024 08:30', resultedAt: '01/18/2024 10:15', orderedBy: 'Dr. Anderson', performingLab: 'Main Lab' },
      { id: 8, testName: 'Calcium', value: '9.1', unit: 'mg/dL', referenceRange: '8.5-10.5', status: 'normal', collectedAt: '01/18/2024 08:30', resultedAt: '01/18/2024 10:15', orderedBy: 'Dr. Anderson', performingLab: 'Main Lab' },
    ]
  },
  {
    id: 2,
    panelName: 'Complete Blood Count (CBC)',
    patientName: 'Smith, John',
    patientMrn: 'MRN001234',
    collectedAt: '01/18/2024 08:30',
    resultedAt: '01/18/2024 09:45',
    status: 'final',
    results: [
      { id: 9, testName: 'WBC', value: '12.4', unit: 'K/uL', referenceRange: '4.5-11.0', status: 'abnormal', collectedAt: '01/18/2024 08:30', resultedAt: '01/18/2024 09:45', orderedBy: 'Dr. Anderson', performingLab: 'Main Lab' },
      { id: 10, testName: 'RBC', value: '3.8', unit: 'M/uL', referenceRange: '4.5-5.5', status: 'abnormal', collectedAt: '01/18/2024 08:30', resultedAt: '01/18/2024 09:45', orderedBy: 'Dr. Anderson', performingLab: 'Main Lab' },
      { id: 11, testName: 'Hemoglobin', value: '10.2', unit: 'g/dL', referenceRange: '13.5-17.5', status: 'abnormal', collectedAt: '01/18/2024 08:30', resultedAt: '01/18/2024 09:45', orderedBy: 'Dr. Anderson', performingLab: 'Main Lab' },
      { id: 12, testName: 'Hematocrit', value: '31.5', unit: '%', referenceRange: '38.8-50.0', status: 'abnormal', collectedAt: '01/18/2024 08:30', resultedAt: '01/18/2024 09:45', orderedBy: 'Dr. Anderson', performingLab: 'Main Lab' },
      { id: 13, testName: 'Platelets', value: '245', unit: 'K/uL', referenceRange: '150-400', status: 'normal', collectedAt: '01/18/2024 08:30', resultedAt: '01/18/2024 09:45', orderedBy: 'Dr. Anderson', performingLab: 'Main Lab' },
    ]
  },
  {
    id: 3,
    panelName: 'Cardiac Enzymes',
    patientName: 'Martinez, Ana',
    patientMrn: 'MRN001241',
    collectedAt: '01/18/2024 06:00',
    resultedAt: '01/18/2024 07:30',
    status: 'final',
    results: [
      { id: 14, testName: 'Troponin I', value: '2.4', unit: 'ng/mL', referenceRange: '<0.04', status: 'critical', collectedAt: '01/18/2024 06:00', resultedAt: '01/18/2024 07:30', orderedBy: 'Dr. Anderson', performingLab: 'Main Lab' },
      { id: 15, testName: 'CK-MB', value: '28', unit: 'ng/mL', referenceRange: '0-5', status: 'critical', collectedAt: '01/18/2024 06:00', resultedAt: '01/18/2024 07:30', orderedBy: 'Dr. Anderson', performingLab: 'Main Lab' },
      { id: 16, testName: 'BNP', value: '890', unit: 'pg/mL', referenceRange: '<100', status: 'abnormal', collectedAt: '01/18/2024 06:00', resultedAt: '01/18/2024 07:30', orderedBy: 'Dr. Anderson', performingLab: 'Main Lab' },
    ]
  },
  {
    id: 4,
    panelName: 'Lipid Panel',
    patientName: 'Johnson, Sarah',
    patientMrn: 'MRN001235',
    collectedAt: '01/17/2024 07:00',
    resultedAt: '01/17/2024 14:00',
    status: 'final',
    results: [
      { id: 17, testName: 'Total Cholesterol', value: '242', unit: 'mg/dL', referenceRange: '<200', status: 'abnormal', collectedAt: '01/17/2024 07:00', resultedAt: '01/17/2024 14:00', orderedBy: 'Dr. Anderson', performingLab: 'Main Lab' },
      { id: 18, testName: 'LDL', value: '165', unit: 'mg/dL', referenceRange: '<100', status: 'abnormal', collectedAt: '01/17/2024 07:00', resultedAt: '01/17/2024 14:00', orderedBy: 'Dr. Anderson', performingLab: 'Main Lab' },
      { id: 19, testName: 'HDL', value: '38', unit: 'mg/dL', referenceRange: '>40', status: 'abnormal', collectedAt: '01/17/2024 07:00', resultedAt: '01/17/2024 14:00', orderedBy: 'Dr. Anderson', performingLab: 'Main Lab' },
      { id: 20, testName: 'Triglycerides', value: '195', unit: 'mg/dL', referenceRange: '<150', status: 'abnormal', collectedAt: '01/17/2024 07:00', resultedAt: '01/17/2024 14:00', orderedBy: 'Dr. Anderson', performingLab: 'Main Lab' },
    ]
  },
  {
    id: 5,
    panelName: 'Hemoglobin A1c',
    patientName: 'Johnson, Sarah',
    patientMrn: 'MRN001235',
    collectedAt: '01/17/2024 07:00',
    resultedAt: '01/17/2024 16:00',
    status: 'final',
    results: [
      { id: 21, testName: 'HbA1c', value: '9.2', unit: '%', referenceRange: '<5.7', status: 'abnormal', collectedAt: '01/17/2024 07:00', resultedAt: '01/17/2024 16:00', orderedBy: 'Dr. Anderson', performingLab: 'Main Lab' },
    ]
  },
  {
    id: 6,
    panelName: 'Urinalysis',
    patientName: 'Williams, Michael',
    patientMrn: 'MRN001236',
    collectedAt: '01/16/2024 10:00',
    resultedAt: '01/16/2024 11:30',
    status: 'final',
    results: [
      { id: 22, testName: 'Color', value: 'Yellow', unit: '', referenceRange: 'Yellow', status: 'normal', collectedAt: '01/16/2024 10:00', resultedAt: '01/16/2024 11:30', orderedBy: 'Dr. Anderson', performingLab: 'Main Lab' },
      { id: 23, testName: 'Clarity', value: 'Clear', unit: '', referenceRange: 'Clear', status: 'normal', collectedAt: '01/16/2024 10:00', resultedAt: '01/16/2024 11:30', orderedBy: 'Dr. Anderson', performingLab: 'Main Lab' },
      { id: 24, testName: 'pH', value: '6.0', unit: '', referenceRange: '5.0-8.0', status: 'normal', collectedAt: '01/16/2024 10:00', resultedAt: '01/16/2024 11:30', orderedBy: 'Dr. Anderson', performingLab: 'Main Lab' },
      { id: 25, testName: 'Protein', value: 'Negative', unit: '', referenceRange: 'Negative', status: 'normal', collectedAt: '01/16/2024 10:00', resultedAt: '01/16/2024 11:30', orderedBy: 'Dr. Anderson', performingLab: 'Main Lab' },
      { id: 26, testName: 'Glucose', value: 'Negative', unit: '', referenceRange: 'Negative', status: 'normal', collectedAt: '01/16/2024 10:00', resultedAt: '01/16/2024 11:30', orderedBy: 'Dr. Anderson', performingLab: 'Main Lab' },
    ]
  },
];
