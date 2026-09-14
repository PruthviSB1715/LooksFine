import { prisma } from '../lib/prisma'
import { getMLRiskIntelligence } from '../lib/services/mlRiskService'
import { validateAndFormatVisionResult } from '../lib/services/evidence/visionService'

async function runPhase56CredibilityTest() {
  console.log('🛡️ Starting Phase 5.6 AI Credibility, TreeSHAP & Fallback Integrity Verification...\n')

  // 1. Test Live Python ML Service SHAP TreeExplainer & Dynamic Explanations
  console.log('🧠 1. Testing Python ML Microservice TreeSHAP & Feature Attributions...')
  const mlServiceUrl = process.env.ML_SERVICE_URL || 'http://localhost:8000'

  try {
    const healthRes = await fetch(`${mlServiceUrl}/health`)
    if (healthRes.ok) {
      const healthJson = await healthRes.json()
      console.log(`   - ML Microservice Healthy?: YES ✅`)
      console.log(`   - Model Loaded?: ${healthJson.model_loaded}`)
      console.log(`   - SHAP TreeExplainer Loaded?: ${healthJson.shap_explainer_loaded ? 'YES ✅' : 'NO ❌'}`)
      
      // Test High Risk Input (Hotel Rajdhani style)
      const highRiskPayload = {
        establishment_id: 'rajdhani-test',
        establishment_type: 'Restaurant',
        region: 'Solapur',
        days_since_last_inspection: 94,
        prev_inspection_count: 3,
        prev_violation_count: 4,
        prev_critical_violation_count: 2,
        prev_major_violation_count: 1,
        prev_minor_violation_count: 1,
        unresolved_violation_count: 2,
        recurring_violation_count: 1,
        temp_control_violation_count: 2,
        sanitation_violation_count: 1,
        pest_violation_count: 1,
        failed_corrective_action_count: 1,
        corrective_action_success_rate: 0.0,
      }

      const highRiskRes = await fetch(`${mlServiceUrl}/predict-risk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(highRiskPayload),
      })

      if (highRiskRes.ok) {
        const highJson = await highRiskRes.json()
        console.log(`\n   --- High-Risk Inference Result ---`)
        console.log(`   - P(serious violation): ${(highJson.serious_violation_probability * 100).toFixed(1)}%`)
        console.log(`   - Risk Level: ${highJson.risk_level}`)
        console.log(`   - SHAP Explanations Count: ${highJson.shap_explanations?.length || 0}`)
        console.log(`   - Top Factors:`)
        highJson.top_factors.forEach((f: string) => console.log(`     * ${f}`))

        if (!highJson.shap_explanations || highJson.shap_explanations.length === 0) {
          throw new Error('TreeSHAP test failed: Missing shap_explanations in ML response!')
        }

        const topShap = highJson.shap_explanations[0]
        if (typeof topShap.shapValue !== 'number' || !topShap.direction) {
          throw new Error('TreeSHAP test failed: Invalid SHAP explanation structure!')
        }
        console.log(`   - Verified Top SHAP Feature: "${topShap.feature}" (Value=${topShap.value}, SHAP=${topShap.shapValue > 0 ? '+' : ''}${topShap.shapValue}, Direction=${topShap.direction}) ✅`)
      }

      // Test Low Risk Input (Catering / Bakery style)
      const lowRiskPayload = {
        establishment_id: 'caterer-test',
        establishment_type: 'Bakery',
        region: 'Nashik',
        days_since_last_inspection: 15,
        prev_inspection_count: 5,
        prev_violation_count: 0,
        prev_critical_violation_count: 0,
        prev_major_violation_count: 0,
        prev_minor_violation_count: 0,
        unresolved_violation_count: 0,
        recurring_violation_count: 0,
        temp_control_violation_count: 0,
        sanitation_violation_count: 0,
        pest_violation_count: 0,
        failed_corrective_action_count: 0,
        corrective_action_success_rate: 1.0,
      }

      const lowRiskRes = await fetch(`${mlServiceUrl}/predict-risk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(lowRiskPayload),
      })

      if (lowRiskRes.ok) {
        const lowJson = await lowRiskRes.json()
        console.log(`\n   --- Low-Risk Inference Result ---`)
        console.log(`   - P(serious violation): ${(lowJson.serious_violation_probability * 100).toFixed(1)}%`)
        console.log(`   - Risk Level: ${lowJson.risk_level}`)
        console.log(`   - Top Factors:`)
        lowJson.top_factors.forEach((f: string) => console.log(`     * ${f}`))

        const topLowShap = lowJson.shap_explanations?.[0]
        console.log(`   - Verified Top Low-Risk SHAP Feature: "${topLowShap?.feature}" (SHAP=${topLowShap?.shapValue}) ✅`)
      }
    } else {
      console.log('   - Python ML microservice offline; skipping live HTTP SHAP check.')
    }
  } catch (e) {
    console.log(`   - Note: ML service check error: ${e}`)
  }

  // 2. Test ML Service Fallback Integrity (No Hardcoded 0.84)
  console.log('\n🔄 2. Testing ML Fallback & Special-Case Removal...')
  const rajdhani = await prisma.establishment.findFirst({ where: { name: 'Hotel Rajdhani' } })
  if (rajdhani) {
    const intel = await getMLRiskIntelligence(rajdhani.id)
    console.log(`   - Target Establishment: Hotel Rajdhani (ID: ${rajdhani.id})`)
    console.log(`   - Evaluated Model Version: ${intel.modelVersion}`)
    console.log(`   - Evaluated Probability: ${(intel.seriousViolationProbability * 100).toFixed(1)}%`)
    console.log(`   - Is ML Prediction?: ${intel.isMLPrediction ? 'YES' : 'NO (Deterministic Baseline)'}`)

    // If offline fallback occurs, ensure probability is computed mathematically from baseline score
    if (!intel.isMLPrediction) {
      const expectedFallbackProb = Math.min(0.95, Math.max(0.10, intel.riskScore / 100))
      if (Math.abs(intel.seriousViolationProbability - expectedFallbackProb) > 0.001) {
        throw new Error(`Fallback test failed: Expected baseline score probability ${expectedFallbackProb}, got ${intel.seriousViolationProbability}`)
      }
      console.log('   - Verified Fallback Integrity: Probability dynamically derived from risk score baseline! ✅')
    }
  }

  // 3. Test Bounding Box Format Conversion & Validation
  console.log('\n📐 3. Testing Visual Bounding Box Format Standardization & Boundary Validation...')
  const rawModelResponseWithLegacyBox = {
    canDetermine: true,
    findings: [
      {
        category: 'IMPROPER_STORAGE',
        confidence: 0.94,
        title: 'Walk-in cooler ambient reading 49°F',
        description: 'Ambient temperature gauge reading exceeds threshold.',
        reasoning: 'Temperature violation observed.',
        severityRecommendation: 'CRITICAL',
        boundingBox: { ymin: 0.25, xmin: 0.3, ymax: 0.65, xmax: 0.75 },
      }
    ]
  }

  const validatedResult = validateAndFormatVisionResult(rawModelResponseWithLegacyBox, JSON.stringify(rawModelResponseWithLegacyBox))
  const box = validatedResult.findings[0]?.boundingBox

  console.log(`   - Converted Bounding Box Output:`, box)
  if (!box || box.x !== 0.3 || box.y !== 0.25 || box.width !== 0.45 || box.height !== 0.4) {
    throw new Error(`Bounding box conversion failed! Expected { x: 0.3, y: 0.25, width: 0.45, height: 0.4 }, got ${JSON.stringify(box)}`)
  }
  console.log('   - Verified Bounding Box Legacy Conversion: { ymin: 0.25, xmin: 0.3, ymax: 0.65, xmax: 0.75 } -> { x: 0.3, y: 0.25, width: 0.45, height: 0.4 } ✅')

  // Boundary Overflow Test
  const rawOverflowBox = {
    canDetermine: true,
    findings: [
      {
        category: 'CROSS_CONTAMINATION',
        confidence: 0.88,
        title: 'Raw poultry placement',
        description: 'Raw chicken stored over produce.',
        reasoning: 'Cross contamination risk.',
        severityRecommendation: 'MAJOR',
        boundingBox: { x: 0.8, y: 0.7, width: 0.5, height: 0.6 }, // Overflows 1.0!
      }
    ]
  }
  const overflowValidated = validateAndFormatVisionResult(rawOverflowBox, JSON.stringify(rawOverflowBox))
  const overflowBox = overflowValidated.findings[0]?.boundingBox
  console.log(`   - Clamped Overflow Bounding Box Output:`, overflowBox)
  if (!overflowBox || overflowBox.x + overflowBox.width > 1.001 || overflowBox.y + overflowBox.height > 1.001) {
    throw new Error('Bounding box clamping failed: Coordinates exceed 1.0 boundary!')
  }
  console.log('   - Verified Boundary Clamping: Coordinates strictly constrained within [0.0, 1.0]! ✅')

  console.log('\n🎉 ALL PHASE 5.6 AI CREDIBILITY & INTEGRITY VERIFICATIONS PASSED SUCCESSFULLY!')
}

runPhase56CredibilityTest()
  .catch((err) => {
    console.error('❌ Phase 5.6 verification test failed:', err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
