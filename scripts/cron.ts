// src/scripts/cron.ts

import { createClient } from '@supabase/supabase-js';
import { generateThemeForToday, ThemeResult } from '../themes/generator';
import TwitterApi from 'twitter-api-v2';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY!;
const TWITTER_BEARER_TOKEN = process.env.TWITTER_BEARER_TOKEN!;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const twitterClient = new TwitterApi(TWITTER_BEARER_TOKEN);

async function runCron() {
  try {
    console.log('Supabase Client initialized.');
    console.log('--- Starting Scheduled Job ---');

    // 1. Get today's theme
    const today = new Date().toISOString().slice(0, 10);
    const theme: ThemeResult = await generateThemeForToday(supabase, today);

    // 2. Check how many posts exist for this theme
    let { data: posts, error: postsError } = await supabase
      .from('posts')
      .select('*')
      .eq('theme', theme.name)
      .order('created_at', { ascending: true });

    if (postsError) throw new Error(`Error fetching posts: ${postsError.message}`);

    // 3. If no posts for this theme, create 3 new posts (dummy content here — replace with your generation logic)
    if (!posts || posts.length === 0) {
      const newPosts = [
        { theme: theme.name, content: `${theme.name} post 1`, posted: false },
        { theme: theme.name, content: `${theme.name} post 2`, posted: false },
        { theme: theme.name, content: `${theme.name} post 3`, posted: false },
      ];

      const { error: insertError } = await supabase.from('posts').insert(newPosts);
      if (insertError) throw new Error(`Error inserting posts: ${insertError.message}`);

      posts = newPosts;
      console.log(`Created 3 new posts for theme "${theme.name}".`);
    }

    // 4. Find the next post to publish (first post with posted=false)
    const nextPost = posts.find(p => !p.posted);
    if (!nextPost) {
      // All posts posted, mark theme as used and exit (next run picks next theme)
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















