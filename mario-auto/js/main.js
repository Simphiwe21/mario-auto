// js/main.js — Shared UI, comparisons, quotation engine and booking wizard.
(() => {
  "use strict";

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) =>
    Array.from(root.querySelectorAll(selector));
  const reduceMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;
  const motion = reduceMotion ? "auto" : "smooth";
  const STORAGE_KEY = "mario.configuration.v1";
  let memoryPreferences = {};

  const catalog = Object.freeze({
    vehicles: {
      coupe: { label: "Hatchback / Sedan", multiplier: 1 },
      suv: { label: "SUV / Crossover", multiplier: 1.2 },
      exotic: { label: "Bakkie / Double Cab", multiplier: 1.35 },
    },
    conditions: {
      minor: { label: "Minor Swirls", price: 0, extraDays: 0 },
      deep: { label: "Deep Scratches", price: 1000, extraDays: 0.5 },
      oxidation: { label: "Oxidation", price: 1800, extraDays: 1 },
    },
    packages: {
      basic: { name: "Signature Detail", price: 1500, days: [0.5, 0.75] },
      stage1: { name: "Stage 1 Correction", price: 3500, days: [1, 1] },
      ceramic: { name: "Correction + Ceramic", price: 8900, days: [2, 3] },
      ppf: { name: "Ultimate Full-Body PPF", price: 35000, days: [4, 5] },
    },
    addons: {
      engine: { name: "Engine Bay Detail", price: 650, hours: 1 },
      wheels: { name: "Wheel Armor Coating", price: 1200, hours: 1.5 },
      leather: { name: "Interior Leather Coating", price: 1400, hours: 1.5 },
    },
  });

  const money = (value) => `R ${Math.round(value).toLocaleString("en-ZA")}`;
  const round50 = (value) => Math.round(value / 50) * 50;
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  function normaliseConfiguration(raw = {}) {
    return {
      vehicle: Object.hasOwn(catalog.vehicles, raw.vehicle)
        ? raw.vehicle
        : "coupe",
      condition: Object.hasOwn(catalog.conditions, raw.condition)
        ? raw.condition
        : "minor",
      package: Object.hasOwn(catalog.packages, raw.package)
        ? raw.package
        : "ceramic",
      addons: Array.isArray(raw.addons)
        ? [...new Set(raw.addons)].filter((key) =>
            Object.hasOwn(catalog.addons, key),
          )
        : [],
      year: typeof raw.year === "string" ? raw.year.slice(0, 8) : "",
      make: typeof raw.make === "string" ? raw.make.slice(0, 50) : "",
      model: typeof raw.model === "string" ? raw.model.slice(0, 80) : "",
      date:
        typeof raw.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(raw.date)
          ? raw.date
          : "",
      time: ["09:00", "11:00", "14:00"].includes(raw.time) ? raw.time : "",
    };
  }

  function readPreferences() {
    try {
      return normaliseConfiguration(
        JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"),
      );
    } catch {
      return normaliseConfiguration(memoryPreferences);
    }
  }

  function savePreferences(configuration) {
    const safe = normaliseConfiguration(configuration);
    memoryPreferences = safe;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(safe));
    } catch {
      /* Private-mode memory fallback. */
    }
  }

  function initialConfiguration() {
    const saved = readPreferences();
    const params = new URLSearchParams(window.location.search);
    for (const key of ["vehicle", "condition", "package"]) {
      if (params.has(key)) saved[key] = params.get(key);
    }
    if (params.has("addons")) saved.addons = params.get("addons").split(",");
    return normaliseConfiguration(saved);
  }

  /** One source of truth: estimator, booking sidebar and export use the same quote. */
  function calculateQuote(raw) {
    const config = normaliseConfiguration(raw);
    const vehicle = catalog.vehicles[config.vehicle];
    const condition = catalog.conditions[config.condition];
    const service = catalog.packages[config.package];
    const baseCost = round50(service.price * vehicle.multiplier);
    const conditionCost =
      config.package === "basic"
        ? 0
        : round50(condition.price * vehicle.multiplier);
    const addons = config.addons.map((key) => ({
      key,
      ...catalog.addons[key],
      cost: round50(catalog.addons[key].price * vehicle.multiplier),
    }));
    const addonTotal = addons.reduce((sum, item) => sum + item.cost, 0);
    const addonHours = addons.reduce((sum, item) => sum + item.hours, 0);
    let duration;
    if (config.package === "basic") {
      const low = Math.ceil(4 * vehicle.multiplier + addonHours);
      const high = Math.ceil(6 * vehicle.multiplier + addonHours);
      duration = low === high ? `${low} hours` : `${low}–${high} hours`;
    } else {
      const addedDays = condition.extraDays + addonHours / 8;
      const low = Math.ceil(service.days[0] * vehicle.multiplier + addedDays);
      const high = Math.ceil(service.days[1] * vehicle.multiplier + addedDays);
      duration =
        low === high
          ? `${low} ${low === 1 ? "day" : "days"}`
          : `${low}–${high} days`;
    }
    return {
      config,
      vehicle,
      condition,
      service,
      baseCost,
      conditionCost,
      addons,
      addonTotal,
      total: baseCost + conditionCost + addonTotal,
      duration,
    };
  }

  function makeIcon(name) {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("class", "icon");
    svg.setAttribute("aria-hidden", "true");
    const use = document.createElementNS("http://www.w3.org/2000/svg", "use");
    use.setAttribute("href", `#i-${name}`);
    svg.append(use);
    return svg;
  }

  function toast(message, lifetime = 6500) {
    const stack = $("#toast-stack");
    if (!stack) return;
    while (stack.children.length >= 3) stack.firstElementChild.remove();
    const node = document.createElement("div");
    node.className = "toast";
    const text = document.createElement("p");
    text.textContent = message;
    const close = document.createElement("button");
    close.type = "button";
    close.setAttribute("aria-label", "Dismiss notification");
    close.append(makeIcon("x"));
    close.addEventListener("click", () => node.remove());
    node.append(text, close);
    stack.append(node);
    window.setTimeout(() => node.remove(), lifetime);
  }

  function initNavigation() {
    const header = $(".site-header");
    const toggle = $(".menu-toggle");
    const drawer = $("#mobile-menu");
    if (!header || !toggle || !drawer) return;
    let previousFocus = null;
    let scheduled = false;
    const setMenu = (open, restoreFocus = true) => {
      if (open) previousFocus = document.activeElement;
      drawer.hidden = !open;
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute(
        "aria-label",
        open ? "Close navigation" : "Open navigation",
      );
      $("use", toggle)?.setAttribute("href", open ? "#i-x" : "#i-menu");
      document.body.classList.toggle("menu-open", open);
      for (const el of [$("#main-content"), $(".site-footer")]) {
        if (el) el.inert = open;
      }
      if (open) $("a", drawer)?.focus();
      else if (restoreFocus && previousFocus instanceof HTMLElement)
        previousFocus.focus();
    };
    toggle.addEventListener("click", () => setMenu(drawer.hidden));
    $$("a", drawer).forEach((link) =>
      link.addEventListener("click", () => setMenu(false, false)),
    );
    document.addEventListener("keydown", (event) => {
      if (drawer.hidden) return;
      if (event.key === "Escape") {
        event.preventDefault();
        setMenu(false);
      } else if (event.key === "Tab") {
        const focusable = [toggle, ...$$("a,button:not(:disabled)", drawer)];
        const index = focusable.indexOf(document.activeElement);
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (
          event.shiftKey &&
          (document.activeElement === first || index === -1)
        ) {
          event.preventDefault();
          last.focus();
        } else if (
          !event.shiftKey &&
          (document.activeElement === last || index === -1)
        ) {
          event.preventDefault();
          first.focus();
        }
      }
    });
    window
      .matchMedia("(min-width: 701px)")
      .addEventListener("change", (event) => {
        if (event.matches && !drawer.hidden) setMenu(false, false);
      });
    const updateScroll = () => {
      header.classList.toggle("is-scrolled", window.scrollY > 24);
      scheduled = false;
    };
    window.addEventListener(
      "scroll",
      () => {
        if (!scheduled) {
          scheduled = true;
          requestAnimationFrame(updateScroll);
        }
      },
      { passive: true },
    );
    updateScroll();
  }

  function initComparisons() {
    const comparisons = $$("[data-comparison]");
    if (!comparisons.length) return;
    let active = null;
    let touch = null;
    let lastTouch = 0;
    function update(element, value) {
      const position = clamp(Math.round(value), 0, 100);
      element.style.setProperty("--position", `${position}%`);
      const range = $(".comparison-range", element);
      range.value = String(position);
      range.setAttribute(
        "aria-valuetext",
        `${position} percent before finish, ${100 - position} percent after finish`,
      );
    }
    function updateAt(element, clientX) {
      const bounds = element.getBoundingClientRect();
      if (bounds.width)
        update(element, ((clientX - bounds.left) / bounds.width) * 100);
    }
    function stop() {
      active?.classList.remove("is-dragging");
      active = null;
      touch = null;
    }
    comparisons.forEach((element) => {
      const range = $(".comparison-range", element);
      update(element, Number(range.value));
      range.addEventListener("input", () =>
        update(element, Number(range.value)),
      );
      range.addEventListener("keydown", () =>
        element.classList.add("is-keyboard"),
      );
      element.addEventListener("mousedown", (event) => {
        if (event.button !== 0 || Date.now() - lastTouch < 500) return;
        event.preventDefault();
        active = element;
        element.classList.remove("is-keyboard");
        element.classList.add("is-dragging");
        range.focus({ preventScroll: true });
        updateAt(element, event.clientX);
      });
      element.addEventListener(
        "touchstart",
        (event) => {
          if (event.touches.length !== 1) return;
          lastTouch = Date.now();
          const point = event.touches[0];
          touch = {
            element,
            x: point.clientX,
            y: point.clientY,
            identifier: point.identifier,
            locked: false,
          };
          element.classList.remove("is-keyboard");
          updateAt(element, point.clientX);
        },
        { passive: true },
      );
    });
    window.addEventListener("mousemove", (event) => {
      if (active) updateAt(active, event.clientX);
    });
    window.addEventListener("mouseup", stop);
    window.addEventListener("blur", stop);
    window.addEventListener(
      "touchmove",
      (event) => {
        if (!touch) return;
        const point = Array.from(event.touches).find(
          (item) => item.identifier === touch.identifier,
        );
        if (!point) return;
        const dx = Math.abs(point.clientX - touch.x);
        const dy = Math.abs(point.clientY - touch.y);
        if (!touch.locked && dy > dx * 1.2 && dy > 7) {
          stop();
          return;
        }
        if (!touch.locked && dx > 4) {
          touch.locked = true;
          active = touch.element;
          active.classList.add("is-dragging");
        }
        if (touch.locked) {
          if (event.cancelable) event.preventDefault();
          updateAt(touch.element, point.clientX);
        }
      },
      { passive: false },
    );
    window.addEventListener("touchend", stop, { passive: true });
    window.addEventListener("touchcancel", stop, { passive: true });
  }

  function initGalleryFilters() {
    const buttons = $$("[data-filter]");
    const cards = $$("#transformation-gallery [data-brand]");
    if (!buttons.length || !cards.length) return;
    const pending = new Map();
    buttons.forEach((button) =>
      button.addEventListener("click", () => {
        const filter = button.dataset.filter;
        buttons.forEach((item) =>
          item.setAttribute("aria-pressed", String(item === button)),
        );
        let visible = 0;
        cards.forEach((card) => {
          clearTimeout(pending.get(card));
          const brands = (card.dataset.brand || "").split(/\s+/);
          const matches = filter === "all" || brands.includes(filter);
          if (matches) {
            visible += 1;
            const wasHidden = card.hidden;
            card.hidden = false;
            if (wasHidden) card.classList.add("is-filtering");
            requestAnimationFrame(() => card.classList.remove("is-filtering"));
          } else {
            card.classList.add("is-filtering");
            pending.set(
              card,
              window.setTimeout(
                () => {
                  card.hidden = true;
                },
                reduceMotion ? 0 : 180,
              ),
            );
          }
        });
        $("#gallery-visible-count").textContent = String(visible).padStart(
          2,
          "0",
        );
        $("#gallery-empty").hidden = visible > 0;
      }),
    );
  }

  function initTestimonialCarousel() {
    const track = $("[data-carousel]");
    if (!track) return;
    const prev = $("[data-carousel-prev]");
    const next = $("[data-carousel-next]");
    const dots = $("[data-carousel-dots]");
    const cards = $$(".testimonial-card", track);
    let unit = 1;
    let pages = 1;
    let queued = false;
    function index() {
      return clamp(Math.round(track.scrollLeft / unit), 0, pages - 1);
    }
    function jump(page) {
      track.scrollTo({
        left: clamp(page, 0, pages - 1) * unit,
        behavior: motion,
      });
    }
    function update() {
      const current = index();
      prev.disabled = current === 0;
      next.disabled = current === pages - 1;
      $$("button", dots).forEach((dot, i) =>
        dot.setAttribute("aria-current", String(i === current)),
      );
      queued = false;
    }
    function measure() {
      const gap = parseFloat(getComputedStyle(track).columnGap) || 20;
      unit = cards[0].getBoundingClientRect().width + gap;
      const visible = Math.max(
        1,
        Math.floor((track.clientWidth + gap + 2) / unit),
      );
      pages = Math.max(1, cards.length - visible + 1);
      dots.replaceChildren();
      for (let i = 0; i < pages; i++) {
        const dot = document.createElement("button");
        dot.type = "button";
        dot.setAttribute("aria-label", `Show owner perspective page ${i + 1}`);
        dot.addEventListener("click", () => jump(i));
        dots.append(dot);
      }
      update();
    }
    prev.addEventListener("click", () => jump(index() - 1));
    next.addEventListener("click", () => jump(index() + 1));
    track.addEventListener(
      "scroll",
      () => {
        if (!queued) {
          queued = true;
          requestAnimationFrame(update);
        }
      },
      { passive: true },
    );
    if ("ResizeObserver" in window) new ResizeObserver(measure).observe(track);
    else window.addEventListener("resize", measure);
    measure();
  }

  function configureForm(form, config) {
    $$('input[name="vehicle"]', form).forEach((input) => {
      input.checked = input.value === config.vehicle;
    });
    $$('input[name="condition"]', form).forEach((input) => {
      input.checked = input.value === config.condition;
    });
    const conditionSelect = $('select[name="condition"]', form);
    if (conditionSelect) conditionSelect.value = config.condition;
    const packageSelect = $('select[name="package"]', form);
    if (packageSelect) packageSelect.value = config.package;
    $$('input[name="package"]', form).forEach((input) => {
      input.checked = input.value === config.package;
    });
    $$('input[name="addon"]', form).forEach((input) => {
      input.checked = config.addons.includes(input.value);
    });
  }

  function configurationFromForm(form, previous = {}) {
    const data = new FormData(form);
    return normaliseConfiguration({
      ...previous,
      vehicle: data.get("vehicle"),
      condition: data.get("condition"),
      package: data.get("package"),
      addons: data.getAll("addon"),
      ...["year", "make", "model", "date", "time"].reduce((result, key) => {
        if (data.has(key)) result[key] = String(data.get(key)).trim();
        return result;
      }, {}),
    });
  }

  function initEstimator() {
    const form = $("#estimator-form");
    if (!form) return;
    let config = initialConfiguration();
    configureForm(form, config);
    function update() {
      config = configurationFromForm(form, config);
      const quote = calculateQuote(config);
      $("#estimate-total").textContent = money(quote.total);
      $("#estimate-duration").textContent =
        `Allow ${quote.duration} in the studio`;
      $("#estimate-vehicle").textContent = quote.vehicle.label;
      $("#estimate-condition").textContent = quote.condition.label;
      $("#estimate-package-name").textContent = quote.service.name;
      $("#estimate-adjustment").textContent = quote.conditionCost
        ? money(quote.conditionCost)
        : "Included";
      $("#estimate-addons").textContent = quote.addons.length
        ? quote.addons.map((item) => item.name).join(", ")
        : "None selected";
      const params = new URLSearchParams({
        vehicle: config.vehicle,
        condition: config.condition,
        package: config.package,
      });
      if (config.addons.length) params.set("addons", config.addons.join(","));
      $("#estimate-book").href = `booking.html?${params.toString()}`;
      savePreferences(config);
    }
    form.addEventListener("change", update);
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      window.location.href = $("#estimate-book").href;
    });
    $$("[data-select-package]").forEach((button) =>
      button.addEventListener("click", () => {
        const selected = button.dataset.selectPackage;
        if (!Object.hasOwn(catalog.packages, selected)) return;
        $("#estimate-package").value = selected;
        update();
        $("#estimator").scrollIntoView({ behavior: motion, block: "start" });
        $("#estimate-package").focus({ preventScroll: true });
      }),
    );
    update();
  }

  // Calendar dates are interpreted in the studio's South African timezone.
  function studioToday() {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Africa/Johannesburg",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(new Date());
    const values = Object.fromEntries(
      parts.map((part) => [part.type, part.value]),
    );
    return new Date(
      Number(values.year),
      Number(values.month) - 1,
      Number(values.day),
      12,
    );
  }
  function dateKey(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  }
  function parseDate(key) {
    const [year, month, day] = key.split("-").map(Number);
    const date = new Date(year, month - 1, day, 12);
    return dateKey(date) === key ? date : null;
  }
  function dateLabel(key, full = false) {
    const date = parseDate(key);
    if (!date) return "Date not selected";
    return new Intl.DateTimeFormat("en-ZA", {
      weekday: full ? "long" : "short",
      day: "numeric",
      month: full ? "long" : "short",
      year: "numeric",
    }).format(date);
  }

  function downloadFile(content, type, name) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = name;
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  function initBookingWizard() {
    const form = $("#booking-form");
    if (!form) return;
    let config = initialConfiguration();
    let step = 1;
    let furthest = 1;
    let request = null;
    const today = studioToday();
    const latest = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate() + 90,
      12,
    );
    let calendarMonth = new Date(today.getFullYear(), today.getMonth(), 1, 12);
    const error = $("#wizard-error");
    const steps = $$("[data-wizard-step]", form);
    const stepButtons = $$("[data-wizard-goto]");
    const yearSelect = $("#vehicle-year");
    const makeSelect = $("#vehicle-make");
    const modelInput = $("#vehicle-model");

    function dateIsSelectable(key) {
      const date = parseDate(key);
      // Re-evaluate the lower boundary so a tab left open overnight stays valid.
      const currentDay = studioToday();
      const firstRequestDate = new Date(
        currentDay.getFullYear(),
        currentDay.getMonth(),
        currentDay.getDate() + 1,
        12,
      );
      return Boolean(
        date &&
          date >= firstRequestDate &&
          date <= latest &&
          date.getDay() !== 0,
      );
    }
    if (!dateIsSelectable(config.date)) config.date = "";
    if (config.date) {
      const selected = parseDate(config.date);
      calendarMonth = new Date(
        selected.getFullYear(),
        selected.getMonth(),
        1,
        12,
      );
    }
    for (let year = today.getFullYear() + 1; year >= 1980; year--) {
      yearSelect.add(new Option(String(year), String(year)));
    }
    yearSelect.add(new Option("1979 or earlier / Classic", "classic"));
    configureForm(form, config);
    yearSelect.value = config.year;
    makeSelect.value = config.make;
    modelInput.value = config.model;
    $("#booking-date").value = config.date;
    $$('input[name="time"]', form).forEach((input) => {
      input.checked = input.value === config.time;
    });
    $("#calendar-month").setAttribute("aria-live", "polite");

    const models = {
      Volkswagen: [
        "Polo Vivo",
        "Polo TSI",
        "Golf GTI",
        "Golf R",
        "T-Cross",
        "Taigo",
        "Tiguan",
        "Amarok Double Cab",
      ],
      Toyota: [
        "Hilux Double Cab",
        "Hilux Single Cab",
        "Fortuner",
        "Corolla Quest",
        "Corolla Cross",
        "Starlet",
        "Urban Cruiser",
        "Land Cruiser Prado",
      ],
      Ford: [
        "Ranger Double Cab",
        "Ranger Single Cab",
        "Everest",
        "EcoSport",
        "Fiesta",
      ],
      Suzuki: [
        "Swift",
        "Jimny",
        "Baleno",
        "S-Presso",
        "Grand Vitara",
        "Fronx",
      ],
      Isuzu: ["D-Max Double Cab", "D-Max Single Cab", "mu-X"],
      Hyundai: ["Grand i10", "i20", "Venue", "Creta", "Tucson"],
      Nissan: ["NP200", "Magnite", "Navara", "Almera", "Qashqai"],
      Kia: ["Picanto", "Pegas", "Sonet", "Seltos", "Sportage"],
      Renault: ["Kwid", "Triber", "Kiger", "Clio", "Duster"],
      BMW: ["1 Series", "2 Series", "3 Series", "X1", "X3", "X5"],
      "Mercedes-Benz": ["A-Class", "C-Class", "E-Class", "GLA", "GLC"],
      Audi: ["A1", "A3", "A4", "Q3", "Q5"],
    };
    function updateModels(clearModel = false) {
      const datalist = $("#vehicle-models");
      datalist.replaceChildren();
      (models[makeSelect.value] || []).forEach((model) =>
        datalist.append(new Option(model, model)),
      );
      if (clearModel) modelInput.value = "";
    }
    makeSelect.addEventListener("change", () => {
      updateModels(true);
      updateSummary();
    });
    updateModels();

    function addSummaryLine(parent, label, value, extraClass = "") {
      const row = document.createElement("div");
      row.className = `summary-line ${extraClass}`;
      const left = document.createElement("span");
      const right = document.createElement("span");
      left.textContent = label;
      right.textContent = value;
      row.append(left, right);
      parent.append(row);
    }
    function updateSummary() {
      config = configurationFromForm(form, config);
      const quote = calculateQuote(config);
      const vehicleName = [
        config.year === "classic" ? "Classic" : config.year,
        config.make,
        config.model,
      ]
        .filter(Boolean)
        .join(" ");
      $("#summary-vehicle").textContent =
        vehicleName || "Your vehicle, your story.";
      $("#summary-size").textContent =
        `${quote.vehicle.label} · ${quote.condition.label}`;
      const lines = $("#booking-summary-lines");
      lines.replaceChildren();
      addSummaryLine(lines, quote.service.name, money(quote.baseCost));
      if (quote.conditionCost)
        addSummaryLine(
          lines,
          "Additional preparation",
          money(quote.conditionCost),
        );
      quote.addons.forEach((addon) =>
        addSummaryLine(lines, addon.name, money(addon.cost), "is-addon"),
      );
      if (!quote.addons.length)
        addSummaryLine(lines, "Finishing touches", "None selected", "is-addon");
      $("#booking-total").textContent = money(quote.total);
      $("#booking-duration").textContent =
        `Allow ${quote.duration} in the studio`;
      $("#summary-date").textContent = config.date
        ? dateLabel(config.date)
        : "Your preferred date";
      $("#summary-time").textContent = config.time
        ? `${config.time} drop-off · South Africa (SAST)`
        : "Select a drop-off time";
      const schedule =
        config.date && config.time
          ? `${dateLabel(config.date)} at ${config.time} SAST`
          : "Schedule not yet selected";
      const addonsText = quote.addons.length
        ? ` Add-ons: ${quote.addons.map((item) => item.name).join(", ")}.`
        : "";
      $("#final-review").textContent =
        `${vehicleName || "Vehicle not yet specified"} · ${quote.service.name}.${addonsText} Preferred drop-off: ${schedule}. Estimated total: ${money(quote.total)}. Allow ${quote.duration} in the studio. This request is not a confirmed appointment.`;
      savePreferences(config);
    }

    function renderCalendar(focusKey = "") {
      const days = $("#calendar-days");
      days.replaceChildren();
      $("#calendar-month").textContent = new Intl.DateTimeFormat("en-ZA", {
        month: "long",
        year: "numeric",
      }).format(calendarMonth);
      const year = calendarMonth.getFullYear();
      const month = calendarMonth.getMonth();
      const firstDay = (new Date(year, month, 1, 12).getDay() + 6) % 7;
      for (let i = 0; i < firstDay; i++) {
        const blank = document.createElement("span");
        blank.className = "calendar-blank";
        blank.setAttribute("aria-hidden", "true");
        days.append(blank);
      }
      const count = new Date(year, month + 1, 0, 12).getDate();
      for (let day = 1; day <= count; day++) {
        const date = new Date(year, month, day, 12);
        const key = dateKey(date);
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = String(day);
        button.dataset.date = key;
        button.disabled = !dateIsSelectable(key);
        button.setAttribute(
          "aria-label",
          `${dateLabel(key, true)}${button.disabled ? ", unavailable for requests" : ", preferred drop-off date"}`,
        );
        button.setAttribute("aria-pressed", String(config.date === key));
        if (key === dateKey(today)) button.classList.add("is-today");
        button.addEventListener("click", () => {
          $("#booking-date").value = key;
          updateSummary();
          $$("button", days).forEach((item) =>
            item.setAttribute(
              "aria-pressed",
              String(item.dataset.date === key),
            ),
          );
          error.hidden = true;
        });
        days.append(button);
      }
      const earliestMonth = today.getFullYear() * 12 + today.getMonth();
      const latestMonth = latest.getFullYear() * 12 + latest.getMonth();
      const displayed = year * 12 + month;
      $("#calendar-prev").disabled = displayed <= earliestMonth;
      $("#calendar-next").disabled = displayed >= latestMonth;
      if (focusKey) $(`[data-date="${focusKey}"]`, days)?.focus();
    }
    function moveCalendar(direction) {
      const control = $(direction < 0 ? "#calendar-prev" : "#calendar-next");
      if (control.disabled) return;
      calendarMonth = new Date(
        calendarMonth.getFullYear(),
        calendarMonth.getMonth() + direction,
        1,
        12,
      );
      renderCalendar();
    }
    $("#calendar-prev").addEventListener("click", () => moveCalendar(-1));
    $("#calendar-next").addEventListener("click", () => moveCalendar(1));
    $("#calendar-days").addEventListener("keydown", (event) => {
      const offsets = {
        ArrowLeft: -1,
        ArrowRight: 1,
        ArrowUp: -7,
        ArrowDown: 7,
      };
      const current = event.target.closest("button[data-date]");
      if (!current || !Object.hasOwn(offsets, event.key)) return;
      event.preventDefault();
      const date = parseDate(current.dataset.date);
      date.setDate(date.getDate() + offsets[event.key]);
      const key = dateKey(date);
      if (!dateIsSelectable(key)) return;
      if (
        date.getMonth() !== calendarMonth.getMonth() ||
        date.getFullYear() !== calendarMonth.getFullYear()
      ) {
        calendarMonth = new Date(date.getFullYear(), date.getMonth(), 1, 12);
        renderCalendar(key);
      } else $(`[data-date="${key}"]`, $("#calendar-days"))?.focus();
    });

    function showError(message, field = null) {
      error.textContent = message;
      error.hidden = false;
      if (field) {
        field.focus({ preventScroll: true });
        field.reportValidity?.();
      } else error.scrollIntoView({ behavior: motion, block: "nearest" });
      return false;
    }
    function validateStep(number) {
      updateSummary();
      if (number === 1) {
        modelInput.setCustomValidity(
          modelInput.value.trim() ? "" : "Enter your vehicle model.",
        );
      }
      if (number === 3) {
        if (!dateIsSelectable(config.date))
          return showError(
            "Please select a future drop-off date. Sundays and same-day requests are excluded.",
          );
        if (!config.time)
          return showError("Please select your preferred drop-off time.");
      }
      if (number === 4) {
        const name = $("#owner-name");
        const phone = $("#owner-phone");
        name.setCustomValidity(
          name.value.trim().length >= 2 ? "" : "Enter your full name.",
        );
        const digits = phone.value.replace(/\D/g, "");
        const allowed = /^[+\d\s().-]+$/.test(phone.value);
        phone.setCustomValidity(
          allowed && digits.length >= 7 && digits.length <= 15
            ? ""
            : "Enter a valid phone number with 7 to 15 digits.",
        );
      }
      const section = steps[number - 1];
      const invalid = $$("input,select,textarea", section).find(
        (control) => !control.checkValidity(),
      );
      if (invalid)
        return showError(
          "Please complete the required details before continuing.",
          invalid,
        );
      if (number === 2 && !config.package)
        return showError("Choose a primary service package.");
      error.hidden = true;
      return true;
    }
    function showStep(number, focus = true) {
      step = clamp(number, 1, 4);
      furthest = Math.max(furthest, step);
      steps.forEach((section, index) => {
        section.hidden = index !== step - 1;
      });
      stepButtons.forEach((button) => {
        const number = Number(button.dataset.wizardGoto);
        button.disabled = number > furthest;
        if (number === step) button.setAttribute("aria-current", "step");
        else button.removeAttribute("aria-current");
        button.classList.toggle("is-complete", number < step);
      });
      $("#wizard-back").hidden = step === 1;
      $("#wizard-trust").hidden = step !== 1;
      $("#wizard-next").hidden = step === 4;
      $("#wizard-submit").hidden = step !== 4;
      const labels = [
        "Choose your detail",
        "Find your preferred time",
        "Add your details",
      ];
      if (step < 4) {
        const next = $("#wizard-next");
        next.replaceChildren(
          document.createTextNode(`${labels[step - 1]} `),
          makeIcon("arrow-right"),
        );
      }
      error.hidden = true;
      if (focus) {
        $(".wizard-main").scrollIntoView({ behavior: motion, block: "start" });
        $(`#step-${step}-heading`).focus({ preventScroll: true });
      }
    }
    $("#wizard-next").addEventListener("click", () => {
      if (validateStep(step)) showStep(step + 1);
    });
    $("#wizard-back").addEventListener("click", () => showStep(step - 1));
    stepButtons.forEach((button) =>
      button.addEventListener("click", () => {
        const target = Number(button.dataset.wizardGoto);
        if (target <= furthest && (target <= step || validateStep(step)))
          showStep(target);
      }),
    );
    form.addEventListener("input", (event) => {
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement
      ) {
        event.target.setCustomValidity("");
      }
      error.hidden = true;
      updateSummary();
    });
    form.addEventListener("change", () => {
      error.hidden = true;
      updateSummary();
    });
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      if (step < 4) {
        if (validateStep(step)) showStep(step + 1);
        return;
      }
      if (!validateStep(4)) return;
      // Re-check the full request, including an old tab that may span midnight.
      if (!config.year || !config.make || !config.model.trim()) {
        showStep(1);
        showError("Please complete the vehicle details.");
        return;
      }
      if (!dateIsSelectable(config.date) || !config.time) {
        showStep(3);
        showError("Please choose a valid future date and time.");
        return;
      }
      const data = new FormData(form);
      const random = window.crypto?.randomUUID
        ? window.crypto.randomUUID().slice(0, 6).toUpperCase()
        : Math.random().toString(36).slice(2, 8).toUpperCase();
      const reference = `MA-${dateKey(studioToday()).replaceAll("-", "")}-${random}`;
      request = {
        reference,
        createdAt: new Date().toISOString(),
        status: "UNSENT — NOT RESERVED",
        config: { ...config, addons: [...config.addons] },
        quote: calculateQuote(config),
        owner: {
          name: String(data.get("ownerName")).trim(),
          phone: String(data.get("phone")).trim(),
          email: String(data.get("email")).trim(),
          notes: String(data.get("notes")).trim(),
        },
      };
      $("#request-reference").textContent = reference;
      form.hidden = true;
      $(".wizard-progress").hidden = true;
      $("#booking-success").hidden = false;
      $("#booking-success").scrollIntoView({
        behavior: motion,
        block: "start",
      });
      $("#success-heading").focus({ preventScroll: true });
    });
    $("#download-request").addEventListener("click", () => {
      if (!request) return;
      const { config: c, owner, quote: q } = request;
      const text = [
        "MARIO AUTO & DETAILING",
        "PERSONALISED DETAIL REQUEST",
        "STATUS: UNSENT / NOT RESERVED / NO PAYMENT TAKEN",
        "",
        `Reference: ${request.reference}`,
        `Created: ${request.createdAt}`,
        "",
        "OWNER",
        `Name: ${owner.name}`,
        `Phone: ${owner.phone}`,
        `Email: ${owner.email}`,
        "",
        "VEHICLE",
        `${c.year === "classic" ? "Classic" : c.year} ${c.make} ${c.model}`,
        `Size: ${q.vehicle.label}`,
        `Paint condition: ${q.condition.label}`,
        "",
        "YOUR DETAIL",
        `${q.service.name}: ${money(q.baseCost)}`,
        `Preparation adjustment: ${money(q.conditionCost)}`,
        ...q.addons.map((addon) => `${addon.name}: ${money(addon.cost)}`),
        `Estimated total: ${money(q.total)} ZAR`,
        `Estimated studio duration: ${q.duration}`,
        "",
        "PREFERRED DROP-OFF — SUBJECT TO DIRECT CONFIRMATION",
        `${dateLabel(c.date, true)} at ${c.time} SAST (UTC+02:00)`,
        "",
        "OWNER NOTES",
        owner.notes || "No additional notes.",
        "",
        "IMPORTANT",
        "This front-end demonstration has not sent your details to any business.",
        "Downloading this request does not reserve a date or create a contract.",
        "Share this file directly with the studio to request an inspection and confirmed quote.",
        "Prices, product suitability, accreditation, timing and warranties must be confirmed.",
        "Treat this file as private: it contains your contact information.",
      ].join("\r\n");
      downloadFile(
        text,
        "text/plain;charset=utf-8",
        `${request.reference}-detail-request.txt`,
      );
      toast(
        "Your private request download is ready. Nothing has been sent to the studio.",
      );
    });
    $("#download-calendar").addEventListener("click", () => {
      if (!request) return;
      const { config: c } = request;
      const start = new Date(`${c.date}T${c.time}:00+02:00`);
      const end = new Date(start.getTime() + 30 * 60 * 1000);
      const stamp = (value) =>
        value
          .toISOString()
          .replace(/[-:]/g, "")
          .replace(/\.\d{3}Z$/, "Z");
      const escapeICS = (value) =>
        String(value)
          .replace(/\\/g, "\\\\")
          .replace(/\n/g, "\\n")
          .replace(/;/g, "\\;")
          .replace(/,/g, "\\,");
      const lines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//Mario Auto and Detailing//Local Request//EN",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH",
        "BEGIN:VEVENT",
        `UID:${request.reference}@mario-auto.local`,
        `DTSTAMP:${stamp(new Date())}`,
        `DTSTART:${stamp(start)}`,
        `DTEND:${stamp(end)}`,
        `SUMMARY:${escapeICS("TENTATIVE - Mario detailing request")}`,
        `DESCRIPTION:${escapeICS(`UNSENT REQUEST. This is not a confirmed appointment. Reference: ${request.reference}. Contact the studio directly to confirm availability and a quote.`)}`,
        "STATUS:TENTATIVE",
        "TRANSP:TRANSPARENT",
        "END:VEVENT",
        "END:VCALENDAR",
      ];
      // RFC 5545 line folding: respect the 75-octet limit, including UTF-8.
      const encoder = new TextEncoder();
      const folded =
        lines
          .map((line) => {
            let output = "";
            let current = "";
            for (const char of line) {
              if (encoder.encode(current + char).length > 73) {
                output += `${current}\r\n`;
                current = " ";
              }
              current += char;
            }
            return output + current;
          })
          .join("\r\n") + "\r\n";
      downloadFile(
        folded,
        "text/calendar;charset=utf-8",
        `${request.reference}-tentative.ics`,
      );
      toast(
        "Tentative calendar reminder downloaded. Your preferred slot is not reserved.",
      );
    });
    $("#edit-request").addEventListener("click", () => {
      request = null;
      $("#booking-success").hidden = true;
      form.hidden = false;
      $(".wizard-progress").hidden = false;
      showStep(4);
    });
    renderCalendar();
    updateSummary();
    showStep(1, false);
  }

  function initFooterAndDialogs() {
    $$("[data-current-year]").forEach((node) => {
      node.textContent = String(new Date().getFullYear());
    });
    $$("[data-newsletter]").forEach((form) =>
      form.addEventListener("submit", (event) => {
        event.preventDefault();
        if (!form.reportValidity()) return;
        try {
          localStorage.setItem("mario.newsletterInterest", "true");
        } catch {
          /* Optional local flag. */
        }
        toast(
          "Your interest is recorded on this device only. The mailing list is not connected, so no subscription has been sent.",
        );
        form.reset();
      }),
    );
    const dialog = $("#info-dialog");
    if (!dialog) return;
    const content = {
      privacy: {
        title: "Your details. Your control.",
        html: '<p>This website operates as a pure front-end application without third-party tracking cookies or external ad servers.</p><h3>POPIA Compliance (Act No. 4 of 2013)</h3><p>In accordance with South Africa’s Protection of Personal Information Act, Mario Auto &amp; Detailing respects and safeguards client privacy. All vehicle license plates, registration numbers, and identifying details shown in our portfolio are obscured and blurred to prevent identification.</p><h3>What is saved locally?</h3><p>Your vehicle details, package, add-ons and preferred date are stored solely in your local browser storage so the estimator and booking wizard stay in sync. Your name, email, phone and notes are never stored or uploaded automatically.</p><h3>Downloads &amp; booking requests</h3><p>A request download (.txt or .ics) contains only the vehicle and contact details you personally entered. Keep it private and share it directly with our workshop at 16 Mona Rd, Durban Central or call us at (+27) 078 064 006.</p><button class="btn btn-secondary" type="button" data-clear-local>Clear saved preferences</button>',
      },
      terms: {
        title: "A request. Not a reservation.",
        html: "<p>This is an interactive front-end concept, not a live reservation or payment service. Completing the wizard creates an unsent request in your tab. It is not transmitted and does not reserve a slot.</p><h3>Estimates and availability</h3><p>All ZAR prices and times are indicative. Vehicle condition, preparation, product choice and inspection determine a final written quote. Calendar options are preferences, not real-time availability.</p><h3>Imagery and standards</h3><p>Finish comparisons are illustrative simulations, and review cards are editorial samples. Facility images include AI-generated artwork. No manufacturer partnership, accreditation or warranty eligibility is implied; confirm these directly before commissioning work.</p>",
      },
    };
    $$("[data-info]").forEach((button) =>
      button.addEventListener("click", () => {
        const info = content[button.dataset.info];
        if (!info) return;
        $("#info-dialog-title").textContent = info.title;
        $("[data-dialog-body]", dialog).innerHTML = info.html; // Trusted static copy only; no user input.
        dialog.showModal();
      }),
    );
    $("[data-close-dialog]", dialog).addEventListener("click", () =>
      dialog.close(),
    );
    dialog.addEventListener("click", (event) => {
      const bounds = dialog.getBoundingClientRect();
      if (
        event.target === dialog &&
        (event.clientX < bounds.left ||
          event.clientX > bounds.right ||
          event.clientY < bounds.top ||
          event.clientY > bounds.bottom)
      )
        dialog.close();
      if (event.target.closest("[data-clear-local]")) {
        try {
          localStorage.removeItem(STORAGE_KEY);
          localStorage.removeItem("mario.newsletterInterest");
        } catch {
          /* Storage may be unavailable. */
        }
        memoryPreferences = {};
        toast(
          "Saved preferences cleared. This tab’s current selections remain until you leave.",
        );
        dialog.close();
      }
    });
  }

  function initReveals() {
    if (reduceMotion || !("IntersectionObserver" in window)) return;
    const elements = $$(".reveal");
    if (!elements.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.08, rootMargin: "0px 0px -15px 0px" },
    );
    elements.forEach((element) => observer.observe(element));
    document.documentElement.classList.add("js-reveal");
  }

  // Public, read-only integration surface for the showroom and optional backend adapters.
  window.Mario = Object.freeze({ catalog, calculateQuote, money, toast });
  [
    initNavigation,
    initComparisons,
    initGalleryFilters,
    initTestimonialCarousel,
    initEstimator,
    initBookingWizard,
    initFooterAndDialogs,
    initReveals,
  ].forEach((init) => {
    try {
      init();
    } catch (error) {
      console.error(`[Mario] ${init.name}:`, error);
    }
  });
})();
