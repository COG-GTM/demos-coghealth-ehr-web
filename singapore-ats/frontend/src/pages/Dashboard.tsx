import { useEffect, useState } from 'react';
import { dashboardApi, type DashboardStats } from '../lib/api';

const STAGE_COLORS: Record<string, string> = {
  Applied: 'bg-blue-100 text-blue-800',
  Screening: 'bg-yellow-100 text-yellow-800',
  Interview: 'bg-purple-100 text-purple-800',
  Offer: 'bg-green-100 text-green-800',
  Hired: 'bg-emerald-100 text-emerald-800',
  Rejected: 'bg-red-100 text-red-800',
};

const STAGE_BAR_COLORS: Record<string, string> = {
  Applied: 'bg-blue-500',
  Screening: 'bg-yellow-500',
  Interview: 'bg-purple-500',
  Offer: 'bg-green-500',
  Hired: 'bg-emerald-500',
  Rejected: 'bg-red-500',
};

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dashboardApi
      .getStats()
      .then(setStats)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-500">Loading dashboard...</div>
      </div>
    );
  }

  if (!stats) return <div className="text-red-500">Failed to load dashboard</div>;

  const totalPipeline = stats.pipelineStats.reduce((sum, s) => sum + s.count, 0);

  return (
    <div>
      <h2 className="text-2xl font-bold text-slate-800 mb-6">Dashboard</h2>

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <StatCard title="Total Candidates" value={stats.totalCandidates} color="bg-blue-500" />
        <StatCard title="Open Jobs" value={stats.openJobs} color="bg-green-500" />
        <StatCard title="Total Jobs" value={stats.totalJobs} color="bg-indigo-500" />
        <StatCard title="Applications" value={stats.totalApplications} color="bg-purple-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Pipeline breakdown */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Pipeline Overview</h3>
          {stats.pipelineStats.length === 0 ? (
            <p className="text-slate-400 text-sm">No applications yet</p>
          ) : (
            <div className="space-y-3">
              {stats.pipelineStats.map((s) => (
                <div key={s.stage}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-600">{s.stage}</span>
                    <span className="text-slate-500">{s.count}</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2.5">
                    <div
                      className={`h-2.5 rounded-full ${STAGE_BAR_COLORS[s.stage] || 'bg-slate-400'}`}
                      style={{ width: `${totalPipeline > 0 ? (s.count / totalPipeline) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent applications */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Recent Applications</h3>
          {stats.recentApplications.length === 0 ? (
            <p className="text-slate-400 text-sm">No recent applications</p>
          ) : (
            <div className="space-y-3">
              {stats.recentApplications.map((app) => (
                <div key={app.id} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-slate-700">
                      {app.candidateFirstName} {app.candidateLastName}
                    </p>
                    <p className="text-xs text-slate-400">{app.jobTitle}</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${STAGE_COLORS[app.stage] || 'bg-slate-100 text-slate-600'}`}>
                    {app.stage}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, color }: { title: string; value: number; color: string }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <div className="flex items-center gap-4">
        <div className={`w-12 h-12 ${color} rounded-lg flex items-center justify-center`}>
          <span className="text-white text-xl font-bold">{value}</span>
        </div>
        <div>
          <p className="text-sm text-slate-500">{title}</p>
          <p className="text-2xl font-bold text-slate-800">{value}</p>
        </div>
      </div>
    </div>
  );
}
