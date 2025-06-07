# Rate Limit Protection Implementation Plan

## Overview
This document outlines the implementation plan for adding comprehensive rate limit protection to the AIM Twitter bot to ensure compliance with X (Twitter) API free tier limits.

## X API Free Tier Limits
- **Monthly Posts**: 500 (approximately 16-17 per day)
- **Daily Posts**: 50 per user
- **Monthly Reads**: 100 (for trending topics)
- **Rate Windows**: 15-minute windows for most endpoints

## Implementation Phases

### Phase 1: Core Infrastructure (High Priority)

#### 1. Rate Limiter Utility Module
**File**: `src/utils/rateLimiter.ts`

**Features**:
- Token bucket algorithm implementation
- Configurable rate limits with free tier defaults
- Persistent state using database
- Core methods:
  - `canPost()`: Check if posting is allowed
  - `consumeToken()`: Deduct from available quota
  - `getRemainingTokens()`: Get current availability
  - `resetDailyLimits()`: Reset daily counters
  - `resetMonthlyLimits()`: Reset monthly counters

**Configuration**:
```typescript
interface RateLimits {
  dailyPosts: number;      // Default: 12 (safe margin under 50)
  monthlyPosts: number;    // Default: 400 (safe margin under 500)
  monthlyReads: number;    // Default: 80 (safe margin under 100)
  minTimeBetweenPosts: number; // Default: 2 hours
}
```

#### 2. Database Schema Updates
**New Tables**:

```sql
-- Rate limit tracking
CREATE TABLE rate_limits (
  id SERIAL PRIMARY KEY,
  date DATE NOT NULL,
  posts_today INTEGER DEFAULT 0,
  posts_this_month INTEGER DEFAULT 0,
  reads_this_month INTEGER DEFAULT 0,
  last_post_at TIMESTAMP WITH TIME ZONE,
  last_daily_reset DATE,
  last_monthly_reset DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- API error tracking
CREATE TABLE api_errors (
  id SERIAL PRIMARY KEY,
  error_type VARCHAR(50) NOT NULL,
  error_code INTEGER,
  error_message TEXT,
  endpoint VARCHAR(100),
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Updates to existing tables**:
```sql
-- Add to posts table
ALTER TABLE posts ADD COLUMN retry_count INTEGER DEFAULT 0;
ALTER TABLE posts ADD COLUMN last_error TEXT;
ALTER TABLE posts ADD COLUMN last_retry_at TIMESTAMP WITH TIME ZONE;
```

#### 3. Retry Logic with Exponential Backoff
**File**: `src/utils/retry.ts`

**Implementation**:
```typescript
interface RetryConfig {
  maxRetries: number;        // Default: 5
  baseDelay: number;         // Default: 1000ms
  maxDelay: number;          // Default: 60000ms
  rateLimitDelay: number;    // Default: 900000ms (15 min)
}
```

**Features**:
- Exponential backoff: 1s → 2s → 4s → 8s → 16s
- Special handling for 429 (Too Many Requests): 15-minute wait
- Persistent retry queue for failed posts
- Different strategies for different error types

#### 4. Rate Limit Headers Parser
**File**: `src/twitter/rateLimitParser.ts`

**Headers to parse**:
- `x-rate-limit-limit`: Maximum requests allowed
- `x-rate-limit-remaining`: Requests remaining
- `x-rate-limit-reset`: Unix timestamp of reset time
- `retry-after`: Seconds to wait (for 429 responses)

**Features**:
- Automatic pause when approaching limits (90% threshold)
- Warning logs at 75% usage
- Store header data for monitoring

### Phase 2: Advanced Controls (Medium Priority)

#### 5. Posting Queue System
**File**: `src/utils/postingQueue.ts`

**Features**:
- Time-based posting controls
- Minimum 2-hour gap between posts
- Maximum 12 posts per day (safety margin)
- Priority levels for posts:
  - HIGH: Trending posts
  - NORMAL: Regular themed posts
  - LOW: Backfill or retry posts
- Queue persistence across restarts

#### 6. Usage Tracking & Analytics
**File**: `src/analytics/usageTracker.ts`

**Metrics to track**:
- Daily post count
- Monthly post count
- Trending API read usage
- Success/failure rates
- Average retry count
- Time distribution of posts

**Dashboard features**:
- Current usage vs. limits
- Projected monthly usage
- Historical trends
- Alert thresholds

#### 7. Circuit Breaker Pattern
**File**: `src/utils/circuitBreaker.ts`

**States**:
- **Closed**: Normal operation
- **Open**: All requests fail fast (after 3 consecutive failures)
- **Half-Open**: Allow limited requests to test recovery

**Configuration**:
```typescript
interface CircuitBreakerConfig {
  failureThreshold: number;    // Default: 3
  resetTimeout: number;        // Default: 30 minutes
  halfOpenRequests: number;    // Default: 1
}
```

### Phase 3: Optimization & Monitoring (Low Priority)

#### 8. Configuration Management
**File**: `src/config/rateLimits.ts`

**Environment variables**:
```bash
# Rate limits
DAILY_POST_LIMIT=12
MONTHLY_POST_LIMIT=400
MONTHLY_READ_LIMIT=80
MIN_POST_INTERVAL_HOURS=2

# Thresholds
RATE_LIMIT_WARNING_PERCENT=75
RATE_LIMIT_PAUSE_PERCENT=90

# API tier
TWITTER_API_TIER=free  # free, basic, pro
```

#### 9. Monitoring & Alerting
**File**: `src/monitoring/alerts.ts`

**Alert triggers**:
- 75% of daily/monthly limit reached
- Circuit breaker opens
- Repeated failures for same post
- Approaching Twitter API reset time

**Alert channels**:
- Console logs (always)
- Database logging
- Optional: Webhook notifications
- Optional: Email alerts

#### 10. Comprehensive Testing
**Files**: `tests/rateLimiting/*.test.ts`

**Test scenarios**:
- Mock Twitter API responses
- Rate limit header parsing
- Retry logic with various error codes
- Circuit breaker state transitions
- Queue management
- Database state consistency

## Implementation Timeline

### Week 1: Foundation
- [ ] Create rate limiter utility
- [ ] Update database schema
- [ ] Implement basic retry logic

### Week 2: Integration
- [ ] Integrate rate limiter with posting logic
- [ ] Add header parsing
- [ ] Implement usage tracking

### Week 3: Advanced Features
- [ ] Add posting queue
- [ ] Implement circuit breaker
- [ ] Create monitoring dashboard

### Week 4: Testing & Optimization
- [ ] Comprehensive testing
- [ ] Performance optimization
- [ ] Documentation updates

## Success Criteria

1. **Zero rate limit errors** in production
2. **Stay under 80%** of free tier limits
3. **Automatic recovery** from temporary failures
4. **Clear visibility** into usage patterns
5. **No lost posts** due to transient errors

## Rollback Plan

If issues arise:
1. Disable rate limiting via environment variable
2. Clear queue and reset counters
3. Revert to previous version
4. Analyze logs for root cause

## Monitoring Post-Implementation

- Daily usage reports
- Weekly trend analysis
- Monthly limit projections
- Error rate tracking
- Performance impact assessment