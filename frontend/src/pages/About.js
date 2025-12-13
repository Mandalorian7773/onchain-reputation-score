import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function About() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900">
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-white mb-4" style={{ fontFamily: 'Azeret Mono, monospace' }}>
            How It Works
          </h1>
          <p className="text-slate-300">Understanding verifiable developer reputation</p>
        </div>

        <Card className="bg-slate-900/70 border-slate-700 backdrop-blur-lg mb-6">
          <CardHeader>
            <CardTitle className="text-white text-xl">The Problem</CardTitle>
          </CardHeader>
          <CardContent className="text-slate-300 space-y-3">
            <p>Traditional developer evaluation relies on:</p>
            <ul className="list-disc list-inside space-y-2 text-slate-400">
              <li>Self-reported skills and experience (easily exaggerated)</li>
              <li>Unverifiable resume claims</li>
              <li>Subjective interviews with high variance</li>
              <li>Centralized platforms where data can be manipulated</li>
            </ul>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/70 border-slate-700 backdrop-blur-lg mb-6">
          <CardHeader>
            <CardTitle className="text-white text-xl">Our Solution</CardTitle>
          </CardHeader>
          <CardContent className="text-slate-300 space-y-4">
            <div>
              <h4 className="font-semibold mb-2">1. Public Data Sources</h4>
              <p className="text-slate-400 text-sm">
                We fetch data from GitHub, LeetCode, and optionally Polygon blockchain. 
                No self-reporting. Only observable, public technical activity.
              </p>
            </div>

            <div>
              <h4 className="font-semibold mb-2">2. Deterministic Computation</h4>
              <p className="text-slate-400 text-sm">
                Scores are calculated using fixed, reproducible logic. 
                Same inputs always produce same outputs. No randomness, no subjective judgment.
              </p>
            </div>

            <div>
              <h4 className="font-semibold mb-2">3. Role Signal Extraction</h4>
              <p className="text-slate-400 text-sm">
                We analyze GitHub repositories (languages, frameworks, project structure) to extract 
                factual signals about frontend, backend, data science, and DevOps experience.
              </p>
            </div>

            <div>
              <h4 className="font-semibold mb-2">4. AI Interpretation (Limited Role)</h4>
              <p className="text-slate-400 text-sm">
                AI is used ONLY to interpret signals and assess role fit. 
                It does NOT compute scores, fetch data, or make final decisions.
              </p>
            </div>

            <div>
              <h4 className="font-semibold mb-2">5. MongoDB Platform History</h4>
              <p className="text-slate-400 text-sm">
                MongoDB tracks ONLY metadata: when a profile was first seen, how many times it's been computed. 
                This provides consistency signals but is NOT the source of truth.
              </p>
            </div>

            <div>
              <h4 className="font-semibold mb-2">6. Blockchain Audit Log</h4>
              <p className="text-slate-400 text-sm">
                Profile hashes are anchored on Polygon blockchain as an immutable audit log. 
                No profile data goes on-chain - only the hash and timestamp. 
                This proves when a profile existed and prevents retroactive modification.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/70 border-slate-700 backdrop-blur-lg mb-6">
          <CardHeader>
            <CardTitle className="text-white text-xl">Verification Process</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-indigo-900/20 border border-indigo-600/30 p-6 rounded-lg">
              <p className="text-slate-300 font-semibold mb-4">Anyone can verify a profile:</p>
              <ol className="space-y-2 text-slate-400 text-sm list-decimal list-inside">
                <li>Re-fetch the public GitHub/LeetCode/wallet data</li>
                <li>Re-run the deterministic computation logic</li>
                <li>Re-generate the profile artifact</li>
                <li>Re-hash the artifact using SHA-256</li>
                <li>Compare the recomputed hash with the on-chain record</li>
              </ol>
              <p className="text-emerald-400 text-sm mt-4">
                If hashes match → the profile is valid and unmodified.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/70 border-slate-700 backdrop-blur-lg">
          <CardHeader>
            <CardTitle className="text-white text-xl">What We Don't Do</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-slate-400 text-sm">
              <li>❌ We don't issue NFTs or tokens</li>
              <li>❌ We don't require authentication or accounts</li>
              <li>❌ We don't judge code quality or intelligence</li>
              <li>❌ We don't store profile data on-chain (only hashes)</li>
              <li>❌ We don't manually verify or approve profiles</li>
              <li>❌ We don't act as a trusted authority</li>
            </ul>
            <p className="text-emerald-400 text-sm mt-4">
              ✓ We provide a transparent, verifiable computation layer
            </p>
          </CardContent>
        </Card>

        <div className="text-center mt-8">
          <Link to="/">
            <Button size="lg" className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700">
              Generate Your Profile
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}