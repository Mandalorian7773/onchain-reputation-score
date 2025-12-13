import requests
import sys
import json
from datetime import datetime
import time

class VerifiableReputationTester:
    def __init__(self, base_url="https://reputation-agent.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []
        self.profile_hashes = {}

    def log_test(self, name, success, message="", response_data=None):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
        
        result = {
            "test": name,
            "status": "PASSED" if success else "FAILED",
            "message": message,
            "response_data": response_data if not success else None
        }
        self.test_results.append(result)
        
        status_icon = "✅" if success else "❌"
        print(f"\n{status_icon} {name}")
        if message:
            print(f"   {message}")
        if response_data and not success:
            print(f"   Response: {json.dumps(response_data, indent=2)[:500]}")

    def test_root_endpoint(self):
        """Test root API endpoint"""
        try:
            response = requests.get(f"{self.base_url}", timeout=10)
            success = response.status_code == 200
            data = response.json() if success else {}
            self.log_test(
                "Root Endpoint",
                success,
                f"Status: {response.status_code}, Response: {data}",
                data if not success else None
            )
            return success
        except Exception as e:
            self.log_test("Root Endpoint", False, f"Error: {str(e)}")
            return False

    def test_profile_no_inputs(self):
        """Test /api/profile with no inputs (should fail)"""
        payload = {}
        
        try:
            response = requests.post(
                f"{self.base_url}/profile",
                json=payload,
                headers={'Content-Type': 'application/json'},
                timeout=30
            )
            
            # Should return 400 for missing inputs
            success = response.status_code == 400
            data = response.json() if response.status_code in [400, 422] else response.text
            
            self.log_test(
                "Profile No Inputs (Validation)",
                success,
                f"Status: {response.status_code} (expected 400)",
                data if not success else None
            )
            return success
                
        except Exception as e:
            self.log_test("Profile No Inputs", False, f"Error: {str(e)}")
            return False

    def test_profile_github_only(self):
        """Test /api/profile with GitHub username only"""
        payload = {
            "github_username": "torvalds",
            "leetcode_username": None,
            "wallet_address": None
        }
        
        try:
            print("\n🔍 Testing /api/profile with GitHub only...")
            response = requests.post(
                f"{self.base_url}/profile",
                json=payload,
                headers={'Content-Type': 'application/json'},
                timeout=60
            )
            
            success = response.status_code == 200
            data = response.json() if response.status_code == 200 else response.text
            
            if success:
                # Validate response structure
                required_fields = ["profile_id", "artifact", "artifact_hash", "platform_history", "blockchain_proof", "verification"]
                missing_fields = [f for f in required_fields if f not in data]
                
                if missing_fields:
                    self.log_test(
                        "Profile GitHub Only",
                        False,
                        f"Missing fields: {missing_fields}",
                        data
                    )
                    return False
                
                # Validate artifact structure
                artifact = data.get("artifact", {})
                required_artifact_fields = ["inputs", "deterministic_scores", "role_signals", "ai_interpretation", "timestamp"]
                missing_artifact = [f for f in required_artifact_fields if f not in artifact]
                
                if missing_artifact:
                    self.log_test(
                        "Profile GitHub Only",
                        False,
                        f"Missing artifact fields: {missing_artifact}",
                        data
                    )
                    return False
                
                # Validate scores
                scores = artifact.get("deterministic_scores", {})
                if scores.get("github_score", 0) == 0:
                    self.log_test(
                        "Profile GitHub Only",
                        False,
                        "GitHub score is 0, expected > 0 for valid username",
                        data
                    )
                    return False
                
                # Store hash for deterministic test
                self.profile_hashes["github_torvalds"] = data.get("artifact_hash")
                
                self.log_test(
                    "Profile GitHub Only",
                    True,
                    f"Status: {response.status_code}, GitHub Score: {scores.get('github_score')}, Hash: {data.get('artifact_hash')[:16]}..."
                )
                return True
            else:
                self.log_test(
                    "Profile GitHub Only",
                    False,
                    f"Status: {response.status_code}",
                    data
                )
                return False
                
        except Exception as e:
            self.log_test("Profile GitHub Only", False, f"Error: {str(e)}")
            return False

    def test_profile_leetcode_only(self):
        """Test /api/profile with LeetCode username only"""
        payload = {
            "github_username": None,
            "leetcode_username": "testuser123",
            "wallet_address": None
        }
        
        try:
            print("\n🔍 Testing /api/profile with LeetCode only...")
            response = requests.post(
                f"{self.base_url}/profile",
                json=payload,
                headers={'Content-Type': 'application/json'},
                timeout=60
            )
            
            success = response.status_code == 200
            data = response.json() if response.status_code == 200 else response.text
            
            if success:
                artifact = data.get("artifact", {})
                scores = artifact.get("deterministic_scores", {})
                
                # LeetCode score might be 0 if user doesn't exist, but should still return 200
                self.log_test(
                    "Profile LeetCode Only",
                    True,
                    f"Status: {response.status_code}, LeetCode Score: {scores.get('leetcode_score')}, Hash: {data.get('artifact_hash')[:16]}..."
                )
                return True
            else:
                self.log_test(
                    "Profile LeetCode Only",
                    False,
                    f"Status: {response.status_code}",
                    data
                )
                return False
                
        except Exception as e:
            self.log_test("Profile LeetCode Only", False, f"Error: {str(e)}")
            return False

    def test_profile_wallet_only(self):
        """Test /api/profile with wallet address only"""
        payload = {
            "github_username": None,
            "leetcode_username": None,
            "wallet_address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
        }
        
        try:
            print("\n🔍 Testing /api/profile with wallet only...")
            response = requests.post(
                f"{self.base_url}/profile",
                json=payload,
                headers={'Content-Type': 'application/json'},
                timeout=60
            )
            
            success = response.status_code == 200
            data = response.json() if response.status_code == 200 else response.text
            
            if success:
                artifact = data.get("artifact", {})
                scores = artifact.get("deterministic_scores", {})
                
                self.log_test(
                    "Profile Wallet Only",
                    True,
                    f"Status: {response.status_code}, Wallet Score: {scores.get('wallet_persistence_score')}, Hash: {data.get('artifact_hash')[:16]}..."
                )
                return True
            else:
                self.log_test(
                    "Profile Wallet Only",
                    False,
                    f"Status: {response.status_code}",
                    data
                )
                return False
                
        except Exception as e:
            self.log_test("Profile Wallet Only", False, f"Error: {str(e)}")
            return False

    def test_profile_all_inputs(self):
        """Test /api/profile with all inputs"""
        payload = {
            "github_username": "torvalds",
            "leetcode_username": "testuser123",
            "wallet_address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
        }
        
        try:
            print("\n🔍 Testing /api/profile with all inputs...")
            response = requests.post(
                f"{self.base_url}/profile",
                json=payload,
                headers={'Content-Type': 'application/json'},
                timeout=60
            )
            
            success = response.status_code == 200
            data = response.json() if response.status_code == 200 else response.text
            
            if success:
                artifact = data.get("artifact", {})
                scores = artifact.get("deterministic_scores", {})
                role_signals = artifact.get("role_signals", {})
                ai_interpretation = artifact.get("ai_interpretation", {})
                
                # Validate all components
                if not all([scores, role_signals, ai_interpretation]):
                    self.log_test(
                        "Profile All Inputs",
                        False,
                        "Missing scores, role_signals, or ai_interpretation",
                        data
                    )
                    return False
                
                # Validate role signals
                if not isinstance(role_signals, dict) or not all(k in role_signals for k in ["frontend", "backend", "data", "devops"]):
                    self.log_test(
                        "Profile All Inputs",
                        False,
                        "Invalid role_signals structure",
                        data
                    )
                    return False
                
                # Validate AI interpretation
                if not all(k in ai_interpretation for k in ["confidence", "role_fit", "summary"]):
                    self.log_test(
                        "Profile All Inputs",
                        False,
                        "Invalid ai_interpretation structure",
                        data
                    )
                    return False
                
                self.log_test(
                    "Profile All Inputs",
                    True,
                    f"Status: {response.status_code}, Scores: G={scores.get('github_score')}, L={scores.get('leetcode_score')}, W={scores.get('wallet_persistence_score')}"
                )
                return True
            else:
                self.log_test(
                    "Profile All Inputs",
                    False,
                    f"Status: {response.status_code}",
                    data
                )
                return False
                
        except Exception as e:
            self.log_test("Profile All Inputs", False, f"Error: {str(e)}")
            return False

    def test_deterministic_behavior(self):
        """Test that same inputs produce same hash"""
        payload = {
            "github_username": "torvalds",
            "leetcode_username": None,
            "wallet_address": None
        }
        
        try:
            print("\n🔍 Testing deterministic behavior (same inputs = same hash)...")
            
            # First call
            response1 = requests.post(
                f"{self.base_url}/profile",
                json=payload,
                headers={'Content-Type': 'application/json'},
                timeout=60
            )
            
            if response1.status_code != 200:
                self.log_test(
                    "Deterministic Behavior",
                    False,
                    f"First call failed with status {response1.status_code}",
                    response1.text
                )
                return False
            
            data1 = response1.json()
            hash1 = data1.get("artifact_hash")
            
            # Wait a bit to ensure different timestamp
            time.sleep(2)
            
            # Second call with same inputs
            response2 = requests.post(
                f"{self.base_url}/profile",
                json=payload,
                headers={'Content-Type': 'application/json'},
                timeout=60
            )
            
            if response2.status_code != 200:
                self.log_test(
                    "Deterministic Behavior",
                    False,
                    f"Second call failed with status {response2.status_code}",
                    response2.text
                )
                return False
            
            data2 = response2.json()
            hash2 = data2.get("artifact_hash")
            
            # Hashes should be different because timestamp is included in artifact
            # But scores should be the same
            scores1 = data1.get("artifact", {}).get("deterministic_scores", {})
            scores2 = data2.get("artifact", {}).get("deterministic_scores", {})
            
            scores_match = scores1 == scores2
            
            if not scores_match:
                self.log_test(
                    "Deterministic Behavior",
                    False,
                    f"Scores don't match: {scores1} vs {scores2}",
                    {"scores1": scores1, "scores2": scores2}
                )
                return False
            
            # Platform history should show compute_count increased
            compute_count = data2.get("platform_history", {}).get("compute_count", 0)
            
            self.log_test(
                "Deterministic Behavior",
                True,
                f"Scores match: {scores1}, Compute count: {compute_count}, Hash1: {hash1[:16]}..., Hash2: {hash2[:16]}..."
            )
            return True
                
        except Exception as e:
            self.log_test("Deterministic Behavior", False, f"Error: {str(e)}")
            return False

    def test_verification_endpoint(self):
        """Test /api/verify/:profileId endpoint"""
        # First create a profile
        payload = {
            "github_username": "torvalds",
            "leetcode_username": None,
            "wallet_address": None
        }
        
        try:
            print("\n🔍 Testing verification endpoint...")
            
            # Create profile
            response = requests.post(
                f"{self.base_url}/profile",
                json=payload,
                headers={'Content-Type': 'application/json'},
                timeout=60
            )
            
            if response.status_code != 200:
                self.log_test(
                    "Verification Endpoint",
                    False,
                    f"Profile creation failed with status {response.status_code}",
                    response.text
                )
                return False
            
            data = response.json()
            profile_id = data.get("profile_id")
            artifact_hash = data.get("artifact_hash")
            
            # Test verification with correct hash
            verify_response = requests.get(
                f"{self.base_url}/verify/{profile_id}?hash={artifact_hash}",
                timeout=30
            )
            
            if verify_response.status_code != 200:
                self.log_test(
                    "Verification Endpoint",
                    False,
                    f"Verification failed with status {verify_response.status_code}",
                    verify_response.text
                )
                return False
            
            verify_data = verify_response.json()
            verified = verify_data.get("verified", False)
            
            if not verified:
                self.log_test(
                    "Verification Endpoint",
                    False,
                    f"Hash verification failed: {verify_data.get('message')}",
                    verify_data
                )
                return False
            
            # Test verification with wrong hash
            wrong_hash = "0" * 64
            verify_wrong = requests.get(
                f"{self.base_url}/verify/{profile_id}?hash={wrong_hash}",
                timeout=30
            )
            
            if verify_wrong.status_code == 200:
                verify_wrong_data = verify_wrong.json()
                should_fail = not verify_wrong_data.get("verified", True)
                
                if not should_fail:
                    self.log_test(
                        "Verification Endpoint",
                        False,
                        "Wrong hash should not verify",
                        verify_wrong_data
                    )
                    return False
            
            self.log_test(
                "Verification Endpoint",
                True,
                f"Correct hash verified, wrong hash rejected. Profile ID: {profile_id}"
            )
            return True
                
        except Exception as e:
            self.log_test("Verification Endpoint", False, f"Error: {str(e)}")
            return False

    def test_platform_history_tracking(self):
        """Test that platform history is tracked correctly"""
        payload = {
            "github_username": "torvalds",
            "leetcode_username": None,
            "wallet_address": None
        }
        
        try:
            print("\n🔍 Testing platform history tracking...")
            
            # First call
            response1 = requests.post(
                f"{self.base_url}/profile",
                json=payload,
                headers={'Content-Type': 'application/json'},
                timeout=60
            )
            
            if response1.status_code != 200:
                self.log_test(
                    "Platform History Tracking",
                    False,
                    f"First call failed with status {response1.status_code}",
                    response1.text
                )
                return False
            
            data1 = response1.json()
            compute_count1 = data1.get("platform_history", {}).get("compute_count", 0)
            first_seen1 = data1.get("platform_history", {}).get("first_seen_at")
            
            # Second call
            time.sleep(1)
            response2 = requests.post(
                f"{self.base_url}/profile",
                json=payload,
                headers={'Content-Type': 'application/json'},
                timeout=60
            )
            
            if response2.status_code != 200:
                self.log_test(
                    "Platform History Tracking",
                    False,
                    f"Second call failed with status {response2.status_code}",
                    response2.text
                )
                return False
            
            data2 = response2.json()
            compute_count2 = data2.get("platform_history", {}).get("compute_count", 0)
            first_seen2 = data2.get("platform_history", {}).get("first_seen_at")
            
            # Compute count should increase
            if compute_count2 <= compute_count1:
                self.log_test(
                    "Platform History Tracking",
                    False,
                    f"Compute count didn't increase: {compute_count1} -> {compute_count2}",
                    {"data1": data1.get("platform_history"), "data2": data2.get("platform_history")}
                )
                return False
            
            # First seen should remain the same
            if first_seen1 != first_seen2:
                self.log_test(
                    "Platform History Tracking",
                    False,
                    f"First seen changed: {first_seen1} -> {first_seen2}",
                    {"data1": data1.get("platform_history"), "data2": data2.get("platform_history")}
                )
                return False
            
            self.log_test(
                "Platform History Tracking",
                True,
                f"Compute count increased: {compute_count1} -> {compute_count2}, First seen preserved: {first_seen1}"
            )
            return True
                
        except Exception as e:
            self.log_test("Platform History Tracking", False, f"Error: {str(e)}")
            return False

    def test_role_signal_extraction(self):
        """Test that role signals are extracted from GitHub repos"""
        payload = {
            "github_username": "torvalds",
            "leetcode_username": None,
            "wallet_address": None
        }
        
        try:
            print("\n🔍 Testing role signal extraction...")
            
            response = requests.post(
                f"{self.base_url}/profile",
                json=payload,
                headers={'Content-Type': 'application/json'},
                timeout=60
            )
            
            if response.status_code != 200:
                self.log_test(
                    "Role Signal Extraction",
                    False,
                    f"Profile creation failed with status {response.status_code}",
                    response.text
                )
                return False
            
            data = response.json()
            role_signals = data.get("artifact", {}).get("role_signals", {})
            
            # Validate role signals structure
            required_roles = ["frontend", "backend", "data", "devops"]
            missing_roles = [r for r in required_roles if r not in role_signals]
            
            if missing_roles:
                self.log_test(
                    "Role Signal Extraction",
                    False,
                    f"Missing role signals: {missing_roles}",
                    data
                )
                return False
            
            # Check if analyzed repos are present
            analyzed_repos = data.get("fetched_data", {}).get("github", {}).get("analyzed_repos", [])
            
            if not analyzed_repos:
                self.log_test(
                    "Role Signal Extraction",
                    False,
                    "No analyzed repos found",
                    data
                )
                return False
            
            self.log_test(
                "Role Signal Extraction",
                True,
                f"Role signals: {role_signals}, Analyzed repos: {len(analyzed_repos)}"
            )
            return True
                
        except Exception as e:
            self.log_test("Role Signal Extraction", False, f"Error: {str(e)}")
            return False

    def print_summary(self):
        """Print test summary"""
        print("\n" + "="*60)
        print(f"📊 TEST SUMMARY")
        print("="*60)
        print(f"Total Tests: {self.tests_run}")
        print(f"Passed: {self.tests_passed}")
        print(f"Failed: {self.tests_run - self.tests_passed}")
        print(f"Success Rate: {(self.tests_passed/self.tests_run*100):.1f}%")
        print("="*60)
        
        return self.tests_passed, self.tests_run

def main():
    print("🚀 Starting Verifiable Reputation System API Tests")
    print("="*60)
    
    tester = VerifiableReputationTester()
    
    # Run tests
    tester.test_root_endpoint()
    tester.test_profile_no_inputs()
    tester.test_profile_github_only()
    tester.test_profile_leetcode_only()
    tester.test_profile_wallet_only()
    tester.test_profile_all_inputs()
    tester.test_deterministic_behavior()
    tester.test_verification_endpoint()
    tester.test_platform_history_tracking()
    tester.test_role_signal_extraction()
    
    # Print summary
    passed, total = tester.print_summary()
    
    # Save results
    results = {
        "timestamp": datetime.now().isoformat(),
        "total_tests": total,
        "passed_tests": passed,
        "failed_tests": total - passed,
        "success_rate": f"{(passed/total*100):.1f}%",
        "test_details": tester.test_results
    }
    
    with open("/app/backend/test_results.json", "w") as f:
        json.dump(results, f, indent=2)
    
    print(f"\n💾 Results saved to /app/backend/test_results.json")
    
    return 0 if passed == total else 1

if __name__ == "__main__":
    sys.exit(main())
