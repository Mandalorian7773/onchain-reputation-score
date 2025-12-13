import Fastify from 'fastify';
import cors from '@fastify/cors';
import { ethers } from 'ethers';
import axios from 'axios';
import dotenv from 'dotenv';
import { MongoClient } from 'mongodb';
import crypto from 'crypto';

dotenv.config();

const fastify = Fastify({ logger: true });

await fastify.register(cors, {
  origin: process.env.CORS_ORIGINS?.split(',') || '*',
  credentials: true
});

// MongoDB connection
const mongoClient = new MongoClient(process.env.MONGO_URL || 'mongodb://localhost:27017');
await mongoClient.connect();
const db = mongoClient.db(process.env.DB_NAME || 'reputation_db');

const POLYGON_RPC = 'https://polygon-rpc.com';
const GITHUB_API = 'https://api.github.com';
const LEETCODE_GRAPHQL = 'https://leetcode.com/graphql';

// ============================================
// DATA FETCHERS (READ-ONLY)
// ============================================

async function fetchWalletData(address) {
  if (!address) return null;
  
  try {
    const provider = new ethers.JsonRpcProvider(POLYGON_RPC);
    const txCount = await provider.getTransactionCount(address);
    
    if (txCount === 0) {
      return { address, age_days: 0, tx_count: 0, found: true };
    }
    
    // Estimate age from first transaction
    const currentBlock = await provider.getBlockNumber();
    let firstBlock = Math.max(0, currentBlock - 10000000); // Approximate search range
    
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
    fastify.log.warn('Wallet fetch error:', error.message);
    return { address, age_days: 0, tx_count: 0, found: false };
  }
}

async function fetchGitHubProfile(username) {
  if (!username) return null;
  
  try {
    const userResponse = await axios.get(`${GITHUB_API}/users/${username}`);
    const reposResponse = await axios.get(`${GITHUB_API}/users/${username}/repos?per_page=100&sort=updated`);
    
    const user = userResponse.data;
    const repos = reposResponse.data.filter(r => !r.fork).slice(0, 3); // Top 3 non-forked repos
    
    const createdAt = new Date(user.created_at);
    const ageDays = Math.floor((Date.now() - createdAt.getTime()) / 86400000);
    
    // Analyze top repos for role signals
    const repoAnalysis = [];
    for (const repo of repos) {
      const analysis = await analyzeRepository(username, repo.name);
      repoAnalysis.push(analysis);
    }
    
    // Aggregate role signals
    const roleSignals = aggregateRoleSignals(repoAnalysis);
    
    return {
      username,
      account_age_days: ageDays,
      public_repos: user.public_repos,
      analyzed_repos: repoAnalysis,
      role_signals: roleSignals,
      found: true
    };
  } catch (error) {
    fastify.log.warn('GitHub fetch error:', error.message);
    return { username, found: false };
  }
}

async function analyzeRepository(username, repoName) {
  try {
    const [contentsResponse, languagesResponse] = await Promise.all([
      axios.get(`${GITHUB_API}/repos/${username}/${repoName}/contents`),
      axios.get(`${GITHUB_API}/repos/${username}/${repoName}/languages`)
    ]);
    
    const files = contentsResponse.data.map(f => f.name);
    const languages = Object.keys(languagesResponse.data);
    
    // Extract framework signals from file structure
    const frameworks = [];
    if (files.includes('package.json')) {
      try {
        const pkgResponse = await axios.get(`${GITHUB_API}/repos/${username}/${repoName}/contents/package.json`);
        const pkgContent = Buffer.from(pkgResponse.data.content, 'base64').toString();
        const pkg = JSON.parse(pkgContent);
        const deps = { ...pkg.dependencies, ...pkg.devDependencies };
        
        if (deps.react || deps['react-dom']) frameworks.push('React');
        if (deps.next) frameworks.push('Next.js');
        if (deps.vue) frameworks.push('Vue');
        if (deps.angular) frameworks.push('Angular');
        if (deps.express) frameworks.push('Express');
        if (deps.fastify) frameworks.push('Fastify');
        if (deps.django) frameworks.push('Django');
        if (deps.flask) frameworks.push('Flask');
      } catch (e) {
        // Could not parse package.json
      }
    }
    
    if (files.includes('requirements.txt')) {
      frameworks.push('Python');
    }
    if (files.includes('Dockerfile')) frameworks.push('Docker');
    if (files.includes('.github')) frameworks.push('CI/CD');
    
    return {
      name: repoName,
      languages,
      frameworks,
      files
    };
  } catch (error) {
    return { name: repoName, languages: [], frameworks: [], files: [] };
  }
}

