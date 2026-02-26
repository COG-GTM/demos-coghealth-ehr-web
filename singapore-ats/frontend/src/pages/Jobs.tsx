import { useEffect, useState } from 'react';
import { jobsApi, type Job } from '../lib/api';

const EMPLOYMENT_TYPES = ['Full-time', 'Part-time', 'Contract', 'Internship'];
const JOB_STATUSES = ['Open', 'Closed', 'On Hold'];

const STATUS_COLORS: Record<string, string> = {
  Open: 'bg-green-100 text-green-800',
  Closed: 'bg-red-100 text-red-800',
  'On Hold': 'bg-yellow-100 text-yellow-800',
};

const emptyForm = {
  title: '',
  department: '',
  location: 'Singapore',
  description: '',
  requirements: '',
  salaryMin: '' as string | number,
  salaryMax: '' as string | number,
  employmentType: 'Full-time',
  status: 'Open',
};

export default function Jobs() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);

  const loadJobs = () => {
    jobsApi.getAll().then(setJobs).finally(() => setLoading(false));
  };

  useEffect(() => { loadJobs(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      ...form,
      salaryMin: form.salaryMin ? Number(form.salaryMin) : undefined,
      salaryMax: form.salaryMax ? Number(form.salaryMax) : undefined,
    };

    if (editingId) {
      await jobsApi.update(editingId, data);
    } else {
      await jobsApi.create(data);
    }
    setForm(emptyForm);
    setShowForm(false);
    setEditingId(null);
    loadJobs();
  };

  const handleEdit = (j: Job) => {
    setForm({
      title: j.title,
      department: j.department || '',
      location: j.location || 'Singapore',
      description: j.description || '',
      requirements: j.requirements || '',
      salaryMin: j.salaryMin || '',
      salaryMax: j.salaryMax || '',
      employmentType: j.employmentType || 'Full-time',
      status: j.status || 'Open',
    });
    setEditingId(j.id);
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (confirm('Delete this job?')) {
      await jobsApi.delete(id);
      loadJobs();
    }
  };

  if (loading) return <div className="text-slate-500">Loading jobs...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-slate-800">Job Postings</h2>
        <button
          onClick={() => { setShowForm(!showForm); setEditingId(null); setForm(emptyForm); }}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
        >
          {showForm ? 'Cancel' : '+ Add Job'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">{editingId ? 'Edit Job' : 'New Job'}</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input label="Title *" value={form.title} onChange={(v) => setForm({ ...form, title: v })} required />
            <Input label="Department" value={form.department} onChange={(v) => setForm({ ...form, department: v })} />
            <Input label="Location" value={form.location} onChange={(v) => setForm({ ...form, location: v })} />
            <Input label="Min Salary (SGD)" type="number" value={String(form.salaryMin)} onChange={(v) => setForm({ ...form, salaryMin: v })} />
            <Input label="Max Salary (SGD)" type="number" value={String(form.salaryMax)} onChange={(v) => setForm({ ...form, salaryMax: v })} />
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Employment Type</label>
              <select
                value={form.employmentType}
                onChange={(e) => setForm({ ...form, employmentType: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {EMPLOYMENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {JOB_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                rows={4}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Requirements</label>
              <textarea
                value={form.requirements}
                onChange={(e) => setForm({ ...form, requirements: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                rows={4}
              />
            </div>
          </div>
          <div className="mt-4">
            <button type="submit" className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 text-sm font-medium">
              {editingId ? 'Update Job' : 'Create Job'}
            </button>
          </div>
        </form>
      )}

      {/* Job cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {jobs.length === 0 ? (
          <div className="col-span-3 text-center text-slate-400 py-8">No jobs yet</div>
        ) : (
          jobs.map((j) => (
            <div key={j.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-semibold text-slate-800">{j.title}</h3>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLORS[j.status || 'Open']}`}>
                  {j.status}
                </span>
              </div>
              <p className="text-sm text-slate-500 mb-1">{j.department || 'No department'}</p>
              <p className="text-sm text-slate-500 mb-2">{j.location}</p>
              {(j.salaryMin || j.salaryMax) && (
                <p className="text-sm text-slate-600 mb-2">
                  SGD {j.salaryMin?.toLocaleString() || '?'} - {j.salaryMax?.toLocaleString() || '?'}
                </p>
              )}
              <p className="text-xs text-slate-400 mb-3">{j.employmentType}</p>
              {j.description && (
                <p className="text-sm text-slate-600 mb-3 line-clamp-2">{j.description}</p>
              )}
              <div className="flex gap-2 pt-2 border-t border-slate-100">
                <button onClick={() => handleEdit(j)} className="text-indigo-600 hover:text-indigo-800 text-xs font-medium">Edit</button>
                <button onClick={() => handleDelete(j.id)} className="text-red-600 hover:text-red-800 text-xs font-medium">Delete</button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function Input({
  label, value, onChange, type = 'text', required,
}: {
  label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />
    </div>
  );
}
