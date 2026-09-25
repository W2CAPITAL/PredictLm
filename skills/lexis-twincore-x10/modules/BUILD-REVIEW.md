# BUILD CODE REVIEW

Sources:
- truongnh1992/gemini-ai-code-reviewer (MIT)
- Addy-shetty/Vibe-Prompting (MIT)

## Build contract

SPEC → IMPLEMENT → DIFF REVIEW → SMOKE/COUNCIL → REPAIR → RE-REVIEW → PACKAGE.

### Diff-first review
Review changed files before re-reading the whole project.
Ignore generated/lock/build noise.
Findings must name a concrete file and severity.

Blocking examples:
- hard-coded provider credentials;
- provider/API secrets exposed through VITE_*;
- unsafe HTML without sanitization;
- sensitive token/password persistence in localStorage;
- browser Authorization built from a client-visible secret.

Non-blocking quality findings:
- swallowed exceptions;
- TODO/FIXME/HACK in changed source;
- placeholder interactions;
- changed source with no project tests.

AI/neural review supplements deterministic checks. It never replaces build, typecheck, smoke or tests.

### Prompt contract

Build prompt enhancement compiles into:
GOAL → CURRENT CONTEXT → REQUIREMENTS → ACCEPTANCE CHECKS.

Specialized modes reuse the same contract. Do not duplicate huge prompts.
The source project Vibe-Prompting exposes provider keys in frontend examples; PredictLM explicitly does NOT inherit that pattern.
