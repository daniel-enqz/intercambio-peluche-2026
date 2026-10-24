# Intercambio Navideño · Familia Peluche 2026


https://daniel-enqz.github.io/intercambio-peluche-2026/

- `generate.mjs`: sortea (un solo ciclo, nadie se toca a sí mismo) y genera `data.js` + `palabras.txt`.
- Las asignaciones en `data.js` van cifradas (AES-GCM, llave derivada de la palabra), así que ver el código fuente no revela el sorteo.
- `palabras.txt` NO se sube (está en `.gitignore`).

Re-sortear: `node generate.mjs && git commit -am "nuevo sorteo" && git push`

Cómo funciona el cifrado y las cartas: [docs/como-funciona.md](docs/como-funciona.md)

Verificar el sorteo publicado (solo conteos, sin nombres): `node verificar.mjs`
