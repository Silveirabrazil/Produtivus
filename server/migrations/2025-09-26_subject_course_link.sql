-- Migration: optional subject -> course link (course_id) in study_subjects
-- Date: 2025-09-26

-- This migration is written to be safe on phpMyAdmin/HostGator (MySQL). If a step fails
-- because it already exists, you can skip that step and run the next.

-- 1) Add column (idempotent when first applied)
ALTER TABLE study_subjects
  ADD COLUMN course_id BIGINT NULL;

-- 2) Add index on course_id (skip if already exists)
CREATE INDEX idx_subjects_course ON study_subjects (course_id);

-- 3) Optional FK (can fail on some hosts); you may omit it if needed
ALTER TABLE study_subjects
  ADD CONSTRAINT fk_subjects_course FOREIGN KEY (course_id)
  REFERENCES study_courses (id)
  ON DELETE SET NULL;
