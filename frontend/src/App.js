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
    problem_solving_platform: "leetcode",
    problem_solving_username: "",
    kaggle_username: ""
  });

  // Check for existing wallet connection on component mount
  useEffect(() => {
    const checkWalletConnection = async () => {
      // Wait a bit for browser extensions to load
      await new Promise(resolve => setTimeout(resolve, 500));
      
      if (typeof window.ethereum !== "undefined") {
        try {
          // Safely check for existing connections
          const accounts = await window.ethereum.request({ 
            method: "eth_accounts",
            params: []
          });
          
          if (accounts && accounts.length > 0) {
            setWalletAddress(accounts[0]);
            setWalletConnected(true);
          }
        } catch (error) {
          // Silently handle errors during initial check
          console.warn("Could not check wallet connection:", error);
        }
      }
    };
    
    // Suppress browser-specific wallet extension errors
    const originalError = console.error;
    console.error = (...args) => {
      const message = args[0]?.toString() || '';
      if (message.includes('evmAsk.js') || 
          message.includes('solanaActionsContentScript.js') ||
          message.includes('Unexpected error')) {
        // Suppress these browser extension errors
        return;
      }
      originalError.apply(console, args);
    };
    
    checkWalletConnection();
    
    // Restore original console.error after component unmounts
    return () => {
      console.error = originalError;
    };
  }, []);

  // Helper function to try alternative connection methods for Comet
  const tryAlternativeConnection = async () => {
    console.log("Trying alternative connection methods for Comet...");
    
    // Method 1: Try window.comet if it exists
    if (typeof window.comet !== "undefined") {
      console.log("Found window.comet, attempting connection...");
      try {
        const accounts = await window.comet.request({ method: "eth_requestAccounts" });
        if (accounts && accounts.length > 0) {
          setWalletAddress(accounts[0]);
          setWalletConnected(true);
          toast.success("Connected via Comet wallet");
          return true;
        }
      } catch (error) {
        console.log("window.comet connection failed:", error);
      }
    }
    
    // Method 2: Try to trigger wallet manually
    if (window.ethereum) {
      try {
        // Force enable the provider
        await window.ethereum.enable();
        const accounts = await window.ethereum.request({ method: "eth_accounts" });
        if (accounts && accounts.length > 0) {
          setWalletAddress(accounts[0]);
          setWalletConnected(true);
          toast.success("Connected via ethereum.enable()");
          return true;
        }
      } catch (error) {
        console.log("ethereum.enable() failed:", error);
      }
    }
    
    return false;
  };

  const connectWallet = async () => {
    // Enhanced browser detection - Comet browser detection
    const userAgent = navigator.userAgent.toLowerCase();
    console.log("Full user agent:", navigator.userAgent);
    
    // Comet browser might not have "comet" in user agent, so check for other indicators
    const isComet = userAgent.includes('comet') || 
                   userAgent.includes('cometbrowser') ||
                   // Check for Comet-specific window properties
                   (typeof window !== 'undefined' && (
                     window.comet || 
                     window.cometWallet ||
                     (window.ethereum && window.ethereum.isComet) ||
                     // Check if it's a Chromium-based browser with built-in wallet but not standard Chrome/Brave
                     (userAgent.includes('chrome') && 
                      !userAgent.includes('edg') && 
                      !userAgent.includes('brave') && 
                      window.ethereum && 
                      !window.ethereum.isMetaMask &&
                      window.ethereum.providers === undefined)
                   ));
    
    const isBrave = userAgent.includes('brave');
    const isChrome = userAgent.includes('chrome') && !isComet && !isBrave;
    
    // Check for Ethereum provider
    if (typeof window.ethereum === "undefined") {
      if (isComet) {
        toast.error("Comet browser's wallet not detected. Try enabling the built-in wallet or use Chrome with MetaMask.");
      } else {
        toast.error("No Ethereum wallet detected. Please install MetaMask or use a Web3-enabled browser.");
      }
      return;
    }
    
    try {
      console.log("Attempting wallet connection...", { isComet, isBrave, isChrome });
      
      // For Comet browser, try to detect and handle multiple providers
      if (isComet && window.ethereum.providers) {
        console.log("Multiple providers detected in Comet:", window.ethereum.providers.length);
        // Try to find MetaMask provider if available
        const metaMaskProvider = window.ethereum.providers.find(p => p.isMetaMask);
        if (metaMaskProvider) {
          console.log("Using MetaMask provider in Comet");
          window.ethereum = metaMaskProvider;
        }
      }
      
      // Add longer delay for Comet to ensure wallet is ready
      await new Promise(resolve => setTimeout(resolve, isComet ? 1000 : 100));
      
      // Check if already connected
      let accounts;
      try {
        accounts = await window.ethereum.request({ 
          method: "eth_accounts",
          params: []
        });
        console.log("Existing accounts check:", accounts);
      } catch (accountsError) {
        console.warn("Could not check existing accounts:", accountsError);
        accounts = [];
      }
      
      if (accounts && accounts.length > 0) {
        setWalletAddress(accounts[0]);
        setWalletConnected(true);
        toast.success("Wallet already connected");
        return;
      }
      
      // For Comet, add user interaction prompt
      if (isComet) {
        toast.info("Click 'Connect Wallet' and look for wallet popup. If no popup appears, try refreshing the page.");
      }
      
      // Request connection with enhanced error handling for Comet
      console.log("Requesting wallet connection...");
      
      const connectionPromise = window.ethereum.request({ 
        method: "eth_requestAccounts",
        params: []
      });
      
      // Longer timeout for Comet browser
      const timeoutDuration = isComet ? 20000 : (isBrave ? 15000 : 10000);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("Connection timeout")), timeoutDuration)
      );
      
      const newAccounts = await Promise.race([connectionPromise, timeoutPromise]);
      console.log("Connection result:", newAccounts);
      
      if (newAccounts && newAccounts.length > 0) {
        setWalletAddress(newAccounts[0]);
        setWalletConnected(true);
        toast.success("Wallet connected successfully");
      } else {
        toast.error("No accounts returned from wallet");
      }
    } catch (error) {
      console.error("Wallet connection error:", error);
      
      // Enhanced error handling for Comet browser
      if (error.code === 4001) {
        toast.error("Wallet connection rejected by user");
      } else if (error.code === -32002) {
        if (isComet) {
          toast.error("Wallet connection already pending. Check for popup or refresh the page.");
        } else {
          toast.error("Wallet connection request already pending");
        }
      } else if (error.code === -32603) {
        toast.error("Internal wallet error. Please try refreshing the page.");
      } else if (error.message === "Connection timeout") {
        if (isComet) {
          toast.error("Comet wallet connection timed out. Try: 1) Refresh page 2) Enable built-in wallet 3) Use Chrome with MetaMask");
        } else {
          toast.error("Wallet connection timed out. Please try again.");
        }
      } else if (error.message && error.message.includes("User rejected")) {
        toast.error("Wallet connection rejected by user");
      } else if (error.message && (error.message.includes("evmAsk") || error.message.includes("provider"))) {
        toast.error("Browser wallet conflict detected. Try using Chrome with MetaMask extension.");
      } else if (isComet && (error.message.includes("undefined") || error.message.includes("null"))) {
        console.log("Comet wallet not responding, trying alternative methods...");
        const alternativeSuccess = await tryAlternativeConnection();
        if (!alternativeSuccess) {
          toast.error("Comet wallet not responding. Try: 1) Refresh page 2) Check wallet settings 3) Use Chrome with MetaMask");
        }
      } else {
        // For unknown errors, try alternative connection for Comet
        console.warn("Unknown wallet error:", error);
        if (isComet) {
          console.log("Trying alternative connection methods for Comet...");
          const alternativeSuccess = await tryAlternativeConnection();
          if (!alternativeSuccess) {
            toast.error("Comet wallet connection failed. Try refreshing or use Chrome with MetaMask. You can still analyze GitHub/LeetCode profiles.");
          }
        } else {
          toast.error("Wallet connection failed. You can still use GitHub/LeetCode analysis without connecting a wallet.");
        }
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Check if at least one input is provided
    if (!walletConnected && !formData.github_username && !formData.problem_solving_username && !formData.kaggle_username) {
      toast.error("Please connect wallet or provide GitHub/problem-solving username");
      return;
    }
    
    setLoading(true);
    try {
      const payload = {
        wallet_address: walletConnected ? walletAddress : null,
        github_username: formData.github_username || null,
        problem_solving_platform: formData.problem_solving_platform || "leetcode",
        problem_solving_username: formData.problem_solving_username || null,
        kaggle_username: formData.kaggle_username || null
      };
      
      const response = await axios.post(`${API}/analyze`, payload);
      setAnalysis(response.data);
      toast.success("Analysis complete");
    } catch (error) {
      console.error("Analysis error:", error);
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

        <div className="space-y-6">
          {/* Wallet Connection Section */}
          <Card className="bg-slate-900/50 border-slate-700 backdrop-blur-sm" data-testid="wallet-connect-card">
            <CardHeader>
              <CardTitle className="text-white">
                {walletConnected ? "Wallet Connected" : "Connect Your Wallet (Optional)"}
              </CardTitle>
              <CardDescription className="text-slate-400">
                {walletConnected 
                  ? `Connected: ${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
                  : "Connect your wallet for on-chain reputation analysis, or proceed with GitHub/problem-solving platforms only"
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!walletConnected ? (
                <div className="space-y-3">
                  <Button onClick={connectWallet} size="lg" className="w-full" data-testid="connect-wallet-btn">
                    {typeof window !== "undefined" && typeof window.ethereum !== "undefined" 
                      ? (typeof window !== "undefined" && (
                          navigator.userAgent.toLowerCase().includes('comet') || 
                          navigator.userAgent.toLowerCase().includes('cometbrowser') ||
                          (window.ethereum && window.ethereum.isComet) ||
                          (window.comet || window.cometWallet)
                        ) 
                          ? "Connect Comet Wallet" 
                          : "Connect Wallet")
                      : "Install MetaMask"
                    }
                  </Button>
                  {typeof window !== "undefined" && (
                    navigator.userAgent.toLowerCase().includes('comet') || 
                    navigator.userAgent.toLowerCase().includes('cometbrowser') ||
                    (window.ethereum && window.ethereum.isComet) ||
                    (window.comet || window.cometWallet)
                  ) && (
                    <div className="text-xs text-amber-400 text-center mt-2 space-y-2">
                      <p>⚠️ Comet browser detected. If connection fails:</p>
                      <p>1. Refresh the page and try again</p>
                      <p>2. Check if built-in wallet is enabled</p>
                      <p>3. Try Chrome with MetaMask extension</p>
                      <div className="flex gap-2 mt-2">
                        <Button 
                          onClick={() => {
                            console.log("=== COMPREHENSIVE WALLET DEBUG INFO ===");
                            console.log("User agent:", navigator.userAgent);
                            console.log("User agent (lowercase):", navigator.userAgent.toLowerCase());
                            console.log("window.ethereum exists:", typeof window.ethereum !== "undefined");
                            console.log("window.ethereum:", window.ethereum);
                            console.log("window.ethereum.providers:", window.ethereum?.providers);
                            console.log("window.ethereum.isMetaMask:", window.ethereum?.isMetaMask);
                            console.log("window.ethereum.isComet:", window.ethereum?.isComet);
                            console.log("window.comet exists:", typeof window.comet !== "undefined");
                            console.log("window.cometWallet exists:", typeof window.cometWallet !== "undefined");
                            console.log("All window properties containing 'comet':", Object.keys(window).filter(key => key.toLowerCase().includes('comet')));
                            console.log("All window properties containing 'wallet':", Object.keys(window).filter(key => key.toLowerCase().includes('wallet')));
                            
                            // Try to detect browser type
                            const userAgent = navigator.userAgent.toLowerCase();
                            const detectedComet = userAgent.includes('comet') || 
                                                 userAgent.includes('cometbrowser') ||
                                                 (window.ethereum && window.ethereum.isComet) ||
                                                 (window.comet || window.cometWallet) ||
                                                 (userAgent.includes('chrome') && 
                                                  !userAgent.includes('edg') && 
                                                  !userAgent.includes('brave') && 
                                                  window.ethereum && 
                                                  !window.ethereum.isMetaMask &&
                                                  window.ethereum.providers === undefined);
                            
                            console.log("Detected as Comet:", detectedComet);
                            console.log("=== END DEBUG INFO ===");
                            toast.info("Debug info logged to console (F12)");
                          }}
                          variant="outline" 
                          size="sm" 
                          className="text-xs flex-1"
                        >
                          Debug Info
                        </Button>
                        <Button 
                          onClick={async () => {
                            console.log("=== TESTING COMET CONNECTION METHODS ===");
                            toast.info("Testing connection methods...");
                            
                            // Method 1: Standard eth_requestAccounts
                            try {
                              console.log("Method 1: Standard eth_requestAccounts");
                              const accounts1 = await window.ethereum.request({ method: "eth_requestAccounts" });
                              console.log("Method 1 result:", accounts1);
                              if (accounts1 && accounts1.length > 0) {
                                setWalletAddress(accounts1[0]);
                                setWalletConnected(true);
                                toast.success("Connected via Method 1 (standard)");
                                return;
                              }
                            } catch (error) {
                              console.log("Method 1 failed:", error);
                            }
                            
                            // Method 2: ethereum.enable()
                            try {
                              console.log("Method 2: ethereum.enable()");
                              await window.ethereum.enable();
                              const accounts2 = await window.ethereum.request({ method: "eth_accounts" });
                              console.log("Method 2 result:", accounts2);
                              if (accounts2 && accounts2.length > 0) {
                                setWalletAddress(accounts2[0]);
                                setWalletConnected(true);
                                toast.success("Connected via Method 2 (enable)");
                                return;
                              }
                            } catch (error) {
                              console.log("Method 2 failed:", error);
                            }
                            
                            // Method 3: Direct provider selection
                            if (window.ethereum.providers) {
                              try {
                                console.log("Method 3: Provider selection");
                                for (let i = 0; i < window.ethereum.providers.length; i++) {
                                  const provider = window.ethereum.providers[i];
                                  console.log(`Testing provider ${i}:`, provider);
                                  try {
                                    const accounts3 = await provider.request({ method: "eth_requestAccounts" });
                                    if (accounts3 && accounts3.length > 0) {
                                      setWalletAddress(accounts3[0]);
                                      setWalletConnected(true);
                                      toast.success(`Connected via Method 3 (provider ${i})`);
                                      return;
                                    }
                                  } catch (providerError) {
                                    console.log(`Provider ${i} failed:`, providerError);
                                  }
                                }
                              } catch (error) {
                                console.log("Method 3 failed:", error);
                              }
                            }
                            
                            toast.error("All connection methods failed. Check console for details.");
                            console.log("=== ALL METHODS FAILED ===");
                          }}
                          variant="outline" 
                          size="sm" 
                          className="text-xs flex-1"
                        >
                          Test Connection
                        </Button>
                      </div>
                    </div>
                  )}
                  {typeof window !== "undefined" && typeof window.ethereum === "undefined" && (
                    <p className="text-xs text-slate-500 text-center">
                      No wallet detected. You can still analyze GitHub/problem-solving profiles.
                    </p>
                  )}
                  <div className="text-xs text-slate-500 text-center mt-2">
                    <p>💡 <strong>Tip:</strong> Having wallet connection issues?</p>
                    <p>You can analyze GitHub/problem-solving profiles without connecting a wallet!</p>
                  </div>
                </div>
              ) : (
                <Badge variant="outline" className="bg-emerald-500/20 text-emerald-400 border-emerald-500">
                  Connected
                </Badge>
              )}
            </CardContent>
          </Card>

            <form onSubmit={handleSubmit} data-testid="reputation-form">
              <div className="space-y-6">
                <Card className="bg-slate-900/50 border-slate-700 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="text-white">GitHub Profile (Optional)</CardTitle>
                    <CardDescription className="text-slate-400">We&apos;ll automatically fetch your public GitHub activity</CardDescription>
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
                    <CardTitle className="text-white">Problem-Solving Profile (Optional)</CardTitle>
                    <CardDescription className="text-slate-400">Choose your platform and we&apos;ll fetch your stats</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="platform-select" className="text-slate-300">Platform</Label>
                        <Select 
                          value={formData.problem_solving_platform} 
                          onValueChange={(value) => updateField('problem_solving_platform', value)}
                        >
                          <SelectTrigger id="platform-select" className="bg-slate-800 border-slate-700 text-white" data-testid="platform-select">
                            <SelectValue placeholder="Select platform" />
                          </SelectTrigger>
                          <SelectContent className="bg-slate-800 border-slate-700">
                            <SelectItem value="leetcode" className="text-white hover:bg-slate-700">LeetCode</SelectItem>
                            <SelectItem value="codeforces" className="text-white hover:bg-slate-700">Codeforces</SelectItem>
                            <SelectItem value="codechef" className="text-white hover:bg-slate-700">CodeChef</SelectItem>
                            <SelectItem value="kaggle" className="text-white hover:bg-slate-700">Kaggle</SelectItem>
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
                          className="bg-slate-800 border-slate-700 text-white" 
                          data-testid="problem-solving-username-input" 
                        />
                      </div>
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
                      {analysis.fetched_data?.problem_solving && (
                        <div className="bg-slate-800/50 p-3 rounded-lg">
                          <p className="text-slate-400 text-sm mb-1">{analysis.problem_solving_platform?.charAt(0).toUpperCase() + analysis.problem_solving_platform?.slice(1) || 'Problem Solving'}</p>
                          <p className="text-white">
                            {analysis.fetched_data.problem_solving.found ? (
                              <>
                                {analysis.fetched_data.problem_solving.platform === 'leetcode' && (
                                  `${analysis.fetched_data.problem_solving.total_solved} solved (${analysis.fetched_data.problem_solving.easy}E/${analysis.fetched_data.problem_solving.medium}M/${analysis.fetched_data.problem_solving.hard}H)`
                                )}
                                {analysis.fetched_data.problem_solving.platform === 'codeforces' && (
                                  `${analysis.fetched_data.problem_solving.total_solved} solved, Rating: ${analysis.fetched_data.problem_solving.rating} (Max: ${analysis.fetched_data.problem_solving.max_rating})`
                                )}
                                {analysis.fetched_data.problem_solving.platform === 'codechef' && (
                                  `${analysis.fetched_data.problem_solving.total_solved} solved, Rating: ${analysis.fetched_data.problem_solving.rating}`
                                )}
                                {analysis.fetched_data.problem_solving.platform === 'kaggle' && (
                                  `${analysis.fetched_data.problem_solving.competitions} competitions, ${analysis.fetched_data.problem_solving.datasets} datasets, ${analysis.fetched_data.problem_solving.notebooks} notebooks (${analysis.fetched_data.problem_solving.tier})`
                                )}
                              </>
                            ) : 'Not found'}
                          </p>
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
                        <p className="text-white text-xl font-bold">{analysis.calculated_scores.problem_solving_score || analysis.calculated_scores.leetcode_score || 0}</p>
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
      </div>
    </div>
  );
}

export default App;