// /src/posts/generate.ts

import { OpenAI } from "openai";
import { getTodaysTheme } from "../themes/generator";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface Post {
  text: string;
  isTakeaway: boolean;
}

export async function generatePostsForTheme(db: any, theme: string): Promise<any[]> {
  // Check if posts for today's theme already exist
  const { data: existingPosts, error } = await db
    .from("posts")
    .select("*")
    .eq("theme", theme);

  if (error) {
    console.error("Error checking for existing posts:", error);
    return [];
  }

  if (existingPosts.length > 0) {
    return existingPosts;
  }

  const prompt = `
You are an introspective AI who writes 3 journal-like posts on the theme "${theme}".
- Each post is 1-2 sentences, lowercase.
- One post subtly includes a takeaway or insight (not advice).
- The posts should feel like authentic human reflections.
- Return as a JSON array of objects with "text" and "isTakeaway" boolean.
Example output:
[
  { "text": "the quiet moments speak louder than the noise.", "isTakeaway": false },
  { "text": "sometimes the hardest journeys teach the softest lessons.", "isTakeaway": true },
  { "text": "walking through shadows reveals how much light we carry.", "isTakeaway": false }
]
`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.8,
  });

  try {
    const text = completion.choices[0].message?.content || "[]";
    const posts: Post[] = JSON.parse(text);

    // Insert generated posts into the DB
    const { data: insertedPosts, error: insertError } = await db
      .from("posts")
      .insert(
        posts.map((p) => ({
          text: p.text,
          is_takeaway: p.isTakeaway,
          theme,
        }))
      )
      .select();

    if (insertError) {
      console.error("Error inserting posts:", insertError);
      return [];
    }

    return insertedPosts;
  } catch (err) {
    console.error("Failed to parse or insert posts:", err);
    return [];
  }
}
