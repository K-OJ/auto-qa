import { createAnthropic } from '@ai-sdk/anthropic'
import { generateText } from 'ai'
import { NextRequest, NextResponse } from 'next/server'
import { Anomaly } from '@/lib/types'

const TYPE_LABEL: Record<string, string> = {
  DROP_OVER_80: '처방량 80% 이상 급락',
  DROP_OVER_50: '처방량 50% 이상 감소',
  MISSING_CURRENT: '당월 데이터 누락',
  ZERO_VALUE: '당월 처방량 0',
  SURGE_OVER_200: '처방량 200% 이상 급등',
  NEW_ENTRY: '신규 등재 약품',
}

export async function POST(req: NextRequest) {
  const { anomaly }: { anomaly: Anomaly } = await req.json()

  const anthropic = createAnthropic({
    apiKey: process.env.ANTHROPIC_API_KEY ?? '',
  })

  const changeDesc = anomaly.change_rate !== null
    ? `전월 ${anomaly.prev_value?.toLocaleString() ?? 'N/A'}건 → 당월 ${anomaly.curr_value?.toLocaleString() ?? 'N/A'}건 (${anomaly.change_rate.toFixed(1)}% 변화)`
    : anomaly.curr_value !== null
      ? `신규 등재 — 당월 ${anomaly.curr_value.toLocaleString()}건`
      : `전월 ${anomaly.prev_value?.toLocaleString()}건 → 당월 없음`

  const prompt = `당신은 제약 데이터 품질 검수(QA) 전문가입니다.
아래 이상 데이터를 분석하고, 데이터 오류(누락·입력 실수)인지 실제 시장 변화인지 판단해주세요.

[이상 항목]
- 약품코드: ${anomaly.drug_code}
- 약품명: ${anomaly.drug_name}
- 이상 유형: ${TYPE_LABEL[anomaly.type] ?? anomaly.type}
- 수치: ${changeDesc}

다음 형식으로 간결하게 2~3문장으로 답변하세요:
1. 가능성 높은 원인 (데이터 오류 or 시장 변화)
2. 확인이 필요한 항목
3. 권고 조치`

  try {
    const { text } = await generateText({
      model: anthropic('claude-sonnet-4-6'),
      prompt,
      maxOutputTokens: 300,
    })
    return NextResponse.json({ analysis: text })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'AI 분석 실패' }, { status: 500 })
  }
}
