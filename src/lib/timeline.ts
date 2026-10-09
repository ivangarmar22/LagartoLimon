import { hitos } from '../data/club';
import { futbol, baloncesto, ourRow, type Season } from './data';

type Hito = {
  year: string;
  sort: number;
  titulo: string;
  texto: string;
  tag?: string;
  deporte?: 'futbol' | 'baloncesto';
};

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
// Las ligas a veces escriben los grupos en mayúsculas: "MÁLAGA ESTE" -> "Málaga Este"
const soft = (s: string) => (s === s.toUpperCase() ? s.toLowerCase().replace(/(^|\s)(\p{L})/gu, (_, a, b) => a + b.toUpperCase()) : s);

function futbolHito(s: Season, first: boolean): Hito {
  const table = s.tables[0];
  const row = ourRow(table);
  const ko = s.matches.filter((m) => m.knockout && m.played).at(-1);
  const fourDigit = s.name.match(/20\d{2}/)?.[0];
  const startYear = s.yearLabel ? 2000 + Number(s.yearLabel.slice(0, 2)) : Number(fourDigit ?? 2024);
  const isCup = /copa/i.test(s.name);

  const parts: string[] = [];
  if (row) parts.push(`${row.pos}º de ${table.rows.length} en ${soft(table.group || table.stage)}`);
  if (ko) parts.push(`alcanzó ${ko.round.toLowerCase()} (${ko.stage.split('|')[0].trim().toLowerCase()})`);
  if (s.record.pj) {
    parts.push(
      `${plural(s.record.pj, 'partido', 'partidos')}, ${plural(s.record.g, 'victoria', 'victorias')} y ${plural(s.record.gf, 'gol', 'goles')} a favor`,
    );
  }
  if (s.active && !s.record.pj) parts.push('la temporada acaba de empezar');

  const name = s.name.replace(/\s*\d{2}-\d{2}\s*$/, '').trim();
  return {
    year: fourDigit ?? s.yearLabel?.replace('-', '/') ?? '',
    sort: fourDigit ? Number(fourDigit) + (isCup ? 0.4 : 0.2) : startYear + 0.6 + (isCup ? 0.1 : 0),
    titulo: first ? 'Debut en MálagaF7' : s.active ? `${name}, en juego` : name,
    texto: `${first ? `${s.name}. ` : ''}${capitalize(parts.join('; '))}.`,
    tag: 'Fútbol 7',
    deporte: 'futbol',
  };
}

function baloncestoHito(s: Season): Hito {
  const table = s.tables[0];
  const row = ourRow(table);
  const home = s.matches.find((m) => m.isHome && m.venue)?.venue;
  const parts = [`${s.category}, ${s.stage} · ${s.group}`];
  if (row) parts.push(`${row.pos}º de ${table.rows.length}`);
  if (s.record.pj) parts.push(`${plural(s.record.g, 'victoria', 'victorias')} y ${plural(s.record.p, 'derrota', 'derrotas')}`);
  if (home) parts.push(`en casa juega en el ${home}`);
  return {
    year: s.yearLabel?.replace('-', '/') ?? '',
    sort: 2000 + Number(s.yearLabel?.slice(0, 2) ?? 26) + 0.75,
    titulo: s.active ? 'Liga AFADE, en juego' : 'Liga AFADE',
    texto: `${capitalize(parts.join('; '))}.`,
    tag: 'Baloncesto',
    deporte: 'baloncesto',
  };
}

const manuales: Hito[] = hitos.map((h) => {
  const basket = 'deporte' in h && h.deporte === 'baloncesto';
  return {
    year: h.year,
    sort: Number(h.year) + (basket ? 0.8 : 0),
    titulo: h.titulo,
    texto: h.texto,
    tag: basket ? 'Baloncesto' : 'Club',
    deporte: basket ? 'baloncesto' : undefined,
  };
});

export const timeline: Hito[] = [
  ...manuales,
  ...[...futbol.seasons].sort((a, b) => Number(a.id) - Number(b.id)).map((s, i) => futbolHito(s, i === 0)),
  ...baloncesto.seasons.map(baloncestoHito),
].sort((a, b) => a.sort - b.sort);

const allSeasons = [...futbol.seasons, ...baloncesto.seasons];
const sum = (list: Season[], key: 'pj' | 'g' | 'gf') => list.reduce((acc, s) => acc + s.record[key], 0);

export const totals = {
  partidos: sum(allSeasons, 'pj'),
  victorias: sum(allSeasons, 'g'),
  goles: sum(futbol.seasons, 'gf'),
  competiciones: allSeasons.length,
};
