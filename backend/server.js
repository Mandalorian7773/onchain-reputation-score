import Fastify from 'fastify';
import cors from '@fastify/cors';
import { ethers } from 'ethers';
import axios from 'axios';
import dotenv from 'dotenv';
import OpenAI from 'openai';

dotenv.config();

const fastify = Fastify({ logger: true });

await fastify.register(cors, {
  origin: process.env.CORS_ORIGINS?.split(',') || '*',
  credentials: true
});

const POLYGON_RPC = 'https://polygon-rpc.com';
const GITHUB_API = 'https://api.github.com';
const LEETCODE_GRAPHQL = 'https://leetcode.com/graphql';

const openai = new OpenAI({
  apiKey: process.env.EMERGENT_LLM_KEY,
  baseURL: 'https://api.emergentmethods.ai/v1'
});

// Fetch Polygon wallet data
async function fetchWalletData(address) {
  try {
    const provider = new ethers.JsonRpcProvider(POLYGON_RPC);
    const currentBlock = await provider.getBlockNumber();
    const txCount = await provider.getTransactionCount(address);
    
    if (txCount === 0) {
      return { address, age_days: 0, tx_count: 0, found: false };
    }
    
    // Estimate account age by finding first transaction
    let firstBlock = 0;
    let low = 0;
    let high = currentBlock;
    
    // Binary search for first transaction (approximate)
    while (low <= high && (high - low) > 1000) {
      const mid = Math.floor((low + high) / 2);
      const balance = await provider.getTransactionCount(address, mid);
      if (balance > 0) {
        high = mid;
      } else {
        low = mid;
      }
    }
    
    firstBlock = high;
    const firstBlockData = await provider.getBlock(firstBlock);
    const currentBlockData = await provider.getBlock(currentBlock);
    
    const ageDays = Math.floor((currentBlockData.timestamp - firstBlockData.timestamp) / 86400);
    
    return {
      address,
      age_days: Math.max(ageDays, 1),
      tx_count: txCount,
      found: true
    };
  } catch (error) {
    fastify.log.error('Polygon fetch error:', error);
    return { address, age_days: 0, tx_count: 0, found: false, error: error.message };
  }
}

// Fetch GitHub data
async function fetchGitHubData(username) {
  if (!username) return null;
  
  try {
    const userResponse = await axios.get(`${GITHUB_API}/users/${username}`);
    const reposResponse = await axios.get(`${GITHUB_API}/users/${username}/repos?per_page=100`);
    
    const user = userResponse.data;
    const repos = reposResponse.data;
    
    const createdAt = new Date(user.created_at);
    const ageDays = Math.floor((Date.now() - createdAt.getTime()) / 86400000);
    
    // Estimate total commits from all repos
    let totalCommits = 0;
    for (const repo of repos.slice(0, 20)) {
      try {
        const commitsResponse = await axios.get(
          `${GITHUB_API}/repos/${username}/${repo.name}/commits?per_page=1`,
          { headers: { Accept: 'application/vnd.github.v3+json' } }
        );
        const linkHeader = commitsResponse.headers.link;
        if (linkHeader) {
          const match = linkHeader.match(/page=(\d+)>; rel="last"/);
          if (match) totalCommits += parseInt(match[1]);
        }
      } catch (e) {
        // Skip repos with no commits or access issues
      }
    }
    
    return {
      username,
      account_age_days: ageDays,
      public_repos: user.public_repos,
      total_commits_estimate: totalCommits,
      found: true
    };
  } catch (error) {
    fastify.log.error('GitHub fetch error:', error);
    return { username, found: false, error: error.message };
  }
}

// Fetch LeetCode data
async function fetchLeetCodeData(username) {
  if (!username) return null;
  
  try {
    const query = `
      query getUserProfile($username: String!) {
        matchedUser(username: $username) {
          username
          profile {
            ranking
            userAvatar
          }
          submitStats {
            acSubmissionNum {
              difficulty
              count
            }
          }
        }
      }
    `;
    
    const response = await axios.post(
      LEETCODE_GRAPHQL,
      { query, variables: { username } },
      { headers: { 'Content-Type': 'application/json' } }
    );
    
    const user = response.data?.data?.matchedUser;
    if (!user) {
      return { username, found: false, error: 'User not found' };
    }
    
    const stats = user.submitStats.acSubmissionNum;
    const easy = stats.find(s => s.difficulty === 'Easy')?.count || 0;
    const medium = stats.find(s => s.difficulty === 'Medium')?.count || 0;
    const hard = stats.find(s => s.difficulty === 'Hard')?.count || 0;
    
    // Estimate account age (LeetCode API doesn't provide this directly)
    // Use a heuristic: ~365 days for every 100 problems solved
    const totalSolved = easy + medium + hard;
    const estimatedAgeDays = Math.max(Math.floor(totalSolved / 100 * 365), 30);
    
    return {
      platform: 'leetcode',
      username,
      account_age_days: estimatedAgeDays,
      total_solved: totalSolved,
      easy,
      medium,
      hard,
      found: true
    };
  } catch (error) {
    fastify.log.error('LeetCode fetch error:', error);
    return { username, found: false, error: error.message };
  }
}

