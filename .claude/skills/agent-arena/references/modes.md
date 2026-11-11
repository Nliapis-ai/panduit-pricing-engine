# Mode details

Use the lightest workflow that covers the user's intent and decision uncertainty. The discussion/review and authorization rules in SKILL.md apply to all modes. Mode names below are compatible with existing requests and checkpoints; they are not a setup questionnaire.

| Mode | Purpose |
|---|---|
| `solo_red_team` | Disclosed self-critique when heterogeneous review is unavailable and this fallback is approved. Never claim independent external participation. |
| `quick_panel` | Short independent second opinions on a small question. An explicit request for discussion still includes actual exchange unless the user chooses one-shot scope. |
| `design_debate` | Independent designs, evidence, critique, steelman, revision and synthesis. |
| `deliberative_analysis` | Expand options and challenge the framing before deciding. |
| `collaborative_design` | Independently sketch, exchange and jointly refine a design or implementation. |
| `evidence_arena` | Extract material claims and verify them against sources, tests or observations. |
| `red_team` | Challenge assumptions, failure modes and hidden tradeoffs in a specified artifact or approach. |
| `code_review_arena` | Inspect actual code/diffs, tests, correctness and implementation risk. |
| `bug_root_cause_arena` | Independently form root-cause hypotheses and identify discriminating tests. |
| `implementation_plan_review` | Inspect an existing plan against requirements, feasibility and missing checks. |
| `decision_memo_arena` | A consequential decision with alternatives, evidence, uncertainty and dissent. |
| `tree_search` | Explore distinct branches when the option space is large; prune with explicit evidence and criteria. |
| `full_arena` | Independent generation, evidence, critique, revision, blind/rubric judging and synthesis. |
| `supervised_execution` | Arena directs and verifies each executor step and final answer; [separate lifecycle](supervised-execution.md). |
| `companion_review` | Persistent automatic parallel review overlay; [separate lifecycle](companion-review.md). |

## Collaborative design

Each participant first proposes a design independently. Exchange actual proposals and strongest concerns, then refine interfaces, dependencies, acceptance criteria and implementation choices. Participants can change their positions without erasing original dissent. Do not reduce a co-designer to rubber-stamping a primary-authored plan.

When implementation is requested, record the agreed design, modify within scope, and review the actual resulting files and checks. Focus later rounds on material changes and remaining findings with relevant surrounding context accessible. There is no fixed “1–3 rounds” contract. If the user asks to continue until convergence, apply the same-final-revision acceptance rule in SKILL.md. For ordinary work, use decision sufficiency without demanding universal agreement.

## Deliberative analysis

Define the decision, constraints and evaluation criteria. Challenge a narrow A/B or A+B framing: consider a materially different approach, reframing, doing neither, and a small reversible experiment where useful. Do not invent options merely to satisfy a count.

Compare feasibility, evidence, failure modes, costs and reversibility. Steelman the strongest rejected alternative, identify assumptions that would flip the recommendation, and give the cheapest decisive check. Use a short premortem where failure would be consequential. A separate `deliberative-analysis` skill can help but is not required.

## Evidence and judging

Use a compact ledger for claims that affect the decision: claim, supported/refuted/uncertain, raw source/check, reviewer, limitations. Agreement is not verification. Distinguish inspected design, source, actual output, runtime capacity, measured performance and scientific inference.

In `full_arena`, judge the alternatives against user criteria, correctness, evidence, feasibility, cost and simplicity. Blind author identities when practical; do not discard technical context needed for evaluation. A separate judge is optional unless requested. Do not count the primary's own synthesis as another independent vote.
