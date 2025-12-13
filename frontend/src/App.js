import { useState } from "react";
import "@/App.css";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

function App() {
  const [walletConnected, setWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  
  const [formData, setFormData] = useState({
    github_username: "",
    leetcode_username: ""
  });

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
    if (!walletConnected) {
      toast.error("Please connect wallet first");
      return;
    }
    
    setLoading(true);
    try {
      const payload = {
        wallet_address: walletAddress,
        github_username: formData.github_username || null,
        leetcode_username: formData.leetcode_username || null
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-white mb-4" style={{ fontFamily: 'Azeret Mono, monospace' }}>On-Chain Reputation System</h1>
          <p className="text-slate-400 text-lg">Transparent, explainable reputation analysis powered by AI</p>
        </div>

        {!walletConnected ? (
          <Card className="bg-slate-900/50 border-slate-700 backdrop-blur-sm" data-testid="wallet-connect-card">
            <CardHeader>
              <CardTitle className="text-white">Connect Your Wallet</CardTitle>
              <CardDescription className="text-slate-400">Connect your wallet to begin reputation analysis</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={connectWallet} size="lg" className="w-full" data-testid="connect-wallet-btn">
                Connect MetaMask
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            <Card className="bg-slate-900/50 border-slate-700 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white flex items-center justify-between">
                  <span>Connected: {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}</span>
                  <Badge variant="outline" className="bg-emerald-500/20 text-emerald-400 border-emerald-500">Connected</Badge>
                </CardTitle>
              </CardHeader>
            </Card>

            <form onSubmit={handleSubmit} data-testid="reputation-form">
              <div className="space-y-6">
                <Card className="bg-slate-900/50 border-slate-700 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="text-white">GitHub Profile (Optional)</CardTitle>
                    <CardDescription className="text-slate-400">We'll automatically fetch your public GitHub activity</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div>
                      <Label htmlFor="github-username" className="text-slate-300">GitHub Username</Label>
                      <Input 
                        id="github-username" 
                        placeholder="octocat" 
                        value={formData.github_username} 
                        onChange={(e) => updateField('github_username', e.target.value)} 
                        className="bg-slate-800 border-slate-700 text-white" 
                        data-testid="github-username-input" 
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-slate-900/50 border-slate-700 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="text-white">LeetCode Profile (Optional)</CardTitle>
                    <CardDescription className="text-slate-400">We'll automatically fetch your problem-solving stats</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div>
                      <Label htmlFor="leetcode-username" className="text-slate-300">LeetCode Username</Label>
                      <Input 
                        id="leetcode-username" 
                        placeholder="username" 
                        value={formData.leetcode_username} 
                        onChange={(e) => updateField('leetcode_username', e.target.value)} 
                        className="bg-slate-800 border-slate-700 text-white" 
                        data-testid="leetcode-username-input" 
                      />
                    </div>
                  </CardContent>
                </Card>

                <Button type="submit" size="lg" className="w-full" disabled={loading} data-testid="analyze-btn">
                  {loading ? "Analyzing..." : "Analyze Reputation"}
                </Button>
              </div>
            </form>

            {analysis && (
              <Card className="bg-slate-900/50 border-slate-700 backdrop-blur-sm" data-testid="analysis-results">
                <CardHeader>
                  <CardTitle className="text-white text-2xl">Reputation Analysis</CardTitle>
                  <CardDescription className="text-slate-400">Generated at {new Date(analysis.timestamp).toLocaleString()}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <h3 className="text-white font-semibold mb-3">Overall Confidence</h3>
                    <Badge className={`${getConfidenceColor(analysis.analysis.confidence_level)} text-white text-lg px-4 py-2`} data-testid="confidence-badge">
                      {analysis.analysis.confidence_level.toUpperCase()}
                    </Badge>
                  </div>

                  <Separator className="bg-slate-700" />

                  <div>
                    <h3 className="text-white font-semibold mb-3">Signal Strength</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="bg-slate-800/50 p-3 rounded-lg">
                        <p className="text-slate-400 text-sm mb-1">Wallet</p>
                        <Badge className={`${getSignalColor(analysis.analysis.signal_strength.wallet)} text-white`}>
                          {analysis.analysis.signal_strength.wallet}
                        </Badge>
                      </div>
                      <div className="bg-slate-800/50 p-3 rounded-lg">
                        <p className="text-slate-400 text-sm mb-1">GitHub</p>
                        <Badge className={`${getSignalColor(analysis.analysis.signal_strength.github)} text-white`}>
                          {analysis.analysis.signal_strength.github}
                        </Badge>
                      </div>
                      <div className="bg-slate-800/50 p-3 rounded-lg">
                        <p className="text-slate-400 text-sm mb-1">Problem Solving</p>
                        <Badge className={`${getSignalColor(analysis.analysis.signal_strength.problem_solving)} text-white`}>
                          {analysis.analysis.signal_strength.problem_solving}
                        </Badge>
                      </div>
                      <div className="bg-slate-800/50 p-3 rounded-lg">
                        <p className="text-slate-400 text-sm mb-1">Consistency</p>
                        <Badge className={`${getSignalColor(analysis.analysis.signal_strength.consistency)} text-white`}>
                          {analysis.analysis.signal_strength.consistency}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <Separator className="bg-slate-700" />

                  <div>
                    <h3 className="text-white font-semibold mb-3">Fetched Data</h3>
                    <div className="space-y-3">
                      {analysis.fetched_data?.wallet && (
                        <div className="bg-slate-800/50 p-3 rounded-lg">
                          <p className="text-slate-400 text-sm mb-1">Wallet (Polygon)</p>
                          <p className="text-white">{analysis.fetched_data.wallet.found ? `${analysis.fetched_data.wallet.age_days} days old, ${analysis.fetched_data.wallet.tx_count} transactions` : 'Not found or no activity'}</p>
                        </div>
                      )}
                      {analysis.fetched_data?.github && (
                        <div className="bg-slate-800/50 p-3 rounded-lg">
                          <p className="text-slate-400 text-sm mb-1">GitHub</p>
                          <p className="text-white">{analysis.fetched_data.github.found ? `${analysis.fetched_data.github.public_repos} repos, ~${analysis.fetched_data.github.total_commits_estimate} commits` : 'Not found'}</p>
                        </div>
                      )}
                      {analysis.fetched_data?.leetcode && (
                        <div className="bg-slate-800/50 p-3 rounded-lg">
                          <p className="text-slate-400 text-sm mb-1">LeetCode</p>
                          <p className="text-white">{analysis.fetched_data.leetcode.found ? `${analysis.fetched_data.leetcode.total_solved} solved (${analysis.fetched_data.leetcode.easy}E/${analysis.fetched_data.leetcode.medium}M/${analysis.fetched_data.leetcode.hard}H)` : 'Not found'}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <Separator className="bg-slate-700" />

                  <div>
                    <h3 className="text-white font-semibold mb-3">Calculated Scores</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      <div className="bg-slate-800/50 p-3 rounded-lg">
                        <p className="text-slate-400 text-sm">Wallet</p>
                        <p className="text-white text-xl font-bold">{analysis.calculated_scores.wallet_score}</p>
                      </div>
                      <div className="bg-slate-800/50 p-3 rounded-lg">
                        <p className="text-slate-400 text-sm">GitHub</p>
                        <p className="text-white text-xl font-bold">{analysis.calculated_scores.github_score}</p>
                      </div>
                      <div className="bg-slate-800/50 p-3 rounded-lg">
                        <p className="text-slate-400 text-sm">Problem Solving</p>
                        <p className="text-white text-xl font-bold">{analysis.calculated_scores.problem_solving_score}</p>
                      </div>
                      <div className="bg-slate-800/50 p-3 rounded-lg">
                        <p className="text-slate-400 text-sm">Consistency</p>
                        <p className="text-white text-xl font-bold">{analysis.calculated_scores.consistency_score}</p>
                      </div>
                      <div className="bg-slate-800/50 p-3 rounded-lg col-span-2">
                        <p className="text-slate-400 text-sm">Final Score</p>
                        <p className="text-white text-2xl font-bold">{analysis.calculated_scores.final_score}</p>
                      </div>
                    </div>
                  </div>

                  {analysis.analysis.anomalies_detected?.length > 0 && (
                    <>
                      <Separator className="bg-slate-700" />
                      <div>
                        <h3 className="text-white font-semibold mb-3">Anomalies Detected</h3>
                        <ul className="space-y-2">
                          {analysis.analysis.anomalies_detected.map((anomaly, idx) => (
                            <li key={idx} className="text-amber-400 bg-amber-500/10 p-3 rounded-lg border border-amber-500/30">
                              {anomaly}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </>
                  )}

                  <Separator className="bg-slate-700" />

                  <div>
                    <h3 className="text-white font-semibold mb-3">Confidence Reasoning</h3>
                    <ul className="space-y-2">
                      {analysis.analysis.confidence_reasoning.map((reason, idx) => (
                        <li key={idx} className="text-slate-300 bg-slate-800/50 p-3 rounded-lg">
                          • {reason}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {analysis.analysis.notes?.length > 0 && (
                    <>
                      <Separator className="bg-slate-700" />
                      <div>
                        <h3 className="text-white font-semibold mb-3">Notes</h3>
                        <ul className="space-y-2">
                          {analysis.analysis.notes.map((note, idx) => (
                            <li key={idx} className="text-slate-400 text-sm bg-slate-800/30 p-3 rounded-lg">
                              {note}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;