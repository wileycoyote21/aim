// src/twitter/client.ts
import dotenv from "dotenv";
dotenv.config();

console.log("TWITTER_API_KEY:", process.env.TWITTER_API_KEY);
console.log("TWITTER_API_SECRET:", process.env.TWITTER_API_SECRET);
console.log("TWITTER_ACCESS_TOKEN:", process.env.TWITTER_ACCESS_TOKEN);
console.log("TWITTER_ACCESS_TOKEN_SECRET:", process.env.TWITTER_ACCESS_TOKEN_SECRET);

if (
  !process.env.TWITTER_API_KEY ||
  !process.env.TWITTER_API_SECRET ||
  !process.env.TWITTER_ACCESS_TOKEN ||
  !process.env.TWITTER_ACCESS_TOKEN_SECRET
) {
  throw new Error("Missing Twitter API credentials in environment variables");
}

// Your existing client setup below here...
// For example:
// import { TwitterApi } from 'twitter-api-v2';
// export const twitterClient = new TwitterApi({
//   appKey: process.env.TWITTER_API_KEY,
//   appSecret: process.env.TWITTER_API_SECRET,
//   accessToken: process.env.TWITTER_ACCESS_TOKEN,
//   accessSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET,
// });



