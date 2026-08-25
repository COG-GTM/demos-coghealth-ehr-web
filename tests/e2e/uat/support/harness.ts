import fs from 'node:fs';
import path from 'node:path';
import puppeteer, { type Browser, type Page, type ScreenRecorder } from 'puppeteer';
import { patientById, searchPatients } from './fixtures';

export const BASE_URL = process.env.UAT_BASE_URL || 'http://localhost:5173';
export const RESULTS_DIR = path.resolve('test-results');
export const SCREENSHOTS_DIR = path.join(RESULTS_DIR, 'screenshots');
export const results: UatResult[] = [];
let browser: Browser;
let page: Page;
let errorMode = false;
let recorder: ScreenRecorder | undefined;

export interface UatResult {
  id: number;
  area: string;
  title: string;
  status: 'passed' | 'failed' | 'untested';
  duration: number;
  failureMessage?: string;
  screenshotPath: string;
}

class UntestedCaseError extends Error {}

export async function startHarness(): Promise<Page> {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
  browser = await puppeteer.launch({
    headless: process.env.HEADLESS === 'true',
    slowMo: process.env.HEADLESS === 'true' ? 0 : 35,
    defaultViewport: { width: 1440, height: 1000 },
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  page = await browser.newPage();
  await page.setRequestInterception(true);
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (!url.pathname.startsWith('/api/v1/patients')) {
      request.continue().catch(() => undefined);
      return;
    }
    if (request.method() === 'OPTIONS') {
      request.respond({
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      }).catch(() => undefined);
      return;
    }
    if (request.method() !== 'GET') {
      request.continue().catch(() => undefined);
      return;
    }
    if (errorMode && (url.pathname.endsWith('/search') || /\/patients\/\d+$/.test(url.pathname))) {
      request.respond({
        status: 500,
        contentType: 'application/json',
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ message: 'UAT stub error' }),
      }).catch(() => undefined);
      return;
    }
    if (url.pathname.endsWith('/search')) {
      const payload = searchPatients(url.searchParams.get('q') || '', Number(url.searchParams.get('size') || 20));
      request.respond({
        status: 200,
        contentType: 'application/json',
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify(payload),
      }).catch(() => undefined);
      return;
    }
    const match = url.pathname.match(/\/patients\/(\d+)$/);
    const patient = match ? patientById(Number(match[1])) : undefined;
    if (patient) {
      request.respond({
        status: 200,
        contentType: 'application/json',
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify(patient),
      }).catch(() => undefined);
    } else {
      request.respond({
        status: 404,
        contentType: 'application/json',
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: '{}',
      }).catch(() => undefined);
    }
  });
  if (process.env.HEADLESS !== 'true') {
    const recordingPath = `${RESULTS_DIR}/uat-run-all.webm` as `${string}.webm`;
    recorder = await page.screencast({ path: recordingPath }).catch(() => undefined);
  }
  return page;
}

export async function stopHarness(): Promise<void> {
  await recorder?.stop().catch(() => undefined);
  await browser?.close();
  fs.writeFileSync(path.join(RESULTS_DIR, 'uat-results.json'), JSON.stringify(results, null, 2));
}

export async function setApiError(enabled: boolean): Promise<void> {
  errorMode = enabled;
}

export async function open(route = '/'): Promise<void> {
  await page.goto(`${BASE_URL}${route}`, { waitUntil: 'networkidle0' });
  await page.waitForFunction(() => !document.body.innerText.includes('Loading dashboard...') && !document.body.innerText.includes('Loading patients...'), { timeout: 10000 }).catch(() => undefined);
}

export async function clickText(text: string, occurrence = 0): Promise<void> {
  const clicked = await page.evaluate(([needle, index]) => {
    const elements = Array.from(document.querySelectorAll('button, a, label, [role="button"], .cursor-pointer'));
    const normalizedNeedle = String(needle).replace(/\s+/g, ' ').trim();
    const normalizedText = (element: Element) => (element.textContent || '').replace(/\s+/g, ' ').trim();
    const exactMatches = elements.filter((element) => normalizedText(element) === normalizedNeedle);
    const prioritizedExactMatches = [...exactMatches].sort((a, b) =>
      Number(b.classList.contains('ehr-tab')) - Number(a.classList.contains('ehr-tab')));
    const matches = exactMatches.length > 0
      ? prioritizedExactMatches
      : elements
        .filter((element) => normalizedText(element).includes(normalizedNeedle))
        .sort((a, b) => normalizedText(a).length - normalizedText(b).length);
    const target = matches[Number(index)];
    if (!target) return false;
    (target as HTMLElement).click();
    return true;
  }, [text, occurrence]);
  if (!clicked) throw new Error(`Could not find clickable text: ${text}`);
  await new Promise((resolve) => setTimeout(resolve, 50));
}

export async function clickButton(text: string, occurrence = 0): Promise<void> {
  await clickText(text, occurrence);
}

export async function fillInput(placeholder: string, value: string, occurrence = 0): Promise<void> {
  const ok = await page.evaluate(([needle, val, index]) => {
    const matches = Array.from(document.querySelectorAll('input')).filter((element) => element.getAttribute('placeholder') === needle);
    const target = matches[index] as HTMLInputElement | undefined;
    if (!target) return false;
    target.focus();
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
    setter?.call(target, val);
    target.dispatchEvent(new Event('input', { bubbles: true }));
    target.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  }, [placeholder, value, occurrence]);
  if (!ok) throw new Error(`Could not find input: ${placeholder}`);
}

export async function selectValue(index: number, value: string): Promise<void> {
  const ok = await page.evaluate(([i, val]) => {
    const select = document.querySelectorAll('select')[Number(i)] as HTMLSelectElement | undefined;
    if (!select) return false;
    select.value = String(val);
    select.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  }, [index, value]);
  if (!ok) throw new Error(`Could not find select ${index}`);
}

export async function bodyText(): Promise<string> {
  return page.evaluate(() => document.body.innerText);
}

export async function count(selector: string): Promise<number> {
  return page.$$eval(selector, (elements) => elements.length);
}

export async function auditLog(): Promise<Array<Record<string, unknown>>> {
  return page.evaluate(() => JSON.parse(localStorage.getItem('coghealth_audit_log') || '[]'));
}

export async function recordCase(id: number, area: string, title: string, testBody: () => Promise<void>): Promise<void> {
  const started = Date.now();
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const screenshotPath = path.join(SCREENSHOTS_DIR, `UAT-${id}-${slug}.png`);
  let status: UatResult['status'] = 'passed';
  let failureMessage: string | undefined;
  try {
    await testBody();
  } catch (error) {
    status = error instanceof UntestedCaseError ? 'untested' : 'failed';
    failureMessage = error instanceof Error ? error.message : String(error);
    if (!(error instanceof UntestedCaseError)) throw error;
  } finally {
    await page.screenshot({ path: screenshotPath, fullPage: true }).catch(() => undefined);
    results.push({ id, area, title, status, duration: Date.now() - started, failureMessage, screenshotPath });
    fs.mkdirSync(RESULTS_DIR, { recursive: true });
    fs.writeFileSync(path.join(RESULTS_DIR, 'uat-results.json'), JSON.stringify(results, null, 2));
  }
}

export function untested(id: number, area: string, title: string, reason: string): Promise<void> {
  void id;
  void area;
  void title;
  return Promise.reject(new UntestedCaseError(reason));
}

export function getPage(): Page {
  return page;
}
