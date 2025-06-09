// scripts/cron.ts

import { db } from '../src/db/client';
import { TwitterApi } from 'twitter-api-v2';
import { generatePostsForTheme } from '../src/posts/generate';
import { generateThemeForToday, ThemeResult } from '../src/themes/generator';

interface Post {
  id: string;
  text: string;
  theme: string;
  posted_at: string | null;
  created_at: string;
}

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

    const today = new Date().toISOString().split('T')[0];
    const currentTheme: ThemeResult = await generateThemeForToday(db, today);

    console.log(`Using theme: "${currentTheme.name}" (ID: ${currentTheme.id})`);

    let posts = await generatePostsForTheme(db, currentTheme);

    if (!posts || posts.length === 0) {
      console.log(`No posts found for theme "${currentTheme.name}". Generating posts...`);
      posts = await generatePostsForTheme(db, currentTheme);
    }

    const nextPost = posts.find(p => !p.posted_at);

    if (!nextPost) {
      console.warn(`All posts for theme "${currentTheme.name}" have been posted. No tweet this run.`);
      return;
    }

    console.log(`Posting tweet with Post ID: ${nextPost.id}`);
    console.log('>>>');
    console.log(nextPost.text);
    console.log('<<<');

    await postTweetToTwitter(nextPost.text);
    console.log('Tweet posted successfully!');

    const { error: updateError } = await db
      .from('posts')
      .update({ posted_at: new Date().toISOString() })
      .eq('id', nextPost.id);

    if (updateError) {
      console.error('Failed to update post status:', updateError);
      throw new Error(`Failed to update post: ${JSON.stringify(updateError)}`);
    }

    console.log(`Post ID ${nextPost.id} marked as posted.`);
    console.log('--- Scheduled Job Completed Successfully ---');

  } catch (error: any) {
    console.error('\n--- Error in Scheduled Job ---');
    console.error('Error message:', error.message);
    if (error.stack) console.error('Stack trace:', error.stack);
    console.error('--- End Error ---');
    process.exit(1);
  }
}

async function postTweetToTwitter(text: string) {
  try {
    if (text.length > 280) {
      console.warn(`Tweet text is too long (${text.length} characters). It might be truncated.`);
    }

    try {
      const { data } = await twitterClient.v2.tweet(text);
      console.log('Twitter API v2 response:', data);
      return data;
    } catch (v2Error: any) {
      console.log('Twitter API v2 failed, trying v1.1:', v2Error.message);
      const data = await twitterClient.v1.tweet(text);
      console.log('Twitter API v1.1 response:', data);
      return data;
    }
  } catch (e: any) {
    console.error('Error posting tweet:', e);
    throw e;
  }
}

runScheduledJob();











