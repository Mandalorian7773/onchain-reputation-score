import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function Applicants() {
  const { jobId } = useParams();
  const { getToken } = useAuth();
  const [job, setJob] = useState(null);
  const [applicants, setApplicants] = useState([]);

  useEffect(() => {
    fetchApplicants();
  }, [jobId]);

  const fetchApplicants = async () => {
    try {
      const response = await axios.get(`${API}/recruiter/jobs/${jobId}/applicants`, {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      setJob(response.data.job);
      setApplicants(response.data.applicants);
    } catch (error) {
      toast.error('Failed to fetch applicants');
    }
  };

  const getRoleBadgeColor = (fit) => {
    if (fit === 'Strong') return 'bg-emerald-500';
    if (fit === 'Medium') return 'bg-blue-500';
    return 'bg-slate-600';
  };

  const getScoreColor = (score) => {
    if (score >= 70) return 'text-emerald-400';
    if (score >= 50) return 'text-blue-400';
    if (score >= 30) return 'text-amber-400';
    return 'text-slate-400';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        
        <div className="mb-6">
          <Link to="/recruiter/jobs" className="text-indigo-400 hover:text-indigo-300">← Back to Your Jobs</Link>
        </div>

        {job && (
          <Card className="bg-slate-900/70 border-slate-700 backdrop-blur-lg mb-6">
            <CardHeader>
              <CardTitle className="text-white text-2xl">{job.title}</CardTitle>
              <CardDescription className="text-slate-400">{job.role} • {job.location} • {applicants.length} applicants</CardDescription>
            </CardHeader>
          </Card>
        )}

        <h2 className="text-2xl font-bold text-white mb-6">Applicants (Ranked by Score)</h2>

        <div className="space-y-4">
          {applicants.length === 0 ? (
            <Card className="bg-slate-900/70 border-slate-700 backdrop-blur-lg">
              <CardContent className="pt-6 text-center text-slate-400">
                No applicants yet
              </CardContent>
            </Card>
          ) : (
            applicants.map((applicant, idx) => (
              <Card key={idx} className="bg-slate-900/70 border-slate-700 backdrop-blur-lg">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <Badge className="bg-indigo-600 text-white">#{idx + 1}</Badge>
                        <CardTitle className="text-white text-xl">{applicant.profile_id}</CardTitle>
                      </div>
                      <p className="text-slate-400 text-sm">Contact: {applicant.candidate_email}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-slate-400 text-sm mb-1">Job-Specific Score</p>
                      <p className={`text-4xl font-bold ${getScoreColor(applicant.job_specific_score)}`}>
                        {applicant.job_specific_score}
                        <span className="text-xl text-slate-500">/100</span>
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Progress value={applicant.job_specific_score} className="h-2" />

                  <div>
                    <p className="text-slate-400 text-sm mb-2">Role Fit Summary</p>
                    <p className="text-slate-300 text-sm">{applicant.ai_summary}</p>
                  </div>

                  <div className="grid grid-cols-4 gap-3">
                    <div className="bg-slate-800/50 p-3 rounded-lg text-center">
                      <p className="text-slate-400 text-xs mb-1">Frontend</p>
                      <Badge className={`${getRoleBadgeColor(applicant.role_fit.frontend)} text-white text-xs`}>
                        {applicant.role_fit.frontend}
                      </Badge>
                    </div>
                    <div className="bg-slate-800/50 p-3 rounded-lg text-center">
                      <p className="text-slate-400 text-xs mb-1">Backend</p>
                      <Badge className={`${getRoleBadgeColor(applicant.role_fit.backend)} text-white text-xs`}>
                        {applicant.role_fit.backend}
                      </Badge>
                    </div>
                    <div className="bg-slate-800/50 p-3 rounded-lg text-center">
                      <p className="text-slate-400 text-xs mb-1">Data</p>
                      <Badge className={`${getRoleBadgeColor(applicant.role_fit.data)} text-white text-xs`}>
                        {applicant.role_fit.data}
                      </Badge>
                    </div>
                    <div className="bg-slate-800/50 p-3 rounded-lg text-center">
                      <p className="text-slate-400 text-xs mb-1">DevOps</p>
                      <Badge className={`${getRoleBadgeColor(applicant.role_fit.devops)} text-white text-xs`}>
                        {applicant.role_fit.devops}
                      </Badge>
                    </div>
                  </div>

                  <Link to={`/profile/${applicant.profile_id}`}>
                    <Button variant="outline" className="border-indigo-600 text-indigo-400 hover:bg-indigo-600/20">
                      View Full Verifiable Profile
                    </Button>
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
