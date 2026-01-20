CREATE TABLE IF NOT EXISTS course_holes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    course_id INTEGER NOT NULL,
    tee_set TEXT NOT NULL, -- e.g. "Mens", "Ladies", "Pro"
    hole_number INTEGER NOT NULL,
    par INTEGER NOT NULL,
    handicap INTEGER NOT NULL,
    yardage INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (course_id) REFERENCES courses (id)
);

CREATE INDEX IF NOT EXISTS idx_course_holes_course_tee ON course_holes (course_id, tee_set);
CREATE UNIQUE INDEX IF NOT EXISTS idx_course_holes_unique ON course_holes (course_id, tee_set, hole_number);
