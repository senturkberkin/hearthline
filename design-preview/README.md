# Hearthline web app

This React, Tailwind CSS, and shadcn/ui app is the active rent-vs-buy simulator. The former static implementation remains at the repository root as a reference while the new app is validated. The financial formulas were ported without intended changes and are checked against the legacy engine by the parity test.

From the repository root:

```sh
npm --prefix design-preview install
npm run dev
npm test
npm run build
```

Open `/` for the landing page, `/setup` for the guided scenario, and `/results` for live results. The former `/design/*` URLs remain aliases. The development server uses port 4174.

Active scenario inputs stay in browser session storage. Named scenarios use a single versioned local-storage store only after an explicit save, and later edits to an opened saved scenario update that local copy. Language and light/dark preference stay in separate local storage. The TÜİK rent reference is a bundled public JSON file that users choose whether to apply. The findings report is rendered in memory and uses browser Print / Save PDF. No financial inputs are sent to a service.

The landing page's sample is fictional and labeled as such. The results route labels the initial sample as an example until a user creates or changes a scenario.

## Composition

- `src/index.css` owns palette, type, radius, and semantic chart tokens.
- `src/components/ui` contains shadcn-generated components (Radix Nova preset). Their Button/Input sizing has been lightly tailored to this product.
- `src/components/product` composes comparison, chart, assumption rail, financial inputs, month picker, and shell from those primitives.
- `src/lib/engine.ts` contains the ported financial calculator; `src/lib/product-context.tsx` owns scenario and preference state. `src/lib/saved-scenarios.ts` is the sole boundary for opt-in saved financial scenarios and keeps metadata separate from the canonical payload.
- `src/pages` contains the three consumer screens; `src/main.tsx` selects a route by pathname.

The currency/percentage input is custom because it needs locale-aware grouping, decimal parsing, and caret preservation that a generic text field does not provide. The month picker uses a shadcn ToggleGroup because it is a single-choice control rather than a native date input. Recharts is used through the shadcn Chart wrapper for the time series. The step indicator is custom because the project has no reusable stepper primitive; underlying action controls otherwise use shadcn components.

The legacy static files remain for regression checks and should not be used as the production entry point.

## Optional Google Analytics 4

Analytics is build-time gated by `VITE_GA_MEASUREMENT_ID`. With no valid `G-...` value, no consent prompt or Google tag is included at runtime. The GitHub Pages workflow reads the repository Actions variable `GA_MEASUREMENT_ID` and passes it to the Vite build.

Before setting that variable:

1. In Google Analytics, open **Admin → Data streams → Web stream** and turn **Enhanced measurement** off. This app sends its own single, sanitized `page_view`; leaving Enhanced Measurement on can independently collect page URLs, scrolls, outbound links, site-search terms, downloads, and form interactions.
2. Keep Google signals, advertising personalization, user-provided data collection, and granular location/device collection disabled. Do not link the property to advertising products.
3. Set event/user data retention to the minimum suitable period (two months is the GA4 minimum) and disable reset-on-new-activity if longer identifier persistence is not needed.
4. In the GitHub repository, open **Settings → Secrets and variables → Actions → Variables**, create `GA_MEASUREMENT_ID`, and paste the exact Measurement ID. It is a publishable identifier, so use a repository variable rather than a secret.
5. Run the **Deploy website** workflow again. Verify in a private browser window that no request to `googletagmanager.com` or `google-analytics.com` occurs before consent or after rejection, and that allowing analytics produces one `page_view` whose location has no query string or fragment.

The implementation uses basic consent mode: Google code is not loaded and no consent ping is sent before opt-in. It records no calculator events and never reads scenario state. The only event is a manually controlled page view with a fixed title, sanitized origin/path, and a referrer reduced to its origin. Analytics cookies are capped at 90 days without rolling renewal. Visitors can change their choice from the footer.
