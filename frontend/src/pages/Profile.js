import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function Profile() {
  const { profileId } = useParams();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    fetchProfile();
  }, [profileId]);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/profile/${profileId}`);
      setProfile(response.data);
    } catch (error) {
      toast.error('Profile not found');
    } finally {
      setLoading(false);
    }
  };

  const getRoleBadgeColor = (fit) => {
    if (fit === 'Strong') return 'bg-emerald-500';
    if (fit === 'Medium') return 'bg-blue-500';
    return 'bg-slate-600';
  };

  const getScoreColor = (score) => {
    if (score >= 70) return 'text-emerald-400';
    if (score >= 50) return 'text-blue-400';
    if (score >= 30) return 'text-amber-400';
    return 'text-slate-400';
  };

  const copyToClipboard = (text) => {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    document.body.appendChild(textArea);
    textArea.select();
    try {
      document.execCommand('copy');
      toast.success('Copied!');
    } catch (err) {
      toast.error('Copy failed');
    }
    document.body.removeChild(textArea);
  };

  const shareProfile = () => {
    const url = window.location.href;
    copyToClipboard(url);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 flex items-center justify-center">
        <p className="text-white text-xl">Loading profile...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-white text-xl mb-4">Profile not found</p>
          <Link to="/">
            <Button>Generate New Profile</Button>
          </Link>
        </div>
      </div>
    );
  }

  const timeSpan = profile.platform_history.platform_age_days > 0 
    ? `${profile.platform_history.compute_count} evaluations over ${Math.floor(profile.platform_history.platform_age_days / 30)} months`
    : `${profile.platform_history.compute_count} evaluation${profile.platform_history.compute_count > 1 ? 's' : ''}`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900">
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        
        <div className="flex justify-between items-center mb-8">
          <Link to="/" className="text-indigo-400 hover:text-indigo-300">&larr; Generate New</Link>
          <div className="flex gap-3">
            <Button variant="outline" onClick={shareProfile} className="border-slate-600 text-slate-300 hover:bg-slate-800">
              Share Profile
            </Button>
            <Link to={`/verify/${profileId}`}>
              <Button variant="outline" className="border-indigo-600 text-indigo-400 hover:bg-indigo-600/20">
                Verify
              </Button>
            </Link>
          </div>
        </div>

        <Card className="bg-gradient-to-r from-emerald-900/30 to-teal-900/30 border-emerald-600/40 backdrop-blur-lg mb-6">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="bg-emerald-500/20 p-3 rounded-lg">
                <svg className="w-8 h-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-emerald-400 font-bold text-xl mb-2">Verified Developer Profile</h3>
                <p className="text-slate-300 text-sm mb-4">
                  This profile is generated from public data and can be independently reproduced.
                </p>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-slate-400">Platform Age</p>
                    <p className="text-white font-semibold">
                      {profile.platform_history.first_seen_at 
                        ? new Date(profile.platform_history.first_seen_at).toLocaleDateString()
                        : 'Just created'}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-400">Consistency</p>
                    <p className="text-white font-semibold">{timeSpan}</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/70 border-slate-700 backdrop-blur-lg mb-6">
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-white text-2xl">Role Fit Assessment</CardTitle>
                <CardDescription className="text-slate-400">Inferred from observable technical signals</CardDescription>
              </div>
              <Badge className={`${
                profile.artifact.ai_interpretation.confidence === 'High' ? 'bg-emerald-500' :
                profile.artifact.ai_interpretation.confidence === 'Medium' ? 'bg-blue-500' : 'bg-amber-500'
              } text-white px-4 py-2`}>
                {profile.artifact.ai_interpretation.confidence} Confidence
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-indigo-900/20 border border-indigo-600/30 p-4 rounded-lg">
              <p className="text-slate-300">{profile.artifact.ai_interpretation.summary}</p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-slate-800/50 p-4 rounded-lg text-center">
                <p className="text-slate-400 text-sm mb-2">Frontend</p>
                <Badge className={`${getRoleBadgeColor(profile.artifact.ai_interpretation.role_fit.frontend)} text-white`}>
                  {profile.artifact.ai_interpretation.role_fit.frontend}
                </Badge>
                <p className="text-slate-500 text-xs mt-2">{profile.artifact.role_signals.frontend} signals</p>
              </div>
              <div className="bg-slate-800/50 p-4 rounded-lg text-center">
                <p className="text-slate-400 text-sm mb-2">Backend</p>
                <Badge className={`${getRoleBadgeColor(profile.artifact.ai_interpretation.role_fit.backend)} text-white`}>
                  {profile.artifact.ai_interpretation.role_fit.backend}
                </Badge>
                <p className="text-slate-500 text-xs mt-2">{profile.artifact.role_signals.backend} signals</p>
              </div>
              <div className="bg-slate-800/50 p-4 rounded-lg text-center">
                <p className="text-slate-400 text-sm mb-2">Data</p>
                <Badge className={`${getRoleBadgeColor(profile.artifact.ai_interpretation.role_fit.data)} text-white`}>
                  {profile.artifact.ai_interpretation.role_fit.data}
                </Badge>
                <p className="text-slate-500 text-xs mt-2">{profile.artifact.role_signals.data} signals</p>
              </div>
              <div className="bg-slate-800/50 p-4 rounded-lg text-center">
                <p className="text-slate-400 text-sm mb-2">DevOps</p>
                <Badge className={`${getRoleBadgeColor(profile.artifact.ai_interpretation.role_fit.devops)} text-white`}>
                  {profile.artifact.ai_interpretation.role_fit.devops}
                </Badge>
                <p className="text-slate-500 text-xs mt-2">{profile.artifact.role_signals.devops} signals</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/70 border-slate-700 backdrop-blur-lg mb-6">
          <CardHeader>
            <CardTitle className="text-white text-2xl">Deterministic Scores</CardTitle>
            <CardDescription className="text-slate-400">Reproducible from public data</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-6">
              {profile.artifact.deterministic_scores.github_score > 0 && (
                <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700">
                  <p className="text-slate-400 text-sm mb-2">GitHub</p>
                  <div className="flex items-baseline gap-2 mb-3">
                    <span className={`text-4xl font-bold ${getScoreColor(profile.artifact.deterministic_scores.github_score)}`}>
                      {profile.artifact.deterministic_scores.github_score}
                    </span>
                    <span className="text-slate-500 text-xl">/100</span>
                  </div>
                  <Progress value={profile.artifact.deterministic_scores.github_score} className="h-2" />
                </div>
              )}

              {profile.artifact.deterministic_scores.leetcode_score > 0 && (
                <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700">
                  <p className="text-slate-400 text-sm mb-2">LeetCode</p>
                  <div className="flex items-baseline gap-2 mb-3">
                    <span className={`text-4xl font-bold ${getScoreColor(profile.artifact.deterministic_scores.leetcode_score)}`}>
                      {profile.artifact.deterministic_scores.leetcode_score}
                    </span>
                    <span className="text-slate-500 text-xl">/100</span>
                  </div>
                  <Progress value={profile.artifact.deterministic_scores.leetcode_score} className="h-2" />
                </div>
              )}

              {profile.artifact.deterministic_scores.wallet_persistence_score > 0 && (
                <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700">
                  <p className="text-slate-400 text-sm mb-2">Wallet Persistence</p>
                  <div className="flex items-baseline gap-2 mb-3">
                    <span className={`text-4xl font-bold ${getScoreColor(profile.artifact.deterministic_scores.wallet_persistence_score)}`}>
                      {profile.artifact.deterministic_scores.wallet_persistence_score}
                    </span>
                    <span className="text-slate-500 text-xl">/100</span>
                  </div>
                  <Progress value={profile.artifact.deterministic_scores.wallet_persistence_score} className="h-2" />
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {profile.fetched_data.github?.analyzed_repos?.length > 0 && (
          <Card className="bg-slate-900/70 border-slate-700 backdrop-blur-lg mb-6">
            <CardHeader>
              <CardTitle className="text-white text-xl">Analyzed Repositories</CardTitle>
              <CardDescription className="text-slate-400">Top repos analyzed for role signals</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {profile.fetched_data.github.analyzed_repos.map((repo, idx) => (
                  <div key={idx} className="bg-slate-800/50 p-4 rounded-lg border border-slate-700">
                    <p className="text-white font-semibold mb-2">{repo.name}</p>
                    <div className="flex flex-wrap gap-2">
                      {repo.languages.slice(0, 8).map((lang, i) => (
                        <Badge key={i} variant="outline" className="bg-blue-500/20 text-blue-400 border-blue-600 text-xs">
                          {lang}
                        </Badge>
                      ))}
                      {repo.frameworks.map((fw, i) => (
                        <Badge key={i} variant="outline" className="bg-purple-500/20 text-purple-400 border-purple-600 text-xs">
                          {fw}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="bg-slate-900/70 border-slate-700 backdrop-blur-lg">
          <CardHeader>
            <CardTitle className="text-white text-xl">Verification Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-indigo-900/20 border border-indigo-600/30 p-4 rounded-lg">
              <p className="text-indigo-300 text-sm">
                <strong>Reproducible from public data</strong>
              </p>
              <p className="text-slate-400 text-xs mt-2">
                {profile.blockchain_proof.anchored ? (
                  <>
                    On-chain anchored • 
                    <a 
                      href={`https://polygonscan.com/tx/${profile.blockchain_proof.tx_hash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-400 hover:underline"
                    >
                      View on Polygonscan
                    </a>
                  </>
                ) : (
                  'On-chain anchoring pending'
                )}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}