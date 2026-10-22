import { Fragment, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CAMPS, EVENT, SUMMIT } from '../config.js';
import { fmt, maskPhone, phoneOk, store, submitRegistration } from '../lib.js';

const ease = [0.2, 0.8, 0.2, 1];
const EMPTY = { firstName: '', lastName: '', age: '', phone: '', parentName: '', parentPhone: '', church: '', firstTime: '', health: '', payment: '', comment: '', agree: false };
const DRAFT_KEY = 'atm5_draft';

const isMinor = v => +v.age > 0 && +v.age < 18;
const RULES = [
  { firstName: v => v.firstName.trim().length > 1, lastName: v => v.lastName.trim().length > 1, age: v => +v.age >= 10 && +v.age <= 60 },
  { phone: v => phoneOk(v.phone), parentName: v => !isMinor(v) || v.parentName.trim().length > 1, parentPhone: v => !isMinor(v) || phoneOk(v.parentPhone) },
  { firstTime: v => !!v.firstTime },
  { payment: v => !!v.payment, agree: v => v.agree },
];
const MSG = {
  firstName: 'Напиши своё имя', lastName: 'Напиши фамилию', age: 'Укажи возраст цифрами, от 10 до 60',
  phone: 'Нужен номер в формате +996 XXX XXX XXX', parentName: 'Напиши имя мамы или папы', parentPhone: 'Нужен номер родителя в формате +996 XXX XXX XXX',
  firstTime: 'Выбери один из вариантов', payment: 'Выбери способ оплаты', agree: 'Поставь галочку, чтобы отправить заявку',
};
const TITLES = ['Давай знакомиться', 'Как с тобой связаться', 'Немного о тебе', `Взнос ${fmt.format(EVENT.price)} сом`];

