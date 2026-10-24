// Genera supabase/seed.sql (NO se sube a git) con el hash de la palabra de cada persona.
// Uso: node supabase/seed.mjs   (desde la raíz del repo; requiere palabras.txt)
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";

const norm = (s) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
const sha = (s) => createHash("sha256").update(s, "utf8").digest("hex");

const people = JSON.parse(readFileSync("data.js", "utf8").match(/window\.PEOPLE = (\[[\s\S]*?\]);/)[1]);
const byName = Object.fromEntries(people.map((p) => [p.name, p.id]));

const rows = [];
for (const l of readFileSync("palabras.txt", "utf8").split("\n")) {
  const m = l.match(/^(.+?)\s+→\s+(\S+)$/);
  if (!m) continue;
  const id = byName[m[1].trim()];
  if (!id) throw new Error(`Nombre sin persona: ${m[1]}`);
  rows.push(`  ('${sha("peluche2026|carta|" + norm(m[2]))}', '${id}')`);
}
if (rows.length !== people.length) throw new Error(`Palabras ${rows.length} != personas ${people.length}`);

writeFileSync(
  "supabase/seed.sql",
  `-- Generado por supabase/seed.mjs. Hashes de palabras (no las palabras).\n` +
    `delete from public.palabras;\ninsert into public.palabras (hash, person_id) values\n${rows.join(",\n")};\n`
);
console.log(`seed.sql listo: ${rows.length} personas`);
