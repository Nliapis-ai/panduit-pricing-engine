# Companion review

Use `companion_review` when the user enables a strong-model subagent to accompany the primary agent and catch mistakes throughout execution. This is an opt-in **concurrent review overlay**: the primary keeps planning and working while the companion checks completed steps. A pending review is not permission to proceed and is not a reason to wait.

Arena's main discussion/review workflows still use heterogeneous participants. A companion may belong to the same family as the primary, but must be a real child agent with a separate context; do not count it as a heterogeneous counterpart or substitute role-play for it. If a user also requests an Arena discussion, run that discussion normally with independent first passes and cross-review. Keep unpublished independent drafts and companion feedback from crossing between discussion participants before all first passes are recorded; snapshot a draft immediately but deliver any substantive companion suggestions to its author only after that first-pass boundary. Keep `arena_mode` and `companion.enabled` separate; enabling the companion does not overwrite the saved heterogeneous route or turn every request into supervised execution.

## Setup and confirmation

1. Inspect the host's current subagent interface, available models, supported reasoning-effort values, and account/permission support. Prefer the strongest suitable available model under local routing policy; do not treat a catalog listing as proof of a successful completion. Do not silently inherit the primary's model when a stronger model was selected.
2. Before creating the companion, confirm **both model and reasoning effort** in one short exchange. A request already naming both is confirmation; a saved generic Arena route, a model alone, or silence is insufficient. Suggest an available pair rather than asking users to know internal names. For example, if supported: `伴随检查建议用 gpt-6-astra / high。它会后台检查每一步，你无需反复调用；主代理继续工作，不设回合或耗时上限。是否按此启用？` Offer only effort values supported by this host, and explain them briefly if needed. A request to add this mode to a skill is not itself a request to start a live companion.
3. After confirmation, create the child with the selected model and effort explicitly passed through the host's supported fields. If a full-history fork cannot override these fields, use a fresh child. Start with a minimal harmless response as availability/authentication preflight. Once it succeeds, give the child the approved task packet: original task, constraints, current plan, read-only review scope, queue location, and this protocol. Record configured values separately from any runtime-reported model/effort; do not claim backend identity from the reviewer's self-description alone.
4. Save the agent/session ID, confirmed pair, confirmation provenance, activation scope, and `enabled: true` in ignored or host-local state. Default activation lasts for the current primary session and its task resumptions until the user disables it; a request to remember it more broadly sets that explicit scope. Do not re-ask on every step, new task within that session, compaction, or `继续`. Model/effort changes require confirmation; if unavailable or unsupported, report the specific failure and ask for a valid pair instead of silently substituting. Re-creating a lost child with the same confirmed pair and scope needs no repeat confirmation, but record the new ID and lost continuity.

The configuration choice replaces this mode's generic first-use route questionnaire. Same-family companionship is intentional and requires no extra solo-mode approval. Privacy scope and human authorization for irreversible actions are still separate; enabling a companion does not authorize new data sharing, deployments, spending, or broader access.

## Automatic concurrent checks

Once enabled, review submission is automatic, including during ordinary primary work when the user has not said `arena` or asked for a check. Reuse the same child, which may be idle between submissions; do not create a new reviewer for each step or busy-loop to keep it active. Completing a task or an Arena discussion leaves the overlay enabled for later work within its activation scope. If the host suspends/ends child sessions, persist state and resume or reconstruct when the primary next runs; a portable skill cannot provide an always-running daemon beyond the host's lifecycle.

A step is a meaningful, coherent unit of work: a plan or design decision, a localized edit, an experiment, a test run, or a drafted answer. Choose units small enough for timely correction; do not batch the whole task into one final review. Polling, bookkeeping, and sending a review are not new work steps and do not recursively trigger reviews of themselves.

After completing each step:

1. Save an immutable evidence packet with task ID, step ID, revision, objective, acceptance criteria, raw commands/actions, exit status, output/diff, and relevant source or result snapshots. Apply secret redaction before storage/forwarding and mark omissions. Include failures rather than replacing evidence with a success claim. Keep the referenced revision available even while the working tree changes.
2. Append the packet to a durable queue, then notify the same companion and **continue the primary's next work immediately**. Do not call a blocking wait or require `PASS` between steps. An active child receives queued notices; an idle child needs a follow-up task that starts another turn. Do not use a new child merely because the old one is busy.
3. The companion checks the queued revision against user intent and evidence, can request additional relevant evidence, and reports findings as soon as they become substantive. It should use snapshots for claims about completed steps; a live-tree read must identify which revision was observed. It does not edit the primary's live worktree. It must not silently drop queued steps when new messages arrive; notifications may be combined, but each step keeps its own verdict and coverage.
4. At normal tool/message boundaries, the primary consumes available feedback without waiting for outstanding reviews. It keeps working while reviews are pending. Routine `PASS` results and queue progress stay in the checkpoint; avoid asking the user to trigger each check or flooding the conversation with review notices.

With host collaboration tools, the shape is `spawn once → follow up when idle / notify when running → primary continues → consume feedback at a safe point`. Check host tool semantics rather than assuming a notification wakes an idle child. Delegate only the review; both agents editing the same files concurrently is not the intended workflow.

