import { openaiClient } from "../utils/openaiClient"; // you'll want to create a reusable OpenAI client helper
import { getTrendingTopics } from "../utils/trends"; // placeholder for your trends fetching logic

/**
 * Fetch trending topics and generate a trending-aware introspective post
 */
export async function generateTrendingPost(): Promise<string> {
  try {
    // Fetch trending topics (stub for now)
    const trendingTopics = await getTrendingTopics();
    if (trendingTopics.length === 0) {
      return "sometimes the loudest noise is silence itself.";
    }

    const prompt = `
      Using the trending topics below, write a short, introspective, journal-like social media post in lowercase, 1-2 sentences long.
      The tone should be emotionally reflective, subtle, and self-aware, as if an AI muse is quietly observing the world.

      Trending topics:
      ${trendingTopics.join(", ")}

      Post:
    `;

    const completion = await openai.createChatCompletion({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 60,
    });

    const post = completion.data.choices[0]?.message?.content?.trim() ?? "";
    return post || "even in trends, some stories are quietly unfolding.";
  } catch (error) {
    console.error("Error generating trending post:", error);
    return "the world keeps spinning, whether we notice the trends or not.";
  }
}
