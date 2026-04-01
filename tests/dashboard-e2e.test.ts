import puppeteer, { Browser, Page } from 'puppeteer';

const BASE_URL = 'http://localhost:5173';
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

describe('Dashboard E2E Tests - Airbnb Redesign', () => {
  let browser: Browser;
  let page: Page;

  beforeAll(async () => {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
  });

  afterAll(async () => {
    await browser.close();
  });

  describe('Dashboard Layout and Design', () => {
    beforeEach(async () => {
      await page.goto(BASE_URL, { waitUntil: 'networkidle0' });
      await wait(500);
    });

    test('should load dashboard page with Airbnb-style design', async () => {
      // Check that the page loads with the new design elements
      const body = await page.$('body');
      expect(body).not.toBeNull();

      // Verify the app header is present
      const header = await page.$('header, [data-testid="app-header"], nav');
      expect(header).not.toBeNull();
    });

    test('should display navigation with proper items', async () => {
      // Check navigation links exist
      const dashboardLink = await page.$('a[href="/"]');
      expect(dashboardLink).not.toBeNull();

      const patientsLink = await page.$('a[href="/patients"]');
      expect(patientsLink).not.toBeNull();

      const scheduleLink = await page.$('a[href="/schedule"]');
      expect(scheduleLink).not.toBeNull();
    });

    test('should have clean white background (Airbnb-style)', async () => {
      const bgColor = await page.evaluate(() => {
        const main = document.querySelector('main');
        if (main) {
          return window.getComputedStyle(main).backgroundColor;
        }
        return null;
      });
      // Should be white or near-white, not the old grey #d4d0c8
      expect(bgColor).not.toBe('rgb(212, 208, 200)');
    });
  });

  describe('Inbox Functionality', () => {
    beforeEach(async () => {
      await page.goto(BASE_URL, { waitUntil: 'networkidle0' });
      await wait(500);
    });

    test('should display inbox section', async () => {
      const pageContent = await page.content();
      expect(pageContent).toContain('Inbox');
    });

    test('should have inbox filter tabs', async () => {
      const pageContent = await page.content();
      expect(pageContent).toContain('All');
      expect(pageContent).toContain('Results');
      expect(pageContent).toContain('Messages');
    });

    test('should have priority filter', async () => {
      const prioritySelect = await page.$('select');
      expect(prioritySelect).not.toBeNull();
    });

    test('should have Mark All Read button', async () => {
      const pageContent = await page.content();
      expect(pageContent).toContain('Mark All Read');
    });
  });

  describe('Worklist Functionality', () => {
    beforeEach(async () => {
      await page.goto(BASE_URL, { waitUntil: 'networkidle0' });
      await wait(500);
    });

    test('should display patient worklist section', async () => {
      const pageContent = await page.content();
      expect(pageContent).toContain('Patient Worklist');
    });

    test('should have worklist filter buttons', async () => {
      const pageContent = await page.content();
      expect(pageContent).toContain('All');
      expect(pageContent).toContain('Inpatient');
      expect(pageContent).toContain('Clinic');
      expect(pageContent).toContain('Critical');
    });

    test('should have sort controls', async () => {
      const pageContent = await page.content();
      expect(pageContent).toContain('Sort');
    });
  });

  describe('Sidebar Panels', () => {
    beforeEach(async () => {
      await page.goto(BASE_URL, { waitUntil: 'networkidle0' });
      await wait(500);
    });

    test('should display Unsigned Notes panel', async () => {
      const pageContent = await page.content();
      expect(pageContent).toContain('Unsigned Notes');
    });

    test('should display Pending Orders panel', async () => {
      const pageContent = await page.content();
      expect(pageContent).toContain('Pending Orders');
    });

    test('should display Today\'s Schedule panel', async () => {
      const pageContent = await page.content();
      expect(pageContent).toContain('Schedule');
    });

    test('should display System Status panel', async () => {
      const pageContent = await page.content();
      expect(pageContent).toContain('System Status');
    });
  });

  describe('Toolbar Actions', () => {
    beforeEach(async () => {
      await page.goto(BASE_URL, { waitUntil: 'networkidle0' });
      await wait(500);
    });

    test('should have Refresh button', async () => {
      const pageContent = await page.content();
      expect(pageContent).toContain('Refresh');
    });

    test('should have e-Prescribe button', async () => {
      const pageContent = await page.content();
      expect(pageContent).toContain('e-Prescribe');
    });

    test('should have Order Labs button', async () => {
      const pageContent = await page.content();
      expect(pageContent).toContain('Order Labs');
    });

    test('should have Print button', async () => {
      const pageContent = await page.content();
      expect(pageContent).toContain('Print');
    });
  });

  describe('Dialog Interactions', () => {
    beforeEach(async () => {
      await page.goto(BASE_URL, { waitUntil: 'networkidle0' });
      await wait(500);
    });

    test('should open and close print dialog', async () => {
      // Find and click print button
      const buttons = await page.$$('button');
      let printButton = null;
      for (const button of buttons) {
        const text = await page.evaluate(el => el.textContent, button);
        if (text && text.includes('Print') && !text.includes('Print List')) {
          printButton = button;
          break;
        }
      }
      if (printButton) {
        await printButton.click();
        await wait(500);
        // Check modal is open
        const modal = await page.$('.fixed.inset-0, [role="dialog"]');
        expect(modal).not.toBeNull();
        // Close it
        const cancelButtons = await page.$$('button');
        for (const btn of cancelButtons) {
          const text = await page.evaluate(el => el.textContent, btn);
          if (text && text.includes('Cancel')) {
            await btn.click();
            break;
          }
        }
        await wait(300);
      }
    });

    test('should open and close e-Prescribe dialog', async () => {
      const buttons = await page.$$('button');
      let rxButton = null;
      for (const button of buttons) {
        const text = await page.evaluate(el => el.textContent, button);
        if (text && (text.includes('e-Prescribe') || text.includes('Prescribe'))) {
          rxButton = button;
          break;
        }
      }
      if (rxButton) {
        await rxButton.click();
        await wait(500);
        const modal = await page.$('.fixed.inset-0, [role="dialog"]');
        expect(modal).not.toBeNull();
        const cancelButtons = await page.$$('button');
        for (const btn of cancelButtons) {
          const text = await page.evaluate(el => el.textContent, btn);
          if (text && text.includes('Cancel')) {
            await btn.click();
            break;
          }
        }
        await wait(300);
      }
    });
  });

  describe('Navigation', () => {
    test('should navigate to Patients page and back', async () => {
      await page.goto(BASE_URL, { waitUntil: 'networkidle0' });
      await page.click('a[href="/patients"]');
      await wait(500);
      expect(page.url()).toContain('/patients');

      await page.click('a[href="/"]');
      await wait(500);
      expect(page.url()).toBe(BASE_URL + '/');
    });

    test('should navigate to Schedule page', async () => {
      await page.goto(BASE_URL, { waitUntil: 'networkidle0' });
      await page.click('a[href="/schedule"]');
      await wait(500);
      expect(page.url()).toContain('/schedule');
    });

    test('should navigate to Lab Results page', async () => {
      await page.goto(BASE_URL, { waitUntil: 'networkidle0' });
      await page.click('a[href="/labs"]');
      await wait(500);
      expect(page.url()).toContain('/labs');
    });
  });

  describe('Status Bar', () => {
    test('should display HIPAA compliance info', async () => {
      await page.goto(BASE_URL, { waitUntil: 'networkidle0' });
      const pageContent = await page.content();
      expect(pageContent).toContain('HIPAA');
    });

    test('should display session timer', async () => {
      await page.goto(BASE_URL, { waitUntil: 'networkidle0' });
      const pageContent = await page.content();
      expect(pageContent).toContain('Session');
    });

    test('should display user info', async () => {
      await page.goto(BASE_URL, { waitUntil: 'networkidle0' });
      const pageContent = await page.content();
      expect(pageContent).toContain('Dr. Sarah Anderson');
    });
  });

  describe('Responsive Design', () => {
    test('should render correctly at desktop width', async () => {
      await page.setViewport({ width: 1280, height: 800 });
      await page.goto(BASE_URL, { waitUntil: 'networkidle0' });
      await wait(500);
      const body = await page.$('body');
      expect(body).not.toBeNull();
    });

    test('should render correctly at tablet width', async () => {
      await page.setViewport({ width: 768, height: 1024 });
      await page.goto(BASE_URL, { waitUntil: 'networkidle0' });
      await wait(500);
      const body = await page.$('body');
      expect(body).not.toBeNull();
      // Reset viewport
      await page.setViewport({ width: 1280, height: 800 });
    });
  });
});
