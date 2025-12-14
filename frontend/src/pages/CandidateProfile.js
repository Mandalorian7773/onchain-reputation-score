import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function CandidateProfile() {
  const { user, getToken } = useAuth();
  const [loading, setLoading] = useState(false);
  const [profileId, setProfileId] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [saved, setSaved] = useState(false);

  const handleSave = async (e) => {
    e.preventDefault();
    
    if (!profileId || !contactEmail) {
      toast.error('Both fields are required');
      return;
    }
    
    setLoading(true);
    try {
      await axios.post(
        `${API}/candidate/profile`,
        { profile_id: profileId, contact_email: contactEmail },
        { headers: { Authorization: `Bearer ${getToken()}` } }
      );
      
      toast.success('Profile linked successfully! You can now apply to jobs.');
      setSaved(true);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to save profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900">
      <div className="container mx-auto px-4 py-12 max-w-3xl">
        
        <h1 className="text-4xl font-bold text-white mb-8" style={{ fontFamily: 'Azeret Mono, monospace' }}>
          Setup Your Candidate Profile
        </h1>

        <Card className="bg-slate-900/70 border-slate-700 backdrop-blur-lg mb-6">
          <CardHeader>
            <CardTitle className="text-white text-2xl">Link Your Verifiable Profile</CardTitle>
            <CardDescription className="text-slate-400">
              Required before applying to jobs. Your verifiable reputation will be used for scoring.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSave} className="space-y-6">
              <div>
                <Label htmlFor="profileId" className="text-slate-300">Your Profile ID</Label>
                <Input
                  id="profileId"
                  placeholder="e.g., your_github_username"
                  value={profileId}
                  onChange={(e) => setProfileId(e.target.value)}
                  className="bg-slate-800/70 border-slate-600 text-white"
                  required
                />
                <p className="text-slate-400 text-xs mt-2">
                  This is the profile ID from your verifiable reputation profile. 
                  If you haven't generated one yet, <Link to="/" className="text-indigo-400 underline">create it here</Link>.
                </p>
              </div>

              <div>
                <Label htmlFor="contactEmail" className="text-slate-300">Contact Email</Label>
                <Input
                  id="contactEmail"
                  type="email"
                  placeholder="your.email@example.com"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  className="bg-slate-800/70 border-slate-600 text-white"
                  required
                />
                <p className="text-slate-400 text-xs mt-2">
                  Recruiters will use this to contact you about job opportunities.
                </p>
              </div>

              <Button 
                type="submit" 
                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-lg py-6"
                disabled={loading}
              >
                {loading ? 'Saving...' : 'Save Profile'}
              </Button>
            </form>

            {saved && (
              <div className="mt-6 bg-emerald-900/20 border border-emerald-600/30 p-4 rounded-lg">
                <p className="text-emerald-400 font-semibold">✓ Profile linked successfully!</p>
                <p className="text-slate-300 text-sm mt-2">
                  You can now <Link to="/jobs" className="text-indigo-400 underline">browse and apply to jobs</Link>.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-slate-900/70 border-slate-700 backdrop-blur-lg">
          <CardHeader>
            <CardTitle className="text-white text-xl">Why do I need this?</CardTitle>
          </CardHeader>
          <CardContent className="text-slate-300 text-sm space-y-3">
            <p>
              <strong>Profile ID:</strong> Links your job board account to your verifiable reputation profile. 
              This allows recruiters to see your deterministic scores and role fit.
            </p>
            <p>
              <strong>Contact Email:</strong> Recruiters need a way to reach you. This email is shown to 
              recruiters when you apply to their jobs.
            </p>
            <p className="text-slate-400">
              Note: Your verifiable reputation profile remains public and reproducible. 
              This just adds contact information for job applications.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
