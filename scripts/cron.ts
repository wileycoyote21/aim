import { createClient } from '@supabase/supabase-js';
import { generateThemeForToday, ThemeResult } from '../src/themes/generator';
import TwitterApi from 'twitter-api-v2';
import dotenv from 'dotenv';

dotenv.config(); // Load .env variables

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const twitterClient = new TwitterApi({
  appKey: process.env.TWITTER_API_KEY!,
  appSecret: process.env.TWITTER_API_SECRET!,
  accessToken: process.env.TWITTER_ACCESS_TOKEN!,
  accessSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET!,
});

async function runCron() {
  try {
    console.log('Supabase Client initialized.');
    console.log('--- Starting Scheduled Job ---');

    const today = new Date().toISOString().slice(0, 10);
    const theme: ThemeResult = await generateThemeForToday(supabase, today);

    let { data: posts, error: postsError } = await supabase
      .from('posts')
      .select('*')
      .eq('theme', theme.name)
      .order('created_at', { ascending: true });

    if (postsError) throw new Error(`Error fetching posts: ${postsError.message}`);

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

    await twitterClient.v1.tweet(nextPost.content);
    console.log(`Posted tweet for theme "${theme.name}": ${nextPost.content}`);

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


















