import { DrugRecord, Anomaly, QAResult } from './types'

export function runQA(prev: DrugRecord[], curr: DrugRecord[]): QAResult {
  const prevMap = new Map(prev.map(r => [r.drug_code, r]))
  const currMap = new Map(curr.map(r => [r.drug_code, r]))

  const anomalies: Anomaly[] = []

  // 전월 데이터 기준 비교
  for (const [code, prevRec] of prevMap) {
    const currRec = currMap.get(code)

    if (!currRec) {
      // 당월 누락
      anomalies.push({
        drug_code: code,
        drug_name: prevRec.drug_name,
        type: 'MISSING_CURRENT',
        prev_value: prevRec.prescription,
        curr_value: null,
        change_rate: -100,
      })
      continue
    }

    if (currRec.prescription === 0) {
      anomalies.push({
        drug_code: code,
        drug_name: prevRec.drug_name,
        type: 'ZERO_VALUE',
        prev_value: prevRec.prescription,
        curr_value: 0,
        change_rate: -100,
      })
      continue
    }

    if (prevRec.prescription > 0) {
      const changeRate = ((currRec.prescription - prevRec.prescription) / prevRec.prescription) * 100

      if (changeRate <= -80) {
        anomalies.push({
          drug_code: code,
          drug_name: prevRec.drug_name,
          type: 'DROP_OVER_80',
          prev_value: prevRec.prescription,
          curr_value: currRec.prescription,
          change_rate: changeRate,
        })
      } else if (changeRate <= -50) {
        anomalies.push({
          drug_code: code,
          drug_name: prevRec.drug_name,
          type: 'DROP_OVER_50',
          prev_value: prevRec.prescription,
          curr_value: currRec.prescription,
          change_rate: changeRate,
        })
      } else if (changeRate >= 200) {
        anomalies.push({
          drug_code: code,
          drug_name: prevRec.drug_name,
          type: 'SURGE_OVER_200',
          prev_value: prevRec.prescription,
          curr_value: currRec.prescription,
          change_rate: changeRate,
        })
      }
    }
  }

  // 당월 신규 약품 (전월에 없는)
  for (const [code, currRec] of currMap) {
    if (!prevMap.has(code)) {
      anomalies.push({
        drug_code: code,
        drug_name: currRec.drug_name,
        type: 'NEW_ENTRY',
        prev_value: null,
        curr_value: currRec.prescription,
        change_rate: null,
      })
    }
  }

  // 심각도 분류
  const critical = anomalies.filter(a => a.type === 'DROP_OVER_80' || a.type === 'MISSING_CURRENT' || a.type === 'ZERO_VALUE').length
  const warning = anomalies.filter(a => a.type === 'DROP_OVER_50' || a.type === 'SURGE_OVER_200').length
  const new_entry = anomalies.filter(a => a.type === 'NEW_ENTRY').length
  const missing = anomalies.filter(a => a.type === 'MISSING_CURRENT').length

  // 심각도 순 정렬
  const order: Record<string, number> = { MISSING_CURRENT: 0, DROP_OVER_80: 1, ZERO_VALUE: 2, DROP_OVER_50: 3, SURGE_OVER_200: 4, NEW_ENTRY: 5 }
  anomalies.sort((a, b) => (order[a.type] ?? 9) - (order[b.type] ?? 9))

  return {
    total_prev: prev.length,
    total_curr: curr.length,
    matched: [...prevMap.keys()].filter(k => currMap.has(k)).length,
    anomalies,
    summary: { critical, warning, new_entry, missing },
  }
}
