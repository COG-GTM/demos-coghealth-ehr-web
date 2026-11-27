import { useEffect, useState } from 'react';
import { candidatesApi, type Candidate } from '../lib/api';

const WORK_PASS_TYPES = ['EP', 'S Pass', 'Work Permit', 'Dependant Pass', 'LTVP', 'Citizen', 'PR', 'Other'];

const emptyForm = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  linkedIn: '',
  nationality: '',
  nricFin: '',
  workPassType: '' as string,
  workPassExpiry: '',
  currentSalary: '' as string | number,
  expectedSalary: '' as string | number,
  noticePeriod: '',
  skills: '',
  notes: '',
};

export default function Candidates() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [search, setSearch] = useState('');

  const loadCandidates = () => {
    candidatesApi.getAll().then(setCandidates).finally(() => setLoading(false));
  };

  useEffect(() => { loadCandidates(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      ...form,
      currentSalary: form.currentSalary ? Number(form.currentSalary) : undefined,
      expectedSalary: form.expectedSalary ? Number(form.expectedSalary) : undefined,
      workPassType: form.workPassType || undefined,
      workPassExpiry: form.workPassExpiry || undefined,
    };

    if (editingId) {
      await candidatesApi.update(editingId, data);
    } else {
      await candidatesApi.create(data);
    }
    setForm(emptyForm);
    setShowForm(false);
    setEditingId(null);
    loadCandidates();
  };

  const handleEdit = (c: Candidate) => {
    setForm({
      firstName: c.firstName,
      lastName: c.lastName,
      email: c.email,
      phone: c.phone || '',
      linkedIn: c.linkedIn || '',
      nationality: c.nationality || '',
      nricFin: c.nricFin || '',
      workPassType: c.workPassType || '',
      workPassExpiry: c.workPassExpiry || '',
      currentSalary: c.currentSalary || '',
      expectedSalary: c.expectedSalary || '',
      noticePeriod: c.noticePeriod || '',
      skills: c.skills || '',
      notes: c.notes || '',
    });
    setEditingId(c.id);
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (confirm('Delete this candidate?')) {
      await candidatesApi.delete(id);
      loadCandidates();
    }
  };

  const filtered = candidates.filter(
    (c) =>
      `${c.firstName} ${c.lastName} ${c.email} ${c.skills || ''}`
        .toLowerCase()
        .includes(search.toLowerCase())
  );

  if (loading) return <div className="text-slate-500">Loading candidates...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-slate-800">Candidates</h2>
        <button
          onClick={() => { setShowForm(!showForm); setEditingId(null); setForm(emptyForm); }}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
        >
          {showForm ? 'Cancel' : '+ Add Candidate'}
        </button>
      </div>

      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search candidates..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full md:w-80 px-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {/* Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">{editingId ? 'Edit Candidate' : 'New Candidate'}</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input label="First Name *" value={form.firstName} onChange={(v) => setForm({ ...form, firstName: v })} required />
            <Input label="Last Name *" value={form.lastName} onChange={(v) => setForm({ ...form, lastName: v })} required />
            <Input label="Email *" type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} required />
            <Input label="Phone" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
            <Input label="LinkedIn" value={form.linkedIn} onChange={(v) => setForm({ ...form, linkedIn: v })} />
            <Input label="Nationality" value={form.nationality} onChange={(v) => setForm({ ...form, nationality: v })} />
            <Input label="NRIC/FIN" value={form.nricFin} onChange={(v) => setForm({ ...form, nricFin: v })} />
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Work Pass Type</label>
              <select
                value={form.workPassType}
                onChange={(e) => setForm({ ...form, workPassType: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Select...</option>
                {WORK_PASS_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <Input label="Work Pass Expiry" type="date" value={form.workPassExpiry} onChange={(v) => setForm({ ...form, workPassExpiry: v })} />
            <Input label="Current Salary (SGD)" type="number" value={String(form.currentSalary)} onChange={(v) => setForm({ ...form, currentSalary: v })} />
            <Input label="Expected Salary (SGD)" type="number" value={String(form.expectedSalary)} onChange={(v) => setForm({ ...form, expectedSalary: v })} />
            <Input label="Notice Period" value={form.noticePeriod} onChange={(v) => setForm({ ...form, noticePeriod: v })} placeholder="e.g. 1 month" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Skills</label>
              <textarea
                value={form.skills}
                onChange={(e) => setForm({ ...form, skills: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                rows={3}
                placeholder="e.g. React, TypeScript, Node.js"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                rows={3}
              />
            </div>
          </div>
          <div className="mt-4">
            <button type="submit" className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 text-sm font-medium">
              {editingId ? 'Update Candidate' : 'Create Candidate'}
            </button>
          </div>
        </form>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Name</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Email</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Nationality</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Work Pass</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Skills</th>
              <th className="text-right px-4 py-3 font-medium text-slate-600">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                  No candidates found
                </td>
              </tr>
            ) : (
              filtered.map((c) => (
                <tr key={c.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-800">{c.firstName} {c.lastName}</td>
                  <td className="px-4 py-3 text-slate-600">{c.email}</td>
                  <td className="px-4 py-3 text-slate-600">{c.nationality || '-'}</td>
                  <td className="px-4 py-3">
                    {c.workPassType ? (
                      <span className="bg-slate-100 text-slate-700 px-2 py-1 rounded text-xs">{c.workPassType}</span>
                    ) : '-'}
                  </td>
                  <td className="px-4 py-3 text-slate-600 max-w-[200px] truncate">{c.skills || '-'}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => handleEdit(c)} className="text-indigo-600 hover:text-indigo-800 mr-3 text-xs font-medium">Edit</button>
                    <button onClick={() => handleDelete(c.id)} className="text-red-600 hover:text-red-800 text-xs font-medium">Delete</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Input({
  label, value, onChange, type = 'text', required, placeholder,
}: {
  label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean; placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        placeholder={placeholder}
        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />
    </div>
  );
}
