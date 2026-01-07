import { NextRequest } from 'next/server';
import { getGroqClient, AI_MODELS } from '@/lib/ai/client';
import { createClient } from '@/lib/supabase/server';
import { loggers } from '@/lib/logger';

// Streaming response for chat interactions
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const body = await request.json();
    const { messages, context } = body;

    if (!messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: 'Messages required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const groq = getGroqClient();

    if (!groq) {
      // Demo mode response
      return new Response(JSON.stringify({
        content: '[Demo Mode] AI responses are simulated. Set GROQ_API_KEY to enable.',
        model: 'demo',
      }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Build system prompt based on context
    let systemPrompt = `You are a helpful AI assistant for a website builder platform.
You help users edit and improve their websites using natural language.
Be concise, friendly, and action-oriented.`;

    if (context?.siteName) {
      systemPrompt += `\n\nYou're helping with the website for "${context.siteName}".`;
    }
    if (context?.industry) {
      systemPrompt += `\nIndustry: ${context.industry}`;
    }

    // Create streaming completion
    const stream = await groq.chat.completions.create({
      model: AI_MODELS.LLAMA_70B,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages.map((m: { role: string; content: string }) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
      ],
      temperature: 0.7,
      max_tokens: 1000,
      stream: true,
    });

    // Create a readable stream for the response
    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content || '';
            if (content) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`));
            }
          }
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch (error) {
          loggers.ai.error({ error }, 'Streaming error');
          controller.error(error);
        }
      },
    });

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    loggers.ai.error({ error }, 'Chat API error');
    return new Response(JSON.stringify({ error: 'Failed to process chat' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