## Findings and corrections

Each review identifies `task_id`, `step_id`, `revision`, inspected evidence, verdict, findings, uncertainty, and requested evidence. Use:

- `PASS`: the identified revision satisfies that step's criteria; this is a result, not an authorization token for the next primary step.
- `RETRY`: a concrete defect or coverage gap with location, effect, severity, affected work, and suggested correction/evidence. The primary handles it at the next safe point and resubmits every correction as a new revision for asynchronous review.
- `BLOCKED`: a concrete issue that invalidates affected work, risks a harmful action, or requires a missing user decision. Pause the affected work at the next safe boundary; continue genuinely independent safe work. A review merely taking time is not `BLOCKED`.

The primary evaluates feedback against evidence, fixes substantiated issues, and records a reasoned disagreement with supporting evidence when appropriate. Recheck corrections; do not self-mark disputed blockers resolved. Urgent findings should interrupt at a safe boundary before further affected changes. Human authorization checks still happen before irreversible actions, regardless of pending or passed companion reviews. Preserve existing user-requested pre-commit/pre-deployment review gates.

Feedback may arrive after newer work. Match it to the reviewed revision and assess which later steps depend on it. A pass on revision N never approves N+1; an old finding is not automatically irrelevant. Link a superseded finding to the correction and its new review. If a fix invalidates subsequent evidence, queue rechecks for those dependent steps. Repeated no-progress corrections prompt investigation/replanning and, if needed, a user decision; they do not silently authorize an unreviewed completion or introduce a round cap.

## No default turn or time limits

Do not set a mode-level turn/round limit, retry budget for substantive corrections, total elapsed-time limit, convergence deadline, or kill timer. Ordinary-call budgets described in [runtime guidance](runtime.md#budgets-and-observation) do not apply. Only an explicit user limit adds one. Neither a slow review nor an increasing queue automatically pauses primary execution.

A wait/poll tool returning after its observation window is **not** a child timeout, cancellation, verdict, or completed review. During primary work use nonblocking messages/status consumption; at final reconciliation, wait in resumable intervals while keeping the user informed if necessary. If a host imposes a real unavoidable context, output, lifetime, or execution limit, record it and resume with full relevant evidence when possible; do not promise the host has no physical limits. A genuine failed call follows the ordinary lossless mechanical recovery policy, without changing the confirmed model/effort or reviewing narrower evidence. Authentication/model failures require a user choice. A healthy pending review is not a failed call and consumes no retry allowance.

If the companion becomes unavailable, preserve the queue and report the interruption once. Safe primary work can continue with review coverage marked pending; existing safety gates still apply. Do not claim checked completion, replace the confirmed configuration, or accept partial reviews as passes. If the user explicitly disables companionship, stop new submissions, preserve unresolved findings and pending coverage, and disclose those limits without claiming companion approval.

## Durable state

Keep state outside version control or under a narrowly ignored directory. Record at least:

```yaml
companion:
  enabled: true
  activation_scope: primary_session_and_resumptions
  model_requested: "<user-confirmed model>"
  reasoning_effort_requested: "<user-confirmed effort>"
  runtime_identity: "<observed values or unverified>"
  confirmation_source: "<user message reference>"
  agent_id: "<actual child ID>"
  review_delivery: concurrent
  user_limits: null
  host_limits: []
  tasks:
    - task_id: "<task>"
      primary_step: 2
      reviews:
        - step_id: 1
          revision: "<step/revision label or snapshot path>"
          evidence_path: "<snapshot path>"
          status: reviewing # queued | reviewing | pass | retry | blocked
          verdict_path: null
          findings: []
      final_review: pending
```

Persist submissions, responses, dependencies, finding dispositions, correction revisions, and reviewer replacement/disable events. Keep a pointer to the companion state in the host's durable primary-session/resume state, outside individual completed-task status, so the next ordinary request can discover it. On each new task or resume, reload that pointer, enabled state, and queue before continuing automatic submissions; do not require another `arena` command. Link findings across tasks if they affect later work. Keep the heterogeneous Arena configuration/checkpoints separate.

## Final reconciliation and reporting

The end of the task, not each step, is the normal review barrier. Submit the final artifact and acceptance-check evidence; reconcile all required queued reviews, correction reviews, and affected downstream rechecks. Retain evidence-backed dispositions for superseded findings. Do not declare the task fully checked while required reviews, disputes, blockers, or coverage gaps remain. Ask the same companion for final current-state review; record `APPROVED: task complete` with task ID, final revision, raw reply, and source before claiming companion-approved completion. If approval is unavailable, report partial/unchecked coverage explicitly.

A completed task does not disable or destroy the companion. Leave it enabled and idle for subsequent work within scope. When the user says to disable it, acknowledge that choice once and preserve the audit trail.

At activation show `companion_review · concurrent · companion=<model>/<effort> · primary=<known model or unverified> · turns/time=unlimited_default`. When also discussing with Arena, report the real Arena mode and heterogeneous participants separately. At task close report successes, failures/recovered attempts with causes, pending coverage or `None`, model/effort verification status, and final approval. Keep routine per-step passes quiet; surface material findings, fixes that affect the result, unavailable reviewers, and decisions requiring the user.
