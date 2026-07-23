# Security policy

## Supported versions

Frameflow is in early development and does not yet publish stable release branches.

| Version | Supported |
| --- | --- |
| Current `main` branch | Yes |
| Older commits and unofficial forks | No |

## Report a vulnerability

Do not open a public issue for a suspected vulnerability.

Use GitHub's **Security** tab and choose **Report a vulnerability** to send the maintainers a private report. If private vulnerability reporting is not available, open a public issue containing only a request for private contact. Do not include exploit details, secrets, private screenshots, or personal data in that issue.

Include as much of the following as possible in the private report:

- Affected commit or version.
- Impact and realistic attack scenario.
- Reproduction steps or a minimal proof of concept.
- Browsers and operating systems tested.
- Suggested mitigation, if known.
- Whether the issue has been disclosed elsewhere.

Maintainers will acknowledge reports and coordinate a fix and disclosure on a best-effort basis. Please allow a reasonable remediation window before public disclosure.

## Security boundaries

- `MOONSHOT_API_KEY` is a server-side secret. It must never use a `VITE_` prefix or appear in browser code, logs, screenshots, issues, or commits.
- `.env.local` is ignored by Git and must remain untracked.
- Uploaded images and projects stay in IndexedDB during normal editing.
- Screenshots selected for an AI run are sent to Moonshot AI.
- Self-hosters are responsible for protecting their proxy, provider key, access logs, and usage quota.
- Static deployments must not embed a provider key in JavaScript.

If a key is accidentally exposed, revoke it at the provider immediately, remove it from the current files, and treat it as compromised even if the Git commit is later rewritten.
