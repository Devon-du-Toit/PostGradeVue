# PostGrade UI proposals

Local branch: `UI-improvements_I`. This draft is not published.

Run `npm run dev` and open `/ui-proposal`. Switch styles using the top toolbar. Direct links: `/ui-proposal?style=campus`, `?style=editorial`, and `?style=console`.

- Campus: purple academic palette, persistent sidebar, clear cards and prominent review action.
- Editorial: warm paper surfaces, horizontal navigation, serif headlines and spacious workflow sections.
- Console: dark operational surfaces, compact icon rail, mint actions and denser panels.

Each concept includes overview, searchable courses, sample verification and sign-in/signup previews. Sample confirmation changes only in-memory demo data. Forms do not send credentials or create accounts. Existing app routes remain available through Open PostGrade.

Responsive navigation, semantic form labels, keyboard focus indicators, text status labels, empty states and reduced-motion support are included. The Campus palette is university-inspired; this proposal uses the existing PostGrade logo and an original CSS script illustration, without claiming official NWU branding.

Validation: `npm run build` with `VITE_API_BASE_URL=/api/`, ESLint, and `npx playwright test e2e/uiProposal.spec.ts --project=chromium`. Browser checks cover all three styles, search, verification, signup help and mobile overflow. Screenshots are written to `proposal-previews/`.

