(() => {
  const $ = (id) => document.getElementById(id);
  const people = window.PEOPLE || [];
  const byId = Object.fromEntries(people.map((p) => [p.id, p]));

  // ---------- Collage ----------
  const collage = $("collage");
  [...people]
    .sort(() => Math.random() - 0.5)
    .forEach((p, i) => {
      const t = document.createElement("div");
      t.className = "tile";
      t.style.setProperty("--rot", `${(Math.random() * 16 - 8).toFixed(1)}deg`);
      t.style.setProperty("--d", `${(0.6 + i * 0.08).toFixed(2)}s`);
      t.innerHTML = `<img src="${p.img}" alt="${p.name}" loading="lazy"><span>${p.name}</span>`;
      collage.appendChild(t);
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
        show(byId[res.g], byId[res.r]);
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
  function show(g, r) {
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
    input.value = ""; btn.disabled = true;
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
    const colors = ["#f6c453", "#c8102e", "#1c8a57", "#fff8ec", "#ff8fa3"];
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
