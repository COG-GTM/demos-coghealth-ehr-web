import { Router, Request, Response } from 'express';
import { db, schema } from '../db';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

const router = Router();

const jobSchema = z.object({
  title: z.string().min(1),
  department: z.string().optional(),
  location: z.string().optional(),
  description: z.string().optional(),
  requirements: z.string().optional(),
  salaryMin: z.number().optional(),
  salaryMax: z.number().optional(),
  employmentType: z.enum(['Full-time', 'Part-time', 'Contract', 'Internship']).optional(),
  status: z.enum(['Open', 'Closed', 'On Hold']).optional(),
});

// GET all jobs
router.get('/', async (_req: Request, res: Response) => {
  try {
    const allJobs = await db.select().from(schema.jobs).orderBy(schema.jobs.createdAt);
    res.json(allJobs);
  } catch (error) {
    console.error('Error fetching jobs:', error);
    res.status(500).json({ error: 'Failed to fetch jobs' });
  }
});

// GET single job
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    const job = await db.select().from(schema.jobs).where(eq(schema.jobs.id, id));
    if (job.length === 0) {
      res.status(404).json({ error: 'Job not found' });
      return;
    }
    res.json(job[0]);
  } catch (error) {
    console.error('Error fetching job:', error);
    res.status(500).json({ error: 'Failed to fetch job' });
  }
});

// POST create job
router.post('/', async (req: Request, res: Response) => {
  try {
    const data = jobSchema.parse(req.body);
    const newJob = await db.insert(schema.jobs).values(data).returning();
    res.status(201).json(newJob[0]);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation failed', details: error.errors });
      return;
    }
    console.error('Error creating job:', error);
    res.status(500).json({ error: 'Failed to create job' });
  }
});

// PUT update job
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    const data = jobSchema.partial().parse(req.body);
    const updated = await db
      .update(schema.jobs)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(schema.jobs.id, id))
      .returning();
    if (updated.length === 0) {
      res.status(404).json({ error: 'Job not found' });
      return;
    }
    res.json(updated[0]);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation failed', details: error.errors });
      return;
    }
    console.error('Error updating job:', error);
    res.status(500).json({ error: 'Failed to update job' });
  }
});

// DELETE job
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    const deleted = await db.delete(schema.jobs).where(eq(schema.jobs.id, id)).returning();
    if (deleted.length === 0) {
      res.status(404).json({ error: 'Job not found' });
      return;
    }
    res.json({ message: 'Job deleted' });
  } catch (error) {
    console.error('Error deleting job:', error);
    res.status(500).json({ error: 'Failed to delete job' });
  }
});

export default router;
