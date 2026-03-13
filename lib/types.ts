export interface DrugRecord {
  drug_code: string      // 약품코드
  drug_name: string      // 약품명
  prescription: number  // 처방량
  amount: number        // 금액
  [key: string]: string | number
}

export type AnomalyType =
  | 'DROP_OVER_50'     // 처방량 50% 이상 감소
  | 'DROP_OVER_80'     // 처방량 80% 이상 감소 (심각)
  | 'MISSING_CURRENT'  // 당월 데이터 누락
  | 'NEW_ENTRY'        // 전월 없던 신규 약품
  | 'ZERO_VALUE'       // 처방량 0
  | 'SURGE_OVER_200'   // 처방량 200% 이상 급등

export interface Anomaly {
  drug_code: string
  drug_name: string
  type: AnomalyType
  prev_value: number | null
  curr_value: number | null
  change_rate: number | null  // % 변화율
  ai_analysis?: string
  ai_status?: 'loading' | 'done' | 'error'
}

export interface QAResult {
  total_prev: number
  total_curr: number
  matched: number
  anomalies: Anomaly[]
  summary: {
    critical: number
    warning: number
    new_entry: number
    missing: number
  }
}
