import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900">
      <div className="container mx-auto px-4 py-20 max-w-6xl">
        
        <div className="text-center mb-20">
          <h1 className="text-7xl font-bold text-white mb-6" style={{ fontFamily: 'Azeret Mono, monospace' }}>
            Verifiable Developer Reputation
          </h1>
          <p className="text-slate-300 text-2xl mb-4">
            Transparent, reproducible, cryptographically verified hiring
          </p>
          <p className="text-slate-400 text-lg max-w-3xl mx-auto">
            No resumes. No self-reported skills. Just verifiable proof of technical ability 
            from GitHub, LeetCode, and on-chain activity.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto mb-16">
          <Card className="bg-slate-900/70 border-slate-700 backdrop-blur-lg hover:border-indigo-600/50 transition-all">
            <CardHeader>
              <CardTitle className="text-white text-2xl">For Candidates</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-slate-300">
                Generate a verifiable developer profile from your public work. 
                Get matched to jobs based on deterministic scoring.
              </p>
              <ul className="text-slate-400 text-sm space-y-2">
                <li>✓ Auto-generated from GitHub, LeetCode, wallet</li>
                <li>✓ Cryptographically verified</li>
                <li>✓ No manual input or exaggeration</li>
                <li>✓ Job-specific scoring</li>
              </ul>
              <Link to="/signup">
                <Button className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-lg py-6">
                  Sign Up as Candidate
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/70 border-slate-700 backdrop-blur-lg hover:border-emerald-600/50 transition-all">
            <CardHeader>
              <CardTitle className="text-white text-2xl">For Recruiters</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-slate-300">
                Screen developers using verifiable reputation data. 
                Define custom scoring weights for your roles.
              </p>
              <ul className="text-slate-400 text-sm space-y-2">
                <li>✓ See only verified, reproducible profiles</li>
                <li>✓ Automatic candidate ranking</li>
                <li>✓ Customize GitHub/LeetCode/Wallet weights</li>
                <li>✓ AI-powered hiring insights</li>
              </ul>
              <Link to="/signup">
                <Button className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-lg py-6">
                  Sign Up as Recruiter
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        <div className="text-center">
          <p className="text-slate-400 mb-4">
            Already have an account? <Link to="/login" className="text-indigo-400 hover:underline">Login</Link>
          </p>
          <Link to="/about" className="text-slate-500 hover:text-slate-400 text-sm">
            Learn how it works →
          </Link>
        </div>
      </div>
    </div>
  );
}
