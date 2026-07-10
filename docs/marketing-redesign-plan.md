# Marketing Site Redesign — Execution Plan

**Goal:** rebuild the TurfPro marketing site to match the reference homepage design (bold green two-tone headlines, photo-feel hero with floating tablet + phone device mockups, trust logo bar, icon-column feature rows, industry section with floating notification chips, integrations bar, testimonial with floating stat card, dark stats band, resource cards, CTA bands), then propagate that exact system across every marketing page — the 12 template pages today and the hundreds of SEO/comparison/vertical pages planned in `docs/master-roadmap.md` (Wave 12).

**Who runs this:** hand to a cost-efficient agent session. This plan is self-contained — every file, pattern, and verification step is spelled out. Design system already exists (`tokens.css`, `Poppins` display font, `.module.css` files, `Reveal`/`Stagger` motion). Do not restyle from scratch; extend what's there.

---

## Part A — Current state (what's already written, uncommitted)

An in-progress commit exists on disk. **First step for the executor: run `npx tsc --noEmit` and `npm run build`, then fix whatever breaks** (this work was interrupted mid-flight and is NOT verified). Files touched:

| File | State | Notes |
|---|---|---|
| `src/components/marketing/device-mocks.tsx` | **NEW, likely OK** | Exports `DashboardMock` (tablet dashboard: sidebar, KPI cards, SVG route map, revenue area chart, schedule list) and `PhoneMock` (phone frame: greeting, today's schedule rows, tab bar). Both use classes from `features.module.css`. |
| `src/components/marketing/features.module.css` | **EDITED, likely OK** | Appended phone-frame styles (`.phone`, `.phoneNotch`, `.phoneHeader`, `.phoneGreeting`, `.phoneDate`, `.phoneSectionLabel`, `.phoneList`, `.phoneRow`, `.phoneTime`, `.phoneStop`, `.phoneTabs`, `.phoneTabActive`) before the `/* Category tab bar */` block. Existing dashboard-mock classes unchanged. |
| `src/components/marketing/features-page.tsx` | **EDITED, likely OK** | Removed its local `DashboardMock`, now imports it from `./device-mocks`. `MapPin` import may now be unused → remove if `tsc` complains. |
| `src/components/marketing/home.module.css` | **NEW, likely OK** | Full homepage stylesheet: `.hero`, `.heroGrid`, `.heroTitle` (em = green), `.deviceStack`/`.tabletFrame`/`.phoneFloat`, `.logoBar`/`.brandLogo`, `.section`/`.sectionHead`/`.kicker`/`.sectionTitle`, `.iconCols`/`.iconCol` (uses `--cols` custom prop), `.industryCard`/`.floatChip`/`.industryVisual`, `.advantage`, `.integrations`, `.testimonial`/`.statCard`/`.portrait`, `.statsBand`/`.statBlock`, `.resourcesGrid`/`.resourceCard`. |
| `src/components/marketing/turf-pro-marketing.tsx` | **REWRITTEN, VERIFY CAREFULLY** | New homepage sections (`HomeHero`, `TrustBar`, `ToolsRow`, `IndustrySection`, `AdvantageStrip`, `CapabilitiesSection`, `TestimonialSection`, `StatsBand`, `ResourcesSection`) + exported `CtaBand`. `TurfProMarketingPage` template now splits its title into two-tone (`splitTitle` helper) and adds a `CtaBand`. **Known compile risks below.** |

### KNOWN COMPILE RISKS in `turf-pro-marketing.tsx` (check these first)

1. **`Stagger` prop support.** The new code passes `step`, `gap`, and `style` to `<Stagger>` (e.g. `<Stagger className={hm.iconCols} style={{ "--cols": 5 } as React.CSSProperties}>` and `<Stagger className={hm.resourceCards} step={1}>`). **Verify `Stagger` in `src/components/marketing/reveal.tsx` accepts `step`, `gap`, and `style` props.** If it doesn't:
   - `style`: wrap the grid in a plain `<div style=...>` and put `<Stagger>` inside, OR add `style?: CSSProperties` passthrough to `Stagger`.
   - `step`: if unsupported, drop it (it just delays the stagger start).
   - `gap`: `Reveal` uses `step`; `Stagger` in existing code is called with `gap` in the OLD homepage (`gap={0.08}`) so it's probably fine — confirm.
2. **`React.CSSProperties` reference** without importing React namespace. File is a Server Component (no `"use client"`). Either `import type { CSSProperties } from "react"` and use `as CSSProperties`, or confirm `React.CSSProperties` resolves. Two call sites use `{ "--cols": N } as React.CSSProperties`.
3. **`StaggerItem` `style` prop** — the `IndustrySection` floating chips use `<div className={hm.floatChip} style={style}>` (plain divs, fine), but confirm no `StaggerItem` gets a `style`.
4. **Unused imports** — the big lucide import list may include unused icons after edits. `tsc`/eslint will flag; remove them.
5. **`splitTitle` on template pages** — it splits the last 3 words into the green span. Some page titles in `src/data/marketing.ts` are short; the helper guards `words.length <= 3` but eyeball a couple rendered pages (e.g. `/crm`, `/dispatch`) to ensure the split reads well. If any look awkward, the cleaner fix is to add an explicit `titleAccent?: string` field to `MarketingPage` and each page's data (optional enhancement, not required).

### Verify the homepage renders (all 10 sections, in order)
Hero → TrustBar → ToolsRow (5 cols) → IndustrySection (with 4 floating chips) → AdvantageStrip → CapabilitiesSection (6 cols) + integrations bar → TestimonialSection (quote + stat card) → StatsBand (dark, 4 stats) → ResourcesSection (3 cards) → CtaBand. Compare against the reference screenshots section-for-section.

---

## Part B — Remaining work to finish the homepage restyle

1. **Fix all compile errors from Part A** until `tsc`, `npm run build`, `npx vitest run`, `npx playwright test` all pass.
2. **e2e assertions** — `e2e/app.spec.ts` checks homepage copy. The current homepage h1 is now "The All-in-One CRM Built for Outdoor Professionals" (changed from "The outdoor CRM that follows the work."). **Update the e2e assertion** (search `app.spec.ts` for `/The outdoor CRM/` and `Get Started`) to match the new hero, or the desktop+mobile homepage tests will fail. New assertion target: heading `/All-in-One CRM Built for/i`; the header CTA is still `Get Started` → `/signin`.
3. **Responsive check** at 375px (mobile), 768px (tablet), 1400px (desktop): device stack should collapse (phone hides under `40rem` via `.phoneFloat` display), icon columns go 2-up then 5/6-up, industry card stacks, testimonial stat card stays on-canvas.
4. **Reduced-motion**: `Reveal`/`Stagger` already collapse duration to 0 — no action, just confirm.

---

## Part C — Propagate the system across all pages

### C1. Nav: Features dropdown + confirm structure
`src/data/marketing.ts` → `marketingNav` already has Solutions/Resources dropdowns + About. **Optionally** give `Features` a dropdown too (children: Features overview, plus the module pages) to match the reference's "Features ▾". Low priority — the reference shows Features with a caret. If added, follow the existing `children` array shape; `chrome.tsx` `NavDropdown` already renders it.

### C2. Template pages already inherit the restyle
`TurfProMarketingPage` (in `turf-pro-marketing.tsx`) now renders two-tone titles + a CtaBand. This covers all 12 `/[slug]` pages (features detail, solutions, lead-ops, crm, dispatch, field, job-costing, cost-intelligence, admin-controls, integrations, resources — see `src/app/[slug]/page.tsx`). **Verify each renders** by spot-checking 2–3 slugs. The `features` slug uses the dedicated `FeaturesPage` (already restyled earlier), not the template.

### C3. Legal + missing footer pages (NEW)
Footer links reference pages that don't exist yet. Create minimal but on-brand pages so no link 404s:
- `/privacy` and `/terms` — `src/app/privacy/page.tsx`, `src/app/terms/page.tsx`. Use a simple legal-doc layout: `MarketingNav`, a `styles.pageHero` header (two-tone title), prose sections, `Footer`. Add a reusable `LegalPage({ title, updated, sections })` component in `src/components/marketing/legal-page.tsx` and drive both from data.
- Footer columns in `src/components/marketing/footer.tsx` link to `/about`, `/security`, `/resources`, `/demo`, `/integrations`, module pages, `/signin` — all exist. Add `/privacy` + `/terms` to the footer bottom bar (reference shows "Privacy Policy · Terms of Service" bottom-right).
- Company column links (`/careers`, `/contact`, `/blog`, `/guides`, `/webinars`, `/help`, `/training`, `/status`, `/partners`) in the reference are placeholders — either point them to the nearest existing page (`/resources`, `/demo`) or create thin stub pages. Simplest: keep footer to pages that exist; don't add dead links.

### C4. Dedupe the CtaBand
`CtaBand` is now exported from `turf-pro-marketing.tsx`. The `features-page.tsx` still has its own inline CTA band markup. **Refactor `features-page.tsx` to import and use `CtaBand`** for consistency (optional but tidy).

---

## Part D — Lock the design system as the reference for the hundreds of planned pages

This is the part the user cares about most: "iterate across the hundreds of pages from a planning perspective." The redesign must become the **template** for Wave 12 of `docs/master-roadmap.md` (comparison pages, alternative pages, vertical landers, programmatic local SEO, calculators, blog, glossary, case studies, etc. — 30+ page *types*, potentially hundreds of URLs).

**Add a "Marketing design system" section to `docs/master-roadmap.md`** (under Wave 12 or as a new appendix) codifying the reusable page-building kit so every future page is consistent and cheap to generate:

### D1. Page archetypes (each = a reusable React component + a data shape)
1. **Landing/vertical archetype** (like the homepage): hero + device mock + trust bar + icon rows + industry section + testimonial + stats + resources + CTA. Data-driven: `{ hero, tools[], industry, testimonial, stats[], resources[] }`. Use for `/lawn-care`, `/landscaping`, `/tree-care`, `/pest-control`, `/irrigation`, `/snow` vertical landers.
2. **Comparison archetype** (`/vs-jobber`, `/vs-servicetitan`, `/vs-realgreen`, …): hero ("TurfPro vs {Competitor}") + side-by-side feature table (TurfPro ✓ / competitor ✓/✗ rows) + "why operators switch" cards + migration CTA. Data: `{ competitor, rows: [{feature, us, them}], switchReasons[] }`.
3. **Alternative archetype** (`/jobber-alternative`, …): SEO-tuned variant of comparison, single-column, keyword-dense intro + feature checklist + testimonial + CTA. Data: `{ competitor, intro, advantages[] }`.
4. **Programmatic local SEO archetype** (`/lawn-care-software/[state]` or `/[metro]`): templated hero with location merge + local proof + generic feature grid + CTA. Generate from a `states.ts` / `metros.ts` data file via `generateStaticParams`.
5. **Tool/calculator archetype** (`/tools/roi-calculator`, `/tools/lawn-pricing`, `/tools/snow-contract`): interactive client component with inputs → result + email-gate CTA. Each is a `"use client"` island inside the marketing shell.
6. **Content archetype** (blog post, guide, glossary term, case study): `MarketingNav` + article header (two-tone title, meta) + prose (MDX or data) + related-content cards + newsletter CTA + `Footer`. Data or MDX under `content/`.
7. **Legal/simple archetype** (from C3): header + prose + footer.

### D2. Shared kit every archetype composes (build once, reuse everywhere)
- `MarketingNav`, `Footer`, `Reveal`/`Stagger` — exist.
- `CtaBand` — exists (exported).
- **`SectionHead`** — extract the `hm.sectionHead`/`kicker`/`sectionTitle` (two-tone) pattern into a `<SectionHead kicker title accent lede />` component so every page gets identical section headers.
- **`IconColumns`** — extract `hm.iconCols`/`iconCol` into `<IconColumns cols items={[{icon,title,body}]} />`.
- **`StatBand`** — extract the dark stats band into `<StatBand title accent stats={[{icon,value,label}]} />`.
- **`DeviceMock`** — `device-mocks.tsx` exists; add more variants over time (dispatch board mock, invoice mock — already partially in `features.module.css`).
- **`FeatureTable`** (new, for comparison pages) — `<FeatureTable us them rows />`.
- **`FloatingChips`** (new) — extract the industry-section chip overlay for reuse on vertical landers.
- Put these in `src/components/marketing/kit/` so page generation is "assemble from kit + data," not bespoke CSS per page.

### D3. Data-driven generation
- Each archetype reads a typed data object (like `MarketingPage` today). Author page content as data files (`src/data/marketing/comparisons.ts`, `verticals.ts`, `locations.ts`) so hundreds of pages = hundreds of data entries + one component each, statically generated via `generateStaticParams`.
- Technical SEO per page: `generateMetadata` (title/description/OG), `schema.org` JSON-LD, canonical URLs, sitemap entries. Add a `src/lib/seo.ts` helper the archetypes call.

### D4. Update the roadmap
Edit `docs/master-roadmap.md` Wave 12 to reference this design system and archetypes explicitly, so the executor building the SEO pages assembles from the kit rather than reinventing. Add one line to the run protocol: "All marketing pages compose the `src/components/marketing/kit/` archetypes; no bespoke page CSS."

---

## Verification (run after each part)

1. `npx tsc --noEmit` — clean.
2. `npm run build` — clean (Next static export of all marketing routes).
3. `npx vitest run` — 13 pass (unchanged; marketing isn't unit-tested).
4. `npx playwright test` — 12 pass **after** updating the homepage-copy assertion in `e2e/app.spec.ts` (Part B step 2).
5. Visual: `npm run dev`, walk `/`, `/features`, 2–3 template slugs, `/privacy`, `/terms` at 375/768/1400px. Compare `/` against the reference screenshots section-by-section.
6. Commit per logical chunk (homepage fix, propagation, kit extraction, roadmap update), push to `main`.

## Commit sequence (suggested)
1. "Rebuild homepage to reference design (device mocks, trust bar, industry chips, stats band)" — Parts A+B.
2. "Propagate marketing restyle: template CTAs, legal pages, footer links" — Part C.
3. "Extract marketing kit + document page archetypes for Wave 12" — Part D.
