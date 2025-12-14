import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function RecruiterJobs() {
  const { getToken, logout } = useAuth();
  const [jobs, setJobs] = useState([]);

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    try {
      const response = await axios.get(`${API}/recruiter/jobs`, {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      setJobs(response.data.jobs);
    } catch (error) {
      toast.error('Failed to fetch jobs');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        
        <div className="mb-6">
          <Link to="/" className="text-indigo-400 hover:text-indigo-300">← Home</Link>
        </div>
        
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-white" style={{ fontFamily: 'Azeret Mono, monospace' }}>Your Jobs</h1>
          <div className="flex gap-3">
            <Link to="/recruiter/jobs/new">
              <Button className="bg-gradient-to-r from-indigo-600 to-purple-600">+ Create Job</Button>
            </Link>
            <Button variant="outline" onClick={logout} className="border-slate-600 text-slate-300">Logout</Button>
          </div>
        </div>

        <div className="space-y-4">
          {jobs.length === 0 ? (
            <Card className="bg-slate-900/70 border-slate-700 backdrop-blur-lg">
              <CardContent className="pt-6 text-center">
                <p className="text-slate-400 mb-4">No jobs created yet</p>
                <Link to="/recruiter/jobs/new">
                  <Button className="bg-gradient-to-r from-indigo-600 to-purple-600">Create Your First Job</Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            jobs.map((job, idx) => (
              <Card key={idx} className="bg-slate-900/70 border-slate-700 backdrop-blur-lg">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-white text-xl">{job.title}</CardTitle>
                      <CardDescription className="text-slate-400 mt-1">
                        {job.role} • {job.location}
                      </CardDescription>
                    </div>
                    <Badge className="bg-indigo-600 text-white">
                      {job.applicant_count || 0} applicants
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <Link to={`/recruiter/jobs/${job._id || idx}/applicants`}>
                    <Button>View Applicants</Button>
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
