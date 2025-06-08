// scripts/cron.ts

import { db } from '../src/db/client'; // Your Supabase client setup
import { TwitterApi } from 'twitter-api-v2'; // NEW IMPORT: twitter-api-v2
import { generatePostsForTheme } from '../src/posts/generate';
import { generateTrendingPost } from '../src/posts/trending'; // This file needs to exist and export this function!
import { generateThemeForToday } from '../src/themes/generator';

// Ensure these interfaces match your Supabase table structures consistently across your project
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

// Initialize Twitter Client with OAuth 1.0a credentials using twitter-api-v2
const twitterClient = new TwitterApi({
  appKey: process.env.TWITTER_API_KEY as string,            // consumer_key is now appKey
  appSecret: process.env.TWITTER_API_SECRET as string,      // consumer_secret is now appSecret
  accessToken: process.env.TWITTER_ACCESS_TOKEN as string,
  accessSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET as string, // access_token_secret is now accessSecret
});


// Main function to run the scheduled job
async function runScheduledJob() {
  try {
    console.log('--- Starting Scheduled Job ---');
    console.log('Supabase Client initialized.');
    console.log('Twitter Client initialized.');

    // 1. Get or generate today's theme
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    const currentTheme = await generateThemeForToday(db, today);
    console.log(`Using theme: "${currentTheme.name}" (ID: ${currentTheme.id})`);

    // 2. Generate/fetch posts for the current theme
    const posts = await generatePostsForTheme(db, currentTheme);

    // 3. Determine if it's time for a "trending" post or a regular theme post
    const { count: totalPosted, error: countError } = await db
      .from('posts')
      .select('*', { count: 'exact' })
      .not('posted_at', 'is', null);

    if (countError) {
      console.error('Error counting total posted tweets:', countError);
      throw new Error(`Failed to count total posted tweets: ${JSON.stringify(countError)}`);
    }

    console.log(`Total tweets posted across all themes: ${totalPosted}`);

    let postToTweet: Post | null = null;
    let isTrendingPost = false;

    // Logic for a special "trending post" every 5th tweet
    if ((totalPosted || 0) % 5 === 0 && (totalPosted || 0) !== 0) {
      console.log('It\'s time for a special trending post!');
      const trendingText = await generateTrendingPost(db);
      if (trendingText) {
          postToTweet = {
              id: Date.now().toString(),
              text: trendingText,
              theme: 'trending',
              created_at: new Date().toISOString(),
              posted_at: null
          };
          isTrendingPost = true;
      }
    }

    if (!postToTweet) {
      const nextThemePost = posts.find(p => !p.posted_at);

      if (!nextThemePost) {
        console.warn(`All posts for theme "${currentTheme.name}" have been posted. This run might not tweet.`);
        console.warn('Next run will likely generate new posts for this theme if `generatePostsForTheme` is designed for it.');
        throw new Error(`No unposted messages found for theme "${currentTheme.name}". Cannot tweet today.`);
      }
      postToTweet = nextThemePost;
      console.log(`Using next regular theme post (ID: ${postToTweet.id}).`);
    }

    if (!postToTweet || !postToTweet.text) {
      throw new Error('No valid post content available to tweet.');
    }

    // 4. Post the tweet to Twitter
    console.log('Attempting to post tweet...');
    console.log('Tweet content:');
    console.log('>>> TWEET TEXT START <<<');
    console.log(postToTweet.text);
    console.log('>>> TWEET TEXT END <<<');

    await postTweetToTwitter(postToTweet.text); // Call the helper function

    console.log('Tweet posted successfully!');

    // 5. Update the post's status in Supabase (only for regular theme posts)
    if (!isTrendingPost) {
      const { error: updateError } = await db
        .from('posts')
        .update({ posted_at: new Date().toISOString() })
        .eq('id', postToTweet.id);

      if (updateError) {
        console.error('Failed to update post status in Supabase:', updateError);
        throw new Error(`Failed to update post ID ${postToTweet.id}: ${JSON.stringify(updateError)}`);
      }
      console.log(`Post ID ${postToTweet.id} marked as posted in database.`);
    } else {
      console.log('Trending post was tweeted. Not typically stored/updated in the main posts table.');
    }

    console.log('--- Scheduled Job Completed Successfully ---');

  } catch (error: any) {
    console.error('\n--- Error in Scheduled Run ---');
    console.error('Error message:', error.message);
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
    // Twitter API errors often have a 'data' property with more details
    if (error.data && error.data.errors) {
        console.error("Twitter API Error Details:", JSON.stringify(error.data.errors, null, 2));
    } else if (error.message.includes('Twitter API error')) {
        console.error("Consider checking Twitter App dashboard or API response for rate limits/permissions.");
    }
    console.error('--- End Error ---');
    process.exit(1);
  }
}

// Helper function to abstract the Twitter API call
async function postTweetToTwitter(tweetText: string) {
  try {
    if (tweetText.length > 280) {
        console.warn(`Tweet text is too long (${tweetText.length} chars). It might be truncated by Twitter.`);
    }

    // Try v2 API first (free tier supports basic v2 endpoints)
    try {
      const { data } = await twitterClient.v2.tweet(tweetText);
      console.log('Twitter API v2 response:', data);
      return data;
    } catch (v2Error: any) {
      console.log('V2 API failed, trying v1.1:', v2Error.message);
      // If v2 fails, try v1.1 as fallback
      const data = await twitterClient.v1.tweet(tweetText);
      console.log('Twitter API v1.1 response:', data);
      return data;
    }
  } catch (e: any) {
    console.error('Error during Twitter API call in postTweetToTwitter:', e);
    throw e; // Re-throw for main catch block
  }
}

// Execute the main function
runScheduledJob();




