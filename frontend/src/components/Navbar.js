import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav className="border-b border-slate-700 bg-slate-900/50 backdrop-blur-md sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <Link to="/" className="text-white font-bold text-xl" style={{ fontFamily: 'Azeret Mono, monospace' }}>
            Verifiable Reputation
          </Link>
          
          <div className="flex items-center gap-6">
            <Link to="/jobs" className="text-slate-300 hover:text-white transition-colors">
              Browse Jobs
            </Link>
            <Link to="/about" className="text-slate-300 hover:text-white transition-colors">
              How It Works
            </Link>
            
            {!user ? (
              <div className="flex items-center gap-3">
                <Link to="/login">
                  <Button variant="ghost" className="text-slate-300 hover:text-white">
                    Login
                  </Button>
                </Link>
                <Link to="/signup">
                  <Button className="bg-gradient-to-r from-indigo-600 to-purple-600">
                    Sign Up
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Badge className="bg-indigo-600 text-white">{user.role}</Badge>
                  <span className="text-slate-300 text-sm">{user.email}</span>
                </div>
                {user.role === 'recruiter' && (
                  <Link to="/recruiter/jobs">
                    <Button variant="outline" className="border-slate-600 text-slate-300">
                      My Jobs
                    </Button>
                  </Link>
                )}
                <Button 
                  variant="ghost" 
                  onClick={handleLogout}
                  className="text-slate-400 hover:text-white"
                >
                  Logout
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
