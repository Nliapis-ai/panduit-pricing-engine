#!/usr/bin/env python3
"""Inspect local Claude JSON/JSONL; never judge review quality or write logs."""

import argparse
import json
from pathlib import Path
import re


FAILURES = {
    "error_max_turns": "error_max_turns", "max_turns": "error_max_turns",
    "authentication_error": "auth", "auth": "auth", "invalid_api_key": "auth",
    "quota_exceeded": "quota", "insufficient_quota": "quota",
    "model_not_found": "model-unavailable", "model_unavailable": "model-unavailable",
    "timeout": "timeout", "stream_error": "transport", "transport_error": "transport",
    "tool_error": "tool", "startup_failure": "startup_failure", "refusal": "refusal",
}


def safe_id(value):
    """Identity fields are metadata, not a channel for raw provider error text."""
    return value if isinstance(value, str) and re.fullmatch(r"[\w./:@+-]{1,160}", value) else None


def records(path, issues):
    with path.open(encoding="utf-8", errors="replace") as source:
        first = ""
        for first in source:
            if first.strip():
                break
        source.seek(0)
        try:
            json.loads(first)
            first_is_record = True
        except json.JSONDecodeError:
            first_is_record = False
        if not first_is_record and first.lstrip().startswith(("{", "[")):
            try:
                document = source.read()
                obj = json.loads(document)
            except json.JSONDecodeError:
                source.seek(0)  # It may instead be JSONL with a damaged first line.
            else:
                if "\ufffd" in document:
                    issues.append("invalid_utf8_manual_review_required")
                if isinstance(obj, dict):
                    yield None, obj
                else:
                    issues.append("unsupported_json_document")
                return
        for number, line in enumerate(source, 1):
            if not line.strip():
                continue
            if "\ufffd" in line:
                issues.append(f"invalid_utf8_line:{number}")
            try:
                obj = json.loads(line)
            except json.JSONDecodeError:
                issues.append(f"malformed_line:{number}")
                continue
            if isinstance(obj, dict):
                yield number, obj
            else:
                issues.append(f"non_object_line:{number}")