// Calculate scores
function calculateScores(wallet, github, leetcode) {
  // Wallet score (max 50)
  let walletScore = 0;
  if (wallet?.found) {
    const ageScore = Math.min(wallet.age_days / 365, 1.0) * 30;
    const txScore = Math.min(wallet.tx_count / 1000, 1.0) * 20;
    walletScore = Math.round((ageScore + txScore) * 10) / 10;
  }
  
  // GitHub score (max 50)
  let githubScore = 0;
  if (github?.found) {
    const ageScore = Math.min(github.account_age_days / 365, 1.0) * 15;
    const repoScore = Math.min(github.public_repos / 50, 1.0) * 10;
    const commitScore = Math.min(github.total_commits_estimate / 1000, 1.0) * 25;
    githubScore = Math.round((ageScore + repoScore + commitScore) * 10) / 10;
  }
  
  // LeetCode score (max 35)
  let leetcodeScore = 0;
  if (leetcode?.found) {
    const ageScore = Math.min(leetcode.account_age_days / 365, 1.0) * 10;
    const totalScore = Math.min(leetcode.total_solved / 500, 1.0) * 15;
    const difficultyBonus = leetcode.hard > 0 ? Math.min(leetcode.hard / 50, 1.0) * 10 : 0;
    leetcodeScore = Math.round((ageScore + totalScore + difficultyBonus) * 10) / 10;
  }
  
  // Consistency score (max 15)
  const ages = [];
  if (wallet?.found) ages.push(wallet.age_days);
  if (github?.found) ages.push(github.account_age_days);
  if (leetcode?.found) ages.push(leetcode.account_age_days);
  
  let consistencyScore = 5.0;
  if (ages.length >= 2) {
    const maxDiff = Math.max(...ages) - Math.min(...ages);
    const consistency = Math.max(0, 1 - (maxDiff / 730));
    consistencyScore = Math.round(consistency * 15 * 10) / 10;
  }
  
  const finalScore = Math.round((walletScore + githubScore + leetcodeScore + consistencyScore) * 10) / 10;
  
  return {
    wallet_score: walletScore,
    github_score: githubScore,
    leetcode_score: leetcodeScore,
    consistency_score: consistencyScore,
    final_score: finalScore
  };
}

// Get AI reasoning
async function getAIReasoning(data) {
  const systemPrompt = `You are the core Reputation Reasoning Agent for an on-chain reputation system.

Your role is to analyze signal quality, consistency, and confidence across multiple technical reputation signals.
You do NOT calculate numeric scores, generate UI, or make subjective judgments about people.

This system is transparent, explainable, and assistive.

ANALYSIS APPROACH:
- Use multi-step internal reasoning to evaluate each signal independently
- Cross-check signals for consistency (e.g., account ages, activity patterns)
- Detect anomalies conservatively (very new accounts with extreme activity, mismatched timelines)
- Derive overall confidence level from signal quality and consistency
- Perform detailed reasoning internally but return ONLY structured JSON output
- Be concise, neutral, and token-efficient

You will receive a JSON object with wallet, github, problem_solving signals and calculated scores.

Your tasks:
1) Evaluate SIGNAL QUALITY for each category (strong/medium/weak/missing)
2) Analyze PROBLEM-SOLVING SIGNAL as a skill indicator
3) Detect ANOMALIES conservatively
4) Assign OVERALL CONFIDENCE LEVEL (high/medium/low)
5) Produce STRUCTURED, MACHINE-READABLE output

Output ONLY valid JSON in this exact structure:
{
  "confidence_level": "high | medium | low",
  "signal_strength": {
    "wallet": "strong | medium | weak | missing",
    "github": "strong | medium | weak | missing",
    "problem_solving": "strong | medium | weak | missing",
    "consistency": "strong | medium | weak"
  },
  "anomalies_detected": ["short factual description"],
  "confidence_reasoning": ["short, neutral, factual reason"],
  "notes": ["optional technical notes"]
}

Be conservative, cautious, and factual. Do NOT hallucinate missing data.`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: JSON.stringify(data) }
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' }
    });
    
    return JSON.parse(completion.choices[0].message.content);
  } catch (error) {
    fastify.log.error('AI reasoning error:', error.message);
    throw error;
  }
}

// Health check
fastify.get('/api', async (request, reply) => {
  return { message: 'Reputation System API - Node.js/Fastify' };
});

// Main analyze endpoint
fastify.post('/api/analyze', async (request, reply) => {
  const { wallet_address, github_username, leetcode_username } = request.body;
  
  if (!wallet_address && !github_username && !leetcode_username) {
    return reply.code(400).send({ error: 'At least one input required' });
  }
  
  try {
    // Fetch data in parallel
    const [walletData, githubData, leetcodeData] = await Promise.all([
      wallet_address ? fetchWalletData(wallet_address) : Promise.resolve(null),
      github_username ? fetchGitHubData(github_username) : Promise.resolve(null),
      leetcode_username ? fetchLeetCodeData(leetcode_username) : Promise.resolve(null)
    ]);
    
    // Calculate scores
    const scores = calculateScores(walletData, githubData, leetcodeData);
    
    // Prepare data for AI
    const analysisInput = {
      wallet: walletData || { found: false },
      github: githubData || { found: false },
      problem_solving: leetcodeData || { found: false },
      calculated_scores: scores
    };
    
    // Get AI reasoning
    const aiAnalysis = await getAIReasoning(analysisInput);
    
    return {
      wallet_address: wallet_address || null,
      github_username: github_username || null,
      leetcode_username: leetcode_username || null,
      fetched_data: {
        wallet: walletData,
        github: githubData,
        leetcode: leetcodeData
      },
      calculated_scores: scores,
      analysis: aiAnalysis,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    fastify.log.error('Analysis error:', error);
    return reply.code(500).send({ error: 'Analysis failed', details: error.message });
  }
});

const start = async () => {
  try {
    await fastify.listen({ port: 8001, host: '0.0.0.0' });
    fastify.log.info('Server listening on port 8001');
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();