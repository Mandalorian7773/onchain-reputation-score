import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ email: '', password: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const response = await axios.post(`${API}/auth/login`, formData);
      login(response.data.token, response.data.user);
      toast.success('Logged in successfully');
      
      if (response.data.user.role === 'recruiter') {
        navigate('/recruiter/jobs');
      } else {
        navigate('/candidate/dashboard');
      }
    } catch (error) {
      toast.error(error.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 flex items-center justify-center px-4">
      <Card className="bg-slate-900/70 border-slate-700 backdrop-blur-lg w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-white text-2xl">Login</CardTitle>
          <CardDescription className="text-slate-400">Access the job board</CardDescription>
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
              />
            </div>
            <Button type="submit" className="w-full bg-gradient-to-r from-indigo-600 to-purple-600" disabled={loading}>
              {loading ? 'Logging in...' : 'Login'}
            </Button>
          </form>
          <p className="text-slate-400 text-sm text-center mt-4">
            Don't have an account? <Link to="/signup" className="text-indigo-400 hover:underline">Sign up</Link>
          </p>
          <p className="text-slate-400 text-sm text-center mt-2">
            <Link to="/" className="text-slate-500 hover:underline">← Back to reputation profiles</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}