export default function Register({ onRegistered, testMode }) {
  const [v, setV] = useState(() => ({ ...EMPTY, ...store.get(DRAFT_KEY, {}), agree: false }));
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [errs, setErrs] = useState({});
  const [status, setStatus] = useState('idle'); // idle | sending | error
  const [done, setDone] = useState(null);
  const cardRef = useRef(null);
  const headRef = useRef(null);
  const moved = useRef(false);

  useEffect(() => { if (!done) store.set(DRAFT_KEY, { ...v, agree: false }); }, [v, done]);

  // после смены шага: карточку в зону видимости, фокус на заголовок шага (клавиатура не выскакивает)
  useEffect(() => {
    if (!moved.current) return;
    const card = cardRef.current;
    if (card && card.getBoundingClientRect().top < 0) card.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [step, done]);
  const focusHead = () => { if (moved.current) headRef.current?.focus({ preventScroll: true }); };

  const set = k => e => {
    let val = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    if (k === 'phone' || k === 'parentPhone') val = maskPhone(val);
    if (k === 'age') val = val.replace(/\D/g, '').slice(0, 2);
    setV(s => ({ ...s, [k]: val }));
    if (errs[k]) setErrs(s => ({ ...s, [k]: undefined }));
  };

  const go = (n, d = n > step ? 1 : -1) => { moved.current = true; setDir(d); setErrs({}); setStatus('idle'); setStep(n); };

  function validate() {
    const e = {};
    for (const [k, ok] of Object.entries(RULES[step])) if (!ok(v)) e[k] = MSG[k];
    setErrs(e);
    const first = Object.keys(e)[0];
    if (first) requestAnimationFrame(() => document.getElementById(first === 'firstTime' || first === 'payment' ? `${first}-0` : first)?.focus());
    return !first;
  }

  const payload = () => {
    const m = isMinor(v);
    return {
      firstName: v.firstName.trim(), lastName: v.lastName.trim(), age: v.age, phone: v.phone,
      parentName: m ? v.parentName.trim() : '', parentPhone: m ? v.parentPhone : '',
      church: v.church.trim(), firstTime: v.firstTime, health: v.health.trim(), payment: v.payment, comment: v.comment.trim(),
    };
  };

  async function onSubmit(e) {
    e.preventDefault();
    if (status === 'sending' || !validate()) return;
    if (step < 3) return go(step + 1, 1);
    setStatus('sending');
    try {
      const d = payload();
      const number = await submitRegistration(d);
      store.del(DRAFT_KEY);
      moved.current = true;
      setDone({ ...d, number });
      setStatus('idle');
      onRegistered?.();
    } catch {
      setStatus('error');
    }
  }

  // Enter в поле → следующее поле шага
  function onKeyDown(e) {
    if (e.key !== 'Enter' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'BUTTON') return;
    const list = [...e.currentTarget.querySelectorAll('input[type=text], input[type=tel]')];
    const i = list.indexOf(e.target);
    if (i > -1 && i < list.length - 1) { e.preventDefault(); list[i + 1].focus(); }
  }

  function reset() { setV({ ...EMPTY }); setDone(null); go(0, -1); }

  const inp = (k, props = {}) => ({
    id: k, name: k, value: v[k], onChange: set(k),
    'aria-invalid': errs[k] ? true : undefined, 'aria-describedby': errs[k] ? `${k}-msg` : undefined, ...props,
  });

  return (
    <section id="register" className="sec reg" aria-labelledby="reg-h">
      <div className="wrap">
        <h2 id="reg-h">Регистрация</h2>
        <div className="card" ref={cardRef}>
          {testMode && <p className="testmode">Тестовый режим: заявки сохраняются только в этом браузере</p>}
          <CampMap step={done ? 4 : step} />

          <AnimatePresence mode="wait" initial={false}>
            {done ? (
              <Summit key="summit" data={done} headRef={headRef} onShown={focusHead} onAgain={reset} />
            ) : (
              <motion.form key="form" noValidate onSubmit={onSubmit} onKeyDown={onKeyDown}
                exit={{ opacity: 0, y: -16, transition: { duration: 0.25 } }}>
                <div className="steps">
                  <AnimatePresence mode="wait" initial={false} custom={dir}>
                    <motion.div key={step} className="step" custom={dir}
                      variants={{ enter: d => ({ opacity: 0, x: d * 28 }), center: { opacity: 1, x: 0 }, exit: d => ({ opacity: 0, x: d * -28 }) }}
                      initial="enter" animate="center" exit="exit" transition={{ duration: 0.32, ease }}
                      onAnimationComplete={def => def === 'center' && focusHead()}>
                      <p className="step-meta mono">Шаг {step + 1} из 4 <span>{CAMPS[step].name}, {fmt.format(CAMPS[step].alt)} м</span></p>
                      <h3 ref={headRef} tabIndex={-1}>{TITLES[step]}</h3>

                      {step === 0 && <>
                        <Field id="firstName" label="Имя" error={errs.firstName}>
                          <input type="text" autoComplete="given-name" autoCapitalize="words" enterKeyHint="next" {...inp('firstName')} />
                        </Field>
                        <Field id="lastName" label="Фамилия" error={errs.lastName}>
                          <input type="text" autoComplete="family-name" autoCapitalize="words" enterKeyHint="next" {...inp('lastName')} />
                        </Field>
                        <Field id="age" label="Возраст" error={errs.age} className="f-age">
                          <input type="text" inputMode="numeric" pattern="[0-9]*" maxLength={2} autoComplete="off" enterKeyHint="next" {...inp('age')} />
                        </Field>
                      </>}

                      {step === 1 && <>
                        <Field id="phone" label="Телефон" error={errs.phone} help="На этот номер пастыри напишут в WhatsApp">
                          <input type="tel" inputMode="tel" autoComplete="tel" spellCheck={false} placeholder="+996 700 123 456" enterKeyHint="next" {...inp('phone')} />
                        </Field>
                        {isMinor(v) && (
                          <motion.div className="parent" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} transition={{ duration: 0.35, ease }}>
                            <p className="lead">Тебе меньше 18, поэтому нужен контакт родителя. Пастыри созвонятся с ним перед выездом.</p>
                            <Field id="parentName" label="Имя родителя" error={errs.parentName}>
                              <input type="text" autoComplete="off" autoCapitalize="words" enterKeyHint="next" {...inp('parentName')} />
                            </Field>
                            <Field id="parentPhone" label="Телефон родителя" error={errs.parentPhone}>
                              <input type="tel" inputMode="tel" autoComplete="off" spellCheck={false} placeholder="+996 555 000 111" enterKeyHint="done" {...inp('parentPhone')} />
                            </Field>
                          </motion.div>
                        )}
                      </>}

                      {step === 2 && <>
                        <Field id="church" label="Из какой ты домашки" opt="если есть">
                          <input type="text" autoComplete="off" placeholder="Например, домашка Ирины…" enterKeyHint="next" {...inp('church')} />
                        </Field>
                        <Chips name="firstTime" legend="Едешь на семинар впервые?" value={v.firstTime} onChange={set('firstTime')} error={errs.firstTime}
                          options={[{ value: 'Да, впервые', label: 'Да, впервые' }, { value: 'Уже ездил(а)', label: 'Уже ездил(а)' }]} />
                        <Field id="health" label="Аллергии, здоровье, питание" opt="если важно">
                          <textarea autoComplete="off" placeholder="Например, не ем мясо или аллергия на орехи…" {...inp('health')} />
                        </Field>
                      </>}

                      {step === 3 && <>
                        <Chips name="payment" legend="Как оплатишь" col value={v.payment} onChange={set('payment')} error={errs.payment}
                          options={[
                            { value: 'Наличными пастырю', label: 'Наличными пастырю', hint: 'до выезда, в церкви или на домашке' },
                            { value: 'Переводом', label: 'Переводом', hint: 'реквизиты в WhatsApp-группе' },
                            { value: 'Уже оплатил(а)', label: 'Уже оплатил(а)' },
                            { value: 'Хочу обсудить', label: 'Хочу обсудить с пастырем', hint: 'если сейчас сложно с оплатой — напиши, поговорим' },
                          ]} />
                        <Field id="comment" label="Вопрос или пожелание" opt="необязательно">
                          <textarea autoComplete="off" {...inp('comment')} />
                        </Field>
                        <Summary v={v} onEdit={n => go(n, -1)} />
                        <div className={'field' + (errs.agree ? ' err' : '')}>
                          <label className="check">
                            <input type="checkbox" {...inp('agree')} value={undefined} checked={v.agree} />
                            <span>Я согласен(на), что пастыри используют мои данные только для организации выезда</span>
                          </label>
                          {errs.agree && <p className="msg" id="agree-msg">{errs.agree}</p>}
                        </div>
                      </>}
                    </motion.div>
                  </AnimatePresence>
                </div>

                <div className="nav">
                  {step > 0 && <motion.button type="button" className="btn btn-ghost" onClick={() => go(step - 1, -1)} disabled={status === 'sending'} whileTap={{ scale: 0.97 }}>Назад</motion.button>}
                  <motion.button type="submit" className="btn btn-ink" aria-busy={status === 'sending'} disabled={status === 'sending'} whileTap={{ scale: 0.97 }}>
                    {status === 'sending' && <span className="spin" aria-hidden="true" />}
                    {status === 'sending' ? 'Отправляем…' : step === 3 ? 'Отправить заявку' : 'Дальше'}
                  </motion.button>
                </div>
                <div aria-live="assertive">
                  {status === 'error' && <p className="formerr">Заявка не отправилась — похоже, пропал интернет. Данные сохранены, нажми «Отправить заявку» ещё раз.</p>}
                </div>
              </motion.form>
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}

function Field({ id, label, opt, help, error, className = '', children }) {
  return (
    <div className={`field ${className}${error ? ' err' : ''}`}>
      <label htmlFor={id}>{label}{opt && <span className="opt"> ({opt})</span>}</label>
      {children}
      {help && <p className="help">{help}</p>}
      {error && <p className="msg" id={`${id}-msg`}>{error}</p>}
    </div>
  );
}

function Chips({ name, legend, options, value, onChange, error, col }) {
  return (
    <fieldset className={'field' + (error ? ' err' : '')}>
      <legend>{legend}</legend>
      <div className={'chips' + (col ? ' col' : '')}>
        {options.map((o, i) => (
          <Fragment key={o.value}>
            <input type="radio" id={`${name}-${i}`} name={name} value={o.value} checked={value === o.value} onChange={onChange}
              aria-invalid={error ? true : undefined} aria-describedby={error ? `${name}-msg` : undefined} />
            <label htmlFor={`${name}-${i}`}>{o.label}{o.hint && <small>{o.hint}</small>}</label>
          </Fragment>
        ))}
      </div>
      {error && <p className="msg" id={`${name}-msg`}>{error}</p>}
    </fieldset>
  );
}

function Summary({ v, onEdit }) {
  const rows = [['Имя', `${v.firstName} ${v.lastName}`, 0], ['Возраст', v.age, 0], ['Телефон', v.phone, 1]];
  if (isMinor(v)) rows.push(['Родитель', `${v.parentName}, ${v.parentPhone}`, 1]);
  if (v.church.trim()) rows.push(['Домашка', v.church, 2]);
  return (
    <div className="summary">
      <p className="summary-h">Проверь данные. Нажми на строку, чтобы исправить</p>
      {rows.map(([k, val, s]) => (
        <button type="button" key={k} onClick={() => onEdit(s)} aria-label={`${k}: ${val}. Изменить`}>
          <span className="k">{k}</span><span className="v">{val}</span><span className="e" aria-hidden="true">изменить</span>
        </button>
      ))}
    </div>
  );
}

/* Мини-карта восхождения: 4 лагеря + вершина, точка-альпинист идёт по шагам */
function CampMap({ step }) {
  const pts = [...CAMPS.map(c => c.alt), SUMMIT].map((alt, i) => ({ x: 14 + i * 68, y: 58 - ((alt - 1000) / 4000) * 46 }));
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${p.x} ${p.y}`).join(' ');
  const done = pts.slice(0, step + 1).map((p, i) => `${i ? 'L' : 'M'}${p.x} ${p.y}`).join(' ');
  const cur = pts[Math.min(step, 4)];
  return (
    <svg className="campmap" viewBox="0 0 300 72" aria-hidden="true">
      <path d={d} fill="none" stroke="var(--ink-line)" strokeWidth="2" strokeDasharray="3 4" />
      <motion.path d={done} fill="none" stroke="var(--ink)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
        initial={false} animate={{ d: done }} transition={{ duration: 0.5, ease }} />
      {pts.slice(0, 4).map((p, i) => <circle key={i} cx={p.x} cy={p.y} r="4" fill={i <= step ? 'var(--ink)' : 'var(--snow)'} stroke="var(--ink)" strokeWidth="1.5" />)}
      <g transform={`translate(${pts[4].x} ${pts[4].y})`}>
        <path d="M0 0V-16" stroke="var(--ink)" strokeWidth="1.5" />
        <path d="M0 -16h11l-3 4 3 4H0" fill={step >= 4 ? 'var(--sun-deep)' : 'var(--ink-line)'} />
      </g>
      <motion.circle r="7" fill="var(--sun)" stroke="var(--ink)" strokeWidth="2" initial={false}
        animate={{ cx: cur.x, cy: cur.y }} transition={{ type: 'spring', stiffness: 160, damping: 18 }} />
    </svg>
  );
}

function Summit({ data, headRef, onShown, onAgain }) {
  return (
    <motion.div className="summit" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease }} onAnimationComplete={onShown}>
      <p className="step-meta mono">Высота {fmt.format(SUMMIT)} м</p>
      <h3 ref={headRef} tabIndex={-1}>Ты на вершине, {data.firstName}!</h3>

      <motion.div className="pass" initial={{ rotate: -2, scale: 0.94, opacity: 0 }} animate={{ rotate: 0, scale: 1, opacity: 1 }} transition={{ delay: 0.15, type: 'spring', stiffness: 140, damping: 14 }}>
        <div className="pass-top">
          <span className="pass-ev"><small className="pass-theme">{EVENT.theme}</small>{EVENT.number}<small>{EVENT.name}</small></span>
          <span className="pass-no mono">№&nbsp;{data.number ?? '—'}</span>
        </div>
        <p className="pass-name">{data.firstName} {data.lastName}</p>
        <div className="pass-meta mono">
          <div><span>Даты</span>{EVENT.datesShort}</div>
          <div><span>Взнос</span>{fmt.format(EVENT.price)} сом</div>
          <div><span>Место</span>{EVENT.place}</div>
        </div>
      </motion.div>

      <p className="after">Последний шаг — вступи в WhatsApp-группу. Там время и место сбора, реквизиты для оплаты и все новости выезда.</p>
      <motion.a className="wa" href={EVENT.whatsapp} target="_blank" rel="noopener" whileTap={{ scale: 0.98 }}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.5-.3Z" /></svg>
        <span>Вступить в группу выезда<small>откроется WhatsApp</small></span>
      </motion.a>
      <p className="after small">Сделай скриншот пропуска, чтобы не потерять.</p>
      <button type="button" className="btn btn-ghost wide" onClick={onAgain}>Записать ещё одного человека</button>
    </motion.div>
  );
}
