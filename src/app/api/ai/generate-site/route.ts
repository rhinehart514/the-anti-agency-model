import { NextRequest, NextResponse } from 'next/server';
import { getGroqClient, DEFAULT_MODEL } from '@/lib/ai/client';
import { SITE_GENERATOR_PROMPT, AVAILABLE_SECTIONS } from '@/lib/ai/prompts';
import { loggers } from '@/lib/logger';

export interface GeneratedSite {
  siteMeta: {
    name: string;
    tagline: string;
    primaryColor: string;
    secondaryColor: string;
  };
  sections: Array<{
    componentId: string;
    props: Record<string, unknown>;
  }>;
}

export interface GenerateRequest {
  type: 'description' | 'import';
  description?: string;
  businessName?: string;
  scrapedData?: {
    title?: string;
    description?: string;
    content?: string;
    images?: string[];
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as GenerateRequest;
    const { type, description, businessName, scrapedData } = body;

    // Validate request
    if (type === 'description' && !description) {
      return NextResponse.json(
        { error: 'Description is required for generate mode' },
        { status: 400 }
      );
    }

    if (type === 'import' && !scrapedData) {
      return NextResponse.json(
        { error: 'Scraped data is required for import mode' },
        { status: 400 }
      );
    }

    // Get Groq client
    const groq = getGroqClient();
    if (!groq) {
      return NextResponse.json(
        { error: 'AI service is not configured' },
        { status: 503 }
      );
    }

    // Build the user prompt based on input type
    let userPrompt: string;

    if (type === 'description') {
      userPrompt = businessName
        ? `Business Name: ${businessName}\n\nDescription: ${description}`
        : `Create a website for this business:\n\n${description}`;
    } else {
      // Import mode - use scraped data
      userPrompt = `Improve and modernize this existing website:

Business: ${scrapedData?.title || 'Unknown Business'}
Current Description: ${scrapedData?.description || 'No description'}

Content from existing site:
${scrapedData?.content || 'No content available'}

Create a modern, professional version of this site with improved content and structure.`;
    }

    loggers.api.info({ type, promptLength: userPrompt.length }, 'Generating site');

    // Call Groq API
    const completion = await groq.chat.completions.create({
      model: DEFAULT_MODEL,
      messages: [
        { role: 'system', content: SITE_GENERATOR_PROMPT },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.7,
      max_tokens: 4000,
    });

    const responseText = completion.choices[0]?.message?.content;

    if (!responseText) {
      throw new Error('No response from AI');
    }

    // Parse the JSON response
    let generatedSite: GeneratedSite;
    try {
      // Try to extract JSON from the response (in case there's extra text)
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }
      generatedSite = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      loggers.api.error({ response: responseText.substring(0, 500) }, 'Failed to parse AI response');
      throw new Error('Failed to parse AI response as JSON');
    }

    // Validate the response structure
    if (!generatedSite.siteMeta || !generatedSite.sections) {
      throw new Error('Invalid site structure returned');
    }

    // Validate section component IDs
    generatedSite.sections = generatedSite.sections.filter(section =>
      AVAILABLE_SECTIONS.includes(section.componentId as any)
    );

    if (generatedSite.sections.length === 0) {
      throw new Error('No valid sections generated');
    }

    // Add order indices to sections
    generatedSite.sections = generatedSite.sections.map((section, index) => ({
      ...section,
      id: `section-${Date.now()}-${index}`,
      orderIndex: index,
    }));

    loggers.api.info({
      siteName: generatedSite.siteMeta.name,
      sectionCount: generatedSite.sections.length
    }, 'Site generated successfully');

    return NextResponse.json(generatedSite);
  } catch (error) {
    loggers.api.error({ error }, 'Site generation failed');
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate site' },
      { status: 500 }
    );
  }
}
