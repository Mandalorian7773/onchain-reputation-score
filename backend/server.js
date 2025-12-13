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
    console.error('LeetCode fetch error:', error);
    fastify.log.error('LeetCode fetch error:', error);
    return { username, platform: 'leetcode', found: false, error: error.message };
  }
}

// Fetch Codeforces data
async function fetchCodeforcesData(username) {
  if (!username) return null;
  
  try {
    const userResponse = await axios.get(`https://codeforces.com/api/user.info?handles=${username}`);
    const submissionsResponse = await axios.get(`https://codeforces.com/api/user.status?handle=${username}&from=1&count=10000`);
    
    if (userResponse.data.status !== 'OK') {
      return { username, platform: 'codeforces', found: false, error: 'User not found' };
    }
    
    const user = userResponse.data.result[0];
    const submissions = submissionsResponse.data.result || [];
    
    // Count unique solved problems
    const solvedProblems = new Set();
    submissions.forEach(sub => {
      if (sub.verdict === 'OK') {
        solvedProblems.add(`${sub.problem.contestId}-${sub.problem.index}`);
      }
    });
    
    // Estimate account age from registration time
    const registrationTime = user.registrationTimeSeconds * 1000;
    const ageDays = Math.floor((Date.now() - registrationTime) / 86400000);
    
    // Codeforces doesn't have easy/medium/hard but has rating ranges
    // Approximate: <1200 = easy, 1200-1900 = medium, >1900 = hard
    let easy = 0, medium = 0, hard = 0;
    submissions.forEach(sub => {
      if (sub.verdict === 'OK' && sub.problem.rating) {
        if (sub.problem.rating < 1200) easy++;
        else if (sub.problem.rating <= 1900) medium++;
        else hard++;
      }
    });
    
    return {
      platform: 'codeforces',
      username,
      account_age_days: ageDays,
      total_solved: solvedProblems.size,
      easy: Math.floor(easy / 3), // Approximate unique problems
      medium: Math.floor(medium / 3),
      hard: Math.floor(hard / 3),
      rating: user.rating || 0,
      max_rating: user.maxRating || 0,
      found: true
    };
  } catch (error) {
    console.error('Codeforces fetch error:', error);
    fastify.log.error('Codeforces fetch error:', error);
    return { username, platform: 'codeforces', found: false, error: error.message };
  }
}

