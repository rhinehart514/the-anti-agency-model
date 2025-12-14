import Groq from 'groq-sdk'

// Lazy-initialized Groq client to avoid build-time errors when API key is missing
let _groqClient: Groq | null = null

// Get Groq client (lazy initialization)
// Returns null if API key is not configured
export function getGroqClient(): Groq | null {
  if (!process.env.GROQ_API_KEY) {
    return null
  }
  if (!_groqClient) {
    _groqClient = new Groq({
      apiKey: process.env.GROQ_API_KEY,
    })
  }
  return _groqClient
}

// Legacy export for backwards compatibility (will throw if used without API key)
export const groq = {
  get chat() {
    const client = getGroqClient()
    if (!client) {
      throw new Error('GROQ_API_KEY is not configured')
    }
    return client.chat
  }
}

// Available models on Groq free tier
export const AI_MODELS = {
  // Fast and capable - good for content generation
  LLAMA_70B: 'llama-3.3-70b-versatile',
  // Faster, smaller - good for quick rewrites
  LLAMA_8B: 'llama-3.1-8b-instant',
  // Mixtral - good balance
  MIXTRAL: 'mixtral-8x7b-32768',
} as const

export const DEFAULT_MODEL = AI_MODELS.LLAMA_70B
