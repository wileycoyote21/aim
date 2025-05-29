import { createClient } from '../db/client';
import { openai } from '../utils/openai'; // You may need to create a wrapper for OpenAI calls
import type { Post } from '../db/schema';

const supabase = createClient();

export interface SentimentResult {
  polarity: string;   // e.g. 'positive', 'neutral', 'negative'
  score: number;      // numeric sentiment score
  summary: string;    // short explanation
}

/**
 * Analyze sentiment of a given post text using OpenAI
 */
export async function analyzeSentiment(post: Post): Promise<SentimentResult | null> {
  try {
    const prompt = `Analyze the sentiment of the following text and respond with polarity (positive, neutral, negative), a score from -1 to 1, and a brief summary:\n\n"${post.content}"`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',  // or your preferred model
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 60,
      temperature: 0,
    });

    const reply = response.choices[0].message?.content;

    // Simple parse - you may want to improve this parsing logic
    // Example expected reply format:
    // Polarity: positive
    // Score: 0.8
    // Summary: The text expresses a positive and hopeful tone.

    if (!reply) return null;

    const polarityMatch = reply.match(/Polarity:\s*(positive|neutral|negative)/i);
    const scoreMatch = reply.match(/Score:\s*(-?0?\.\d+|-?1(\.0+)?)/i);
    const summaryMatch = reply.match(/Summary:\s*(.+)/i);

    const sentiment: SentimentResult = {
      polarity: polarityMatch?.[1].toLowerCase() ?? 'neutral',
      score: scoreMatch ? parseFloat(scoreMatch[1]) : 0,
      summary: summaryMatch?.[1].trim() ?? '',
    };

    // Insert sentiment record into DB
    const { error } = await supabase
      .from('sentiments')
      .insert({
        post_id: post.id,
        polarity: sentiment.polarity,
        score: sentiment.score,
        summary: sentiment.summary,
        created_at: new Date().toISOString(),
      });

    if (error) {
      console.error('Error inserting sentiment:', error);
    }

    return sentiment;
  } catch (error) {
    console.error('Sentiment analysis failed:', error);
    return null;
  }
}
