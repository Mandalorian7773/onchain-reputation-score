import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function Home() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [walletConnected, setWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState('');
  const [walletProvider, setWalletProvider] = useState('metamask');
  const [formData, setFormData] = useState({
    github_username: '',
    leetcode_username: ''
  });

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
      
      const response = await axios.post(`${API}/profile`, payload);
      const profileId = response.data.profile_id;
      
      toast.success('Profile generated');
      navigate(`/profile/${profileId}`);
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
            Verifiable Developer Reputation
          </h1>
          <p className="text-slate-300 text-lg mb-6">
            Generate a verifiable developer reputation from public data.
          </p>
          <p className="text-slate-400 text-sm">
            No trust required. All profiles are cryptographically verifiable.
          </p>
        </div>

        <Card className="bg-slate-900/70 border-slate-700 backdrop-blur-lg">
          <CardHeader>
            <CardTitle className="text-white text-2xl">Generate Profile</CardTitle>
            <CardDescription className="text-slate-400">
              Enter at least one identifier. Data is fetched from public sources.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6" data-testid="generate-form">
              <div className="grid md:grid-cols-3 gap-4">
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
                <div>
                  <Label htmlFor="wallet" className="text-slate-300">Wallet (Optional)</Label>
                  <Input 
                    id="wallet"
                    placeholder="0x..."
                    value={formData.wallet_address}
                    onChange={(e) => setFormData(prev => ({ ...prev, wallet_address: e.target.value }))}
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
      </div>
    </div>
  );
}