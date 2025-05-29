// /src/posts/generate.ts

import { getTodaysTheme } from "../themes/generator";
import { OpenAI } from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface Post {
  text: string;
  isTakeaway: boolean;
}

export async function generatePosts(): Promise<Post[]> {
  const theme = getTodaysTheme();

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
    // The model should respond with JSON string, parse it
    const text = completion.choices[0].message?.content || "[]";
    const posts: Post[] = JSON.parse(text);
    return posts;
  } catch (err) {
    console.error("Failed to parse posts JSON:", err);
    return [];
  }
}
