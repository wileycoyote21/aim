import * as dotenv from 'dotenv';
dotenv.config();

import { createClient } from '@supabase/supabase-js';
import { generateThemeForToday, ThemeResult } from '../src/themes/generator';
import TwitterApi from 'twitter-api-v2';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_KEY!;

const TWITTER_API_KEY = process.env.TWITTER_API_KEY!;
const TWITTER_API_SECRET = process.env.TWITTER_API_SECRET!;
const TWITTER_ACCESS_TOKEN = process.env.TWITTER_ACCESS_TOKEN!;
const TWITTER_ACCESS_TOKEN_SECRET = process.env.TWITTER_ACCESS_TOKEN_SECRET!;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const twitterClient = new TwitterApi({
  appKey: TWITTER_API_KEY,
  appSecret: TWITTER_API_SECRET,
  accessToken: TWITTER_ACCESS_TOKEN,
  accessSecret: TWITTER_ACCESS_TOKEN_SECRET,
});

async function runCron() {
  try {
    console.log('Supabase Client initialized.');
    console.log('--- Starting Scheduled Job ---');

    const today = new Date().toISOString().slice(0, 10);

    // 1. Generate or get today's theme
    const theme: ThemeResult = await generateThemeForToday(supabase, today);
    console.log(`Selected theme: ${theme.name}`);

    // 2. Fetch existing posts for this theme
    let { data: posts, error: postsError } = await supabase
      .from('posts')
      .select('*')
      .eq('theme', theme.name)
      .order('created_at', { ascending: true });

    if (postsError) throw new Error(`Error fetching posts: ${postsError.message}`);

    // 3. Create 3 new posts if none exist
    if (!posts || posts.length === 0) {
      const newPosts = [
        { theme: theme.name, content: `${theme.name} post 1`, text: `${theme.name} post 1` },
        { theme: theme.name, content: `${theme.name} post 2`, text: `${theme.name} post 2` },
        { theme: theme.name, content: `${theme.name} post 3`, text: `${theme.name} post 3` },
      ];

      const { error: insertError } = await supabase.from('posts').insert(newPosts);
      if (insertError) throw new Error(`Error inserting posts: ${insertError.message}`);

      posts = newPosts;
      console.log(`Created 3 new posts for theme "${theme.name}".`);
    }

    // 4. Find the next unposted post
    const nextPost = posts.find(p => !p.posted);
    if (!nextPost) {
      // Mark theme as used
      const { error: updateThemeError } = await supabase
        .from('themes')
        .update({ used: true })
        .eq('id', theme.id);

      if (updateThemeError) throw new Error(`Error marking theme as used: ${updateThemeError.message}`);

      console.log(`All posts published for theme "${theme.name}". Theme marked as used.`);
      return;
    }

    // 5. Post to Twitter
    await twitterClient.v2.tweet(nextPost.content);
    console.log(`Posted tweet for theme "${theme.name}": ${nextPost.content}`);

    // 6. Mark post as posted
    const { error: updatePostError } = await supabase
      .from('posts')
      .update({ posted: true })
      .eq('id', nextPost.id);

    if (updatePostError) throw new Error(`Error marking post as posted: ${updatePostError.message}`);

  } catch (error: any) {
    console.error('--- Error in Scheduled Job ---');
    console.error('Error message:', error.message);
    console.error('Stack trace:', error.stack);
    console.error('--- End Error ---');
  }
}

runCron();



















