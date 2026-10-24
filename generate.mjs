// Genera data.js (público, cifrado) y palabras.txt (privado, en .gitignore).
// Uso: node generate.mjs   → re-sortea todo (palabras nuevas + asignación nueva).
import { webcrypto as crypto } from "node:crypto";
import { writeFileSync } from "node:fs";

const PEOPLE = [
  ["aaron", "Aaron", "aaron.jpg"],
  ["alex", "Alex", "alex.jpg"],
  ["andrea", "Andrea", "andrea.png"],
  ["angelica", "Angélica", "angelica.png"],
  ["coy", "Coy", "coy.png"],
  ["dani", "Dani", "dani.png"],
  ["enrique", "Enrique", "enrique.jpg"],
  ["erick", "Erick", "erick.jpg"],
  ["german", "Germán", "german.png"],
  ["juan", "Juan", "juan.png"],
  ["juanito", "Juanito", "juanito.png"],
  ["mafer", "Mafer", "mafer.jpg"],
  ["pilar", "Pilar", "pilar.png"],
  ["raquel", "Raquel", "raquel.jpg"],
  ["regi", "Regi", "regi.png"],
  ["rosi", "Rosi", "rosi.png"],
  ["santy", "Santy", "santy.png"],
  ["tono", "Toño", "tono.png"],
  ["victor", "Victor", "victor.jpg"],
];

const WORDS = [
  "paloma", "turron", "galleta", "reno", "pinguino", "bombon", "cascabel",
  "estrella", "mazapan", "ponche", "pinata", "bunuelo", "tamal", "churro",
  "muerdago", "trineo", "gorrito", "canela", "nieve", "chispas", "chocolate",
  "posada", "colacion", "esfera", "duende", "regalito", "abrazo", "malvavisco",
];

const randInt = (n) => crypto.getRandomValues(new Uint32Array(1))[0] % n;
const shuffle = (a) => {
  a = [...a];
  for (let i = a.length - 1; i > 0; i--) {
    const j = randInt(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

// Mismo normalizador que en el navegador (app.js)
const norm = (s) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
const enc = new TextEncoder();
const b64 = (buf) => Buffer.from(buf).toString("base64");
const hex = (buf) => Buffer.from(buf).toString("hex");

async function idFor(word) {
  return hex(await crypto.subtle.digest("SHA-256", enc.encode("peluche2026|id|" + norm(word))));
}
async function keyFor(word) {
  const base = await crypto.subtle.importKey("raw", enc.encode(norm(word)), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: enc.encode("peluche2026|key"), iterations: 150000, hash: "SHA-256" },
    base, { name: "AES-GCM", length: 256 }, false, ["encrypt"]
  );
}

// Un solo ciclo aleatorio: nadie se toca a sí mismo y no hay "intercambios" A<->B
const order = shuffle(PEOPLE.map((p) => p[0]));
const words = shuffle(WORDS).slice(0, PEOPLE.length);

const secrets = {};
const lines = [];
for (let i = 0; i < order.length; i++) {
  const giver = order[i];
  const receiver = order[(i + 1) % order.length];
  const word = words[i];
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv }, await keyFor(word),
    enc.encode(JSON.stringify({ g: giver, r: receiver }))
  );
  secrets[await idFor(word)] = { iv: b64(iv), ct: b64(ct) };
  const name = PEOPLE.find((p) => p[0] === giver)[1];
  lines.push(`${name.padEnd(10)} → ${word}`);
}

// Orden de llaves aleatorio para no filtrar el ciclo
const shuffledSecrets = Object.fromEntries(shuffle(Object.entries(secrets)));
const people = PEOPLE.map(([id, name, img]) => ({ id, name, img: "img/" + img }));

writeFileSync(
  "data.js",
  `// Generado por generate.mjs. Las asignaciones van cifradas con la palabra de cada quien.\n` +
    `window.PEOPLE = ${JSON.stringify(people, null, 2)};\n` +
    `window.SECRETS = ${JSON.stringify(shuffledSecrets, null, 2)};\n`
);
lines.sort((a, b) => a.localeCompare(b, "es"));
writeFileSync("palabras.txt", "Palabras secretas, Intercambio Peluche 2026\n\n" + lines.join("\n") + "\n");
console.log(`Listo: ${PEOPLE.length} participantes. Palabras en palabras.txt (NO se sube a git).`);
