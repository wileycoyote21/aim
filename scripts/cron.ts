import { createClient } from '../src/db/client';
import { generateThemeForToday } from '../src/themes/generator';
import { generatePostsForTheme } from '../src/posts/generate';
import { analyzeAndLogSentiment } from '../src/sentiment/analyze';
import { postToTwitter } from '../src/twitter/post';
import { getTodayTimestamp } from '../src/utils/timestamp';
import { generateTrendingPost } from '../src/posts/trending';

const db = createClient();

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
    const totalPosted = await db
      .from('posts')
      .select('*', { count: 'exact', head: true })
      .then(res => res.count || 0);

    let textToPost = nextPost.text;

    if ((totalPosted + 1) % 5 === 0) {
      console.log('Generating trending-aware post...');
      textToPost = await generateTrendingPost(db, theme);
    }

    // 6. Post to Twitter
    const tweetId = await postToTwitter(textToPost);

    // 7. Log post + sentiment
    await analyzeAndLogSentiment(db, nextPost.id, textToPost, tweetId);
    console.log(`Posted to Twitter: ${tweetId}`);
  } catch (err) {
    console.error('Error in scheduled run:', err);
  }
}

run();
