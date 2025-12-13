import Fastify from 'fastify';
import cors from '@fastify/cors';
import { ethers } from 'ethers';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const fastify = Fastify({ logger: true });

await fastify.register(cors, {
  origin: process.env.CORS_ORIGINS?.split(',') || '*',
  credentials: true
});

const POLYGON_RPC = 'https://polygon-rpc.com';
const GITHUB_API = 'https://api.github.com';
const LEETCODE_GRAPHQL = 'https://leetcode.com/graphql';

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
    console.error('Polygon fetch error:', error);
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

// Deterministic AI-style reasoning analysis
function performReasoningAnalysis(walletData, githubData, leetcodeData, scores) {
  const signals = {
    wallet: evaluateWalletSignal(walletData),
    github: evaluateGitHubSignal(githubData),
    problem_solving: evaluateLeetCodeSignal(leetcodeData),
    consistency: evaluateConsistency(walletData, githubData, leetcodeData)
  };
  
  const anomalies = detectAnomalies(walletData, githubData, leetcodeData);
  const confidence = deriveConfidence(signals, anomalies);
  const reasoning = generateReasoning(signals, anomalies, walletData, githubData, leetcodeData);
  const notes = generateNotes(walletData, githubData, leetcodeData);
  
  return {
    confidence_level: confidence,
    signal_strength: signals,
    anomalies_detected: anomalies,
    confidence_reasoning: reasoning,
    notes: notes
  };
}

function evaluateWalletSignal(wallet) {
  if (!wallet?.found) return 'missing';
  if (wallet.age_days >= 365 && wallet.tx_count >= 100) return 'strong';
  if (wallet.age_days >= 180 && wallet.tx_count >= 50) return 'medium';
  if (wallet.age_days >= 30 || wallet.tx_count >= 10) return 'weak';
  return 'weak';
}

function evaluateGitHubSignal(github) {
  if (!github?.found) return 'missing';
  if (github.account_age_days >= 730 && github.public_repos >= 20 && github.total_commits_estimate >= 200) return 'strong';
  if (github.account_age_days >= 365 && github.public_repos >= 10 && github.total_commits_estimate >= 50) return 'medium';
  if (github.account_age_days >= 180 || github.public_repos >= 5) return 'weak';
  return 'weak';
}

function evaluateLeetCodeSignal(leetcode) {
  if (!leetcode?.found) return 'missing';
  if (leetcode.total_solved >= 200 && leetcode.hard >= 20) return 'strong';
  if (leetcode.total_solved >= 100 && leetcode.hard >= 10) return 'medium';
  if (leetcode.total_solved >= 30) return 'weak';
  return 'weak';
}

function evaluateConsistency(wallet, github, leetcode) {
  const ages = [];
  if (wallet?.found) ages.push(wallet.age_days);
  if (github?.found) ages.push(github.account_age_days);
  if (leetcode?.found) ages.push(leetcode.account_age_days);
  
  if (ages.length < 2) return 'weak';
  
  const maxDiff = Math.max(...ages) - Math.min(...ages);
  if (maxDiff <= 180) return 'strong';
  if (maxDiff <= 365) return 'medium';
  return 'weak';
}

function detectAnomalies(wallet, github, leetcode) {
  const anomalies = [];
  
  // Very new wallet with high activity
  if (wallet?.found && wallet.age_days < 30 && wallet.tx_count > 500) {
    anomalies.push('new wallet with unusually high transaction count');
  }
  
  // Very new GitHub with many repos
  if (github?.found && github.account_age_days < 90 && github.public_repos > 50) {
    anomalies.push('new GitHub account with unusually high repository count');
  }
  
  // Suspicious LeetCode pattern
  if (leetcode?.found && leetcode.account_age_days < 90 && leetcode.total_solved > 300) {
    anomalies.push('recent LeetCode account with unusually high solve count');
  }
  
  // Inconsistent account ages
  const ages = [];
  if (wallet?.found) ages.push({ name: 'wallet', age: wallet.age_days });
  if (github?.found) ages.push({ name: 'github', age: github.account_age_days });
  if (leetcode?.found) ages.push({ name: 'leetcode', age: leetcode.account_age_days });
  
  if (ages.length >= 2) {
    const sorted = ages.sort((a, b) => a.age - b.age);
    const diff = sorted[sorted.length - 1].age - sorted[0].age;
    if (diff > 730) {
      anomalies.push(`significant age mismatch between accounts (${Math.round(diff / 365)} years difference)`);
    }
  }
  
  return anomalies;
}

function deriveConfidence(signals, anomalies) {
  const signalValues = Object.values(signals);
  const strongCount = signalValues.filter(s => s === 'strong').length;
  const mediumCount = signalValues.filter(s => s === 'medium').length;
  const missingCount = signalValues.filter(s => s === 'missing').length;
  
  if (anomalies.length > 0) return 'low';
  if (missingCount >= 3) return 'low';
  if (strongCount >= 2 && missingCount <= 1) return 'high';
  if (strongCount >= 1 || (mediumCount >= 2 && missingCount <= 1)) return 'medium';
  return 'low';
}

function generateReasoning(signals, anomalies, wallet, github, leetcode) {
  const reasoning = [];
  
  const presentSignals = [];
  if (wallet?.found) presentSignals.push('wallet');
  if (github?.found) presentSignals.push('GitHub');
  if (leetcode?.found) presentSignals.push('LeetCode');
  
  if (presentSignals.length === 0) {
    reasoning.push('No signals available for analysis');
    return reasoning;
  }
  
  if (presentSignals.length === 3) {
    reasoning.push('All three signal categories present');
  } else if (presentSignals.length === 2) {
    reasoning.push(`Two signal categories present: ${presentSignals.join(' and ')}`);
  } else {
    reasoning.push(`Only one signal category present: ${presentSignals[0]}`);
  }
  
  const strongSignals = Object.entries(signals).filter(([k, v]) => v === 'strong').map(([k]) => k);
  if (strongSignals.length > 0) {
    reasoning.push(`Strong signals detected in: ${strongSignals.join(', ')}`);
  }
  
  if (anomalies.length > 0) {
    reasoning.push(`${anomalies.length} anomaly(ies) detected requiring review`);
  }
  
  if (signals.consistency === 'strong') {
    reasoning.push('Account ages show strong consistency across platforms');
  } else if (signals.consistency === 'weak') {
    reasoning.push('Account ages show inconsistency across platforms');
  }
  
  return reasoning;
}

function generateNotes(wallet, github, leetcode) {
  const notes = [];
  
  if (wallet?.found && wallet.tx_count === 0) {
    notes.push('Wallet has no transactions on Polygon network');
  }
  
  if (github?.found && github.total_commits_estimate === 0) {
    notes.push('GitHub activity detected but commit count estimation unavailable');
  }
  
  if (leetcode?.found) {
    const difficulty_ratio = leetcode.hard / Math.max(leetcode.total_solved, 1);
    if (difficulty_ratio > 0.3) {
      notes.push('High proportion of hard problems solved indicates strong algorithmic skills');
    }
  }
  
  if (!wallet?.found && !github?.found && !leetcode?.found) {
    notes.push('Insufficient data to perform comprehensive reputation analysis');
  }
  
  return notes;
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