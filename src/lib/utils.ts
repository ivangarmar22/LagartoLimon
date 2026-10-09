/** Ruta interna con el `base` de GitHub Pages. */
export function url(path = '') {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  return `${base}/${path.replace(/^\//, '')}`;
}

export function isActive(current: string, path: string) {
  const norm = (p: string) => p.replace(/\/+$/, '') || '/';
  const target = norm(url(path));
  const here = norm(current);
  return target === norm(url('')) ? here === target : here === target || here.startsWith(`${target}/`);
}

function parts(naive: string) {
  const m = naive.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  return m ? { y: +m[1], mo: +m[2], d: +m[3], h: +m[4], mi: +m[5] } : null;
}

/** "YYYY-MM-DDTHH:mm" en hora de Málaga -> ISO con su desfase horario. */
export function madridISO(naive: string | null) {
  const p = naive ? parts(naive) : null;
  if (!p) return null;
  const offset = new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Madrid', timeZoneName: 'longOffset' })
    .formatToParts(new Date(Date.UTC(p.y, p.mo - 1, p.d, p.h, p.mi)))
    .find((x) => x.type === 'timeZoneName')!
    .value.replace('GMT', '');
  return `${naive!.slice(0, 16)}:00${offset || '+00:00'}`;
}

const DAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const DAYS_LONG = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const MONTHS_LONG = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];

export function dateBits(naive: string | null) {
  const p = naive ? parts(naive) : null;
  if (!p) return null;
  const dow = new Date(Date.UTC(p.y, p.mo - 1, p.d)).getUTCDay();
  return {
    day: String(p.d).padStart(2, '0'),
    dow: DAYS[dow],
    month: MONTHS[p.mo - 1],
    time: `${String(p.h).padStart(2, '0')}:${String(p.mi).padStart(2, '0')}`,
    long: `${DAYS_LONG[dow]} ${p.d} de ${MONTHS_LONG[p.mo - 1]}`,
  };
}

export function formatUpdated(iso: string) {
  return new Intl.DateTimeFormat('es-ES', {
    timeZone: 'Europe/Madrid',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

/** Victoria, empate o derrota del Lagarto; los penaltis deshacen el empate. */
export function outcome(m: { played: boolean; bye: boolean; isHome: boolean; score: number[] | null; shootout: number[] | null }) {
  if (!m.played || m.bye || !m.score) return null;
  const [h, a] = m.score;
  const [us, them] = m.isHome ? [h, a] : [a, h];
  if (us !== them) return us > them ? 'W' : 'L';
  if (!m.shootout) return 'D';
  const [sh, sa] = m.shootout;
  return (m.isHome ? sh > sa : sa > sh) ? 'W' : 'L';
}

export const initials = (s: string) =>
  s
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
