-- Add USGA Course Rating and Slope Rating to course_tees
ALTER TABLE course_tees ADD COLUMN rating REAL DEFAULT 72.0;
ALTER TABLE course_tees ADD COLUMN slope INTEGER DEFAULT 113;
