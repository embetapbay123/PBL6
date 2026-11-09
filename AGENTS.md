# Demo frontend deployment

- After finishing a frontend change, run `npm --prefix frontend run build`. Once the build and any required checks pass, run `powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/deploy-demo-web.ps1` from the repository root. On Windows, `Deploy-Demo-Web.cmd` launches the same script interactively.
- Deploy only after a successful build. If the user asks for a local-only change, skip deployment. Report the deployment result after the script finishes its public smoke check.
- The script deploys the current local frontend to the demo server and replaces only its `web` service. Use a separate deployment procedure for backend or database changes.

# Interface copy

- Follow `frontend/CONTENT_GUIDELINES.md` when adding or changing user-facing text. Keep routine guidance brief, avoid repeated explanations, and put optional reference material in expandable details.
- Keep actionable errors and information about money, quantities, fees, and irreversible actions visible at the relevant step.
