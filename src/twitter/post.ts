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
    // --- ADDED LOGS FOR TWEET CONTENT ---
    console.log('Attempting to post tweet with the following content:');
    console.log(`>>> TWEET TEXT START <<<`);
    console.log(text); // Log the actual text content
    console.log(`>>> TWEET TEXT END <<<`);
    console.log(`Tweet text length: ${text.length} characters.`);
    // --- END ADDED LOGS ---

    // Optional: Add a check for empty/too long text to fail early
    if (!text || text.trim().length === 0) {
        console.error('Tweet text is empty or only whitespace. Aborting post attempt.');
        return { errors: [{ message: 'Tweet text is empty or invalid.' }] };
    }
    // Twitter's current limit is 280 characters for basic text tweets.
    // This check is a safeguard.
    if (text.length > 280) { 
        console.error(`Tweet text is too long (${text.length} chars). Aborting post attempt.`);
        return { errors: [{ message: 'Tweet text exceeds 280 character limit.' }] };
    }

    const response = await twitterClient.post('tweets', {
      text,
    });

    if ('errors' in response) {
      console.error('Twitter API returned specific errors:', response.errors); // Clarify log message
      return { errors: response.errors };
    }

    return { data: response.data };
  } catch (error) {
    // --- ENHANCED ERROR LOGGING FOR APIREQUESTERROR ---
    console.error('Error posting tweet (caught in postTweet function):');
    
    // Log the entire error object to see all its properties
    console.error(error); 

    // Check for common error properties from Node.js's network errors
    if (error instanceof Error) {
        if ('code' in error && typeof (error as any).code === 'string') {
            console.error(`Node.js Error Code (e.g., ECONNREFUSED, ETIMEDOUT): ${(error as any).code}`); 
        }
        if ('syscall' in error && typeof (error as any).syscall === 'string') {
            console.error(`System Call (e.g., connect, write): ${(error as any).syscall}`); 
        }
        // If there's a response object within the error (less common for ApiRequestError but good to check)
        if ('response' in error && typeof (error as any).response === 'object' && (error as any).response !== null) {
            console.error('Error response details (if available):', (error as any).response);
        }
    }
    // --- END ENHANCED ERROR LOGGING ---

    return { errors: [{ message: (error as Error).message }] };
  }
}
