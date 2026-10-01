# Hearthline design notes

This records the reusable design approach behind the current site. It is a reference for future web projects, not a request to copy Hearthline's financial model or product copy.

## Experience principles

- Start with the user's task. Show a useful control or result before asking them to read a product story.
- Keep primary screens scannable: conclusions, numbers, charts and controls stay visible; explanations live in details, tooltips or dedicated pages.
- Ask for familiar inputs first, in small steps. Keep advanced assumptions collapsed until requested.
- Show the source and meaning of a result without implying it is a prediction or sales recommendation.
- Use one strong primary action, clear secondary actions, and a calm visual rhythm. Avoid walls of equal cards or sections with identical width and height.
- Design mobile hierarchy deliberately rather than simply stacking desktop panels.

## Visual recipe

- White base, soft blue surfaces and a fintech-blue accent in light mode; black, charcoal and white in dark mode.
- Large, tightly tracked headings paired with compact, legible labels and tabular numbers.
- Generous section spacing, but varied section widths and alignments. Rounded surfaces group related content; avoid horizontal divider lines.
- Notebook-dot texture only as a quiet background cue, not behind dense reading or data.
- Restrained motion: smooth section navigation and subtle reveal/hover feedback, with reduced-motion support.
- Charts have clear units, a readable legend and a graph-specific explanation behind an info control.

## Reusable implementation patterns

| Pattern | Hearthline source | Reuse guidance |
| --- | --- | --- |
| Header, mobile menu, language/theme controls and footer | `design-preview/src/components/product/shell.tsx` | Adapt navigation and brand; retain compact public/app modes. |
| Localized color and type tokens, dark-mode overrides, dotted backdrop and section navigation | `design-preview/src/index.css` | Move tokens first; copy page-specific selectors only if needed. |
| Guided form and progressive disclosure | `design-preview/src/pages/setup.tsx` | Reuse the structure, not the housing fields or validation rules. |
| Financial number entry | `design-preview/src/components/product/financial-input.tsx` | Preserve locale-aware input handling and caret behavior if the new project needs numbers. |
| Small, interactive example in the hero | `design-preview/src/pages/home.tsx` (`ScenarioDemo`) | Replace with the new project's real interaction; keep it demonstrative, not decorative. |
| Result hierarchy and adjustable assumptions | `design-preview/src/pages/results.tsx`, `design-preview/src/components/product/scenario-control-rail.tsx` | Lead with decision and constraints, then primary chart, milestones and details. |
| Accessible comparison and timeline charts | `design-preview/src/components/product/rent-buy-comparison.tsx`, `design-preview/src/components/product/cash-flow-timeline.tsx` | Reuse chart presentation patterns, not domain-specific series. |

The reusable components still live in this repository. If a second project needs them, extract only the proven shared pieces then; a standalone component package now would add maintenance without proven reuse.
