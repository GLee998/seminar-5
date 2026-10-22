/* Всё, что может поменяться, — здесь. */

// URL веб-приложения Google Apps Script (см. README). Пусто — тестовый режим.
export const SCRIPT_URL = '';

export const EVENT = {
  number: '5.0',
  name: 'Духовный подъём',
  church: 'Источник Пробуждения',
  start: new Date('2026-10-30T08:00:00+06:00'),
  datesLong: '30 октября – 1 ноября',
  datesShort: '30.10 – 01.11',
  weekdays: 'с пятницы по воскресенье',
  price: 4000,
  perNight: 2000,
  whatsapp: 'https://chat.whatsapp.com/EfF39gVnlfP6N1BDmIS18H',
};

// Лагеря восхождения = шаги регистрации. Вершина — 5 000 м, как «5.0».
export const CAMPS = [
  { name: 'Базовый лагерь', alt: 1500 },
  { name: 'Лагерь I', alt: 2800 },
  { name: 'Лагерь II', alt: 4000 },
  { name: 'Штурм вершины', alt: 4700 },
];
export const SUMMIT = 5000;

export const GEAR = [
  'Библию и блокнот', 'Тёплую куртку', 'Шапку и перчатки', 'Сменную обувь',
  'Зубную щётку и полотенце', 'Зарядку', 'Свои лекарства', 'Кружку для чая',
];
