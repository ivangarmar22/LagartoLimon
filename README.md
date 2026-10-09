# Lagarto Limón · web del club

Web del club malagueño **Lagarto Limón** (fútbol 7 y baloncesto), hecha con [Astro](https://astro.build), [GSAP](https://gsap.com) y [Lenis](https://lenis.darkroom.engineering).

- **Fútbol 7:** datos de [MálagaF7](https://www.malagaf7.com) (calendario, resultados, clasificación, plantilla y temporadas).
- **Baloncesto:** datos de la [Liga AFADE](https://ligaafade.es/resultados?deporte=6) (calendario, resultados y clasificación).

Los datos se descargan solos en cada publicación y **dos veces al día** mediante GitHub Actions.

## Páginas

| Ruta | Contenido |
| --- | --- |
| `/` | Portada: héroe animado, el club, equipos, próximos partidos con cuenta atrás, resultados e historia en scroll horizontal |
| `/futbol` | Lagarto Limón FC: próximo partido, calendario, clasificación, plantilla (fichas) y temporadas |
| `/baloncesto` | Lagarto Limón CB: lo mismo para baloncesto |
| `/historia` | Origen, línea de tiempo, cifras, escudo y colores, valores y campos |

## Trabajar en local

Necesita Node 22.12 o superior.

```bash
npm install
npm run fetch-data   # descarga los datos actualizados de las ligas
npm run dev          # http://localhost:4321
```

## Qué se edita a mano

Todo está en **`src/data/club.ts`**:

- Datos generales del club (fundación, origen, lema, redes).
- **Edad, foto y apodo** de los jugadores de fútbol (`extrasFutbol`, por id de MálagaF7).
- **Plantilla de baloncesto** (`plantillaBaloncesto`) con dorsal, posición y altura, porque la Liga AFADE no la publica.
- Cuerpo técnico (`staff`) e hitos de la historia (`hitos`).

Las fotos de los jugadores van en `public/jugadores/` (formato vertical 3:4, ~600×800 px).
Los escudos están en `public/img/` (WebP para la web y PNG para el icono y las vistas previas al compartir).

## Publicar en GitHub Pages

1. En el repositorio: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
2. Cada `push` a `main` publica la web en `https://ivangarmar22.github.io/LagartoLimon/`.

La ruta base se calcula sola a partir del nombre del repositorio (ver `astro.config.mjs`).
También puedes relanzar la publicación a mano desde la pestaña **Actions → Publicar web → Run workflow**.
