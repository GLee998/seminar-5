import { useEffect, useRef, useState } from 'react';
import { motion, useScroll, useSpring, useTransform, useMotionValueEvent } from 'framer-motion';
import Topo from './components/Topo.jsx';
import Register from './components/Register.jsx';
import { EVENT, GEAR, SUMMIT } from './config.js';
import { fetchCount, fmt, plural, store, testMode } from './lib.js';

const ease = [0.2, 0.8, 0.2, 1];

export default function App() {
  const [count, setCount] = useState(0);
  const refreshCount = () => fetchCount().then(setCount).catch(() => {});
  useEffect(() => { refreshCount(); }, []);

  return (
    <>
      <a className="skip" href="#register">Перейти к регистрации</a>
      <Topo />
      <Altimeter />
      <Hero />
      <main>
        <Route count={count} />
        <Verse />
        <Gear />
        <Register onRegistered={refreshCount} testMode={testMode} />
      </main>
      <footer className="foot wrap">
        <span>Молодёжь церкви «{EVENT.church}»</span>
        <span className="mono">Выезд №5, осень 2026</span>
      </footer>
    </>
  );
}

/* Высотомер: скролл страницы = подъём от 800 м до вершины 5 000 м */
function Altimeter() {
  const { scrollYProgress } = useScroll();
  const alt = useSpring(useTransform(scrollYProgress, [0, 1], [800, SUMMIT]), { stiffness: 120, damping: 24 });
  const ref = useRef(null);
  useMotionValueEvent(alt, 'change', v => { if (ref.current) ref.current.textContent = fmt.format(Math.round(v / 10) * 10); });
  const fill = useTransform(scrollYProgress, [0, 1], ['0%', '100%']);
  return (
    <div className="alti" aria-hidden="true">
      <svg viewBox="0 0 10 10"><path d="M5 1 9.5 9h-9Z" fill="currentColor" /></svg>
      <span ref={ref}>800</span><span className="alti-u">м</span>
      <motion.i style={{ width: fill }} />
    </div>
  );
}

function Hero() {
  const chars = EVENT.number.split('');
  return (
    <header className="hero">
      <div className="wrap hero-top">
        <span>Церковь «{EVENT.church}»</span>
        <span className="mono">{EVENT.datesShort}</span>
      </div>

      <div className="wrap hero-main">
        <motion.p className="hero-kicker" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9, duration: 0.7, ease }}>
          Пятый осенний выезд молодёжи
        </motion.p>

        <h1 className="hero-title" aria-label={`${EVENT.number} ${EVENT.name}`}>
          <span className="hero-num" aria-hidden="true">
            {chars.map((c, i) => (
              <span className={'digit' + (c === '.' ? ' dot' : '')} key={i}>
                <motion.span initial={{ y: '105%' }} animate={{ y: 0 }} transition={{ delay: 0.15 + i * 0.09, duration: 1, ease }}>{c}</motion.span>
              </span>
            ))}
          </span>
          <motion.span className="hero-name" aria-hidden="true"
            initial={{ opacity: 0, letterSpacing: '0.2em' }} animate={{ opacity: 1, letterSpacing: '0em' }}
            transition={{ delay: 0.55, duration: 1.1, ease }}>
            {EVENT.name.split(' ').map(w => <span key={w}>{w}</span>)}
          </motion.span>
        </h1>

        <motion.div className="hero-foot" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.05, duration: 0.7, ease }}>
          <p className="hero-lead">{EVENT.datesLong}. Две ночи за городом, чтобы подняться выше — вместе.</p>
          <div className="hero-cta">
            <motion.a className="btn btn-sun" href="#register" whileTap={{ scale: 0.97 }}>
              Записаться на выезд
            </motion.a>
            <span className="hero-price"><b>{fmt.format(EVENT.price)}</b>&nbsp;сом</span>
          </div>
        </motion.div>
      </div>
    </header>
  );
}

