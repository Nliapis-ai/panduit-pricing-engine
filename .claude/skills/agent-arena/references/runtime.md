# Runtime and failure recovery

Use this reference when launching an external participant or diagnosing a call. Respect current host tools and local routing instructions; provider names and available models change. The skill does not supply authentication, a sandbox or an executable orchestrator.

## Preflight and identity

Resolve the selected host, CLI/provider, model or family constraint and approved evidence scope. Check availability/version and supported flags, then a harmless authenticated completion on that route. A version or catalog listing alone is not a passing generation check. For native subagents, verify the supported model/effort fields and a minimal response; use a fresh child if a history fork cannot accept explicit overrides.

Recheck the resolved family against saved constraints and the primary family on each run. A family mismatch or loss of heterogeneity requires an already authorized compliant route or a user choice, not silent acceptance.

Record requested/configured model separately from runtime-reported model, and mark unknown identity honestly. A reviewer's self-description is not independent backend attestation. Codex vs Claude normally provides family diversity; two harnesses using the same backend do not. Alternate backends are valid when they actually use different families. Claude Code needs an Anthropic-compatible endpoint/adapter; Codex requires its supported API format. Verify compatibility rather than assuming a model name implies a protocol.

Preflight does not expand content authorization. Reuse already approved recipient/model/content/action scopes. If a route fails, use an explicitly approved fallback and disclose it, or ask for the missing route decision. Do not silently change an exact user model. An orchestrator-chosen optional pin may be dropped only within already approved harness/provider/family constraints; record the change.

## Claude Code

Inspect `claude --help` for the installed version. Use print mode (`-p`) for headless work. These examples require an approved route/content scope and flags supported by the local build:

```bash
# Closed evidence question: the packet contains the relevant raw material.
claude -p --tools '' --permission-mode dontAsk \
  --strict-mcp-config --mcp-config '{"mcpServers":{}}' \
  --disable-slash-commands --output-format stream-json --verbose \
  < /tmp/arena-packet.md > /tmp/arena-result.jsonl 2> /tmp/arena-stderr.txt

# Open review: discovery remains available within the authorized scope.
claude -p --tools 'Read,Glob,Grep' --allowedTools 'Read,Glob,Grep' \
  --permission-mode dontAsk --strict-mcp-config --mcp-config '{"mcpServers":{}}' \
  --disable-slash-commands --output-format stream-json --verbose \
  < /tmp/arena-packet.md > /tmp/arena-result.jsonl 2> /tmp/arena-stderr.txt
```

Add the resolved `--model`/`--effort` and, for critique/revision, `--resume` with the actual returned session ID when supported. A new independent design needs a fresh context. Keep prompts and raw results on disk; shell command substitution puts text into argv, not stdin.

Observed on Claude Code 2.1.295: stdin print calls with `--tools Read,Glob,Grep`, `--allowedTools Read,Glob,Grep`, `--permission-mode dontAsk`, `--model opus --effort high` and `stream-json` completed. `--max-turns` was accepted but not listed in that help; these runs did not verify cap enforcement. Probe local behavior when relying on a limit. Do not promote one observed 19-turn success into a universal 20-turn minimum.

Distinguish these mechanisms:

- `--tools ''` removes built-in tools; `--allowedTools` is permission allowance, not the switch that disables the tool set. External MCP tools/configuration require separate control.
- `--permission-mode` governs harness approval behavior. Check supported values; neither plan mode nor adding Bash guarantees read-only execution. Supply an explicit compatible mode when inherited bypass settings would prevent startup under root; do not alter shared settings or bypass permissions to fix that failure.
- `--add-dir` adds accessible directories. Working directory and prompt instructions are not an isolation boundary. `--restricted`, where present, is a harness policy, not proof of OS containment.
- OS/container isolation requires actual host enforcement. Expose only approved files/tools; do not claim this example prevents arbitrary reads outside its packet.

If tools need deterministic commands, grant only the required authorized capability. Do not infer root cause from `num_turns` alone. Inspect stop/error fields, tool events, stderr and observed progress. Missing `-p`, an interactive approval prompt, a stream error and a slow model are different conditions.

## Other harnesses and queues

For Codex, OpenCode, Hermes, OpenClaw or another host, inspect local help and use supported noninteractive input, output and resume mechanisms. Do not assume Claude flags transfer. Verify file/terminal capabilities before assigning file inspection; if a channel is unreadable, repair it or use an approved file handoff rather than repeating the same broken message.

Use one owner per topic/round to avoid parent/child duplicate calls. Track queued, started and finished separately; pending work can coexist with independent primary work. Shared OpenCode SQLite installations may require serialized execution, for example the host's established `flock /tmp/castmind-opencode.lock opencode run ...` policy. Queue wait is not model execution time. Never delete an active database, WAL/SHM or lock file to force concurrency. Do not invent timing values the host did not record.

## Budgets and observation

There is no universal turn minimum. Ordinary calls may use a disclosed budget appropriate to scope; diagnose lack of progress rather than repeatedly raising it. Examples intentionally omit numeric limits. A useful partial answer is evidence, not completed review. User limits override defaults and their coverage impact is reported.

`companion_review` and `supervised_execution` have no default round/turn, substantive-correction or elapsed-time limits; supervision also has no content/context/discovery budget. User-requested work until convergence is not silently capped by ordinary examples. Observe healthy work without cancelling it just because a polling window ended. Disclose unavoidable host limits and resume with the relevant evidence when possible.

## Failure recovery

Read [result state](state-and-results.md) before calling an output success or failure. A wait/transport channel error can coexist with a completed answer on disk. A quota/error body is not a successful review just because the wrapper says success. Preserve partial output and failures even after recovery.

1. Diagnose from actual evidence. Check archived output before relaunching. If a complete answer exists but the digest failed, repair collection/parse only.
2. Without a broader existing retry instruction, permit **one automatic lossless mechanical retry per failed round**. Record attempt count and the diagnosed change. Examples: correct malformed invocation, restore the intended open tools, repair transport, resume with full context, or adjust an evidenced insufficient limit. Repackaging does not reset the allowance.
3. Explicit existing retry/fallback authorization takes precedence. Distinguish attempts from substantive discussion rounds and substantive correction loops. Healthy pending work consumes no retry allowance. Authentication, refusal or user-pinned model failure requires the relevant repair/choice, not repeated identical requests or silent substitution.
4. Never automatically disable discovery, replace open raw evidence with selected excerpts, shrink the question or accept no-critique synthesis after an open-review failure. These are scope changes; proceed only if already authorized or after the user chooses the concrete tradeoff. A new bounded review can start with closed evidence.
5. If the allowed recovery fails, report the failure, remaining coverage and a specific next proposal. An explicit continuation of that proposal can authorize it; honor a standing “keep trying” policy. Repeated identical no-progress work calls for diagnosis, backoff or replanning, not an infinite duplicate loop. Do not mark abandoned without the user's decision, or claim convergence with missing participants.

Reuse the external session for critique/revisions. If continuation is unavailable, provide the full relevant context and disclose the change; a resumed or replacement reviewer is not a new independent first pass. Keep raw instructions and responses, with secrets redacted, available for audit.
