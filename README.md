Absolutely. Based on the **current LooksFine implementation and the features we've built**, here's a final competition/repository-ready `README.md`.

````markdown
# LooksFine

### AI-Powered Food Safety Risk & Inspection Intelligence

> **Looks fine. The data disagrees.**

LooksFine is an intelligent food-safety inspection and risk-management platform designed to help food-safety teams move from reactive inspections to **data-driven, risk-based decision making**.

It combines inspection history, violations, corrective actions, predictive risk modeling, explainable AI, evidence analysis, and grounded AI assistance into one operational workflow.

---

## 🚨 Problem

Food-safety inspections are often reactive and heavily dependent on manual review of historical records.

Important signals can be difficult to identify:

- Repeated violations across inspections
- Unresolved critical issues
- Failed corrective actions
- Increasing inspection risk
- Overdue inspections
- Recurring sanitation, pest, or temperature-control problems
- Evidence that may require further investigation

As inspection volume grows, deciding **which establishment should be inspected next and why** becomes increasingly difficult.

LooksFine addresses this by transforming historical inspection data into actionable intelligence.

---

# 💡 Solution

LooksFine creates a continuous intelligence loop:

```text
Historical Inspection Data
          ↓
Risk Assessment
          ↓
Explainable Risk Factors
          ↓
Smart Inspection Prioritization
          ↓
Inspector Briefing
          ↓
Guided Inspection
          ↓
Evidence & Findings
          ↓
Human Verification
          ↓
Corrective Actions
          ↓
Reinspection
          ↓
Updated Risk
          ↓
Future Prioritization
````

Instead of simply answering:

> "What happened?"

LooksFine helps answer:

> **"What needs attention next, why does it matter, and what should the inspector focus on?"**

---

# ✨ Key Features

## 📊 Portfolio Intelligence

A command-center view of the food-safety portfolio.

Provides visibility into:

* Total establishments
* Critical / high-risk establishments
* Overdue inspections
* Open critical issues
* Corrective actions requiring attention
* Risk distribution
* Recent operational intelligence
* Establishments requiring attention

The dashboard is connected to the underlying application data rather than relying on static presentation values.

---

## 🎯 Smart Inspect Queue

LooksFine automatically prioritizes establishments for inspection using a composite priority score.

### Priority Score

```text
Priority Score =
    ML Risk Probability × 40
  + Overdue Urgency × 25
  + Critical Severity × 20
  + Failed Action History × 15
```

The queue provides:

* Priority rank
* Predicted serious-violation probability
* Risk level
* Days since inspection
* Open violations
* Recurring violations
* Failed corrective actions
* Reasons for prioritization
* Recommended urgency

This allows inspectors and managers to understand not only **who is next**, but **why**.

---

# 🤖 Predictive Risk Intelligence

LooksFine includes an actual machine-learning pipeline for predicting whether an establishment is likely to have a **major or critical violation during its next inspection**.

### Prediction Target

```text
Next inspection contains:
≥ 1 MAJOR or CRITICAL violation
```

### Model Features

The model uses historical inspection signals including:

* Days since last inspection
* Previous inspection count
* Previous violation count
* Previous critical violations
* Previous major violations
* Previous minor violations
* Unresolved violations
* Recurring violations
* Temperature-control violations
* Sanitation violations
* Pest violations
* Failed corrective actions
* Corrective-action success rate
* Establishment type
* Region

---

## 📈 Model Evaluation

The current prototype uses a temporal dataset split to avoid using future inspection information when training the model.

### Dataset

```text
180 establishments
1,260 inspection events

Training:
900 events

Testing:
360 events
```

### Logistic Regression Baseline

```text
ROC-AUC: 0.8770
```

### Production Gradient-Boosting Model

```text
ROC-AUC: 0.8566
PR-AUC:  0.8771

Precision: 0.8402
Recall:    0.8364
F1 Score: 0.8383
```

Confusion matrix on the evaluation set:

```text
                 Predicted
              Negative Positive

