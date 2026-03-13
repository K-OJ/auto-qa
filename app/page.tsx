'use client'

import { useState, useCallback } from 'react'
import { parseFile } from '@/lib/parser'
import { runQA } from '@/lib/qa-engine'
import { DrugRecord, QAResult, Anomaly } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'

const TYPE_LABEL: Record<string, string> = {
  DROP_OVER_80: '처방량 80%↓',
  DROP_OVER_50: '처방량 50%↓',
  MISSING_CURRENT: '당월 누락',
  ZERO_VALUE: '처방량 0',
  SURGE_OVER_200: '처방량 200%↑',
  NEW_ENTRY: '신규 등재',
}

const TYPE_VARIANT: Record<string, 'destructive' | 'secondary' | 'outline'> = {
  DROP_OVER_80: 'destructive',
  MISSING_CURRENT: 'destructive',
  ZERO_VALUE: 'destructive',
  DROP_OVER_50: 'secondary',
  SURGE_OVER_200: 'secondary',
  NEW_ENTRY: 'outline',
}

function FileDropZone({
  label, file, onFile,
}: { label: string; file: File | null; onFile: (f: File) => void }) {
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const f = e.dataTransfer.files[0]
    if (f) onFile(f)
  }, [onFile])

  return (
    <div
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
      className="border-2 border-dashed border-slate-600 rounded-xl p-8 text-center cursor-pointer hover:border-blue-500 hover:bg-slate-800/50 transition-all"
      onClick={() => document.getElementById(`file-${label}`)?.click()}
    >
      <input
        id={`file-${label}`}
        type="file"
        accept=".csv,.xlsx,.xls"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
      />
      <div className="text-4xl mb-3">📂</div>
      <p className="text-sm text-slate-400 mb-1">{label}</p>
      {file ? (
        <p className="text-blue-400 font-medium text-sm">✓ {file.name}</p>
      ) : (
        <p className="text-slate-500 text-xs">CSV 또는 XLSX 파일을 드래그하거나 클릭하세요</p>
      )}
    </div>
  )
}