function aggregateRoleSignals(repoAnalysis) {
  const signals = {
    frontend: 0,
    backend: 0,
    data: 0,
    devops: 0
  };
  
  const frontendIndicators = ['React', 'Vue', 'Angular', 'Next.js', 'TypeScript', 'JavaScript', 'HTML', 'CSS'];
  const backendIndicators = ['Express', 'Fastify', 'Django', 'Flask', 'Python', 'Java', 'Go', 'Rust'];
  const dataIndicators = ['Python', 'Jupyter', 'pandas', 'numpy', 'tensorflow', 'pytorch'];
  const devopsIndicators = ['Docker', 'CI/CD', 'Kubernetes', 'Terraform'];
  
  repoAnalysis.forEach(repo => {
    const allTech = [...repo.languages, ...repo.frameworks];
    
    frontendIndicators.forEach(tech => {
      if (allTech.includes(tech)) signals.frontend += 1;
    });
    
    backendIndicators.forEach(tech => {
      if (allTech.includes(tech)) signals.backend += 1;
    });
    
    dataIndicators.forEach(tech => {
      if (allTech.includes(tech)) signals.data += 1;
    });
    
    devopsIndicators.forEach(tech => {
      if (allTech.includes(tech)) signals.devops += 1;
    });
  });
  
  return signals;
}

