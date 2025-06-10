import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { generateThemeForToday, ThemeResult } from '../src/themes/generator';
import { TwitterApi } from 'twitter-api-v2';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY!;
const TWITTER_BEARER_TOKEN = process.env.TWITTER_BEARER_TOKEN!;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const twitterClient = new TwitterApi(TWITTER_BEARER_TOKEN);

async function runCron() {
  try {
    console.log('Supabase Client initialized.');
    console.log('--- Starting Scheduled Job ---');

    const today = new Date().toISOString().slice(0, 10);
    const theme: ThemeResult = await generateThemeForToday(supabase, today);
    console.log(`Selected theme: ${theme.name}`);

    let { data: posts, error: postsError } = await supabase
      .from('posts')
      .select('*')
      .eq('theme', theme.name)
      .order('created_at', { ascending: true });

    if (postsError) throw new Error(`Error fetching posts: ${postsError.message}`);

    if (!posts || posts.length === 0) {
      const newPosts = [1, 2, 3].map(i => ({
        theme: theme.name,
        content: `${theme.name} post ${i}`,
        text: `${theme.name} post ${i}`,
        posted: false,
      }));

      const { error: insertError } = await supabase.from('posts').insert(newPosts);
      if (insertError) throw new Error(`Error inserting posts: ${insertError.message}`);

      posts = newPosts;
      console.log(`Created 3 new posts for theme "${theme.name}".`);
    }

    const nextPost = posts.find(p => !p.posted);
    if (!nextPost) {
      const { error: updateThemeError } = await supabase
        .from('themes')
        .update({ used: true })
        .eq('id', theme.id);

      if (updateThemeError) throw new Error(`Error marking theme as used: ${updateThemeError.message}`);

      console.log(`All posts published for theme "${theme.name}". Theme marked as used.`);
      return;
    }

    await twitterClient.v2.tweet(nextPost.text);
    console.log(`Tweet posted: ${nextPost.text}`);

    const { error: updatePostError } = await supabase
      .from('posts')
      .update({ posted: true })
      .eq('id', nextPost.id);

    if (updatePostError) throw new Error(`Error marking post as posted: ${updatePostError.message}`);

    console.log(`Marked post as posted: ${nextPost.id}`);
    console.log('--- Cron Job Completed ---');

  } catch (error: any) {
    console.error('--- Error in Scheduled Job ---');
    console.error('Error message:', error.message);
    console.error('Stack trace:', error.stack);
    console.error('--- End Error ---');
  }
}

runCron();


















