// Datos que no publican las ligas. El resto se descarga con scripts/fetch-data.mjs.

export const club = {
  nombre: 'Lagarto Limón',
  fundacion: 2011,
  origen: 'Villafuerte',
  ciudad: 'Málaga',
  zona: 'Málaga Este',
  lema: 'Verde por fuera, ácido por dentro',
  descripcion:
    'Club amateur malagueño con dos secciones —fútbol 7 y baloncesto— unidas por un lagarto, un limón y muchas ganas de competir.',
  redes: {
    futbol: { instagram: 'https://www.instagram.com/lagartolimonfc/', handle: '@lagartolimonfc' },
    baloncesto: { instagram: 'https://www.instagram.com/lagartolimoncb/', handle: '@lagartolimoncb' },
  },
};

export const secciones = {
  futbol: {
    slug: 'futbol',
    nombre: 'Lagarto Limón FC',
    corto: 'FC',
    deporte: 'Fútbol 7',
    escudo: 'img/escudo-fc.webp',
    liga: 'MálagaF7',
    ligaUrl: 'https://www.malagaf7.com',
    desde: club.fundacion,
    instagram: club.redes.futbol,
  },
  baloncesto: {
    slug: 'baloncesto',
    nombre: 'Lagarto Limón CB',
    corto: 'CB',
    deporte: 'Baloncesto',
    escudo: 'img/escudo-cb.webp',
    liga: 'Liga AFADE',
    ligaUrl: 'https://ligaafade.es/resultados?deporte=6',
    desde: 2024,
    instagram: club.redes.baloncesto,
  },
} as const;

// Edad, foto o apodo de los jugadores de fútbol, por su id de MálagaF7 (ver src/data/generated/futbol.json).
// Las fotos van en public/jugadores/, en vertical (3:4).
type ExtraJugador = { edad?: number; foto?: string; apodo?: string };

export const extrasFutbol: Record<number, ExtraJugador> = {
  // 1347: { edad: 29, foto: 'jugadores/rafa.jpg', apodo: 'Rafa' },
};

// La Liga AFADE no publica las plantillas.
type JugadorManual = {
  nombre: string;
  apellidos?: string;
  dorsal?: number;
  posicion?: 'Base' | 'Escolta' | 'Alero' | 'Ala-pívot' | 'Pívot';
  altura?: number; // metros
  foto?: string;
  capitan?: boolean;
};

export const plantillaBaloncesto: JugadorManual[] = [
  { nombre: 'Ángel Antonio', apellidos: 'Regojo', dorsal: 23, posicion: 'Alero' },
  { nombre: 'Fernando', apellidos: 'Salgado', posicion: 'Base' },
  { nombre: 'José Luis', apellidos: 'González', dorsal: 10, posicion: 'Base' },
  { nombre: 'Marco', apellidos: 'Lueg', dorsal: 14, posicion: 'Pívot' },
  { nombre: 'Pablo', apellidos: 'Molina', dorsal: 4, posicion: 'Alero' },
  { nombre: 'Pablo', apellidos: 'Perotti', dorsal: 21, posicion: 'Alero' },
  { nombre: 'Rafa', apellidos: 'Arjona', posicion: 'Base' },
  { nombre: 'Enrique', apellidos: 'Hermana Hortelano', dorsal: 16, posicion: 'Ala-pívot' },
  { nombre: 'Felipe', apellidos: 'Hermana Hortelano', dorsal: 13, posicion: 'Pívot' },
  { nombre: 'Gonzalo', apellidos: 'Villalba', dorsal: 15, posicion: 'Ala-pívot' },
  { nombre: 'JoséMa', apellidos: 'González', dorsal: 32, posicion: 'Pívot' },
  { nombre: 'Iván', apellidos: 'García', dorsal: 22, posicion: 'Escolta', altura: 1.87 },
  { nombre: 'Toro', dorsal: 6, posicion: 'Ala-pívot' },
  { nombre: 'José', apellidos: 'Durán', dorsal: 8, posicion: 'Escolta' },
];

type Tecnico = { nombre: string; apellidos?: string; apodo?: string; rol: string; foto?: string };

export const staff: Record<'futbol' | 'baloncesto', Tecnico[]> = {
  futbol: [],
  baloncesto: [{ nombre: 'Carlos', apellidos: 'García', apodo: 'Charly', rol: 'Entrenador' }],
};

// Las temporadas de cada liga se añaden solas a la línea de tiempo.
export const hitos = [
  {
    year: '2011',
    titulo: 'Nace el lagarto',
    texto: `El club se funda en ${club.origen}. Un nombre imposible de olvidar y un escudo con un lagarto mordiendo un limón: personalidad desde el primer día.`,
  },
  {
    year: String(secciones.baloncesto.desde),
    titulo: 'El lagarto también bota',
    texto:
      'Nace la sección de baloncesto: el mismo lagarto, ahora con un balón naranja entre las garras. El Lagarto Limón CB empieza a competir.',
    deporte: 'baloncesto' as const,
  },
];
