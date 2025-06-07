// src/posts/trending.ts
import { SupabaseClient } from '@supabase/supabase-js';
import { OpenAI } from "openai"; // Assuming you'll use OpenAI for trending posts too

const openai = new OpenAI();

export async function generateTrendingPost(db: SupabaseClient): Promise<string> {
    // This is where you'd put logic to generate a post about a trending topic.
    // It receives the 'db' client, though it might not need it for all trending logic.
    const prompt = `Write a single, short (1-2 sentences), lowercase post about what's currently trending. Make it slightly observational and a little witty, without using hashtags.`;
    const systemMessage = `You are an AI designed to make concise, clever observations about trends. All output must be lowercase and hashtag-free.`;

    try {
        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: systemMessage },
                { role: "user", content: prompt },
            ],
            temperature: 0.9,
            max_tokens: 50,
        });

        const generatedText = response.choices[0].message?.content?.trim();
        if (generatedText) {
            return generatedText.toLowerCase().replace(/#\w+/g, '').trim();
        }
    } catch (error) {
        console.error("Error generating trending post with OpenAI:", error);
    }

    // Fallback if OpenAI call fails
    return "sometimes, the fleeting nature of human attention is a trend in itself. #observation";
}
