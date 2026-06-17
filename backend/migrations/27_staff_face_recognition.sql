-- 27_staff_face_recognition.sql
-- Add fields to track face recognition registration status for staff.

ALTER TABLE staff ADD COLUMN IF NOT EXISTS face_registered BOOLEAN DEFAULT FALSE;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS face_updated_at TIMESTAMPTZ;

-- Add index for potential future optimization if searching by face_id
CREATE INDEX IF NOT EXISTS idx_staff_face_registered ON staff(face_registered) WHERE face_registered = TRUE;
