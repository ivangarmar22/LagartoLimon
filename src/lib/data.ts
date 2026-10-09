import futbolRaw from '../data/generated/futbol.json';
import baloncestoRaw from '../data/generated/baloncesto.json';
import { extrasFutbol, plantillaBaloncesto } from '../data/club';
import { madridISO } from './utils';

type Side = { name: string; logo: string | null; us: boolean };
export type Match = {
  id: string | number;
  round: string;
  stage: string;
  knockout: boolean;
  date: string | null;
  venue: string | null;
  address?: string | null;
  isHome: boolean;
  bye: boolean;
  played: boolean;
  home: Side;
  away: Side;
  score: number[] | null;
  shootout: number[] | null;
  url?: string;
  competition?: string;
  sport?: 'futbol' | 'baloncesto';
  iso?: string | null;
};
type Row = {
  pos: number;
  team: string;
  logo: string | null;
  us: boolean;
  pj: number;
  g: number;
  e: number;
  p: number;
  gf: number;
  gc: number;
  dg: number;
  pts: number;
};
export type Table = { stage: string; group: string; zones: { from: number; to: number; title: string; color: string }[]; rows: Row[] };
type Stats = { pj: number; g: number; e: number; p: number; gf: number; gc: number };
export type Season = {
  id: number | string;
  name: string;
  active: boolean;
  url: string;
  teamUrl?: string;
  record: Stats;
  tables: Table[];
  matches: Match[];
  category?: string;
  stage?: string;
  group?: string;
  yearLabel?: string;
};
export type Player = {
  id: string | number;
  nombre: string;
  apellidos: string;
  dorsal: number | null;
  posicion: string;
  capitan: boolean;
  edad: number | null;
  altura: number | null;
  foto: string | null;
  apodo?: string;
};

const withIso = (m: Match, sport: 'futbol' | 'baloncesto', competition: string): Match => ({
  ...m,
  sport,
  competition,
  iso: madridISO(m.date),
});

export const futbol = (() => {
  // En MálagaF7 idSeason 7 es la temporada 26-27
  const seasons: Season[] = futbolRaw.seasons.map((s) => ({
    ...s,
    yearLabel: `${19 + s.idSeason}-${20 + s.idSeason}`,
    matches: s.matches.map((m) => withIso(m as Match, 'futbol', s.name)),
  }));
  const current = seasons.find((s) => s.id === futbolRaw.currentId) ?? seasons[0];
  const roster: Player[] = futbolRaw.roster.map((p) => {
    const extra = extrasFutbol[p.id] ?? {};
    return { ...p, edad: extra.edad ?? null, altura: null, foto: extra.foto ?? null, apodo: extra.apodo };
  });
  return { updatedAt: futbolRaw.updatedAt, source: futbolRaw.source, current, seasons, roster };
})();

export const baloncesto = (() => {
  const seasons: Season[] = baloncestoRaw.competitions.map((c) => ({
    ...c,
    yearLabel: seasonFromDates(c.matches.map((m) => m.date)),
    name: `${c.name} · ${c.category}`,
    active: true,
    matches: c.matches.map((m) => withIso(m as Match, 'baloncesto', c.name)),
  }));
  const roster: Player[] = plantillaBaloncesto.map((p, i) => ({
    id: i,
    nombre: p.nombre,
    apellidos: p.apellidos ?? '',
    dorsal: p.dorsal ?? null,
    posicion: p.posicion ?? 'Jugador',
    capitan: !!p.capitan,
    edad: null,
    altura: p.altura ?? null,
    foto: p.foto ?? null,
  }));
  roster.sort((a, b) => (a.dorsal ?? 999) - (b.dorsal ?? 999));
  return { updatedAt: baloncestoRaw.updatedAt, source: baloncestoRaw.source, current: seasons[0], seasons, roster };
})();

function seasonFromDates(dates: (string | null)[]) {
  const first = dates.filter(Boolean).sort()[0];
  const d = first ? new Date(first) : new Date();
  const start = d.getMonth() >= 7 ? d.getFullYear() : d.getFullYear() - 1;
  return `${String(start).slice(2)}-${String(start + 1).slice(2)}`;
}

export const upcoming = (matches: Match[]) => matches.filter((m) => !m.played && !m.bye);
export const results = (matches: Match[]) => matches.filter((m) => m.played && !m.bye);

/** Últimos resultados, el más reciente al final. */
export function form(matches: Match[], n = 5) {
  return results(matches)
    .filter((m) => m.date)
    .sort((a, b) => a.date!.localeCompare(b.date!))
    .slice(-n);
}

/** Fila del Lagarto en la tabla, solo si ya se ha jugado algún partido. */
export function ourRow(table?: Table) {
  if (!table || !table.rows.some((r) => r.pj > 0)) return undefined;
  return table.rows.find((r) => r.us);
}
