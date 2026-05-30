---
name: debug-protocol
description: Activates a strict 5-step debugging protocol. Each step requires a full stop and user input before proceeding. Use for any bug investigation that needs structured, methodical diagnosis.
---

# Debug Protocol

A strict, stepwise debugging process. **Stop completely after each step. Do not continue until the user responds.**

---

## The 5 Steps

### Step 1 — Analyze
Read the error message, description, or symptom carefully. Summarize:
- What is failing
- Where it appears to be failing
- What is known vs unknown

**STOP. Share the analysis. Wait for user acknowledgment.**

---

### Step 2 — Request Evidence
Ask for the specific evidence needed. Pick from:
- **DevTools Inspect** — DOM structure, computed CSS, element presence
- **Console logs** — errors, warnings, logged values
- **Network tab** — API calls, response payloads, status codes
- **Screenshots** — visual confirmation of actual vs expected behavior

Be specific. Ask for exactly what is needed, not everything at once.

**STOP. Wait for the user to provide the evidence.**

---

### Step 3 — Propose Hypotheses
Based on the evidence provided, form exactly **2–3 hypotheses**. For each:
- State the suspected cause
- Explain why the evidence points to it
- Describe what would confirm or rule it out

**STOP. Present the hypotheses. Wait for user input.**

---

### Step 4 — Confirm Direction
Ask the user to:
- Select which hypothesis to pursue, or
- Provide additional input that changes the diagnosis

Do not proceed with any fix until the user confirms the direction.

**STOP. Wait for confirmation.**

---

### Step 5 — Minimal Patch
Implement the smallest possible fix that addresses the confirmed root cause:
- Touch only what is necessary
- No refactoring, no preemptive improvements
- Explain what the patch changes and why

**STOP. Present the patch. Do not apply further changes unless asked.**

---

## Rules

- Never skip a step
- Never combine steps
- Never guess — hypotheses must be grounded in evidence from Step 2
- Never apply a fix before Step 4 confirmation
- Minimal patch means minimal — do not gold-plate the fix
