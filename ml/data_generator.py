import json
import random
import pandas as pd
import numpy as np

# Seed for reproducibility
random.seed(42)
np.random.seed(42)

ESTABLISHMENT_TYPES = [
    'Restaurant', 'Hotel', 'Bakery', 'Cafe', 
    'School/College Cafeteria', 'Hospital Kitchen', 'Food Truck', 'Institutional Kitchen'
]

REGIONS = [
    'Mission District', 'Marina', 'SoMa', 'North Beach', 
    'Financial District', 'Sunset', 'Richmond', 'Tenderloin', 'Nob Hill', 'Haight'
]

def generate_historical_dataset(num_establishments=150, inspections_per_est=8):
    """
    Generates realistic historical inspection sequences.
    Strictly avoids target leakage: Features at inspection N use ONLY historical data from inspections 1 to N-1.
    Target Y = 1 if inspection N contains at least 1 MAJOR or CRITICAL violation.
    """
    records = []

    for est_idx in range(1, num_establishments + 1):
        est_id = f"est-{est_idx:03d}"
        est_type = random.choice(ESTABLISHMENT_TYPES)
        region = random.choice(REGIONS)

        # Baseline vulnerability for establishment
        base_risk = 0.10
        if est_type in ['Restaurant', 'Hospital Kitchen', 'Food Truck']:
            base_risk += 0.15
        if region in ['Mission District', 'Tenderloin', 'Financial District']:
            base_risk += 0.10

        # State tracking prior to inspection N
        prev_inspection_count = 0
        prev_violation_count = 0
        prev_critical_violation_count = 0
        prev_major_violation_count = 0
        prev_minor_violation_count = 0
        unresolved_violation_count = 0
        recurring_violation_count = 0
        temp_control_violation_count = 0
        sanitation_violation_count = 0
        pest_violation_count = 0
        failed_corrective_action_count = 0
        successful_corrective_action_count = 0

        last_inspection_days_ago = random.randint(60, 180)

        for insp_seq in range(1, inspections_per_est + 1):
            days_since_last = last_inspection_days_ago if insp_seq == 1 else random.randint(14, 120)

            # Compute historical corrective action success rate
            total_actions = failed_corrective_action_count + successful_corrective_action_count
            ca_success_rate = (successful_corrective_action_count / total_actions) if total_actions > 0 else 1.0

            # Calculate true underlying probability of serious violation at Inspection N
            prob = base_risk
            if temp_control_violation_count > 0:
                prob += 0.25 * min(3, temp_control_violation_count)
            if pest_violation_count > 0:
                prob += 0.15 * min(2, pest_violation_count)
            if failed_corrective_action_count > 0:
                prob += 0.20 * min(2, failed_corrective_action_count)
            if unresolved_violation_count > 0:
                prob += 0.15 * min(3, unresolved_violation_count)
            if days_since_last > 90:
                prob += 0.12
            if ca_success_rate < 0.5:
                prob += 0.15

            prob = min(0.92, max(0.04, prob))

            # Determine Target Y for Inspection N
            is_serious_violation = 1 if random.random() < prob else 0

            # Record Feature Vector for Inspection N (ONLY if insp_seq > 1 so there's history)
            if insp_seq > 1:
                records.append({
                    'establishment_id': est_id,
                    'sequence_num': insp_seq,
                    'establishment_type': est_type,
                    'region': region,
                    'days_since_last_inspection': days_since_last,
                    'prev_inspection_count': prev_inspection_count,
                    'prev_violation_count': prev_violation_count,
                    'prev_critical_violation_count': prev_critical_violation_count,
                    'prev_major_violation_count': prev_major_violation_count,
                    'prev_minor_violation_count': prev_minor_violation_count,
                    'unresolved_violation_count': unresolved_violation_count,
                    'recurring_violation_count': recurring_violation_count,
                    'temp_control_violation_count': temp_control_violation_count,
                    'sanitation_violation_count': sanitation_violation_count,
                    'pest_violation_count': pest_violation_count,
                    'failed_corrective_action_count': failed_corrective_action_count,
                    'corrective_action_success_rate': ca_success_rate,
                    'target_serious_violation': is_serious_violation, # TARGET Y
                })

            # Update State AFTER Inspection N (for future inspections N+1)
            prev_inspection_count += 1
            if is_serious_violation == 1:
                num_vios = random.randint(1, 3)
                prev_violation_count += num_vios
                if random.random() < 0.6:
                    prev_critical_violation_count += 1
                    temp_control_violation_count += 1
                    unresolved_violation_count += 1
                    recurring_violation_count += (1 if random.random() < 0.5 else 0)
                else:
                    prev_major_violation_count += 1
                    sanitation_violation_count += 1
                    unresolved_violation_count += 1

                # Corrective action outcome
                if random.random() < 0.4:
                    failed_corrective_action_count += 1
                else:
                    successful_corrective_action_count += 1
                    unresolved_violation_count = max(0, unresolved_violation_count - 1)
            else:
                if random.random() < 0.3:
                    prev_minor_violation_count += 1
                    prev_violation_count += 1
                successful_corrective_action_count += 1

            last_inspection_days_ago = days_since_last

    df = pd.DataFrame(records)
    return df

if __name__ == '__main__':
    df = generate_historical_dataset(num_establishments=180, inspections_per_est=8)
    df.to_csv('ml/data/historical_inspections.csv', index=False)
    print(f"[SUCCESS] Generated {len(df)} historical inspection samples for ML model training.")
    print(f"          Target distribution: Positive (Serious Violation) = {df['target_serious_violation'].sum()} ({df['target_serious_violation'].mean():.1%})")