// Fetch CodeChef data
async function fetchCodeChefData(username) {
  if (!username) return null;
  
  try {
    // CodeChef doesn't have a public API, so we'll scrape the public profile
    const response = await axios.get(`https://www.codechef.com/users/${username}`, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    
    const html = response.data;
    
    // Extract rating
    const ratingMatch = html.match(/rating-number">(\d+)/);
    const rating = ratingMatch ? parseInt(ratingMatch[1]) : 0;
    
    // Extract problems solved
    const solvedMatch = html.match(/Problems Solved.*?(\d+)/s);
    const totalSolved = solvedMatch ? parseInt(solvedMatch[1]) : 0;
    
    // Estimate account age (CodeChef doesn't expose this easily)
    const estimatedAgeDays = Math.max(Math.floor(totalSolved / 50 * 365), 30);
    
    // Estimate difficulty distribution based on rating
    let easy = 0, medium = 0, hard = 0;
    if (rating < 1400) {
      easy = Math.floor(totalSolved * 0.6);
      medium = Math.floor(totalSolved * 0.3);
      hard = Math.floor(totalSolved * 0.1);
    } else if (rating < 1800) {
      easy = Math.floor(totalSolved * 0.3);
      medium = Math.floor(totalSolved * 0.5);
      hard = Math.floor(totalSolved * 0.2);
    } else {
      easy = Math.floor(totalSolved * 0.2);
      medium = Math.floor(totalSolved * 0.4);
      hard = Math.floor(totalSolved * 0.4);
    }
    
    return {
      platform: 'codechef',
      username,
      account_age_days: estimatedAgeDays,
      total_solved: totalSolved,
      easy,
      medium,
      hard,
      rating,
      found: true
    };
  } catch (error) {
    console.error('CodeChef fetch error:', error);
    fastify.log.error('CodeChef fetch error:', error);
    return { username, platform: 'codechef', found: false, error: error.message };
  }
}

// Fetch Kaggle data
async function fetchKaggleData(username) {
  if (!username) return null;
  
  try {
    const response = await axios.get(`https://www.kaggle.com/${username}`, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    
    const html = response.data;
    
    // Extract tier/rank
    const tierMatch = html.match(/Tier:\s*([^<]+)/i) || html.match(/Ranking:\s*([^<]+)/i);
    const tier = tierMatch ? tierMatch[1].trim() : 'Novice';
    
    // Extract competitions
    const competitionsMatch = html.match(/competitions?[^>]*>(\d+)/i);
    const competitions = competitionsMatch ? parseInt(competitionsMatch[1]) : 0;
    
    // Extract datasets
    const datasetsMatch = html.match(/datasets?[^>]*>(\d+)/i);
    const datasets = datasetsMatch ? parseInt(datasetsMatch[1]) : 0;
    
    // Extract notebooks
    const notebooksMatch = html.match(/notebooks?[^>]*>(\d+)/i);
    const notebooks = notebooksMatch ? parseInt(notebooksMatch[1]) : 0;
    
    // Calculate total activity
    const totalActivity = competitions * 3 + datasets * 2 + notebooks;
    
    // Estimate account age
    const estimatedAgeDays = Math.max(Math.floor(totalActivity / 20 * 365), 30);
    
    // Map to problem-solving equivalent
    const totalSolved = competitions * 10 + datasets * 5 + notebooks * 2;
    
    return {
      platform: 'kaggle',
      username,
      account_age_days: estimatedAgeDays,
      total_solved: totalSolved,
      competitions,
      datasets,
      notebooks,
      tier,
      found: true
    };
  } catch (error) {
    console.error('Kaggle fetch error:', error);
    fastify.log.error('Kaggle fetch error:', error);
    return { username, platform: 'kaggle', found: false, error: error.message };
  }
}

// Unified problem-solving data fetcher
async function fetchProblemSolvingData(platform, username) {
  if (!platform || !username) return null;
  
  switch (platform.toLowerCase()) {
    case 'leetcode':
      return fetchLeetCodeData(username);
    case 'codeforces':
      return fetchCodeforcesData(username);
    case 'codechef':
      return fetchCodeChefData(username);
    case 'kaggle':
      return fetchKaggleData(username);
    default:
      return { platform, username, found: false, error: 'Unsupported platform' };
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

function evaluateLeetCodeSignal(problemSolvingData) {
  if (!problemSolvingData?.found) return 'missing';
  
  const platform = problemSolvingData.platform;
  const totalSolved = problemSolvingData.total_solved || 0;
  
  // Platform-specific evaluation
  if (platform === 'leetcode') {
    const hard = problemSolvingData.hard || 0;
    if (totalSolved >= 200 && hard >= 20) return 'strong';
    if (totalSolved >= 100 && hard >= 10) return 'medium';
    if (totalSolved >= 30) return 'weak';
  } else if (platform === 'codeforces') {
    const rating = problemSolvingData.rating || 0;
    if (rating >= 1900 && totalSolved >= 100) return 'strong';
    if (rating >= 1400 && totalSolved >= 50) return 'medium';
    if (totalSolved >= 20) return 'weak';
  } else if (platform === 'codechef') {
    const rating = problemSolvingData.rating || 0;
    if (rating >= 1800 && totalSolved >= 150) return 'strong';
    if (rating >= 1400 && totalSolved >= 75) return 'medium';
    if (totalSolved >= 30) return 'weak';
  } else if (platform === 'kaggle') {
    const competitions = problemSolvingData.competitions || 0;
    if (competitions >= 10 && totalSolved >= 100) return 'strong';
    if (competitions >= 5 && totalSolved >= 50) return 'medium';
    if (totalSolved >= 20) return 'weak';
  }
  
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

function detectAnomalies(wallet, github, problemSolvingData) {
  const anomalies = [];
  
  // Very new wallet with high activity
  if (wallet?.found && wallet.age_days < 30 && wallet.tx_count > 500) {
    anomalies.push('new wallet with unusually high transaction count');
  }
  
  // Very new GitHub with many repos
  if (github?.found && github.account_age_days < 90 && github.public_repos > 50) {
    anomalies.push('new GitHub account with unusually high repository count');
  }
  
  // Suspicious problem-solving platform pattern
  if (problemSolvingData?.found && problemSolvingData.account_age_days < 90 && problemSolvingData.total_solved > 300) {
    anomalies.push(`recent ${problemSolvingData.platform} account with unusually high solve count`);
  }
  
  // Inconsistent account ages
  const ages = [];
  if (wallet?.found) ages.push({ name: 'wallet', age: wallet.age_days });
  if (github?.found) ages.push({ name: 'github', age: github.account_age_days });
  if (problemSolvingData?.found) ages.push({ name: problemSolvingData.platform, age: problemSolvingData.account_age_days });
  
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

function generateReasoning(signals, anomalies, wallet, github, problemSolvingData) {
  const reasoning = [];
  
  const presentSignals = [];
  if (wallet?.found) presentSignals.push('wallet');
  if (github?.found) presentSignals.push('GitHub');
  if (problemSolvingData?.found) presentSignals.push(problemSolvingData.platform);
  
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

function generateNotes(wallet, github, problemSolvingData) {
  const notes = [];
  
  if (wallet?.found && wallet.tx_count === 0) {
    notes.push('Wallet has no transactions on Polygon network');
  }
  
  if (github?.found && github.total_commits_estimate === 0) {
    notes.push('GitHub activity detected but commit count estimation unavailable');
  }
  
  if (problemSolvingData?.found) {
    const platform = problemSolvingData.platform;
    
    if (platform === 'leetcode') {
      const difficulty_ratio = problemSolvingData.hard / Math.max(problemSolvingData.total_solved, 1);
      if (difficulty_ratio > 0.3) {
        notes.push('High proportion of hard problems solved indicates strong algorithmic skills');
      }
    } else if (platform === 'codeforces') {
      if (problemSolvingData.rating >= 2100) {
        notes.push('Codeforces Master or higher rating indicates exceptional competitive programming skills');
      }
    } else if (platform === 'codechef') {
      if (problemSolvingData.rating >= 2000) {
        notes.push('CodeChef 5-star or higher rating indicates strong problem-solving abilities');
      }
    } else if (platform === 'kaggle') {
      if (problemSolvingData.competitions >= 10) {
        notes.push('Active Kaggle competition participation demonstrates practical data science skills');
      }
    }
  }
  
  if (!wallet?.found && !github?.found && !problemSolvingData?.found) {
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
  const { wallet_address, github_username, problem_solving_platform, problem_solving_username } = request.body;
  
  if (!wallet_address && !github_username && !problem_solving_username) {
    return reply.code(400).send({ error: 'At least one input required' });
  }
  
  try {
    // Fetch data in parallel
    const [walletData, githubData, problemSolvingData] = await Promise.all([
      wallet_address ? fetchWalletData(wallet_address) : Promise.resolve(null),
      github_username ? fetchGitHubData(github_username) : Promise.resolve(null),
      problem_solving_username ? fetchProblemSolvingData(problem_solving_platform || 'leetcode', problem_solving_username) : Promise.resolve(null)
    ]);
    
    // Calculate scores
    const scores = calculateScores(walletData, githubData, problemSolvingData);
    
    // Prepare data for AI
    const analysisInput = {
      wallet: walletData || { found: false },
      github: githubData || { found: false },
      problem_solving: problemSolvingData || { found: false },
      calculated_scores: scores
    };
    
    // Get deterministic reasoning analysis
    const aiAnalysis = performReasoningAnalysis(walletData, githubData, problemSolvingData, scores);
    
    return {
      wallet_address: wallet_address || null,
      github_username: github_username || null,
      problem_solving_platform: problem_solving_platform || 'leetcode',
      problem_solving_username: problem_solving_username || null,
      fetched_data: {
        wallet: walletData,
        github: githubData,
        problem_solving: problemSolvingData
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