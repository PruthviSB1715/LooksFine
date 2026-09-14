# LooksFine — Phase 6.2 Inspector Briefing Architecture

## Overview
The Inspector Briefing feature transforms verified establishment history and predictive risk intelligence into a concise, actionable pre-inspection briefing to answer:

> *"What should an inspector know before visiting this establishment?"*

The system reuses the existing grounded local Ollama Llama 3.1 8B architecture (with a 100% grounded deterministic fallback) to deliver decision-support intelligence without exposing database credentials or creating secondary AI pipelines.

---

## Pipeline Architecture

```
Authorized User
      ↓
Establishment Resolution
      ↓
RBAC (Server-Side Authorization Check)
      ↓
Structured PostgreSQL Retrieval
      ↓
Risk + TreeSHAP Feature Drivers
      ↓
Grounded Context Builder
      ↓
Ollama Llama 3.1 8B
      ↓
Inspector Briefing + Cited Sources
```

---

## Architectural Principles & AI Boundaries

1. **Role of Ollama Llama 3.1 8B**:
   - Used strictly for **text reasoning and operational summarization**.
   - Receives verified, role-filtered context retrieved server-side from PostgreSQL.
   - Operates under strict system instructions prohibiting fabrication of dates, violations, risk probabilities, or unverified findings.

2. **Boundary with Vision Evidence Scanner**:
   - Visual evidence analysis remains handled independently by the existing **Vision Evidence Scanner**.
   - Unreviewed visual candidate findings are explicitly marked as *Pending Inspector Review* and are never presented as confirmed violations.

3. **Server-Side Security & RBAC**:
   - Authorization happens on the server before context is supplied to the LLM or fallback engine.
   - `FOOD_SAFETY_INSPECTOR`: Authorized for assigned region/establishments.
   - `INSPECTION_MANAGER`: Authorized for organizational/region scope.
   - `ESTABLISHMENT_MANAGER`: Strictly isolated to assigned establishment. Requests for unauthorized establishments return HTTP 403 Forbidden.
   - `FOOD_SAFETY_ADMIN`: Authorized full citywide scope.

4. **Deterministic Fallback Engine**:
   - If Ollama is offline or unavailable, the system transparently generates a 100% grounded briefing text labeled:
     `"Grounded fallback — local AI unavailable"`
   - `predictionSource` explicitly distinguishes `ml` from `deterministic-fallback`.
