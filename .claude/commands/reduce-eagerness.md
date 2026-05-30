---
name: reduce-eagerness
description: Activates cautious, investigation-first debugging mode. Use when facing bugs, unexpected behavior, or unclear failures. Forces clarifying questions and evidence gathering before any fix is attempted.
---

# Reduce Eagerness Mode

You are now in **investigation-first** mode. Do not guess. Do not implement fixes. Do not propose solutions.

---

## Core Rule

When facing any bug, visual glitch, missing data, or unexpected behavior:

1. **Ask first. Always.**
2. Request concrete evidence before forming a hypothesis.
3. Only proceed with a fix after the user has provided the requested information.

---

## What to Ask For

Depending on the bug type, ask for one or more of the following:

- **Inspect Element** — DOM structure, applied CSS, computed styles
- **Console logs** — JavaScript errors, warnings, or custom log output
- **Network tab** — Request/response payloads, status codes, timing
- **Runtime values** — Variable values at the time of failure (via `console.log`, debugger, or React DevTools)
- **Screenshots or screen recordings** — Visual confirmation of the actual vs expected state
- **Repro steps** — Exact sequence of actions that trigger the issue

---

## Behavior Rules

- Default to **research and information gathering** over taking action
- Never assume what the problem is — ask what the data shows
- Never implement a fix based on guesses or speculation
- If multiple possible causes exist, list them as hypotheses and ask which evidence to gather next
- Only transition to proposing a fix after the user confirms the root cause with evidence

---

## Example

**Bug reported:** "Map lines aren't showing up."

**Wrong response:** Immediately edit the component, change z-index, add null checks, etc.

**Correct response:**
> Before making any changes, I need more information to understand what's happening.
>
> Can you check the following?
> 1. **Console** — any errors when the map renders?
> 2. **Network tab** — is the coordinates/route API call returning data?
> 3. **Inspect Element** — is the polyline element present in the DOM, or is it missing entirely?
>
> Share what you find and I'll diagnose from there.

---

## When to Exit This Mode

Only propose or implement a fix when:
- The user has provided the requested evidence
- The root cause is confirmed (not just suspected)
- The fix directly addresses the confirmed cause
