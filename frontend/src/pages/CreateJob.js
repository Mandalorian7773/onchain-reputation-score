import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function CreateJob() {
  const navigate = useNavigate();
  const { getToken } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    role: 'Frontend',
    location: 'Remote',
    description: ''
  });
  const [weights, setWeights] = useState({
    github: 0.5,
    leetcode: 0.3,
    wallet: 0.2
  });

  const updateWeight = (key, value) => {
    const newValue = value[0] / 100;
    const others = Object.keys(weights).filter(k => k !== key);
    const remaining = 1.0 - newValue;
    
    const newWeights = { ...weights, [key]: newValue };
    
    if (others.length === 2) {
      const ratio = weights[others[0]] / (weights[others[0]] + weights[others[1]]) || 0.5;
      newWeights[others[0]] = remaining * ratio;
      newWeights[others[1]] = remaining * (1 - ratio);
    }
    
    setWeights(newWeights);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const sum = weights.github + weights.leetcode + weights.wallet;
    if (Math.abs(sum - 1.0) > 0.01) {
      toast.error('Weights must sum to 100%');
      return;
    }
    
    setLoading(true);
    try {
      await axios.post(
        `${API}/jobs`,
        { ...formData, weights },
        { headers: { Authorization: `Bearer ${getToken()}` } }
      );
      
      toast.success('Job created successfully');
      navigate('/recruiter/jobs');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to create job');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        
        <div className="mb-6">
          <Link to="/recruiter/jobs" className="text-indigo-400 hover:text-indigo-300">← Back to My Jobs</Link>
        </div>
        
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-white" style={{ fontFamily: 'Azeret Mono, monospace' }}>Create Job</h1>
        </div>

        <Card className="bg-slate-900/70 border-slate-700 backdrop-blur-lg">
          <CardHeader>
            <CardTitle className="text-white text-2xl">Job Details</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label htmlFor="title" className="text-slate-300">Job Title</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  className="bg-slate-800/70 border-slate-600 text-white"
                  required
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="role" className="text-slate-300">Role</Label>
                  <Select value={formData.role} onValueChange={(value) => setFormData(prev => ({ ...prev, role: value }))}>
                    <SelectTrigger className="bg-slate-800/70 border-slate-600 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700">
                      <SelectItem value="Frontend" className="text-white">Frontend</SelectItem>
                      <SelectItem value="Backend" className="text-white">Backend</SelectItem>
                      <SelectItem value="Fullstack" className="text-white">Fullstack</SelectItem>
                      <SelectItem value="Data" className="text-white">Data</SelectItem>
                      <SelectItem value="DevOps" className="text-white">DevOps</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="location" className="text-slate-300">Location</Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                    className="bg-slate-800/70 border-slate-600 text-white"
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="description" className="text-slate-300">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="bg-slate-800/70 border-slate-600 text-white min-h-32"
                  required
                />
              </div>

              <div className="border-t border-slate-700 pt-6">
                <h3 className="text-white font-semibold mb-4">Skill Weights (must sum to 100%)</h3>
                
                <div className="space-y-6">
                  <div>
                    <div className="flex justify-between mb-2">
                      <Label className="text-slate-300">GitHub Weight</Label>
                      <span className="text-white font-semibold">{Math.round(weights.github * 100)}%</span>
                    </div>
                    <Slider
                      value={[weights.github * 100]}
                      onValueChange={(value) => updateWeight('github', value)}
                      max={100}
                      step={5}
                    />
                  </div>

                  <div>
                    <div className="flex justify-between mb-2">
                      <Label className="text-slate-300">LeetCode Weight</Label>
                      <span className="text-white font-semibold">{Math.round(weights.leetcode * 100)}%</span>
                    </div>
                    <Slider
                      value={[weights.leetcode * 100]}
                      onValueChange={(value) => updateWeight('leetcode', value)}
                      max={100}
                      step={5}
                    />
                  </div>

                  <div>
                    <div className="flex justify-between mb-2">
                      <Label className="text-slate-300">Wallet Weight</Label>
                      <span className="text-white font-semibold">{Math.round(weights.wallet * 100)}%</span>
                    </div>
                    <Slider
                      value={[weights.wallet * 100]}
                      onValueChange={(value) => updateWeight('wallet', value)}
                      max={100}
                      step={5}
                    />
                  </div>

                  <div className="bg-slate-800/50 p-3 rounded-lg">
                    <p className="text-slate-400 text-sm">
                      Total: <span className="text-white font-semibold">{Math.round((weights.github + weights.leetcode + weights.wallet) * 100)}%</span>
                    </p>
                  </div>
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-lg py-6"
                disabled={loading}
              >
                {loading ? 'Creating Job...' : 'Create Job'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
