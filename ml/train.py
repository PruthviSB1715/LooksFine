import json
import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import HistGradientBoostingClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    roc_auc_score,
    average_precision_score,
    precision_score,
    recall_score,
    f1_score,
    confusion_matrix,
)
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline

# Categorical & Numeric Features
CATEGORICAL_FEATURES = ['establishment_type', 'region']
NUMERIC_FEATURES = [
    'days_since_last_inspection',
    'prev_inspection_count',
    'prev_violation_count',
    'prev_critical_violation_count',
    'prev_major_violation_count',
    'prev_minor_violation_count',
    'unresolved_violation_count',
    'recurring_violation_count',
    'temp_control_violation_count',
    'sanitation_violation_count',
    'pest_violation_count',
    'failed_corrective_action_count',
    'corrective_action_success_rate',
]

TARGET = 'target_serious_violation'

def train_model():
    print("[INFO] Loading historical inspection dataset...")
    df = pd.read_csv('ml/data/historical_inspections.csv')

    # Temporal split: Use sequence_num <= 6 for train, > 6 for test
    train_mask = df['sequence_num'] <= 6
    test_mask = df['sequence_num'] > 6

    X_train = df.loc[train_mask, CATEGORICAL_FEATURES + NUMERIC_FEATURES]
    y_train = df.loc[train_mask, TARGET]
    X_test = df.loc[test_mask, CATEGORICAL_FEATURES + NUMERIC_FEATURES]
    y_test = df.loc[test_mask, TARGET]

    print(f"[INFO] Dataset split: Train samples = {len(X_train)}, Test samples = {len(X_test)}")

    # Preprocessing Pipeline
    preprocessor = ColumnTransformer(
        transformers=[
            ('cat', OneHotEncoder(handle_unknown='ignore', sparse_output=False), CATEGORICAL_FEATURES),
            ('num', StandardScaler(), NUMERIC_FEATURES),
        ]
    )

    # 1. Baseline Logistic Regression
    lr_pipeline = Pipeline([
        ('preprocessor', preprocessor),
        ('classifier', LogisticRegression(random_state=42, max_iter=1000))
    ])
    lr_pipeline.fit(X_train, y_train)
    lr_preds_prob = lr_pipeline.predict_proba(X_test)[:, 1]
    lr_auc = roc_auc_score(y_test, lr_preds_prob)
    print(f"[BASELINE] Logistic Regression ROC-AUC: {lr_auc:.4f}")

    # 2. Production HistGradientBoosting Classifier
    gbdt_pipeline = Pipeline([
        ('preprocessor', preprocessor),
        ('classifier', HistGradientBoostingClassifier(
            max_iter=150,
            learning_rate=0.08,
            max_depth=5,
            random_state=42
        ))
    ])
    gbdt_pipeline.fit(X_train, y_train)

    # Predictions & Probability Scoring
    y_pred_prob = gbdt_pipeline.predict_proba(X_test)[:, 1]
    y_pred_class = (y_pred_prob >= 0.45).astype(int) # Threshold 0.45 for decision sensitivity

    # Evaluate Metrics
    roc_auc = roc_auc_score(y_test, y_pred_prob)
    pr_auc = average_precision_score(y_test, y_pred_prob)
    precision = precision_score(y_test, y_pred_class)
    recall = recall_score(y_test, y_pred_class)
    f1 = f1_score(y_test, y_pred_class)
    cm = confusion_matrix(y_test, y_pred_class).tolist()

    metrics = {
        'model_version': 'risk-model-v1',
        'train_samples': len(X_train),
        'test_samples': len(X_test),
        'logistic_regression_auc': round(lr_auc, 4),
        'gradient_boosting_roc_auc': round(roc_auc, 4),
        'gradient_boosting_pr_auc': round(pr_auc, 4),
        'precision': round(precision, 4),
        'recall': round(recall, 4),
        'f1_score': round(f1, 4),
        'confusion_matrix': cm,
    }

    print("\n[EVALUATION RESULTS] Production Gradient Boosting Model:")
    print(f"   - ROC-AUC: {roc_auc:.4f}")
    print(f"   - PR-AUC:  {pr_auc:.4f}")
    print(f"   - Precision: {precision:.4f}, Recall: {recall:.4f}, F1: {f1:.4f}")
    print(f"   - Confusion Matrix (TN, FP, FN, TP): {cm}")

    # Save Trained Artifacts
    joblib.dump(gbdt_pipeline, 'ml/models/model.joblib')
    joblib.dump(preprocessor, 'ml/models/preprocessor.joblib')

    with open('ml/models/metrics.json', 'w') as f:
        json.dump(metrics, f, indent=2)

    print("\n[SUCCESS] Saved trained model artifacts to ml/models/.")

if __name__ == '__main__':
    train_model()
