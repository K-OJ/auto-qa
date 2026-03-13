import { NextRequest, NextResponse } from 'next/server'
import { Anomaly } from '@/lib/types'

function getMockAnalysis(anomaly: Anomaly): string {
  const name = anomaly.drug_name
  const prev = anomaly.prev_value?.toLocaleString() ?? 'N/A'
  const curr = anomaly.curr_value?.toLocaleString() ?? 'N/A'
  const rate = anomaly.change_rate !== null ? `${Math.abs(anomaly.change_rate).toFixed(1)}%` : ''

  switch (anomaly.type) {
    case 'DROP_OVER_80':
      return `[원인 분석] ${name}의 처방량이 전월 ${prev}건에서 ${curr}건으로 ${rate} 급락한 것은 데이터 입력 오류 가능성이 높습니다. 이 수준의 급격한 감소는 일반적인 시장 변화보다 누락·집계 오류에서 더 자주 발생합니다.\n[확인 항목] 원천 데이터(ERP·처방전 시스템) 재추출 여부, 해당 월 데이터 마감 처리 완료 여부를 확인하세요.\n[권고 조치] 즉시 담당자에게 원천 데이터 검증을 요청하고, 확인 전까지 해당 항목을 '데이터 보류' 상태로 표시하세요.`

    case 'DROP_OVER_50':
      return `[원인 분석] ${name}의 처방량이 ${rate} 감소한 것은 데이터 오류와 시장 변화 양쪽 모두 가능성이 있습니다. 동일 계열 약품의 신규 경쟁 제품 출시, 보험급여 기준 변경 등 외부 요인도 검토가 필요합니다.\n[확인 항목] 동일 성분 계열 약품의 당월 처방량 변화 추이 및 보험심사평가원 고시 변경 이력을 확인하세요.\n[권고 조치] 시장 변화 요인이 확인되지 않을 경우 데이터 재검증을 진행하고, 3개월 추이를 함께 검토하세요.`

    case 'MISSING_CURRENT':
      return `[원인 분석] ${name}(전월 ${prev}건)이 당월 데이터에서 완전히 누락된 것은 데이터 추출 오류 또는 집계 필터링 문제일 가능성이 높습니다. 약품 코드 변경(리코드)이나 품목 통폐합 여부도 확인이 필요합니다.\n[확인 항목] 약품코드 변경 이력, 당월 데이터 추출 쿼리의 WHERE 조건, 해당 약품의 공급 중단 여부를 확인하세요.\n[권고 조치] 원천 DB에서 해당 코드로 직접 조회하여 데이터 존재 여부를 즉시 확인하세요.`

    case 'ZERO_VALUE':
      return `[원인 분석] ${name}의 처방량이 0으로 기록된 것은 시스템 초기화 오류 또는 데이터 변환 과정의 결측값 처리 오류일 가능성이 있습니다. 실제 공급 중단과는 구별이 필요합니다.\n[확인 항목] 원천 시스템의 실제 처방량 값과 ETL 파이프라인의 Null/0 처리 로직을 확인하세요.\n[권고 조치] 원천 데이터 재확인 후, 실제 0건이 맞다면 '공급 중단' 또는 '처방 없음' 사유를 비고란에 명시하세요.`

    case 'SURGE_OVER_200':
      return `[원인 분석] ${name}의 처방량이 전월 ${prev}건에서 ${curr}건으로 ${rate} 급등한 것은 대규모 임상 프로그램 등록, 경쟁 제품 수급 차질, 또는 중복 집계 오류 가능성이 있습니다.\n[확인 항목] 동일 약품의 거래처별 처방 내역 분포, 특정 대형 병원의 일괄 처방 여부, 데이터 중복 입력 여부를 확인하세요.\n[권고 조치] 중복 집계가 의심될 경우 원천 데이터의 처방전 ID 중복 여부를 우선 검사하세요.`

    default:
      return `[원인 분석] ${name}은 당월 신규 등재 약품으로 전월 비교 기준이 없습니다. 신규 품목 등재 절차를 통해 정상 추가된 항목인지 확인이 필요합니다.\n[확인 항목] 품목 허가 및 보험 등재 일자, 마스터 코드 등록 경위를 확인하세요.\n[권고 조치] 정상 신규 등재 확인 시 '신규 검증 완료' 태그를 부여하고 다음 달부터 정기 모니터링에 포함하세요.`
  }
}

export async function POST(req: NextRequest) {
  const { anomaly }: { anomaly: Anomaly } = await req.json()

  // 실제 API 호출을 시뮬레이션하는 딜레이 (0.8~1.5초)
  await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 700))

  const analysis = getMockAnalysis(anomaly)
  return NextResponse.json({ analysis })
}
