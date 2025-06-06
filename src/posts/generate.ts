// /src/posts/generate.ts

import { OpenAI } from "openai";
// Note: getTodaysTheme is imported but not used directly in this file's main function.
// It's typically used in cron.ts. Keeping it here just in case, but you might remove if unused.
import { getTodaysTheme } from "../themes/generator"; 

// Initialize OpenAI client (using a global/shared instance from utils/openaiClient is also common)
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Interface to define the structure of a Post object
interface Post {
  text: string;
  isTakeaway: boolean;
}

/**
 * Generates posts for a given theme, or retrieves existing ones from the database.
 * @param db The Supabase client instance.
 * @param theme The theme for which to generate posts.
 * @returns An array of generated or existing posts.
 */
export async function generatePostsForTheme(db: any, theme: string): Promise<any[]> {
  try {
    // 1. Check if posts for today's theme already exist in the database
    const { data: existingPosts, error: selectError } = await db
      .from("posts")
      .select("*")
      .eq("theme", theme); // Assuming 'theme' is a column in your 'posts' table

    if (selectError) {
      console.error("Error checking for existing posts:", selectError);
      return []; // Return empty array on error
    }

    // If posts already exist for this theme, return them to avoid regenerating
    if (existingPosts && existingPosts.length > 0) {
      console.log(`Posts already exist for theme "${theme}". Returning existing posts.`);
      return existingPosts;
    }

    // 2. Define the prompt for the OpenAI API to generate posts
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

    // 3. Call the OpenAI API to get the completion
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini", // Using gpt-4o-mini as per your previous choice
      messages: [{ role: "user", content: prompt }],
      temperature: 0.8, // Controls randomness of output
      response_format: { type: "json_object" } // Explicitly request JSON object
    });

    // 4. Extract content and clean it from potential Markdown wrappers
    let rawText = completion.choices[0].message?.content || "[]";

    // Clean the string: remove markdown code block delimiters if present
    // This is crucial for handling OpenAI's tendency to wrap JSON in ```json...```
    if (rawText.startsWith('```json')) {
      rawText = rawText.substring(7, rawText.length - 3).trim(); // Remove '```json' and '```'
    } else if (rawText.startsWith('```')) { // Handle generic code blocks as well
      rawText = rawText.substring(3, rawText.length - 3).trim(); // Remove '```' from both ends
    }

    // 5. Parse the cleaned string into a JSON array of Post objects
    const posts: Post[] = JSON.parse(rawText);
    console.log("Successfully parsed posts from OpenAI:", posts);

    // 6. Map the generated posts to the database schema (isTakeaway -> is_takeaway)
    const postsToInsert = posts.map((p) => ({
      text: p.text,
      is_takeaway: p.isTakeaway, // Map isTakeaway from interface to is_takeaway for DB
      theme, // Include the theme
      // Add other required columns like 'created_at', 'posted_at', 'sentiment_score', 'tweet_id'
      // if they are NOT NULL and don't have default values in your Supabase 'posts' table.
      // For 'posted_at', it should initially be null.
      // For 'created_at', it usually has a 'now()' default in Supabase.
      // For 'sentiment_score' and 'tweet_id', they should be nullable/have defaults if not available at creation.
    }));

    // 7. Insert generated posts into the database
    const { data: insertedPosts, error: insertError } = await db
      .from("posts")
      .insert(postsToInsert)
      .select(); // Use .select() to return the inserted data

    if (insertError) {
      console.error("Error inserting posts:", insertError);
      // If there's an insert error, it might be due to missing columns or wrong data types.
      // Check your 'posts' table schema carefully against what you're inserting.
      return [];
    }

    console.log("Successfully inserted posts into the database:", insertedPosts);
    return insertedPosts; // Return the posts that were actually inserted
  } catch (err) {
    console.error("Failed to parse or insert posts:", err);
    // Re-throw or handle the error appropriately if it's critical.
    // For now, returning an empty array.
    return [];
  }
}
