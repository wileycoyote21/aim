// src/utils/openaiClient.ts
import OpenAI from 'openai'; // Make sure you have the 'openai' npm package installed

// Load environment variables (important for local development)
import 'dotenv/config'; 

// Get your OpenAI API key from environment variables
const openaiApiKey = process.env.OPENAI_API_KEY;

if (!openaiApiKey) {
  throw new Error('Missing OPENAI_API_KEY in environment variables');
}

// Initialize and export the OpenAI client
export const openaiClient = new OpenAI({
  apiKey: openaiApiKey,
});

console.log("OpenAI Client initialized."); // Optional: for debugging