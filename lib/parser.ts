import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import { DrugRecord } from './types'

const FIELD_ALIASES: Record<string, keyof DrugRecord> = {
  '약품코드': 'drug_code', 'drug_code': 'drug_code', 'code': 'drug_code', '코드': 'drug_code',
  '약품명': 'drug_name', 'drug_name': 'drug_name', 'name': 'drug_name', '품명': 'drug_name',
  '처방량': 'prescription', 'prescription': 'prescription', 'qty': 'prescription', '수량': 'prescription', '처방수량': 'prescription',
  '금액': 'amount', 'amount': 'amount', 'price': 'amount', '처방금액': 'amount',
}

function normalizeRow(row: Record<string, string>): DrugRecord | null {
  const result: Partial<DrugRecord> = {}
  for (const [key, val] of Object.entries(row)) {
    const mapped = FIELD_ALIASES[key.trim()]
    if (mapped) {
      if (mapped === 'drug_code' || mapped === 'drug_name') {
        result[mapped] = String(val ?? '').trim()
      } else {
        result[mapped] = parseFloat(String(val).replace(/,/g, '')) || 0
      }
    }
  }
  if (!result.drug_code) return null
  return {
    drug_code: result.drug_code ?? '',
    drug_name: result.drug_name ?? result.drug_code ?? '',
    prescription: result.prescription ?? 0,
    amount: result.amount ?? 0,
  }
}

export async function parseFile(file: File): Promise<DrugRecord[]> {
  const ext = file.name.split('.').pop()?.toLowerCase()

  if (ext === 'csv') {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const rows = (results.data as Record<string, string>[])
            .map(normalizeRow)
            .filter((r): r is DrugRecord => r !== null)
          resolve(rows)
        },
        error: reject,
      })
    })
  }

  if (ext === 'xlsx' || ext === 'xls') {
    const buffer = await file.arrayBuffer()
    const wb = XLSX.read(buffer, { type: 'array' })
    const ws = wb.Sheets[wb.SheetNames[0]]
    const raw = XLSX.utils.sheet_to_json<Record<string, string>>(ws, { defval: '' })
    return raw.map(normalizeRow).filter((r): r is DrugRecord => r !== null)
  }

  throw new Error('지원하지 않는 파일 형식입니다. CSV 또는 XLSX 파일을 업로드하세요.')
}
