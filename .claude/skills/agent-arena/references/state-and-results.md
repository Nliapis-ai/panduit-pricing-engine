# State, coverage and result collection

Keep durable state outside the worktree or under a narrowly ignored directory. Do not commit prompts, local routes, private outputs or credentials. Existing checkpoint formats remain usable; add missing facts when needed, mark unknowns and never fabricate migration history. A compact record is enough; this schema is not a software installation or business admission gate.

## Checkpoint

Record task/object/revision, mode/shape, user intent and current decisions, authorized route/model/content/actions, participant roster, rounds, raw/answer paths, findings and dispositions, retry authorization, next action and any commit gate. Use a step label, named snapshot and existing version/commit where available; do not require hashes, stat fingerprints or UUID validation.

Round identity includes participant/session/round/attempt and context provenance: fresh, resumed, inherited history or saw another draft. Required participants remain in the roster even when unavailable. One session's repeated turns are one participant. Store queue/start/end times if observed, with their source; cumulative API durations and sums of concurrent calls are not user wall time.

Run state remains `armed`, `in_progress`, `complete`, `abandoned` or `superseded`. `superseded` needs a reason and replacement pointer; stale is a reason, not a resumable status. A changed object creates a new revision or linked delta review: retain earlier evidence, invalidate only affected coverage, and recheck necessary downstream work. A different target supersedes the old checkpoint; do not label an armed deferred review stale before its trigger.

Round completion, task completion, convergence and action authorization are separate. A final substantive answer can complete an ordinary review even when it finds blockers; it cannot approve affected implementation or a commit. Ordinary task completion requires its scope and checks. Requested convergence additionally needs every required participant's acceptance of the same final revision. Companion/supervision have their own final gates. Neither `final: true` nor a parser result bypasses them.

## Result envelope

Separate these dimensions instead of flattening everything into success:

| Field | Values / meaning |
|---|---|
| `execution_state` | queued / running / exited / unknown, based on host observation |
| `failure_reason` | null / auth / quota / model-unavailable / transport / tool / timeout / error_max_turns / startup_failure / refusal / unknown |
| `answer_state` | none / partial / candidate_complete / substantive / unknown; only human/agent inspection establishes substantive |
| `parse_state` | parsed / partial / failed / not_attempted; say whether this concerns raw transport parsing or a separate digest |
| `review_conclusion` | unassessed / no_blocker_found / blocking_findings / inconclusive; requires evidence inspection |

Include requested/configured/runtime model identity and verification limits, session, raw response reference, result position, inspected object/revision, checked/not-proven scope and meaningful dissent. A substantive answer can coexist with a failed digest or a failed call; preserve both. Decide required coverage before marking that round complete. A parser must not infer quality, approval, or who actually generated the response.

Legacy `status` can remain: map a **verified complete substantive** response to `substantive`; incomplete coverage to `partial`; verified failure to its specific cause. Keep detailed dimensions even when deriving this compatibility field. `queued`/`running`/unknown observations are pending, not absent; a no-terminal file by itself proves neither that the process is running nor that it failed.

Examples:

- `subtype=success` plus `is_error=true`: failed call; inspect actual cause. Never count the body as successful review merely from subtype/exit code.
- Complete reviewed text plus broken summary JSON: preserve the text and findings, repair the summary, report parse failure separately. No model rerun is necessary just for parsing.
- Lock wait: queued, run time unknown until the host starts it. A parent's observation timeout does not cancel or time out the child.
- Successful design/source review: it establishes only those inspected properties, not runtime capacity, trained performance or a scientific claim.

## Optional Claude parser

`scripts/arena_result.py` reads one Claude JSON or stream-JSON log and prints a compact envelope. It has no network, scheduling, retry or file-writing behavior. It emits `candidate_complete`, never `substantive`; `review_conclusion` stays `unassessed`. It indexes result text without copying it into stdout. The orchestrator must read the actual answer and reconcile coverage.

```bash
python3 scripts/arena_result.py /tmp/arena-result.jsonl --process-state exited --exit-code 0
```

Use the actual host process state/exit code, or omit them if unknown. Preserve stderr and wrapper metadata separately. Supported structured error codes are normalized conservatively; prose hints alone are not a failure verdict. Malformed lines, missing terminal results, session mixtures or unrecognized input stay visible as issues. Unsupported formats require manual inspection. A parser exit of 0 means inspection ran, not that the participant succeeded or the review passed. Parser unavailability never forces a new external call.

## Reconcile before reporting

Collect finished asynchronous outputs, preserve each failed/recovered attempt, and compare the actual required roster with received substantive results. Retain pending work and its coverage impact. Read a raw result when its digest is missing, ambiguous or inconsistent. Do not count a successful preflight, process launch, empty response or tool-only trace as a review.

For each material finding, retain its evidence, severity, disposition, correction revision and affected dependent checks. Close only after required checks and mode-specific approvals are accounted for. In ordinary discussion unresolved dissent can be reported without forced consensus; user-requested convergence with material dissent remains unfinished. Keep companion enabled independently of the completed task status.
