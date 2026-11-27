const API_BASE = '/api';

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(error.error || 'Request failed');
  }
  return res.json();
}

// Types
export interface Candidate {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  linkedIn?: string;
  nationality?: string;
  nricFin?: string;
  workPassType?: string;
  workPassExpiry?: string;
  currentSalary?: number;
  expectedSalary?: number;
  noticePeriod?: string;
  skills?: string;
  notes?: string;
  resumeUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Job {
  id: number;
  title: string;
  department?: string;
  location?: string;
  description?: string;
  requirements?: string;
  salaryMin?: number;
  salaryMax?: number;
  employmentType?: string;
  status?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Application {
  id: number;
  candidateId: number;
  jobId: number;
  stage: string;
  notes?: string;
  appliedAt: string;
  updatedAt: string;
  candidateFirstName?: string;
  candidateLastName?: string;
  candidateEmail?: string;
  jobTitle?: string;
  jobDepartment?: string;
}

export interface DashboardStats {
  totalCandidates: number;
  openJobs: number;
  totalJobs: number;
  totalApplications: number;
  pipelineStats: { stage: string; count: number }[];
  recentApplications: {
    id: number;
    stage: string;
    appliedAt: string;
    candidateFirstName: string;
    candidateLastName: string;
    jobTitle: string;
  }[];
}

// Candidates API
export const candidatesApi = {
  getAll: () => fetchJson<Candidate[]>('/candidates'),
  getOne: (id: number) => fetchJson<Candidate>(`/candidates/${id}`),
  create: (data: Partial<Candidate>) =>
    fetchJson<Candidate>('/candidates', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, data: Partial<Candidate>) =>
    fetchJson<Candidate>(`/candidates/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: number) =>
    fetchJson<{ message: string }>(`/candidates/${id}`, { method: 'DELETE' }),
};

// Jobs API
export const jobsApi = {
  getAll: () => fetchJson<Job[]>('/jobs'),
  getOne: (id: number) => fetchJson<Job>(`/jobs/${id}`),
  create: (data: Partial<Job>) =>
    fetchJson<Job>('/jobs', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, data: Partial<Job>) =>
    fetchJson<Job>(`/jobs/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: number) =>
    fetchJson<{ message: string }>(`/jobs/${id}`, { method: 'DELETE' }),
};

// Applications API
export const applicationsApi = {
  getAll: () => fetchJson<Application[]>('/applications'),
  getOne: (id: number) => fetchJson<Application>(`/applications/${id}`),
  create: (data: { candidateId: number; jobId: number; notes?: string }) =>
    fetchJson<Application>('/applications', { method: 'POST', body: JSON.stringify(data) }),
  updateStage: (id: number, stage: string) =>
    fetchJson<Application>(`/applications/${id}/stage`, {
      method: 'PATCH',
      body: JSON.stringify({ stage }),
    }),
  update: (id: number, data: Partial<Application>) =>
    fetchJson<Application>(`/applications/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: number) =>
    fetchJson<{ message: string }>(`/applications/${id}`, { method: 'DELETE' }),
};

// Dashboard API
export const dashboardApi = {
  getStats: () => fetchJson<DashboardStats>('/dashboard/stats'),
};
