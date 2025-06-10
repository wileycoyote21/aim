// src/posts/generate.ts

import type { SupabaseClient } from "@supabase/supabase-js";
import { OpenAI } from "openai";

const openai = new OpenAI();

interface Theme {
  id: string; // Updated from number to string
  name: string;
}

interface Post {
  id: string;
  text: string;
  theme: string;
  posted_at: string | null;
  created_at: string;
}

export async function generatePostsForTheme(db: SupabaseClient, theme: Theme): Promise<Post[]> {
  console.log(`Checking for existing posts for theme name: "${theme.name}"`);
  const { data: existingPosts, error: fetchError } = await db
    .from("posts")
    .select("*")
    .eq("theme", theme.name)
    .order("created_at", { ascending: true });

  if (fetchError) {
    console.error("Failed to fetch existing posts:", fetchError);
    throw new Error(`Failed to fetch posts for theme ${theme.name}: ${JSON.stringify(fetchError)}`);
  }

  if (existingPosts && existingPosts.length > 0) {
    console.log(`Posts already exist for theme "${theme.name}". Returning existing posts.`);
    return existingPosts;
  }

  console.log(`No posts found for theme "${theme.name}". Generating new ones with OpenAI...`);

  const generatedPosts: string[] = [];
  const themeName = theme.name;

  // Helper to clean hashtags, limit to 10 words, remove trailing period
  const cleanAndFormatPost = (text: string) => {
    let cleaned = text.toLowerCase().replace(/#\w+/g, "").trim();

    if (cleaned.endsWith(".")) {
      cleaned = cleaned.slice(0, -1);
    }

    const words = cleaned.split(/\s+/);
    return words.slice(0, 10).join(" ");
  };

  const insightfulPrompt = `Write a single post in lowercase, no hashtags, maximum 10 words, do not end with a period. It should be self-reflective, introspective, insightful, and relatable, inspired by the theme "${themeName}".`;
  const insightfulSystemMessage = `You are an AI muse, designed to generate thoughtful, concise, poetic reflections on human emotions and concepts. Output must be lowercase, no hashtags, max 10 words, and no trailing period.`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: insightfulSystemMessage },
        { role: "user", content: insightfulPrompt },
      ],
      temperature: 0.8,
      max_tokens: 50,
    });

    const generatedText = response.choices[0].message?.content?.trim();
    if (generatedText) {
      const finalText = cleanAndFormatPost(generatedText);
      generatedPosts.push(finalText);
      console.log(`Generated Insightful Post: "${finalText}"`);
    } else {
      console.warn(`OpenAI did not return insightful content for theme "${themeName}".`);
    }
  } catch (error) {
    console.error(`Error generating insightful post for theme "${themeName}":`, error);
  }

  const snarkyPrompt = `Write a single post in lowercase, no hashtags, maximum 10 words, do not end with a period. It should be dry, playful, slightly dismissive, and snarky, related to the theme "${themeName}".`;
  const snarkySystemMessage = `You are an AI with dry wit and playful, dismissive humor. Output must be lowercase, no hashtags, max 10 words, and no trailing period.`;

  for (let i = 0; i < 2; i++) {
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: snarkySystemMessage },
          { role: "user", content: snarkyPrompt },
        ],
        temperature: 0.9,
        max_tokens: 50,
      });

      const generatedText = response.choices[0].message?.content?.trim();
      if (generatedText) {
        const finalText = cleanAndFormatPost(generatedText);
        generatedPosts.push(finalText);
        console.log(`Generated Snarky Post ${i + 1}: "${finalText}"`);
      } else {
        console.warn(`OpenAI did not return snarky content for theme "${themeName}" on attempt ${i + 1}.`);
      }
    } catch (error) {
      console.error(`Error generating snarky post ${i + 1} for theme "${themeName}":`, error);
    }
  }

  if (generatedPosts.length === 0) {
    throw new Error(`Failed to generate any posts for theme "${themeName}".`);
  }

  const postsToInsert = generatedPosts.map((text) => ({
    theme: themeName,
    text,
    created_at: new Date().toISOString(),
    posted_at: null,
  }));

  const { data: insertedPosts, error: insertError } = await db
    .from("posts")
    .insert(postsToInsert)
    .select("*");

  if (insertError) {
    console.error("Failed to insert new posts:", insertError);
    throw new Error(`Failed to insert posts for theme ${themeName}: ${JSON.stringify(insertError)}`);
  }

  console.log(`Generated and inserted ${insertedPosts?.length || 0} new posts for theme "${themeName}".`);
  return insertedPosts || [];
}








