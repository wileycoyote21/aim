import { TwitterApi } from 'twitter-api-v2';

// Load env vars
const {
  TWITTER_API_KEY,
  TWITTER_API_KEY_SECRET,
  TWITTER_ACCESS_TOKEN,
  TWITTER_ACCESS_TOKEN_SECRET,
} = process.env;

if (
  !TWITTER_API_KEY ||
  !TWITTER_API_KEY_SECRET ||
  !TWITTER_ACCESS_TOKEN ||
  !TWITTER_ACCESS_TOKEN_SECRET
) {
  throw new Error('Missing Twitter API credentials in environment variables');
}

// Create and export Twitter client
export const twitterClient = new TwitterApi({
  appKey: TWITTER_API_KEY,
  appSecret: TWITTER_API_KEY_SECRET,
  accessToken: TWITTER_ACCESS_TOKEN,
  accessSecret: TWITTER_ACCESS_TOKEN_SECRET,
});
