import { Router, Request, Response } from 'express';
import { db, schema } from '../db';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

const router = Router();

const applicationSchema = z.object({
  candidateId: z.number(),
  jobId: z.number(),
  stage: z.enum(['Applied', 'Screening', 'Interview', 'Offer', 'Hired', 'Rejected']).optional(),
  notes: z.string().optional(),
});

const stageUpdateSchema = z.object({
  stage: z.enum(['Applied', 'Screening', 'Interview', 'Offer', 'Hired', 'Rejected']),
});

// GET all applications (with candidate and job info)
router.get('/', async (_req: Request, res: Response) => {
  try {
    const allApplications = await db
      .select({
        id: schema.applications.id,
        candidateId: schema.applications.candidateId,
        jobId: schema.applications.jobId,
        stage: schema.applications.stage,
        notes: schema.applications.notes,
        appliedAt: schema.applications.appliedAt,
        updatedAt: schema.applications.updatedAt,
        candidateFirstName: schema.candidates.firstName,
        candidateLastName: schema.candidates.lastName,
        candidateEmail: schema.candidates.email,
        jobTitle: schema.jobs.title,
        jobDepartment: schema.jobs.department,
      })
      .from(schema.applications)
      .leftJoin(schema.candidates, eq(schema.applications.candidateId, schema.candidates.id))
      .leftJoin(schema.jobs, eq(schema.applications.jobId, schema.jobs.id))
      .orderBy(schema.applications.appliedAt);
    res.json(allApplications);
  } catch (error) {
    console.error('Error fetching applications:', error);
    res.status(500).json({ error: 'Failed to fetch applications' });
  }
});

// GET single application
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    const application = await db
      .select({
        id: schema.applications.id,
        candidateId: schema.applications.candidateId,
        jobId: schema.applications.jobId,
        stage: schema.applications.stage,
        notes: schema.applications.notes,
        appliedAt: schema.applications.appliedAt,
        updatedAt: schema.applications.updatedAt,
        candidateFirstName: schema.candidates.firstName,
        candidateLastName: schema.candidates.lastName,
        candidateEmail: schema.candidates.email,
        jobTitle: schema.jobs.title,
        jobDepartment: schema.jobs.department,
      })
      .from(schema.applications)
      .leftJoin(schema.candidates, eq(schema.applications.candidateId, schema.candidates.id))
      .leftJoin(schema.jobs, eq(schema.applications.jobId, schema.jobs.id))
      .where(eq(schema.applications.id, id));
    if (application.length === 0) {
      res.status(404).json({ error: 'Application not found' });
      return;
    }
    res.json(application[0]);
  } catch (error) {
    console.error('Error fetching application:', error);
    res.status(500).json({ error: 'Failed to fetch application' });
  }
});

// POST create application
router.post('/', async (req: Request, res: Response) => {
  try {
    const data = applicationSchema.parse(req.body);
    const newApp = await db.insert(schema.applications).values(data).returning();
    res.status(201).json(newApp[0]);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation failed', details: error.errors });
      return;
    }
    console.error('Error creating application:', error);
    res.status(500).json({ error: 'Failed to create application' });
  }
});

// PATCH update application stage
router.patch('/:id/stage', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    const { stage } = stageUpdateSchema.parse(req.body);
    const updated = await db
      .update(schema.applications)
      .set({ stage, updatedAt: new Date() })
      .where(eq(schema.applications.id, id))
      .returning();
    if (updated.length === 0) {
      res.status(404).json({ error: 'Application not found' });
      return;
    }
    res.json(updated[0]);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation failed', details: error.errors });
      return;
    }
    console.error('Error updating application stage:', error);
    res.status(500).json({ error: 'Failed to update application stage' });
  }
});

// PUT update application
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    const data = applicationSchema.partial().parse(req.body);
    const updated = await db
      .update(schema.applications)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(schema.applications.id, id))
      .returning();
    if (updated.length === 0) {
      res.status(404).json({ error: 'Application not found' });
      return;
    }
    res.json(updated[0]);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation failed', details: error.errors });
      return;
    }
    console.error('Error updating application:', error);
    res.status(500).json({ error: 'Failed to update application' });
  }
});

// DELETE application
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    const deleted = await db.delete(schema.applications).where(eq(schema.applications.id, id)).returning();
    if (deleted.length === 0) {
      res.status(404).json({ error: 'Application not found' });
      return;
    }
    res.json({ message: 'Application deleted' });
  } catch (error) {
    console.error('Error deleting application:', error);
    res.status(500).json({ error: 'Failed to delete application' });
  }
});

export default router;
