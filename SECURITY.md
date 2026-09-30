# PredictLM Security

PredictLM treats credentials, private deployment addresses, incident notes and detailed security findings as operational information rather than public documentation.

## Responsible disclosure

Do not publish working credentials, customer data, private deployment URLs, exploit steps or weaponized proofs of concept in public issues, discussions or documentation.

Use GitHub private vulnerability reporting / Security Advisories when available. If that channel is unavailable, contact the repository owner through a private channel and provide only the information needed to reproduce and fix the issue.

A useful private report includes the affected component, impact, prerequisites, minimal reproduction, observed result and expected boundary. Redact unrelated private data and rotate any real credential that may have been exposed.

## Deployment principles

- Keep secrets and provider credentials server-side.
- Use separate credentials for owner/browser access and external API clients.
- Apply least privilege to integrations and rotate credentials when exposure is suspected.
- Treat user input, retrieved content, model output and external API responses as untrusted until validated.
- Keep irreversible or privileged external actions behind explicit authorization.
- Keep production configuration in the hosting platform rather than in source control.
- Validate changes with the repository's tests, type checks and production build gates.

## Public documentation policy

Public project documentation describes security only at a high level. It intentionally does not enumerate private deployment topology, active service addresses, live credentials, internal incident details, exploit chains or a complete map of defensive controls.

Security-sensitive operational notes should remain in private deployment records or private vulnerability reports.

## Incident handling

For a suspected compromise, contain the affected integration, rotate relevant credentials, inspect trusted platform/provider logs, patch the smallest verified cause, rerun the project verification gates and restore integrations only after validation.

## Scope

Application controls do not replace hosting-platform IAM, encrypted secret storage, network policy, database backups, provider-side abuse controls, device security, independent security review or deployment-specific legal/compliance requirements.

The project goal is a clear authenticated boundary and conservative handling of external systems without turning the public repository into an operational security manual.
