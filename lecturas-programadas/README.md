# Cola de Lecturas Programadas

En esta carpeta se guardan las lecturas preparadas con antelación para que **GitHub Actions + Vercel** las publiquen automáticamente una cada día a las **07:00 UTC** (`08:00` / `09:00` hora española).

## Cómo dejar una lectura preparada

Por cada lectura programada, guarda aquí **dos archivos** con el mismo prefijo (por ejemplo `2026-11-19_mi-lectura.html` y `2026-11-19_mi-lectura.json`) y su imagen en `public/images/lecturas/`:

1. **`YYYY-MM-DD_slug.html`**: el HTML completo de la lectura (mismo formato que el resto de lecturas de la raíz).
2. **`YYYY-MM-DD_slug.json`**: metadatos de publicación:

```json
{
  "publishDate": "2026-11-19",
  "slug": "el-domingo-por-la-tarde-y-la-ansiedad-del-lunes",
  "viteKey": "ensayoDomingoLunes",
  "section": "lecturas",
  "tag": "Foco & Descanso",
  "badge": "Nuevo",
  "title": "El domingo por la tarde y la ansiedad anticipada del lunes",
  "description": "Por qué el domingo a las siete empiezas a repasar la semana entera en la cabeza y cómo cerrarla en papel en diez minutos.",
  "readTime": "5 min de lectura",
  "image": "/images/lecturas/domingo-tarde-portada.webp",
  "imageAlt": "El domingo por la tarde y la ansiedad anticipada del lunes"
}
```

- `section`: `"lecturas"` (bloque general) o `"pasatiempos"` (bloque de Pasatiempos).
- Para probar o publicar manualmente lo que toque hoy: `npm run publish:lecturas`.
