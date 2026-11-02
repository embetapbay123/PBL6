# UI audit fixes — 2026-11-03

Source: the user's “UI/UX Audit Report — PBL6 Marketplace Frontend”. Baseline `a516118`. Desktop-only scope; no backend, database or policy change.

## Finding decisions

| # | Decision and implemented result |
| --- | --- |
| 1 CSS fragmentation | Merged the two shopping patch sheets into readable `live/commerce.css` in their original order. Consolidated root/type declarations, removed the obsolete imports/files, and reduced specificity of generic button rules. Shared primitives have their own explicit stylesheet; chat and Store application layouts remain scoped. This is not a claim that all feature CSS should become one global file. |
| 2 Button variants | Added a typed shared Button with primary/secondary/danger/ghost/icon, sizes, loading and disabled behavior. Migrated 47 previously styled buttons in 22 files, plus shared pagination/forms, copy and payment actions. Native defaults/handlers and existing submit types are preserved. Unmigrated native controls share the same medium height/padding fallback. Legacy demo-only components are outside this production change. |
| 3 Important messages | Shared Alert has severity, icon, semantic role and actions. ErrorView preserves the original API message/retry and displays support details clearly. |
| 4 Theme tokens | Central palette supplies both Tailwind brand/primary utilities and CSS variables. Production accent is `#c64220`; semantic error/warning/success/info remain distinct. Replaced repeated theme literals in commerce styles; illustration/category/chat-specific colors are intentionally not all one accent. |
| 5 Type scale | Body/h1/h2/h3/labels use shared tokens rather than competing root definitions. Component-specific headings retain deliberate sizes. |
| 6 Header | Production shopping navigation has a separated portal group, a clear Store entry and no duplicate Store Portal link. The gradient header in the report is the legacy demo path. Mobile dock assessment is excluded by the user's desktop-only requirement. |
| 7 Spacing | Removed built-in generic button margins. Shared actions use `gap`; 10 adjacent action runs now have explicit layout containers. Existing specialized toolbar/menu/purchase layouts retain their own gap. |
| 8 Font weights | Normalized 650/750 in touched styles to the supplied 600/700 static font faces, and corrected the static Bold face's weight descriptor. Numeric 650 is valid CSS, so the report's “invalid weight” wording is not itself a browser defect. |
| 9 Loading/empty | Shared inline spinner, card/row skeleton and icon-based empty state; catalog uses the shared skeleton. Loading motion honors reduced-motion. Initial loading no longer announces a second “updating” status. |
| 10 Copy support ID | ErrorView and payment setup errors show a selectable code plus a keyboard-operable copy button with success/failure feedback. The ID remains selectable when clipboard access is denied. Same root issue as #3, not a separate counted bug. |
| 11 Payment warning | UNKNOWN/expired are warnings, failed/error states are errors, and confirmed received/refunded states are success notices. UNKNOWN retains read-only reconciliation and never creates another attempt merely by refreshing. |

`bootstrap/components.tsx` is shared by the production routes; the report's claim that the entire bootstrap folder is demo-only is inaccurate. The existing native Modal and its focus/confirmation behavior remain. No package/transport/router replacement or automatic mobile testing was introduced.

## Validation and evidence

TypeScript passed. 46 desktop browser tests passed; two legacy fixture-only cases were skipped because this run uses the API mode. Desktop browser checks cover the existing payment, Round 3 editing/admin flows and chat regressions, plus four focused cases: copy API correlation ID by keyboard and retry, reduced-motion catalog skeleton, UNKNOWN readback without creating payment attempts, and separated Owner navigation/token consistency. Fixture evidence proves the controlled UI behavior; it does not stand in for payment-provider verification.

Evidence is under ignored `artifacts/ui-audit-fix/`: `migration.json`, `browser/`, `foundation/` and `final-browser/` and `release-browser/`. Production screenshots and smoke results are recorded separately after deployment. No mobile, physical-device or screen-reader validation is claimed. Audit “blocker” labels are not inherited as evidence of operational P0/P1 failures.

Shared components compose the project's existing React/Lucide primitives; no claim is made that these wrappers are installed shadcn components. A later registry adoption should replace one component at a time after checking Tailwind v3 compatibility, rather than layering another global theme over this one.
