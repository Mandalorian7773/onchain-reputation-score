import requests
import sys
import json
from datetime import datetime

class ReputationAPITester:
    def __init__(self, base_url="https://reputation-agent.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log_test(self, name, success, message="", response_data=None):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
        
        result = {
            "test": name,
            "status": "PASSED" if success else "FAILED",
            "message": message,
            "response_data": response_data
        }
        self.test_results.append(result)
        
        status_icon = "✅" if success else "❌"
        print(f"\n{status_icon} {name}")
        if message:
            print(f"   {message}")
        if response_data and not success:
            print(f"   Response: {json.dumps(response_data, indent=2)}")

    def test_root_endpoint(self):
        """Test root API endpoint"""
        try:
            response = requests.get(f"{self.base_url}/", timeout=10)
            success = response.status_code == 200
            data = response.json() if success else {}
            self.log_test(
                "Root Endpoint",
                success,
                f"Status: {response.status_code}, Response: {data}",
                data
            )
            return success
        except Exception as e:
            self.log_test("Root Endpoint", False, f"Error: {str(e)}")
            return False

    def test_analyze_minimal(self):
        """Test /api/analyze with minimal wallet data only"""
        payload = {
            "wallet": {
                "address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
                "age_days": 365,
                "tx_count": 100
            },
            "github": {
                "username": None,
                "account_age_days": None,
                "public_repos": None,
                "total_commits_estimate": None
            },
            "problem_solving": {
                "platform": None,
                "username": None,
                "account_age_days": None,
                "total_solved": None,
                "easy": None,
                "medium": None,
                "hard": None
            }
        }
        
        try:
            print("\n🔍 Testing /api/analyze with minimal data...")
            print(f"   Payload: {json.dumps(payload, indent=2)}")
            response = requests.post(
                f"{self.base_url}/analyze",
                json=payload,
                headers={'Content-Type': 'application/json'},
                timeout=30
            )
            
            success = response.status_code == 200
            data = response.json() if response.status_code == 200 else response.text
            
            if success:
                # Validate response structure
                required_fields = ["wallet_address", "calculated_scores", "analysis", "timestamp"]
                missing_fields = [f for f in required_fields if f not in data]
                
                if missing_fields:
                    self.log_test(
                        "Analyze Minimal Data",
                        False,
                        f"Missing fields: {missing_fields}",
                        data
                    )
                    return False
                
                # Validate analysis structure
                analysis = data.get("analysis", {})
                required_analysis_fields = ["confidence_level", "signal_strength", "anomalies_detected", "confidence_reasoning"]
                missing_analysis = [f for f in required_analysis_fields if f not in analysis]
                
                if missing_analysis:
                    self.log_test(
                        "Analyze Minimal Data",
                        False,
                        f"Missing analysis fields: {missing_analysis}",
                        data
                    )
                    return False
                
                self.log_test(
                    "Analyze Minimal Data",
                    True,
                    f"Status: {response.status_code}, Confidence: {analysis.get('confidence_level')}",
                    data
                )
                return True
            else:
                self.log_test(
                    "Analyze Minimal Data",
                    False,
                    f"Status: {response.status_code}",
                    data
                )
                return False
                
        except Exception as e:
            self.log_test("Analyze Minimal Data", False, f"Error: {str(e)}")
            return False

    def test_analyze_full_data(self):
        """Test /api/analyze with complete data"""
        payload = {
            "wallet": {
                "address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
                "age_days": 730,
                "tx_count": 500
            },
            "github": {
                "username": "testuser",
                "account_age_days": 1095,
                "public_repos": 25,
                "total_commits_estimate": 500
            },
            "problem_solving": {
                "platform": "leetcode",
                "username": "testcoder",
                "account_age_days": 365,
                "total_solved": 200,
                "easy": 80,
                "medium": 90,
                "hard": 30
            }
        }
        
        try:
            print("\n🔍 Testing /api/analyze with full data...")
            print(f"   Payload: {json.dumps(payload, indent=2)}")
            response = requests.post(
                f"{self.base_url}/analyze",
                json=payload,
                headers={'Content-Type': 'application/json'},
                timeout=30
            )
            
            success = response.status_code == 200
            data = response.json() if response.status_code == 200 else response.text
            
            if success:
                analysis = data.get("analysis", {})
                scores = data.get("calculated_scores", {})
                
                # Validate scores are calculated
                if scores.get("final_score", 0) == 0:
                    self.log_test(
                        "Analyze Full Data",
                        False,
                        "Final score is 0, expected higher with full data",
                        data
                    )
                    return False
                
                self.log_test(
                    "Analyze Full Data",
                    True,
                    f"Status: {response.status_code}, Final Score: {scores.get('final_score')}, Confidence: {analysis.get('confidence_level')}",
                    data
                )
                return True
            else:
                self.log_test(
                    "Analyze Full Data",
                    False,
                    f"Status: {response.status_code}",
                    data
                )
                return False
                
        except Exception as e:
            self.log_test("Analyze Full Data", False, f"Error: {str(e)}")
            return False

    def test_analyze_invalid_data(self):
        """Test /api/analyze with invalid data"""
        payload = {
            "wallet": {
                "address": "",  # Empty address
                "age_days": -1,  # Negative value
                "tx_count": "invalid"  # String instead of int
            },
            "github": {},
            "problem_solving": {}
        }
        
        try:
            print("\n🔍 Testing /api/analyze with invalid data...")
            response = requests.post(
                f"{self.base_url}/analyze",
                json=payload,
                headers={'Content-Type': 'application/json'},
                timeout=30
            )
            
            # Should return 422 for validation error
            success = response.status_code == 422
            data = response.json() if response.status_code in [422, 400] else response.text
            
            self.log_test(
                "Analyze Invalid Data",
                success,
                f"Status: {response.status_code} (expected 422 for validation error)",
                data if not success else None
            )
            return success
                
        except Exception as e:
            self.log_test("Analyze Invalid Data", False, f"Error: {str(e)}")
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
    print("🚀 Starting Reputation System API Tests")
    print("="*60)
    
    tester = ReputationAPITester()
    
    # Run tests
    tester.test_root_endpoint()
    tester.test_analyze_minimal()
    tester.test_analyze_full_data()
    tester.test_analyze_invalid_data()
    
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
