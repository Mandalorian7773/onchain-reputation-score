import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function CandidateDashboard() {
  const navigate = useNavigate();
  const { user, getToken } = useAuth();
  const [loading, setLoading] = useState(false);
  const [profileGenerated, setProfileGenerated] = useState(false);
  const [generatedProfileId, setGeneratedProfileId] = useState('');
  const [walletConnected, setWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState('');
  const [walletProvider, setWalletProvider] = useState('metamask');
  const [formData, setFormData] = useState({
    github_username: '',
    leetcode_username: ''
  });

  useEffect(() => {
    checkExistingProfile();
  }, []);

  const checkExistingProfile = async () => {
    try {
      const response = await axios.get(`${API}/candidate/my-profile`, {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      if (response.data.profile_id) {
        setGeneratedProfileId(response.data.profile_id);
        setProfileGenerated(true);
      }
    } catch (error) {
      // No profile yet
    }
  };

  const connectWallet = async () => {
    try {
      let address = null;

      if (walletProvider === 'metamask') {
        if (typeof window.ethereum === 'undefined') {
          toast.error('MetaMask not detected. Please install MetaMask or select another provider.');
          return;
        }
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        address = accounts[0];
      } else if (walletProvider === 'phantom') {
        if (typeof window.phantom?.ethereum === 'undefined') {
          toast.error('Phantom wallet not detected.');
          return;
        }
        const accounts = await window.phantom.ethereum.request({ method: 'eth_requestAccounts' });
        address = accounts[0];
      } else if (walletProvider === 'backpack') {
        if (typeof window.backpack === 'undefined') {
          toast.error('Backpack wallet not detected.');
          return;
        }
        const accounts = await window.backpack.request({ method: 'eth_requestAccounts' });
        address = accounts[0];
      } else if (walletProvider === 'walletconnect') {
        toast.error('WalletConnect integration coming soon. Please use MetaMask for now.');
        return;
      }

      if (address) {
        setWalletAddress(address);
        setWalletConnected(true);
        toast.success(`Wallet connected: ${address.slice(0, 6)}...${address.slice(-4)}`);
      }
    } catch (error) {
      toast.error('Wallet connection failed. You can proceed without wallet.');
      console.warn('Wallet connection error:', error);
    }
  };

  const disconnectWallet = () => {
    setWalletAddress('');
    setWalletConnected(false);
    toast.success('Wallet disconnected');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.github_username && !formData.leetcode_username && !walletAddress) {
      toast.error('Please provide at least one input');
      return;
    }
    
    setLoading(true);
    try {
      const payload = {
        github_username: formData.github_username || null,
        leetcode_username: formData.leetcode_username || null,
        wallet_address: walletAddress || null
      };
      
      // Generate profile
      const response = await axios.post(`${API}/profile`, payload);
      const profileId = response.data.profile_id;
      
      // Auto-save candidate profile with email from user account
      if (user) {
        await axios.post(
          `${API}/candidate/profile`,
          { profile_id: profileId, contact_email: user.email },
          { headers: { Authorization: `Bearer ${getToken()}` } }
        );
      }
      
      toast.success('Profile generated successfully!');
      setGeneratedProfileId(profileId);
      setProfileGenerated(true);
    } catch (error) {
      toast.error('Failed: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900">
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        
        <div className="text-center mb-12">
          <h1 className="text-6xl font-bold text-white mb-4" style={{ fontFamily: 'Azeret Mono, monospace' }}>
            Candidate Dashboard
          </h1>
          <p className="text-slate-300 text-lg mb-6">
            {profileGenerated ? 'Your verifiable profile is ready!' : 'Generate your verifiable reputation profile'}
          </p>
        </div>

        {profileGenerated ? (
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
                    <h3 className="text-emerald-400 font-bold text-xl mb-2">Profile Generated!</h3>
                    <p className="text-slate-300 text-sm mb-4">Your verifiable reputation profile is ready to use for job applications.</p>
                    <div className="bg-slate-900/50 p-4 rounded-lg mb-4">
                      <p className="text-slate-400 text-xs mb-2">Your Profile Link</p>
                      <div className="flex items-center gap-2">
                        <code className="text-emerald-400 font-mono text-sm flex-1">
                          {window.location.origin}/profile/{generatedProfileId}
                        </code>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => {
                            navigator.clipboard.writeText(`${window.location.origin}/profile/${generatedProfileId}`);
                            toast.success('Link copied!');
                          }}
                          className="border-emerald-600 text-emerald-400"
                        >
                          Copy
                        </Button>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <Link to={`/profile/${generatedProfileId}`} className="flex-1">
                        <Button className="w-full bg-indigo-600 hover:bg-indigo-700">
                          View My Profile
                        </Button>
                      </Link>
                      <Link to="/jobs" className="flex-1">
                        <Button className="w-full bg-gradient-to-r from-emerald-600 to-teal-600">
                          Browse Jobs & Apply
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-900/70 border-slate-700 backdrop-blur-lg">
              <CardHeader>
                <CardTitle className="text-white">Need to update your profile?</CardTitle>
                <CardDescription className="text-slate-400">Generate a new profile with updated data</CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  onClick={() => setProfileGenerated(false)}
                  variant="outline"
                  className="border-slate-600 text-slate-300"
                >
                  Regenerate Profile
                </Button>
              </CardContent>
            </Card>
          </div>
        ) : (

        <Card className="bg-slate-900/70 border-slate-700 backdrop-blur-lg">
          <CardHeader>
            <CardTitle className="text-white text-2xl">Generate Profile</CardTitle>
            <CardDescription className="text-slate-400">
              Enter at least one identifier. Data is fetched from public sources.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6" data-testid="generate-form">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="github" className="text-slate-300">GitHub Username</Label>
                  <Input 
                    id="github"
                    placeholder="octocat"
                    value={formData.github_username}
                    onChange={(e) => setFormData(prev => ({ ...prev, github_username: e.target.value }))}
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
                    onChange={(e) => setFormData(prev => ({ ...prev, leetcode_username: e.target.value }))}
                    className="bg-slate-800/70 border-slate-600 text-white focus:border-indigo-500"
                    data-testid="leetcode-input"
                  />
                </div>
              </div>

              <div className="border-t border-slate-700 pt-6">
                <Label className="text-slate-300 mb-3 block">Wallet Connection (Optional)</Label>
                <p className="text-slate-400 text-xs mb-4">Read-only connection for persistence signal. No signing required.</p>
                
                {!walletConnected ? (
                  <div className="space-y-3">
                    <Select value={walletProvider} onValueChange={setWalletProvider}>
                      <SelectTrigger className="bg-slate-800/70 border-slate-600 text-white" data-testid="wallet-provider-select">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-700">
                        <SelectItem value="metamask" className="text-white hover:bg-slate-700">MetaMask</SelectItem>
                        <SelectItem value="walletconnect" className="text-white hover:bg-slate-700">WalletConnect</SelectItem>
                        <SelectItem value="phantom" className="text-white hover:bg-slate-700">Phantom</SelectItem>
                        <SelectItem value="backpack" className="text-white hover:bg-slate-700">Backpack</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button 
                      type="button"
                      onClick={connectWallet}
                      variant="outline"
                      className="w-full border-slate-600 text-slate-300 hover:bg-slate-800"
                      data-testid="connect-wallet-btn"
                    >
                      Connect Wallet
                    </Button>
                  </div>
                ) : (
                  <div className="bg-slate-800/50 p-4 rounded-lg border border-emerald-600/30">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-slate-400 text-xs mb-1">Connected Wallet</p>
                        <code className="text-emerald-400 font-mono text-sm">
                          {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                        </code>
                      </div>
                      <Button 
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={disconnectWallet}
                        className="text-slate-400 hover:text-white"
                        data-testid="disconnect-wallet-btn"
                      >
                        Disconnect
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              <Button 
                type="submit" 
                size="lg" 
                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-lg py-6"
                disabled={loading}
                data-testid="generate-btn"
              >
                {loading ? 'Generating Profile...' : 'Generate Profile'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="mt-8 text-center">
          <a href="/about" className="text-indigo-400 hover:text-indigo-300 text-sm">
            How does this work?
          </a>
        </div>
        )}
      </div>
    </div>
  );
}