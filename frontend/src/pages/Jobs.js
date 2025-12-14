import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function Jobs() {
  const navigate = useNavigate();
  const { user, getToken } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [filters, setFilters] = useState({ role: 'all', location: 'all' });
  const [hasProfile, setHasProfile] = useState(true);

  useEffect(() => {
    if (user?.role === 'candidate') {
      checkProfile();
    }
    fetchJobs();
  }, [filters]);

  const checkProfile = async () => {
    try {
      await axios.get(`${API}/candidate/my-profile`, {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      setHasProfile(true);
    } catch (error) {
      setHasProfile(false);
    }
  };

  const fetchJobs = async () => {
    try {
      const params = new URLSearchParams();
      if (filters.role && filters.role !== 'all') params.append('role', filters.role);
      if (filters.location && filters.location !== 'all') params.append('location', filters.location);
      
      const response = await axios.get(`${API}/jobs?${params}`);
      setJobs(response.data.jobs);
    } catch (error) {
      console.error('Failed to fetch jobs');
    }
  };

  const getWeightLabel = (weights) => {
    const max = Math.max(weights.github || 0, weights.leetcode || 0, weights.wallet || 0);
    if (max === weights.github) return 'GitHub-heavy';
    if (max === weights.leetcode) return 'LeetCode-heavy';
    if (max === weights.wallet) return 'Wallet-heavy';
    return 'Balanced';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-white" style={{ fontFamily: 'Azeret Mono, monospace' }}>Browse Jobs</h1>
          <Link to="/"><Button variant="outline" className="border-slate-600 text-slate-300">← Home</Button></Link>
        </div>

        {user?.role === 'candidate' && !hasProfile && (
          <Card className="bg-amber-900/20 border-amber-600/40 backdrop-blur-lg mb-6">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className="bg-amber-500/20 p-3 rounded-lg">
                  <svg className="w-6 h-6 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-amber-400 font-bold mb-2">Profile Required to Apply</h3>
                  <p className="text-slate-300 text-sm mb-3">
                    You need to generate your verifiable reputation profile before applying to jobs.
                  </p>
                  <Link to="/candidate/dashboard">
                    <Button className="bg-gradient-to-r from-indigo-600 to-purple-600">
                      Generate My Profile
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="bg-slate-900/70 border-slate-700 backdrop-blur-lg mb-6">
          <CardHeader>
            <CardTitle className="text-white">Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Select value={filters.role} onValueChange={(value) => setFilters(prev => ({ ...prev, role: value }))}>
                  <SelectTrigger className="bg-slate-800/70 border-slate-600 text-white">
                    <SelectValue placeholder="All Roles" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="all" className="text-white">All Roles</SelectItem>
                    <SelectItem value="Frontend" className="text-white">Frontend</SelectItem>
                    <SelectItem value="Backend" className="text-white">Backend</SelectItem>
                    <SelectItem value="Fullstack" className="text-white">Fullstack</SelectItem>
                    <SelectItem value="Data" className="text-white">Data</SelectItem>
                    <SelectItem value="DevOps" className="text-white">DevOps</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Select value={filters.location} onValueChange={(value) => setFilters(prev => ({ ...prev, location: value }))}>
                  <SelectTrigger className="bg-slate-800/70 border-slate-600 text-white">
                    <SelectValue placeholder="All Locations" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="all" className="text-white">All Locations</SelectItem>
                    <SelectItem value="Remote" className="text-white">Remote</SelectItem>
                    <SelectItem value="New York" className="text-white">New York</SelectItem>
                    <SelectItem value="San Francisco" className="text-white">San Francisco</SelectItem>
                    <SelectItem value="London" className="text-white">London</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {jobs.length === 0 ? (
            <Card className="bg-slate-900/70 border-slate-700 backdrop-blur-lg">
              <CardContent className="pt-6 text-center text-slate-400">
                No jobs found. Try different filters.
              </CardContent>
            </Card>
          ) : (
            jobs.map((job, idx) => (
              <Card key={idx} className="bg-slate-900/70 border-slate-700 backdrop-blur-lg hover:border-indigo-600/50 transition-colors">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-white text-xl">{job.title}</CardTitle>
                      <CardDescription className="text-slate-400 mt-1">
                        {job.role} • {job.location} • {getWeightLabel(job.weights)}
                      </CardDescription>
                    </div>
                    <Badge className="bg-indigo-600 text-white">
                      {job.applicant_count || 0} applicants
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <Link to={`/jobs/${job._id || idx}`}>
                    <Button className="bg-gradient-to-r from-indigo-600 to-purple-600">View Details</Button>
                  </Link>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
