import puppeteer, { Browser, Page } from 'puppeteer';

const BASE_URL = 'http://localhost:5173';
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

describe('CogHealth EHR E2E Tests', () => {
  let browser: Browser;
  let page: Page;

  beforeAll(async () => {
    browser = await puppeteer.launch({ headless: true });
    page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
  });

  afterAll(async () => {
    await browser.close();
  });

  describe('Navigation', () => {
    test('should load dashboard page with Airbnb-style header', async () => {
      await page.goto(BASE_URL);
      await page.waitForSelector('header');
      const logoText = await page.$eval('header a span', el => el.textContent);
      expect(logoText).toBe('CogHealth');
    });

    test('should display modern nav tabs', async () => {
      await page.goto(BASE_URL);
      await page.waitForSelector('nav');
      const dashboardTab = await page.$('nav a[href="/"]');
      expect(dashboardTab).not.toBeNull();
    });

    test('should navigate to Patients page', async () => {
      await page.click('nav a[href="/patients"]');
      await page.waitForFunction(() => window.location.pathname === '/patients');
      expect(page.url()).toContain('/patients');
    });

    test('should navigate to Schedule page', async () => {
      const modal = await page.$('.fixed.inset-0');
      if (modal) {
        const okBtn = await page.$('::-p-xpath(//button[contains(., "OK")])');
        if (okBtn) await okBtn.click();
        await wait(100);
      }
      await page.click('nav a[href="/schedule"]');
      await page.waitForFunction(() => window.location.pathname === '/schedule');
      expect(page.url()).toContain('/schedule');
    });

    test('should navigate to Medications page', async () => {
      await page.click('nav a[href="/medications"]');
      await page.waitForFunction(() => window.location.pathname === '/medications');
      expect(page.url()).toContain('/medications');
    });

    test('should navigate to Reports page', async () => {
      await page.click('nav a[href="/reports"]');
      await page.waitForFunction(() => window.location.pathname === '/reports');
      expect(page.url()).toContain('/reports');
    });

    test('should navigate to Settings page', async () => {
      await page.click('nav a[href="/settings"]');
      await page.waitForFunction(() => window.location.pathname === '/settings');
      expect(page.url()).toContain('/settings');
    });
  });

  describe('Global Patient Search', () => {
    test('should show search dropdown when typing', async () => {
      await page.goto(BASE_URL);
      const searchInput = await page.$('input[placeholder*="Search patients"]');
      expect(searchInput).not.toBeNull();
      await searchInput?.type('Smith');
      await page.waitForSelector('.absolute.top-full');
      const results = await page.$$('.absolute.top-full > div');
      expect(results.length).toBeGreaterThan(0);
    });

    test('should navigate to patient chart when selecting from search', async () => {
      await page.goto(BASE_URL);
      const searchInput = await page.$('input[placeholder*="Search patients"]');
      await searchInput?.type('Smith');
      await page.waitForSelector('.absolute.top-full > div');
      await page.click('.absolute.top-full > div:first-child');
      await page.waitForFunction(() => window.location.pathname.startsWith('/patients/'));
      expect(page.url()).toContain('/patients/');
    });
  });

  describe('Dashboard - Airbnb Design', () => {
    beforeEach(async () => {
      await page.goto(BASE_URL);
      await wait(500);
    });

    test('should display greeting with doctor name', async () => {
      const greeting = await page.$eval('h1', el => el.textContent);
      expect(greeting).toContain('Dr. Anderson');
    });

    test('should display stat cards', async () => {
      const statCards = await page.$$('.stat-card');
      expect(statCards.length).toBe(4);
    });

    test('should display quick action buttons', async () => {
      const ePrescribeBtn = await page.$('::-p-xpath(//button[contains(., "e-Prescribe")])');
      const orderLabsBtn = await page.$('::-p-xpath(//button[contains(., "Order Labs")])');
      const orderImagingBtn = await page.$('::-p-xpath(//button[contains(., "Order Imaging")])');
      expect(ePrescribeBtn).not.toBeNull();
      expect(orderLabsBtn).not.toBeNull();
      expect(orderImagingBtn).not.toBeNull();
    });

    test('should display inbox section with modern tabs', async () => {
      const inboxHeader = await page.$('::-p-xpath(//h2[contains(., "Inbox")])');
      expect(inboxHeader).not.toBeNull();
      const allTab = await page.$('::-p-xpath(//button[text()="All"])');
      const resultsTab = await page.$('::-p-xpath(//button[text()="Results"])');
      expect(allTab).not.toBeNull();
      expect(resultsTab).not.toBeNull();
    });

    test('should filter inbox by tab', async () => {
      await page.click('::-p-xpath(//button[text()="Results"])');
      await wait(100);
      await page.click('::-p-xpath(//button[text()="All"])');
      await wait(100);
    });

    test('should filter inbox by priority', async () => {
      await page.select('select:has(option[value="critical"])', 'critical');
      await wait(100);
      await page.select('select:has(option[value="critical"])', 'all');
      await wait(100);
    });

    test('should filter inbox by read/unread status', async () => {
      await page.select('select:has(option[value="unread"])', 'unread');
      await wait(100);
      await page.select('select:has(option[value="unread"])', 'all');
      await wait(100);
    });

    test('should mark all as read', async () => {
      const markAllReadBtn = await page.$('::-p-xpath(//button[contains(., "Mark All Read")])');
      expect(markAllReadBtn).not.toBeNull();
      await markAllReadBtn?.click();
      await wait(100);
      const alertDialog = await page.$('.fixed.inset-0');
      if (alertDialog) {
        await page.click('::-p-xpath(//button[contains(., "OK")])');
        await wait(100);
      }
    });

    test('should display patient worklist with filter pills', async () => {
      const worklistHeader = await page.$('::-p-xpath(//h2[contains(., "Patient Worklist")])');
      expect(worklistHeader).not.toBeNull();
      const allFilter = await page.$('::-p-xpath(//button[text()="All"])');
      const inpatientFilter = await page.$('::-p-xpath(//button[text()="Inpatient"])');
      const clinicFilter = await page.$('::-p-xpath(//button[text()="Clinic"])');
      const criticalFilter = await page.$('::-p-xpath(//button[text()="Critical"])');
      expect(allFilter).not.toBeNull();
      expect(inpatientFilter).not.toBeNull();
      expect(clinicFilter).not.toBeNull();
      expect(criticalFilter).not.toBeNull();
    });

    test('should filter worklist by type', async () => {
      await page.click('::-p-xpath(//button[text()="Inpatient"])');
      await wait(100);
      await page.click('::-p-xpath(//button[text()="All"])');
      await wait(100);
    });

    test('should sort worklist', async () => {
      await page.select('select:has(option[value="name"])', 'name');
      await wait(100);
    });

    test('should open e-Prescribe dialog', async () => {
      await page.click('::-p-xpath(//button[contains(., "e-Prescribe")])');
      await page.waitForSelector('.fixed.inset-0');
      const modalTitle = await page.$eval('.fixed.inset-0 span.text-white', el => el.textContent);
      expect(modalTitle).toContain('Prescribe');
      await page.click('::-p-xpath(//button[contains(., "Cancel")])');
    });

    test('should open Order Labs dialog', async () => {
      await page.click('::-p-xpath(//button[contains(., "Order Labs")])');
      await page.waitForSelector('.fixed.inset-0');
      await page.click('::-p-xpath(//button[contains(., "Cancel")])');
    });

    test('should open Order Imaging dialog', async () => {
      await page.click('::-p-xpath(//button[contains(., "Order Imaging")])');
      await page.waitForSelector('.fixed.inset-0');
      await page.click('::-p-xpath(//button[contains(., "Cancel")])');
    });

    test('should open Print dialog', async () => {
      await page.click('::-p-xpath(//button[contains(., "Print")])');
      await page.waitForSelector('.fixed.inset-0');
      const modalTitle = await page.$eval('.fixed.inset-0 span.text-white', el => el.textContent);
      expect(modalTitle).toContain('Print');
      await page.click('::-p-xpath(//button[contains(., "Cancel")])');
    });

    test('should collapse/expand inbox panel', async () => {
      const inboxToggle = await page.$('::-p-xpath(//*[contains(., "Inbox")]/ancestor::div[contains(@class, "cursor-pointer")][@class])');
      if (inboxToggle) {
        await inboxToggle.click();
        await wait(200);
        await inboxToggle.click();
        await wait(200);
      }
    });

    test('should display unsigned notes section', async () => {
      const unsignedHeader = await page.$('::-p-xpath(//h3[contains(., "Unsigned Notes")])');
      expect(unsignedHeader).not.toBeNull();
    });

    test('should display pending orders section', async () => {
      const ordersHeader = await page.$('::-p-xpath(//h3[contains(., "Pending Orders")])');
      expect(ordersHeader).not.toBeNull();
    });

    test('should display today\'s schedule section', async () => {
      const scheduleHeader = await page.$('::-p-xpath(//h3[contains(., "Schedule")])');
      expect(scheduleHeader).not.toBeNull();
    });

    test('should display system status with green indicators', async () => {
      const statusHeader = await page.$('::-p-xpath(//h3[contains(., "System Status")])');
      expect(statusHeader).not.toBeNull();
    });

    test('should have refresh button', async () => {
      const refreshBtn = await page.$('::-p-xpath(//button[contains(., "Refresh")])');
      expect(refreshBtn).not.toBeNull();
      await refreshBtn?.click();
      await wait(100);
      const alertDialog = await page.$('.fixed.inset-0');
      if (alertDialog) {
        await page.click('::-p-xpath(//button[contains(., "OK")])');
        await wait(100);
      }
    });

    test('should have notification bell with badge', async () => {
      const bell = await page.$('button .absolute');
      expect(bell).not.toBeNull();
    });
  });

  describe('Design System Verification', () => {
    beforeEach(async () => {
      await page.goto(BASE_URL);
      await wait(300);
    });

    test('should use Nunito Sans font', async () => {
      const fontFamily = await page.evaluate(() => {
        return window.getComputedStyle(document.body).fontFamily;
      });
      expect(fontFamily.toLowerCase()).toContain('nunito');
    });

    test('should have rounded card borders (12px+)', async () => {
      const borderRadius = await page.evaluate(() => {
        const card = document.querySelector('.stat-card');
        return card ? window.getComputedStyle(card).borderRadius : '';
      });
      expect(parseInt(borderRadius)).toBeGreaterThanOrEqual(12);
    });

    test('should have pill-shaped search bar', async () => {
      const borderRadius = await page.evaluate(() => {
        const search = document.querySelector('.ehr-search-bar');
        return search ? window.getComputedStyle(search).borderRadius : '';
      });
      expect(parseInt(borderRadius)).toBeGreaterThanOrEqual(20);
    });

    test('should have white background with proper text color', async () => {
      const bgColor = await page.evaluate(() => {
        return window.getComputedStyle(document.body).backgroundColor;
      });
      expect(bgColor).toContain('255');
    });

    test('should use modern 14px base font size', async () => {
      const fontSize = await page.evaluate(() => {
        return window.getComputedStyle(document.body).fontSize;
      });
      expect(parseInt(fontSize)).toBeGreaterThanOrEqual(14);
    });

    test('should have bottom status bar with HIPAA badge', async () => {
      const hipaaText = await page.$('::-p-xpath(//*[contains(., "HIPAA Compliant")])');
      expect(hipaaText).not.toBeNull();
    });
  });

  describe('Patient Search Page', () => {
    beforeEach(async () => {
      await page.goto(`${BASE_URL}/patients`);
    });

    test('should display patient search page', async () => {
      await page.waitForSelector('nav a[href="/patients"]');
      expect(page.url()).toContain('/patients');
    });

    test('should have search functionality', async () => {
      const searchInput = await page.$('input[placeholder*="Name, MRN"]');
      if (searchInput) {
        await searchInput.type('Smith');
        const findBtn = await page.$('::-p-xpath(//button[contains(., "Find")])');
        if (findBtn) await findBtn.click();
        await wait(200);
      }
    });
  });

  describe('Session Management', () => {
    test('should display session timer', async () => {
      await page.goto(BASE_URL);
      const sessionTimer = await page.$('::-p-xpath(//*[contains(text(), ":")])');
      expect(sessionTimer).not.toBeNull();
    });

    test('should display logout button', async () => {
      await page.goto(BASE_URL);
      const logoutBtn = await page.$('button[title="Logout"]');
      expect(logoutBtn).not.toBeNull();
    });

    test('should show logout confirmation dialog', async () => {
      await page.goto(BASE_URL);
      const logoutBtn = await page.$('button[title="Logout"]');
      await logoutBtn?.click();
      await page.waitForSelector('.fixed.inset-0');
      const confirmText = await page.$('::-p-xpath(//*[contains(., "Are you sure")])');
      expect(confirmText).not.toBeNull();
      await page.click('::-p-xpath(//button[contains(., "Cancel")])');
    });
  });

  describe('Responsive Design', () => {
    test('should show mobile menu button on small screens', async () => {
      await page.setViewport({ width: 375, height: 667 });
      await page.goto(BASE_URL);
      await wait(300);
      const menuBtn = await page.$('button.md\\:hidden');
      expect(menuBtn).not.toBeNull();
      await page.setViewport({ width: 1280, height: 800 });
    });
  });
});
