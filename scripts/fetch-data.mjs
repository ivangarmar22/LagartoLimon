// Descarga los datos de MálagaF7 y la Liga AFADE en src/data/generated.
// Si una liga falla se conserva el JSON anterior.

import { writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const OUT_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'src', 'data', 'generated');

const MF7 = 'https://www.malagaf7.com';
const MF7_API = `${MF7}/api`;
const MF7_UPLOAD = `${MF7}/upload`;
const AFADE = 'https://ligaafade.es';
const TEAM_RE = /lagarto\s*lim[oó]n/i;

async function getJSON(url) {
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} -> ${url}`);
  return res.json();
}

// Las dos ligas guardan la hora local de Málaga (AFADE le añade una Z que no es real).
function localDate(raw) {
  const m = String(raw ?? '').match(/^(\d{4}-\d{2}-\d{2})[T ](\d{2}):(\d{2})/);
  if (!m || m[1].startsWith('0001')) return null;
  return `${m[1]}T${m[2]}:${m[3]}`;
}

const clean = (s) => (s ?? '').replace(/\s+/g, ' ').trim();

const titleCase = (s) =>
  clean(s)
    .toLowerCase()
    .replace(/(^|[\s'-])(\p{L})/gu, (_, sep, ch) => sep + ch.toUpperCase());

const mf7Logo = (p) => (!p ? null : /^https?:/.test(p) ? p : `${MF7_UPLOAD}/${p}`);

const FIELD_POSITIONS = { 1: 'Portero', 2: 'Defensa', 3: 'Centrocampista', 4: 'Delantero' };

async function fetchFutbol() {
  const tournaments = await getJSON(`${MF7_API}/tournaments`);
  const seasons = [];

  for (const t of tournaments) {
    const teams = await getJSON(`${MF7_API}/tournaments/${t.id}/teams`);
    const us = teams.find((x) => TEAM_RE.test(x.name));
    if (!us) continue;

    const [detail, days] = await Promise.all([
      getJSON(`${MF7_API}/tournaments/${t.id}`),
      getJSON(`${MF7_API}/matches/fortournament/${t.id}`),
    ]);
    const teamById = new Map(detail.teams.map((x) => [x.id, x]));
    const stageById = new Map(detail.stages.map((s) => [s.id, s]));
    const groupById = new Map(detail.groups.map((g) => [g.id, g]));
    const teamName = (id) => clean(teamById.get(id)?.name) || 'Por determinar';
    const teamLogo = (id) => mf7Logo(teamById.get(id)?.logoImgUrl);

    const matches = [];
    for (const day of days) {
      for (const m of day.matches) {
        if (m.idHomeTeam !== us.id && m.idVisitorTeam !== us.id) continue;
        const isHome = m.idHomeTeam === us.id;
        const rivalId = isHome ? m.idVisitorTeam : m.idHomeTeam;
        const bye = rivalId === -1 || m.status === 10;
        const played = m.status === 4 || m.status === 5;
        const stage = stageById.get(m.idStage);
        matches.push({
          id: m.id,
          round: clean(day.name).replace(/^Stage\./, ''),
          stage: clean(stage?.name),
          knockout: stage?.type === 2,
          date: localDate(m.startTime),
          venue: clean(m.field?.name) || null,
          isHome,
          bye,
          played,
          home: { name: bye && !isHome ? 'Descansa' : teamName(m.idHomeTeam), logo: teamLogo(m.idHomeTeam), us: isHome },
          away: { name: bye && isHome ? 'Descansa' : teamName(m.idVisitorTeam), logo: teamLogo(m.idVisitorTeam), us: !isHome },
          score: played ? [m.visibleHomeScore, m.visibleVisitorScore] : null,
          shootout: played && (m.homeShootOutScore || m.visitorShootOutScore) ? [m.homeShootOutScore, m.visitorShootOutScore] : null,
          url: `${MF7}/tournaments/${t.id}/matches/${m.id}`,
        });
      }
    }
    matches.sort((a, b) => (a.date ?? '9999').localeCompare(b.date ?? '9999'));

    const tables = [];
    const ourGroups = (detail.teamGroups ?? []).filter((g) => g.idTeam === us.id);
    for (const tg of ourGroups) {
      const stage = stageById.get(tg.idStage);
      if (!stage || stage.type !== 1) continue;
      const cls = await getJSON(`${MF7_API}/tournaments/stageclassification/${stage.id}`);
      const zones = safeParse(stage.colorConfig, []).map((z) => ({
        from: Number(z.start),
        to: Number(z.end),
        title: clean(z.title),
        color: z.color,
      }));
      const rows = (cls.leagueClassification ?? [])
        .filter((r) => r.idGroup === tg.idGroup)
        .map((r, i) => ({
          pos: i + 1,
          team: teamName(r.idTeam),
          logo: teamLogo(r.idTeam),
          us: r.idTeam === us.id,
          pj: r.gamesPlayed,
          g: r.gamesWon,
          e: r.gamesDraw,
          p: r.gamesLost,
          gf: r.points,
          gc: r.pointsAgainst,
          dg: r.pointDiff,
          pts: r.tournamentPoints,
        }));
      tables.push({
        stage: clean(stage.name),
        group: clean(groupById.get(tg.idGroup)?.name),
        zones,
        rows,
      });
    }

    const playedMatches = matches.filter((m) => m.played && !m.bye);
    const record = playedMatches.reduce(
      (acc, m) => {
        const [h, a] = m.score;
        const [gf, gc] = m.isHome ? [h, a] : [a, h];
        acc.gf += gf;
        acc.gc += gc;
        if (gf > gc) acc.g++;
        else if (gf < gc) acc.p++;
        else if (m.shootout) {
          const [sh, sa] = m.shootout;
          (m.isHome ? sh > sa : sa > sh) ? acc.g++ : acc.p++;
        } else acc.e++;
        return acc;
      },
      { pj: playedMatches.length, g: 0, e: 0, p: 0, gf: 0, gc: 0 },
    );

    seasons.push({
      id: t.id,
      idSeason: t.idSeason,
      name: clean(t.name),
      active: t.status !== 4,
      url: `${MF7}/tournaments/${t.id}`,
      teamUrl: `${MF7}/tournaments/${t.id}/teams/${us.id}`,
      teamId: us.id,
      record,
      tables,
      matches,
    });
  }

  if (!seasons.length) throw new Error('No se ha encontrado al Lagarto Limón en MálagaF7');

  seasons.sort((a, b) => b.idSeason - a.idSeason || b.id - a.id);
  const current = seasons.find((s) => s.active) ?? seasons[0];

  const det = await getJSON(`${MF7_API}/teams/${current.teamId}/details/${current.id}`);
  const roster = (det.players ?? []).map((p) => ({
    id: p.id,
    nombre: titleCase(p.name),
    apellidos: titleCase(p.surname),
    dorsal: p.teamData?.apparelNumber ?? null,
    posicion: FIELD_POSITIONS[p.teamData?.fieldPosition] ?? 'Jugador',
    capitan: !!p.teamData?.isCaptainTeam,
  }));
  roster.sort((a, b) => (a.dorsal ?? 999) - (b.dorsal ?? 999));
  for (const s of seasons) delete s.teamId;

  return {
    updatedAt: new Date().toISOString(),
    source: { name: 'MálagaF7', url: MF7 },
    currentId: current.id,
    roster,
    seasons,
  };
}

async function fetchBaloncesto() {
  const DEPORTE = 6;
  const logo = (p) => (p ? `${AFADE}/${String(p).replace(/^\/+/, '')}` : null);
  const big = (p) => (p ? p.replace(/_(28x28|48x48)(\.\w+)$/, '_120x120$2') : p);

  const categorias = await getJSON(`${AFADE}/open/api/categorias/fase/${DEPORTE}`);
  const found = [];
  for (const cat of categorias) {
    const generos = await getJSON(`${AFADE}/open/api/generos/fase/${DEPORTE}/${cat.id}`);
    for (const gen of generos) {
      const fases = await getJSON(`${AFADE}/open/api/fases/${DEPORTE}/${cat.id}/${gen.id}`);
      for (const fase of fases) {
        for (const grupo of fase.grupos ?? []) {
          const tabla = await getJSON(`${AFADE}/open/api/clasificaciones/grupo/${grupo.id}`);
          const us = tabla.find((r) => TEAM_RE.test(r.equipo_nombre));
          if (us) found.push({ cat, gen, fase, grupo, tabla, us });
        }
      }
    }
  }
  if (!found.length) throw new Error('No se ha encontrado al Lagarto Limón CB en la Liga AFADE');

  const competitions = [];
  for (const { cat, gen, fase, grupo, tabla, us } of found) {
    const partidos = await getJSON(`${AFADE}/open/api/partidos/resultados/${grupo.id}`);
    const isUs = (id, name) => id === us.equipo_id || TEAM_RE.test(name ?? '');

    const matches = partidos
      .filter((p) => isUs(p.e1_id, p.equipo_local_nombre_publico) || isUs(p.e2_id, p.equipo_visitante_nombre_publico))
      .map((p) => {
        const isHome = isUs(p.e1_id, p.equipo_local_nombre_publico);
        const bye = !p.e1_id || !p.e2_id;
        const played = p.marcador_local != null && p.marcador_visitante != null;
        return {
          id: `${grupo.id}-${p.j_numero}-${p.e1_id}-${p.e2_id}`,
          round: `Jornada ${p.j_numero}`,
          stage: clean(fase.nombre),
          knockout: false,
          date: localDate(p.fecha_celebracion),
          venue: clean(p.sede_nombre) || null,
          address: clean(p.sede_direccion) || null,
          isHome,
          bye,
          played,
          home: { name: clean(p.equipo_local_nombre_publico) || 'Descansa', logo: logo(p.colegio_local_imagen), us: isHome },
          away: { name: clean(p.equipo_visitante_nombre_publico) || 'Descansa', logo: logo(p.colegio_visitante_imagen), us: !isHome },
          score: played ? [p.marcador_local, p.marcador_visitante] : null,
          shootout: null,
        };
      })
      .sort((a, b) => a.round.localeCompare(b.round, 'es', { numeric: true }));

    const rows = tabla.map((r, i) => ({
      pos: r.posicion || i + 1,
      team: clean(r.equipo_nombre),
      logo: logo(big(r.equipo_imagen)),
      us: r.equipo_id === us.equipo_id,
      pj: r.j,
      g: r.g,
      e: r.e,
      p: r.p,
      gf: r.pf || r.favor || r.gf,
      gc: r.pc || r.contra || r.gc,
      dg: (r.pf || r.favor || r.gf) - (r.pc || r.contra || r.gc),
      pts: r.puntos,
    }));

    const playedMatches = matches.filter((m) => m.played && !m.bye);
    const record = playedMatches.reduce(
      (acc, m) => {
        const [h, a] = m.score;
        const [pf, pc] = m.isHome ? [h, a] : [a, h];
        acc.gf += pf;
        acc.gc += pc;
        pf > pc ? acc.g++ : pf < pc ? acc.p++ : acc.e++;
        return acc;
      },
      { pj: playedMatches.length, g: 0, e: 0, p: 0, gf: 0, gc: 0 },
    );

    competitions.push({
      id: grupo.id,
      name: 'Liga AFADE',
      category: `${clean(cat.nombre)} ${clean(gen.nombre)}`,
      stage: clean(fase.nombre),
      group: `Grupo ${clean(grupo.nombre)}`,
      url: `${AFADE}/resultados?deporte=${DEPORTE}`,
      record,
      tables: [{ stage: clean(fase.nombre), group: `Grupo ${clean(grupo.nombre)}`, zones: [], rows }],
      matches,
    });
  }

  return {
    updatedAt: new Date().toISOString(),
    source: { name: 'Liga AFADE', url: `${AFADE}/resultados?deporte=${DEPORTE}` },
    competitions,
  };
}

function safeParse(s, fallback) {
  try {
    return JSON.parse(s);
  } catch {
    return fallback;
  }
}

async function run(name, fn) {
  try {
    const data = await fn();
    await writeFile(path.join(OUT_DIR, `${name}.json`), JSON.stringify(data, null, 2) + '\n', 'utf8');
    console.log(`✔ ${name}.json actualizado`);
  } catch (err) {
    console.warn(`⚠ No se pudo actualizar ${name}.json (se mantiene la versión anterior): ${err.message}`);
  }
}

await mkdir(OUT_DIR, { recursive: true });
await Promise.all([run('futbol', fetchFutbol), run('baloncesto', fetchBaloncesto)]);
