import { summarizeText } from '../utils.js'

export interface OCRResult {
  text: string
  warnings: string[]
}

export async function runOCR(buffer: Buffer): Promise<OCRResult> {
  const warnings: string[] = []

  try {
    const { createWorker } = await import('tesseract.js')
    const worker = await createWorker('eng')
    const result = await worker.recognize(buffer)
    await worker.terminate()

    return {
      text: summarizeText(result.data.text || '', 10000),
      warnings,
    }
  } catch (error) {
    warnings.push(`OCR failed: ${(error as Error).message}`)
    return {
      text: '',
      warnings,
    }
  }
}
