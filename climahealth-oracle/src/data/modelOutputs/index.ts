import modelMetrics from './model_metrics.json'
import shapImportance from './shap_importance.json'
import trainingHistory from './training_history.json'
import backtestPredictions from './backtest_predictions.json'
import countryRiskScores from './country_risk_scores.json'
import evaluationReport from './evaluation_report.json'

export interface ModelMetrics {
  mae_fusion: number
  rmse_fusion: number
  r2_fusion?: number
  mae_lstm: number
  rmse_lstm: number
  mae_xgb: number
  rmse_xgb: number
  lstm_weight: number
  xgb_weight: number
  train_samples: number
  test_samples: number
  n_features: number
  n_countries: number
  seq_length: number
  feature_cols: string[]
}

export interface SHAPFeature {
  feature: string
  mean_shap: number
  plain_english_description?: string
}

export interface TrainingHistory {
  epochs: number[]
  train_loss: number[]
  val_loss: number[]
  train_mae: number[]
  val_mae: number[]
}

export interface BacktestPredictions {
  actual: number[]
  predicted: number[]
  lstm_only: number[]
  xgb_only: number[]
  weeks: number[]
}

export interface CountryRiskScore {
  iso3: string
  country_name: string
  risk_score: number
  risk_level: 'low' | 'medium' | 'high' | 'critical'
  dominant_disease: string
  prediction_7d: number
  prediction_30d: number
  prediction_90d: number
  temp_mean: number
  humidity_mean: number
  rainfall_total: number
  pm25: number
  environmental_memory_score?: number
}

export const metrics = modelMetrics as ModelMetrics
export const shap = shapImportance as SHAPFeature[]
export const history = trainingHistory as TrainingHistory
export const backtest = backtestPredictions as BacktestPredictions
export const riskScores = countryRiskScores as CountryRiskScore[]
export const evaluation = evaluationReport

export function getCountryRisk(iso3: string): CountryRiskScore | undefined {
  return riskScores.find(c => c.iso3 === iso3)
}

export function getTopRiskCountries(n: number = 10): CountryRiskScore[] {
  return [...riskScores].sort((a, b) => b.risk_score - a.risk_score).slice(0, n)
}

export function getCriticalCountries(): CountryRiskScore[] {
  return riskScores.filter(c => c.risk_level === 'critical')
}

export function getGlobalAverageRisk(): number {
  if (riskScores.length === 0) return 0
  return Math.round(riskScores.reduce((sum, c) => sum + c.risk_score, 0) / riskScores.length)
}

export function getRiskDistribution(): Record<string, number> {
  return riskScores.reduce((acc, c) => {
    acc[c.risk_level] = (acc[c.risk_level] || 0) + 1
    return acc
  }, {} as Record<string, number>)
}
