-- Add course_tees_id to tournament_rounds to fix duplicate holes issue
-- This links rounds to specific tee sets so we only fetch holes for that tee

-- Add the column as nullable (existing data will be NULL)
ALTER TABLE tournament_rounds ADD COLUMN course_tees_id INTEGER;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_tournament_rounds_course_tees ON tournament_rounds (course_tees_id);

-- Note: Existing rounds will have NULL course_tees_id and need manual fixing
-- New rounds must specify course_tees_id