Actual Negative   105      35
Actual Positive    36     184
```

> **Important:** The dataset is currently synthetic and the model has not yet been validated against real-world regulatory inspection data. These metrics demonstrate the technical pipeline and prototype behavior, not production regulatory accuracy.

---

# 🔍 Explainable Risk with TreeSHAP

LooksFine does not simply display a probability.

It also explains the historical factors influencing the prediction.

The platform uses **TreeSHAP** with the trained gradient-boosting model to identify factors that increase or decrease predicted risk.

Example explanation:

```text
Predicted serious-violation probability: 98.4%

Major contributing factors:
+ unresolved violations
+ recurring violations
+ previous corrective-action failures
```

For a lower-risk establishment, the system can surface factors contributing to a lower prediction.

This gives inspectors a reason behind the prediction rather than treating the model as a black box.

---

# 🧑‍💼 Inspector Briefing

Before beginning an inspection, LooksFine can generate a structured briefing using the establishment's existing records.

The briefing can include:

* Current risk
* Predicted serious-violation probability
* Main risk drivers
* Previous inspection history
* Recurring violations
* Open corrective actions
* Failed corrective actions
* Evidence requiring attention
* Recommended focus areas

Example focus areas may include:

```text
Temperature Control & Refrigeration
Pest Activity & Vermin Exclusion
Previously Rejected Corrective Actions
```

The briefing is grounded in stored application data rather than unrestricted AI generation.

---

# 📝 Interactive Inspection Workspace

LooksFine provides a guided inspection workflow rather than a simple form.

### Inspection stages

```text
01  Preparation
02  Food Storage
03  Temperature Control
04  Hygiene & Sanitation
05  Pest & Facility
06  Food Handling
07  Evidence
08  Findings
09  Corrective Actions
10  Review & Submit
```

The workspace supports:

* Interactive inspection checks
* Pass / Fail / N/A states
* Temperature observations
* Inspector notes
* Findings
* Evidence capture
* AI evidence candidates
* Human review
* Violations
* Corrective actions
* Review before submission
* Save/resume behavior
* Inspection timeline

The workflow connects directly back into the risk and prioritization system.

---

# 📷 AI Evidence Scanner

Inspectors can upload inspection evidence for AI-assisted analysis.

Supported candidate categories include:

* Improper storage
* Cross-contamination
* Facility hygiene
* Pest activity
* Unsafe handling

The evidence pipeline can provide:

* Candidate finding
* Confidence
* Explanation
* Bounding box
* Evidence reference

### Human-in-the-loop

AI evidence analysis **does not automatically create confirmed violations**.

The workflow is:

```text
Image
 ↓
AI Analysis
 ↓
Candidate Finding
 ↓
PENDING
 ↓
Inspector Review
 ↙        ↘
Accept    Reject
 ↓
Confirmed Finding
 ↓
Violation
 ↓
Corrective Action
```

This keeps the final enforcement-related decision with the authorized human reviewer.

---

# 🧠 Grounded AI Copilot

LooksFine includes an AI Copilot designed specifically around the application's stored inspection data.

Instead of allowing an LLM to freely invent answers, the system follows:

```text
User Question
      ↓
Intent Classification
      ↓
Entity Resolution
      ↓
Server-Side Authorization
      ↓
Structured Data Retrieval
      ↓
Context Builder
      ↓
Grounded Prompt
      ↓
LLM
      ↓
Answer + Evidence References
```

Supported use cases include:

* Establishment risk
* Inspection history
* Recurring violations
* Unresolved critical issues
* Inspection priority
* Overdue inspections
* Corrective actions
* Compliance information
* Regional trends
* Violation patterns
* Inspection briefings
* Evidence summaries

The Copilot is designed as a **decision-support tool**, not an autonomous enforcement system.

---

# 🦙 Local AI with Ollama

For text-based Copilot functionality, LooksFine supports a locally running Ollama model.

Current configuration:

```text
Model:
llama3.1:8b

