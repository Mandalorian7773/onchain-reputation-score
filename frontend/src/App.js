import { useState, useEffect } from "react";
import "@/App.css";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

function App() {
  const [walletConnected, setWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [history, setHistory] = useState([]);
  
  const [formData, setFormData] = useState({
    github_username: "",
    problem_solving_platform: "leetcode",
    problem_solving_username: "",
    kaggle_username: ""
  });

  // Check for existing wallet connection
  useEffect(() => {
    const checkWalletConnection = async () => {
      await new Promise(resolve => setTimeout(resolve, 500));
      
      if (typeof window.ethereum !== "undefined") {
        try {
          const accounts = await window.ethereum.request({ 
            method: "eth_accounts",
            params: []
          });
          
          if (accounts && accounts.length > 0) {
            setWalletAddress(accounts[0]);
            setWalletConnected(true);
          }
        } catch (error) {
          console.warn("Could not check wallet connection:", error);
        }
      }
    };
    
    checkWalletConnection();
  }, []);

  // Fetch history when analysis is complete
  useEffect(() => {
    if (analysis) {
      fetchHistory();
    }
  }, [analysis]);

  const fetchHistory = async () => {
    try {
      const params = new URLSearchParams();
      if (walletAddress) params.append('wallet_address', walletAddress);
      if (formData.github_username) params.append('github_username', formData.github_username);
      
      const response = await axios.get(`${API}/history?${params}`);
      setHistory(response.data.history || []);
    } catch (error) {
      console.warn('Could not fetch history:', error);
    }
  };

  const connectWallet = async () => {
    if (typeof window.ethereum === "undefined") {
      toast.error("MetaMask not detected");
      return;
    }
    try {
      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
      setWalletAddress(accounts[0]);
      setWalletConnected(true);
      toast.success("Wallet connected");
    } catch (error) {
      toast.error("Failed to connect wallet");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!walletConnected && !formData.github_username && !formData.problem_solving_username && !formData.kaggle_username) {
      toast.error("Please provide at least one profile");
      return;
    }
    
    setLoading(true);
    try {
      const payload = {
        wallet_address: walletConnected ? walletAddress : null,
        github_username: formData.github_username || null,
        problem_solving_platform: formData.problem_solving_platform || null,
        problem_solving_username: formData.problem_solving_username || null,
        kaggle_username: formData.kaggle_username || null
      };
      
      const response = await axios.post(`${API}/analyze`, payload);
      setAnalysis(response.data);
      toast.success("Analysis complete");
    } catch (error) {
      toast.error("Analysis failed: " + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const getConfidenceColor = (level) => {
    if (level === "high") return "bg-emerald-500";
    if (level === "medium") return "bg-amber-500";
    return "bg-red-500";
  };

  const getSignalColor = (strength) => {
    if (strength === "strong") return "bg-emerald-500";
    if (strength === "medium") return "bg-blue-500";
    if (strength === "weak") return "bg-amber-500";
    return "bg-gray-500";
  };

  const getScoreColor = (score) => {
    if (score >= 80) return "text-emerald-400";
    if (score >= 60) return "text-blue-400";
    if (score >= 40) return "text-amber-400";
    return "text-red-400";
  };

  const prepareRadarData = () => {
    if (!analysis) return [];
    const scores = analysis.calculated_scores;
    return [
      { category: 'Wallet', score: scores.wallet_score },
      { category: 'GitHub', score: scores.github_score },
      { category: 'Coding', score: scores.problem_solving_score },
      { category: 'Kaggle', score: scores.kaggle_score }
    ].filter(item => item.score > 0);
  };

  const prepareTimelineData = () => {
    return history.slice(0, 10).reverse().map((h, idx) => ({
      index: idx + 1,
      date: new Date(h.timestamp).toLocaleDateString(),
      overall: h.scores.overall,
      wallet: h.scores.wallet,
      github: h.scores.github,
      coding: h.scores.problem_solving,
      kaggle: h.scores.kaggle
    }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="text-center mb-12">
          <h1 className="text-6xl font-bold text-white mb-4" style={{ fontFamily: 'Azeret Mono, monospace' }}>On-Chain Reputation</h1>
          <p className="text-slate-300 text-lg">Transparent multi-signal reputation analysis</p>
        </div>

        {!walletConnected && !formData.github_username ? (
          <Card className="bg-slate-900/60 border-slate-700 backdrop-blur-md max-w-2xl mx-auto" data-testid="wallet-connect-card">
            <CardHeader>
              <CardTitle className="text-white text-2xl">Connect Your Wallet (Optional)</CardTitle>
              <CardDescription className="text-slate-400">Connect wallet for on-chain analysis, or proceed with GitHub/problem-solving platforms only</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button onClick={connectWallet} size="lg" className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700" data-testid="connect-wallet-btn">
                Install MetaMask
              </Button>
              <div className="text-center">
                <p className="text-slate-500 text-sm mb-2">No wallet detected. You can still analyze GitHub/LeetCode profiles.</p>
                <p className="text-amber-400 text-sm">💡 Tip: Having wallet connection issues?</p>
                <p className="text-slate-400 text-xs">You can analyze GitHub/problem-solving profiles without connecting a wallet!</p>
              </div>
            </CardContent>
          </Card>
        ) : null}

        <div className="space-y-6 mt-8">
          {walletConnected && (
            <Card className="bg-slate-900/60 border-slate-700 backdrop-blur-md">
              <CardHeader>
                <CardTitle className="text-white flex items-center justify-between">
                  <span>Connected: {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}</span>
                  <Badge variant="outline" className="bg-emerald-500/20 text-emerald-400 border-emerald-500">Connected</Badge>
                </CardTitle>
              </CardHeader>
            </Card>
          )}

          <form onSubmit={handleSubmit} data-testid="reputation-form">
            <div className="grid md:grid-cols-2 gap-6">
              <Card className="bg-slate-900/60 border-slate-700 backdrop-blur-md hover:border-slate-600 transition-colors">
                <CardHeader>
                  <CardTitle className="text-white">GitHub Profile (Optional)</CardTitle>
                  <CardDescription className="text-slate-400">Auto-fetch repos, commits, and PR contributions</CardDescription>
                </CardHeader>
                <CardContent>
                  <div>
                    <Label htmlFor="github-username" className="text-slate-300">GitHub Username</Label>
                    <Input 
                      id="github-username" 
                      placeholder="octocat" 
                      value={formData.github_username} 
                      onChange={(e) => updateField('github_username', e.target.value)} 
                      className="bg-slate-800/70 border-slate-700 text-white focus:border-indigo-500" 
                      data-testid="github-username-input" 
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-slate-900/60 border-slate-700 backdrop-blur-md hover:border-slate-600 transition-colors">
                <CardHeader>
                  <CardTitle className="text-white">Problem-Solving Profile (Optional)</CardTitle>
                  <CardDescription className="text-slate-400">Choose platform and we'll fetch stats</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="platform-select" className="text-slate-300">Platform</Label>
                      <Select 
                        value={formData.problem_solving_platform} 
                        onValueChange={(value) => updateField('problem_solving_platform', value)}
                      >
                        <SelectTrigger id="platform-select" className="bg-slate-800/70 border-slate-700 text-white focus:border-indigo-500" data-testid="platform-select">
                          <SelectValue placeholder="Select platform" />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-800 border-slate-700">
                          <SelectItem value="leetcode" className="text-white hover:bg-slate-700">LeetCode</SelectItem>
                          <SelectItem value="codeforces" className="text-white hover:bg-slate-700">Codeforces</SelectItem>
                          <SelectItem value="codechef" className="text-white hover:bg-slate-700">CodeChef</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="problem-solving-username" className="text-slate-300">Username</Label>
                      <Input 
                        id="problem-solving-username" 
                        placeholder={`Your ${formData.problem_solving_platform} username`}
                        value={formData.problem_solving_username} 
                        onChange={(e) => updateField('problem_solving_username', e.target.value)} 
                        className="bg-slate-800/70 border-slate-700 text-white focus:border-indigo-500" 
                        data-testid="problem-solving-username-input" 
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-slate-900/60 border-slate-700 backdrop-blur-md hover:border-slate-600 transition-colors md:col-span-2">
                <CardHeader>
                  <CardTitle className="text-white">Kaggle Profile (Optional)</CardTitle>
                  <CardDescription className="text-slate-400">Fetch your data science competitions, datasets, and notebooks</CardDescription>
                </CardHeader>
                <CardContent>
                  <div>
                    <Label htmlFor="kaggle-username" className="text-slate-300">Kaggle Username</Label>
                    <Input 
                      id="kaggle-username" 
                      placeholder="Your Kaggle username"
                      value={formData.kaggle_username} 
                      onChange={(e) => updateField('kaggle_username', e.target.value)} 
                      className="bg-slate-800/70 border-slate-700 text-white focus:border-indigo-500" 
                      data-testid="kaggle-username-input" 
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            <Button type="submit" size="lg" className="w-full mt-6 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-lg py-6" disabled={loading} data-testid="analyze-btn">
              {loading ? "Analyzing Reputation..." : "Analyze Reputation"}
            </Button>
          </form>

          {analysis && (
            <div className="space-y-6 mt-8">
              <Card className="bg-slate-900/60 border-slate-700 backdrop-blur-md" data-testid="analysis-results">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-white text-3xl">Reputation Analysis</CardTitle>
                      <CardDescription className="text-slate-400">Generated at {new Date(analysis.timestamp).toLocaleString()}</CardDescription>
                    </div>
                    <Badge className={`${getConfidenceColor(analysis.analysis.confidence_level)} text-white text-lg px-4 py-2`} data-testid="confidence-badge">
                      {analysis.analysis.confidence_level.toUpperCase()} CONFIDENCE
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-8">
                  
                  {/* Overall Score Highlight */}
                  <div className="bg-gradient-to-r from-indigo-900/50 to-purple-900/50 p-8 rounded-xl border border-indigo-500/30">
                    <p className="text-slate-300 text-sm mb-2">Overall Reputation Score</p>
                    <div className="flex items-baseline gap-3">
                      <h2 className={`text-6xl font-bold ${getScoreColor(analysis.calculated_scores.overall_score)}`}>
                        {analysis.calculated_scores.overall_score}
                      </h2>
                      <span className="text-slate-400 text-2xl">/100</span>
                    </div>
                    <p className="text-slate-500 text-sm mt-2">Based on {analysis.calculated_scores.categories_provided} {analysis.calculated_scores.categories_provided === 1 ? 'category' : 'categories'}</p>
                  </div>

                  <Separator className="bg-slate-700" />

                  {/* Individual Category Scores */}
                  <div>
                    <h3 className="text-white font-semibold text-xl mb-4">Category Breakdown</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {analysis.calculated_scores.wallet_score > 0 && (
                        <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                          <div className="flex justify-between items-center mb-2">
                            <p className="text-slate-300 font-medium">Wallet</p>
                            <span className={`text-2xl font-bold ${getScoreColor(analysis.calculated_scores.wallet_score)}`}>
                              {analysis.calculated_scores.wallet_score}/100
                            </span>
                          </div>
                          <Progress value={analysis.calculated_scores.wallet_score} className="h-2" />
                          {analysis.fetched_data?.wallet?.found && (
                            <p className="text-slate-400 text-sm mt-2">
                              {analysis.fetched_data.wallet.age_days} days old • {analysis.fetched_data.wallet.tx_count} transactions
                            </p>
                          )}
                        </div>
                      )}

                      {analysis.calculated_scores.github_score > 0 && (
                        <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                          <div className="flex justify-between items-center mb-2">
                            <p className="text-slate-300 font-medium">GitHub</p>
                            <span className={`text-2xl font-bold ${getScoreColor(analysis.calculated_scores.github_score)}`}>
                              {analysis.calculated_scores.github_score}/100
                            </span>
                          </div>
                          <Progress value={analysis.calculated_scores.github_score} className="h-2" />
                          {analysis.fetched_data?.github?.found && (
                            <div className="text-slate-400 text-sm mt-2 space-y-1">
                              <p>{analysis.fetched_data.github.public_repos} repos • ~{analysis.fetched_data.github.total_commits_estimate} commits</p>
                              {analysis.fetched_data.github.total_prs > 0 && (
                                <p className="text-indigo-400">📝 {analysis.fetched_data.github.total_prs} PRs ({analysis.fetched_data.github.merged_prs} merged)</p>
                              )}
                              {analysis.fetched_data.github.contributed_repos_count > 0 && (
                                <p className="text-purple-400">🤝 {analysis.fetched_data.github.contributed_repos_count} external repos</p>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {analysis.calculated_scores.problem_solving_score > 0 && (
                        <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                          <div className="flex justify-between items-center mb-2">
                            <p className="text-slate-300 font-medium capitalize">{analysis.problem_solving_platform || 'Problem Solving'}</p>
                            <span className={`text-2xl font-bold ${getScoreColor(analysis.calculated_scores.problem_solving_score)}`}>
                              {analysis.calculated_scores.problem_solving_score}/100
                            </span>
                          </div>
                          <Progress value={analysis.calculated_scores.problem_solving_score} className="h-2" />
                          {analysis.fetched_data?.problem_solving?.found && (
                            <div className="text-slate-400 text-sm mt-2">
                              {analysis.fetched_data.problem_solving.platform === 'leetcode' && (
                                <p>{analysis.fetched_data.problem_solving.total_solved} solved • {analysis.fetched_data.problem_solving.hard}H {analysis.fetched_data.problem_solving.medium}M {analysis.fetched_data.problem_solving.easy}E</p>
                              )}
                              {analysis.fetched_data.problem_solving.platform === 'codeforces' && (
                                <p>{analysis.fetched_data.problem_solving.total_solved} solved • Rating: {analysis.fetched_data.problem_solving.rating} (Max: {analysis.fetched_data.problem_solving.max_rating})</p>
                              )}
                              {analysis.fetched_data.problem_solving.platform === 'codechef' && (
                                <p>{analysis.fetched_data.problem_solving.total_solved} solved • Rating: {analysis.fetched_data.problem_solving.rating}</p>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {analysis.calculated_scores.kaggle_score > 0 && (
                        <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                          <div className="flex justify-between items-center mb-2">
                            <p className="text-slate-300 font-medium">Kaggle</p>
                            <span className={`text-2xl font-bold ${getScoreColor(analysis.calculated_scores.kaggle_score)}`}>
                              {analysis.calculated_scores.kaggle_score}/100
                            </span>
                          </div>
                          <Progress value={analysis.calculated_scores.kaggle_score} className="h-2" />
                          {analysis.fetched_data?.kaggle?.found && (
                            <p className="text-slate-400 text-sm mt-2">
                              {analysis.fetched_data.kaggle.competitions} competitions • {analysis.fetched_data.kaggle.datasets} datasets • {analysis.fetched_data.kaggle.notebooks} notebooks
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Radar Chart */}
                  {prepareRadarData().length > 0 && (
                    <>
                      <Separator className="bg-slate-700" />
                      <div>
                        <h3 className="text-white font-semibold text-xl mb-4">Score Distribution</h3>
                        <div className="bg-slate-800/30 p-6 rounded-xl">
                          <ResponsiveContainer width="100%" height={300}>
                            <RadarChart data={prepareRadarData()}>
                              <PolarGrid stroke="#475569" />
                              <PolarAngleAxis dataKey="category" stroke="#94a3b8" />
                              <PolarRadiusAxis angle={90} domain={[0, 100]} stroke="#64748b" />
                              <Radar name="Score" dataKey="score" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.6} />
                            </RadarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </>
                  )}

                  {/* Progress Over Time */}
                  {history.length > 1 && (
                    <>
                      <Separator className="bg-slate-700" />
                      <div>
                        <h3 className="text-white font-semibold text-xl mb-4">Progress Over Time</h3>
                        <div className="bg-slate-800/30 p-6 rounded-xl">
                          <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={prepareTimelineData()}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                              <XAxis dataKey="date" stroke="#94a3b8" />
                              <YAxis domain={[0, 100]} stroke="#94a3b8" />
                              <Tooltip 
                                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px' }}
                                labelStyle={{ color: '#cbd5e1' }}
                              />
                              <Legend wrapperStyle={{ color: '#cbd5e1' }} />
                              <Line type="monotone" dataKey="overall" stroke="#8b5cf6" strokeWidth={3} name="Overall" />
                              <Line type="monotone" dataKey="github" stroke="#06b6d4" strokeWidth={2} name="GitHub" />
                              <Line type="monotone" dataKey="coding" stroke="#10b981" strokeWidth={2} name="Coding" />
                              <Line type="monotone" dataKey="kaggle" stroke="#f59e0b" strokeWidth={2} name="Kaggle" />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </>
                  )}

                  <Separator className="bg-slate-700" />

                  {/* Signal Strength */}
                  <div>
                    <h3 className="text-white font-semibold text-xl mb-4">Signal Analysis</h3>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                      <div className="bg-slate-800/50 p-4 rounded-lg text-center">
                        <p className="text-slate-400 text-sm mb-2">Wallet</p>
                        <Badge className={`${getSignalColor(analysis.analysis.signal_strength.wallet)} text-white`}>
                          {analysis.analysis.signal_strength.wallet}
                        </Badge>
                      </div>
                      <div className="bg-slate-800/50 p-4 rounded-lg text-center">
                        <p className="text-slate-400 text-sm mb-2">GitHub</p>
                        <Badge className={`${getSignalColor(analysis.analysis.signal_strength.github)} text-white`}>
                          {analysis.analysis.signal_strength.github}
                        </Badge>
                      </div>
                      <div className="bg-slate-800/50 p-4 rounded-lg text-center">
                        <p className="text-slate-400 text-sm mb-2">Coding</p>
                        <Badge className={`${getSignalColor(analysis.analysis.signal_strength.problem_solving)} text-white`}>
                          {analysis.analysis.signal_strength.problem_solving}
                        </Badge>
                      </div>
                      <div className="bg-slate-800/50 p-4 rounded-lg text-center">
                        <p className="text-slate-400 text-sm mb-2">Kaggle</p>
                        <Badge className={`${getSignalColor(analysis.analysis.signal_strength.kaggle)} text-white`}>
                          {analysis.analysis.signal_strength.kaggle}
                        </Badge>
                      </div>
                      <div className="bg-slate-800/50 p-4 rounded-lg text-center">
                        <p className="text-slate-400 text-sm mb-2">Consistency</p>
                        <Badge className={`${getSignalColor(analysis.analysis.signal_strength.consistency)} text-white`}>
                          {analysis.analysis.signal_strength.consistency}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {analysis.analysis.anomalies_detected?.length > 0 && (
                    <>
                      <Separator className="bg-slate-700" />
                      <div>
                        <h3 className="text-white font-semibold text-xl mb-4">⚠️ Anomalies Detected</h3>
                        <div className="space-y-3">
                          {analysis.analysis.anomalies_detected.map((anomaly, idx) => (
                            <div key={idx} className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-lg">
                              <p className="text-amber-300">{anomaly}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}

                  <Separator className="bg-slate-700" />

                  <div>
                    <h3 className="text-white font-semibold text-xl mb-4">Analysis Reasoning</h3>
                    <div className="space-y-3">
                      {analysis.analysis.confidence_reasoning.map((reason, idx) => (
                        <div key={idx} className="bg-slate-800/50 p-4 rounded-lg border border-slate-700">
                          <p className="text-slate-300">• {reason}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {analysis.analysis.notes?.length > 0 && (
                    <>
                      <Separator className="bg-slate-700" />
                      <div>
                        <h3 className="text-white font-semibold text-xl mb-4">Additional Notes</h3>
                        <div className="space-y-2">
                          {analysis.analysis.notes.map((note, idx) => (
                            <p key={idx} className="text-slate-400 text-sm bg-slate-800/30 p-3 rounded-lg">
                              {note}
                            </p>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;