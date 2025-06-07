# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- **`npm run dev`** - Runs src/index.ts (development entry point)
- **`npm run post`** - Execute the main cron job to generate and post tweets
- **`npm test`** - Not implemented (exits with error)

## Architecture Overview

AIM is an AI-powered Twitter bot that posts introspective, journal-like reflections. The system follows a modular architecture with clear separation of concerns:

### Core Flow
```
scripts/cron.ts → Theme Selection → Post Generation → Twitter Posting → Sentiment Analysis → Database Update
```

### Key Components

1. **Cron Script** (`scripts/cron.ts`): Main entry point that orchestrates the entire posting workflow
2. **Theme Engine** (`src/themes/generator.ts`): Manages 30 rotating emotional/philosophical themes based on day of month
3. **Post Generator** (`src/posts/generate.ts`): Uses OpenAI GPT-4o-mini to create 3 posts per theme
4. **Trending Posts** (`src/posts/trending.ts`): Every 5th post incorporates trending topics
5. **Twitter Client** (`src/twitter/`): Handles OAuth 1.0a authentication and posting
6. **Sentiment Analyzer** (`src/sentiment/analyze.ts`): Analyzes post sentiment post-publication
7. **Database Layer** (`src/db/`): Supabase integration for persistent storage

### Database Schema (Inferred from Code)

**themes table:**
- `date`: YYYY-MM-DD format
- `theme`: string

**posts table:**
- `id`: UUID
- `text`: post content
- `theme`: associated theme
- `is_takeaway`: boolean (one per theme has insight)
- `posted_at`: timestamp when posted
- `tweet_id`: Twitter post ID
- `sentiment_score`: -1, 0, or 1
- `sentiment_label`: negative/neutral/positive

### External Services

1. **Supabase**: Database storage
2. **OpenAI API**: Content generation and sentiment analysis (GPT-4o-mini)
3. **Twitter API v2**: Posting tweets (OAuth 1.0a)

### Environment Variables Required
```
SUPABASE_URL
SUPABASE_KEY
TWITTER_API_KEY
TWITTER_API_SECRET
TWITTER_ACCESS_TOKEN
TWITTER_ACCESS_TOKEN_SECRET
OPENAI_API_KEY
```

### Important Considerations

1. **Rate Limits**: The app currently has NO rate limit protection. See RATE_LIMIT_IMPLEMENTATION.md for planned implementation. Twitter free tier allows only 500 posts/month.

2. **Schema Mismatch**: Database schema in `src/db/schema.ts` doesn't match actual usage in code:
   - Schema defines: `content`, `theme_id`, `type`
   - Code uses: `text`, `theme`, `is_takeaway`

3. **Posting Frequency**: Generates 3 posts per day, posts one at a time when cron runs. No built-in timing controls.

4. **Error Handling**: Enhanced logging for Twitter API errors but no retry logic or recovery mechanisms.

5. **Trending Posts**: Every 5th post overall (tracked in DB) uses trending topics. Currently using mock trends.

### Development Tips

- Test OpenAI integration with `scripts/test-supabase.ts`
- Check environment variables with `scripts/check-env.ts`
- Twitter client logs detailed error information for debugging
- Posts must be under 280 characters (validated before posting)
- All posts are lowercase, introspective, 1-2 sentences