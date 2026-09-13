# LooksFine Grounded AI Copilot — Architecture & Operational Documentation

> **IMPORTANT DISCLAIMER**
> "LooksFine Copilot is a grounded decision-support assistant. It does not replace certified food-safety inspectors."

---

## 1. Copilot Architecture

LooksFine Copilot is an operational decision-support assistant designed to answer food-safety, risk assessment, visual evidence, and inspection planning questions strictly using **trusted LooksFine PostgreSQL database records**, **ML model predictions**, and local **Ollama GenAI reasoning (`llama3.1:8b`)**.

### Core Operational Flow

```
User Question
      ↓
Intent Classification & Entity Resolution
      ↓
Role Authorization Enforcement (Server-Side)
      ↓
Structured Data Retrieval (Prisma PostgreSQL + ML Microservice + Visual Evidence)
      ↓
Context Assembly & Anti-Hallucination Prompting
      ↓
Local LLM Provider Abstraction (Ollama Llama 3.1 8B / Deterministic Grounded Fallback)
      ↓
Grounded Answer + Authentic Source Citations
```

---

## 2. GenAI Provider Architecture: Ollama Llama 3.1 (`llama3.1:8b`)

The Copilot primary provider uses a local Ollama HTTP API backend running **Llama 3.1 8B**:

- **Execution Engine**: Local HTTP API server (`http://localhost:11434/api/chat`).
- **Configured Model**: `llama3.1:8b` (configured via `OLLAMA_MODEL` environment variable).
- **Environment Variables**:
  ```env
  OLLAMA_BASE_URL="http://localhost:11434"
  OLLAMA_MODEL="llama3.1:8b"
  ```
- **Local Service Commands**:
  - Start Ollama service: `ollama serve`
  - Verify local model list: `ollama list`
  - Test local model CLI: `ollama run llama3.1:8b`
- **Fallback Architecture**: If local Ollama is offline, times out (15s limit), or returns an error, Copilot seamlessly falls back to `generateDeterministicGroundedSummary()`, formatting retrieved database & ML context directly into 100% grounded operational summaries without hallucination. No external Gemini API key is required.

---

## 3. Retrieval Strategy & Grounding

The retrieval layer (`lib/services/copilot/retrievalService.ts`) prioritizes structured PostgreSQL database queries over ungrounded generative knowledge.

- **Entity Resolution**: Resolves establishment names (e.g., "Central Spice", "central spice") to specific database establishment IDs prior to retrieval.
- **Data Collections Retrieved**:
  - `Establishment`: Core profile, operating status, risk level, current score, assigned region.
  - `ML Assessment`: Predicted probability of serious violation, model version (`risk-model-v1`), SHAP top factor drivers.
  - `Risk History`: Chronological risk score trajectory and reasoning logs.
  - `Inspections`: Recent inspection dates, status, inspector notes, overall results.
  - `Violations`: Active/past violations, severity (MINOR, MAJOR, CRITICAL), recurrence indicators.
  - `Corrective Actions`: Action status (REQUIRED, SUBMITTED, ACCEPTED, REJECTED), review notes.
  - `Evidences`: Visual evidence items, scan status (`UPLOADED`, `ANALYZED`, `REVIEW_REQUIRED`, `ACCEPTED`, `REJECTED`), candidate findings, bounding box overlays.
  - `Priority Queue`: Dynamic priority ranking combining ML probability and inspection gap urgency.
  - `Regional & Category Aggregates`: Citywide risk distribution by neighborhood and violation categories.

No vector database is required for structured relational database queries.

---

## 4. Supported Intent Classification

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
| `EVIDENCE_SUMMARY` | *"What evidence supports Central Spice's violation?"* | Evidence records, visual findings, inspector verification status |
| `EVIDENCE_REVIEW_QUEUE` | *"Show evidence review queue for pending inspections."* | Unreviewed evidence items (`reviewStatus = PENDING`) |
| `INSPECTION_EVIDENCE` | *"Show visual evidence uploaded during last inspection."* | Inspection-specific evidence records & bounding boxes |
| `GENERAL_SYSTEM_QUERY` | *"How many total establishments are monitored?"* | Summary stats, risk distribution counts |

---

## 5. Grounding & Citation Mechanism

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
- **Evidence Chips in UI**: Grounded answers display interactive evidence chips linking directly to underlying database records.

---

## 6. Role Authorization & Security

Security is enforced server-side **BEFORE** context is assembled or passed to Ollama (`lib/services/copilot/retrievalService.ts`):

- **Food Safety Inspector**: Access to assigned inspections, operational findings, regional records.
- **Inspection Manager**: Organization-wide priority queue, overdue inspections, inspector workload.
- **Establishment Manager**: **Strictly restricted to their authorized establishment**. Requests attempting to access unauthorized establishments are blocked server-side (`403 Forbidden`) before reaching Ollama.
- **Food Safety Administrator**: Full organization-wide intelligence.

---

## 7. Operational Safeguards & Limitations

- **Predictive ML vs LLM Reasoning**: The local LLM is the language & reasoning synthesis layer. The underlying ML risk prediction model is a separate scikit-learn Gradient Boosting model (`risk-model-v1`).
- **Visual AI Safeguard**: Candidate findings generated by Vision AI remain recommendations requiring inspector verification before becoming database violations.
