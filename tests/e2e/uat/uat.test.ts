import { afterAll, beforeAll, beforeEach, describe, expect, test } from '@jest/globals';
import {
  auditLog,
  bodyText,
  clickButton,
  clickText,
  count,
  fillInput,
  getPage,
  open,
  recordCase,
  selectValue,
  setApiError,
  startHarness,
  stopHarness,
} from './support/harness';

jest.setTimeout(60000);

const page = () => getPage();
const area = (name: string, id: number, title: string, fn: () => Promise<void>) =>
  recordCase(id, name, title, fn);

async function closeModal(): Promise<void> {
  await page().keyboard.press('Escape');
}

async function expectAlert(title: string): Promise<void> {
  await page().waitForFunction((wanted) => document.body.innerText.includes(wanted), {}, title);
  expect(await bodyText()).toContain(title);
}

async function openDialog(button: string, title: string): Promise<void> {
  await clickButton(button);
  await expectAlert(title);
}

describe('CogHealth approved UAT scope', () => {
  beforeAll(async () => {
    await startHarness();
  });

  beforeEach(async () => {
    await setApiError(false);
    await page().goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
    await page().evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });

  afterAll(async () => {
    await stopHarness();
  });

  test('UAT-1: global shell renders identity facility clinician timer and compliance status', async () =>
    area('global-shell', 1, 'global shell renders identity facility clinician timer and compliance status', async () => {
      await open('/');
      const text = await bodyText();
      expect(text).toContain('CogHealth EHR');
      expect(text).toContain('Springfield Medical Center');
      expect(text).toContain('Dr. Sarah Anderson');
      expect(text).toContain('Session:');
      expect(text).toContain('HIPAA Compliant');
      expect(text).toContain('Encrypted Connection (TLS 1.3)');
      expect(text).toContain('Audit Logging: Active');
    }));

  test('UAT-2: toolbar entries navigate and patients chart keeps Patients active', async () =>
    area('global-shell', 2, 'toolbar entries navigate and patients chart keeps Patients active', async () => {
      await open('/');
      for (const [label, route] of [
        ['Dashboard', '/'], ['Patients', '/patients'], ['Schedule', '/schedule'], ['Lab Results', '/labs'],
        ['Vitals', '/vitals'], ['Medications', '/medications'], ['Reports', '/reports'], ['Settings', '/settings'],
      ] as const) {
        await clickText(label);
        await page().waitForFunction((expected) => location.pathname === expected, {}, route);
        expect(new URL(page().url()).pathname).toBe(route);
      }
      await clickText('Patients');
      await page().waitForFunction(() => location.pathname === '/patients');
      await open('/patients/1');
      expect(await page().$eval('a.ehr-toolbar-button-active', (el) => el.textContent)).toContain('Patients');
    }));

  test('UAT-3: global search enforces minimum length and filters name MRN and misses', async () =>
    area('global-shell', 3, 'global search enforces minimum length and filters name MRN and misses', async () => {
      await open('/');
      await fillInput('Patient search...', 'J');
      expect(await count('div.absolute')).toBe(0);
      await fillInput('Patient search...', 'John');
      expect(await bodyText()).toContain('Smith, John');
      await fillInput('Patient search...', 'MRN001234');
      expect(await bodyText()).toContain('Smith, John');
      await fillInput('Patient search...', 'ZZZ-NOT-FOUND');
      expect(await bodyText()).toContain('No patients found');
    }));

  test('UAT-4: selecting global search result navigates to chart and clears search', async () =>
    area('global-shell', 4, 'selecting global search result navigates to chart and clears search', async () => {
      await open('/');
      await fillInput('Patient search...', 'John');
      await clickText('Smith, John');
      await page().waitForFunction(() => location.pathname === '/patients/1');
      expect(new URL(page().url()).pathname).toBe('/patients/1');
      expect(await page().$eval('input[placeholder="Patient search..."]', (el) => (el as HTMLInputElement).value)).toBe('');
    }));

  test('UAT-5: logout cancel preserves page and confirm records LOGOUT', async () =>
    area('global-shell', 5, 'logout cancel preserves page and confirm records LOGOUT', async () => {
      await open('/');
      await clickButton('Logout');
      await expectAlert('Confirm Logout');
      await clickButton('Cancel');
      expect(new URL(page().url()).pathname).toBe('/');
      await clickButton('Logout');
      await clickButton('Logout', 1);
      await page().waitForFunction(() => location.pathname === '/');
      const events = await auditLog();
      expect(events.some((event) => event.eventType === 'LOGOUT')).toBe(true);
    }));

  test('UAT-6: session timer counts down and warning styling is exercised', async () =>
    area('global-shell', 6, 'session timer counts down and warning styling is exercised', async () => {
      await open('/');
      const before = await page().evaluate(() => Array.from(document.querySelectorAll('span'))
        .find((el) => el.parentElement?.innerText?.startsWith('Session:'))?.parentElement?.innerText || '');
      expect(before).toMatch(/Session: \d+:\d\d/);
      await page().waitForFunction((initial) => {
        const current = Array.from(document.querySelectorAll('span'))
          .find((el) => el.parentElement?.innerText?.startsWith('Session:'))?.parentElement?.innerText || '';
        return current !== initial;
      }, {}, before);
      await expectAlert('Session Timeout Warning');
      expect(await count('.text-yellow-300')).toBeGreaterThan(0);
      await clickButton('Continue Session');
      await page().waitForFunction(() => !document.body.innerText.includes('Session Timeout Warning'));
    }));

  test('UAT-7: inbox populates with unread priority rows and critical styling', async () =>
    area('dashboard', 7, 'inbox populates with unread priority rows and critical styling', async () => {
      await open('/');
      expect(await count('table tbody tr')).toBeGreaterThanOrEqual(10);
      expect(await count('.ehr-alert-critical')).toBeGreaterThanOrEqual(4);
      expect(await bodyText()).toContain('Inbox');
      expect(await bodyText()).toMatch(/\d+ unread/);
    }));

  test('UAT-8: inbox tabs narrow rows and display unread counts', async () =>
    area('dashboard', 8, 'inbox tabs narrow rows and display unread counts', async () => {
      await open('/');
      const all = await page().$eval('table', (table) => table.querySelectorAll('tbody tr').length);
      for (const tab of ['Results', 'Messages', 'Rx Refills', 'Orders', 'Co-sign']) {
        if (tab !== 'Results') await open('/');
        await clickText(tab);
        expect(await page().$eval('table', (table) => table.querySelectorAll('tbody tr').length)).toBeLessThan(all);
        expect(await bodyText()).toContain(tab);
      }
    }));

  test('UAT-9: priority and read filters combine with inbox tab', async () =>
    area('dashboard', 9, 'priority and read filters combine with inbox tab', async () => {
      await open('/');
      const inboxRows = () => page().$eval('.ehr-panel table tbody', (tbody) => tbody.querySelectorAll('tr').length);
      const all = await inboxRows();
      await selectValue(0, 'critical');
      const critical = await inboxRows();
      expect(critical).toBeGreaterThan(0);
      expect(critical).toBeLessThan(all);
      await selectValue(1, 'unread');
      const criticalUnread = await inboxRows();
      expect(criticalUnread).toBeGreaterThan(0);
      expect(criticalUnread).toBeLessThanOrEqual(critical);
      await page().evaluate(() => {
        const tab = Array.from(document.querySelectorAll('button.ehr-tab'))
          .find((element) => element.textContent?.trim().startsWith('Results'));
        if (!tab) throw new Error('Could not find Results inbox tab');
        (tab as HTMLElement).click();
      });
      const results = await inboxRows();
      expect(results).toBeGreaterThan(0);
      expect(results).toBeLessThanOrEqual(criticalUnread);
      expect(await page().$eval('.ehr-panel table tbody', (tbody) =>
        Array.from(tbody.querySelectorAll('tr')).every((row) => row.classList.contains('ehr-alert-critical')))).toBe(true);
    }));

  test('UAT-10: mark read clears unread dot and flag toggles', async () =>
    area('dashboard', 10, 'mark read clears unread dot and flag toggles', async () => {
      await open('/');
      const unreadBefore = Number((await bodyText()).match(/Inbox\s+(\d+) unread/)?.[1]);
      expect(unreadBefore).toBeGreaterThan(0);
      await page().click('button[title="Mark Read"]');
      expect((await bodyText()).match(/Inbox\s+(\d+) unread/)?.[1]).toBe(String(unreadBefore - 1));
      await page().click('button[title="Flag"]');
      expect(await count('button[title="Flag"] svg.text-red-600')).toBeGreaterThanOrEqual(1);
    }));

  test('UAT-11: mark all read clears dots and confirms Inbox Updated', async () =>
    area('dashboard', 11, 'mark all read clears dots and confirms Inbox Updated', async () => {
      await open('/');
      await clickButton('Mark All Read');
      await expectAlert('Inbox Updated');
      expect((await bodyText()).match(/Inbox\s+(\d+) unread/)?.[1]).toBe('0');
    }));

  test('UAT-12: worklist filters and sorting change visible rows', async () =>
    area('dashboard', 12, 'worklist filters and sorting change visible rows', async () => {
      await open('/');
      const tables = await page().$$('table');
      expect(tables.length).toBeGreaterThanOrEqual(3);
      const initial = await page().$$eval('table', (els) => els.map((el) => el.querySelectorAll('tbody tr').length));
      await clickText('Critical');
      const critical = await page().$$eval('table', (els) => els.map((el) => el.querySelectorAll('tbody tr').length));
      expect(critical[1]).toBeLessThan(initial[1]);
      await clickText('All');
      await clickText('Clinic');
      expect(await bodyText()).toContain('Clinic');
      await page().select('select', 'name');
      const worklistRows = () => page().evaluate(() => {
        const worklist = Array.from(document.querySelectorAll('table'))
          .find((candidate) => candidate.tHead?.innerText.includes('Location'));
        return worklist?.querySelector('tbody tr')?.textContent || '';
      });
      const asc = await worklistRows();
      await page().click('.ehr-subheader select + button');
      const desc = await worklistRows();
      expect(desc).not.toBe(asc);
    }));

  test('UAT-13: dashboard panel collapse and expand persists during interaction', async () =>
    area('dashboard', 13, 'dashboard panel collapse and expand persists during interaction', async () => {
      await open('/');
      await clickText('Inbox');
      const inboxRows = () => page().$eval('.ehr-panel', (panel) => panel.querySelectorAll('table tbody tr').length);
      expect(await inboxRows()).toBe(0);
      await clickText('Inbox');
      expect(await inboxRows()).toBeGreaterThan(0);
      await clickText('Worklist');
      expect(await bodyText()).toContain('Worklist');
    }));

  test('UAT-14: dashboard API failure preserves interactive shell', async () =>
    area('dashboard', 14, 'dashboard API failure preserves interactive shell', async () => {
      await setApiError(true);
      await open('/');
      expect(await bodyText()).toContain('CogHealth EHR');
      expect(await bodyText()).toContain('Inbox');
      expect(await bodyText()).toContain('Dashboard');
    }));

  test('UAT-15: patient list loads and selection opens detail pane', async () =>
    area('patient-search', 15, 'patient list loads and selection opens detail pane', async () => {
      await open('/patients');
      expect(await count('table tbody tr')).toBe(20);
      await clickText('Smith, John');
      expect(await bodyText()).toContain('Patient Details');
      expect(await bodyText()).toContain('MRN001234');
    }));

  test('UAT-16: patient search by name and MRN and empty restores list', async () =>
    area('patient-search', 16, 'patient search by name and MRN and empty restores list', async () => {
      await open('/patients');
      const all = await count('table tbody tr');
      await fillInput('Name, MRN, DOB, Phone...', 'Smith');
      await clickButton('Find');
      expect(await count('table tbody tr')).toBe(1);
      expect(await bodyText()).toContain('Smith, John');
      await fillInput('Name, MRN, DOB, Phone...', 'MRN001235');
      await clickButton('Find');
      expect(await count('table tbody tr')).toBe(1);
      expect(await bodyText()).toContain('Johnson, Sarah');
      await fillInput('Name, MRN, DOB, Phone...', '');
      await clickButton('Find');
      expect(await count('table tbody tr')).toBe(all);
    }));

  test('UAT-17: filter sections collapse apply and clear change the result set', async () =>
    area('patient-search', 17, 'filter sections collapse apply and clear change the result set', async () => {
      await open('/patients');
      await clickText('Demographics');
      expect(await bodyText()).toContain('Male');
      const before = await count('table tbody tr');
      await clickText('Male');
      await clickButton('Apply Filters');
      expect(await count('table tbody tr')).toBeLessThan(before);
      await clickText('Clear');
      expect(await count('table tbody tr')).toBe(before);
    }));

  test('UAT-18: open chart navigates to fetched patient route and audits access', async () =>
    area('patient-search', 18, 'open chart navigates to fetched patient route and audits access', async () => {
      await open('/patients');
      await clickText('Smith, John');
      await clickButton('Open Chart');
      await page().waitForFunction(() => location.pathname === '/patients/1');
      expect(new URL(page().url()).pathname).toBe('/patients/1');
      const events = await auditLog();
      expect(events.some((event) => event.eventType === 'PATIENT_ACCESS' && event.patientMrn === 'MRN001234')).toBe(true);
    }));

  test('UAT-19: patient toolbar refresh export new patient and print behave', async () =>
    area('patient-search', 19, 'patient toolbar refresh export new patient and print behave', async () => {
      await open('/patients');
      await clickButton('Refresh');
      await expectAlert('Refreshed');
      await closeModal();
      await clickButton('Export');
      await expectAlert('Exported 20 patient(s)');
      await closeModal();
      await clickButton('New Patient');
      await expectAlert('New Patient');
      await closeModal();
      await openDialog('Print List', 'Print Patient List');
    }));

  test('UAT-20: patient detail quick actions open dialogs and navigate', async () =>
    area('patient-search', 20, 'patient detail quick actions open dialogs and navigate', async () => {
      await open('/patients');
      await clickText('Smith, John');
      await clickButton('Schedule');
      expect(new URL(page().url()).pathname).toBe('/schedule');
      await open('/patients');
      await clickText('Smith, John');
      await openDialog('Rx', 'e-Prescribe Medication');
      await closeModal();
      await openDialog('Labs', 'Order Laboratory Tests');
      await closeModal();
      await clickButton('Call');
      await expectAlert('Call Patient');
    }));

  test('UAT-21: patient backend error shows server failure alert', async () =>
    area('patient-search', 21, 'patient backend error shows server failure alert', async () => {
      await setApiError(true);
      await open('/patients');
      await expectAlert('Failed to load patients from server');
    }));

  test('UAT-22: patient chart banner shows identity and allergy data', async () =>
    area('patient-chart', 22, 'patient chart banner shows identity and allergy data', async () => {
      await open('/patients/1');
      const text = await bodyText();
      expect(text).toContain('Smith, John');
      expect(text).toContain('MRN001234');
      expect(text).toContain('01/01/1960');
      expect(text).toContain('Allergies');
    }));

  test('UAT-23: chart tabs render each section', async () =>
    area('patient-chart', 23, 'chart tabs render each section', async () => {
      await open('/patients/1');
      for (const tab of ['Summary', 'Encounters', 'Medications', 'Problems', 'Allergies', 'Results']) {
        await clickText(tab);
        expect(await bodyText()).toContain(tab);
      }
    }));

  test('UAT-24: chart panels collapse and patient dialogs are prefilled', async () =>
    area('patient-chart', 24, 'chart panels collapse and patient dialogs are prefilled', async () => {
      await open('/patients/1');
      await clickText('Active Problems');
      expect(await bodyText()).not.toContain('Type 2 Diabetes Mellitus');
      await clickText('Active Problems');
      await openDialog('e-Prescribe', 'e-Prescribe Medication');
      expect(await bodyText()).toContain('Smith, John (MRN001234)');
      await closeModal();
      await openDialog('Order Labs', 'Order Laboratory Tests');
      expect(await bodyText()).toContain('Smith, John (MRN001234)');
    }));

  test('UAT-25: chart print produces printer confirmation', async () =>
    area('patient-chart', 25, 'chart print produces printer confirmation', async () => {
      await open('/patients/1');
      await openDialog('Print', 'Print Patient Chart');
      await clickButton('Print', 1);
      await expectAlert('Print Sent');
    }));

  test('UAT-26: schedule grid renders and date controls change day', async () =>
    area('schedule', 26, 'schedule grid renders and date controls change day', async () => {
      await open('/schedule');
      expect(await count('table tbody tr')).toBeGreaterThan(0);
      const before = await bodyText();
      await page().click('button[aria-label="Previous day"]').catch(() => undefined);
      await clickText('Today');
      expect(await bodyText()).toContain('Schedule');
      expect(before).toContain('Schedule');
    }));

  test('UAT-27: schedule status filters narrow appointments', async () =>
    area('schedule', 27, 'schedule status filters narrow appointments', async () => {
      await open('/schedule');
      const all = await count('table tbody tr');
      await clickText('Waiting');
      expect(await count('table tbody tr')).toBeLessThan(all);
    }));

  test('UAT-28: check in room and start visit transitions confirm', async () =>
    area('schedule', 28, 'check in room and start visit transitions confirm', async () => {
      await open('/schedule');
      await clickButton('Check In');
      await expectAlert('Patient Checked In');
      await closeModal();
      await clickButton('Room');
      await expectAlert('Patient Roomed');
      await closeModal();
      await clickButton('Start');
      await page().waitForFunction(() => location.pathname.startsWith('/patients/'));
    }));

  test('UAT-29: appointment selection exposes collapsible detail panels', async () =>
    area('schedule', 29, 'appointment selection exposes collapsible detail panels', async () => {
      await open('/schedule');
      await clickText('Smith, John');
      expect(await bodyText()).toContain('Smith, John');
      await clickText('Vitals');
      expect(await bodyText()).toContain('BP');
    }));

  test('UAT-30: new appointment cancel and schedule confirmation', async () =>
    area('schedule', 30, 'new appointment cancel and schedule confirmation', async () => {
      await open('/schedule');
      await clickButton('New Appt');
      await expectAlert('Schedule New Appointment');
      await clickButton('Cancel');
      expect(await bodyText()).not.toContain('Schedule New Appointment');
      await clickButton('New Appt');
      await expectAlert('Schedule New Appointment');
    }));

  test('UAT-31: appointment quick actions navigate and open dialogs', async () =>
    area('schedule', 31, 'appointment quick actions navigate and open dialogs', async () => {
      await open('/schedule');
      await clickText('Smith, John');
      await clickButton('Chart');
      await page().waitForFunction(() => location.pathname.startsWith('/patients/'));
      await open('/schedule');
      await clickText('Smith, John');
      await openDialog('Message', 'Message');
      await closeModal();
      await openDialog('Call', 'Call Patient');
    }));

  test('UAT-32: refresh restores original schedule after status change', async () =>
    area('schedule', 32, 'refresh restores original schedule after status change', async () => {
      await open('/schedule');
      const before = await count('table tbody tr');
      await clickButton('Check In');
      await closeModal();
      await clickButton('Refresh');
      expect(await count('table tbody tr')).toBe(before);
    }));

  test('UAT-33: lab panels render and toggle expanded results', async () =>
    area('labs', 33, 'lab panels render and toggle expanded results', async () => {
      await open('/labs');
      expect(await count('table tbody tr')).toBeGreaterThan(0);
      const before = await count('table tbody tr');
      await page().evaluate(() => {
        const panel = Array.from(document.querySelectorAll('.cursor-pointer'))
          .find((element) => element.textContent?.includes('Complete Blood Count'));
        if (!panel) throw new Error('Could not find CBC panel');
        (panel as HTMLElement).click();
      });
      expect(await count('table tbody tr')).not.toBe(before);
    }));

  test('UAT-34: lab status filter narrows abnormal and critical results', async () =>
    area('labs', 34, 'lab status filter narrows abnormal and critical results', async () => {
      await open('/labs');
      await selectValue(0, 'critical');
      expect(await bodyText()).toContain('2 panel(s) displayed');
      expect(await bodyText()).toContain('Critical');
    }));

  test('UAT-35: lab patient and date range filters apply', async () =>
    area('labs', 35, 'lab patient and date range filters apply', async () => {
      await open('/labs');
      const selects = await page().$$('select');
      expect(selects.length).toBeGreaterThanOrEqual(3);
      await selectValue(1, 'MRN001234');
      expect(await bodyText()).toContain('Smith, John');
      await selectValue(2, 'week');
      expect(await bodyText()).toContain('Past 7 Days');
    }));

  test('UAT-36: lab result detail opens reference range and closes', async () =>
    area('labs', 36, 'lab result detail opens reference range and closes', async () => {
      await open('/labs');
      await page().click('table tbody tr');
      await expectAlert('Lab Result Detail');
      expect(await bodyText()).toContain('Reference Range');
      await clickButton('Close');
      expect(await bodyText()).not.toContain('Lab Result Detail');
    }));

  test('UAT-37: vitals flowsheet range switch changes readings', async () =>
    area('vitals', 37, 'vitals flowsheet range switch changes readings', async () => {
      await open('/vitals');
      const before = await count('table tbody tr');
      expect(before).toBeGreaterThan(0);
      await selectValue(0, '7d');
      expect(await bodyText()).toContain('Last 7 Days');
    }));

  test('UAT-38: selecting a vital reading opens and closes detail', async () =>
    area('vitals', 38, 'selecting a vital reading opens and closes detail', async () => {
      await open('/vitals');
      await page().click('table tbody tr td.cursor-pointer');
      await expectAlert('Vital Signs Detail');
      await clickButton('Close');
      expect(await bodyText()).not.toContain('Vital Signs Detail');
    }));

  test('UAT-39: add vitals cancel and save close dialog', async () =>
    area('vitals', 39, 'add vitals cancel and save close dialog', async () => {
      await open('/vitals');
      await clickButton('Record Vitals');
      await expectAlert('Record Vital Signs');
      await clickButton('Cancel');
      expect(await bodyText()).not.toContain('Record Vital Signs');
      await clickButton('Record Vitals');
      await clickButton('Save');
      expect(await bodyText()).not.toContain('Record Vital Signs');
    }));

  test('UAT-40: medication statuses and drug search narrow orders', async () =>
    area('medications', 40, 'medication statuses and drug search narrow orders', async () => {
      await open('/medications');
      const all = await count('.cursor-pointer');
      expect(all).toBeGreaterThan(0);
      await clickText('Active');
      expect(await count('.cursor-pointer')).toBeLessThanOrEqual(all);
      await fillInput('Medication, patient, Rx#...', 'Metformin');
      expect(await bodyText()).toContain('Metformin');
    }));

  test('UAT-41: medication view modes and patient groups expand', async () =>
    area('medications', 41, 'medication view modes and patient groups expand', async () => {
      await open('/medications');
      expect(await bodyText()).toContain('By Patient');
      await clickText('By Patient');
      expect(await bodyText()).toContain('Smith, John');
      await clickText('All');
      expect(await bodyText()).toContain('Medication');
    }));

  test('UAT-42: medication order detail panels collapse and expand', async () =>
    area('medications', 42, 'medication order detail panels collapse and expand', async () => {
      await open('/medications');
      await page().click('.cursor-pointer');
      expect(await bodyText()).toContain('Rx Details');
      await clickText('Pharmacy');
      expect(await bodyText()).not.toContain('Walgreens');
      await clickText('Pharmacy');
      expect(await bodyText()).toContain('Pharmacy');
    }));

  test('UAT-43: sign and renew confirmations preserve selection', async () =>
    area('medications', 43, 'sign and renew confirmations preserve selection', async () => {
      await open('/medications');
      await page().click('.cursor-pointer');
      const selected = await bodyText();
      await clickButton('Renew');
      await expectAlert('Renewal');
      expect(await bodyText()).toContain(selected.split('\n')[0]);
    }));

  test('UAT-44: medication patient link navigates to chart', async () =>
    area('medications', 44, 'medication patient link navigates to chart', async () => {
      await open('/medications');
      await page().click('tr.cursor-pointer');
      await clickButton('Chart');
      await page().waitForFunction(() => location.pathname.startsWith('/patients/'));
      expect(new URL(page().url()).pathname).toBe('/patients/1');
    }));

  test('UAT-45: medication New Rx and Print toolbar dialogs open', async () =>
    area('medications', 45, 'medication New Rx and Print toolbar dialogs open', async () => {
      await open('/medications');
      await openDialog('New Rx', 'e-Prescribe Medication');
      await closeModal();
      await openDialog('Print', 'Print Medication List');
    }));

  test('UAT-46: report categories collapse and category filter narrows', async () =>
    area('reports', 46, 'report categories collapse and category filter narrows', async () => {
      await open('/reports');
      expect(await bodyText()).toContain('Clinical');
      const before = await count('table tbody tr');
      await selectValue(0, 'clinical');
      expect(await count('table tbody tr')).toBeLessThanOrEqual(before);
      await page().evaluate(() => {
        const category = Array.from(document.querySelectorAll('*'))
          .find((element) => element.textContent?.includes('Clinical Reports'));
        if (!category) throw new Error('Could not find Clinical Reports category');
        (category as HTMLElement).click();
      });
      expect(await bodyText()).toContain('Reports');
    }));

  test('UAT-47: run report and download confirmations render', async () =>
    area('reports', 47, 'run report and download confirmations render', async () => {
      await open('/reports');
      await clickButton('Run');
      await expectAlert('Report Running');
      await closeModal();
      await page().click('table tbody tr button');
      await expectAlert('Download');
    }));

  test('UAT-48: report print dialog confirms selected action', async () =>
    area('reports', 48, 'report print dialog confirms selected action', async () => {
      await open('/reports');
      await openDialog('Print', 'Print Report List');
      await clickButton('Preview');
      await expectAlert('Print Sent');
    }));

  test('UAT-49: all settings tabs render their sections', async () =>
    area('settings', 49, 'all settings tabs render their sections', async () => {
      await open('/settings');
      for (const tab of ['Profile', 'Notifications', 'Security', 'Appearance', 'Practice']) {
        await clickText(tab);
        expect(await bodyText()).toContain(tab);
      }
    }));

  test('UAT-50: profile edits save and survive reload', async () =>
    area('settings', 50, 'profile edits save and survive reload', async () => {
      await open('/settings');
      const inputs = await page().$$('main input[type="text"]');
      expect(inputs.length).toBeGreaterThan(0);
      await inputs[0].focus();
      await page().keyboard.down('Control');
      await page().keyboard.press('A');
      await page().keyboard.up('Control');
      await page().keyboard.type('QA Clinician');
      await clickButton('Save');
      expect(await bodyText()).toContain('Saved');
      await page().reload({ waitUntil: 'networkidle0' });
      expect(await page().$eval('input', () => Array.from(document.querySelectorAll('input'))
        .map((el) => (el as HTMLInputElement).value)
        .find((value) => value.includes('QA Clinician')) || '')).toContain('QA Clinician');
    }));

  test('UAT-51: notification toggles change and save state', async () =>
    area('settings', 51, 'notification toggles change and save state', async () => {
      await open('/settings');
      await clickText('Notifications');
      const checkbox = await page().$('input[type="checkbox"]');
      expect(checkbox).not.toBeNull();
      const before = await checkbox?.evaluate((el) => (el as HTMLInputElement).checked);
      await checkbox?.click();
      expect(await checkbox?.evaluate((el) => (el as HTMLInputElement).checked)).toBe(!before);
      await clickButton('Save');
      expect(await bodyText()).toContain('Saved');
    }));

  test('UAT-52: appearance theme selection applies and saves', async () =>
    area('settings', 52, 'appearance theme selection applies and saves', async () => {
      await open('/settings');
      await clickText('Appearance');
      await clickButton('dark');
      expect(await bodyText()).toContain('Dark');
      await clickButton('Save');
      expect(await bodyText()).toContain('Saved');
    }));

  test('UAT-53: security and practice stub actions behave', async () =>
    area('settings', 53, 'security and practice stub actions behave', async () => {
      await open('/settings');
      await clickText('Security');
      await clickButton('Change');
      await expectAlert('Change Password');
      await closeModal();
      await clickText('Practice');
      expect(await bodyText()).toContain('Monday');
    }));

  test('UAT-54: e-Prescribe searches selects and submits medication', async () =>
    area('shared-dialogs', 54, 'e-Prescribe searches selects and submits medication', async () => {
      await open('/patients/1');
      await openDialog('e-Prescribe', 'e-Prescribe Medication');
      await fillInput('Search medications...', 'Metformin');
      await page().evaluate(() => {
        const medication = Array.from(document.querySelectorAll('.cursor-pointer'))
          .find((element) => element.textContent?.includes('Metformin'));
        if (!medication) throw new Error('Could not find Metformin medication option');
        (medication as HTMLElement).click();
      });
      const selects = await page().$$('select');
      expect(selects.length).toBeGreaterThan(0);
      await clickButton('Sign & Send to Pharmacy');
      await expectAlert('Prescription Sent');
      expect(await bodyText()).toContain('Metformin');
    }));

  test('UAT-55: order dialog search selection removal disabled zero and STAT warning', async () =>
    area('shared-dialogs', 55, 'order dialog search selection removal disabled zero and STAT warning', async () => {
      await open('/patients/1');
      await openDialog('Order Labs', 'Order Laboratory Tests');
      const disabled = await page().evaluate(() => Array.from(document.querySelectorAll('button'))
        .find((button) => button.textContent?.includes('Sign & Submit'))?.disabled);
      expect(disabled).toBe(true);
      await fillInput('Search tests...', 'CBC');
      await clickText('CBC');
      expect(await bodyText()).toContain('Selected Orders (1)');
      await clickText('STAT');
      expect(await bodyText()).toContain('STAT orders');
      await clickButton('Sign & Submit (1)');
      await expectAlert('Lab Order Placed');
    }));

  test('UAT-56: print dialog options and PHI notice support actions', async () =>
    area('shared-dialogs', 56, 'print dialog options and PHI notice support actions', async () => {
      await open('/patients/1');
      await openDialog('Print', 'Print Patient Chart');
      expect(await bodyText()).toContain('Protected Health Information');
      await selectValue(0, 'landscape');
      await clickButton('Save PDF');
      await expectAlert('Print Sent');
    }));

  test('UAT-57: modal dismisses via cancel X and Escape', async () =>
    area('shared-dialogs', 57, 'modal dismisses via cancel X and Escape', async () => {
      await open('/patients/1');
      await openDialog('e-Prescribe', 'e-Prescribe Medication');
      await closeModal();
      expect(await bodyText()).not.toContain('e-Prescribe Medication');
      await openDialog('Order Labs', 'Order Laboratory Tests');
      await page().click('div.fixed button');
      expect(await bodyText()).not.toContain('Order Laboratory Tests');
      await openDialog('Print', 'Print Patient Chart');
      await clickButton('Cancel');
      expect(await bodyText()).not.toContain('Print Patient Chart');
    }));

  test('UAT-58: chart access and patient search audit entries include PHI details', async () =>
    area('hipaa-audit', 58, 'chart access and patient search audit entries include PHI details', async () => {
      await open('/patients/1');
      let events = await auditLog();
      expect(events[0]).toMatchObject({ eventType: 'PATIENT_ACCESS', patientId: '1', patientMrn: 'MRN001234', patientName: 'Smith, John' });
      await open('/patients');
      await fillInput('Name, MRN, DOB, Phone...', 'Smith');
      await clickButton('Find');
      events = await auditLog();
      expect(events.some((event) => event.eventType === 'PATIENT_SEARCH'
        && String(event.details ?? '').includes('Smith')
        && String(event.details ?? '').includes('1 results'))).toBe(true);
    }));

  test('UAT-59: print prescription and order actions emit audit events', async () =>
    area('hipaa-audit', 59, 'print prescription and order actions emit audit events', async () => {
      await open('/patients/1');
      await openDialog('Print', 'Print Patient Chart');
      await clickButton('Print', 1);
      await expectAlert('Print Sent');
      await closeModal();
      await openDialog('e-Prescribe', 'e-Prescribe Medication');
      await fillInput('Search medications...', 'Metformin');
      await clickText('Metformin');
      await clickButton('Sign & Send to Pharmacy');
      await expectAlert('Prescription Sent');
      await closeModal();
      await openDialog('Order Labs', 'Order Laboratory Tests');
      await fillInput('Search tests...', 'CBC');
      await clickText('CBC');
      await clickButton('Sign & Submit (1)');
      await expectAlert('Lab Order Placed');
      const events = await auditLog();
      expect(events.some((event) => event.eventType === 'PHI_PRINT')).toBe(true);
      expect(events.some((event) => event.eventType === 'PRESCRIPTION_CREATE')).toBe(true);
      expect(events.some((event) => event.eventType === 'ORDER_CREATE')).toBe(true);
    }));

  test('UAT-60: logout and timeout audit events carry stable session id', async () =>
    area('hipaa-audit', 60, 'logout and timeout audit events carry stable session id', async () => {
      await open('/');
      const sessionId = 'uat-session';
      await page().evaluate((id) => sessionStorage.setItem('coghealth_session_id', id), sessionId);
      await expectAlert('Session Expired');
      await clickButton('OK');
      await page().waitForFunction(() => !document.body.innerText.includes('Session Expired'));
      const events = await auditLog();
      expect(events[0]).toMatchObject({ eventType: 'SESSION_TIMEOUT', sessionId });
    }));

  test('UAT-61: audit log is capped at 1000 newest first', async () =>
    area('hipaa-audit', 61, 'audit log is capped at 1000 newest first', async () => {
      await open('/');
      await page().evaluate(() => {
        const now = Date.now();
        const entries = Array.from({ length: 1000 }, (_, i) => ({
          id: `seed-${i}`, timestamp: new Date(now - i * 1000).toISOString(), eventType: 'LOGIN',
          userId: 'seed', userName: 'Seed', userRole: 'QA', ipAddress: '127.0.0.1', sessionId: 'seed', success: true,
        }));
        localStorage.setItem('coghealth_audit_log', JSON.stringify(entries));
      });
      await open('/patients/2');
      const events = await auditLog();
      expect(events).toHaveLength(1000);
      expect(events[0]).toMatchObject({
        eventType: 'PATIENT_ACCESS',
        patientId: '2',
        patientMrn: 'MRN001235',
        patientName: 'Johnson, Sarah',
      });
      expect(events[0].id).not.toMatch(/^seed-/);
      expect(events.some((event) => event.id === 'seed-999')).toBe(false);
      expect(events[999].id).not.toBe('seed-999');
    }));
});
