// src/twitter/client.ts - This file should set up your Twitter client
import 'dotenv/config'; // Loads .env variables

// console.logs from your image (good for debugging)
console.log("TWITTER_API_KEY:", process.env.TWITTER_API_KEY);
console.log("TWITTER_API_SECRET:", process.env.TWITTER_API_SECRET);
console.log("TWITTER_ACCESS_TOKEN:", process.env.TWITTER_ACCESS_TOKEN);
console.log("TWITTER_ACCESS_TOKEN_SECRET:", process.env.TWITTER_ACCESS_TOKEN_SECRET);

// Check for missing credentials (as you already have)
if (
  !process.env.TWITTER_API_KEY ||
  !process.env.TWITTER_API_SECRET ||
  !process.env.TWITTER_ACCESS_TOKEN ||
  !process.env.TWITTER_ACCESS_TOKEN_SECRET
) {
  throw new Error("Missing Twitter API credentials in environment variables");
}

// Assuming you're using twitter-api-v2 as in your commented example
import { TwitterApi } from 'twitter-api-v2';

export const twitterClient = new TwitterApi({
  appKey: process.env.TWITTER_API_KEY as string, // Add 'as string' for TypeScript if needed
  appSecret: process.env.TWITTER_API_SECRET as string,
  accessToken: process.env.TWITTER_ACCESS_TOKEN as string,
  accessSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET as string,
});

console.log("Twitter Client initialized."); // Optional: for debugging
