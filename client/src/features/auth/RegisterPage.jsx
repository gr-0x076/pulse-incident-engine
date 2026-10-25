import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Shield, Building, User, Mail, Lock, ArrowRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const slugify = (text) =>
  (text || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

export const RegisterPage = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    orgName: '',
    orgSlug: '',
  });
  const [slugManual, setSlugManual] = useState(false);
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'orgName') {
      setFormData((prev) => ({
        ...prev,
        orgName: value,
        orgSlug: slugManual ? prev.orgSlug : slugify(value),
      }));
    } else if (name === 'orgSlug') {
      setSlugManual(true);
      setFormData((prev) => ({
        ...prev,
        orgSlug: value.toLowerCase().replace(/[^a-z0-9-]/g, ''),
      }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const cleanOrgName = formData.orgName.trim();
    const cleanSlug = (formData.orgSlug.trim() || slugify(cleanOrgName))
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, '-')
      .replace(/^-+|-+$/g, '');
    const cleanName = formData.name.trim();
    const cleanEmail = formData.email.trim().toLowerCase();

    if (cleanOrgName.length < 2) {
      toast.error('Organization name must be at least 2 characters');
      return;
    }
    if (cleanSlug.length < 2) {
      toast.error('Organization slug must be at least 2 alphanumeric characters');
      return;
    }
    if (cleanName.length < 2) {
      toast.error('Administrator name must be at least 2 characters');
      return;
    }
    if (!cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      toast.error('Please enter a valid email address');
      return;
    }
    if (formData.password.length < 6) {
      toast.error('Master password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      const data = await register({
        orgName: cleanOrgName,
        orgSlug: cleanSlug,
        name: cleanName,
        email: cleanEmail,
        password: formData.password,
      });
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
    <div className="min-h-screen bg-bg-primary text-text-primary flex items-center justify-center p-4 font-sans relative">
      {/* Background Atmosphere glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[350px] bg-[#7877C6]/[0.05] rounded-full blur-[140px] pointer-events-none" />

      <div className="w-full max-w-md linear-card p-8 sm:p-10 shadow-[0_30px_90px_rgba(0,0,0,0.85)] relative z-10 space-y-6">
        <div className="space-y-1.5 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.03] border border-white/[0.08] text-[11px] font-mono text-text-secondary mb-2">
            <span className="w-1.5 h-1.5 rounded-full bg-accent-primary animate-pulse" />
            <span>Workspace Provisioning</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">
            Deploy Organization
          </h1>
          <p className="text-xs text-text-secondary font-serif italic text-base text-text-secondary/80">
            Dedicated multi-tenant incident response environment with default SLA tiers.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-medium text-text-secondary block mb-1.5">
              Organization Name
            </label>
            <div className="relative">
              <Building className="w-4 h-4 text-text-tertiary absolute left-3.5 top-3" />
              <input
                type="text"
                name="orgName"
                required
                value={formData.orgName}
                onChange={handleChange}
                placeholder="Acme Reliability Team"
                className="w-full bg-[#070709] border border-white/[0.08] focus:border-white/20 rounded-xl px-3.5 py-2.5 pl-10 text-xs text-text-primary placeholder:text-text-tertiary focus:outline-none transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-text-secondary block mb-1.5">
              Organization Slug (Subdomain)
            </label>
            <input
              type="text"
              name="orgSlug"
              required
              value={formData.orgSlug}
              onChange={handleChange}
              placeholder="acme-sre"
              className="w-full bg-[#070709] border border-white/[0.08] focus:border-white/20 rounded-xl px-3.5 py-2.5 text-xs text-text-primary placeholder:text-text-tertiary focus:outline-none font-mono transition-colors"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-text-secondary block mb-1.5">
              Administrator Name
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-text-tertiary absolute left-3.5 top-3" />
              <input
                type="text"
                name="name"
                required
                value={formData.name}
                onChange={handleChange}
                placeholder="Sarah Chen"
                className="w-full bg-[#070709] border border-white/[0.08] focus:border-white/20 rounded-xl px-3.5 py-2.5 pl-10 text-xs text-text-primary placeholder:text-text-tertiary focus:outline-none transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-text-secondary block mb-1.5">
              Admin Email
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-text-tertiary absolute left-3.5 top-3" />
              <input
                type="email"
                name="email"
                required
                value={formData.email}
                onChange={handleChange}
                placeholder="sarah@acme.corp"
                className="w-full bg-[#070709] border border-white/[0.08] focus:border-white/20 rounded-xl px-3.5 py-2.5 pl-10 text-xs text-text-primary placeholder:text-text-tertiary focus:outline-none transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-text-secondary block mb-1.5">
              Master Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-text-tertiary absolute left-3.5 top-3" />
              <input
                type="password"
                name="password"
                required
                minLength={6}
                value={formData.password}
                onChange={handleChange}
                placeholder="••••••••••••"
                className="w-full bg-[#070709] border border-white/[0.08] focus:border-white/20 rounded-xl px-3.5 py-2.5 pl-10 text-xs text-text-primary placeholder:text-text-tertiary focus:outline-none font-mono transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-ivory w-full py-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 mt-4"
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

        <div className="text-center text-xs text-text-secondary pt-2">
          Already deployed?{' '}
          <Link to="/login" className="text-text-primary font-medium hover:underline">
            Access Terminal →
          </Link>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
