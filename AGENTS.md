# AGENTS.md

## Purpose

This project builds PromptShield, a local middleware that reduces prompt-injection risk before external content reaches an LLM agent.

## Working rules

- Prefer Node over Python unless there is a strong reason otherwise.
- Keep the initial implementation small and testable.
- Treat all external content as untrusted input.
- Favor structured outputs over vague prose.
- Do not claim total security. Use careful wording: reduction of risk, sanitation, extraction, scoring.

## Deliverables for early iterations

- CLI command
- Fetch pipeline
- Reader-mode extraction
- Heuristic detector
- Risk scoring
- Structured JSON output

## Product framing

Good framing:
- safer context pipeline
- prompt-injection risk reduction
- sanitizing external content for agents

Bad framing:
- perfect protection
- impossible to jailbreak
- guaranteed safe web browsing
