-- Create themes table
CREATE TABLE IF NOT EXISTS themes (
  id SERIAL PRIMARY KEY,
  date DATE NOT NULL UNIQUE,
  theme VARCHAR(50) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create posts table
CREATE TABLE IF NOT EXISTS posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  text TEXT NOT NULL,
  theme VARCHAR(50) NOT NULL,
  is_takeaway BOOLEAN DEFAULT false,
  posted_at TIMESTAMP WITH TIME ZONE,
  tweet_id VARCHAR(100),
  sentiment_score NUMERIC(3,2),
  sentiment_label VARCHAR(20),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_posts_theme ON posts(theme);
CREATE INDEX IF NOT EXISTS idx_posts_posted_at ON posts(posted_at);
CREATE INDEX IF NOT EXISTS idx_themes_date ON themes(date);