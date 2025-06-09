// scripts/cron.ts

import { db } from '../src/db/client';
import { TwitterApi } from 'twitter-api-v2';
import { generatePostsForTheme } from '../src/posts/generate';
import { generateThemeForToday } from '../src/themes/generator';
import type { SupabaseClient } from '@supabase/supabase-js';

// Interfaces for Supabase tables
interface Theme {
  id: string;
  name: string;
  used: boolean;
  start_date: string | null;
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

// Find the next theme with unposted posts
async function getNextThemeToPost(db: SupabaseClient): Promise<Theme | null> {
  const { data: themes, error } = await db
    .from('themes')
    .select('*')
    .order('start_date', { ascending: true });

  if (error) {
    console.error('Failed to fetch themes:', error);
    return null;
  }

  for (const theme of themes) {
    const { data: posts, error: postsError } = await db
      .from('posts')
      .select('*')
      .eq('theme', theme.name);

    if (postsError) {
      console.error(`Failed to fetch posts for theme "${theme.name}":`, postsError);
      continue;
    }

    const unposted = posts.filter(p => !p.posted_at);
    if (unposted.length > 0) {
      return theme;
    }
  }

  return null;
}

async function runScheduledJob() {
  try {
    console.log('--- Starting Scheduled Job ---');
    console.log('Supabase Client initialized.');
    console.log('Twitter Client initialized.');

    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    let currentTheme = await generateThemeForToday(db, today);
    console.log(`Using theme: "${currentTheme.name}" (ID: ${currentTheme.id})`);

    // Get or generate posts for the current theme
    let posts = await generatePostsForTheme(db, currentTheme);

    let nextThemePost = posts.find(p => !p.posted_at);

    // If all posts for current theme are used, rotate to next theme
    if (!nextThemePost) {
      console.log(`All posts for theme "${currentTheme.name}" have been posted. Trying to rotate to next theme...`);
      const nextTheme = await getNextThemeToPost(db);
      if (!nextTheme) {
        console.warn('No available theme found with unposted content. Exiting.');
        return;
      }

      console.log(`Rotated to theme: "${nextTheme.name}" (ID: ${nextTheme.id})`);
      posts = await generatePostsForTheme(db, nextTheme);
      nextThemePost = posts.find(p => !p.posted_at);

      if (!nextThemePost) {
        console.warn(`Still no unposted content available after rotation. Exiting.`);
        return;
      }
    }

    const postToTweet = nextThemePost;

    if (!postToTweet.text) {
      throw new Error('No valid post content available to tweet.');
    }

    console.log('Attempting to post tweet...');
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

// Run the scheduled job
runScheduledJob();







