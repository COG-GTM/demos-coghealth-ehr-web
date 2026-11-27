import 'dotenv/config';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('Running migrations...');

    await client.query(`
      DO $$ BEGIN
        CREATE TYPE work_pass_type AS ENUM ('EP', 'S Pass', 'Work Permit', 'Dependant Pass', 'LTVP', 'Citizen', 'PR', 'Other');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;

      DO $$ BEGIN
        CREATE TYPE employment_type AS ENUM ('Full-time', 'Part-time', 'Contract', 'Internship');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;

      DO $$ BEGIN
        CREATE TYPE job_status AS ENUM ('Open', 'Closed', 'On Hold');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;

      DO $$ BEGIN
        CREATE TYPE pipeline_stage AS ENUM ('Applied', 'Screening', 'Interview', 'Offer', 'Hired', 'Rejected');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;

      CREATE TABLE IF NOT EXISTS candidates (
        id SERIAL PRIMARY KEY,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        email VARCHAR(255) NOT NULL,
        phone VARCHAR(30),
        linkedin VARCHAR(500),
        nationality VARCHAR(100),
        nric_fin VARCHAR(20),
        work_pass_type work_pass_type,
        work_pass_expiry DATE,
        current_salary INTEGER,
        expected_salary INTEGER,
        notice_period VARCHAR(50),
        skills TEXT,
        notes TEXT,
        resume_url VARCHAR(500),
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      );

      CREATE TABLE IF NOT EXISTS jobs (
        id SERIAL PRIMARY KEY,
        title VARCHAR(200) NOT NULL,
        department VARCHAR(100),
        location VARCHAR(200) DEFAULT 'Singapore',
        description TEXT,
        requirements TEXT,
        salary_min INTEGER,
        salary_max INTEGER,
        employment_type employment_type DEFAULT 'Full-time',
        status job_status DEFAULT 'Open',
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      );

      CREATE TABLE IF NOT EXISTS applications (
        id SERIAL PRIMARY KEY,
        candidate_id INTEGER NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
        job_id INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
        stage pipeline_stage DEFAULT 'Applied' NOT NULL,
        notes TEXT,
        applied_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `);

    console.log('Migrations completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
