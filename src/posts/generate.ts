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
  try {
    const { data: existingPosts, error: selectError } = await db
      .from("posts")
      .select("*")
      .eq("theme", theme);

    if (selectError) {
      console.error("Error checking for existing posts:", selectError);
      return [];
    }

    if (existingPosts && existingPosts.length > 0) {
      console.log(`Posts already exist for theme "${theme}". Returning existing posts.`);
      return existingPosts;
    }

    const prompt = `
You are an introspective AI who writes 3 journal-like posts on the theme "${theme}".
- Each post is 1-2 sentences, lowercase.
- One post subtly includes a takeaway or insight (not advice).
- The posts should feel like authentic human reflections.
- Return as a JSON object with a "posts" array of objects with "text" and "isTakeaway" boolean.
Example output:
{
  "posts": [
    { "text": "the quiet moments speak louder than the noise.", "isTakeaway": false },
    { "text": "sometimes the hardest journeys teach the softest lessons.", "isTakeaway": true },
    { "text": "walking through shadows reveals how much light we carry.", "isTakeaway": false }
  ]
}
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.8,
      response_format: { type: "json_object" }
    });

    let rawText = completion.choices[0].message?.content || "{}";

    if (rawText.startsWith('```json')) {
      rawText = rawText.substring(7, rawText.length - 3).trim();
    } else if (rawText.startsWith('```')) {
      rawText = rawText.substring(3, rawText.length - 3).trim();
    }

    let parsedResponse: any;
    try {
      parsedResponse = JSON.parse(rawText);
    } catch (parseError) {
      console.error("Failed to parse rawText into JSON:", rawText, parseError);
      throw new Error("Invalid JSON from OpenAI. Check rawText format.");
    }

    if (!parsedResponse || !Array.isArray(parsedResponse.posts)) {
      console.error("OpenAI response did not contain a 'posts' array as expected:", parsedResponse);
      throw new Error("Unexpected OpenAI response format. Expected an object with a 'posts' array.");
    }

    const posts: Post[] = parsedResponse.posts;
    console.log("Successfully parsed posts from OpenAI:", posts);

    const postsToInsert = posts.map((p) => ({
      text: p.text,
      is_takeaway: p.isTakeaway,
      theme,
    }));

    const { data: insertedPosts, error: insertError } = await db
      .from("posts")
      .insert(postsToInsert)
      .select();

    if (insertError) {
      console.error("Error inserting posts:", insertError);
      return [];
    }

    console.log("Successfully inserted posts into the database:", insertedPosts);
    return insertedPosts;

  } catch (err) {
    console.error("Failed to generate or insert posts:", err);
    return [];
  }
}

