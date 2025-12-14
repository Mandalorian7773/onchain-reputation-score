import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function Signup() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ email: '', password: '', role: 'candidate' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const response = await axios.post(`${API}/auth/signup`, formData);
      login(response.data.token, response.data.user);
      toast.success('Account created successfully');
      
      if (response.data.user.role === 'recruiter') {
        navigate('/recruiter/jobs');
      } else {
        navigate('/candidate/dashboard');
      }
    } catch (error) {
      toast.error(error.response?.data?.error || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 flex items-center justify-center px-4">
      <Card className="bg-slate-900/70 border-slate-700 backdrop-blur-lg w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-white text-2xl">Sign Up</CardTitle>
          <CardDescription className="text-slate-400">Create an account</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email" className="text-slate-300">Email</Label>
              <Input 
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                className="bg-slate-800/70 border-slate-600 text-white"
                required
              />
            </div>
            <div>
              <Label htmlFor="password" className="text-slate-300">Password</Label>
              <Input 
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                className="bg-slate-800/70 border-slate-600 text-white"
                required
                minLength={6}
              />
            </div>
            <div>
              <Label htmlFor="role" className="text-slate-300">I am a</Label>
              <Select value={formData.role} onValueChange={(value) => setFormData(prev => ({ ...prev, role: value }))}>
                <SelectTrigger className="bg-slate-800/70 border-slate-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  <SelectItem value="candidate" className="text-white hover:bg-slate-700">Candidate</SelectItem>
                  <SelectItem value="recruiter" className="text-white hover:bg-slate-700">Recruiter</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" className="w-full bg-gradient-to-r from-indigo-600 to-purple-600" disabled={loading}>
              {loading ? 'Creating account...' : 'Sign Up'}
            </Button>
          </form>
          <p className="text-slate-400 text-sm text-center mt-4">
            Already have an account? <Link to="/login" className="text-indigo-400 hover:underline">Login</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}