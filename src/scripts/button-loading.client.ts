import { isInternalNavLink, readLinkInfo } from '../lib/ui/loading';

type ButtonLike = HTMLButtonElement | HTMLAnchorElement;

const SPINNER_SVG =
  '<svg class="qa-spinner" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
  '<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2.4" ' +
  'stroke-linecap="round" stroke-dasharray="42 100" />' +
  '</svg>';

const NAV_SAFETY_MS = 8000;
const SUCCESS_REVERT_MS = 1200;
const ERROR_REVERT_MS = 1500;

interface StoredState {
  children: Node[];
  minWidth: string;
  minHeight: string;
  ariaBusy: string | null;
  ariaDisabled: string | null;
  disabled: boolean;
  pointerEvents: string;
  timer?: number;
}

const STATE = new WeakMap<ButtonLike, StoredState>();

function isExcluded(el: Element): boolean {
  return el.closest('[data-no-loading]') !== null;
}

function isOptedIn(el: Element): el is ButtonLike {
  if (!(el instanceof HTMLButtonElement) && !(el instanceof HTMLAnchorElement)) return false;
  if (isExcluded(el)) return false;
  if (el.hasAttribute('data-loading')) return true;
  if (el instanceof HTMLButtonElement && el.type === 'submit' && el.form) return true;
  return false;
}

function enterLoading(el: ButtonLike): void {
  if (STATE.has(el)) return;
  const stored: StoredState = {
    children: Array.from(el.childNodes),
    minWidth: el.style.minWidth,
    minHeight: el.style.minHeight,
    ariaBusy: el.getAttribute('aria-busy'),
    ariaDisabled: el.getAttribute('aria-disabled'),
    disabled: el instanceof HTMLButtonElement ? el.disabled : false,
    pointerEvents: el.style.pointerEvents,
  };
  const rect = el.getBoundingClientRect();
  el.style.minWidth = `${Math.round(rect.width)}px`;
  el.style.minHeight = `${Math.round(rect.height)}px`;
  el.dataset.state = 'loading';
  el.setAttribute('aria-busy', 'true');
  if (el instanceof HTMLButtonElement) el.disabled = true;
  else {
    el.setAttribute('aria-disabled', 'true');
    el.style.pointerEvents = 'none';
  }
  el.replaceChildren();
  const sr = document.createElement('span');
  sr.className = 'sr-only';
  sr.dataset.stateLabel = '';
  sr.textContent = 'Loading';
  const wrap = document.createElement('span');
  wrap.innerHTML = SPINNER_SVG;
  el.append(sr, wrap.firstElementChild as Element);
  STATE.set(el, stored);
}

function showTerminal(
  el: ButtonLike,
  text: string,
  finalState: 'success' | 'error',
  revertMs: number,
): void {
  const stored = STATE.get(el);
  if (!stored) return;
  el.dataset.state = finalState;
  el.removeAttribute('aria-busy');
  el.replaceChildren();
  const sr = document.createElement('span');
  sr.className = 'sr-only';
  sr.dataset.stateLabel = '';
  sr.textContent = finalState === 'success' ? 'Success' : 'Failed';
  const visible = document.createElement('span');
  visible.textContent = text;
  el.append(sr, visible);
  stored.timer = window.setTimeout(() => revert(el), revertMs);
}

function revert(el: ButtonLike): void {
  const stored = STATE.get(el);
  if (!stored) return;
  if (stored.timer) clearTimeout(stored.timer);
  el.replaceChildren(...stored.children);
  delete el.dataset.state;
  if (stored.ariaBusy === null) el.removeAttribute('aria-busy');
  else el.setAttribute('aria-busy', stored.ariaBusy);
  if (el instanceof HTMLButtonElement) el.disabled = stored.disabled;
  else {
    if (stored.ariaDisabled === null) el.removeAttribute('aria-disabled');
    else el.setAttribute('aria-disabled', stored.ariaDisabled);
    el.style.pointerEvents = stored.pointerEvents;
  }
  el.style.minWidth = stored.minWidth;
  el.style.minHeight = stored.minHeight;
  STATE.delete(el);
}

async function withButtonState<T>(
  btn: HTMLButtonElement,
  fn: () => Promise<T>,
): Promise<T | undefined> {
  if (STATE.has(btn)) return undefined;
  enterLoading(btn);
  try {
    const result = await fn();
    showTerminal(btn, btn.dataset.successLabel ?? '✓', 'success', SUCCESS_REVERT_MS);
    return result;
  } catch (err) {
    showTerminal(btn, btn.dataset.errorLabel ?? 'Failed', 'error', ERROR_REVERT_MS);
    throw err;
  }
}

interface FetchOkError extends Error {
  status: number;
  body: string;
}

async function fetchOk(input: RequestInfo, init?: RequestInit): Promise<Response> {
  const r = await fetch(input, init);
  if (!r.ok) {
    const body = await r.text().catch(() => '');
    const err = new Error(`HTTP ${r.status} ${r.statusText}`.trim()) as FetchOkError;
    err.status = r.status;
    err.body = body;
    throw err;
  }
  return r;
}

let navTimer: number | undefined;

function armNavSafety(): void {
  if (navTimer) clearTimeout(navTimer);
  navTimer = window.setTimeout(() => {
    document
      .querySelectorAll<HTMLAnchorElement | HTMLButtonElement>(
        'a[data-state="loading"],button[data-state="loading"]',
      )
      .forEach(revert);
  }, NAV_SAFETY_MS);
}

function handleClick(e: MouseEvent): void {
  if (e.defaultPrevented) return;
  if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
  const target = (e.target as Element | null)?.closest<ButtonLike>('a,button');
  if (!target) return;
  if (target.dataset.state === 'loading') {
    if (target instanceof HTMLAnchorElement) e.preventDefault();
    return;
  }
  if (!isOptedIn(target)) return;
  if (target instanceof HTMLAnchorElement) {
    if (!isInternalNavLink(readLinkInfo(target), location.origin)) return;
    enterLoading(target);
    armNavSafety();
  }
}

function handleSubmit(e: SubmitEvent): void {
  const form = e.target as HTMLFormElement;
  if (!(form instanceof HTMLFormElement)) return;
  const submitter = e.submitter;
  let btn: HTMLButtonElement | null = null;
  if (submitter instanceof HTMLButtonElement && submitter.type === 'submit') btn = submitter;
  else btn = form.querySelector<HTMLButtonElement>('button[type="submit"]');
  if (!btn) return;
  if (isExcluded(btn)) return;
  enterLoading(btn);
  armNavSafety();
}

function clearAllLoading(): void {
  document
    .querySelectorAll<ButtonLike>('a[data-state="loading"],button[data-state="loading"]')
    .forEach(revert);
  if (navTimer) {
    clearTimeout(navTimer);
    navTimer = undefined;
  }
}

document.addEventListener('click', handleClick, true);
document.addEventListener('submit', handleSubmit, true);
document.addEventListener('astro:after-swap', clearAllLoading);
window.addEventListener('pageshow', clearAllLoading);
window.addEventListener('pagehide', clearAllLoading);

declare global {
  interface Window {
    qaButton: {
      withState: typeof withButtonState;
      fetchOk: typeof fetchOk;
    };
  }
}

window.qaButton = { withState: withButtonState, fetchOk };
