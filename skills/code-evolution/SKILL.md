# Code Evolution

Code evolution is proposal-first.

Pipeline:
evidence → proposal → branch → implementation → unit tests → build → security and license checks → review → pull request.

Newly learned material may generate code automatically, but it cannot update main or production automatically. A passing experiment becomes review-required, not auto-merged.


## Replay before live experimentation

When a change alters exploration/control policy, replay it across recorded discovery traces before spending new live executions. Keep the current policy as baseline, reject recorded regressions, then run a bounded live canary. Replay is a cost-saving prefilter, not a substitute for tests, build, security review or human approval.
