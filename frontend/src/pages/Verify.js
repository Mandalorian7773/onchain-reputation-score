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
    try {
      const response = await axios.get(`${API}/verify/${profileId}?hash=${profile.artifact_hash}`);
      setVerificationResult(response.data);
      
      if (response.data.verified) {
        toast.success('Profile verified successfully');
      } else {
        toast.error('Hash mismatch detected');
      }
    } catch (error) {
      toast.error('Verification failed');
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
                    {verificationResult.verified ? '✓ Verification Successful' : '✗ Verification Failed'}
                  </h3>
                  
                  <div className="space-y-3 text-sm">
                    <div>
                      <p className="text-slate-400">Stored Hash:</p>
                      <code className="text-white font-mono text-xs break-all">{verificationResult.expected_hash}</code>
                    </div>
                    <div>
                      <p className="text-slate-400">Provided Hash:</p>
                      <code className="text-white font-mono text-xs break-all">{verificationResult.provided_hash}</code>
                    </div>
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