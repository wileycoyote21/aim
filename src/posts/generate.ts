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

  const cleanAndFormatPost = (text: string) => {
    let cleaned = text.toLowerCase().replace(/#\w+/g, "").trim();
    if (cleaned.endsWith(".")) {
      cleaned = cleaned.slice(0, -1);
    }
    const words = cleaned.split(/\s+/);
    return words.slice(0, 10).join(" ");
  };

  const insightfulSystemMessage = `
You are an AI muse designed to generate thoughtful, concise, poetic reflections on human emotions and concepts.
Avoid clichés, digital metaphors like "wifi" or "charging", and anything that sounds like a meme.
Output must be lowercase, no hashtags, max 10 words, and no trailing period.
  `.trim();

  const insightfulPrompt = `Write a single post in lowercase, no hashtags, max 10 words, no trailing period. Be self-reflective, poetic, and inspired by "${themeName}".`;

  try {
    let insightfulText: string | undefined;
    for (let i = 0; i < 3; i++) {
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: insightfulSystemMessage },
          { role: "user", content: insightfulPrompt },
        ],
        temperature: 0.8,
        max_tokens: 50,
      });

      const raw = response.choices[0].message?.content?.trim();
      if (raw && !isCorny(raw)) {
        insightfulText = cleanAndFormatPost(raw);
        console.log(`Generated Insightful Post: "${insightfulText}"`);
        generatedPosts.push(insightfulText);
        break;
      }
    }
  } catch (error) {
    console.error(`Error generating insightful post for theme "${themeName}":`, error);
  }

  const snarkySystemMessage = `
You are an AI muse with dry wit and playful, dismissive humor.
Avoid internet clichés like "wifi", "buffering", "charging", "email", or meme-speak.
Be unexpected, smart, and original.
Output must be lowercase, no hashtags, max 10 words, and no trailing period.
  `.trim();

  const snarkyPrompt = `Write a single post in lowercase, no hashtags, max 10 words, no trailing period. Be dry, playful, dismissive, and inspired by "${themeName}".`;

  for (let i = 0; i < 2; i++) {
    try {
      for (let attempt = 0; attempt < 3; attempt++) {
        const response = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: snarkySystemMessage },
            { role: "user", content: snarkyPrompt },
          ],
          temperature: 0.9,
          max_tokens: 50,
        });

        const raw = response.choices[0].message?.content?.trim();
        if (raw && !isCorny(raw)) {
          const finalText = cleanAndFormatPost(raw);
          generatedPosts.push(finalText);
          console.log(`Generated Snarky Post ${i + 1}: "${finalText}"`);
          break;
        }
      }
    } catch (error) {
      console.error(`Error generating snarky post ${i + 1} for theme "${themeName}":`, error);
    }
  }

  if (generatedPosts.length === 0) {
    throw new Error(`Failed to generate any posts for theme "${themeName}".`);
  }

  // Add posted: false here to satisfy NOT NULL constraint
  const postsToInsert = generatedPosts.map((text) => ({
    theme: themeName,
    text,
    created_at: new Date().toISOString(),
    posted_at: null,
    posted: false,
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










