import { NextResponse } from 'next/server'
import { getGroqClient, DEFAULT_MODEL } from '@/lib/ai/client'
import { SYSTEM_PROMPTS, type PromptType } from '@/lib/ai/prompts'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      content,
      instruction,
      promptType = 'contentRewriter',
      context
    } = body as {
      content: string
      instruction: string
      promptType?: PromptType
      context?: {
        businessType?: string
        businessName?: string
        sectionType?: string
      }
    }

    if (!content || !instruction) {
      return NextResponse.json(
        { error: 'Content and instruction are required' },
        { status: 400 }
      )
    }

    // Get Groq client (returns null if API key not configured)
    const groqClient = getGroqClient()

    if (!groqClient) {
      // Return a mock response for demo mode
      return NextResponse.json({
        suggestion: `[Demo Mode] ${content}`,
        model: 'demo',
        message: 'Set GROQ_API_KEY in .env.local to enable AI suggestions',
      })
    }

    // Build context-aware system prompt
    let systemPrompt = SYSTEM_PROMPTS[promptType] || SYSTEM_PROMPTS.contentRewriter

    if (context) {
      systemPrompt += `\n\nContext:`
      if (context.businessType) {
        systemPrompt += `\n- Business type: ${context.businessType}`
      }
      if (context.businessName) {
        systemPrompt += `\n- Business name: ${context.businessName}`
      }
      if (context.sectionType) {
        systemPrompt += `\n- Section: ${context.sectionType}`
      }
    }

    const completion = await groqClient.chat.completions.create({
      model: DEFAULT_MODEL,
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: `Current content:\n"${content}"\n\nInstruction: ${instruction}`,
        },
      ],
      temperature: 0.7,
      max_tokens: 500,
    })

    const suggestion = completion.choices[0]?.message?.content?.trim()

    if (!suggestion) {
      return NextResponse.json(
        { error: 'No suggestion generated' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      suggestion,
      model: DEFAULT_MODEL,
    })
  } catch (error) {
    console.error('AI rewrite error:', error)
    return NextResponse.json(
      { error: 'Failed to generate suggestion' },
      { status: 500 }
    )
  }
}
