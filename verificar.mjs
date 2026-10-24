// Verifica el sorteo PUBLICADO sin revelar quién le regala a quién (solo imprime conteos).
// Uso: node verificar.mjs            (requiere palabras.txt local)
//      node verificar.mjs --local    (usa data.js local en vez del publicado)
//      node verificar.mjs --mostrar  (ADEMÁS imprime el sorteo completo: revela todo)
// Independiente de generate.mjs: las familias están escritas aquí a mano, tal cual se pidieron.
import { webcrypto as crypto } from "node:crypto";
import { readFileSync } from "node:fs";

const FAMILIAS = [
  ["pilar", "santy", "dani"],
  ["regi", "andrea", "german", "rosi", "tono"],
  ["erick", "aaron", "raquel", "coy"],
  ["mafer", "alex", "alexito"],
  ["juan", "enrique", "juanito", "angelica", "diana"],
  ["victor"],
];
const EXACTOS_EN_FAMILIA = 2;

const URL = "https://daniel-enqz.github.io/intercambio-peluche-2026/data.js";
const src = process.argv.includes("--local")
  ? readFileSync("data.js", "utf8")
  : await (await fetch(URL + "?t=" + Date.now(), { cache: "no-store" })).text();
const window = {};
new Function("window", src)(window);

const norm = (s) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
const enc = new TextEncoder();
const hex = (b) => Buffer.from(b).toString("hex");
const nameToId = Object.fromEntries(window.PEOPLE.map((p) => [p.name, p.id]));
const words = readFileSync("palabras.txt", "utf8").split("\n")
  .map((l) => l.match(/^(.+?)\s+→\s+(\S+)$/)).filter(Boolean)
  .map((m) => ({ owner: nameToId[m[1].trim()], word: m[2] }));

const da = {}; // da[quien] = a quien le regala
let palabraNoEsDeSuDueno = 0, noAbre = 0;
for (const { owner, word } of words) {
  const w = norm(word);
  const caja = window.SECRETS[hex(await crypto.subtle.digest("SHA-256", enc.encode("peluche2026|id|" + w)))];
  if (!caja) { noAbre++; continue; }
  const base = await crypto.subtle.importKey("raw", enc.encode(w), "PBKDF2", false, ["deriveKey"]);
  const key = await crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: enc.encode("peluche2026|key"), iterations: 150000, hash: "SHA-256" },
    base, { name: "AES-GCM", length: 256 }, false, ["decrypt"]);
  try {
    const r = JSON.parse(new TextDecoder().decode(await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: Buffer.from(caja.iv, "base64") }, key, Buffer.from(caja.ct, "base64"))));
    if (r.g !== owner) palabraNoEsDeSuDueno++;
    da[r.g] = r.r;
  } catch { noAbre++; }
}

const ids = window.PEOPLE.map((p) => p.id);
const fam = {}; FAMILIAS.forEach((f, i) => f.forEach((id) => (fam[id] = i)));
const sinFamilia = ids.filter((id) => !(id in fam));
const enFamiliaDeclarada = FAMILIAS.flat();
const desconocidos = enFamiliaDeclarada.filter((id) => !ids.includes(id));
const receptores = Object.values(da);

const checks = [
  ["Todos los participantes tienen familia asignada", sinFamilia.length === 0 && desconocidos.length === 0, `${ids.length} participantes`],
  ["Cada palabra abre exactamente la cajita de su dueño", noAbre === 0 && palabraNoEsDeSuDueno === 0, `${Object.keys(da).length}/${ids.length} abiertas`],
  ["1) Todos le dan a alguien", ids.every((id) => da[id]), `${ids.filter((id) => da[id]).length}/${ids.length} dan`],
  ["2) Sin repeticiones: cada quien recibe exactamente 1", new Set(receptores).size === ids.length && ids.every((id) => receptores.includes(id)), `${new Set(receptores).size} receptores distintos`],
  ["3) Nadie se da a sí mismo", ids.every((id) => da[id] !== id), `${ids.filter((id) => da[id] === id).length} casos`],
  [`4) Exactamente ${EXACTOS_EN_FAMILIA} le regalan a su familia`, ids.filter((id) => fam[id] === fam[da[id]]).length === EXACTOS_EN_FAMILIA, `${ids.filter((id) => fam[id] === fam[da[id]]).length} casos`],
  ["Extra: no hay parejas que se regalen mutuamente", ids.every((id) => da[da[id]] !== id), `${ids.filter((id) => da[da[id]] === id).length} casos`],
];
if (process.argv.includes("--mostrar")) {
  const nombre = Object.fromEntries(window.PEOPLE.map((p) => [p.id, p.name]));
  console.log("Sorteo completo (sigue la ronda):\n");
  let cur = ids[0];
  for (let i = 0; i < ids.length; i++) {
    const misma = fam[cur] === fam[da[cur]] ? "   ← misma familia" : "";
    console.log(`  ${String(i + 1).padStart(2)}. ${nombre[cur].padEnd(9)} \u279c ${nombre[da[cur]]}${misma}`);
    cur = da[cur];
  }
  console.log();
}
for (const [name, ok, detail] of checks) console.log(`${ok ? "✅" : "❌"} ${name}  (${detail})`);
process.exit(checks.every((c) => c[1]) ? 0 : 1);
