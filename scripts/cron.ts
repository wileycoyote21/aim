// cron.ts

import 'dotenv/config'; // ⬅️ This ensures environment variables load locally and on GitHub Actions

import { supabase } from '../src/db/client';
import { generateThemeForToday } from '../src/themes/generator';
import { generatePostsForTheme } from '../src/posts/generate';
import { analyzeSentiment } from '../src/sentiment/analyze';
import { postTweet } from '../src/twitter/post';
import { getTodayTimestamp } from '../src/utils/timestamp';
import { generateTrendingPost } from '../src/posts/trending'; // Assuming this function exists and returns string

// Define a type for the theme object expected from generateThemeForToday
interface Theme {
  id: number; // Assuming ID is a number (Supabase primary key integer)
  name: string; // The actual theme string like "fear"
}

// Define a type for a single post object
interface Post {
    id: number; // Assuming ID is a number
    text: string;
    posted_at: string | null; // Null if not yet posted, ISO string if posted
    // Add other properties that a post might have if needed for logic here
}

// Define a more specific type for Twitter API responses
interface TwitterApiResponse {
    data?: {
        id: string; // Tweet ID from Twitter
        text: string;
    };
    errors?: Array<{
        message: string;
        code?: number;
        data?: any; // For the detailed error object from Twitter API
    }>;
}


const db = supabase;

async function run() {
  try {
    const today = getTodayTimestamp();

    // 1. Get or generate today's theme
    // generateThemeForToday now returns { id: number, name: string }
    const theme: Theme = await generateThemeForToday(db, today);
    console.log(`Using theme: "${theme.name}" (ID: ${theme.id})`);

    // 2. Generate posts for the theme if they don't already exist in DB
    const posts: Post[] = await generatePostsForTheme(db, theme); // Ensure generatePostsForTheme expects Theme object
    console.log(`Found/Generated ${posts.length} posts for theme "${theme.name}".`);

    // 3. Select the next unposted message (from the theme-specific posts)
    const nextThemePost = posts.find(p => !p.posted_at);

    // 4. Get the total count of all posts (including previously posted trending ones)
    const { count: totalPostedCount, error: countError } = await db
      .from('posts')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      throw new Error(`Failed to get total post count: ${countError.message}`);
    }

    const totalPosted = totalPostedCount || 0;
    console.log(`Total posts historically sent (from DB count): ${totalPosted}`);

    let finalPostId: number; // This will be the ID of the post record that gets updated
    let finalTweetText: string; // This will be the actual text sent to Twitter

    // 5. Decide whether to generate a trending-aware post or use a regular theme post
    if ((totalPosted + 1) % 5 === 0) { // Check if it's time for a trending post
      console.log('It is time for a trending-aware post. Generating...');
      const trendingText = await generateTrendingPost(); // Generate the trending post text

      // --- CRUCIAL: Check if this trending post text already exists in your DB ---
      const { data: existingTrendingPosts, error: fetchExistingError } = await db
        .from('posts')
        .select('id, text')
        .eq('text', trendingText); // Simple exact match for now; consider normalization if needed

      if (fetchExistingError) {
        throw new Error(`Failed to check for existing trending posts in DB: ${fetchExistingError.message}`);
      }

      if (existingTrendingPosts && existingTrendingPosts.length > 0) {
        console.warn(`WARNING: Generated trending post "${trendingText}" already exists in the database. Skipping tweet to avoid Twitter API duplicate error.`);
        return; // Exit if duplicate found
      }

      // If unique, save the trending post to the database first
      const { data: newPostData, error: insertError } = await db
        .from('posts')
        .insert({
          theme_id: theme.id, // Associate with the current theme ID
          text: trendingText,
          created_at: new Date().toISOString(), // Timestamp for creation
          // Consider adding a 'type' column (e.g., 'theme', 'trending') here for better classification
        })
        .select('id') // Select the ID of the newly inserted row
        .single(); // Expecting one row to be returned

      if (insertError) {
        throw new Error(`Failed to save new trending post to DB: ${insertError.message}`);
      }

      finalPostId = newPostData.id;
      finalTweetText = trendingText;
      console.log(`Saved new trending post to DB with ID: ${finalPostId}`);

    } else {
      // If not a trending post, ensure there's a next unposted theme post
      if (!nextThemePost) {
        console.log('All regular theme posts already published for today and not time for a trending post.');
        return;
      }
      finalPostId = nextThemePost.id;
      finalTweetText = nextThemePost.text;
      console.log(`Using next regular theme post (ID: ${finalPostId}).`);
    }

    // --- Prepare and send tweet ---
    console.log('\n--- Attempting to post tweet ---');
    console.log('Tweet content:');
    console.log('>>> TWEET TEXT START <<<');
    console.log(finalTweetText);
    console.log('>>> TWEET TEXT END <<<');
    console.log(`Tweet text length: ${finalTweetText.length} characters.`);

    // Type assertion for tweetResponse to help TypeScript understand its structure
    const tweetResponse: TwitterApiResponse = await postTweet(finalTweetText);

    // --- Twitter API Response Handling ---
    if (tweetResponse.errors && tweetResponse.errors.length > 0) {
      const twitterErrorMessages = tweetResponse.errors.map(e => e.message).join(', ');
      // Log the specific Twitter API error data for debugging
      if (tweetResponse.errors[0]?.data) {
        console.error('Twitter API Error Data:', JSON.stringify(tweetResponse.errors[0].data, null, 2));
      }
      throw new Error(`Twitter post error: ${twitterErrorMessages}`);
    }

    // Ensure data and id exist before proceeding
    const tweetId = tweetResponse.data?.id;

    if (!tweetId) {
      throw new Error('No tweet ID returned from Twitter API after successful post (data.id missing).');
    }

    console.log(`Successfully posted to Twitter. Tweet ID: ${tweetId}`);

    // 6. Log sentiment and mark the specific post as posted in the database
    // analyzeSentiment now accepts number for postId
    await analyzeSentiment(db, finalPostId, finalTweetText, tweetId);
    console.log(`Sentiment analyzed and logged for post ID: ${finalPostId}`);

    await db
      .from('posts')
      .update({ posted_at: new Date().toISOString() }) // Mark the specific post record as posted
      .eq('id', finalPostId); // Use the finalPostId which corresponds to the actual tweet sent
    console.log(`Post ID ${finalPostId} marked as posted in database.`);

  } catch (err) {
    console.error('\n--- Error in scheduled run ---');
    console.error('Error message:', err instanceof Error ? err.message : JSON.stringify(err));
    if (err instanceof Error && err.stack) {
      console.error('Stack trace:', err.stack);
    }
    console.error('--- End Error ---');
  }
}

// Execute the run function
run();





