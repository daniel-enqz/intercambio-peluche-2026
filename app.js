(() => {
  const $ = (id) => document.getElementById(id);
  const people = window.PEOPLE || [];
  const byId = Object.fromEntries(people.map((p) => [p.id, p]));

  // ---------- Collage ----------
  const collage = $("collage");
  [...people]
    .sort(() => Math.random() - 0.5)
    .forEach((p, i) => {
      const t = document.createElement("button");
      t.type = "button";
      t.className = "tile";
      t.setAttribute("aria-label", `Ver la carta de ${p.name}`);
      t.addEventListener("click", () => openLetter(p, "read"));
      t.style.setProperty("--rot", `${(Math.random() * 16 - 8).toFixed(1)}deg`);
      t.style.setProperty("--d", `${(0.6 + i * 0.08).toFixed(2)}s`);
      t.innerHTML = `<img src="${p.img}" alt="${p.name}" loading="lazy"><span>${p.name}</span>`;
      collage.appendChild(t);
    });
  const tip = document.createElement("p");
  tip.className = "collage-hint";
  tip.textContent = "💌 Toca una foto para leer su carta a Santa";
  collage.after(tip);

  // ---------- Formulario ----------
  const input = $("word"), btn = $("go"), err = $("error"), form = $("form");
  input.addEventListener("input", () => {
    btn.disabled = input.value.trim().length === 0;
    err.textContent = "";
  });

  const norm = (s) =>
    s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
  const enc = new TextEncoder();
  const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
  const unb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

  async function lookup(word) {
    const w = norm(word);
    const id = hex(await crypto.subtle.digest("SHA-256", enc.encode("peluche2026|id|" + w)));
    const entry = window.SECRETS[id];
    if (!entry) return null;
    const base = await crypto.subtle.importKey("raw", enc.encode(w), "PBKDF2", false, ["deriveKey"]);
    const key = await crypto.subtle.deriveKey(
      { name: "PBKDF2", salt: enc.encode("peluche2026|key"), iterations: 150000, hash: "SHA-256" },
      base, { name: "AES-GCM", length: 256 }, false, ["decrypt"]
    );
    const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: unb64(entry.iv) }, key, unb64(entry.ct));
    return JSON.parse(new TextDecoder().decode(pt));
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (btn.disabled) return;
    btn.disabled = true;
    const old = btn.textContent;
    btn.textContent = "Buscando… 🔍";
    try {
      const res = await lookup(input.value);
      if (!res) {
        err.textContent = "Mmm… esa palabra no existe. ¡Revísala! 🎅";
        form.classList.remove("shake"); void form.offsetWidth; form.classList.add("shake");
      } else {
        session = { word: norm(input.value), giver: byId[res.g], receiver: byId[res.r] };
        show(session.giver, session.receiver);
      }
    } catch (x) {
      console.error(x);
      err.textContent = "Algo falló, intenta de nuevo 🙏";
    } finally {
      btn.textContent = old;
      btn.disabled = input.value.trim().length === 0;
    }
  });

  // ---------- Revelación ----------
  const reveal = $("reveal"), gift = $("gift"), result = $("result");
  let session = null; // { word, giver, receiver } mientras la revelación está abierta
  function show(g, r) {
    renderMine();
    $("hello").innerHTML = `¡Hola <b>${g.name}</b>! Te tocó <b>${r.name}</b> 🎁`;
    $("giverImg").src = g.img; $("giverImg").alt = g.name; $("giverName").textContent = g.name;
    $("receiverImg").src = r.img; $("receiverImg").alt = r.name; $("receiverName").textContent = r.name;
    result.classList.remove("show");
    gift.className = "gift"; gift.style.display = "";
    reveal.hidden = false;
    setTimeout(() => gift.classList.add("open"), 1300);
    setTimeout(() => {
      gift.style.display = "none";
      result.classList.add("show");
      confetti();
    }, 1800);
  }
  $("close").addEventListener("click", () => {
    reveal.hidden = true;
    session = null;
    input.value = ""; btn.disabled = true;
  });

  // ---------- Cartas (Supabase) ----------
  const cfg = window.CONFIG || {};
  const cartasOn = Boolean(cfg.SUPABASE_URL && cfg.SUPABASE_KEY);
  const cartas = {}; // person_id -> contenido
  const api = (path, opts = {}) =>
    fetch(`${cfg.SUPABASE_URL}/rest/v1/${path}`, {
      ...opts,
      headers: { apikey: cfg.SUPABASE_KEY, "Content-Type": "application/json", ...(opts.headers || {}) },
    });
  let cartasReady = Promise.resolve();
  if (cartasOn) {
    cartasReady = api("cartas?select=person_id,contenido")
      .then((r) => (r.ok ? r.json() : []))
      .then((rows) => rows.forEach((c) => (cartas[c.person_id] = c.contenido)))
      .catch((e) => console.warn("No pude cargar las cartas", e));
  }

  function renderMine() {
    const box = $("mine");
    box.hidden = !cartasOn || !session;
    if (box.hidden) return;
    const has = Boolean(cartas[session.giver.id]);
    $("mineStatus").textContent = has
      ? "\u2705 Ya llenaste tu carta. Puedes editarla cuando quieras."
      : "A\u00fan no has llenado tu carta, puedes hacerlo cuando quieras\u2026";
    $("writeMine").textContent = has ? "\u270f\ufe0f Editar mi carta" : "\u270d\ufe0f Escribir mi carta";
  }
  $("writeMine").addEventListener("click", () => session && openLetter(session.giver, "edit"));

  const modal = $("letterModal"), stage = $("stage");
  const body = $("letterBody"), editForm = $("letterEdit"), text = $("letterText");
  let timers = [];
  let editing = null;

  async function openLetter(p, mode) {
    timers.forEach(clearTimeout); timers = [];
    editing = mode === "edit" ? p : null;
    $("letterImg").src = p.img; $("letterImg").alt = p.name;
    $("letterTitle").textContent = mode === "edit" ? "Mi carta" : `Carta de ${p.name}`;
    $("letterSign").textContent = `Con cari\u00f1o, ${p.name} \ud83c\udf84`;
    $("editError").textContent = "";
    body.hidden = mode === "edit";
    editForm.hidden = mode !== "edit";
    body.textContent = "Abriendo\u2026"; body.classList.add("empty");
    $("letterSign").hidden = true;

    stage.className = "stage";
    modal.hidden = false;
    void stage.offsetWidth;
    timers.push(setTimeout(() => stage.classList.add("s1"), 30));
    timers.push(setTimeout(() => stage.classList.add("s2"), 650));
    timers.push(setTimeout(() => stage.classList.add("s3"), 1250));

    await cartasReady;
    const c = cartas[p.id] || "";
    $("letterSign").hidden = !(mode === "edit" || c);
    if (mode === "edit") {
      text.value = c; updateCount();
      timers.push(setTimeout(() => text.focus({ preventScroll: true }), 1900));
    } else if (!cartasOn) {
      body.textContent = "Las cartas a\u00fan no est\u00e1n disponibles. \u00a1Muy pronto! \u2728";
    } else if (c) {
      body.textContent = c; body.classList.remove("empty");
    } else {
      body.textContent = `${p.name} a\u00fan no ha escrito su carta \ud83c\udf84`;
    }
  }

  function closeLetter() {
    timers.forEach(clearTimeout); timers = [];
    modal.hidden = true; stage.className = "stage"; editing = null;
  }
  $("letterClose").addEventListener("click", closeLetter);
  modal.addEventListener("click", (e) => { if (e.target === modal || e.target === stage) closeLetter(); });
  addEventListener("keydown", (e) => { if (e.key === "Escape" && !modal.hidden) closeLetter(); });

  const updateCount = () => ($("count").textContent = `${text.value.length}/2000`);
  text.addEventListener("input", updateCount);

  editForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!editing || !session) return;
    const save = $("saveLetter"), label = save.textContent;
    save.disabled = true; save.textContent = "Guardando\u2026";
    $("editError").textContent = "";
    try {
      const r = await api("rpc/guardar_carta", {
        method: "POST",
        body: JSON.stringify({ palabra: session.word, texto: text.value }),
      });
      if (!r.ok) throw new Error(await r.text());
      const t = text.value.trim();
      if (t) cartas[editing.id] = t; else delete cartas[editing.id];
      renderMine();
      save.textContent = "\u00a1Guardada! \u2705";
      setTimeout(closeLetter, 900);
    } catch (x) {
      console.error(x);
      $("editError").textContent = "No se pudo guardar, intenta de nuevo \ud83d\ude4f";
    } finally {
      setTimeout(() => { save.disabled = false; save.textContent = label; }, 900);
    }
  });

  // ---------- Nieve ----------
  const snow = $("snow"), sx = snow.getContext("2d");
  let flakes = [];
  function sizeSnow() {
    snow.width = innerWidth; snow.height = innerHeight;
    flakes = Array.from({ length: Math.min(140, Math.floor(innerWidth / 8)) }, () => ({
      x: Math.random() * snow.width, y: Math.random() * snow.height,
      r: Math.random() * 2.6 + 0.8, s: Math.random() * 0.8 + 0.3, w: Math.random() * Math.PI * 2,
    }));
  }
  function drawSnow() {
    sx.clearRect(0, 0, snow.width, snow.height);
    sx.fillStyle = "rgba(255,255,255,.85)";
    for (const f of flakes) {
      f.y += f.s; f.w += 0.01; f.x += Math.sin(f.w) * 0.4;
      if (f.y > snow.height + 5) { f.y = -5; f.x = Math.random() * snow.width; }
      sx.beginPath(); sx.arc(f.x, f.y, f.r, 0, Math.PI * 2); sx.fill();
    }
    requestAnimationFrame(drawSnow);
  }
  addEventListener("resize", sizeSnow);
  sizeSnow(); drawSnow();

  // ---------- Confeti ----------
  function confetti() {
    const c = $("confetti"), x = c.getContext("2d");
    c.width = innerWidth; c.height = innerHeight;
    const colors = ["#a8dcff", "#2b6fd6", "#ffffff", "#e6eef8", "#f3d68c", "#6fb6ff"];
    const parts = Array.from({ length: 180 }, () => ({
      x: c.width / 2, y: c.height / 2.4,
      vx: (Math.random() - 0.5) * 16, vy: Math.random() * -14 - 4,
      s: Math.random() * 7 + 4, a: Math.random() * Math.PI, va: (Math.random() - 0.5) * 0.3,
      col: colors[(Math.random() * colors.length) | 0],
    }));
    let frames = 0;
    (function tick() {
      x.clearRect(0, 0, c.width, c.height);
      for (const p of parts) {
        p.vy += 0.35; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.a += p.va;
        x.save(); x.translate(p.x, p.y); x.rotate(p.a);
        x.fillStyle = p.col; x.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); x.restore();
      }
      if (++frames < 220 && !reveal.hidden) requestAnimationFrame(tick);
      else x.clearRect(0, 0, c.width, c.height);
    })();
  }
})();
