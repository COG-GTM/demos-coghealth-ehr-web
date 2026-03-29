import puppeteer, { Browser, Page } from 'puppeteer';

const BASE_URL = 'http://localhost:5173';
const PERF_TIMEOUT = 60000;

interface TimingResult {
  page: string;
  action: string;
  durationMs: number;
}

const results: TimingResult[] = [];

function recordTiming(page: string, action: string, durationMs: number) {
  results.push({ page, action, durationMs });
  console.log(`[PERF] ${page} - ${action}: ${durationMs.toFixed(0)}ms`);
}

describe('CogHealth EHR Performance Tests', () => {
  let browser: Browser;
  let page: Page;

  beforeAll(async () => {
    browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
    page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
  });

  afterAll(async () => {
    console.log('\n========== PERFORMANCE TEST RESULTS ==========');
    console.log('Page | Action | Duration (ms)');
    console.log('-----|--------|-------------');
    for (const r of results) {
      console.log(`${r.page} | ${r.action} | ${r.durationMs.toFixed(0)}`);
    }
    console.log('===============================================\n');
    await browser.close();
  });

  describe('Dashboard Page', () => {
    test('should measure time from navigation to data displayed', async () => {
      const start = performance.now();
      await page.goto(BASE_URL, { waitUntil: 'networkidle0' });
      // Wait for the dashboard content to be fully rendered (loading overlay gone, data tables present)
      await page.waitForFunction(
        () => {
          const loadingOverlay = document.querySelector('[class*="LoadingOverlay"]');
          const hasTable = document.querySelector('table tbody tr');
          const noLoading = !document.querySelector('.animate-spin');
          return hasTable && noLoading && !loadingOverlay;
        },
        { timeout: 30000 }
      );
      const end = performance.now();
      recordTiming('Dashboard', 'Full page load with data', end - start);
      expect(end - start).toBeLessThan(PERF_TIMEOUT);
    });

    test('should measure inbox tab filter speed', async () => {
      await page.goto(BASE_URL, { waitUntil: 'networkidle0' });
      await page.waitForSelector('table tbody tr', { timeout: 15000 });

      const start = performance.now();
      await page.click('::-p-xpath(//button[contains(., "Results")])');
      // Wait for re-render after filter
      await page.waitForFunction(
        () => document.querySelector('table tbody') !== null,
        { timeout: 5000 }
      );
      const end = performance.now();
      recordTiming('Dashboard', 'Inbox tab filter (Results)', end - start);
      expect(end - start).toBeLessThan(5000);
    });

    test('should measure worklist filter speed', async () => {
      await page.goto(BASE_URL, { waitUntil: 'networkidle0' });
      await page.waitForSelector('table tbody tr', { timeout: 15000 });

      const start = performance.now();
      await page.click('::-p-xpath(//button[contains(., "Inpatient")])');
      await page.waitForFunction(
        () => document.querySelector('table') !== null,
        { timeout: 5000 }
      );
      const end = performance.now();
      recordTiming('Dashboard', 'Worklist filter (Inpatient)', end - start);
      expect(end - start).toBeLessThan(5000);
    });
  });

  describe('Patient List Page', () => {
    test('should measure time from navigation to patient list displayed', async () => {
      // Start from dashboard
      await page.goto(BASE_URL, { waitUntil: 'networkidle0' });
      await page.waitForSelector('.ehr-header', { timeout: 10000 });

      const start = performance.now();
      await page.click('a[href="/patients"]');
      // Wait for patient list table to render with data rows
      await page.waitForFunction(
        () => {
          const onPatientsPage = window.location.pathname === '/patients';
          const hasRows = document.querySelectorAll('table tbody tr').length > 0;
          const noSpinner = !document.querySelector('.animate-spin');
          return onPatientsPage && hasRows && noSpinner;
        },
        { timeout: 30000 }
      );
      const end = performance.now();
      recordTiming('Patient List', 'Navigate and load patient list', end - start);
      expect(end - start).toBeLessThan(PERF_TIMEOUT);
    });

    test('should measure patient search speed', async () => {
      await page.goto(`${BASE_URL}/patients`, { waitUntil: 'networkidle0' });
      await page.waitForFunction(
        () => document.querySelectorAll('table tbody tr').length > 0 && !document.querySelector('.animate-spin'),
        { timeout: 15000 }
      );

      const searchInput = await page.$('input[placeholder*="Name, MRN"]');
      if (searchInput) {
        await searchInput.click({ clickCount: 3 });
        await searchInput.type('Smith');
      }

      const start = performance.now();
      await page.click('::-p-xpath(//button[contains(., "Find")])');
      await page.waitForFunction(
        () => document.querySelector('table tbody') !== null,
        { timeout: 10000 }
      );
      const end = performance.now();
      recordTiming('Patient List', 'Search patients (Smith)', end - start);
      expect(end - start).toBeLessThan(10000);
    });
  });

  describe('Patient Chart Page', () => {
    test('should measure time from navigation to patient chart displayed', async () => {
      // Start from patient list
      await page.goto(`${BASE_URL}/patients`, { waitUntil: 'networkidle0' });
      await page.waitForFunction(
        () => document.querySelectorAll('table tbody tr.cursor-pointer').length > 0 && !document.querySelector('.animate-spin'),
        { timeout: 15000 }
      );

      // Click first patient row to select, then open chart
      const patientRow = await page.$('table tbody tr.cursor-pointer');
      if (!patientRow) {
        console.warn('No patient rows found - skipping chart navigation test');
        return;
      }

      await patientRow.click();
      // Wait for Open Chart button
      await page.waitForSelector('::-p-xpath(//button[contains(., "Open Chart")])', { timeout: 5000 });

      const start = performance.now();
      await page.click('::-p-xpath(//button[contains(., "Open Chart")])');
      // Wait for patient chart to fully load (patient banner + summary content)
      await page.waitForFunction(
        () => {
          const onChartPage = window.location.pathname.startsWith('/patients/');
          const hasBanner = document.querySelector('.ehr-status-bar') !== null;
          const hasTabs = document.querySelectorAll('.ehr-tab, [class*="ehr-tab"]').length > 0;
          const noLoading = !document.querySelector('.animate-spin') &&
                            !document.querySelector('[class*="Loading patient"]');
          return onChartPage && (hasBanner || hasTabs) && noLoading;
        },
        { timeout: 30000 }
      );
      const end = performance.now();
      recordTiming('Patient Chart', 'Navigate from list to chart', end - start);
      expect(end - start).toBeLessThan(PERF_TIMEOUT);
    });

    test('should measure direct patient chart load time', async () => {
      const start = performance.now();
      await page.goto(`${BASE_URL}/patients/1`, { waitUntil: 'networkidle0' });
      // Wait for patient chart content
      await page.waitForFunction(
        () => {
          const hasContent = document.querySelector('table') !== null ||
                             document.querySelector('.ehr-status-bar') !== null;
          const noLoading = !document.querySelector('.animate-spin') &&
                            !document.body.textContent?.includes('Loading patient...');
          return hasContent && noLoading;
        },
        { timeout: 30000 }
      );
      const end = performance.now();
      recordTiming('Patient Chart', 'Direct page load (/patients/1)', end - start);
      expect(end - start).toBeLessThan(PERF_TIMEOUT);
    });

    test('should measure chart tab switching speed', async () => {
      await page.goto(`${BASE_URL}/patients/1`, { waitUntil: 'networkidle0' });
      await page.waitForFunction(
        () => !document.body.textContent?.includes('Loading patient...') &&
              document.querySelector('.ehr-tab, [class*="ehr-tab"]') !== null,
        { timeout: 15000 }
      );

      const start = performance.now();
      await page.click('::-p-xpath(//button[contains(., "Encounters")])');
      await page.waitForFunction(
        () => document.querySelector('table') !== null,
        { timeout: 5000 }
      );
      const end = performance.now();
      recordTiming('Patient Chart', 'Tab switch (Summary → Encounters)', end - start);
      expect(end - start).toBeLessThan(5000);
    });
  });

  describe('Provider Schedule Page', () => {
    test('should measure time from navigation to schedule displayed', async () => {
      // Start from dashboard
      await page.goto(BASE_URL, { waitUntil: 'networkidle0' });
      await page.waitForSelector('.ehr-header', { timeout: 10000 });

      const start = performance.now();
      await page.click('a[href="/schedule"]');
      // Wait for schedule page to render with appointment data
      await page.waitForFunction(
        () => {
          const onSchedulePage = window.location.pathname === '/schedule';
          const hasContent = document.querySelector('.ehr-status-bar') !== null;
          return onSchedulePage && hasContent;
        },
        { timeout: 30000 }
      );
      const end = performance.now();
      recordTiming('Provider Schedule', 'Navigate and load schedule', end - start);
      expect(end - start).toBeLessThan(PERF_TIMEOUT);
    });

    test('should measure direct schedule page load time', async () => {
      const start = performance.now();
      await page.goto(`${BASE_URL}/schedule`, { waitUntil: 'networkidle0' });
      await page.waitForSelector('.ehr-status-bar', { timeout: 15000 });
      const end = performance.now();
      recordTiming('Provider Schedule', 'Direct page load', end - start);
      expect(end - start).toBeLessThan(PERF_TIMEOUT);
    });

    test('should measure schedule filter speed', async () => {
      await page.goto(`${BASE_URL}/schedule`, { waitUntil: 'networkidle0' });
      await page.waitForSelector('.ehr-status-bar', { timeout: 15000 });

      const start = performance.now();
      await page.click('::-p-xpath(//button[contains(., "Waiting")])');
      await page.waitForFunction(
        () => document.querySelector('.ehr-status-bar') !== null,
        { timeout: 5000 }
      );
      const end = performance.now();
      recordTiming('Provider Schedule', 'Filter by status (Waiting)', end - start);
      expect(end - start).toBeLessThan(5000);
    });
  });

  describe('Clinical Actions', () => {
    test('should measure e-Prescribe dialog open time', async () => {
      await page.goto(BASE_URL, { waitUntil: 'networkidle0' });
      await page.waitForSelector('table tbody tr', { timeout: 15000 });

      const start = performance.now();
      await page.click('::-p-xpath(//button[contains(., "e-Prescribe")])');
      await page.waitForSelector('.fixed.inset-0', { timeout: 10000 });
      const end = performance.now();
      recordTiming('Clinical Actions', 'Open e-Prescribe dialog', end - start);
      expect(end - start).toBeLessThan(5000);

      // Close dialog
      await page.click('::-p-xpath(//button[contains(., "Cancel")])');
    });

    test('should measure Order Labs dialog open time', async () => {
      await page.goto(BASE_URL, { waitUntil: 'networkidle0' });
      await page.waitForSelector('table tbody tr', { timeout: 15000 });

      const start = performance.now();
      await page.click('::-p-xpath(//button[contains(., "Order Labs")])');
      await page.waitForSelector('.fixed.inset-0', { timeout: 10000 });
      const end = performance.now();
      recordTiming('Clinical Actions', 'Open Order Labs dialog', end - start);
      expect(end - start).toBeLessThan(5000);

      await page.click('::-p-xpath(//button[contains(., "Cancel")])');
    });

    test('should measure Order Imaging dialog open time', async () => {
      await page.goto(BASE_URL, { waitUntil: 'networkidle0' });
      await page.waitForSelector('table tbody tr', { timeout: 15000 });

      const start = performance.now();
      await page.click('::-p-xpath(//button[contains(., "Order Imaging")])');
      await page.waitForSelector('.fixed.inset-0', { timeout: 10000 });
      const end = performance.now();
      recordTiming('Clinical Actions', 'Open Order Imaging dialog', end - start);
      expect(end - start).toBeLessThan(5000);

      await page.click('::-p-xpath(//button[contains(., "Cancel")])');
    });

    test('should measure Print dialog open time', async () => {
      await page.goto(BASE_URL, { waitUntil: 'networkidle0' });
      await page.waitForSelector('table tbody tr', { timeout: 15000 });

      const start = performance.now();
      await page.click('::-p-xpath(//button[contains(., "Print")])');
      await page.waitForSelector('.fixed.inset-0', { timeout: 10000 });
      const end = performance.now();
      recordTiming('Clinical Actions', 'Open Print dialog', end - start);
      expect(end - start).toBeLessThan(5000);

      await page.click('::-p-xpath(//button[contains(., "Cancel")])');
    });

    test('should measure Refresh action time on dashboard', async () => {
      await page.goto(BASE_URL, { waitUntil: 'networkidle0' });
      await page.waitForSelector('table tbody tr', { timeout: 15000 });

      const start = performance.now();
      await page.click('::-p-xpath(//button[contains(., "Refresh")])');
      await page.waitForSelector('.fixed.inset-0', { timeout: 10000 });
      const end = performance.now();
      recordTiming('Clinical Actions', 'Refresh dashboard', end - start);
      expect(end - start).toBeLessThan(5000);

      await page.click('::-p-xpath(//button[contains(., "OK")])');
    });
  });
});
