# LOOKSFINE ML RISK INTELLIGENCE ENGINE

## 1. Problem Statement & Objective
The LooksFine ML Risk Intelligence Engine predicts the probability of a **serious food-safety violation** (at least 1 `CRITICAL` or `MAJOR` violation) occurring at an establishment's next physical inspection:
$$\mathbb{P}(\text{Serious Violation} \mid \mathcal{H}_{\le N-1})$$

This model serves as a **decision-support intelligence tool** for health inspectors and inspection managers to prioritize site visits and prevent foodborne illness outbreaks.

---

## 2. Target Definition & Leakage Prevention Strategy

* **Prediction Target ($Y$)**: Binary classification
  * $Y = 1$: Next inspection $N$ contains $\ge 1$ `CRITICAL` or `MAJOR` violation.
  * $Y = 0$: Next inspection $N$ has zero serious violations.
* **Leakage Prevention**: To simulate real-world prediction strictly prior to site visits, feature vectors for Inspection $N$ are constructed using **ONLY historical data recorded up to Inspection $N-1$**. Violations, findings, or notes from Inspection $N$ itself are strictly excluded from the input features.

---

## 3. Engineered Features (Pre-Inspection $N$)

| Feature Name | Type | Description |
| :--- | :--- | :--- |
| `days_since_last_inspection` | Numeric | Days elapsed between Inspection $N-1$ and Inspection $N$ |
| `prev_inspection_count` | Numeric | Total historical inspections completed prior to $N$ |
| `prev_violation_count` | Numeric | Total historical violations logged prior to $N$ |
| `prev_critical_violation_count` | Numeric | Total historical CRITICAL violations logged prior to $N$ |
| `prev_major_violation_count` | Numeric | Total historical MAJOR violations logged prior to $N$ |
| `prev_minor_violation_count` | Numeric | Total historical MINOR violations logged prior to $N$ |
| `unresolved_violation_count` | Numeric | Violations currently OPEN at time of Inspection $N$ |
| `recurring_violation_count` | Numeric | Violations flagged as recurring prior to $N$ |
| `temp_control_violation_count` | Numeric | Prior TEMPERATURE_CONTROL violations |
| `sanitation_violation_count` | Numeric | Prior SANITATION violations |
| `pest_violation_count` | Numeric | Prior PESTS violations |
| `failed_corrective_action_count` | Numeric | Prior Corrective Actions with status `REJECTED` |
| `corrective_action_success_rate` | Float | Ratio of `ACCEPTED`/`CLOSED` corrective actions over total actions |
| `establishment_type` | Categorical | Restaurant, Hotel, Bakery, Cafe, School Cafeteria, Hospital Kitchen, Food Truck |
| `region` | Categorical | Neighborhood region (e.g. Mission District, Marina, SoMa, North Beach) |

---

## 4. Model Selection & Evaluation

We evaluated a **Logistic Regression** baseline against a production **HistGradientBoostingClassifier** (scikit-learn GBDT algorithm tailored for tabular data):

| Metric | Logistic Regression | Production GBDT (`risk-model-v1`) |
| :--- | :--- | :--- |
| **ROC-AUC** | 0.8770 | **0.8566** |
| **PR-AUC** | 0.8510 | **0.8771** |
| **Precision** | 0.8120 | **0.8402** |
| **Recall** | 0.8010 | **0.8364** |
| **F1-Score** | 0.8064 | **0.8383** |

*Dataset Split*: 1,260 historical inspection events split temporally (900 train samples $\le$ sequence 6; 360 test samples $>$ sequence 6).

---

## 5. Risk Mapping Threshold Policy

* `prob >= 0.75` $\longrightarrow$ **CRITICAL**
* `prob >= 0.50` $\longrightarrow$ **HIGH**
* `prob >= 0.30` $\longrightarrow$ **MEDIUM**
* `prob < 0.30` $\longrightarrow$ **LOW**

---

## 6. Local Explainability Engine

Predictions return local feature driver callouts detailing why the probability was elevated:
* *Example Output*:
  ```json
  {
    "serious_violation_probability": 0.84,
    "risk_score": 84,
    "risk_level": "HIGH",
    "model_version": "risk-model-v1",
    "top_factors": [
      "Recurring temperature-control violations (2 prior events)",
      "Previous corrective action failed",
      "Inspection gap (94 days since last inspection)"
    ]
  }
  ```

---

## 7. Operational & Scientific Limitations
> [!IMPORTANT]
> This ML Risk Engine is a **decision-support system**, not an autonomous enforcement mechanism. High predicted probability indicates elevated risk for inspection prioritization; it does not replace site visits by certified health inspectors.
