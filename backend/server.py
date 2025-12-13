from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import re
from pathlib import Path
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, timezone
from emergentintegrations.llm.chat import LlmChat, UserMessage
import json

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")

class WalletInput(BaseModel):
    address: str
    age_days: int
    tx_count: int

class GitHubInput(BaseModel):
    username: Optional[str] = None
    account_age_days: Optional[int] = None
    public_repos: Optional[int] = None
    total_commits_estimate: Optional[int] = None

class ProblemSolvingInput(BaseModel):
    platform: Optional[str] = None
    username: Optional[str] = None
    account_age_days: Optional[int] = None
    total_solved: Optional[int] = None
    easy: Optional[int] = None
    medium: Optional[int] = None
    hard: Optional[int] = None

class ReputationRequest(BaseModel):
    wallet: WalletInput
    github: GitHubInput
    problem_solving: ProblemSolvingInput

class ReputationResponse(BaseModel):
    wallet_address: str
    calculated_scores: dict
    analysis: dict
    timestamp: str

def calculate_wallet_score(wallet: WalletInput) -> float:
    age_score = min(wallet.age_days / 365, 1.0) * 30
    tx_score = min(wallet.tx_count / 1000, 1.0) * 20
    return round(age_score + tx_score, 2)

def calculate_github_score(github: GitHubInput) -> float:
    if not github.username:
        return 0.0
    age_score = min((github.account_age_days or 0) / 365, 1.0) * 15
    repo_score = min((github.public_repos or 0) / 50, 1.0) * 10
    commit_score = min((github.total_commits_estimate or 0) / 1000, 1.0) * 25
    return round(age_score + repo_score + commit_score, 2)

def calculate_problem_solving_score(ps: ProblemSolvingInput) -> float:
    if not ps.platform:
        return 0.0
    age_score = min((ps.account_age_days or 0) / 365, 1.0) * 10
    total_score = min((ps.total_solved or 0) / 500, 1.0) * 15
    difficulty_bonus = 0
    if ps.hard and ps.hard > 0:
        difficulty_bonus = min(ps.hard / 50, 1.0) * 10
    return round(age_score + total_score + difficulty_bonus, 2)

def calculate_consistency_score(wallet: WalletInput, github: GitHubInput, ps: ProblemSolvingInput) -> float:
    ages = [wallet.age_days]
    if github.account_age_days:
        ages.append(github.account_age_days)
    if ps.account_age_days:
        ages.append(ps.account_age_days)
    if len(ages) < 2:
        return 5.0
    max_diff = max(ages) - min(ages)
    consistency = max(0, 1 - (max_diff / 730))
    return round(consistency * 10, 2)

async def get_llm_analysis(data: dict) -> dict:
    system_prompt = """You are the core Reputation Reasoning Agent for an on-chain reputation system.

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

Be conservative, cautious, and factual. Do NOT hallucinate missing data."""
    
    api_key = os.environ.get('EMERGENT_LLM_KEY')
    chat = LlmChat(
        api_key=api_key,
        session_id=f"reputation_{data['wallet']['address']}",
        system_message=system_prompt
    )
    chat.with_model("openai", "gpt-4o")
    
    user_message = UserMessage(text=json.dumps(data))
    response = await chat.send_message(user_message)
    
    # Handle different response types
    logger.info(f"LLM Response type: {type(response)}")
    logger.info(f"LLM Response: {response}")
    
    # Try to extract JSON from response
    if isinstance(response, dict):
        return response
    elif isinstance(response, str):
        # Try to parse as JSON
        try:
            return json.loads(response)
        except json.JSONDecodeError:
            # If it's not valid JSON, try to extract JSON from markdown code blocks
            import re
            json_match = re.search(r'```(?:json)?\s*(\{.*?\})\s*```', response, re.DOTALL)
            if json_match:
                return json.loads(json_match.group(1))
            # Try to find JSON object in the response
            json_match = re.search(r'\{.*\}', response, re.DOTALL)
            if json_match:
                return json.loads(json_match.group(0))
            raise ValueError(f"Could not parse JSON from response: {response}")
    elif hasattr(response, 'text'):
        return json.loads(response.text)
    elif hasattr(response, 'content'):
        return json.loads(response.content)
    else:
        raise ValueError(f"Unexpected response type: {type(response)}")

@api_router.post("/analyze", response_model=ReputationResponse)
async def analyze_reputation(req: ReputationRequest):
    wallet_score = calculate_wallet_score(req.wallet)
    github_score = calculate_github_score(req.github)
    ps_score = calculate_problem_solving_score(req.problem_solving)
    consistency_score = calculate_consistency_score(req.wallet, req.github, req.problem_solving)
    final_score = wallet_score + github_score + ps_score + consistency_score
    
    input_data = {
        "wallet": req.wallet.model_dump(),
        "github": req.github.model_dump(),
        "problem_solving": req.problem_solving.model_dump(),
        "calculated_scores": {
            "wallet_score": wallet_score,
            "github_score": github_score,
            "problem_solving_score": ps_score,
            "consistency_score": consistency_score,
            "final_score": final_score
        }
    }
    
    analysis = await get_llm_analysis(input_data)
    
    result = {
        "wallet_address": req.wallet.address,
        "calculated_scores": input_data["calculated_scores"],
        "analysis": analysis,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    
    await db.reputation_analyses.insert_one({
        **result,
        "_timestamp_store": result["timestamp"]
    })
    
    return result

@api_router.get("/")
async def root():
    return {"message": "Reputation System API"}

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()