Base URL:
http://localhost:11434
```

This enables local AI-assisted workflows without requiring every Copilot request to be sent to a hosted LLM.

The application also has deterministic fallback behavior when the ML/LLM service is unavailable.

> `llama3.1:8b` is used for text generation. It is **not** the vision model used by the Evidence Scanner.

---

# 🔐 Role-Based Access Control

LooksFine is designed around role-specific access.

Supported roles:

### Food Safety Inspector

Can:

* View assigned inspection work
* Use Smart Inspect Queue
* Conduct inspections
* Record findings
* Review evidence
* Manage inspection-related corrective actions
* Use grounded Copilot assistance

### Inspection Manager

Can:

* Monitor inspection workload
* Review establishments
* Prioritize inspections
* Monitor corrective actions
* Analyze portfolio intelligence

### Establishment Manager

Can:

* View assigned establishment information
* Track relevant inspections
* View violations
* Manage corrective-action workflows available to their role

### Food Safety Administrator

Provides broader administrative visibility according to configured permissions.

All sensitive operations are protected by **server-side authorization** rather than relying only on frontend visibility.

---

# 🏢 Establishment Intelligence

Each establishment has an intelligence view combining:

* Current risk
* Risk history
* Inspection history
* Violations
* Recurring issues
* Corrective actions
* Evidence
* ML prediction
* Explainable risk factors
* Inspector briefing
* Inspection actions

This creates a single operational view of an establishment instead of forcing users to search through disconnected records.

---

# 🔄 Corrective Action Lifecycle

LooksFine supports the complete corrective-action loop.

```text
Violation
   ↓
Corrective Action Required
   ↓
Submitted
   ↓
Manager Review
   ↓
Accepted / Rejected
   ↓
Reinspection
   ↓
Risk Reassessment
```

Failed corrective actions can influence future inspection prioritization.

---

# 📋 Reports

The Reports section is designed for both technical and non-technical users.

Reports can surface:

* Executive summary
* Portfolio situation
* Establishments needing attention
* Risk distribution
* Inspection activity
* Common safety issues
* Recurring problems
* Corrective-action progress
* Compliance information
* Regional overview
* Recommended actions

Technical model information is kept secondary so operational users can understand the report without needing machine-learning knowledge.

---

# ⚙️ Settings

LooksFine includes a production-oriented Settings experience.

Available areas include:

* Profile
* Inspection Preferences
* Notifications
* Appearance
* AI & Intelligence
* Security
* Data & Privacy
* About

Examples of configurable preferences:

* Default inspection queue sorting
* Auto-save inspection progress
* Inspection submission confirmation
* Risk explanation visibility
* Inspector briefing behavior
* Notification preferences
* Theme
* Interface density
* Reduced motion

AI settings also make the human-verification workflow explicit.

---

# 🛠️ Technology Stack

## Frontend

* Next.js
* React
* TypeScript
* Modern responsive UI
* Component-based architecture

## Backend

* Next.js server/API architecture
* REST-style API endpoints
* Server-side RBAC
* Session-based authentication

## Database

* PostgreSQL
* Prisma ORM

## Machine Learning

* Python
* scikit-learn
* Logistic Regression
* HistGradientBoostingClassifier
* TreeSHAP / SHAP
* joblib

## ML Service

* FastAPI
* REST API

Endpoints include:

```text
GET  /health
GET  /model-info
POST /predict-risk
```

## AI

* Ollama
* Llama 3.1 8B for local text generation
* Grounded prompting
* Deterministic fallback

## Vision

* Gemini vision model for evidence analysis
* Bounding-box candidate detection
* Human-in-the-loop verification

---

# 🏗️ Architecture

```text
                    ┌──────────────────────┐
                    │      LooksFine UI    │
                    │     Next.js / React  │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │  Application APIs    │
                    │ Auth + RBAC + Logic  │
                    └───────┬───────┬──────┘
                            │       │
                  ┌─────────┘       └──────────┐
                  ▼                            ▼
        ┌──────────────────┐          ┌──────────────────┐
        │    PostgreSQL    │          │   ML Service     │
        │     + Prisma     │          │    FastAPI       │
        └──────────────────┘          └────────┬─────────┘
                                               │
                                               ▼
                                    ┌────────────────────┐
                                    │ Risk Model + SHAP  │
                                    └────────────────────┘

                            ┌──────────────────┐
                            │ Grounded Copilot │
                            └────────┬─────────┘
                                     │
                                     ▼
                                ┌──────────┐
                                │  Ollama  │
                                │ Llama 3.1│
                                └──────────┘

                            ┌──────────────────┐
                            │ Evidence Scanner │
                            └────────┬─────────┘
                                     │
                                     ▼
                              Vision Analysis
                                     │
                                     ▼
                             Human Verification
