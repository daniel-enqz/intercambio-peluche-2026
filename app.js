(() => {
  const $ = (id) => document.getElementById(id);
  const people = window.PEOPLE || [];
  const byId = Object.fromEntries(people.map((p) => [p.id, p]));

  // ---------- Collage ----------
  const collage = $("collage");
  const collageT0 = performance.now();
  const shuffle = (arr) => {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  };
  // Al cargar las cartas: primero (en orden aleatorio) quienes ya escribieron,
  // luego los dem\u00e1s (tambi\u00e9n aleatorio). Las bolitas especiales quedan al final.
  function orderCollage() {
    const tiles = [...collage.querySelectorAll(".tile[data-person]")];
    const ordered = [
      ...shuffle(tiles.filter((t) => cartas[t.dataset.person])),
      ...shuffle(tiles.filter((t) => !cartas[t.dataset.person])),
    ];
    collage.prepend(...ordered);
    // Si las bolitas a\u00fan no empiezan a aparecer, que aparezcan en el nuevo orden.
    if (performance.now() - collageT0 < 550) {
      ordered.forEach((t, i) => t.style.setProperty("--d", `${(0.6 + i * 0.08).toFixed(2)}s`));
    }
  }
  shuffle([...people])
    .forEach((p, i) => {
      const t = document.createElement("button");
      t.type = "button";
      t.className = "tile";
      t.dataset.person = p.id;
      t.setAttribute("aria-label", `Ver la carta de ${p.name}`);
      t.addEventListener("click", () => openLetter(p, "read"));
      t.style.setProperty("--rot", `${(Math.random() * 16 - 8).toFixed(1)}deg`);
      t.style.setProperty("--d", `${(0.6 + i * 0.08).toFixed(2)}s`);
      t.innerHTML = `<img src="${p.img}" alt="${p.name}" loading="lazy"><span>${p.name}</span>`;
      collage.appendChild(t);
    });
  // Bolita especial: juegos navideños
  // Para agregar juegos: { icon: "\ud83c\udfb2", name: "Lotería" }
  const JUEGOS = [
    { icon: "\ud83e\ude85", name: "Pi\u00f1ata" },
    { icon: "\ud83c\udf6a", name: "Juego de la Galleta Mar\u00eda" },
  ];
  $("gamesList").innerHTML = JUEGOS.map((j, i) =>
    `<li style="--i:${i}"><span>${j.icon}</span>${j.name}</li>`).join("");
  const games = document.createElement("button");
  games.type = "button";
  games.className = "tile tile-games";
  games.setAttribute("aria-label", "Juegos para el intercambio");
  games.style.setProperty("--rot", "-4deg");
  games.style.setProperty("--d", `${(0.6 + people.length * 0.08).toFixed(2)}s`);
  games.innerHTML = `<img src="img/juegos.svg" alt="Juegos" loading="lazy"><span>Juegos \ud83c\udfb2</span>`;
  collage.appendChild(games);

  const gamesModal = $("gamesModal");
  const closeGames = () => (gamesModal.hidden = true);
  games.addEventListener("click", () => {
    gamesModal.hidden = false;
    const card = gamesModal.querySelector(".games-card");
    card.style.animation = "none"; void card.offsetWidth; card.style.animation = "";
  });
  $("gamesClose").addEventListener("click", closeGames);
  gamesModal.addEventListener("click", (e) => { if (e.target === gamesModal) closeGames(); });
  addEventListener("keydown", (e) => { if (e.key === "Escape" && !gamesModal.hidden) closeGames(); });

  // Bolita especial: cena de posada (platillos en Supabase: cena_platillos)
  const cena = document.createElement("button");
  cena.type = "button";
  cena.className = "tile tile-cena";
  cena.setAttribute("aria-label", "Cena de posada");
  cena.style.setProperty("--rot", "3deg");
  cena.style.setProperty("--d", `${(0.6 + people.length * 0.08).toFixed(2)}s`);
  cena.innerHTML = `<img src="img/cena.svg" alt="Cena" loading="lazy"><span>Cena \ud83e\uded4</span>`;
  collage.appendChild(cena);

  const esc = (t) => t.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  // Selector visual de "\u00bfqui\u00e9n lo lleva?" con fotitos
  const pop = $("cenaPop");
  const pick = $("cenaPick");
  pop.innerHTML = [...people].sort((a, b) => a.name.localeCompare(b.name, "es"))
    .map((p) => `<button type="button" role="option" data-id="${p.id}" aria-selected="false"
        aria-label="${esc(p.name)}" title="${esc(p.name)}"><img src="${p.img}" alt="" loading="lazy"></button>`).join("");
  const togglePop = (open) => {
    pop.hidden = !open;
    pick.setAttribute("aria-expanded", String(open));
    if (open) (pop.querySelector('[aria-selected="true"]') || pop.querySelector("button")).focus();
  };
  function setQuien(id) {
    const p = byId[id];
    $("cenaQuien").value = p ? id : "";
    $("cenaPickFace").innerHTML = p ? `<img src="${p.img}" alt="">` : "\ud83d\ude4b";
    $("cenaPickName").textContent = p ? p.name : "\u00bfQui\u00e9n?";
    pick.classList.toggle("chosen", Boolean(p));
    pop.querySelectorAll("button").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.id === id)));
  }
  pick.addEventListener("click", () => togglePop(pop.hidden));
  pop.addEventListener("click", (e) => {
    const b = e.target.closest("button[data-id]");
    if (!b) return;
    setQuien(b.dataset.id);
    togglePop(false);
    $("cenaError").textContent = "";
    $("cenaSave").focus();
  });
  document.addEventListener("click", (e) => {
    if (!pop.hidden && !pop.contains(e.target) && !pick.contains(e.target)) togglePop(false);
  });

  let platillos = [];
  function renderCena() {
    $("cenaList").innerHTML = platillos.length
      ? platillos.map((it, i) => {
          const p = byId[it.person_id];
          return `<li style="--i:${Math.min(i, 10)}">
            ${p ? `<img src="${p.img}" alt="">` : ""}
            <span class="cena-dish">${esc(it.platillo)}</span>
            <span class="cena-who">${esc(p ? p.name : it.person_id)}</span>
            ${it.id ? `<button type="button" class="cena-del" data-id="${it.id}"
              aria-label="Borrar ${esc(it.platillo)}" title="Borrar">\ud83d\uddd1\ufe0f</button>` : ""}
          </li>`;
        }).join("")
      : `<li class="soon">A\u00fan no hay platillos, \u00a1agrega el primero!</li>`;
  }
  $("cenaList").addEventListener("click", async (e) => {
    const b = e.target.closest(".cena-del");
    if (!b) return;
    const id = Number(b.dataset.id);
    const it = platillos.find((x) => x.id === id);
    if (!it || !confirm(`\u00bfBorrar "${it.platillo}"?`)) return;
    b.disabled = true;
    $("cenaError").textContent = "";
    try {
      const r = await api("rpc/borrar_platillo", { method: "POST", body: JSON.stringify({ platillo_id: id }) });
      if (!r.ok) throw new Error(r.status);
      platillos = platillos.filter((x) => x.id !== id);
      renderCena();
    } catch (err) {
      b.disabled = false;
      $("cenaError").textContent = "No se pudo borrar, intenta otra vez";
    }
  });
  function loadCena() {
    if (!cartasOn) return renderCena();
    return api("cena_platillos?select=id,platillo,person_id&order=creado.desc")
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((rows) => { platillos = rows; renderCena(); })
      .catch((e) => console.warn("No pude cargar la cena", e));
  }

  $("cenaForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const platillo = $("cenaPlatillo").value.trim();
    const quien = $("cenaQuien").value;
    $("cenaError").textContent = "";
    if (!platillo || !quien) {
      $("cenaError").textContent = "Escribe el platillo y elige qui\u00e9n lo lleva";
      return;
    }
    const btn = $("cenaSave");
    btn.disabled = true;
    try {
      const r = await api("rpc/agregar_platillo", { method: "POST", body: JSON.stringify({ platillo, quien }) });
      if (!r.ok) throw new Error(r.status);
      platillos.unshift({ platillo, person_id: quien });
      renderCena();
      $("cenaPlatillo").value = "";
      setQuien("");
      $("cenaPlatillo").focus();
      loadCena();
    } catch (err) {
      $("cenaError").textContent = "No se pudo guardar, intenta otra vez";
    } finally {
      btn.disabled = false;
    }
  });

  const cenaModal = $("cenaModal");
  const closeCena = () => (cenaModal.hidden = true);
  cena.addEventListener("click", () => {
    cenaModal.hidden = false;
    cenaModal.scrollTop = 0;
    loadCena();
    const w = cenaModal.querySelector(".cena-wrap");
    w.style.animation = "none"; void w.offsetWidth; w.style.animation = "";
  });
  $("cenaClose").addEventListener("click", closeCena);
  cenaModal.addEventListener("click", (e) => { if (e.target === cenaModal) closeCena(); });
  addEventListener("keydown", (e) => {
    if (e.key !== "Escape" || cenaModal.hidden) return;
    if (!pop.hidden) { togglePop(false); pick.focus(); } else closeCena();
  });


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
      .then(() => { orderCollage(); refreshBadges(); })
      .catch((e) => console.warn("No pude cargar las cartas", e));
  }

  // Badge de carta (estilo notificación) en las burbujas de quien ya escribió
  function refreshBadges() {
    document.querySelectorAll(".tile[data-person]").forEach((t) => {
      const has = Boolean(cartas[t.dataset.person]);
      let b = t.querySelector(".badge");
      if (has && !b) {
        b = document.createElement("i");
        b.className = "badge";
        b.setAttribute("aria-hidden", "true");
        b.textContent = "💌";
        t.appendChild(b);
      } else if (!has && b) b.remove();
      const name = byId[t.dataset.person].name;
      t.setAttribute("aria-label", has ? `Ver la carta de ${name} (ya escribió su carta)` : `Ver la carta de ${name}`);
    });
  }

  function renderMine() {
    const box = $("mine");
    box.hidden = !cartasOn || !session;
    if (box.hidden) return;
    const has = Boolean(cartas[session.giver.id]);
    const name = session.giver.name;
    $("mineStatus").textContent = has
      ? `\u2705 ${name}, ya llenaste tu carta,\npuedes editarla cuando quieras`
      : `${name}, a\u00fan no has llenado tu carta,\npuedes hacerlo cuando quieras`;
    $("writeMine").textContent = has ? "\u270f\ufe0f Editar mi carta" : "\u270d\ufe0f Escribir mi carta";
  }
  $("writeMine").addEventListener("click", () => session && openLetter(session.giver, "edit"));

  const modal = $("letterModal"), stage = $("stage");
  const body = $("letterBody"), editForm = $("letterEdit"), text = $("letterText");
  let timers = [];
  let editing = null;

  // ---------- Amor a las cartas (likes sin contador) ----------
  // El nivel es relativo a la carta m\u00e1s querida: aura de corazones, brillo y
  // un coraz\u00f3n que se llena, sin mostrar n\u00fameros.
  const amor = {}; // person_id -> likes
  const amorReady = cartasOn
    ? api("amor_cartas?select=person_id,likes")
        .then((r) => (r.ok ? r.json() : []))
        .then((rows) => rows.forEach((a) => (amor[a.person_id] = Number(a.likes))))
        .catch((e) => console.warn("No pude cargar el amor", e))
    : Promise.resolve();
  // Base fija: con 1000 likes una carta ya es "de las m\u00e1s queridas".
  const LOVE_BASE = 1000;
  // [likes m\u00ednimos, mensaje], de menor a mayor
  const LOVE_MSGS = [
    [0, "S\u00e9 el primero en mandarle amor \ud83d\udc8c"],
    [1, "\u00a1Le lleg\u00f3 su primer amorcito! \ud83e\udd79"],
    [10, "Le est\u00e1 llegando amorcito \ud83d\udc97"],
    [30, "Ya se siente tibiecita \u263a\ufe0f"],
    [60, "Esta carta ya est\u00e1 calientita \u2615"],
    [100, "Huele a ponche reci\u00e9n hecho \ud83c\udf75"],
    [175, "Ya trae los cachetes chapeados \ud83d\ude0a"],
    [250, "\u00a1Mucho amor por aqu\u00ed! \ud83d\udc95"],
    [350, "Derretida como bombón en chocolate caliente \ud83c\udf6b"],
    [450, "La est\u00e1n apapachando bien bonito \ud83e\udd17"],
    [550, "Brilla m\u00e1s que las luces del arbolito \ud83c\udf84"],
    [650, "\u00a1A esta carta la quieren much\u00edsimo! \ud83d\udc96"],
    [800, "Ya casi, casi es de las m\u00e1s queridas \ud83d\udc93"],
    [900, "\u00a1A un pasito de ser de las m\u00e1s queridas! \ud83d\udc98"],
    [LOVE_BASE, "\u00a1De las m\u00e1s queridas de la posada! \u2764\ufe0f"],
  ];
  const loveMsg = (n) => LOVE_MSGS.reduce((m, [min, txt]) => (n >= min ? txt : m), LOVE_MSGS[0][1]);
  const AURA_EVERY = [0, 1500, 950, 620, 400, 230]; // ms entre corazones del aura por nivel
  let loveFor = null, lovePending = 0, loveFlushT = null, auraT = null, auraLevel = -1;

  function loveLevel(pid) {
    const n = amor[pid] || 0;
    if (!n) return { n, level: 0, fill: 0 };
    const rel = Math.sqrt(Math.min(n, LOVE_BASE) / LOVE_BASE); // ra\u00edz: que el poco amor tambi\u00e9n se note
    return { n, level: Math.min(5, 1 + Math.floor(rel * 4)), fill: Math.max(0.15, rel) };
  }
  function renderLove() {
    if (!loveFor) return;
    const { n, level, fill } = loveLevel(loveFor);
    $("loveMsg").textContent = loveMsg(n);
    $("loveLevel").style.transform = `translateY(${(24 * (1 - fill)).toFixed(2)}px)`;
    $("stage").style.setProperty("--love", (level / 5).toFixed(2));
    if (level !== auraLevel) {
      auraLevel = level;
      clearInterval(auraT);
      if (level) auraT = setInterval(auraHeart, AURA_EVERY[level]);
    }
  }
  const HEARTS = ["\u2764\ufe0f", "\ud83d\udc96", "\ud83d\udc95", "\ud83d\udc97", "\ud83e\ude77"];
  const pickHeart = () => HEARTS[Math.floor(Math.random() * HEARTS.length)];
  function auraHeart() {
    if (document.hidden) return;
    const h = document.createElement("i");
    h.textContent = pickHeart();
    h.style.left = `${Math.random() * 100}%`;
    h.style.setProperty("--s", (0.7 + Math.random() * 1.1).toFixed(2));
    h.style.setProperty("--dx", `${(Math.random() * 80 - 40).toFixed(0)}px`);
    h.style.setProperty("--t", `${(5 + Math.random() * 4).toFixed(1)}s`);
    h.addEventListener("animationend", () => h.remove());
    $("loveAura").appendChild(h);
  }
  function burst(x, y, big) {
    const layer = $("loveBurst");
    const n = big ? 14 : 7;
    for (let i = 0; i < n; i++) {
      const h = document.createElement("i");
      h.textContent = pickHeart();
      h.style.left = `${x}px`; h.style.top = `${y}px`;
      h.style.setProperty("--dx", `${(Math.random() * 160 - 80).toFixed(0)}px`);
      h.style.setProperty("--dy", `${(-120 - Math.random() * 180).toFixed(0)}px`);
      h.style.setProperty("--r", `${(Math.random() * 60 - 30).toFixed(0)}deg`);
      h.style.setProperty("--s", (0.8 + Math.random() * 0.9).toFixed(2));
      h.style.animationDelay = `${(Math.random() * 0.12).toFixed(2)}s`;
      h.addEventListener("animationend", () => h.remove());
      layer.appendChild(h);
    }
    if (big) {
      const pop = document.createElement("b");
      pop.textContent = "\u2764\ufe0f";
      pop.style.left = `${x}px`; pop.style.top = `${y}px`;
      pop.addEventListener("animationend", () => pop.remove());
      layer.appendChild(pop);
    }
  }
  function flushLove() {
    clearTimeout(loveFlushT); loveFlushT = null;
    if (!lovePending || !loveFor) return;
    const pid = loveFor;
    while (lovePending > 0) {
      const n = Math.min(lovePending, 50);
      lovePending -= n;
      api("rpc/dar_amor", { method: "POST", keepalive: true, body: JSON.stringify({ pid, n }) })
        .catch((e) => console.warn("No se pudo mandar el amor", e));
    }
  }
  function giveLove(x, y, big) {
    if (!loveFor) return;
    amor[loveFor] = (amor[loveFor] || 0) + 1;
    lovePending++;
    burst(x, y, big);
    renderLove();
    const btn = $("loveBtn");
    btn.classList.remove("beat"); void btn.offsetWidth; btn.classList.add("beat");
    if (navigator.vibrate) navigator.vibrate(12);
    clearTimeout(loveFlushT);
    loveFlushT = setTimeout(flushLove, 800);
  }
  $("loveBtn").addEventListener("click", (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    giveLove(r.left + r.width / 2, r.top + r.height / 2, false);
  });
  // Doble tap sobre la carta, como en Instagram
  let lastTap = 0;
  body.addEventListener("pointerup", (e) => {
    const now = Date.now();
    if (now - lastTap < 320) { giveLove(e.clientX, e.clientY, true); lastTap = 0; }
    else lastTap = now;
  });
  function startLove(pid) {
    loveFor = pid; auraLevel = -1;
    $("love").hidden = false;
    renderLove();
  }
  function stopLove() {
    flushLove();
    loveFor = null; auraLevel = -1;
    clearInterval(auraT); auraT = null;
    $("love").hidden = true;
    $("loveAura").replaceChildren();
    $("stage").style.setProperty("--love", "0");
  }

  async function openLetter(p, mode) {
    timers.forEach(clearTimeout); timers = [];
    stopLove();
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
      await amorReady;
      if (!modal.hidden && !editing) startLove(p.id);
    } else {
      body.textContent = `${p.name} a\u00fan no ha escrito su carta \ud83c\udf84`;
    }
  }

  function closeLetter() {
    timers.forEach(clearTimeout); timers = [];
    stopLove();
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
      refreshBadges();
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

  // ---------- Arrullo del Niño (bolita + votación) ----------
  const arrTile = document.createElement("button");
  arrTile.type = "button";
  arrTile.className = "tile tile-arrullo";
  arrTile.setAttribute("aria-label", "\u00bfA qui\u00e9n le toca arrullar al Ni\u00f1o?");
  arrTile.style.setProperty("--rot", "5deg");
  arrTile.style.setProperty("--d", `${(0.6 + people.length * 0.08).toFixed(2)}s`);
  arrTile.innerHTML = `<img src="img/nacimiento.jpg" alt="Arrullo del Ni\u00f1o" loading="lazy"><span>Arrullo \ud83d\udc76</span>`;
  collage.insertBefore(arrTile, games);

  const arrModal = $("arrulloModal"), arrCard = arrModal.querySelector(".arrullo-card");
  const video = $("arrulloVideo"), list = $("arrulloList"), note = $("arrulloNote");
  const VOTOS_MAX = 100;     // tope duro (tambi\u00e9n lo valida votar_arrullo en Supabase)
  const votos = {};          // person_id -> n (lo que dice el servidor + mis votos)
  const voted = new Set();   // por quién ya voté en esta visita a la página
  const rows = {};           // person_id -> { li, bar, count, btn }

  const aaa = $("arrulloAaa");
  aaa.innerHTML = "aaaaa\u2026".split("").map((c, i) => `<i style="--i:${i}">${c}</i>`).join("");

  // Se piden al cargar la página, así al abrir ya están listos.
  async function loadVotos() {
    if (!cartasOn) return;
    try {
      const r = await api("votos_arrullo?select=person_id,votos");
      if (!r.ok) throw new Error(await r.text());
      (await r.json()).forEach((v) => (votos[v.person_id] = v.votos));
    } catch (x) {
      console.warn("No pude cargar los votos", x);
    }
  }
  let votosReady = loadVotos();

  // La lista se construye UNA vez; después solo se actualizan números y barras.
  people.forEach((p) => {
    const li = document.createElement("li");
    li.className = "arrullo-row";
    li.innerHTML = `
      <img src="${p.img}" alt="" loading="lazy">
      <div class="who"><b>${p.name}</b><div class="bar"><div></div></div></div>
      <span class="count">0</span>
      <button type="button" class="vote">+1</button>`;
    const btn = li.querySelector(".vote");
    btn.disabled = !cartasOn;
    btn.addEventListener("click", () => vote(p.id));
    rows[p.id] = { li, bar: li.querySelector(".bar div"), count: li.querySelector(".count"), btn };
  });
  note.textContent = cartasOn
    ? "Puedes votar por varias personas, una vez por cada una. Toca \u2705 para quitar tu voto \ud83d\ude0a"
    : "La votaci\u00f3n a\u00fan no est\u00e1 disponible.";

  function paint() {
    for (const p of people) {
      const r = rows[p.id], n = votos[p.id] || 0;
      r.count.innerHTML = `<b>${n}</b><small>/${VOTOS_MAX}</small>`;
      r.count.setAttribute("aria-label", `${n} de ${VOTOS_MAX} votos`);
      r.bar.style.width = `${Math.min(n, VOTOS_MAX) / VOTOS_MAX * 100}%`;
      const mine = voted.has(p.id);
      const full = !mine && n >= VOTOS_MAX;
      const gold = n >= VOTOS_MAX;
      if (gold && !r.li.classList.contains("gold")) {
        r.li.classList.remove("gold-pop"); void r.li.offsetWidth; r.li.classList.add("gold-pop");
      }
      r.li.classList.toggle("gold", gold);
      r.li.classList.toggle("voted", mine);
      r.li.classList.toggle("full", full);
      r.btn.textContent = mine ? "\u2705" : full ? "\ud83d\udcaf" : "+1";
      r.btn.disabled = !cartasOn || full;
      r.btn.setAttribute("aria-label", mine ? `Quitar voto a ${p.name}`
        : full ? `${p.name} ya lleg\u00f3 al tope de ${VOTOS_MAX} votos` : `Votar por ${p.name}`);
      r.btn.title = full ? `\u00a1Ya lleg\u00f3 a ${VOTOS_MAX} votos!` : "";
    }
  }

  function sortRows() {
    [...people]
      .sort((a, b) => (votos[b.id] || 0) - (votos[a.id] || 0) || a.name.localeCompare(b.name, "es"))
      .forEach((p, i) => { rows[p.id].li.style.setProperty("--i", i); list.appendChild(rows[p.id].li); });
  }

  // Toggle: primer clic suma 1, segundo clic lo quita (solo los votos de esta visita).
  function vote(id) {
    if (!cartasOn) return;
    const adding = !voted.has(id);
    if (adding && (votos[id] || 0) >= VOTOS_MAX) return paint();
    const apply = (add) => {
      if (add) { voted.add(id); votos[id] = (votos[id] || 0) + 1; }
      else { voted.delete(id); votos[id] = Math.max(0, (votos[id] || 0) - 1); }
      paint();
    };
    apply(adding);
    const c = rows[id].count;
    c.classList.remove("bump"); void c.offsetWidth; c.classList.add("bump");
    // En segundo plano: la pantalla no espera al servidor.
    const body = adding ? { nuevo: id, anterior: null } : { nuevo: null, anterior: id };
    api("rpc/votar_arrullo", { method: "POST", body: JSON.stringify(body) })
      .then((r) => { if (!r.ok) throw new Error(r.status); })
      .catch((x) => {
        console.error("No se guard\u00f3 el voto", x);
        apply(!adding);
      });
  }

  arrTile.addEventListener("click", () => {
    arrModal.hidden = false;
    arrCard.style.animation = "none"; void arrCard.offsetWidth; arrCard.style.animation = "";
    arrModal.scrollTop = 0;
    // reproducir dentro del click para que el navegador permita el sonido
    video.currentTime = 0;
    video.play().catch(() => { video.muted = true; video.play().catch(() => {}); });
    // Pinta ya con lo que hay en memoria; el orden solo cambia al abrir.
    sortRows(); paint();
    votosReady.then(() => { votosReady = loadVotos(); return votosReady; }).then(paint);
  });
  const closeArrullo = () => { arrModal.hidden = true; video.pause(); };
  $("arrulloClose").addEventListener("click", closeArrullo);
  arrModal.addEventListener("click", (e) => { if (e.target === arrModal) closeArrullo(); });
  addEventListener("keydown", (e) => { if (e.key === "Escape" && !arrModal.hidden) closeArrullo(); });

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
