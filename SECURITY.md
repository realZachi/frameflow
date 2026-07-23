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

- AI provider keys use `VITE_*` variables and are intentionally visible to the local browser. Use dedicated local-development keys with restrictive quotas where possible.
- `.env.local` is ignored by Git and must remain untracked.
- Never publish or deploy a build created with provider keys configured.
- Uploaded images and projects stay in IndexedDB during normal editing.
- Screenshots selected for an AI run are sent to the selected provider. Google, Qwen, OpenAI, and Anthropic are contacted directly; Moonshot goes through the same-origin local CORS proxy.
- Users are responsible for protecting provider keys and usage quotas.
- A hosted AI-enabled deployment requires an authenticated backend and must not reuse the localhost-only key setup.

If a key is accidentally exposed, revoke it at the provider immediately, remove it from the current files, and treat it as compromised even if the Git commit is later rewritten.
