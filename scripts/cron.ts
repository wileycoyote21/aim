// scripts/cron.ts

import { db } from '../src/db/client'; // Your Supabase client setup
import { TwitterApi } from 'twitter-api-v2';
import { generatePostsForTheme } from '../src/posts/generate';

// Interfaces for Supabase tables
interface Theme {
  id: number;
  name: string;
  used?: boolean;
}

interface Post {
  id: string;
  text: string;
  theme: string;
  posted_at: string | null;
  created_at: string;
}

// Initialize Twitter Client
const twitterClient = new TwitterApi({
  appKey: process.env.TWITTER_API_KEY as string,
  appSecret: process.env.TWITTER_API_SECRET as string,
  accessToken: process.env.TWITTER_ACCESS_TOKEN as string,
  accessSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET as string,
});

async function runScheduledJob() {
  try {
    console.log('--- Starting Scheduled Job ---');
    console.log('Supabase Client initialized.');
    console.log('Twitter Client initialized.');

    const currentTheme = await getNextThemeToPost(db);
    if (!currentTheme) {
      console.warn('No valid themes with unposted posts found. Exiting...');
      return;
    }

    console.log(`Using theme: "${currentTheme.name}" (ID: ${currentTheme.id})`);

    // Fetch posts for current theme
    let posts = await generatePostsForTheme(db, currentTheme);

    if (!posts || posts.length === 0) {
      console.log(`No posts found for theme "${currentTheme.name}". Generating 3 new posts...`);
      posts = await generatePostsForTheme(db, currentTheme);
      console.log(`Generated ${posts.length} posts for theme "${currentTheme.name}".`);
    }

    // Pick the next unposted post
    const nextThemePost = posts.find(p => !p.posted_at);
    if (!nextThemePost) {
      console.warn(`All posts for theme "${currentTheme.name}" have been posted.`);

      // Optionally mark the theme as used
      await db.from("themes").update({ used: true }).eq("id", currentTheme.id);
      return;
    }

    const postToTweet = nextThemePost;
    console.log(`Using next regular theme post (ID: ${postToTweet.id}).`);

    if (!postToTweet.text) {
      throw new Error('No valid post content available to tweet.');
    }

    console.log('Attempting to post tweet...');
    console.log('Tweet content:');
    console.log('>>> TWEET TEXT START <<<');
    console.log(postToTweet.text);
    console.log('>>> TWEET TEXT END <<<');

    await postTweetToTwitter(postToTweet.text);

    console.log('Tweet posted successfully!');

    // Mark post as posted in DB
    const { error: updateError } = await db
      .from('posts')
      .update({ posted_at: new Date().toISOString() })
      .eq('id', postToTweet.id);

    if (updateError) {
      console.error('Failed to update post status in Supabase:', updateError);
      throw new Error(`Failed to update post ID ${postToTweet.id}: ${JSON.stringify(updateError)}`);
    }
    console.log(`Post ID ${postToTweet.id} marked as posted in database.`);

    console.log('--- Scheduled Job Completed Successfully ---');

  } catch (error: any) {
    console.error('\n--- Error in Scheduled Run ---');
    console.error('Error message:', error.message);
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
    console.error('--- End Error ---');
    process.exit(1);
  }
}

async function postTweetToTwitter(tweetText: string) {
  try {
    if (tweetText.length > 280) {
      console.warn(`Tweet text is too long (${tweetText.length} chars). It might be truncated.`);
    }
    try {
      const { data } = await twitterClient.v2.tweet(tweetText);
      console.log('Twitter API v2 response:', data);
      return data;
    } catch (v2Error: any) {
      console.log('V2 API failed, trying v1.1:', v2Error.message);
      const data = await twitterClient.v1.tweet(tweetText);
      console.log('Twitter API v1.1 response:', data);
      return data;
    }
  } catch (e: any) {
    console.error('Error during Twitter API call:', e);
    throw e;
  }
}

async function getNextThemeToPost(db: typeof import('@supabase/supabase-js').SupabaseClient): Promise<Theme | null> {
  const { data: themes, error } = await db
    .from("themes")
    .select("*")
    .order("start_date", { ascending: true });

  if (error || !themes) {
    console.error("Failed to fetch themes:", error);
    return null;
  }

  for (const theme of themes) {
    const { data: posts, error: postError } = await db
      .from("posts")
      .select("*")
      .eq("theme", theme.name);

    if (postError) {
      console.error(`Error checking posts for theme ${theme.name}:`, postError);
      continue;
    }

    const unposted = posts?.filter(p => !p.posted_at);

    if (unposted && unposted.length > 0) {
      return theme; // ✅ Found theme with remaining posts
    }

    // Optional: mark theme as used if all posts have been tweeted
    await db.from("themes").update({ used: true }).eq("id", theme.id);
  }

  return null;
}

// Run the scheduled job
runScheduledJob();






