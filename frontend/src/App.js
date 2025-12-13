import { useState } from "react";
import "@/App.css";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

function App() {
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState(null);
  
  const [formData, setFormData] = useState({
    github_username: "",
    leetcode_username: "",
    wallet_address: ""
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.github_username && !formData.leetcode_username && !formData.wallet_address) {
      toast.error("Please provide at least one input");
      return;
    }
    
    setLoading(true);
    try {
      const payload = {
        github_username: formData.github_username || null,
        leetcode_username: formData.leetcode_username || null,
        wallet_address: formData.wallet_address || null
      };
      
      const response = await axios.post(`${API}/profile`, payload);
      setProfile(response.data);
      toast.success("Profile generated");
    } catch (error) {
      toast.error("Failed: " + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const getRoleBadgeColor = (fit) => {
    if (fit === "Strong") return "bg-emerald-500";
    if (fit === "Medium") return "bg-blue-500";
    return "bg-slate-600";
  };

  const getScoreColor = (score) => {
    if (score >= 70) return "text-emerald-400";
    if (score >= 50) return "text-blue-400";
    if (score >= 30) return "text-amber-400";
    return "text-slate-400";
  };

  const copyHash = () => {
    if (profile?.artifact_hash) {
      navigator.clipboard.writeText(profile.artifact_hash);
      toast.success("Hash copied to clipboard");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900">
      <div className="container mx-auto px-4 py-12 max-w-5xl">
        
        <div className="text-center mb-16">
          <h1 className="text-6xl font-bold text-white mb-4" style={{ fontFamily: 'Azeret Mono, monospace' }}>
            Verifiable Developer Reputation
          </h1>
          <p className="text-slate-300 text-lg mb-2">Transparent, reproducible, cryptographically verified</p>
          <p className="text-slate-400 text-sm">No trust required. All profiles are verifiable from public data.</p>
        </div>

        <Card className="bg-slate-900/70 border-slate-700 backdrop-blur-lg mb-8">
          <CardHeader>
            <CardTitle className="text-white text-2xl">Generate Reputation Profile</CardTitle>
            <CardDescription className="text-slate-400">Enter at least one identifier. Data fetched from public sources.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6" data-testid="profile-form">
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="github" className="text-slate-300">GitHub Username</Label>
                  <Input 
                    id="github"
                    placeholder="octocat"
                    value={formData.github_username}
                    onChange={(e) => updateField('github_username', e.target.value)}
                    className="bg-slate-800/70 border-slate-600 text-white focus:border-indigo-500"
                    data-testid="github-input"
                  />
                </div>
                <div>
                  <Label htmlFor="leetcode" className="text-slate-300">LeetCode Username</Label>
                  <Input 
                    id="leetcode"
                    placeholder="username"
                    value={formData.leetcode_username}
                    onChange={(e) => updateField('leetcode_username', e.target.value)}
                    className="bg-slate-800/70 border-slate-600 text-white focus:border-indigo-500"
                    data-testid="leetcode-input"
                  />
                </div>
                <div>
                  <Label htmlFor="wallet" className="text-slate-300">Wallet (Optional)</Label>
                  <Input 
                    id="wallet"
                    placeholder="0x..."
                    value={formData.wallet_address}
                    onChange={(e) => updateField('wallet_address', e.target.value)}
                    className="bg-slate-800/70 border-slate-600 text-white focus:border-indigo-500"
                    data-testid="wallet-input"
                  />
                </div>
              </div>
              <Button 
                type="submit" 
                size="lg" 
                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-lg py-6"
                disabled={loading}
                data-testid="generate-btn"
              >
                {loading ? "Generating..." : "Generate Verifiable Profile"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {profile && (
          <div className="space-y-6">
            
            <Card className="bg-gradient-to-r from-emerald-900/30 to-teal-900/30 border-emerald-600/40 backdrop-blur-lg">
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className="bg-emerald-500/20 p-3 rounded-lg">
                    <svg className="w-8 h-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-emerald-400 font-bold text-xl mb-2">Cryptographically Verified</h3>
                    <p className="text-slate-300 text-sm mb-3">{profile.verification.message}</p>
                    <div className="bg-slate-900/50 p-3 rounded-lg mb-3">
                      <p className="text-slate-400 text-xs mb-1">Profile Hash (SHA-256)</p>
                      <div className="flex items-center gap-2">
                        <code className="text-emerald-400 text-xs font-mono break-all flex-1">{profile.artifact_hash}</code>
                        <Button size="sm" variant="outline" onClick={copyHash} className="shrink-0 border-emerald-600 text-emerald-400 hover:bg-emerald-600/20">
                          Copy
                        </Button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-slate-400">Platform Age</p>
                        <p className="text-white font-semibold">{profile.platform_history.platform_age_days} days</p>
                      </div>
                      <div>
                        <p className="text-slate-400">Computes</p>
                        <p className="text-white font-semibold">{profile.platform_history.compute_count}x</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-900/70 border-slate-700 backdrop-blur-lg">
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

            <Card className="bg-slate-900/70 border-slate-700 backdrop-blur-lg">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-white text-2xl">Role Fit Interpretation</CardTitle>
                    <CardDescription className="text-slate-400">AI analysis from observed signals</CardDescription>
                  </div>
                  <Badge className={`${
                    profile.artifact.ai_interpretation.confidence === 'High' ? 'bg-emerald-500' :
                    profile.artifact.ai_interpretation.confidence === 'Medium' ? 'bg-blue-500' : 'bg-amber-500'
                  } text-white px-4 py-2`}>
                    {profile.artifact.ai_interpretation.confidence}
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

            <Card className="bg-slate-900/70 border-slate-700 backdrop-blur-lg">
              <CardHeader>
                <CardTitle className="text-white text-xl">Platform History</CardTitle>
                <CardDescription className="text-slate-400">Consistency tracking</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-6">
                  <div className="bg-slate-800/50 p-4 rounded-xl">
                    <p className="text-slate-400 text-sm mb-1">First Seen</p>
                    <p className="text-white font-semibold">
                      {profile.platform_history.first_seen_at 
                        ? new Date(profile.platform_history.first_seen_at).toLocaleDateString()
                        : 'Just now'}
                    </p>
                  </div>
                  <div className="bg-slate-800/50 p-4 rounded-xl">
                    <p className="text-slate-400 text-sm mb-1">Platform Age</p>
                    <p className="text-white font-semibold">{profile.platform_history.platform_age_days} days</p>
                  </div>
                  <div className="bg-slate-800/50 p-4 rounded-xl">
                    <p className="text-slate-400 text-sm mb-1">Computes</p>
                    <p className="text-white font-semibold">{profile.platform_history.compute_count}x</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {profile.fetched_data.github?.analyzed_repos?.length > 0 && (
              <Card className="bg-slate-900/70 border-slate-700 backdrop-blur-lg">
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
                          {repo.languages.slice(0, 5).map((lang, i) => (
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
                <CardTitle className="text-white text-xl">Verification</CardTitle>
              </CardHeader>
              <CardContent>
                <ol className="space-y-2 text-slate-300 text-sm">
                  {profile.verification.verification_steps.map((step, idx) => (
                    <li key={idx} className="bg-slate-800/30 p-3 rounded-lg">
                      {step}
                    </li>
                  ))}
                </ol>
                <div className="mt-6 bg-indigo-900/20 border border-indigo-600/30 p-4 rounded-lg">
                  <p className="text-indigo-300 text-sm">
                    <strong>Blockchain:</strong> {profile.blockchain_proof.anchored ? 'Hash anchored on Polygon' : profile.blockchain_proof.note}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
