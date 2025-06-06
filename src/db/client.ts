// src/twitter/client.ts
import { TwitterApi } from "twitter-api-v2";
import dotenv from "dotenv";

dotenv.config();

// Optional: Helpful logging during local development
console.log("TWITTER_API_KEY:", process.env.TWITTER_API_KEY ? "[set]" : "[missing]");
console.log("TWITTER_API_SECRET:", process.env.TWITTER_API_SECRET ? "[set]" : "[missing]");
console.log("TWITTER_ACCESS_TOKEN:", process.env.TWITTER_ACCESS_TOKEN ? "[set]" : "[missing]");
console.log("TWITTER_ACCESS_TOKEN_SECRET:", process.env.TWITTER_ACCESS_TOKEN_SECRET ? "[set]" : "[missing]");

// Required for posting to Twitter
const {
  TWITTER_API_KEY,
  TWITTER_API_SECRET,
  TWITTER_ACCESS_TOKEN,
  TWITTER_ACCESS_TOKEN_SECRET,
} = process.env;

if (
  !TWITTER_API_KEY ||
  !TWITTER_API_SECRET ||
  !TWITTER_ACCESS_TOKEN ||
  !TWITTER_ACCESS_TOKEN_SECRET
) {
  throw new Error("Missing Twitter API credentials in environment variables");
}

export const twitterClient = new TwitterApi({
  appKey: TWITTER_API_KEY,
  appSecret: TWITTER_API_SECRET,
  accessToken: TWITTER_ACCESS_TOKEN,
  accessSecret: TWITTER_ACCESS_TOKEN_SECRET,
});



