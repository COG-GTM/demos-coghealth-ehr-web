import { useEffect, useState } from 'react';
import { applicationsApi, candidatesApi, jobsApi, type Application, type Candidate, type Job } from '../lib/api';

const STAGES = ['Applied', 'Screening', 'Interview', 'Offer', 'Hired', 'Rejected'];

const STAGE_COLORS: Record<string, string> = {
  Applied: 'border-blue-300 bg-blue-50',
  Screening: 'border-yellow-300 bg-yellow-50',
  Interview: 'border-purple-300 bg-purple-50',
  Offer: 'border-green-300 bg-green-50',
  Hired: 'border-emerald-300 bg-emerald-50',
  Rejected: 'border-red-300 bg-red-50',
};

const STAGE_HEADER_COLORS: Record<string, string> = {
  Applied: 'bg-blue-500',
  Screening: 'bg-yellow-500',
  Interview: 'bg-purple-500',
  Offer: 'bg-green-500',
  Hired: 'bg-emerald-500',
  Rejected: 'bg-red-500',
};

export default function Pipeline() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [newApp, setNewApp] = useState({ candidateId: '', jobId: '', notes: '' });

  const loadData = async () => {
    const [apps, cands, jbs] = await Promise.all([
      applicationsApi.getAll(),
      candidatesApi.getAll(),
      jobsApi.getAll(),
    ]);
    setApplications(apps);
    setCandidates(cands);
    setJobs(jbs);
    setLoading(false);
  };

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      applicationsApi.getAll(),
      candidatesApi.getAll(),
      jobsApi.getAll(),
    ]).then(([apps, cands, jbs]) => {
      if (!cancelled) {
        setApplications(apps);
        setCandidates(cands);
        setJobs(jbs);
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, []);

  const handleStageChange = async (appId: number, newStage: string) => {
    await applicationsApi.updateStage(appId, newStage);
    loadData();
  };

  const handleCreateApp = async (e: React.FormEvent) => {
    e.preventDefault();
    await applicationsApi.create({
      candidateId: Number(newApp.candidateId),
      jobId: Number(newApp.jobId),
      notes: newApp.notes || undefined,
    });
    setNewApp({ candidateId: '', jobId: '', notes: '' });
    setShowForm(false);
    loadData();
  };

  const handleDelete = async (id: number) => {
    if (confirm('Remove this application?')) {
      await applicationsApi.delete(id);
      loadData();
    }
  };

  if (loading) return <div className="text-slate-500">Loading pipeline...</div>;

  const appsByStage = STAGES.reduce((acc, stage) => {
    acc[stage] = applications.filter((a) => a.stage === stage);
    return acc;
  }, {} as Record<string, Application[]>);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-slate-800">Pipeline</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
        >
          {showForm ? 'Cancel' : '+ New Application'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreateApp} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">New Application</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Candidate *</label>
              <select
                value={newApp.candidateId}
                onChange={(e) => setNewApp({ ...newApp, candidateId: e.target.value })}
                required
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Select candidate...</option>
                {candidates.map((c) => (
                  <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Job *</label>
              <select
                value={newApp.jobId}
                onChange={(e) => setNewApp({ ...newApp, jobId: e.target.value })}
                required
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Select job...</option>
                {jobs.map((j) => (
                  <option key={j.id} value={j.id}>{j.title} ({j.department || 'N/A'})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
              <input
                type="text"
                value={newApp.notes}
                onChange={(e) => setNewApp({ ...newApp, notes: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Optional notes..."
              />
            </div>
          </div>
          <div className="mt-4">
            <button type="submit" className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 text-sm font-medium">
              Create Application
            </button>
          </div>
        </form>
      )}

      {/* Kanban board */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {STAGES.map((stage) => (
          <div key={stage} className="min-w-[260px] flex-shrink-0">
            <div className={`${STAGE_HEADER_COLORS[stage]} text-white px-4 py-2 rounded-t-lg font-medium text-sm flex justify-between`}>
              <span>{stage}</span>
              <span className="bg-white/20 px-2 rounded-full text-xs leading-6">{appsByStage[stage].length}</span>
            </div>
            <div className={`border-l-2 border-r-2 border-b-2 ${STAGE_COLORS[stage]} rounded-b-lg p-2 min-h-[200px] space-y-2`}>
              {appsByStage[stage].length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-4">No applications</p>
              ) : (
                appsByStage[stage].map((app) => (
                  <div key={app.id} className="bg-white rounded-lg shadow-sm border border-slate-200 p-3">
                    <p className="font-medium text-sm text-slate-800">
                      {app.candidateFirstName} {app.candidateLastName}
                    </p>
                    <p className="text-xs text-slate-500 mb-2">{app.jobTitle}</p>
                    {app.notes && <p className="text-xs text-slate-400 mb-2">{app.notes}</p>}
                    <div className="flex items-center gap-1 flex-wrap">
                      <select
                        value={app.stage}
                        onChange={(e) => handleStageChange(app.id, e.target.value)}
                        className="text-xs border border-slate-200 rounded px-1 py-0.5 focus:outline-none"
                      >
                        {STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                      <button
                        onClick={() => handleDelete(app.id)}
                        className="text-red-500 hover:text-red-700 text-xs ml-auto"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
