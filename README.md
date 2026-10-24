# Intercambio Navideño · Familia Peluche 2026

Página estática (GitHub Pages). Cada participante entra con su palabra secreta y ve a quién le regala.

- `generate.mjs`: sortea (un solo ciclo, nadie se toca a sí mismo) y genera `data.js` + `palabras.txt`.
- Las asignaciones en `data.js` van cifradas (AES-GCM, llave derivada de la palabra), así que ver el código fuente no revela el sorteo.
- `palabras.txt` NO se sube (está en `.gitignore`).

Re-sortear: `node generate.mjs && git commit -am "nuevo sorteo" && git push`
