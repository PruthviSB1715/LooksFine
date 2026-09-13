// LooksFine Domain Constants

export const Role = {
  FOOD_SAFETY_INSPECTOR: 'FOOD_SAFETY_INSPECTOR',
  INSPECTION_MANAGER: 'INSPECTION_MANAGER',
  ESTABLISHMENT_MANAGER: 'ESTABLISHMENT_MANAGER',
  FOOD_SAFETY_ADMIN: 'FOOD_SAFETY_ADMIN',
} as const
export type Role = (typeof Role)[keyof typeof Role]

export const RiskLevel = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL',
} as const
export type RiskLevel = (typeof RiskLevel)[keyof typeof RiskLevel]

export const InspectionStatus = {
  SCHEDULED: 'SCHEDULED',
  IN_PROGRESS: 'IN_PROGRESS',
  SUBMITTED: 'SUBMITTED',
  REVIEWED: 'REVIEWED',
  CORRECTIVE_ACTION_REQUIRED: 'CORRECTIVE_ACTION_REQUIRED',
  RESOLVED: 'RESOLVED',
} as const
export type InspectionStatus = (typeof InspectionStatus)[keyof typeof InspectionStatus]

export const ViolationCategory = {
  IMPROPER_STORAGE: 'IMPROPER_STORAGE',
  TEMPERATURE_CONTROL: 'TEMPERATURE_CONTROL',
  SANITATION: 'SANITATION',
  PESTS: 'PESTS',
  CROSS_CONTAMINATION: 'CROSS_CONTAMINATION',
  EXPIRED_FOOD: 'EXPIRED_FOOD',
  UNSAFE_HANDLING: 'UNSAFE_HANDLING',
  FACILITY_HYGIENE: 'FACILITY_HYGIENE',
} as const
export type ViolationCategory = (typeof ViolationCategory)[keyof typeof ViolationCategory]

export const Severity = {
  MINOR: 'MINOR',
  MAJOR: 'MAJOR',
  CRITICAL: 'CRITICAL',
} as const
export type Severity = (typeof Severity)[keyof typeof Severity]

export const CorrectiveActionStatus = {
  REQUIRED: 'REQUIRED',
  SUBMITTED: 'SUBMITTED',
  ACCEPTED: 'ACCEPTED',
  REJECTED: 'REJECTED',
  REINSPECTION_REQUIRED: 'REINSPECTION_REQUIRED',
  CLOSED: 'CLOSED',
} as const
export type CorrectiveActionStatus = (typeof CorrectiveActionStatus)[keyof typeof CorrectiveActionStatus]
