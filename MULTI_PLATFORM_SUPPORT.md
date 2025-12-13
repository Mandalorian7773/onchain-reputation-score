# Multi-Platform Problem-Solving Support

## Overview
The reputation system now supports multiple problem-solving platforms beyond LeetCode:
- **LeetCode** - Competitive programming and interview preparation
- **Codeforces** - Competitive programming contests
- **CodeChef** - Competitive programming and contests
- **Kaggle** - Data science competitions and notebooks

## Backend Changes

### New API Endpoints
The `/api/analyze` endpoint now accepts:
```json
{
  "wallet_address": "0x...",
  "github_username": "username",
  "problem_solving_platform": "leetcode|codeforces|codechef|kaggle",
  "problem_solving_username": "username"
}
```

### Platform-Specific Data Fetchers

#### 1. LeetCode (`fetchLeetCodeData`)
- Uses GraphQL API
- Fetches: total solved, easy/medium/hard breakdown
- Account age: Estimated from problem count

#### 2. Codeforces (`fetchCodeforcesData`)
- Uses public REST API
- Fetches: rating, max rating, solved problems, submissions
- Account age: Calculated from registration timestamp
- Difficulty mapping: <1200 (easy), 1200-1900 (medium), >1900 (hard)

#### 3. CodeChef (`fetchCodeChefData`)
- Web scraping (no public API)
- Fetches: rating, total problems solved
- Account age: Estimated from problem count
- Difficulty distribution: Based on rating level

#### 4. Kaggle (`fetchKaggleData`)
- Web scraping (no public API)
- Fetches: competitions, datasets, notebooks, tier
- Account age: Estimated from activity
- Scoring: Weighted by activity type

### Unified Fetcher
```javascript
fetchProblemSolvingData(platform, username)
```
Routes to the appropriate platform-specific fetcher.

### Updated Scoring Logic
The `calculateScores` function now:
- Accepts `problemSolvingData` instead of `leetcodeData`
- Applies platform-specific difficulty bonuses:
  - **LeetCode**: Hard problems bonus
  - **Codeforces**: Rating-based bonus
  - **CodeChef**: Rating-based bonus
  - **Kaggle**: Competition participation bonus

### Updated Signal Evaluation
The `evaluateLeetCodeSignal` function (now handles all platforms):
- Platform-specific thresholds for strong/medium/weak signals
- Considers platform-specific metrics (rating, competitions, etc.)

### Updated Analysis Functions
All analysis functions updated to handle multiple platforms:
- `evaluateConsistency` - Works with any platform
- `detectAnomalies` - Platform-agnostic anomaly detection
- `generateReasoning` - Shows platform name dynamically
- `generateNotes` - Platform-specific insights

## Frontend Changes

### Platform Selector
New dropdown in the problem-solving section:
```jsx
<Select value={formData.problem_solving_platform}>
  <SelectItem value="leetcode">LeetCode</SelectItem>
  <SelectItem value="codeforces">Codeforces</SelectItem>
  <SelectItem value="codechef">CodeChef</SelectItem>
  <SelectItem value="kaggle">Kaggle</SelectItem>
</Select>
```

### Dynamic Display
Results display adapts to the selected platform:
- **LeetCode**: Shows easy/medium/hard breakdown
- **Codeforces**: Shows rating and max rating
- **CodeChef**: Shows rating
- **Kaggle**: Shows competitions, datasets, notebooks, and tier

### Updated Form State
```javascript
{
  github_username: "",
  problem_solving_platform: "leetcode",
  problem_solving_username: ""
}
```

## API Response Format

### Success Response
```json
{
  "wallet_address": "0x...",
  "github_username": "username",
  "problem_solving_platform": "codeforces",
  "problem_solving_username": "tourist",
  "fetched_data": {
    "wallet": { ... },
    "github": { ... },
    "problem_solving": {
      "platform": "codeforces",
      "username": "tourist",
      "account_age_days": 5000,
      "total_solved": 500,
      "rating": 3500,
      "max_rating": 3700,
      "found": true
    }
  },
  "calculated_scores": {
    "wallet_score": 25.5,
    "github_score": 40.2,
    "problem_solving_score": 35.0,
    "consistency_score": 12.5,
    "final_score": 113.2
  },
  "analysis": { ... }
}
```

## Platform-Specific Notes

### LeetCode
- ✅ Official GraphQL API
- ✅ Reliable data
- ⚠️ Account age estimated

### Codeforces
- ✅ Official REST API
- ✅ Accurate account age
- ✅ Rating system
- ⚠️ Difficulty approximated from problem ratings

### CodeChef
- ⚠️ Web scraping (no official API)
- ⚠️ May break if HTML structure changes
- ⚠️ Account age estimated
- ✅ Rating available

### Kaggle
- ⚠️ Web scraping (no official API)
- ⚠️ May break if HTML structure changes
- ⚠️ Account age estimated
- ✅ Tier/rank available

## Error Handling
All platform fetchers return consistent error format:
```json
{
  "username": "test",
  "platform": "codeforces",
  "found": false,
  "error": "User not found"
}
```

## Testing
Test each platform:
```bash
# LeetCode
curl -X POST http://localhost:8001/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"problem_solving_platform": "leetcode", "problem_solving_username": "test"}'

# Codeforces
curl -X POST http://localhost:8001/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"problem_solving_platform": "codeforces", "problem_solving_username": "tourist"}'

# CodeChef
curl -X POST http://localhost:8001/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"problem_solving_platform": "codechef", "problem_solving_username": "test"}'

# Kaggle
curl -X POST http://localhost:8001/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"problem_solving_platform": "kaggle", "problem_solving_username": "test"}'
```

## Future Improvements
1. Add more platforms (HackerRank, AtCoder, TopCoder)
2. Implement caching for platform data
3. Add rate limiting for web scraping
4. Create official API integrations where possible
5. Add platform-specific badges/achievements
6. Implement cross-platform reputation comparison
