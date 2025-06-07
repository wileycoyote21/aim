// src/posts/generate.ts

import type { SupabaseClient } from "@supabase/supabase-js";
import { OpenAI } from "openai"; // Import OpenAI client

const openai = new OpenAI(); // Initialize OpenAI client here

// Define the Theme interface, as it's now an object passed from cron.ts
interface Theme {
  id: number; // Assuming the ID from your Supabase 'themes' table is a number
  name: string; // The actual theme string (e.g., "fear")
}

// Define the Post interface for consistency and type safety
interface Post {
    id: number; // Assuming the ID from your Supabase 'posts' table is a number
    text: string;
    theme: string; // This column likely stores the theme name directly
    posted_at: string | null; // ISO string if posted, null otherwise
    created_at: string; // ISO string for creation date
    // Add any other properties your 'posts' table rows might have
}

/**
 * Generates posts for a given theme, or returns existing ones if they exist.
 * This function now expects a Theme object as its 'theme' argument.
 */
export async function generatePostsForTheme(db: SupabaseClient, theme: Theme): Promise<Post[]> {
  // 1. Check if posts already exist for this theme (using theme.name)
  console.log(`Checking for existing posts for theme name: "${theme.name}"`);
  const { data: existingPosts, error: fetchError } = await db
    .from("posts")
    .select("*")
    .eq("theme", theme.name) // Filter by the theme's name
    .order('created_at', { ascending: true }); // Order for consistent selection later

  if (fetchError) {
    console.error("Failed to fetch existing posts:", fetchError);
    throw new Error(`Failed to fetch posts for theme ${theme.name}: ${JSON.stringify(fetchError)}`);
  }

  if (existingPosts && existingPosts.length > 0) {
    console.log(`Posts already exist for theme "${theme.name}". Returning existing posts.`);
    return existingPosts;
  }

  // 2. If no posts exist, generate new ones using OpenAI based on the theme.name
  console.log(`No posts found for theme "${theme.name}". Generating new ones with OpenAI...`);

  const generatedPosts: string[] = [];
  const themeName = theme.name; // For easier use in prompts

  // --- Prompt for the single insightful, self-reflective, relatable post ---
  const insightfulPrompt = `Write a single post (1-2 sentences) in lowercase, without hashtags. It should be self-reflective, introspective, insightful, and relatable, focusing on the theme of "${themeName}".`;
  const insightfulSystemMessage = `You are an AI muse, designed to generate thoughtful, concise, and poetic reflections on human emotions and concepts. Your output must be entirely lowercase and free of hashtags.`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: insightfulSystemMessage },
        { role: "user", content: insightfulPrompt },
      ],
      temperature: 0.8, // Slightly higher for more "insightful" creativity
      max_tokens: 50, // Enough for 1-2 concise sentences
    });

    const generatedText = response.choices[0].message?.content?.trim();
    if (generatedText) {
      const cleanedText = generatedText.toLowerCase().replace(/#\w+/g, '').trim();
      generatedPosts.push(cleanedText);
      console.log(`Generated Insightful Post: "${cleanedText}"`);
    } else {
      console.warn(`OpenAI did not return insightful content for theme "${themeName}".`);
    }
  } catch (openAiError) {
    console.error(`Error generating insightful post for theme "${themeName}":`, openAiError);
  }

  // --- Prompts for the two dry, playful, slightly dismissive posts (snarky humor) ---
  const snarkyPrompt = `Write a single post (1-2 sentences) in lowercase, without hashtags. It should be dry, playful, slightly dismissive, and have a touch of snarky humor, related to the theme of "${themeName}".`;
  const snarkySystemMessage = `You are an AI with a dry wit and playful, dismissive humor, observing human concepts. Your output must be entirely lowercase and free of hashtags.`;

  for (let i = 0; i < 2; i++) { // Generate two snarky posts
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: snarkySystemMessage },
          { role: "user", content: snarkyPrompt },
        ],
        temperature: 0.9, // Higher for more distinct humor
        max_tokens: 50, // Enough for 1-2 concise sentences
      });

      const generatedText = response.choices[0].message?.content?.trim();
      if (generatedText) {
        const cleanedText = generatedText.toLowerCase().replace(/#\w+/g, '').trim();
        generatedPosts.push(cleanedText);
        console.log(`Generated Snarky Post ${i + 1}: "${cleanedText}"`);
      } else {
        console.warn(`OpenAI did not return snarky content for theme "${themeName}" on attempt ${i + 1}.`);
      }
    } catch (openAiError) {
      console.error(`Error generating snarky post ${i + 1} for theme "${themeName}":`, openAiError);
    }
  }

  // --- Ensure at least one post was generated ---
  if (generatedPosts.length === 0) {
      throw new Error(`Failed to generate any posts for theme "${themeName}" after all attempts.`);
  }

  const postsToInsert = generatedPosts.map(text => ({
    theme: themeName, // Link the new posts to the theme's name
    text: text,
    created_at: new Date().toISOString(), // Use current timestamp for creation
    posted_at: null, // Initially not posted
    // Add any other default fields your 'posts' table requires (e.g., sentiment_score, tweet_id)
  }));

  const { data: insertedPosts, error: insertError } = await db
    .from("posts")
    .insert(postsToInsert)
    .select('*'); // Select all columns of the newly inserted posts to return them

  if (insertError) {
    console.error("Failed to insert new posts:", insertError);
    throw new Error(`Failed to insert posts for theme ${themeName}: ${JSON.stringify(insertError)}`);
  }

  console.log(`Generated and inserted ${insertedPosts?.length || 0} new posts for theme "${themeName}".`);
  return insertedPosts || [];
}

