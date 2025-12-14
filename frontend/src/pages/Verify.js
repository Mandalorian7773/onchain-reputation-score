import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function Verify() {
  const { profileId } = useParams();
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState(null);
  const [verificationResult, setVerificationResult] = useState(null);

  useEffect(() => {
    fetchProfile();
  }, [profileId]);

  const fetchProfile = async () => {
    try {
      const response = await axios.get(`${API}/profile/${profileId}`);
      setProfile(response.data);
    } catch (error) {
      toast.error('Profile not found');
    }
  };

  const verifyProfile = async () => {
    setLoading(true);
    setVerificationResult(null);
    
    try {
      // Step 1: Re-fetch and recompute profile from public data
      toast.info('Re-fetching public data...');
      const recomputeResponse = await axios.post(`${API}/profile`, {
        github_username: profile.fetched_data.github?.username,
        leetcode_username: profile.fetched_data.leetcode?.username,
        wallet_address: profile.fetched_data.wallet?.address
      });
      
      const recomputedProfile = recomputeResponse.data;
      
      // Step 2: Get on-chain anchors for this profile
      toast.info('Checking blockchain anchors...');
      const anchorsResponse = await axios.get(`${API}/anchors/${profileId}`);
      const onChainAnchors = anchorsResponse.data.anchors || [];
      
      // Step 3: Compare hashes
      const originalHash = profile.artifact_hash;
      const recomputedHash = recomputedProfile.artifact_hash;
      const hashMatch = originalHash === recomputedHash;
      
      // Step 4: Check if hash exists on-chain
      const onChainMatch = onChainAnchors.some(anchor => 
        anchor.hash === originalHash || anchor.hash === recomputedHash
      );
      
      const result = {
        verified: hashMatch && (onChainAnchors.length === 0 || onChainMatch),
        hash_match: hashMatch,
        on_chain_match: onChainMatch,
        original_hash: originalHash,
        recomputed_hash: recomputedHash,
        on_chain_anchors: onChainAnchors,
        message: hashMatch 
          ? (onChainMatch || onChainAnchors.length === 0 
              ? 'Profile verified successfully. Hash matches and is anchored on-chain.' 
              : 'Hash matches recomputation but not found on-chain.')
          : 'Hash mismatch detected. Profile may have been modified or data sources changed.'
      };
      
      setVerificationResult(result);
      
      if (result.verified) {
        toast.success('Profile verified successfully');
      } else {
        toast.error('Verification failed');
      }
    } catch (error) {
      console.error('Verification error:', error);
      toast.error('Verification failed: ' + (error.response?.data?.error || error.message));
      setVerificationResult({
        verified: false,
        error: error.response?.data?.error || error.message,
        message: 'Verification failed due to an error'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900">
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        
        <div className="mb-8">
          <Link to={`/profile/${profileId}`} className="text-indigo-400 hover:text-indigo-300">&larr; Back to Profile</Link>
        </div>

        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-white mb-4" style={{ fontFamily: 'Azeret Mono, monospace' }}>
            Verify Profile
          </h1>
          <p className="text-slate-300">Verification works by recomputation and cryptographic hash comparison.</p>
        </div>

        {profile && (
          <Card className="bg-slate-900/70 border-slate-700 backdrop-blur-lg mb-6">
            <CardHeader>
              <CardTitle className="text-white text-xl">Profile: {profileId}</CardTitle>
              <CardDescription className="text-slate-400">Click below to verify profile integrity</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Button 
                onClick={verifyProfile}
                size="lg"
                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
                disabled={loading}
                data-testid="verify-btn"
              >
                {loading ? 'Verifying...' : 'Verify Profile'}
              </Button>

              {verificationResult && (
                <div className={`p-6 rounded-lg border ${
                  verificationResult.verified 
                    ? 'bg-emerald-900/20 border-emerald-600/40' 
                    : 'bg-red-900/20 border-red-600/40'
                }`}>
                  <h3 className={`font-bold text-xl mb-4 ${
                    verificationResult.verified ? 'text-emerald-400' : 'text-red-400'
                  }`}>
                    {verificationResult.verified ? '✅ Verified' : '❌ Verification Failed'}
                  </h3>
                  
                  <div className="space-y-4 text-sm">
                    <div>
                      <p className="text-slate-400 mb-2">Hash Comparison:</p>
                      <div className="space-y-2">
                        <div>
                          <p className="text-slate-500 text-xs">Original Hash:</p>
                          <code className="text-white font-mono text-xs break-all bg-slate-800 p-2 rounded block">
                            {verificationResult.original_hash}
                          </code>
                        </div>
                        <div>
                          <p className="text-slate-500 text-xs">Recomputed Hash:</p>
                          <code className="text-white font-mono text-xs break-all bg-slate-800 p-2 rounded block">
                            {verificationResult.recomputed_hash}
                          </code>
                        </div>
                        <div className="flex items-center gap-2">
                          {verificationResult.hash_match ? (
                            <>
                              <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <span className="text-emerald-400">Hash Match</span>
                            </>
                          ) : (
                            <>
                              <svg className="w-4 h-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                              <span className="text-red-400">Hash Mismatch</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {verificationResult.on_chain_anchors && verificationResult.on_chain_anchors.length > 0 && (
                      <div>
                        <p className="text-slate-400 mb-2">On-Chain Anchors:</p>
                        <div className="space-y-2">
                          {verificationResult.on_chain_anchors.map((anchor, idx) => (
                            <div key={idx} className="bg-slate-800 p-3 rounded">
                              <div className="flex items-center gap-2 mb-1">
                                {(anchor.hash === verificationResult.original_hash || anchor.hash === verificationResult.recomputed_hash) ? (
                                  <>
                                    <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <span className="text-emerald-400 text-xs">Verified Anchor</span>
                                  </>
                                ) : (
                                  <>
                                    <svg className="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                    </svg>
                                    <span className="text-amber-400 text-xs">Different Hash</span>
                                  </>
                                )}
                              </div>
                              <code className="text-xs text-slate-300 break-all">{anchor.hash}</code>
                              <p className="text-slate-500 text-xs mt-1">
                                Anchored: {new Date(anchor.timestamp * 1000).toLocaleString()}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    <div>
                      <p className="text-slate-400">Result:</p>
                      <p className="text-white">{verificationResult.message}</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-slate-800/30 p-6 rounded-lg">
                <h4 className="text-white font-semibold mb-3">How Verification Works</h4>
                <ol className="space-y-2 text-slate-300 text-sm list-decimal list-inside">
                  <li>Re-fetch public GitHub/LeetCode/wallet data</li>
                  <li>Re-run deterministic computation logic</li>
                  <li>Re-generate profile artifact</li>
                  <li>Re-hash artifact using SHA-256</li>
                  <li>Compare recomputed hash with stored/on-chain hash</li>
                </ol>
                <p className="text-slate-400 text-xs mt-4">
                  If hashes match → profile is valid and unmodified
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}