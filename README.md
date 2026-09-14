# LooksFine

## AI-Powered Food Safety Risk & Inspection Intelligence

> Looks fine. The data disagrees.

LooksFine is an intelligent food-safety inspection and risk-management platform designed to help food-safety teams move from reactive inspections to data-driven decision making.

The platform brings inspection history, violations, corrective actions, predictive risk assessment, explainable machine learning, evidence analysis, and grounded AI assistance into a single workflow.

---

## Problem

Food-safety inspections generate a large amount of information, but important patterns can easily get buried in historical records.

Examples include:

- Repeated violations across inspections
- Unresolved critical issues
- Failed corrective actions
- Increasing risk over time
- Overdue inspections
- Recurring sanitation, pest, or temperature-control problems
- Evidence that requires further investigation

As the number of establishments and inspections increases, it becomes difficult for inspection teams to determine which establishment should be inspected next and why.

LooksFine addresses this problem by converting historical inspection data into actionable risk intelligence.

---

## Solution

LooksFine creates a continuous inspection intelligence loop:

```text
Historical Inspection Data
          |
          v
    Risk Assessment
          |
          v
 Explainable Risk Factors
          |
          v
Smart Inspection Prioritization
          |
          v
   Inspector Briefing
          |
          v
  Guided Inspection
          |
          v
 Evidence and Findings
          |
          v
 Human Verification
          |
          v
 Corrective Actions
          |
          v
    Reinspection
          |
          v
   Updated Risk
          |
          v
Future Inspection Prioritization

Instead of only answering:

What happened?

LooksFine aims to answer:

What needs attention next, why does it matter, and what should the inspector focus on?

Core Features
Portfolio Intelligence

The main command center provides an overview of the current food-safety portfolio.

It brings together:

Total establishments
Critical and high-risk establishments
Overdue inspections
Open critical issues
Corrective actions requiring attention
Risk distribution
Recent operational intelligence
Establishments requiring attention

The information is derived from the application's underlying data rather than being static dashboard content.

Smart Inspect Queue

LooksFine prioritizes establishments for inspection using a composite priority score.

The current priority formula is:

Priority Score =
    ML Risk Probability × 40
  + Overdue Urgency × 25
  + Critical Severity × 20
  + Failed Action History × 15

The queue provides:

Priority rank
Predicted serious-violation probability
Risk level
Days since last inspection
Open violations
Recurring violations
Failed corrective actions
Reasons for prioritization
Recommended urgency

This gives an inspector both the next establishment to consider and the reasoning behind that recommendation.

Predictive Risk Intelligence

LooksFine includes a machine-learning pipeline that predicts whether an establishment is likely to have at least one major or critical violation during its next inspection.

Prediction Target
Next inspection contains
at least one MAJOR or CRITICAL violation
Features

The model uses historical inspection signals such as:

Days since last inspection
Previous inspection count
Previous violation count
Previous critical violations
Previous major violations
Previous minor violations
Unresolved violations
Recurring violations
Temperature-control violations
Sanitation violations
Pest violations
Failed corrective actions
Corrective-action success rate
Establishment type
Region
Model Evaluation

The current prototype uses a temporal dataset split so that later inspection events are not used to train predictions for earlier events.

Dataset
180 establishments
1,260 inspection events

Training:
900 events

Testing:
360 events
Logistic Regression Baseline
ROC-AUC: 0.8770
Gradient Boosting Model
ROC-AUC: 0.8566
PR-AUC:  0.8771

Precision: 0.8402
Recall:    0.8364
F1 Score: 0.8383

Confusion matrix on the evaluation set:

                 Predicted
              Negative Positive

Actual Negative   105      35
Actual Positive    36     184

The current dataset is synthetic and the model has not been validated against real-world regulatory inspection data. These metrics demonstrate the current prototype's technical pipeline and behavior and should not be interpreted as production regulatory accuracy.

Explainable Risk with TreeSHAP

LooksFine does not only provide a risk probability.

It also explains which historical factors are influencing the prediction.

The system uses TreeSHAP with the trained gradient-boosting model to identify factors that increase or decrease predicted risk.

For example, an establishment may receive a high predicted risk because of factors such as:

Unresolved violations
Recurring violations
Previous corrective-action failures

For lower-risk establishments, the system can surface factors contributing to a lower prediction.

This gives inspectors context behind the model output instead of treating the prediction as a black box.

Inspector Briefing

Before starting an inspection, LooksFine can generate a structured briefing based on the establishment's existing records.

The briefing can include:

Current risk
Predicted serious-violation probability
Main risk drivers
Previous inspection history
Recurring violations
Open corrective actions
Failed corrective actions
Evidence requiring attention
Recommended inspection focus areas

The purpose is to help the inspector prepare before entering the inspection workflow.

The briefing is grounded in stored application data rather than unrestricted AI generation.

Interactive Inspection Workspace

LooksFine provides a guided inspection workspace rather than a simple form.

The workflow is divided into stages:

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

The workspace supports:

Interactive inspection checks
Pass / Fail / N/A states
Temperature observations
Inspector notes
Findings
Evidence capture
AI evidence candidates
Human review
Violations
Corrective actions
Review before submission
Save and resume
Inspection timeline

The completed inspection feeds back into the risk and prioritization system.

AI Evidence Scanner

Inspectors can upload inspection evidence for AI-assisted analysis.

The current system can identify candidate issues in categories such as:

Improper storage
Cross-contamination
Facility hygiene
Pest activity
Unsafe handling

The evidence analysis can provide:

Candidate finding
Confidence
Explanation
Bounding box
Evidence reference
Human-in-the-Loop Review

AI-generated evidence does not automatically become a confirmed violation.

The workflow is:

Image
  |
  v
AI Analysis
  |
  v
Candidate Finding
  |
  v
Pending Review
  |
  +----------+
  |          |
  v          v
Accept     Reject
  |
  v
Confirmed Finding
  |
  v
Violation
  |
  v
Corrective Action

An authorized human reviewer remains responsible for accepting or rejecting the candidate before it becomes a confirmed finding.

Grounded AI Copilot

LooksFine includes an AI Copilot designed to work with the application's stored inspection information.

The Copilot follows a grounded retrieval workflow:

User Question
      |
      v
Intent Classification
      |
      v
Entity Resolution
      |
      v
Server-Side Authorization
      |
      v
Structured Data Retrieval
      |
      v
Context Builder
      |
      v
Grounded Prompt
      |
      v
LLM
      |
      v
Answer with Evidence References

The Copilot can assist with questions involving:

Establishment risk
Inspection history
Recurring violations
Unresolved critical issues
Inspection priority
Overdue inspections
Corrective actions
Compliance information
Regional trends
Violation patterns
Inspection briefings
Evidence summaries

The Copilot is intended as a decision-support tool and does not independently make enforcement decisions.

Local AI with Ollama

LooksFine supports a locally running Ollama model for text-based Copilot functionality.

Current configuration:

Model:
llama3.1:8b

Base URL:
http://localhost:11434

This allows local AI-assisted workflows without requiring every Copilot request to use a hosted language model.

The application also provides deterministic fallback behavior when the AI service is unavailable.

The Llama model is used for text generation. It is not the vision model used by the Evidence Scanner.

Role-Based Access Control

LooksFine uses role-based access control throughout the application.

The supported roles are:

Food Safety Inspector

Can:

View inspection work
Use the Smart Inspect Queue
Conduct inspections
Record findings
Review evidence
Work with corrective actions
Use grounded Copilot assistance
Inspection Manager

Can:

Monitor inspection workload
Review establishments
Prioritize inspections
Monitor corrective actions
Analyze portfolio intelligence
Establishment Manager

Can:

View assigned establishment information
Track relevant inspections
View applicable violations
Participate in corrective-action workflows available to the role
Food Safety Administrator

Provides broader administrative visibility according to configured permissions.

Authorization is enforced on the server and is not dependent only on whether an option is visible in the frontend.

Establishment Intelligence

Each establishment has an intelligence view combining:

Current risk
Risk history
Inspection history
Violations
Recurring issues
Corrective actions
Evidence
ML prediction
Explainable risk factors
Inspector briefing
Inspection actions

This provides a single operational view instead of requiring users to search through multiple sections of the system.

Corrective Action Lifecycle

LooksFine supports the corrective-action workflow from finding to reinspection.

Violation
    |
    v
Corrective Action Required
    |
    v
Submitted
    |
    v
Manager Review
    |
    +----------+
    |          |
    v          v
Accepted    Rejected
    |
    v
Reinspection
    |
    v
Risk Reassessment

Corrective-action history can also influence future inspection prioritization.

Reports

The Reports section is designed for operational users rather than only technical users.

It can provide:

Executive summary
Portfolio situation
Establishments requiring attention
Risk distribution
Inspection activity
Common safety issues
Recurring problems
Corrective-action progress
Compliance information
Regional overview
Recommended actions

Technical model information is kept secondary so that reports remain understandable to users who do not have a machine-learning background.

Settings

LooksFine includes a dedicated settings area for configuring the user experience.

Settings include:

Profile
Inspection Preferences
Notifications
Appearance
AI & Intelligence
Security
Data & Privacy
About

Inspection preferences can include:

Default inspection queue sorting
Auto-save inspection progress
Inspection submission confirmation
Risk explanation visibility
Inspector briefing behavior

Appearance settings can include:

Light
Dark
System
Interface density
Reduced motion

AI settings also clearly communicate the human-verification requirement for AI-generated evidence candidates.

Technology Stack
Frontend
Next.js
React
TypeScript
Responsive component-based UI
Backend
Next.js API/server architecture
REST-style APIs
Authentication and sessions
Server-side RBAC
Database
PostgreSQL
Prisma ORM
Machine Learning
Python
scikit-learn
Logistic Regression
HistGradientBoostingClassifier
SHAP / TreeSHAP
joblib
ML Service
FastAPI
REST API

Current endpoints include:

GET  /health
GET  /model-info
POST /predict-risk
AI
Ollama
Llama 3.1 8B
Grounded prompting
Deterministic fallback
Vision
Gemini vision model
Candidate detection
Confidence scoring
Bounding-box analysis
Human-in-the-loop review
Architecture
                         LooksFine
                             |
                             v
                 +-----------------------+
                 |     Next.js / React   |
                 |      Application UI   |
                 +-----------+-----------+
                             |
                             v
                 +-----------------------+
                 |   Application APIs    |
                 | Auth + RBAC + Logic  |
                 +-----+------------+----+
                       |            |
                       |            |
                       v            v
             +----------------+  +----------------+
             |  PostgreSQL    |  |  ML Service    |
             |   + Prisma     |  |    FastAPI      |
             +----------------+  +-------+---------+
                                         |
                                         v
                               +--------------------+
                               | Risk Model + SHAP  |
                               +--------------------+

                       +-------------------+
                       | Grounded Copilot  |
                       +---------+---------+
                                 |
                                 v
                            +---------+
                            | Ollama  |
                            | Llama   |
                            +---------+

                       +-------------------+
                       | Evidence Scanner  |
                       +---------+---------+
                                 |
                                 v
                          Vision Analysis
                                 |
                                 v
                         Human Verification
Project Structure

A simplified project structure:

LooksFine/
|
├── app/
│   ├── api/
│   ├── dashboard/
│   ├── establishments/
│   ├── inspections/
│   ├── reports/
│   ├── settings/
│   └── ...
|
├── components/
|
├── lib/
│   ├── services/
│   ├── risk/
│   ├── copilot/
│   ├── priority/
│   ├── briefing/
│   └── ...
|
├── prisma/
│   ├── schema.prisma
│   └── seed.*
|
├── ml/
│   ├── models/
│   │   ├── model.joblib
│   │   ├── preprocessor.joblib
│   │   └── metrics.json
│   └── ...
|
├── public/
│   └── uploads/
|
├── package.json
└── README.md

The exact structure may change as development continues.

Getting Started
Prerequisites

Install the following:

Node.js
npm
PostgreSQL
Python 3.x
Ollama

For local AI functionality, make sure the following model is available:

llama3.1:8b
Clone the Repository
git clone https://github.com/PruthviSB1715/LooksFine.git
cd LooksFine
Install Dependencies
npm install
Environment Configuration

Create a .env file using the environment variables required by the project.

For local Ollama:

OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.1:8b

Configure the PostgreSQL connection and other required environment variables according to the project configuration.

Do not commit secrets, API keys, or private credentials to the repository.

Database Setup

Generate the Prisma client:

npx prisma generate

Run database migrations:

npx prisma migrate dev

Seed the development database using the project's configured seed command.

The seed data is intended for development and demonstration purposes.

Running the ML Service

The ML service is located inside the ml portion of the project.

Install the required Python dependencies using the project's configured Python environment.

Start the FastAPI service on:

http://localhost:8000

Check its health endpoint:

GET /health

The application uses this service for predictive risk assessment.

If the service is unavailable, the application can use its configured deterministic risk baseline where applicable.

Running Ollama

Start Ollama locally and make sure the configured model is available.

For example:

ollama run llama3.1:8b

The application expects Ollama at:

http://localhost:11434
Running the Application

Start the development server:

npm run dev

Open the application in your browser using the local address shown by Next.js.

Validation

Before deploying or submitting changes, run the project's configured checks.

At minimum:

npm run build

Also verify:

Authentication
Role-based access control
Establishment directory
Smart Inspect Queue
Risk prediction
TreeSHAP explanations
Inspector Briefing
Inspection Workspace
Evidence Scanner
Corrective Actions
Copilot
Reports
Settings

The application should be checked for TypeScript errors, build errors, broken routes, console errors, and incorrect permission handling.

Security and Responsible AI

LooksFine follows several important principles.

Server-Side Authorization

Permissions are enforced on the backend and are not dependent only on frontend visibility.

Human Verification

AI-generated evidence is treated as a candidate until reviewed by an authorized human.

Grounded AI

Copilot responses are constrained by retrieved application data and role-based authorization.

No Automatic Enforcement

LooksFine is a decision-support platform. It does not independently make legal or regulatory enforcement decisions.

Evidence Upload Protection

Evidence uploads use validation and protected storage paths, including:

MIME validation
File-size limits
Path traversal protection
Inspection and evidence association
Current Limitations
Synthetic ML Dataset

The current predictive model uses synthetic inspection data.

A production deployment would require:

Real historical inspection datasets
Data quality validation
Regional validation
Bias analysis
Model monitoring
Periodic retraining
Domain expert validation
Vision Analysis

Evidence analysis is AI-assisted and should not be treated as definitive proof of a violation.

Local LLM

The quality and response time of the local Copilot depend on the available hardware and model configuration.

Service Availability

Some features depend on the database, ML service, Ollama, or vision service being available.

The application provides fallback behavior for selected components where implemented.

Demonstration Data

The current application is designed around a Maharashtra/India-oriented demonstration environment, including establishments from Solapur.

Some establishment names may correspond to real-world businesses. However, inspection histories, violations, corrective actions, risk scores, predictions, and other regulatory-looking records used in the prototype are synthetic application data.

They do not represent actual regulatory findings, inspections, or claims about those businesses.

Future Scope

Potential future development includes:

Training on real-world inspection datasets
Multi-region deployment
Improved temporal risk models
Model monitoring and drift detection
Multilingual interfaces
Mobile-first field inspections
Offline-first inspection workflows
Advanced geospatial risk analysis
Improved evidence analysis
Integration with regulatory workflows
Automated report generation
Deeper compliance analytics
More robust model validation
Product Workflow

The complete LooksFine workflow can be summarized as:

Portfolio Overview
        |
        v
Recent Intelligence
        |
        v
Smart Inspect Queue
        |
        v
Establishment Intelligence
        |
        v
Inspector Briefing
        |
        v
Inspection
        |
        v
Evidence
        |
        v
Human Verification
        |
        v
Violation
        |
        v
Corrective Action
        |
        v
Reinspection
        |
        v
Updated Risk
        |
        v
Future Prioritization
Why LooksFine?

Traditional inspection software primarily records what happened.

LooksFine focuses on what should happen next.

It connects historical data, predictive risk, explainability, inspection planning, field workflows, evidence, corrective actions, and AI-assisted decision support into one continuous system.

The goal is simple:

DATA
  |
  v
RISK
  |
  v
EXPLANATION
  |
  v
PRIORITIZATION
  |
  v
INSPECTION
  |
  v
EVIDENCE
  |
  v
HUMAN DECISION
  |
  v
CORRECTIVE ACTION
  |
  v
LEARNING
