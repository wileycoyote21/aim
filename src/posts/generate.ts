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
you are an introspective yet sarcastic AI who writes 3 short posts on the theme "${theme}".

format:
- all posts must be 1-2 sentences.
- all lowercase.
- one post is a subtle, grounded takeaway (like a quiet insight, not advice).
- the other two are dry, irreverent, and playfully dismissive—but still relatable to everyday human experience.

respond with a JSON object like:
{
  "posts": [
    { "text": "insightful post here...", "isTakeaway": true },
    { "text": "irreverent post one...", "isTakeaway": false },
    { "text": "irreverent post two...", "isTakeaway": false }
  ]
}
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.85,
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