/* Профиль маршрута: три дня как три точки на склоне */
function Profile() {
  const days = [
    { x: 24, y: 112, d: 'Пт', date: '30.10', note: 'выезд' },
    { x: 172, y: 58, d: 'Сб', date: '31.10', note: '' },
    { x: 316, y: 26, d: 'Вс', date: '01.11', note: 'вершина' },
  ];
  const line = 'M0 124 C40 118 60 104 90 96 S140 70 172 58 S236 52 262 40 S300 24 340 20';
  return (
    <figure className="profile">
      <svg viewBox="0 0 340 160" role="img" aria-label="Маршрут выезда: пятница 30 октября, суббота 31 октября, воскресенье 1 ноября">
        <defs>
          <linearGradient id="pf" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--sun)" stopOpacity=".35" />
            <stop offset="1" stopColor="var(--sun)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <motion.path d={line + ' V140 H0Z'} fill="url(#pf)" initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ duration: 1, delay: 0.6 }} />
        <motion.path d={line} fill="none" stroke="var(--sun)" strokeWidth="2.5" strokeLinecap="round"
          initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }} viewport={{ once: true, margin: '-60px' }} transition={{ duration: 1.6, ease }} />
        <line x1="0" y1="140.5" x2="340" y2="140.5" stroke="var(--line)" />
        {days.map((p, i) => (
          <motion.g key={p.d} initial={{ opacity: 0, y: 6 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.5 + i * 0.4 }}>
            <line x1={p.x} y1={p.y} x2={p.x} y2="140" stroke="var(--line-strong)" strokeDasharray="2 3" />
            <circle cx={p.x} cy={p.y} r="5" fill="var(--ultra)" stroke="var(--sun)" strokeWidth="2.5" />
            <text x={p.x} y="155" textAnchor={i === 0 ? 'start' : i === 2 ? 'end' : 'middle'} className="pf-t">{p.d} {p.date}</text>
            {p.note && <text x={p.x + (i === 2 ? -10 : 10)} y={p.y - 10} textAnchor={i === 2 ? 'end' : 'start'} className="pf-n">{p.note}</text>}
          </motion.g>
        ))}
      </svg>
    </figure>
  );
}

function Countdown() {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 60000); return () => clearInterval(t); }, []);
  const ms = EVENT.start - now;
  if (ms <= 0) return <p className="count"><span>Мы уже в пути</span></p>;
  const d = Math.floor(ms / 864e5), h = Math.floor(ms / 36e5) % 24;
  return (
    <p className="count">
      <span>До старта</span>
      {d > 0 && <b>{d}<small>{plural(d, 'день', 'дня', 'дней')}</small></b>}
      <b>{h}<small>{plural(h, 'час', 'часа', 'часов')}</small></b>
    </p>
  );
}

function Route({ count }) {
  return (
    <section className="sec wrap" aria-labelledby="route-h">
      <h2 id="route-h">Маршрут</h2>
      <Profile />
      <dl className="facts">
        <div><dt>Когда</dt><dd>{EVENT.datesLong}<small>{EVENT.weekdays}</small></dd></div>
        <div><dt>Взнос</dt><dd>{fmt.format(EVENT.price)}&nbsp;сом<small>две ночи, по {fmt.format(EVENT.perNight)}&nbsp;сом</small></dd></div>
        <div><dt>Сбор</dt><dd>В WhatsApp-группе<small>ссылка откроется после регистрации</small></dd></div>
        <div><dt>Кто едет</dt><dd>Молодёжь и друзья<small>младше 18 — с согласия родителей</small></dd></div>
      </dl>
      <div className="route-foot">
        <Countdown />
        {count > 0 && <p className="going"><b>{count}</b> {plural(count, 'человек уже записался', 'человека уже записались', 'человек уже записались')}</p>}
      </div>
    </section>
  );
}

function Verse() {
  return (
    <section className="sec verse-sec" aria-label="Стих">
      <div className="wrap">
        <motion.blockquote className="verse" initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-80px' }} transition={{ duration: 0.9, ease }}>
          <p>Надеющиеся на Господа обновятся в силе: поднимут крылья, как орлы</p>
          <cite>Исаия 40:31</cite>
        </motion.blockquote>
      </div>
    </section>
  );
}

function Gear() {
  const [packed, setPacked] = useState(() => store.get('atm5_pack', []));
  const toggle = i => setPacked(p => { const n = p.includes(i) ? p.filter(x => x !== i) : [...p, i]; store.set('atm5_pack', n); return n; });
  return (
    <section className="sec wrap" aria-labelledby="gear-h">
      <div className="gear-head">
        <h2 id="gear-h">Снаряжение</h2>
        <span className="mono gear-n" aria-live="polite">{packed.length}/{GEAR.length}</span>
      </div>
      <ul className="gear">
        {GEAR.map((g, i) => {
          const on = packed.includes(i);
          return (
            <li key={g}>
              <motion.button type="button" aria-pressed={on} onClick={() => toggle(i)} whileTap={{ scale: 0.96 }} layout="position">
                <span className="box" aria-hidden="true">
                  <motion.svg viewBox="0 0 16 16" initial={false} animate={{ opacity: on ? 1 : 0, scale: on ? 1 : 0.4 }}>
                    <path d="m3 8.5 3 3 7-7" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                  </motion.svg>
                </span>
                {g}
              </motion.button>
            </li>
          );
        })}
      </ul>
      <p className="hint">Отмечай, что уже в рюкзаке. Список сохранится на этом телефоне.</p>
    </section>
  );
}
