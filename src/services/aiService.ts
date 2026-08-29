interface OpenAI_Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export async function fetchOpenAIResponse(
  messages: { role: string; content: string }[],
  systemPrompt: string,
  model: string = 'gpt-4o-mini'
): Promise<string> {
  const apiKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("La clé API OpenAI (EXPO_PUBLIC_OPENAI_API_KEY) est introuvable.");
  }

  // Formatting messages for OpenAI
  const formattedMessages: OpenAI_Message[] = [
    { role: 'system', content: systemPrompt },
    ...messages.map(m => ({
      role: (m.role === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
      content: m.content
    }))
  ];

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: model,
        messages: formattedMessages,
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('OpenAI API Error:', errorData);
      throw new Error(errorData.error?.message || "Erreur lors de l'appel à OpenAI");
    }

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.error('Failed to fetch from OpenAI:', error);
    throw error;
  }
}
