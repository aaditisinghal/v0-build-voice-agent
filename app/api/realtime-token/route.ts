import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured. Please add OPENAI_API_KEY to your environment variables.' },
        { status: 500 }
      );
    }

    const url = 'https://api.openai.com/v1/realtime/sessions';
    
    const payload = {
      model: 'gpt-4o-realtime-preview-2024-12-17',
      voice: 'sage',
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', errorText);
      return NextResponse.json(
        { error: 'Failed to create realtime session' },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    return NextResponse.json({
      ephemeral_key: data.client_secret.value,
    });
  } catch (error) {
    console.error('Error creating realtime token:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
