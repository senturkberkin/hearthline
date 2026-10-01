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

Scenario inputs stay in browser session storage. Language and light/dark preference stay in local storage. The TÜİK rent reference is a bundled public JSON file that users choose whether to apply. No financial inputs are sent to a service.

The landing page's sample is fictional and labeled as such. The results route labels the initial sample as an example until a user creates or changes a scenario.

## Composition

- `src/index.css` owns palette, type, radius, and semantic chart tokens.
- `src/components/ui` contains shadcn-generated components (Radix Nova preset). Their Button/Input sizing has been lightly tailored to this product.
- `src/components/product` composes comparison, chart, assumption rail, financial inputs, month picker, and shell from those primitives.
- `src/lib/engine.ts` contains the ported financial calculator; `src/lib/product-context.tsx` owns scenario and preference state.
- `src/pages` contains the three consumer screens; `src/main.tsx` selects a route by pathname.

The currency/percentage input is custom because it needs locale-aware grouping, decimal parsing, and caret preservation that a generic text field does not provide. The month picker uses a shadcn ToggleGroup because it is a single-choice control rather than a native date input. Recharts is used through the shadcn Chart wrapper for the time series. The step indicator is custom because the project has no reusable stepper primitive; underlying action controls otherwise use shadcn components.

The legacy static files remain for regression checks and should not be used as the production entry point.
