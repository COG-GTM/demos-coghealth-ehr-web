import { Router, Request, Response } from 'express';
import { db, schema } from '../db';
import { eq, sql } from 'drizzle-orm';

const router = Router();

// GET dashboard stats
router.get('/stats', async (_req: Request, res: Response) => {
  try {
    const [candidateCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.candidates);

    const [openJobCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.jobs)
      .where(eq(schema.jobs.status, 'Open'));

    const [totalJobCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.jobs);

    const [applicationCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.applications);

    const pipelineStats = await db
      .select({
        stage: schema.applications.stage,
        count: sql<number>`count(*)::int`,
      })
      .from(schema.applications)
      .groupBy(schema.applications.stage);

    const recentApplications = await db
      .select({
        id: schema.applications.id,
        stage: schema.applications.stage,
        appliedAt: schema.applications.appliedAt,
        candidateFirstName: schema.candidates.firstName,
        candidateLastName: schema.candidates.lastName,
        jobTitle: schema.jobs.title,
      })
      .from(schema.applications)
      .leftJoin(schema.candidates, eq(schema.applications.candidateId, schema.candidates.id))
      .leftJoin(schema.jobs, eq(schema.applications.jobId, schema.jobs.id))
      .orderBy(sql`${schema.applications.appliedAt} DESC`)
      .limit(10);

    res.json({
      totalCandidates: candidateCount.count,
      openJobs: openJobCount.count,
      totalJobs: totalJobCount.count,
      totalApplications: applicationCount.count,
      pipelineStats,
      recentApplications,
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
});

export default router;
