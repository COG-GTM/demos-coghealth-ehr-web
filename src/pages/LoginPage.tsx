import { useState, type FormEvent } from 'react';
import { Lock, Shield } from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { login } from '../services/authService';
import { logAuditEvent } from '../services/auditService';

interface LoginPageProps {
  onAuthenticated: () => void;
}

export default function LoginPage({ onAuthenticated }: LoginPageProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(username, password);
      logAuditEvent('LOGIN', { action: 'User signed in', details: username });
      onAuthenticated();
    } catch (err) {
      logAuditEvent('FAILED_LOGIN', {
        action: 'Sign-in failed',
        details: username,
        success: false,
      });
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="h-screen flex items-center justify-center"
      style={{ background: '#d4d0c8', fontFamily: 'Tahoma, sans-serif' }}
    >
      <form
        onSubmit={handleSubmit}
        className="w-80 bg-[#ece9d8] border border-gray-500 shadow-lg"
      >
        <div className="ehr-header flex items-center px-3 space-x-2">
          <div className="w-5 h-5 bg-white flex items-center justify-center border border-blue-300">
            <span className="text-blue-800 font-bold text-[11px]">C</span>
          </div>
          <span className="font-semibold">CogHealth EHR Sign In</span>
        </div>

        <div className="p-4 space-y-3">
          <Input
            label="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            required
          />
          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
          {error && <p className="text-[11px] text-red-600">{error}</p>}
          <Button type="submit" loading={submitting} className="w-full">
            <Lock className="w-3 h-3 mr-1 inline" />
            Sign In
          </Button>
          <div className="flex items-center text-[10px] text-gray-600 pt-1">
            <Shield className="w-3 h-3 text-green-600 mr-1" />
            <span>Credentials are required for all PHI access (45 CFR § 164.312)</span>
          </div>
        </div>
      </form>
    </div>
  );
}
