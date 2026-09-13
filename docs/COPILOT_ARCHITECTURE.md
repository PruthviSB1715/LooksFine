# LooksFine Grounded AI Copilot — Architecture & Operational Documentation

> **IMPORTANT DISCLAIMER**
> "LooksFine Copilot is a grounded decision-support assistant. It does not replace certified food-safety inspectors."

---

## 1. Copilot Architecture

LooksFine Copilot is an operational decision-support assistant designed to answer food-safety, risk assessment, and inspection planning questions strictly using **trusted LooksFine PostgreSQL database records** and **ML model predictions**.

### Core Operational Flow

```
User Question
      ↓
Intent Classification & Entity Resolution
      ↓
Role Authorization Enforcement (Server-Side)
      ↓
Structured Data Retrieval (Prisma PostgreSQL + ML Microservice)
      ↓
Context Assembly & Citation Mapping
      ↓
LLM Provider Abstraction (Google Gemini API / Deterministic Grounded Fallback)
      ↓
Grounded Answer + Evidence Source Records
```

---

## 2. Retrieval Strategy

The retrieval layer (`lib/services/copilot/retrievalService.ts`) prioritizes structured PostgreSQL database queries over ungrounded generative knowledge.

- **Entity Resolution**: Resolves establishment names (e.g., "Central Spice", "central spice", "Central Spice restaurant") to specific database establishment IDs prior to retrieval.
- **Data Collections Retrieved**:
  - `Establishment`: Core profile, operating status, risk level, current score, assigned region.
  - `ML Assessment`: Predicted probability of serious violation, model version (`risk-model-v1`), SHAP top factor drivers.
  - `Risk History`: Chronological risk score trajectory and reasoning logs.
  - `Inspections`: Recent inspection dates, status, inspector notes, overall results.
  - `Violations`: Active/past violations, severity (MINOR, MAJOR, CRITICAL), recurrence indicators.
  - `Corrective Actions`: Action status (REQUIRED, SUBMITTED, ACCEPTED, REJECTED), review notes.
  - `Priority Queue`: Dynamic priority ranking combining ML probability and inspection gap urgency.
  - `Regional & Category Aggregates`: Citywide risk distribution by neighborhood and violation categories.

No vector database is required for the initial structured database queries.

---

## 3. Supported Intent Classification

The system classifies query intent using a deterministic, lightweight classification engine (`lib/services/copilot/intentClassifier.ts`):

| Intent Code | Example User Query | Primary Retrieval Targets |
| :--- | :--- | :--- |
| `ESTABLISHMENT_RISK` | *"Why is Central Spice high risk?"* | Profile, ML prediction, SHAP drivers, active violations, risk history |
| `ESTABLISHMENT_HISTORY` | *"Summarize Central Spice's inspection history."* | Past inspections, results, inspector notes, historical trajectory |
| `RECURRING_VIOLATIONS` | *"What are Central Spice's recurring violations?"* | Violations with `isRecurring = true`, categories, detected dates |
| `UNRESOLVED_CRITICAL` | *"Which establishments have unresolved critical violations?"* | Critical violations where `resolutionStatus != RESOLVED` |
| `INSPECTION_PRIORITY` | *"Which establishments should we inspect next?"* | Priority engine queue, priority score, ML probability, urgency |
| `OVERDUE_INSPECTIONS` | *"Show me overdue high-risk establishments."* | Establishments with `nextInspectionDate <= NOW()` |
| `CORRECTIVE_ACTIONS` | *"What corrective actions are still pending?"* | Actions with status `REQUIRED`, `SUBMITTED`, or `REJECTED` |
| `COMPLIANCE` | *"Has Central Spice improved after corrective action?"* | Pre/post corrective action risk trajectory and score delta |
| `REGIONAL_TRENDS` | *"Which region has highest concentration of high-risk establishments?"* | Group by `assignedRegion`, CRITICAL/HIGH counts, avg scores |
| `VIOLATION_TRENDS` | *"What are the most common violation categories?"* | Group by `category`, severity counts |
| `INSPECTION_BRIEFING` | *"Give me a briefing for today's inspections."* | Today's scheduled inspections, top priority candidates |
| `GENERAL_SYSTEM_QUERY` | *"How many total establishments are monitored?"* | Summary stats, risk distribution counts |

---

## 4. Grounding & Citation Mechanism

Every factual claim regarding LooksFine data originates from verified database records.

- **Source Object Format**:
  ```json
  {
    "type": "VIOLATION",
    "id": "c1f7a290-...",
    "label": "Violation #c1f7a290 (TEMPERATURE_CONTROL)",
    "establishmentId": "central-spice-id",
    "date": "2024-07-26",
    "relevance": "Severity: CRITICAL, Recurring: YES, Status: OPEN"
  }
  ```
- **Evidence Chips in UI**: Grounded answers display interactive evidence chips linking directly to the underlying record.

---

## 5. LLM Provider Abstraction & Fallback Behavior

The provider layer (`lib/services/copilot/llmProvider.ts`) abstracts the generative backend:

1. **Google Gemini API**: Uses `GEMINI_API_KEY` with low temperature (`0.2`) and strict system prompt grounding instructions.
2. **Deterministic Grounded Fallback Engine**: If Gemini is offline, rate-limited, or unconfigured, Copilot executes a deterministic summary engine that formats the exact retrieved PostgreSQL & ML records directly into structured operational answers.
3. **No Hallucination**: The application never fabricates database facts or invents non-existent citations.

---

## 6. Role Authorization & Security

Security is enforced server-side **BEFORE** data retrieval occurs (`lib/services/copilot/retrievalService.ts`):

- **Food Safety Inspector**: Access to assigned inspections, operational findings, regional records.
- **Inspection Manager**: Organization-wide priority queue, overdue inspections, inspector workload.
- **Establishment Manager**: **Strictly restricted to their own authorized establishment**. Requests attempting to access unauthorized establishments are blocked server-side before reaching the LLM.
- **Food Safety Administrator**: Full organization-wide intelligence.

---

## 7. Operational Limitations & Future Roadmap

- **Current Limitation**: Structured queries target stored tabular PostgreSQL records.
- **Phase 5 Roadmap**: Semantic RAG for long-form inspection attachments, OCR for handwritten temperature logs, computer vision for evidence photo verification.
