// /src/sentiment/analyze.ts

import { OpenAI } from "openai";
import type { SupabaseClient } from "@supabase/supabase-js";

const openai = new OpenAI();

interface SentimentResult {
  score: number; // e.g., -1 to +1
  label: string; // e.g., 'positive', 'neutral', 'negative'
}

async function analyzeTextSentiment(text: string): Promise<SentimentResult> {
  // Basic example using OpenAI text classification for sentiment
  // Adjust prompt & model to your preference and usage limits
  const prompt = `Classify the sentiment of this text as positive, neutral, or negative.\nText: """${text}"""`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: "You are a sentiment analysis assistant." },
      { role: "user", content: prompt },
    ],
    temperature: 0,
    max_tokens: 10,
  });

  const reply = response.choices[0].message?.content?.toLowerCase() ?? "";

  let label: SentimentResult["label"] = "neutral";
  let score: SentimentResult["score"] = 0;

  if (reply.includes("positive")) {
    label = "positive";
    score = 1;
  } else if (reply.includes("negative")) {
    label = "negative";
    score = -1;
  }

  return { score, label };
}

export async function analyzeSentiment(
  db: SupabaseClient,
  postId: string,
  text: string,
  tweetId: string
) {
  try {
    const sentiment = await analyzeTextSentiment(text);

    const { error } = await db
      .from("posts")
      .update({
        sentiment_score: sentiment.score,
        sentiment_label: sentiment.label,
        posted_at: new Date().toISOString(),
        tweet_id: tweetId,
      })
      .eq("id", postId);

    if (error) {
      throw new Error(`Failed to update post: ${error.message}`);
    }
  } catch (err) {
    console.error("Error in analyzeSentiment:", err);
    throw err;
  }
}


