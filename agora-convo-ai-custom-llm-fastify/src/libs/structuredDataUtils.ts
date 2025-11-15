import { broadcastStructuredData } from './websocketHub'

interface ExtractionResult {
  plainText: string
  jsonText: string
  data: Record<string, any>
}

function extractStructuredJsonBlock(content: string): ExtractionResult | null {
  if (!content) return null

  const trimmed = content.trim()
  const match = trimmed.match(/\{[\s\S]*\}$/)
  if (!match) {
    return null
  }

  const jsonText = match[0]
  try {
    const data = JSON.parse(jsonText)
    const plainText = trimmed.slice(0, trimmed.length - jsonText.length).trim()
    return {
      data,
      jsonText,
      plainText,
    }
  } catch {
    return null
  }
}

function emitStructuredDataFromText(content: string) {
  const extraction = extractStructuredJsonBlock(content)
  if (!extraction) {
    return
  }

  broadcastStructuredData({
    plainText: extraction.plainText,
    structured: extraction.data,
    rawJson: extraction.jsonText,
  })
}

export { emitStructuredDataFromText, extractStructuredJsonBlock }
