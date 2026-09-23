import { useState, type FormEvent } from 'react';
import { Lock } from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { authService } from '../services/authService';
import { logAuditEvent } from '../services/auditService';

interface LoginPageProps {
  onAuthenticated: () => void;
}

function audit(event: 'LOGIN' | 'FAILED_LOGIN', action: string, success: boolean) {
  try {
    logAuditEvent(event, { action, success });
  } catch {
    // Audit persistence must never block or reverse the sign-in outcome.
  }
}

export default function LoginPage({ onAuthenticated }: LoginPageProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      await authService.login(username, password);
    } catch {
      audit('FAILED_LOGIN', 'Sign in failed', false);
      setError('Sign in failed. Check your credentials and try again.');
      setLoading(false);
      return;
    }

    audit('LOGIN', 'User signed in', true);
    setLoading(false);
    onAuthenticated();
  };

  return (
    <div
      className="h-screen flex items-center justify-center"
      style={{ background: '#d4d0c8', fontFamily: 'Tahoma, sans-serif' }}
    >
      <form onSubmit={handleSubmit} className="ehr-panel p-4 w-80 bg-white border border-gray-400">
        <div className="flex items-center space-x-2 mb-3">
          <Lock className="w-4 h-4" />
          <span className="font-semibold text-sm">CogHealth EHR Sign In</span>
        </div>
        <div className="space-y-2">
          <Input
            label="Username"
            value={username}
            autoComplete="username"
            onChange={e => setUsername(e.target.value)}
            required
          />
          <Input
            label="Password"
            type="password"
            value={password}
            autoComplete="current-password"
            onChange={e => setPassword(e.target.value)}
            required
          />
        </div>
        {error && <p className="mt-2 text-[10px] text-red-600">{error}</p>}
        <div className="mt-3 flex justify-end">
          <Button type="submit" loading={loading}>Sign In</Button>
        </div>
      </form>
    </div>
  );
}
