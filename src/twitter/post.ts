// /src/twitter/post.ts

import { twitterClient } from './client';

interface TweetResponse {
  data?: {
    id: string;
    text: string;
  };
  errors?: Array<{ message: string }>;
}

export async function postTweet(text: string): Promise<TweetResponse> {
  try {
    const response = await twitterClient.post('tweets', {
      text,
    });

    if ('errors' in response) {
      console.error('Twitter API error:', response.errors);
      return { errors: response.errors };
    }

    return { data: response.data };
  } catch (error) {
    console.error('Error posting tweet:', error);
    return { errors: [{ message: (error as Error).message }] };
  }
}
