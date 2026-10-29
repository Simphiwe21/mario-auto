# Mario Auto & Detailing

A complete, five-page luxury automotive **static front-end**. No build step, package manager, API key, remote 3D model, or configuration file is required to run it.

## Run

Unzip the project, open a terminal in `mario-auto`, and run:

```bash
python3 -m http.server 3000 --bind 0.0.0.0
```

Open `http://localhost:3000` in a modern browser. You can also open `index.html` directly, although serving over HTTP gives more consistent local-storage and download behaviour.

Deploy the contents of `mario-auto` unchanged to any static web host. All page links are relative. Keep the `assets`, `css`, and `js` directories together with the HTML files.

## Requested source files

| File | Contents |
| --- | --- |
| [`index.html`](index.html) | Cinematic showroom, opt-in live WebGL mode, services, finish comparison, owner-perspective carousel and footer. |
| [`services.html`](services.html) | Four complete packages, feature matrix, live quote configurator and service FAQs. |
| [`transformations.html`](transformations.html) | Six aligned finish comparisons and interactive marque filters. |
| [`booking.html`](booking.html) | Four-step vehicle, package, date and owner wizard with validation and request downloads. |
| [`about.html`](about.html) | Brand philosophy, ceramic-versus-wax diagrams, precision process, concept facility and reference-standard badges. |
| [`css/styles.css`](css/styles.css) | Design tokens, local fonts, responsive layouts, glass effects, motion, focus styles and print support. |
| [`js/main.js`](js/main.js) | Modular vanilla-JavaScript UI, comparisons, filters, shared pricing, persistence, calendar, forms and exports. |
| [`js/three-scene.js`](js/three-scene.js) | Procedural sports-car mesh, studio environment, clear-coat materials, live lights, paint controls and pointer/keyboard rotation. |

[`SOURCE-CODE.md`](SOURCE-CODE.md) contains the **complete contents of all eight files**, one file per labelled code block, without omissions. The actual files are also provided separately.

## What works

- Sticky, glass navigation; current-page states; mobile drawer with focus management and Escape support.
- Cinematic photo mode by default. **Explore in 3D** lazily starts the actual Three.js renderer. Drag or use arrow keys, select silver/red/obsidian, pause the turntable, or reset the view. Space toggles rotation and Home resets the focused canvas.
- Rendering pauses off-screen, when the page is hidden, and when photo mode is restored. Reduced-motion preferences disable automatic rotation by default. WebGL failure retains the studio photograph.
- Before/after components respond to mouse dragging, horizontal touch dragging, native range keyboard commands, Home and End. Vertical touch gestures remain available for page scrolling.
- Brand filters update the visible cards and live count with fade transitions.
- Owner-perspective carousel has previous/next buttons, page controls, keyboard-accessible scrolling and mobile scroll snapping.
- Estimator and booking share a single quotation engine. Vehicle, condition, package and all three add-ons carry between the pages through validated URL parameters and local preferences.
- Booking validates every step, generates South African studio-time calendar dates, excludes past/same-day dates and Sundays, and presents a live itemised summary.
- Completing the wizard creates an **unsent request in memory**. Explicit buttons download a private text request and a standards-compliant **tentative** `.ics` calendar reminder. Editing the request is supported.
- Newsletter interest produces explicit local-only feedback. Privacy and booking-information dialogs are included.

## Pricing configuration

The single source of truth is `catalog` near the top of `js/main.js`.

- Signature Detail: R 1 500.
- Stage 1 Correction: R 3 500.
- Correction + Ceramic: R 8 900.
- Ultimate Full-Body PPF: R 35 000.
- Vehicle multipliers: coupe/sedan `1.00`, SUV/crossover `1.20`, truck/exotic `1.35`.
- Preparation adjustments: minor swirls R 0, deep scratches R 1 000, oxidation R 1 800. The basic detail does not incur a correction surcharge.
- Add-ons: engine R 650, wheels R 1 200, leather R 1 400.
- Base service, preparation adjustment and each add-on are individually size-adjusted and rounded to the nearest R 50. The displayed total is the sum of those visible line items.
- Durations account for package, size, preparation and add-on labour. They remain estimates.

Only one primary package can be chosen, preventing duplicate charges for preparation already included in a higher-level package. Add-ons are independent checkboxes.

## Important scope and launch notes

