# Cómo funciona

Ejemplo con datos inventados: palabra `galletita`, Ana le regala a Luis.
Los valores hex están recortados y son ilustrativos.

```
╔══════════════════════════════════════════════════════════════════════╗
║  LO QUE HAY EN data.js (público, cualquiera lo puede ver)            ║
║                                                                      ║
║  Una cajita por persona. La de Ana:                                  ║
║                                                                      ║
║  "7c41e0...9ab2": {                 ← etiqueta (para encontrarla)    ║
║      "iv": "k3Xq...Wz",              ← número aleatorio (no secreto) ║
║      "ct": "Vb8s...Qw=="             ← mensaje cifrado + sello       ║
║  }                                                                   ║
╚══════════════════════════════════════════════════════════════════════╝


 ANA ESCRIBE:   "Galletita "
                   │
                   ▼
 ① LIMPIAR         "galletita"
                   │
        ┌──────────┴──────────────────────────┐
        │                                     │
        ▼                                     ▼
 ② BUSCAR LA CAJITA                   ③ FABRICAR LA LLAVE

  SHA-256(                             PBKDF2(
    "peluche2026|id|galletita"           "galletita",
  )                                      sal "peluche2026|key",
        │                                150,000 vueltas
        ▼                              )
  7c41e0...9ab2                                │
        │                                      ▼
        │  ¿existe en data.js?          e19f04...c7d3
        │  ✅ sí                               │
        ▼                                      │
  saca su iv y su ct                           │
        │                                      │
        └──────────────┬───────────────────────┘
                       ▼
 ④ ABRIR LA CAJITA (AES-256-GCM)

     llave:  e19f04...c7d3
     iv:     k3Xq...Wz
     ct:     ┌─────── N bytes ────────┬──── 16 bytes ────┐
             │ 5a01c3...e8            │ 9d2f...41aa      │
             │ mensaje cifrado        │ sello            │
             └────────────────────────┴──────────────────┘

     a) ¿El sello cuadra con esta llave?
          ✅ sí  → sigue
          ❌ no  → "palabra incorrecta", no muestra nada

     b) Descifra el mensaje:
          5a01c3...  →  {"g":"ana","r":"luis"}
                               │          │
                           quien da   quien recibe
                       │
                       ▼
 ⑤ MOSTRAR

     busca "ana" y "luis" en la lista de participantes
                       │
                       ▼
        🎁  ¡Hola Ana! Te tocó Luis
            [foto Ana]  ➜  [foto Luis]
```

| Paso | Qué hace | Ejemplo |
|---|---|---|
| ① | Limpia lo que escribiste | `"Galletita "` → `"galletita"` |
| ② | Saca la etiqueta para encontrar la cajita | `7c41e0…` |
| ③ | Fabrica la llave secreta | `e19f04…` |
| ④a | Revisa el sello: ¿la llave es la correcta? | ✅ sí |
| ④b | Abre el mensaje | `{"g":"ana","r":"luis"}` |
| ⑤ | Muestra nombres y fotos | Ana ➜ Luis |

## Por qué es seguro

- La etiqueta (②) y la llave (③) salen de la misma palabra con recetas distintas: ver la etiqueta no dice nada de la llave.
- Sin la palabra no hay llave, y sin llave el sello rechaza cualquier intento. Cambiar un solo bit del `ct` también lo rechaza.
- Las palabras no están en GitHub ni en Supabase. Solo en `palabras.txt` (local, en `.gitignore`).
- El sorteo completo no existe en texto plano en ningún lado: solo dentro de las cajitas.

## Cartas (Supabase)

```
"galletita" ──► SHA-256("peluche2026|carta|galletita") ──► tabla palabras ──► "ana" ──► guarda la carta
                             ▲
              receta distinta a la del paso ②, para que la etiqueta
              pública de data.js no sirva para escribir cartas
```

- `cartas`: lectura pública, escritura solo vía `guardar_carta(palabra, texto)`.
- `palabras`: hash → persona, sin acceso desde la API.

## Archivos

| Archivo | Qué es |
|---|---|
| `generate.mjs` | Sortea y genera `data.js` + `palabras.txt` |
| `data.js` | Participantes + cajitas cifradas (público) |
| `palabras.txt` | Palabras en texto plano (local, no se sube) |
| `supabase/schema.sql` | Tablas y función de cartas |
| `supabase/seed.mjs` | Genera `seed.sql` con los hashes (no se sube) |
