import requests
import sys
import json
from datetime import datetime
import time
import random

class JobBoardTester:
    def __init__(self, base_url="https://reputation-agent.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []
        
        # Store tokens and IDs for testing
        self.candidate_token = None
        self.recruiter_token = None
        self.candidate_email = None
        self.recruiter_email = None
        self.profile_id = None
        self.job_id = None
        
        # Generate unique emails for this test run
        timestamp = int(time.time())
        self.candidate_email = f"candidate_{timestamp}@test.com"
        self.recruiter_email = f"recruiter_{timestamp}@test.com"

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

    # ============================================
    # ORIGINAL REPUTATION SYSTEM TESTS
    # ============================================

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

    def test_profile_generation(self):
        """Test profile generation for later use in job applications"""
        payload = {
            "github_username": "torvalds",
            "leetcode_username": None,
            "wallet_address": None
        }
        
        try:
            print("\n🔍 Testing profile generation...")
            response = requests.post(
                f"{self.base_url}/profile",
                json=payload,
                headers={'Content-Type': 'application/json'},
                timeout=60
            )
            
            success = response.status_code == 200
            data = response.json() if response.status_code == 200 else response.text
            
            if success:
                self.profile_id = data.get("profile_id")
                scores = data.get("artifact", {}).get("deterministic_scores", {})
                self.log_test(
                    "Profile Generation",
                    True,
                    f"Profile ID: {self.profile_id}, GitHub Score: {scores.get('github_score')}"
                )
                return True
            else:
                self.log_test(
                    "Profile Generation",
                    False,
                    f"Status: {response.status_code}",
                    data
                )
                return False
                
        except Exception as e:
            self.log_test("Profile Generation", False, f"Error: {str(e)}")
            return False

    # ============================================
    # AUTHENTICATION TESTS
    # ============================================

    def test_signup_candidate(self):
        """Test signup as candidate"""
        payload = {
            "email": self.candidate_email,
            "password": "testpass123",
            "role": "candidate"
        }
        
        try:
            print(f"\n🔍 Testing candidate signup with email: {self.candidate_email}...")
            response = requests.post(
                f"{self.base_url}/auth/signup",
                json=payload,
                headers={'Content-Type': 'application/json'},
                timeout=30
            )
            
            success = response.status_code == 200
            data = response.json() if response.status_code == 200 else response.text
            
            if success:
                self.candidate_token = data.get("token")
                user = data.get("user", {})
                
                if not self.candidate_token:
                    self.log_test("Signup Candidate", False, "No token returned", data)
                    return False
                
                if user.get("role") != "candidate":
                    self.log_test("Signup Candidate", False, f"Wrong role: {user.get('role')}", data)
                    return False
                
                self.log_test(
                    "Signup Candidate",
                    True,
                    f"Email: {user.get('email')}, Role: {user.get('role')}, Token: {self.candidate_token[:20]}..."
                )
                return True
            else:
                self.log_test("Signup Candidate", False, f"Status: {response.status_code}", data)
                return False
                
        except Exception as e:
            self.log_test("Signup Candidate", False, f"Error: {str(e)}")
            return False

    def test_signup_recruiter(self):
        """Test signup as recruiter"""
        payload = {
            "email": self.recruiter_email,
            "password": "testpass123",
            "role": "recruiter"
        }
        
        try:
            print(f"\n🔍 Testing recruiter signup with email: {self.recruiter_email}...")
            response = requests.post(
                f"{self.base_url}/auth/signup",
                json=payload,
                headers={'Content-Type': 'application/json'},
                timeout=30
            )
            
            success = response.status_code == 200
            data = response.json() if response.status_code == 200 else response.text
            
            if success:
                self.recruiter_token = data.get("token")
                user = data.get("user", {})
                
                if not self.recruiter_token:
                    self.log_test("Signup Recruiter", False, "No token returned", data)
                    return False
                
                if user.get("role") != "recruiter":
                    self.log_test("Signup Recruiter", False, f"Wrong role: {user.get('role')}", data)
                    return False
                
                self.log_test(
                    "Signup Recruiter",
                    True,
                    f"Email: {user.get('email')}, Role: {user.get('role')}, Token: {self.recruiter_token[:20]}..."
                )
                return True
            else:
                self.log_test("Signup Recruiter", False, f"Status: {response.status_code}", data)
                return False
                
        except Exception as e:
            self.log_test("Signup Recruiter", False, f"Error: {str(e)}")
            return False

    def test_login(self):
        """Test login endpoint"""
        payload = {
            "email": self.candidate_email,
            "password": "testpass123"
        }
        
        try:
            print("\n🔍 Testing login...")
            response = requests.post(
                f"{self.base_url}/auth/login",
                json=payload,
                headers={'Content-Type': 'application/json'},
                timeout=30
            )
            
            success = response.status_code == 200
            data = response.json() if response.status_code == 200 else response.text
            
            if success:
                token = data.get("token")
                user = data.get("user", {})
                
                if not token:
                    self.log_test("Login", False, "No token returned", data)
                    return False
                
                self.log_test(
                    "Login",
                    True,
                    f"Email: {user.get('email')}, Role: {user.get('role')}, Token: {token[:20]}..."
                )
                return True
            else:
                self.log_test("Login", False, f"Status: {response.status_code}", data)
                return False
                
        except Exception as e:
            self.log_test("Login", False, f"Error: {str(e)}")
            return False

    def test_login_invalid_credentials(self):
        """Test login with invalid credentials"""
        payload = {
            "email": self.candidate_email,
            "password": "wrongpassword"
        }
        
        try:
            print("\n🔍 Testing login with invalid credentials...")
            response = requests.post(
                f"{self.base_url}/auth/login",
                json=payload,
                headers={'Content-Type': 'application/json'},
                timeout=30
            )
            
            # Should return 401
            success = response.status_code == 401
            data = response.json() if response.status_code in [401, 400] else response.text
            
            self.log_test(
                "Login Invalid Credentials",
                success,
                f"Status: {response.status_code} (expected 401)",
                data if not success else None
            )
            return success
                
        except Exception as e:
            self.log_test("Login Invalid Credentials", False, f"Error: {str(e)}")
            return False

    # ============================================
    # CANDIDATE TESTS
    # ============================================

    def test_candidate_update_profile(self):
        """Test candidate updating profile with contact email"""
        if not self.candidate_token or not self.profile_id:
            self.log_test("Candidate Update Profile", False, "Missing candidate token or profile ID")
            return False
        
        payload = {
            "profile_id": self.profile_id,
            "contact_email": self.candidate_email
        }
        
        try:
            print("\n🔍 Testing candidate profile update...")
            response = requests.post(
                f"{self.base_url}/candidate/profile",
                json=payload,
                headers={
                    'Content-Type': 'application/json',
                    'Authorization': f'Bearer {self.candidate_token}'
                },
                timeout=30
            )
            
            success = response.status_code == 200
            data = response.json() if response.status_code == 200 else response.text
            
            if success:
                self.log_test(
                    "Candidate Update Profile",
                    True,
                    f"Profile ID: {data.get('profile_id')}, Contact email set"
                )
                return True
            else:
                self.log_test("Candidate Update Profile", False, f"Status: {response.status_code}", data)
                return False
                
        except Exception as e:
            self.log_test("Candidate Update Profile", False, f"Error: {str(e)}")
            return False

    # ============================================
    # JOB TESTS
    # ============================================

    def test_create_job(self):
        """Test recruiter creating a job"""
        if not self.recruiter_token:
            self.log_test("Create Job", False, "Missing recruiter token")
            return False
        
        payload = {
            "title": "Senior Frontend Engineer",
            "role": "Frontend",
            "location": "Remote",
            "description": "We are looking for a senior frontend engineer with React experience.",
            "weights": {
                "github": 0.5,
                "leetcode": 0.3,
                "wallet": 0.2
            }
        }
        
        try:
            print("\n🔍 Testing job creation...")
            response = requests.post(
                f"{self.base_url}/jobs",
                json=payload,
                headers={
                    'Content-Type': 'application/json',
                    'Authorization': f'Bearer {self.recruiter_token}'
                },
                timeout=30
            )
            
            success = response.status_code == 200
            data = response.json() if response.status_code == 200 else response.text
            
            if success:
                self.job_id = data.get("job_id")
                
                if not self.job_id:
                    self.log_test("Create Job", False, "No job_id returned", data)
                    return False
                
                self.log_test(
                    "Create Job",
                    True,
                    f"Job ID: {self.job_id}, Title: {data.get('title')}, Weights: {data.get('weights')}"
                )
                return True
            else:
                self.log_test("Create Job", False, f"Status: {response.status_code}", data)
                return False
                
        except Exception as e:
            self.log_test("Create Job", False, f"Error: {str(e)}")
            return False

    def test_create_job_invalid_weights(self):
        """Test job creation with invalid weights (not summing to 1.0)"""
        if not self.recruiter_token:
            self.log_test("Create Job Invalid Weights", False, "Missing recruiter token")
            return False
        
        payload = {
            "title": "Backend Engineer",
            "role": "Backend",
            "location": "Remote",
            "description": "Backend position",
            "weights": {
                "github": 0.5,
                "leetcode": 0.3,
                "wallet": 0.3  # Sum = 1.1, should fail
            }
        }
        
        try:
            print("\n🔍 Testing job creation with invalid weights...")
            response = requests.post(
                f"{self.base_url}/jobs",
                json=payload,
                headers={
                    'Content-Type': 'application/json',
                    'Authorization': f'Bearer {self.recruiter_token}'
                },
                timeout=30
            )
            
            # Should return 400
            success = response.status_code == 400
            data = response.json() if response.status_code in [400, 422] else response.text
            
            self.log_test(
                "Create Job Invalid Weights",
                success,
                f"Status: {response.status_code} (expected 400), Error: {data.get('error') if isinstance(data, dict) else data}",
                data if not success else None
            )
            return success
                
        except Exception as e:
            self.log_test("Create Job Invalid Weights", False, f"Error: {str(e)}")
            return False

    def test_browse_jobs(self):
        """Test browsing jobs (public endpoint)"""
        try:
            print("\n🔍 Testing browse jobs...")
            response = requests.get(
                f"{self.base_url}/jobs",
                timeout=30
            )
            
            success = response.status_code == 200
            data = response.json() if response.status_code == 200 else response.text
            
            if success:
                jobs = data.get("jobs", [])
                self.log_test(
                    "Browse Jobs",
                    True,
                    f"Found {len(jobs)} jobs"
                )
                return True
            else:
                self.log_test("Browse Jobs", False, f"Status: {response.status_code}", data)
                return False
                
        except Exception as e:
            self.log_test("Browse Jobs", False, f"Error: {str(e)}")
            return False

    def test_browse_jobs_with_filters(self):
        """Test browsing jobs with role and location filters"""
        try:
            print("\n🔍 Testing browse jobs with filters...")
            response = requests.get(
                f"{self.base_url}/jobs?role=Frontend&location=Remote",
                timeout=30
            )
            
            success = response.status_code == 200
            data = response.json() if response.status_code == 200 else response.text
            
            if success:
                jobs = data.get("jobs", [])
                # Verify filters work
                filtered_correctly = all(
                    job.get("role") == "Frontend" and job.get("location") == "Remote"
                    for job in jobs
                )
                
                if not filtered_correctly and len(jobs) > 0:
                    self.log_test("Browse Jobs With Filters", False, "Filters not applied correctly", data)
                    return False
                
                self.log_test(
                    "Browse Jobs With Filters",
                    True,
                    f"Found {len(jobs)} Frontend/Remote jobs"
                )
                return True
            else:
                self.log_test("Browse Jobs With Filters", False, f"Status: {response.status_code}", data)
                return False
                
        except Exception as e:
            self.log_test("Browse Jobs With Filters", False, f"Error: {str(e)}")
            return False

    def test_get_job_details(self):
        """Test getting job details"""
        if not self.job_id:
            self.log_test("Get Job Details", False, "Missing job ID")
            return False
        
        try:
            print("\n🔍 Testing get job details...")
            response = requests.get(
                f"{self.base_url}/jobs/{self.job_id}",
                timeout=30
            )
            
            success = response.status_code == 200
            data = response.json() if response.status_code == 200 else response.text
            
            if success:
                job = data.get("job", {})
                weights = job.get("weights", {})
                
                self.log_test(
                    "Get Job Details",
                    True,
                    f"Title: {job.get('title')}, Weights: {weights}"
                )
                return True
            else:
                self.log_test("Get Job Details", False, f"Status: {response.status_code}", data)
                return False
                
        except Exception as e:
            self.log_test("Get Job Details", False, f"Error: {str(e)}")
            return False

    def test_apply_to_job(self):
        """Test candidate applying to job"""
        if not self.candidate_token or not self.job_id or not self.profile_id:
            self.log_test("Apply to Job", False, "Missing candidate token, job ID, or profile ID")
            return False
        
        payload = {
            "profile_id": self.profile_id
        }
        
        try:
            print("\n🔍 Testing job application...")
            response = requests.post(
                f"{self.base_url}/jobs/{self.job_id}/apply",
                json=payload,
                headers={
                    'Content-Type': 'application/json',
                    'Authorization': f'Bearer {self.candidate_token}'
                },
                timeout=60
            )
            
            success = response.status_code == 200
            data = response.json() if response.status_code == 200 else response.text
            
            if success:
                job_specific_score = data.get("job_specific_score")
                
                if job_specific_score is None:
                    self.log_test("Apply to Job", False, "No job_specific_score returned", data)
                    return False
                
                self.log_test(
                    "Apply to Job",
                    True,
                    f"Application successful, Job-specific score: {job_specific_score}/100"
                )
                return True
            else:
                self.log_test("Apply to Job", False, f"Status: {response.status_code}", data)
                return False
                
        except Exception as e:
            self.log_test("Apply to Job", False, f"Error: {str(e)}")
            return False

    def test_apply_duplicate(self):
        """Test applying to same job twice (should fail)"""
        if not self.candidate_token or not self.job_id or not self.profile_id:
            self.log_test("Apply Duplicate", False, "Missing candidate token, job ID, or profile ID")
            return False
        
        payload = {
            "profile_id": self.profile_id
        }
        
        try:
            print("\n🔍 Testing duplicate application...")
            response = requests.post(
                f"{self.base_url}/jobs/{self.job_id}/apply",
                json=payload,
                headers={
                    'Content-Type': 'application/json',
                    'Authorization': f'Bearer {self.candidate_token}'
                },
                timeout=60
            )
            
            # Should return 400
            success = response.status_code == 400
            data = response.json() if response.status_code in [400, 422] else response.text
            
            self.log_test(
                "Apply Duplicate",
                success,
                f"Status: {response.status_code} (expected 400), Error: {data.get('error') if isinstance(data, dict) else data}",
                data if not success else None
            )
            return success
                
        except Exception as e:
            self.log_test("Apply Duplicate", False, f"Error: {str(e)}")
            return False

    # ============================================
    # RECRUITER TESTS
    # ============================================

    def test_get_recruiter_jobs(self):
        """Test recruiter getting their jobs"""
        if not self.recruiter_token:
            self.log_test("Get Recruiter Jobs", False, "Missing recruiter token")
            return False
        
        try:
            print("\n🔍 Testing get recruiter jobs...")
            response = requests.get(
                f"{self.base_url}/recruiter/jobs",
                headers={
                    'Authorization': f'Bearer {self.recruiter_token}'
                },
                timeout=30
            )
            
            success = response.status_code == 200
            data = response.json() if response.status_code == 200 else response.text
            
            if success:
                jobs = data.get("jobs", [])
                
                # Should have at least the job we created
                if len(jobs) == 0:
                    self.log_test("Get Recruiter Jobs", False, "No jobs returned", data)
                    return False
                
                self.log_test(
                    "Get Recruiter Jobs",
                    True,
                    f"Found {len(jobs)} jobs, Applicant count: {jobs[0].get('applicant_count', 0)}"
                )
                return True
            else:
                self.log_test("Get Recruiter Jobs", False, f"Status: {response.status_code}", data)
                return False
                
        except Exception as e:
            self.log_test("Get Recruiter Jobs", False, f"Error: {str(e)}")
            return False

    def test_get_applicants(self):
        """Test recruiter getting applicants for a job"""
        if not self.recruiter_token or not self.job_id:
            self.log_test("Get Applicants", False, "Missing recruiter token or job ID")
            return False
        
        try:
            print("\n🔍 Testing get applicants...")
            response = requests.get(
                f"{self.base_url}/recruiter/jobs/{self.job_id}/applicants",
                headers={
                    'Authorization': f'Bearer {self.recruiter_token}'
                },
                timeout=30
            )
            
            success = response.status_code == 200
            data = response.json() if response.status_code == 200 else response.text
            
            if success:
                applicants = data.get("applicants", [])
                job = data.get("job", {})
                
                # Should have at least 1 applicant (the one we created)
                if len(applicants) == 0:
                    self.log_test("Get Applicants", False, "No applicants returned", data)
                    return False
                
                # Verify applicants are sorted by job_specific_score descending
                scores = [a.get("job_specific_score", 0) for a in applicants]
                sorted_scores = sorted(scores, reverse=True)
                
                if scores != sorted_scores:
                    self.log_test("Get Applicants", False, f"Applicants not sorted by score: {scores}", data)
                    return False
                
                # Verify applicant has required fields
                first_applicant = applicants[0]
                required_fields = ["profile_id", "candidate_email", "job_specific_score", "deterministic_scores", "role_fit", "ai_summary"]
                missing_fields = [f for f in required_fields if f not in first_applicant]
                
                if missing_fields:
                    self.log_test("Get Applicants", False, f"Missing fields: {missing_fields}", data)
                    return False
                
                self.log_test(
                    "Get Applicants",
                    True,
                    f"Found {len(applicants)} applicants, Top score: {scores[0]}/100, Sorted correctly: {scores == sorted_scores}"
                )
                return True
            else:
                self.log_test("Get Applicants", False, f"Status: {response.status_code}", data)
                return False
                
        except Exception as e:
            self.log_test("Get Applicants", False, f"Error: {str(e)}")
            return False

    # ============================================
    # PROTECTED ROUTE TESTS
    # ============================================

    def test_protected_route_no_auth(self):
        """Test accessing protected route without authentication"""
        try:
            print("\n🔍 Testing protected route without auth...")
            response = requests.get(
                f"{self.base_url}/recruiter/jobs",
                timeout=30
            )
            
            # Should return 401
            success = response.status_code == 401
            data = response.json() if response.status_code in [401, 403] else response.text
            
            self.log_test(
                "Protected Route No Auth",
                success,
                f"Status: {response.status_code} (expected 401)",
                data if not success else None
            )
            return success
                
        except Exception as e:
            self.log_test("Protected Route No Auth", False, f"Error: {str(e)}")
            return False

    def test_protected_route_wrong_role(self):
        """Test candidate accessing recruiter-only route"""
        if not self.candidate_token:
            self.log_test("Protected Route Wrong Role", False, "Missing candidate token")
            return False
        
        try:
            print("\n🔍 Testing candidate accessing recruiter route...")
            response = requests.get(
                f"{self.base_url}/recruiter/jobs",
                headers={
                    'Authorization': f'Bearer {self.candidate_token}'
                },
                timeout=30
            )
            
            # Should return 403
            success = response.status_code == 403
            data = response.json() if response.status_code in [401, 403] else response.text
            
            self.log_test(
                "Protected Route Wrong Role",
                success,
                f"Status: {response.status_code} (expected 403)",
                data if not success else None
            )
            return success
                
        except Exception as e:
            self.log_test("Protected Route Wrong Role", False, f"Error: {str(e)}")
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
    print("🚀 Starting Job Board API Tests")
    print("="*60)
    
    tester = JobBoardTester()
    
    # Run tests in order
    print("\n📋 SECTION 1: ORIGINAL REPUTATION SYSTEM")
    tester.test_root_endpoint()
    tester.test_profile_generation()
    
    print("\n📋 SECTION 2: AUTHENTICATION")
    tester.test_signup_candidate()
    tester.test_signup_recruiter()
    tester.test_login()
    tester.test_login_invalid_credentials()
    
    print("\n📋 SECTION 3: CANDIDATE FLOW")
    tester.test_candidate_update_profile()
    
    print("\n📋 SECTION 4: JOB MANAGEMENT")
    tester.test_create_job()
    tester.test_create_job_invalid_weights()
    tester.test_browse_jobs()
    tester.test_browse_jobs_with_filters()
    tester.test_get_job_details()
    
    print("\n📋 SECTION 5: JOB APPLICATIONS")
    tester.test_apply_to_job()
    tester.test_apply_duplicate()
    
    print("\n📋 SECTION 6: RECRUITER FLOW")
    tester.test_get_recruiter_jobs()
    tester.test_get_applicants()
    
    print("\n📋 SECTION 7: PROTECTED ROUTES")
    tester.test_protected_route_no_auth()
    tester.test_protected_route_wrong_role()
    
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