def inspect_result(path, process_state="unknown", exit_code=None):
    issues = []
    last_result = None
    position = None
    result_count = 0
    sessions = set()
    models = set()
    assistant_text = False
    recognized = 0
    after_terminal = False
    trailing_error = None
    observed_errors = []
    issues_at_result = 0
    for number, obj in records(path, issues):
        kind = obj.get("type")
        if kind not in ("system", "assistant", "user", "result", "stream_event", "rate_limit_event", "error"):
            issues.append(f"unrecognized_record:{number or 'document'}")
            continue
        recognized += 1
        if last_result is not None and (kind in ("user", "assistant", "stream_event")
                                        or (kind == "system" and obj.get("subtype") == "init")):
            after_terminal = True
        session = safe_id(obj.get("session_id"))
        if session:
            sessions.add(session)
        if kind == "error":
            error = obj.get("error")
            code = error.get("type") if isinstance(error, dict) else None
            trailing_error = FAILURES.get(code, "unknown") if isinstance(code, str) else "unknown"
            observed_errors.append({"line": number, "failure_reason": trailing_error})
            if last_result is not None:
                after_terminal = True
        if kind == "stream_event":
            event = obj.get("event")
            delta = event.get("delta") if isinstance(event, dict) else None
            if isinstance(delta, dict) and delta.get("type") == "text_delta" and isinstance(delta.get("text"), str) and delta["text"].strip():
                assistant_text = True
                if last_result is not None:
                    after_terminal = True
        if kind == "assistant":
            if not isinstance(obj.get("message"), dict):
                issues.append(f"malformed_assistant:{number or 'document'}")
                continue
            message = obj["message"]
            model = safe_id(message.get("model"))
            if model:
                models.add(model)
            content = message.get("content", [])
            if isinstance(content, list):
                assistant_text |= any(isinstance(block, dict) and block.get("type") == "text"
                                      and isinstance(block.get("text"), str) and block["text"].strip()
                                      for block in content)
            if last_result is not None:
                after_terminal = True
        if kind == "result":
            last_result, position = obj, number
            result_count += 1
            after_terminal = False
            trailing_error = None
            issues_at_result = len(issues)
            usage = obj.get("modelUsage")
            if isinstance(usage, dict):
                models.update(model for key in usage if (model := safe_id(key)))

    if last_result is not None and any(
            issue.startswith(("malformed", "non_object", "unrecognized_record", "invalid_utf8"))
            for issue in issues[issues_at_result:]):
        issues.append("unparsed_record_after_terminal_manual_review_required")
        after_terminal = True
    if len(sessions) > 1:
        issues.append("multiple_sessions_manual_review_required")
    if after_terminal:
        issues.append("activity_after_terminal_manual_review_required")
    if result_count > 1:
        issues.append("multiple_results_last_selected_preserve_prior_attempts")
    if last_result is None:
        issues.append("no_terminal_result")
    if not recognized:
        issues.append("unsupported_or_empty_input")

    failure = None
    answer = "partial" if assistant_text else "none"
    terminal_success = False
    if last_result is not None:
        error = last_result.get("error")
        codes = [last_result.get("subtype"), last_result.get("error_code")]
        if isinstance(error, dict):
            codes += [error.get("type"), error.get("code")]
        failure = next((FAILURES[code] for code in codes if isinstance(code, str) and code in FAILURES), None)
        subtype, flag = last_result.get("subtype"), last_result.get("is_error")
        if flag is not None and not isinstance(flag, bool):
            issues.append("invalid_is_error_type")
        if failure or flag is True or (isinstance(subtype, str) and subtype.startswith("error")):
            failure = failure or "unknown"
            issues.append("error_result_body_is_not_verified_review")
        elif subtype == "success" and flag is False:
            terminal_success = True
            if isinstance(last_result.get("result"), str) and last_result["result"].strip():
                answer = "candidate_complete"
        else:
            issues.append("unrecognized_terminal_outcome")
            failure = "unknown"

    if exit_code is not None and process_state != "exited":
        issues.append("exit_code_without_exited_host_state")
    if exit_code not in (None, 0):
        failure = failure or "unknown"
        issues.append("nonzero_process_exit_manual_review_required")
    if last_result and process_state in ("queued", "running"):
        issues.append("host_state_and_terminal_result_need_reconciliation")
    if last_result is None and process_state == "exited":
        failure = failure or "unknown"
    if trailing_error:
        failure = trailing_error
    if len(sessions) > 1 or after_terminal:
        if answer == "candidate_complete":
            answer = "partial"
        terminal_success = False

    parse_failed = any(x.startswith(("malformed", "non_object", "unrecognized_record", "unsupported", "invalid_utf8")) for x in issues)
    return {
        "raw_path": str(path.resolve()),
        "execution_state": process_state,
        "process_exit_code": exit_code,
        "failure_reason": failure,
        "answer_state": answer,
        "parse_state": "partial" if parse_failed and recognized else "failed" if parse_failed else "parsed",
        "review_conclusion": "unassessed",
        "terminal_result_observed": last_result is not None,
        "terminal_success_observed": terminal_success,
        "result_count": result_count,
        "result_reference": {"line": position, "field": "result"} if last_result is not None else None,
        "session_ids": sorted(sessions),
        "runtime_reported_models": sorted(models),
        "model_identity_verification": "runtime_reported_only" if models else "unknown",
        "observed_error_events": observed_errors,
        "issues": issues,
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("raw_path", type=Path)
    parser.add_argument("--process-state", choices=("unknown", "queued", "running", "exited"), default="unknown")
    parser.add_argument("--exit-code", type=int)
    args = parser.parse_args()
    try:
        result = inspect_result(args.raw_path, args.process_state, args.exit_code)
    except (OSError, UnicodeError):
        parser.exit(2, "Cannot read the log; inspect access and encoding locally. No raw content was printed.\n")
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
