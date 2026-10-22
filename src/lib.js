import { SCRIPT_URL } from './config.js';

export const store = {
  get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
  del(k) { try { localStorage.removeItem(k); } catch {} },
};

export const plural = (n, a, b, c) => {
  n = Math.abs(n) % 100; const m = n % 10;
  return n > 10 && n < 20 ? c : m > 1 && m < 5 ? b : m === 1 ? a : c;
};

export const fmt = new Intl.NumberFormat('ru-RU');

/* +996 XXX XXX XXX: принимаем 0700…, 700…, 996700… */
export function maskPhone(raw) {
  let d = raw.replace(/\D/g, '');
  if (d.startsWith('0')) d = '996' + d.slice(1);
  if (d && !d.startsWith('996')) d = '996' + d;
  d = d.slice(0, 12);
  const p = [d.slice(0, 3), d.slice(3, 6), d.slice(6, 9), d.slice(9, 12)].filter(Boolean);
  return p.length ? '+' + p.join(' ') : '';
}
export const phoneOk = v => v.replace(/\D/g, '').length === 12;

export const testMode = !SCRIPT_URL;

export async function fetchCount() {
  if (testMode) return store.get('atm5_test_regs', []).length;
  const r = await fetch(SCRIPT_URL);
  return (await r.json()).count;
}

export async function submitRegistration(data) {
  if (testMode) {
    await new Promise(r => setTimeout(r, 800));
    const list = store.get('atm5_test_regs', []);
    list.push({ ...data, ts: new Date().toISOString() });
    store.set('atm5_test_regs', list);
    console.table(list);
    return list.length;
  }
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 20000);
  try {
    // text/plain — простой запрос без CORS-preflight, Apps Script его принимает
    const r = await fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify(data), signal: ctrl.signal });
    const j = await r.json();
    if (!j.ok) throw new Error(j.error || 'bad response');
    return j.number;
  } finally {
    clearTimeout(t);
  }
}
