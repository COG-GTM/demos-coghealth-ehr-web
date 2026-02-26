import { pgTable, serial, varchar, text, timestamp, integer, pgEnum, date } from 'drizzle-orm/pg-core';

// Enums
export const workPassTypeEnum = pgEnum('work_pass_type', [
  'EP',
  'S Pass',
  'Work Permit',
  'Dependant Pass',
  'LTVP',
  'Citizen',
  'PR',
  'Other',
]);

export const employmentTypeEnum = pgEnum('employment_type', [
  'Full-time',
  'Part-time',
  'Contract',
  'Internship',
]);

export const jobStatusEnum = pgEnum('job_status', [
  'Open',
  'Closed',
  'On Hold',
]);

export const pipelineStageEnum = pgEnum('pipeline_stage', [
  'Applied',
  'Screening',
  'Interview',
  'Offer',
  'Hired',
  'Rejected',
]);

// Candidates table
export const candidates = pgTable('candidates', {
  id: serial('id').primaryKey(),
  firstName: varchar('first_name', { length: 100 }).notNull(),
  lastName: varchar('last_name', { length: 100 }).notNull(),
  email: varchar('email', { length: 255 }).notNull(),
  phone: varchar('phone', { length: 30 }),
  linkedIn: varchar('linkedin', { length: 500 }),
  nationality: varchar('nationality', { length: 100 }),
  nricFin: varchar('nric_fin', { length: 20 }),
  workPassType: workPassTypeEnum('work_pass_type'),
  workPassExpiry: date('work_pass_expiry'),
  currentSalary: integer('current_salary'),
  expectedSalary: integer('expected_salary'),
  noticePeriod: varchar('notice_period', { length: 50 }),
  skills: text('skills'),
  notes: text('notes'),
  resumeUrl: varchar('resume_url', { length: 500 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Jobs table
export const jobs = pgTable('jobs', {
  id: serial('id').primaryKey(),
  title: varchar('title', { length: 200 }).notNull(),
  department: varchar('department', { length: 100 }),
  location: varchar('location', { length: 200 }).default('Singapore'),
  description: text('description'),
  requirements: text('requirements'),
  salaryMin: integer('salary_min'),
  salaryMax: integer('salary_max'),
  employmentType: employmentTypeEnum('employment_type').default('Full-time'),
  status: jobStatusEnum('status').default('Open'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Applications table (links candidates to jobs)
export const applications = pgTable('applications', {
  id: serial('id').primaryKey(),
  candidateId: integer('candidate_id')
    .references(() => candidates.id, { onDelete: 'cascade' })
    .notNull(),
  jobId: integer('job_id')
    .references(() => jobs.id, { onDelete: 'cascade' })
    .notNull(),
  stage: pipelineStageEnum('stage').default('Applied').notNull(),
  notes: text('notes'),
  appliedAt: timestamp('applied_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
