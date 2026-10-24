// Genera data.js (público, cifrado) y palabras.txt (privado, en .gitignore).
// Uso: node generate.mjs              → re-sortea; conserva las palabras de palabras.txt si existe.
//      node generate.mjs --new-words  → re-sortea con palabras nuevas.
import { webcrypto as crypto } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";

const PEOPLE = [
  ["aaron", "Aaron", "aaron.jpg"],
  ["alex", "Alex", "alex.jpg"],
  ["alexito", "Alexito", "alexito.jpg"],
  ["andrea", "Andrea", "andrea.png"],
  ["angelica", "Angélica", "angelica.png"],
  ["coy", "Coy", "coy.png"],
  ["dani", "Dani", "dani.png"],
  ["diana", "Diana", "diana.png"],
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

// Nadie le regala a alguien de su propia familia. Quien no esté aquí es familia de uno.
const FAMILIES = [
  ["pilar", "santy", "dani"],
  ["regi", "andrea", "german", "rosi", "tono"],
  ["erick", "aaron", "raquel", "coy"],
  ["mafer", "alex", "alexito"],
  ["juan", "enrique", "juanito", "angelica"],
  ["victor"],
  ["diana"],
];
// Número EXACTO de personas que le regalan a alguien de su propia familia.
const SAME_FAMILY_EXACT = 3;
const familyOf = Object.fromEntries(PEOPLE.map(([id]) => [id, id]));
FAMILIES.forEach((fam, i) => fam.forEach((id) => {
  if (!(id in familyOf)) throw new Error(`Familia con id desconocido: ${id}`);
  familyOf[id] = "fam" + i;
}));

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

// Un solo ciclo aleatorio: nadie se toca a sí mismo, no hay "intercambios" A<->B
// y nadie le regala a su familia (se re-baraja hasta cumplirlo).
const sameFamily = (o) => o.filter((id, i) => familyOf[id] === familyOf[o[(i + 1) % o.length]]).length;
let order, tries = 0;
do {
  order = shuffle(PEOPLE.map((p) => p[0]));
  if (++tries > 2e6) throw new Error("No encontré un sorteo válido");
} while (sameFamily(order) !== SAME_FAMILY_EXACT);

// Palabras: se conservan las de palabras.txt (por nombre) salvo --new-words
const nameToId = Object.fromEntries(PEOPLE.map(([id, name]) => [name, id]));
const wordOf = {};
if (existsSync("palabras.txt") && !process.argv.includes("--new-words")) {
  for (const l of readFileSync("palabras.txt", "utf8").split("\n")) {
    const m = l.match(/^(.+?)\s+→\s+(\S+)$/);
    if (m && nameToId[m[1].trim()]) wordOf[nameToId[m[1].trim()]] = m[2];
  }
}
const spare = shuffle(WORDS.filter((w) => !Object.values(wordOf).includes(w)));
for (const [id] of PEOPLE) wordOf[id] ??= spare.pop();
const words = order.map((id) => wordOf[id]);

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
