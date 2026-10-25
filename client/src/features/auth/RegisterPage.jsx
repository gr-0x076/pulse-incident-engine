import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Shield, Building, User, Mail, Lock, ArrowRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const RegisterPage = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    orgName: '',
    orgSlug: '',
  });
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'orgName' && !formData.orgSlug) {
      setFormData((prev) => ({
        ...prev,
        orgName: value,
        orgSlug: value.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-'),
      }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await register(formData);
      if (data) {
        navigate('/dashboard');
      }
    } catch (err) {
      console.error('Registration failed:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary flex items-center justify-center p-4 font-sans bg-grid-dots">
      <div className="w-full max-w-md bg-bg-secondary border border-border-default rounded-lg p-6 sm:p-8 shadow-2xl glass-panel relative">
        <div className="space-y-2 mb-6">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-accent-primary animate-pulse" />
            <span className="text-[10px] font-mono tracking-widest text-accent-primary uppercase">
              // INITIALIZE SQUADRON
            </span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-text-primary">
            Deploy New Organization
          </h1>
          <p className="text-xs text-text-secondary">
            Sets up a dedicated multi-tenant incident response environment with default SLA tiers.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-mono text-text-secondary block mb-1 uppercase">
              Organization Name
            </label>
            <div className="relative">
              <Building className="w-4 h-4 text-text-tertiary absolute left-3 top-3" />
              <input
                type="text"
                name="orgName"
                required
                value={formData.orgName}
                onChange={handleChange}
                placeholder="Vercel SRE Team"
                className="w-full bg-bg-tertiary/50 border border-border-default focus:border-accent-primary rounded px-3 py-2.5 pl-9 text-xs text-text-primary placeholder:text-text-tertiary focus:outline-none font-mono"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-mono text-text-secondary block mb-1 uppercase">
              Organization Slug (Subdomain)
            </label>
            <input
              type="text"
              name="orgSlug"
              required
              value={formData.orgSlug}
              onChange={handleChange}
              placeholder="vercel-sre"
              className="w-full bg-bg-tertiary/50 border border-border-default focus:border-accent-primary rounded px-3 py-2 text-xs text-text-primary placeholder:text-text-tertiary focus:outline-none font-mono"
            />
          </div>

          <div>
            <label className="text-xs font-mono text-text-secondary block mb-1 uppercase">
              Administrator Name
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-text-tertiary absolute left-3 top-3" />
              <input
                type="text"
                name="name"
                required
                value={formData.name}
                onChange={handleChange}
                placeholder="Commander John Doe"
                className="w-full bg-bg-tertiary/50 border border-border-default focus:border-accent-primary rounded px-3 py-2.5 pl-9 text-xs text-text-primary placeholder:text-text-tertiary focus:outline-none font-mono"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-mono text-text-secondary block mb-1 uppercase">
              Admin Email
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-text-tertiary absolute left-3 top-3" />
              <input
                type="email"
                name="email"
                required
                value={formData.email}
                onChange={handleChange}
                placeholder="admin@company.com"
                className="w-full bg-bg-tertiary/50 border border-border-default focus:border-accent-primary rounded px-3 py-2.5 pl-9 text-xs text-text-primary placeholder:text-text-tertiary focus:outline-none font-mono"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-mono text-text-secondary block mb-1 uppercase">
              Master Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-text-tertiary absolute left-3 top-3" />
              <input
                type="password"
                name="password"
                required
                minLength={6}
                value={formData.password}
                onChange={handleChange}
                placeholder="••••••••••••"
                className="w-full bg-bg-tertiary/50 border border-border-default focus:border-accent-primary rounded px-3 py-2.5 pl-9 text-xs text-text-primary placeholder:text-text-tertiary focus:outline-none font-mono"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded bg-accent-primary hover:bg-accent-primary/90 text-white font-mono text-xs font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-50 mt-2"
          >
            {loading ? (
              <span>Deploying Squadron...</span>
            ) : (
              <>
                <span>Initialize Workspace</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-4 text-center text-xs text-text-secondary">
          Already deployed?{' '}
          <Link to="/login" className="text-accent-primary hover:underline font-mono">
            Access Terminal →
          </Link>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