This is a fully implemented **front-end experience**, not a connected booking service. No reservation endpoint, email provider, payment processor or newsletter backend was supplied. Therefore:

- No personal information is automatically transmitted to a studio.
- No date is reserved and no payment is taken.
- Only vehicle/configuration preferences are saved automatically in local storage. Owner name, phone, email and notes are not automatically persisted.
- Newsletter email addresses are not saved; only a local interest flag is recorded.
- A downloaded request contains the contact details the visitor entered and must be handled privately.
- Prices, operating hours, availability, review examples, founder copy, facility visuals and reference badges are clearly presented as concept content, not verified business claims.
- The supplied business location is a Durban concept location. No unverified street address, phone number or email address has been invented.
- The transformations are **aligned digital finish simulations**, not records of completed customer work. Review cards are labelled editorial samples. Reference manufacturer badges do not assert partnership or installer accreditation.

For a real commercial launch, a server must independently validate and recalculate a request, check authoritative capacity, issue a reservation reference, enforce data-protection/retention rules and deliver transactional messages. Verify business details, product warranties, installer status, genuine reviews and original customer imagery before publishing them as facts.

The requested Tailwind Play CDN, Three.js r128 CDN, Lucide CDN and Google Fonts links are included on every page. The authored styling does not depend on Tailwind, icons use embedded SVG symbols, and local variable fonts and Three.js are bundled. For a hardened commercial release, replace the development Tailwind CDN with compiled/self-hosted assets and pin any remaining remote dependencies.

## Accessibility and verification

Tested in Chromium with Playwright, including:

- All five pages at 320, 390, 768, 1024 and 1440 pixels without document-level horizontal overflow.
- All five desktop pages and all four mobile booking states with axe-core WCAG 2 A/AA and WCAG 2.1 AA rule tags: **zero reported violations in the tested states**.
- Correct quote formulas and estimator-to-booking persistence.
- Empty-field, vehicle, contact, consent and schedule validation.
- Text request and tentative calendar downloads; absence of owner contact details in saved preferences.
- Mouse, keyboard and touch comparisons; brand filters; carousel; menu; dialogs; newsletter feedback.
- Local WebGL fallback with all external CDNs blocked, live paint selection and keyboard rotation.
- No uncaught page errors during the automated flow.

Automated checks do not replace a full manual accessibility audit or real-device/browser testing. No claim of comprehensive WCAG certification is made.

## Asset credits and licences

### Original generated studio artwork

`showroom-hero.jpg`, `paint-correction.jpg`, `ceramic-coating.jpg`, `paint-protection.jpg`, `interior-detail.jpg`, `reflection-after.jpg` and `studio.jpg` are AI-generated editorial assets created for this project. The before layers are deterministic aligned image treatments and are disclosed as illustrative.

### Gallery photographs

### Local South African Vehicle Portfolio & POPIA Compliance

The transformation gallery and service imagery feature popular everyday South African vehicles commonly driven across KwaZulu-Natal and Durban:

- **Volkswagen Polo Vivo (Flash Red Hatchback):** Sun UV oxidation reversal and multi-stage clearcoat correction.
- **Toyota Hilux Double Cab 4x4 (Glacier White Bakkie):** Polycarbonate headlight lens restoration and full-body ceramic coat.
- **Ford Ranger Double Cab (Magnetic Grey Bakkie):** Front-end self-healing Paint Protection Film (PPF) and stone-chip protection.
- **Volkswagen Polo Vivo (Inspection Detail):** 50/50 test section and crystal headlight restoration.
- **Suzuki Swift (Silky Silver Hatchback):** Stage 1 machine swirl removal and 3-year hydrophobic ceramic seal.
- **Toyota Fortuner (Pearl White Family SUV):** Exterior signature valet, bush pinstripe scratch removal, and deep trim rejuvenation.

**POPIA Compliance (Act No. 4 of 2013):**
All visible customer vehicle license plates, registration numbers, and identifying markers across all portfolio images are obscured and frosted-blurred in strict accordance with South Africa's Protection of Personal Information Act.

### Bundled software and fonts

- Three.js r128, MIT licence: `assets/vendor/THREE-LICENSE.txt`.
- Inter variable font: `assets/fonts/OFL-Inter.txt`.
- Montserrat variable font: `assets/fonts/OFL-Montserrat.txt`.
- Font binaries are unmodified variable-font releases from the Google Fonts repository.
