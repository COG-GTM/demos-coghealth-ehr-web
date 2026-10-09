import {
  anionGap,
  bmi,
  bsaMosteller,
  cha2ds2Vasc,
  cha2ds2VascStrokeRisk,
  cockcroftGault,
  correctedCalcium,
  interpretAnionGap,
  interpretCha2ds2Vasc,
  interpretCrCl,
  interpretMap,
  meanArterialPressure,
} from '../src/utils/clinicalCalculators';

describe('clinical calculators', () => {
  test('Cockcroft-Gault applies the female correction factor', () => {
    expect(cockcroftGault(58, 82.5, 1.4, 'M')).toBe(67.1);
    expect(cockcroftGault(58, 82.5, 1.4, 'F')).toBe(57);
    expect(interpretCrCl(25).severity).toBe('critical');
  });

  test('Cockcroft-Gault rejects invalid input', () => {
    expect(cockcroftGault(58, 82.5, 0, 'M')).toBeNull();
    expect(cockcroftGault(150, 82.5, 1, 'M')).toBeNull();
  });

  test('BMI and Mosteller BSA', () => {
    expect(bmi(82.5, 178)).toBe(26);
    expect(bsaMosteller(82.5, 178)).toBe(2.02);
    expect(bmi(82.5, 0)).toBeNull();
  });

  test('mean arterial pressure', () => {
    expect(meanArterialPressure(120, 80)).toBe(93);
    expect(interpretMap(60).severity).toBe('critical');
    expect(meanArterialPressure(80, 120)).toBeNull();
  });

  test('anion gap with albumin correction', () => {
    expect(anionGap(140, 104, 24)).toBe(12);
    expect(anionGap(140, 104, 24, 2)).toBe(17);
    expect(interpretAnionGap(25).severity).toBe('critical');
  });

  test('albumin-corrected calcium', () => {
    expect(correctedCalcium(8.0, 2.5)).toBe(9.2);
  });

  test('CHA2DS2-VASc scoring and recommendation', () => {
    const score = cha2ds2Vasc({
      age: 76, sex: 'F', chf: true, hypertension: true, diabetes: false, strokeOrTia: false, vascularDisease: false,
    });
    expect(score).toBe(5);
    expect(cha2ds2VascStrokeRisk(score)).toBe(6.7);
    expect(interpretCha2ds2Vasc(1, 'F').severity).toBe('normal');
    expect(interpretCha2ds2Vasc(1, 'M').severity).toBe('abnormal');
    expect(cha2ds2VascStrokeRisk(42)).toBe(15.2);
  });
});
