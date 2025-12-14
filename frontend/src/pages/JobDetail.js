import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function JobDetail() {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const { user, getToken } = useAuth();
  const [job, setJob] = useState(null);
  const [applying, setApplying] = useState(false);
  const [profileId, setProfileId] = useState('');

  useEffect(() => {
    fetchJob();
  }, [jobId]);

  const fetchJob = async () => {
    try {
      const response = await axios.get(`${API}/jobs/${jobId}`);
      setJob(response.data.job);
    } catch (error) {
      toast.error('Job not found');
    }
  };

  const handleApply = async () => {
    if (!user) {
      toast.error('Please login as a candidate to apply');
      navigate('/login');
      return;
    }

    if (!profileId) {
      toast.error('Please enter your profile ID');
      return;
    }

    setApplying(true);
    try {
      const response = await axios.post(
        `${API}/jobs/${jobId}/apply`,
        { profile_id: profileId },
        { headers: { Authorization: `Bearer ${getToken()}` } }
      );
      
      toast.success(`Applied! Job-specific score: ${response.data.job_specific_score}/100`);
      navigate('/jobs');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Application failed');
    } finally {
      setApplying(false);
    }
  };

  if (!job) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 flex items-center justify-center">
        <p className="text-white">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        
        <div className="mb-6">
          <Link to="/jobs" className="text-indigo-400 hover:text-indigo-300">← Back to Jobs</Link>
        </div>

        <Card className="bg-slate-900/70 border-slate-700 backdrop-blur-lg mb-6">
          <CardHeader>
            <CardTitle className="text-white text-3xl">{job.title}</CardTitle>
            <CardDescription className="text-slate-400 text-lg mt-2">
              {job.role} • {job.location}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h3 className="text-white font-semibold mb-2">Description</h3>
              <p className="text-slate-300 whitespace-pre-wrap">{job.description}</p>
            </div>

            <div>
              <h3 className="text-white font-semibold mb-3">Role Requirements (Scoring Weights)</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-slate-800/50 p-4 rounded-lg">
                  <p className="text-slate-400 text-sm">GitHub Weight</p>
                  <p className="text-white text-2xl font-bold">{Math.round(job.weights.github * 100)}%</p>
                </div>
                <div className="bg-slate-800/50 p-4 rounded-lg">
                  <p className="text-slate-400 text-sm">LeetCode Weight</p>
                  <p className="text-white text-2xl font-bold">{Math.round(job.weights.leetcode * 100)}%</p>
                </div>
                <div className="bg-slate-800/50 p-4 rounded-lg">
                  <p className="text-slate-400 text-sm">Wallet Weight</p>
                  <p className="text-white text-2xl font-bold">{Math.round(job.weights.wallet * 100)}%</p>
                </div>
              </div>
            </div>

            {user?.role === 'candidate' && (
              <div className="border-t border-slate-700 pt-6">
                <h3 className="text-white font-semibold mb-3">Apply to this Job</h3>
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="profileId" className="text-slate-300">Your Profile ID</Label>
                    <Input
                      id="profileId"
                      placeholder="e.g., your_github_username"
                      value={profileId}
                      onChange={(e) => setProfileId(e.target.value)}
                      className="bg-slate-800/70 border-slate-600 text-white"
                    />
                  </div>
                  <Button 
                    onClick={handleApply}
                    className="w-full bg-gradient-to-r from-indigo-600 to-purple-600"
                    disabled={applying}
                  >
                    {applying ? 'Applying...' : 'Apply'}
                  </Button>
                  <p className="text-slate-400 text-xs">Your verifiable reputation will compute a job-specific score.</p>
                </div>
              </div>
            )}

            {!user && (
              <div className="bg-amber-900/20 border border-amber-600/30 p-4 rounded-lg">
                <p className="text-amber-300">
                  Please <Link to="/login" className="underline">login</Link> as a candidate to apply.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
