import { supabase } from '../src/db/client';
import { generateThemeForToday } from '../src/themes/generator';
import { generatePostsForTheme } from '../src/posts/generate';
import { analyzeSentiment } from '../src/sentiment/analyze';
import { postTweet } from '../src/twitter/post';
import { getTodayTimestamp } from '../src/utils/timestamp';
import { generateTrendingPost } from '../src/posts/trending';

const db = supabase;

async function run() {
  try {
    const today = getTodayTimestamp();

    // 1. Get or generate today's theme
    const theme = await generateThemeForToday(db, today);

    // 2. Generate posts if they don't already exist
    const posts = await generatePostsForTheme(db, theme);

    // 3. Count how many posts have already been sent today
    const postedToday = posts.filter(p => p.posted_at).length;

    // 4. Select the next unposted message
    const nextPost = posts.find(p => !p.posted_at);

    if (!nextPost) {
      console.log('All posts already published for today.');
      return;
    }

    // 5. On every 5th post overall, generate trending-aware post instead
    const { count } = await db
      .from('posts')
      .select('*', { count: 'exact', head: true });

    const totalPosted = count || 0;

    let textToPost = nextPost.text;

    if ((totalPosted + 1) % 5 === 0) {
      console.log('Generating trending-aware post...');
      textToPost = await generateTrendingPost();
    }

    // 6. Post to Twitter with error handling
    const tweetResponse = await postTweet(textToPost);

    if (tweetResponse.errors && tweetResponse.errors.length > 0) {
      throw new Error(`Twitter post error: ${tweetResponse.errors.map(e => e.message).join(', ')}`);
    }

    const tweetId = tweetResponse.data?.id;

    if (!tweetId) {
      throw new Error('No tweet ID returned from Twitter API');
    }

    // 7. Log sentiment and mark post as posted (includes updating posted_at and tweet_id)
    await analyzeSentiment(db, nextPost.id, textToPost, tweetId);

    console.log(`Posted to Twitter: ${tweetId}`);
  } catch (err) {
    console.error('Error in scheduled run:', err);
  }
}

run();




