// src/posts/generate.ts

import type { SupabaseClient } from "@supabase/supabase-js";
import { OpenAI } from "openai";

const openai = new OpenAI();

interface Theme {
  id: number;
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

  // Helper to clean hashtags and append #aiart
  const cleanAndAppendHashtag = (text: string) => {
    // Remove any hashtags the AI might have added
    const cleaned = text.toLowerCase().replace(/#\w+/g, "").trim();
    return `${cleaned} #aiart`;
  };

  // Insightful post prompt
  const insightfulPrompt = `Write a single post (1-2 sentences) in lowercase, no hashtags. It should be self-reflective, introspective, insightful, and relatable, inspired by the theme "${themeName}".`;
  const insightfulSystemMessage = `You are an AI muse, designed to generate thoughtful, concise, poetic reflections on human emotions and concepts. Output must be lowercase and contain no hashtags.`;

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
      const finalText = cleanAndAppendHashtag(generatedText);
      generatedPosts.push(finalText);
      console.log(`Generated Insightful Post: "${finalText}"`);
    } else {
      console.warn(`OpenAI did not return insightful content for theme "${themeName}".`);
    }
  } catch (error) {
    console.error(`Error generating insightful post for theme "${themeName}":`, error);
  }

  // Snarky posts prompt
  const snarkyPrompt = `Write a single post (1-2 sentences) in lowercase, no hashtags. It should be dry, playful, slightly dismissive, and snarky, related to the theme "${themeName}".`;
  const snarkySystemMessage = `You are an AI with dry wit and playful, dismissive humor. Output must be lowercase and contain no hashtags.`;

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
        const finalText = cleanAndAppendHashtag(generatedText);
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



