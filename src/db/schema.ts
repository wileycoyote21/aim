// src/db/schema.ts

export interface Theme {
  id: string;
  name: string;
  date: string; // YYYY-MM-DD format
  created_at?: string;
}

export interface Post {
  id: string;
  content: string;
  theme_id: string;
  type: 'regular' | 'trending' | 'self_reflection';
  sentiment?: 'positive' | 'neutral' | 'negative';
  created_at?: string;
}