function SummaryCards({ result }: { result: QAResult }) {
  const matchRate = result.total_prev > 0
    ? Math.round((result.matched / result.total_prev) * 100)
    : 0

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <Card className="bg-slate-800 border-slate-700">
        <CardContent className="pt-6">
          <p className="text-xs text-slate-400 mb-1">전월 약품 수</p>
          <p className="text-3xl font-bold text-white">{result.total_prev.toLocaleString()}</p>
        </CardContent>
      </Card>
      <Card className="bg-slate-800 border-slate-700">
        <CardContent className="pt-6">
          <p className="text-xs text-slate-400 mb-1">당월 약품 수</p>
          <p className="text-3xl font-bold text-white">{result.total_curr.toLocaleString()}</p>
        </CardContent>
      </Card>
      <Card className="bg-slate-800 border-slate-700">
        <CardContent className="pt-6">
          <p className="text-xs text-slate-400 mb-1">코드 일치율</p>
          <p className="text-3xl font-bold text-blue-400">{matchRate}%</p>
          <Progress value={matchRate} className="mt-2 h-1" />
        </CardContent>
      </Card>
      <Card className={`border ${result.summary.critical > 0 ? 'bg-red-950 border-red-700' : 'bg-slate-800 border-slate-700'}`}>
        <CardContent className="pt-6">
          <p className="text-xs text-slate-400 mb-1">이상 항목</p>
          <p className={`text-3xl font-bold ${result.summary.critical > 0 ? 'text-red-400' : 'text-green-400'}`}>
            {result.anomalies.length}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            긴급 {result.summary.critical} · 경고 {result.summary.warning} · 신규 {result.summary.new_entry}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

function AnomalyRow({
  anomaly, onAnalyze,
}: { anomaly: Anomaly; onAnalyze: (a: Anomaly) => void }) {
  return (
    <TableRow className="hover:bg-slate-800/60 border-slate-700">
      <TableCell className="font-mono text-xs text-slate-400">{anomaly.drug_code}</TableCell>
      <TableCell className="font-medium text-white">{anomaly.drug_name}</TableCell>
      <TableCell>
        <Badge variant={TYPE_VARIANT[anomaly.type] ?? 'outline'}>
          {TYPE_LABEL[anomaly.type] ?? anomaly.type}
        </Badge>
      </TableCell>
      <TableCell className="text-right text-slate-300">
        {anomaly.prev_value !== null ? anomaly.prev_value.toLocaleString() : '—'}
      </TableCell>
      <TableCell className="text-right text-slate-300">
        {anomaly.curr_value !== null ? anomaly.curr_value.toLocaleString() : '—'}
      </TableCell>
      <TableCell className={`text-right font-bold ${
        (anomaly.change_rate ?? 0) < 0 ? 'text-red-400' : 'text-emerald-400'
      }`}>
        {anomaly.change_rate !== null ? `${anomaly.change_rate.toFixed(1)}%` : '—'}
      </TableCell>
      <TableCell>
        {anomaly.ai_status === 'loading' ? (
          <span className="text-xs text-slate-500 animate-pulse">AI 분석 중...</span>
        ) : anomaly.ai_status === 'done' ? (
          <span className="text-xs text-emerald-400">✓ 완료</span>
        ) : (
          <Button
            size="sm"
            variant="outline"
            className="text-xs h-7 border-slate-600 hover:border-blue-500"
            onClick={() => onAnalyze(anomaly)}
          >
            🤖 AI 분석
          </Button>
        )}
      </TableCell>
    </TableRow>
  )
}

export default function Home() {
  const [prevFile, setPrevFile] = useState<File | null>(null)
  const [currFile, setCurrFile] = useState<File | null>(null)
  const [result, setResult] = useState<QAResult | null>(null)
  const [anomalies, setAnomalies] = useState<Anomaly[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('all')

  async function handleRun() {
    if (!prevFile || !currFile) return
    setLoading(true)
    setError(null)
    try {
      const [prev, curr]: [DrugRecord[], DrugRecord[]] = await Promise.all([
        parseFile(prevFile),
        parseFile(currFile),
      ])
      const qa = runQA(prev, curr)
      setResult(qa)
      setAnomalies(qa.anomalies)
    } catch (e) {
      setError(e instanceof Error ? e.message : '처리 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  async function handleAnalyze(anomaly: Anomaly) {
    setAnomalies(prev =>
      prev.map(a => a.drug_code === anomaly.drug_code ? { ...a, ai_status: 'loading' } : a)
    )
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ anomaly }),
      })
      const data = await res.json()
      setAnomalies(prev =>
        prev.map(a => a.drug_code === anomaly.drug_code
          ? { ...a, ai_status: 'done', ai_analysis: data.analysis ?? data.error }
          : a
        )
      )
    } catch {
      setAnomalies(prev =>
        prev.map(a => a.drug_code === anomaly.drug_code ? { ...a, ai_status: 'error' } : a)
      )
    }
  }

  async function handleAnalyzeAll() {
    const targets = anomalies.filter(a => !a.ai_status && a.type !== 'NEW_ENTRY').slice(0, 10)
    for (const a of targets) {
      await handleAnalyze(a)
    }
  }

  const filteredAnomalies = anomalies.filter(a => {
    if (activeTab === 'critical') return ['DROP_OVER_80', 'MISSING_CURRENT', 'ZERO_VALUE'].includes(a.type)
    if (activeTab === 'warning') return ['DROP_OVER_50', 'SURGE_OVER_200'].includes(a.type)
    if (activeTab === 'new') return a.type === 'NEW_ENTRY'
    if (activeTab === 'ai') return a.ai_status === 'done'
    return true
  })

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="border-b border-slate-800 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight">
              💊 제약 데이터 정합성 Auto-QA
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">월간 처방 데이터 AI 자동 검수 시스템</p>
          </div>
          {result && (
            <Button
              onClick={handleAnalyzeAll}
              className="bg-violet-600 hover:bg-violet-500 text-sm"
            >
              🤖 전체 AI 분석 (상위 10건)
            </Button>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {!result && (
          <Card className="bg-slate-900 border-slate-700">
            <CardHeader>
              <CardTitle className="text-lg">데이터 업로드</CardTitle>
              <CardDescription className="text-slate-400">
                전월과 당월 처방 데이터를 업로드하면 AI가 자동으로 이상 항목을 검출합니다
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <FileDropZone label="전월 데이터" file={prevFile} onFile={setPrevFile} />
                <FileDropZone label="당월 데이터" file={currFile} onFile={setCurrFile} />
              </div>
              {error && (
                <Alert className="border-red-700 bg-red-950">
                  <AlertDescription className="text-red-400">{error}</AlertDescription>
                </Alert>
              )}
              <Button
                onClick={handleRun}
                disabled={!prevFile || !currFile || loading}
                className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-40 h-12 text-base font-semibold"
              >
                {loading ? '🔄 분석 중...' : '🔍 검수 시작'}
              </Button>
              <p className="text-xs text-slate-600 text-center">
                지원 형식: CSV, XLSX · 필수 컬럼: 약품코드, 약품명, 처방량
              </p>
            </CardContent>
          </Card>
        )}

        {result && (
          <>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">검수 결과</h2>
              <Button
                variant="outline"
                size="sm"
                className="border-slate-600 text-slate-400"
                onClick={() => { setResult(null); setAnomalies([]) }}
              >
                ← 다시 업로드
              </Button>
            </div>

            <SummaryCards result={result} />

            {result.anomalies.length === 0 ? (
              <Alert className="border-emerald-700 bg-emerald-950">
                <AlertDescription className="text-emerald-400 text-base">
                  ✅ 이상 항목이 발견되지 않았습니다. 데이터 정합성 검수 통과!
                </AlertDescription>
              </Alert>
            ) : (
              <Card className="bg-slate-900 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-base">이상 항목 목록</CardTitle>
                </CardHeader>
                <CardContent>
                  <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList className="bg-slate-800 mb-4">
                      <TabsTrigger value="all">전체 ({anomalies.length})</TabsTrigger>
                      <TabsTrigger value="critical" className="data-[state=active]:text-red-400">
                        긴급 ({result.summary.critical})
                      </TabsTrigger>
                      <TabsTrigger value="warning">경고 ({result.summary.warning})</TabsTrigger>
                      <TabsTrigger value="new">신규 ({result.summary.new_entry})</TabsTrigger>
                      <TabsTrigger value="ai">AI 완료 ({anomalies.filter(a => a.ai_status === 'done').length})</TabsTrigger>
                    </TabsList>
                    <TabsContent value={activeTab}>
                      <Table>
                        <TableHeader>
                          <TableRow className="border-slate-700 hover:bg-transparent">
                            <TableHead className="text-slate-400">약품코드</TableHead>
                            <TableHead className="text-slate-400">약품명</TableHead>
                            <TableHead className="text-slate-400">유형</TableHead>
                            <TableHead className="text-right text-slate-400">전월</TableHead>
                            <TableHead className="text-right text-slate-400">당월</TableHead>
                            <TableHead className="text-right text-slate-400">변화율</TableHead>
                            <TableHead className="text-slate-400">AI 분석</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredAnomalies.map(a => (
                            <AnomalyRow key={a.drug_code} anomaly={a} onAnalyze={handleAnalyze} />
                          ))}
                        </TableBody>
                      </Table>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            )}

            {anomalies.some(a => a.ai_status === 'done') && (
              <Card className="bg-slate-900 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-base">🤖 AI 분석 결과</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {anomalies.filter(a => a.ai_status === 'done').map(a => (
                    <div key={a.drug_code} className="border border-slate-700 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant={TYPE_VARIANT[a.type] ?? 'outline'}>{TYPE_LABEL[a.type]}</Badge>
                        <span className="font-medium text-sm">{a.drug_name}</span>
                        <span className="text-xs text-slate-500 font-mono">{a.drug_code}</span>
                      </div>
                      <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">{a.ai_analysis}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </>
        )}
      </main>
    </div>
  )
}