```

---

# 📁 Project Structure

A simplified view:

```text
LooksFine/
│
├── app/
│   ├── api/
│   ├── dashboard/
│   ├── establishments/
│   ├── inspections/
│   ├── reports/
│   ├── settings/
│   └── ...
│
├── components/
│
├── lib/
│   ├── services/
│   ├── risk/
│   ├── copilot/
│   ├── priority/
│   ├── briefing/
│   └── ...
│
├── prisma/
│   ├── schema.prisma
│   └── seed.*
│
├── ml/
│   ├── models/
│   │   ├── model.joblib
│   │   ├── preprocessor.joblib
│   │   └── metrics.json
│   └── ...
│
├── public/
│   └── uploads/
│
├── package.json
└── README.md
```

> The exact structure may evolve as the application develops.

---

# 🚀 Getting Started

## Prerequisites

Install:

* Node.js
* npm
* PostgreSQL
* Python 3.x
* Ollama

For local AI functionality, install:

```text
llama3.1:8b
```

---

## 1. Clone the Repository

```bash
git clone https://github.com/PruthviSB1715/LooksFine.git
cd LooksFine
```

---

## 2. Install Dependencies

```bash
npm install
```

---

## 3. Configure Environment Variables

Create:

```text
.env
```

Configure the database connection and application-specific environment variables.

For local Ollama:

```env
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.1:8b
```

Do not commit secrets or API keys to the repository.

---

# 🗄️ Database Setup

Run Prisma migrations according to the current project configuration.

Typical development workflow:

```bash
npx prisma generate
npx prisma migrate dev
```

Seed the development database using the project's configured seed command.

> Never use synthetic seed records as evidence of real-world regulatory violations. The repository's development records are application/demo data.

---

# 🧠 ML Service

The ML service is located under the `ml/` portion of the repository.

Install the Python dependencies using the project's configured requirements/environment.

Start the FastAPI service on:

```text
http://localhost:8000
```

Verify:

```text
GET /health
```

The application uses the ML service for predictive risk assessment.

If the service is unavailable, LooksFine can use its deterministic risk baseline where configured.

The UI should explicitly distinguish predictive ML results from the fallback baseline.

---

# 🦙 Running Ollama

Start Ollama locally and make sure the configured model is available.

Example:

```bash
ollama run llama3.1:8b
```

The application expects:

```text
http://localhost:11434
```

Copilot requests should remain grounded in authorized LooksFine data.

---

# ▶️ Run the Application

Start the development server:

```bash
npm run dev
```

Then open the local application in your browser.

---

# 🧪 Validation

Before submitting or deploying changes, run the project's available checks.

Recommended:

```bash
npm run build
```

and the configured TypeScript/test commands.

Important areas to verify:

* Authentication
* RBAC
* Establishment directory
* Smart Inspect Queue
* Risk prediction
* TreeSHAP explanations
* Inspector Briefing
* Inspection Workspace
* Evidence Scanner
* Corrective Actions
* Copilot
* Reports
* Settings

---

# 🔒 Security Principles

LooksFine follows several important principles:

### Server-side authorization

Permissions are enforced on the backend and are not dependent only on frontend UI visibility.

### Human-in-the-loop

AI-generated evidence is treated as a candidate until reviewed by an authorized human.

### Grounded AI

Copilot responses are constrained by retrieved application data and authorization rules.

### No automatic enforcement

LooksFine provides decision support. It does not independently make legal or regulatory enforcement decisions.

### Upload protection

Evidence uploads use validation and protected storage paths, including:

* MIME validation
* File-size limits
* Path traversal protection
* Inspection/evidence association

---

# ⚠️ Current Limitations

LooksFine is an advanced prototype and has important limitations.

### Synthetic ML Dataset

The current predictive model is trained and evaluated using synthetic inspection data.

Real-world deployment would require:

* Historical regulatory inspection datasets
* Data quality validation
* Regional validation
* Bias analysis
* Model monitoring
* Periodic retraining
* Regulatory/domain expert validation

### Vision Model

Evidence analysis is AI-assisted and should not be interpreted as definitive proof of a violation.

### Local LLM

The local Llama model's response quality depends on available hardware and model configuration.

### Offline Operation

Some functionality can continue using deterministic/local components, but full application functionality may still require database or service availability depending on the feature.

---

# 🌾 Localization & Demonstration Data

The current application is designed around a Maharashtra/India-oriented demonstration environment.

Example establishments may include local food-service businesses and establishments from Solapur.

Where recognizable establishment names are used:

> **Inspection histories, violations, corrective actions, risk scores, and AI predictions are synthetic application records for demonstration and testing purposes. They do not represent actual regulatory findings or claims about those establishments.**

This distinction is important when using real-world establishment names in a prototype.

---

# 🎯 Product Vision

LooksFine aims to evolve from an inspection management system into a complete **food-safety intelligence layer**.

Future directions include:

* Real-world inspection datasets
* Stronger temporal modeling
* Multi-region deployment
* Multilingual interfaces
* Mobile-first field inspection
* Advanced geospatial risk analysis
* Offline-first field workflows
* Better evidence models
* Model monitoring
* Automated report generation
* Integration with government/FSSAI-compatible workflows
* Deeper establishment compliance analytics

---

# 🏆 Why LooksFine?

Traditional inspection software answers:

> **"What was recorded?"**

LooksFine aims to answer:

> **"What deserves attention next?"**

It connects:

```text
DATA
 ↓
