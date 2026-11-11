/* Buksh Landscapes — site.js (no dependencies) */
(() => {
  "use strict";
  // Set to a form backend URL (e.g. https://formsubmit.co/ajax/you@domain.com) to POST quotes.
  // Empty = open the visitor's email app with the request filled in.
  const FORM_ENDPOINT = "";
  const PHONE = "780-940-8283";
  const EMAIL = "info@bukshlandscapes.com";

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = matchMedia("(hover: hover) and (pointer: fine)").matches;

  /* ---------------- Season awareness ---------------- */
  const now = new Date();
  const m = now.getMonth();
  const y = now.getFullYear();
  const springYear = m >= 9 ? y + 1 : y;
  const season = m >= 4 && m <= 8 ? "build" : m === 3 || m === 9 ? "shoulder" : "snow";
  const MSG = {
    bar: {
      snow: m <= 1 || m >= 10 ? `Snow season: our crews are clearing lots. Spring ${springYear} design visits are booking now.` : `Spring is close. Book your design visit before the ${springYear} calendar fills.`,
      shoulder: m === 3 ? "The ground is thawing. Spring cleanups and first installs are starting." : "Last weeks before freeze-up: final installs and fall cleanups.",
      build: "Build season: crews are installing across Edmonton, 7 days a week.",
    },
    dial: {
      snow: m <= 1 || m >= 10
        ? `Snow season. Crews are clearing commercial lots while we plan spring ${springYear} builds. Design visits now mean you're first in line when the ground thaws.`
        : `Thaw is weeks away. Yards designed now are the first ones built in ${springYear}.`,
      shoulder: m === 3 ? "The ground is thawing. Booking now gets you an early-season start date." : "Freeze-up is coming. Book now for a fall install or a spring design visit.",
      build: "Peak build season. Book a site visit and we'll give you a written estimate and a start date.",
    },
    short: { snow: m <= 1 || m >= 10 ? `Booking spring ${springYear} design visits.` : `Spring ${springYear} is filling up.`, shoulder: m === 3 ? "Spring installs starting." : "Last weeks before freeze-up.", build: "Build season is on." },
    link: { snow: "Book a design visit", shoulder: "Book a visit", build: "Get a quote" },
  };
  const bar = $("[data-season-bar]");
  if (bar) {
    bar.dataset.season = season;
    $("[data-season-msg]", bar).textContent = innerWidth < 700 ? MSG.short[season] : MSG.bar[season];
    const l = $("[data-season-link]", bar);
    if (l) l.firstChild.textContent = (innerWidth < 700 ? "Book" : MSG.link[season]) + " ";
  }
  $$("[data-months]").forEach((el) => {
    const names = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];
    const kind = (i) => (i >= 4 && i <= 8 ? "m-build" : i === 3 || i === 9 ? "m-shoulder" : "m-snow");
    el.innerHTML = names.map((n, i) => `<span class="${kind(i)}${i === m ? " is-now" : ""}"${i === m ? ' aria-current="date"' : ""}>${n}</span>`).join("");
  });
  $$("[data-dial-msg]").forEach((el) => (el.textContent = MSG.dial[season]));
  $$("[data-dial-now]").forEach((el) => (el.textContent = now.toLocaleDateString("en-CA", { month: "long" }) + " · " + { snow: "Snow season", shoulder: "Shoulder season", build: "Build season" }[season]));

  /* Phone hours (Edmonton time) */
  try {
    const h = +new Intl.DateTimeFormat("en-CA", { hour: "numeric", hour12: false, timeZone: "America/Edmonton" }).format(now);
    const open = h >= 9 && h < 17;
    $$("[data-hours-label]").forEach((el) => (el.textContent = open ? "Answered now · till 5 pm" : "Answered 9 am – 5 pm"));
  } catch (e) { /* keep default */ }

  /* ---------------- Header ---------------- */
  const header = $("[data-header]");
  const hasHero = document.body.classList.contains("has-hero");
  const setSb = () => document.documentElement.style.setProperty("--sb-h", (bar ? bar.offsetHeight : 0) + "px");
  setSb();
  addEventListener("resize", setSb, { passive: true });

  /* ---------------- Mobile menu ---------------- */
  const menu = $("[data-menu]");
  const menuBtn = $("[data-menu-btn]");
  const openMenu = (open) => {
    if (!menu) return;
    if (open) {
      menu.hidden = false;
      requestAnimationFrame(() => menu.classList.add("is-open"));
      document.body.style.overflow = "hidden";
      menuBtn.setAttribute("aria-expanded", "true");
      $("[data-menu-close]").focus();
    } else {
      menu.classList.remove("is-open");
      menu.hidden = true;
      document.body.style.overflow = "";
      menuBtn.setAttribute("aria-expanded", "false");
      menuBtn.focus();
    }
  };
  menuBtn && menuBtn.addEventListener("click", () => openMenu(true));
  $("[data-menu-close]") && $("[data-menu-close]").addEventListener("click", () => openMenu(false));
  menu && menu.addEventListener("click", (e) => { if (e.target.closest("a")) openMenu(false); });
  addEventListener("keydown", (e) => { if (e.key === "Escape" && menu && !menu.hidden) openMenu(false); });

  /* ---------------- Call bar ---------------- */
  const callbar = $("[data-callbar]");
  let formInView = false;
  const qSection = $("#quote");
  if (qSection && "IntersectionObserver" in window) {
    new IntersectionObserver(([en]) => { formInView = en.isIntersecting; }, { threshold: 0.15 }).observe(qSection);
  }

  /* ==========================================================
     Scroll engine: one passive listener, one rAF, batched reads
     --p  : progress of element through viewport (0..1)
     --e  : enter progress (0 = just below fold, 1 = settled)
     scenes: pinned sticky sections with their own progress
     ========================================================== */
  const pEls = $$("[data-p]");
  const eEls = $$("[data-e]");
  const scenes = $$("[data-scene]");
  const active = new Set();
  const all = [...new Set([...pEls, ...eEls, ...scenes])];

  if ("IntersectionObserver" in window && !reduce) {
    const io = new IntersectionObserver((ents) => {
      ents.forEach((en) => (en.isIntersecting ? active.add(en.target) : active.delete(en.target)));
      tick();
    }, { rootMargin: "25% 0px 25% 0px" });
    all.forEach((el) => io.observe(el));
  }

  const sceneHandlers = {};
  let ticking = false;
  let vh = innerHeight;
  addEventListener("resize", () => { vh = innerHeight; tick(); }, { passive: true });

  function frame() {
    ticking = false;
    const sy = scrollY;
    if (header && hasHero) header.classList.toggle("is-solid", sy > 40);
    if (callbar) callbar.classList.toggle("show", sy > 420 && !formInView);
    if (reduce) return;
    // read
    const reads = [];
    active.forEach((el) => reads.push([el, el.getBoundingClientRect()]));
    // write
    for (const [el, r] of reads) {
      if (el.hasAttribute("data-p")) {
        const mode = el.dataset.p;
        const p = mode === "exit" ? clamp(-r.top / r.height) : clamp((vh - r.top) / (vh + r.height));
        el.style.setProperty("--p", p.toFixed(4));
      }
      if (el.hasAttribute("data-e")) {
        const off = parseFloat(el.dataset.e) || 0;
        const e = clamp((vh - r.top - off) / (vh * 0.42));
        const eased = 1 - Math.pow(1 - e, 3);
        el.style.setProperty("--e", eased.toFixed(4));
      }
      if (el.hasAttribute("data-scene")) {
        const p = clamp(-r.top / Math.max(1, r.height - vh));
        el.style.setProperty("--p", p.toFixed(4));
        const fn = sceneHandlers[el.dataset.scene];
        fn && fn(el, p);
      }
    }
  }
  function tick() { if (!ticking) { ticking = true; requestAnimationFrame(frame); } }
  addEventListener("scroll", tick, { passive: true });

  /* ---------------- Anatomy (exploded patio) ---------------- */
  const anatomy = $("[data-scene='anatomy']");
  if (anatomy) {
    const slabs = $$(".slab", anatomy);           // soil, fabric, gravel, sand, pavers
    const steps = $$(".a-step", anatomy);
    const bars = $$(".a-progress i", anatomy);
    const drain = $(".drain", anatomy);
    const N = steps.length;                         // 6 steps
    let last = -1;
    const ease = (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    const apply = (s) => {
      // layers 1..4 drop in during steps 1..4
      slabs.forEach((sl, i) => {
        if (i === 0) return;
        const t = clamp(s - i + 0.15, 0, 1);
        sl.style.setProperty("--off", (1 - ease(t)).toFixed(4));
        sl.style.setProperty("--lblo", (Math.floor(s) === i || s >= N - 1) ? 1 : 0);
      });
      slabs[0].style.setProperty("--lblo", (s < 1 || s >= N - 1) ? 1 : 0);
      const idx = Math.min(N - 1, Math.floor(s));
      if (idx !== last) { steps.forEach((st, i) => st.classList.toggle("is-on", i === idx)); last = idx; }
      bars.forEach((b, i) => b.style.setProperty("--f", clamp(s - i).toFixed(3)));
      drain && drain.style.setProperty("--drain", s < 1 ? 1 : 0);
      anatomy.closest('.anatomy').classList.toggle("is-final", s >= N - 1);
    };
    sceneHandlers.anatomy = (el, p) => apply(clamp(p * 1.08, 0, 1) * (N - 0.001));
    apply(reduce ? N - 0.001 : 0);
  }

  /* ---------------- Work: cylinder carousel ---------------- */
  const work = $("[data-scene='work']");
  if (work) {
    const cards = $$(".cyl-card", work);
    const n = cards.length;
    const desktop = matchMedia("(min-width: 900px)");
    const setX = (card, x) => {
      card.style.setProperty("--x", x.toFixed(4));
      card.style.setProperty("--ax", Math.abs(x).toFixed(4));
      card.style.zIndex = String(100 - Math.round(Math.abs(x) * 10));
    };
    sceneHandlers.work = (el, p) => {
      if (!desktop.matches) return;
      const c = clamp(p * 1.1 - 0.05) * (n - 1);
      cards.forEach((card, i) => setX(card, clamp((i - c) * 0.62, -1.8, 1.8)));
    };
    // mobile: native horizontal swipe, tilt by position in scroller
    const track = $(".cyl-track", work);
    const mobileTilt = () => {
      if (desktop.matches || reduce) return;
      const tr = track.getBoundingClientRect();
      const mid = tr.left + tr.width / 2;
      cards.forEach((card) => {
        const r = card.getBoundingClientRect();
        setX(card, clamp((r.left + r.width / 2 - mid) / tr.width, -1, 1));
      });
    };
    track.addEventListener("scroll", () => requestAnimationFrame(mobileTilt), { passive: true });
    mobileTilt();
    if (reduce) cards.forEach((c) => setX(c, 0));
    desktop.addEventListener("change", () => { mobileTilt(); tick(); });
  }

  /* ---------------- Pointer tilt on service cards ---------------- */
  if (finePointer && !reduce) {
    $$("[data-tilt]").forEach((card) => {
      card.addEventListener("pointermove", (e) => {
        const r = card.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        card.style.setProperty("--tilt-y", (px * 10).toFixed(2) + "deg");
        card.style.setProperty("--tilt-x", (py * -10).toFixed(2) + "deg");
      });
      card.addEventListener("pointerleave", () => {
        card.style.setProperty("--tilt-y", "0deg");
        card.style.setProperty("--tilt-x", "0deg");
      });
    });
  }

  /* ---------------- Snow flakes ---------------- */
  if (!reduce) {
    $$("[data-flakes]").forEach((box) => {
      const count = innerWidth < 700 ? 18 : 36;
      let html = "";
      for (let i = 0; i < count; i++) {
        const s = (Math.random() * 4 + 2).toFixed(1);
        html += `<i style="--l:${(Math.random() * 100).toFixed(1)}%;--s:${s}px;--d:${(Math.random() * 8 + 7).toFixed(1)}s;--dl:-${(Math.random() * 15).toFixed(1)}s;--dx:${(Math.random() * 80 - 40).toFixed(0)}px;--b:${s > 4.5 ? 1.5 : 0}px"></i>`;
      }
      box.innerHTML = html;
    });
  }

  /* ---------------- Sub-nav active state ---------------- */
  const subLinks = $$(".subnav a");
  if (subLinks.length && "IntersectionObserver" in window) {
    const map = new Map(subLinks.map((a) => [a.getAttribute("href").slice(1), a]));
    const io = new IntersectionObserver((ents) => {
      ents.forEach((en) => {
        if (!en.isIntersecting) return;
        subLinks.forEach((a) => a.classList.remove("is-on"));
        const a = map.get(en.target.id);
        if (a) { a.classList.add("is-on"); a.scrollIntoView({ block: "nearest", inline: "center", behavior: reduce ? "auto" : "smooth" }); }
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    map.forEach((_, id) => { const s = document.getElementById(id); s && io.observe(s); });
  }

  /* ---------------- Gallery + lightbox ---------------- */
  const gItems = $$(".g-item");
  $$(".g-filters button").forEach((b) => b.addEventListener("click", () => {
    $$(".g-filters button").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
    const c = b.dataset.filter;
    gItems.forEach((it) => (it.hidden = c !== "all" && it.dataset.cat !== c));
  }));
  const lb = $("[data-lightbox]");
  if (lb) {
    const img = $("[data-lb-img]", lb), cap = $("[data-lb-cap]", lb);
    let list = [], idx = 0, opener = null;
    const show = (i) => {
      idx = (i + list.length) % list.length;
      const b = list[idx];
      img.src = b.dataset.full; img.alt = b.dataset.caption; cap.textContent = b.dataset.caption;
    };
    const close = () => { lb.hidden = true; document.body.style.overflow = ""; opener && opener.focus(); };
    document.addEventListener("click", (e) => {
      const b = e.target.closest("[data-full]");
      if (!b) return;
      list = $$("[data-full]").filter((x) => !x.closest("[hidden]"));
      opener = b; lb.hidden = false; document.body.style.overflow = "hidden"; show(list.indexOf(b));
      $("[data-lb-close]", lb).focus();
    });
    $("[data-lb-close]", lb).addEventListener("click", close);
    $("[data-lb-prev]", lb).addEventListener("click", () => show(idx - 1));
    $("[data-lb-next]", lb).addEventListener("click", () => show(idx + 1));
    lb.addEventListener("click", (e) => { if (e.target === lb) close(); });
    addEventListener("keydown", (e) => {
      if (lb.hidden) return;
      if (e.key === "Escape") close();
      if (e.key === "ArrowLeft") show(idx - 1);
      if (e.key === "ArrowRight") show(idx + 1);
    });
    let sx = 0;
    lb.addEventListener("touchstart", (e) => (sx = e.touches[0].clientX), { passive: true });
    lb.addEventListener("touchend", (e) => { const dx = e.changedTouches[0].clientX - sx; if (Math.abs(dx) > 50) show(idx + (dx < 0 ? 1 : -1)); });
  }

  /* ---------------- Quote form (3 steps) ---------------- */
  const form = $("[data-qform]");
  if (form) {
    const panels = $$(".q-panel", form);
    const dots = $$(".q-steps span", form);
    const back = $("[data-q-back]", form), next = $("[data-q-next]", form), meta = $("[data-q-meta]", form);
    let step = 0;
    // prefill from ?service=
    const pre = new URLSearchParams(location.search).get("service");
    if (pre) $$(`input[name="services"]`, form).forEach((i) => { if (i.value.toLowerCase().includes(pre.toLowerCase())) i.checked = true; });
    const go = (s) => {
      step = s;
      panels.forEach((p, i) => { p.hidden = i !== s; p.classList.toggle("in", i === s); });
      dots.forEach((d, i) => d.classList.toggle("done", i <= s));
      back.hidden = s === 0;
      next.innerHTML = s === panels.length - 1 ? 'Send my request <svg class="i"><use href="#i-arrow"/></svg>' : 'Continue <svg class="i"><use href="#i-arrow"/></svg>';
      meta.textContent = `Step ${s + 1} of ${panels.length}`;
    };
    const validate = () => {
      if (step === 0) {
        const any = $$(`input[name="services"]:checked`, form).length > 0;
        const err = $("[data-err-services]", form);
        err.hidden = any;
        return any;
      }
      if (step === 2) {
        let ok = true;
        $$("[data-req]", form).forEach((inp) => {
          const f = inp.closest(".field");
          let valid = inp.value.trim().length > 1;
          if (inp.type === "tel") valid = inp.value.replace(/\D/g, "").length >= 10;
          if (inp.type === "email" && inp.value) valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inp.value);
          f.classList.toggle("invalid", !valid);
          if (!valid && ok) { inp.focus(); ok = false; }
        });
        return ok;
      }
      return true;
    };
    back.addEventListener("click", () => go(step - 1));
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!validate()) return;
      if (step < panels.length - 1) { go(step + 1); form.scrollIntoView({ block: "nearest", behavior: reduce ? "auto" : "smooth" }); return; }
      if ($(".hp input", form).value) return; // bot
      const fd = new FormData(form);
      const data = {
        services: fd.getAll("services").join(", "),
        property: fd.get("property") || "", timeline: fd.get("timeline") || "", budget: fd.get("budget") || "Not sure",
        name: fd.get("name"), phone: fd.get("phone"), email: fd.get("email") || "", address: fd.get("address") || "", notes: fd.get("notes") || "",
      };
      const body = `New quote request from the website\n\nServices: ${data.services}\nProperty: ${data.property}\nTimeline: ${data.timeline}\nBudget: ${data.budget}\n\nName: ${data.name}\nPhone: ${data.phone}\nEmail: ${data.email}\nAddress / area: ${data.address}\n\nNotes:\n${data.notes}`;
      const done = $("[data-q-done]", form.parentElement);
      const doneMsg = $("[data-q-done-msg]", done);
      next.disabled = true;
      if (FORM_ENDPOINT) {
        try {
          const res = await fetch(FORM_ENDPOINT, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify({ ...data, _subject: `Quote request: ${data.name}` }) });
          if (!res.ok) throw new Error(res.status);
          doneMsg.textContent = `Thanks ${data.name.split(" ")[0]}. Your request is in. We'll call you at ${data.phone} to set up a site visit.`;
        } catch (err) {
          next.disabled = false;
          alert(`Your request didn't send. Please call us at ${PHONE}.`);
          return;
        }
      } else {
        location.href = `mailto:${EMAIL}?subject=${encodeURIComponent("Quote request: " + data.name)}&body=${encodeURIComponent(body)}`;
        doneMsg.textContent = `Thanks ${data.name.split(" ")[0]}. Your email app should now be open with your request filled in. Press send and we'll call you at ${data.phone} to set up a site visit. If nothing opened, call us at ${PHONE}.`;
      }
      form.hidden = true; done.hidden = false; done.focus();
    });
    go(0);
  }

  /* ---------------- Initial paint ---------------- */
  if (reduce) {
    eEls.forEach((el) => el.style.setProperty("--e", 1));
  } else {
    // everything visible at load gets measured immediately
    all.forEach((el) => active.add(el));
    frame();
    // after first measure, rely on IO
    requestAnimationFrame(() => { active.clear(); all.forEach((el) => { const r = el.getBoundingClientRect(); if (r.bottom > -vh * 0.25 && r.top < vh * 1.25) active.add(el); }); });
  }
  tick();
})();
