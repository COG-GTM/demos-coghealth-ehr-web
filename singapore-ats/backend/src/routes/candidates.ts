import { Router, Request, Response } from 'express';
import { db, schema } from '../db';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

const router = Router();

const candidateSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  linkedIn: z.string().optional(),
  nationality: z.string().optional(),
  nricFin: z.string().optional(),
  workPassType: z.enum(['EP', 'S Pass', 'Work Permit', 'Dependant Pass', 'LTVP', 'Citizen', 'PR', 'Other']).optional(),
  workPassExpiry: z.string().optional(),
  currentSalary: z.number().optional(),
  expectedSalary: z.number().optional(),
  noticePeriod: z.string().optional(),
  skills: z.string().optional(),
  notes: z.string().optional(),
  resumeUrl: z.string().optional(),
});

// GET all candidates
router.get('/', async (_req: Request, res: Response) => {
  try {
    const allCandidates = await db.select().from(schema.candidates).orderBy(schema.candidates.createdAt);
    res.json(allCandidates);
  } catch (error) {
    console.error('Error fetching candidates:', error);
    res.status(500).json({ error: 'Failed to fetch candidates' });
  }
});

// GET single candidate
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    const candidate = await db.select().from(schema.candidates).where(eq(schema.candidates.id, id));
    if (candidate.length === 0) {
      res.status(404).json({ error: 'Candidate not found' });
      return;
    }
    res.json(candidate[0]);
  } catch (error) {
    console.error('Error fetching candidate:', error);
    res.status(500).json({ error: 'Failed to fetch candidate' });
  }
});

// POST create candidate
router.post('/', async (req: Request, res: Response) => {
  try {
    const data = candidateSchema.parse(req.body);
    const newCandidate = await db.insert(schema.candidates).values(data).returning();
    res.status(201).json(newCandidate[0]);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation failed', details: error.errors });
      return;
    }
    console.error('Error creating candidate:', error);
    res.status(500).json({ error: 'Failed to create candidate' });
  }
});

// PUT update candidate
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    const data = candidateSchema.partial().parse(req.body);
    const updated = await db
      .update(schema.candidates)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(schema.candidates.id, id))
      .returning();
    if (updated.length === 0) {
      res.status(404).json({ error: 'Candidate not found' });
      return;
    }
    res.json(updated[0]);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation failed', details: error.errors });
      return;
    }
    console.error('Error updating candidate:', error);
    res.status(500).json({ error: 'Failed to update candidate' });
  }
});

// DELETE candidate
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    const deleted = await db.delete(schema.candidates).where(eq(schema.candidates.id, id)).returning();
    if (deleted.length === 0) {
      res.status(404).json({ error: 'Candidate not found' });
      return;
    }
    res.json({ message: 'Candidate deleted' });
  } catch (error) {
    console.error('Error deleting candidate:', error);
    res.status(500).json({ error: 'Failed to delete candidate' });
  }
});

export default router;