RISK
 ↓
EXPLANATION
 ↓
PRIORITIZATION
 ↓
INSPECTION
 ↓
EVIDENCE
 ↓
HUMAN DECISION
 ↓
CORRECTIVE ACTION
 ↓
LEARNING
```

That creates a continuous feedback loop where every inspection can improve the intelligence used for the next one.

---

# 👥 Roles

LooksFine is designed for collaboration between:

* Food Safety Inspectors
* Inspection Managers
* Establishment Managers
* Food Safety Administrators

Each role receives access appropriate to its responsibilities.

---

# 📜 Disclaimer

LooksFine is an academic/prototype software project for intelligent food-safety inspection and risk-management workflows.

It is **not an official government food-safety system** and should not be used as a substitute for regulatory judgment, professional inspection procedures, or applicable food-safety law.

AI and ML outputs are decision-support signals and require appropriate human review.

---

# 📄 License

Add the project's applicable license here.

If no license has been selected yet, do not claim an open-source license until one is explicitly chosen.

---

## LooksFine

**AI-Powered Food Safety Risk & Inspection Intelligence**

> **Looks fine. The data disagrees.**

```

This version is written to be **judge-safe**: it highlights the actual ML/SHAP/Copilot/Evidence/Inspection pipeline while explicitly separating the **synthetic prototype data** from real regulatory claims.
```