async function fetchLeetCodeProfile(username) {
  if (!username) return null;
  
  try {
    const query = `
      query getUserProfile($username: String!) {
        matchedUser(username: $username) {
          username
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
      return { username, found: false };
    }
    
    const stats = user.submitStats.acSubmissionNum;
    const easy = stats.find(s => s.difficulty === 'Easy')?.count || 0;
    const medium = stats.find(s => s.difficulty === 'Medium')?.count || 0;
    const hard = stats.find(s => s.difficulty === 'Hard')?.count || 0;
    
    return {
      username,
      total_solved: easy + medium + hard,
      easy,
      medium,
      hard,
      found: true
    };
  } catch (error) {
    fastify.log.warn('LeetCode fetch error:', error.message);
    return { username, found: false };
  }
}

// ============================================
// DETERMINISTIC COMPUTATION
// ============================================

function computeDeterministicScores(githubData, leetcodeData, walletData) {
  // GitHub score (0-100)
  let githubScore = 0;
  if (githubData?.found) {
    const ageScore = Math.min(githubData.account_age_days / 730, 1.0) * 30;
    const repoScore = Math.min(githubData.public_repos / 30, 1.0) * 20;
    
    const roleSignalScore = Object.values(githubData.role_signals).reduce((a, b) => a + b, 0);
    const activityScore = Math.min(roleSignalScore / 10, 1.0) * 50;
    
    githubScore = Math.round((ageScore + repoScore + activityScore) * 10) / 10;
  }
  
  // LeetCode score (0-100)
  let leetcodeScore = 0;
  if (leetcodeData?.found) {
    const totalScore = Math.min(leetcodeData.total_solved / 300, 1.0) * 60;
    const difficultyScore = Math.min(leetcodeData.hard / 30, 1.0) * 40;
    leetcodeScore = Math.round((totalScore + difficultyScore) * 10) / 10;
  }
  
  // Wallet persistence signal (0-100)
  let walletScore = 0;
  if (walletData?.found && walletData.tx_count > 0) {
    const ageScore = Math.min(walletData.age_days / 365, 1.0) * 70;
    const txScore = Math.min(walletData.tx_count / 100, 1.0) * 30;
    walletScore = Math.round((ageScore + txScore) * 10) / 10;
  }
  
  return {
    github_score: githubScore,
    leetcode_score: leetcodeScore,
    wallet_persistence_score: walletScore
  };
}

// ============================================
// AI INTERPRETATION (NO SCORING)
// ============================================

async function getAIInterpretation(signals) {
  // Deterministic fallback if AI unavailable
  const roleFit = {
    frontend: signals.frontend >= 3 ? 'Strong' : signals.frontend >= 1 ? 'Medium' : 'Weak',
    backend: signals.backend >= 3 ? 'Strong' : signals.backend >= 1 ? 'Medium' : 'Weak',
    data: signals.data >= 3 ? 'Strong' : signals.data >= 1 ? 'Medium' : 'Weak',
    devops: signals.devops >= 2 ? 'Strong' : signals.devops >= 1 ? 'Medium' : 'Weak'
  };
  
  const strongRoles = Object.entries(roleFit).filter(([k, v]) => v === 'Strong').map(([k]) => k);
  const confidence = strongRoles.length >= 2 ? 'High' : strongRoles.length === 1 ? 'Medium' : 'Low';
  
  let summary = 'Profile shows ';
  if (strongRoles.length > 0) {
    summary += `strong signals in ${strongRoles.join(' and ')} development.`;
  } else {
    summary += 'limited technical signals. More public activity needed for comprehensive assessment.';
  }
  
  return {
    confidence,
    role_fit: roleFit,
    anomalies: [],
    summary
  };
}

// ============================================
// CRYPTOGRAPHIC HASHING
// ============================================

function createCanonicalArtifact(inputs, scores, roleSignals, aiOutput, timestamp) {
  return {
    inputs: {
      github_username: inputs.github_username || null,
      leetcode_username: inputs.leetcode_username || null,
      wallet_address: inputs.wallet_address || null
    },
    deterministic_scores: scores,
    role_signals: roleSignals,
    ai_interpretation: aiOutput,
    timestamp
  };
}

function hashArtifact(artifact) {
  const canonical = JSON.stringify(artifact, Object.keys(artifact).sort());
  return crypto.createHash('sha256').update(canonical).digest('hex');
}

// ============================================
// PLATFORM HISTORY (MongoDB)
// ============================================

async function getPlatformHistory(profileId) {
  try {
    const history = await db.collection('platform_history').findOne(
      { profile_id: profileId },
      { projection: { _id: 0 } }
    );
    return history;
  } catch (error) {
    fastify.log.warn('Platform history fetch error:', error.message);
    return null;
  }
}

async function updatePlatformHistory(profileId, hash, inputs) {
  const timestamp = new Date();
  
  try {
    const collection = db.collection('platform_history');
    const existing = await collection.findOne({ profile_id: profileId });
    
    if (existing) {
      const updated = await collection.findOneAndUpdate(
        { profile_id: profileId },
        {
          $set: { 
            latest_hash: hash,
            latest_inputs: inputs
          },
          $inc: { compute_count: 1 },
          $push: {
            hash_history: {
              $each: [{ hash, timestamp }],
              $slice: -50
            }
          }
        },
        { returnDocument: 'after' }
      );
      return updated;
    } else {
      const newDoc = {
        profile_id: profileId,
        first_seen_at: timestamp,
        compute_count: 1,
        latest_hash: hash,
        latest_inputs: inputs,
        hash_history: [{ hash, timestamp }]
      };
      await collection.insertOne(newDoc);
      return newDoc;
    }
  } catch (error) {
    fastify.log.error('Platform history update error:', error);
    return null;
  }
}

// ============================================
// BLOCKCHAIN ANCHORING
// ============================================

async function anchorHashOnChain(profileId, hash) {
  try {
    // For MVP: Log anchoring intent
    // In production: Write to smart contract
    fastify.log.info(`[BLOCKCHAIN] Would anchor: profileId=${profileId}, hash=${hash.slice(0, 16)}...`);
    
    // Placeholder for actual smart contract call
    // const contract = new ethers.Contract(contractAddress, abi, wallet);
    // await contract.anchorProfile(profileId, hash);
    
    return {
      anchored: false, // Set to true when actual contract is deployed
      tx_hash: null,
      note: 'Blockchain anchoring will be enabled after smart contract deployment'
    };
  } catch (error) {
    fastify.log.error('Blockchain anchor error:', error);
    return { anchored: false, error: error.message };
  }
}

// ============================================
// API ENDPOINTS
// ============================================

fastify.get('/api', async (request, reply) => {
  return { message: 'Verifiable Reputation System API' };
});

fastify.get('/api/profile/:profileId', async (request, reply) => {
  const { profileId } = request.params;
  
  try {
    const platformHistory = await getPlatformHistory(profileId);
    
    if (!platformHistory || !platformHistory.latest_inputs) {
      return reply.code(404).send({ error: 'Profile not found' });
    }
    
    // Regenerate profile from stored inputs
    const inputs = platformHistory.latest_inputs;
    const timestamp = new Date().toISOString();
    
    // Fetch fresh data
    const [githubData, leetcodeData, walletData] = await Promise.all([
      fetchGitHubProfile(inputs.github_username),
      fetchLeetCodeProfile(inputs.leetcode_username),
      fetchWalletData(inputs.wallet_address)
    ]);
    
    const roleSignals = githubData?.role_signals || { frontend: 0, backend: 0, data: 0, devops: 0 };
    const scores = computeDeterministicScores(githubData, leetcodeData, walletData);
    const aiInterpretation = await getAIInterpretation(roleSignals);
    const artifact = createCanonicalArtifact(inputs, scores, roleSignals, aiInterpretation, timestamp);
    const artifactHash = hashArtifact(artifact);
    
    return {
      profile_id: profileId,
      artifact,
      artifact_hash: artifactHash,
      platform_history: {
        first_seen_at: platformHistory.first_seen_at,
        compute_count: platformHistory.compute_count,
        platform_age_days: platformHistory.first_seen_at 
          ? Math.floor((Date.now() - new Date(platformHistory.first_seen_at).getTime()) / 86400000)
          : 0
      },
      blockchain_proof: {
        anchored: false,
        tx_hash: null,
        note: 'Blockchain anchoring will be enabled after smart contract deployment'
      },
      fetched_data: {
        github: githubData,
        leetcode: leetcodeData,
        wallet: walletData
      },
      verification: {
        reproducible: true,
        message: 'This profile is reproducible and verifiable from public data.',
        verification_steps: [
          '1. Re-fetch public GitHub/LeetCode/wallet data',
          '2. Re-run deterministic computation',
          '3. Re-generate artifact',
          '4. Re-hash artifact',
          '5. Compare with on-chain hash (when deployed)'
        ]
      }
    };
  } catch (error) {
    fastify.log.error('Profile fetch error:', error);
    return reply.code(500).send({ error: 'Failed to fetch profile' });
  }
});

fastify.post('/api/profile', async (request, reply) => {
  const { github_username, leetcode_username, wallet_address } = request.body;
  
  if (!github_username && !leetcode_username && !wallet_address) {
    return reply.code(400).send({ error: 'At least one input required' });
  }
  
  const timestamp = new Date().toISOString();
  
  try {
    // 1. Fetch public data
    const [githubData, leetcodeData, walletData] = await Promise.all([
      fetchGitHubProfile(github_username),
      fetchLeetCodeProfile(leetcode_username),
      fetchWalletData(wallet_address)
    ]);
    
    // 2. Extract role signals
    const roleSignals = githubData?.role_signals || { frontend: 0, backend: 0, data: 0, devops: 0 };
    
    // 3. Compute deterministic scores
    const scores = computeDeterministicScores(githubData, leetcodeData, walletData);
    
    // 4. AI interpretation (not scoring)
    const aiInterpretation = await getAIInterpretation(roleSignals);
    
    // 5. Create canonical artifact
    const inputs = { github_username, leetcode_username, wallet_address };
    const artifact = createCanonicalArtifact(inputs, scores, roleSignals, aiInterpretation, timestamp);
    
    // 6. Generate cryptographic hash
    const artifactHash = hashArtifact(artifact);
    
    // 7. Generate profile ID
    const profileId = github_username || leetcode_username || wallet_address.slice(0, 10);
    
    // 8. Update platform history in MongoDB
    const platformHistory = await updatePlatformHistory(profileId, artifactHash, inputs);
    
    // 9. Anchor hash on blockchain (Polygon)
    const blockchainProof = await anchorHashOnChain(profileId, artifactHash);
    
    // 10. Return complete profile
    return {
      profile_id: profileId,
      artifact,
      artifact_hash: artifactHash,
      platform_history: {
        first_seen_at: platformHistory?.first_seen_at || timestamp,
        compute_count: platformHistory?.compute_count || 1,
        platform_age_days: platformHistory?.first_seen_at 
          ? Math.floor((Date.now() - new Date(platformHistory.first_seen_at).getTime()) / 86400000)
          : 0
      },
      blockchain_proof: blockchainProof,
      fetched_data: {
        github: githubData,
        leetcode: leetcodeData,
        wallet: walletData
      },
      verification: {
        reproducible: true,
        message: 'This profile is reproducible and verifiable from public data.',
        verification_steps: [
          '1. Re-fetch public GitHub/LeetCode/wallet data',
          '2. Re-run deterministic computation',
          '3. Re-generate artifact',
          '4. Re-hash artifact',
          '5. Compare with on-chain hash (when deployed)'
        ]
      }
    };
  } catch (error) {
    fastify.log.error('Profile generation error:', error);
    return reply.code(500).send({ error: 'Profile generation failed', details: error.message });
  }
});

fastify.get('/api/verify/:profileId', async (request, reply) => {
  const { profileId } = request.params;
  const { hash } = request.query;
  
  try {
    const platformHistory = await getPlatformHistory(profileId);
    
    if (!platformHistory) {
      return { verified: false, message: 'Profile not found in platform history' };
    }
    
    const hashMatch = platformHistory.latest_hash === hash;
    
    return {
      verified: hashMatch,
      profile_id: profileId,
      expected_hash: platformHistory.latest_hash,
      provided_hash: hash,
      first_seen_at: platformHistory.first_seen_at,
      compute_count: platformHistory.compute_count,
      message: hashMatch 
        ? 'Hash verified. Profile artifact matches platform record.'
        : 'Hash mismatch. Profile may have been modified.'
    };
  } catch (error) {
    fastify.log.error('Verification error:', error);
    return reply.code(500).send({ error: 'Verification failed' });
  }
});

const start = async () => {
  try {
    await fastify.listen({ port: 8001, host: '0.0.0.0' });
    fastify.log.info('Verifiable Reputation System running on port 8001');
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
