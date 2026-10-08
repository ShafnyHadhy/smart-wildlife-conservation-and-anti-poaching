-- ============================================================================
-- 002: UC04 conflict report workflow (photos, status timeline, ranger triage)
-- Idempotent: safe to run repeatedly.
-- ============================================================================
ALTER TABLE conflict_reports ADD COLUMN IF NOT EXISTS location_name VARCHAR(255);
ALTER TABLE conflict_reports ADD COLUMN IF NOT EXISTS immediate_risk BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE conflict_reports ADD COLUMN IF NOT EXISTS animals_involved INTEGER;
ALTER TABLE conflict_reports ADD COLUMN IF NOT EXISTS photo_urls JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE conflict_reports ADD COLUMN IF NOT EXISTS status_history JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE conflict_reports ADD COLUMN IF NOT EXISTS severity VARCHAR(10) NOT NULL DEFAULT 'MEDIUM';
ALTER TABLE conflict_reports ADD COLUMN IF NOT EXISTS triage_notes TEXT;
ALTER TABLE conflict_reports ADD COLUMN IF NOT EXISTS mitigation_action TEXT;
ALTER TABLE conflict_reports ADD COLUMN IF NOT EXISTS handled_by_name VARCHAR(150);
ALTER TABLE conflict_reports ADD COLUMN IF NOT EXISTS potential_duplicate_of UUID;
ALTER TABLE conflict_reports ADD COLUMN IF NOT EXISTS distance_to_duplicate_km NUMERIC(8, 3);
ALTER TABLE conflict_reports ADD COLUMN IF NOT EXISTS estimated_damage_lkr NUMERIC(14, 2);
ALTER TABLE conflict_reports ADD COLUMN IF NOT EXISTS crop_type_lost VARCHAR(150);
ALTER TABLE conflict_reports ADD COLUMN IF NOT EXISTS compensation_status VARCHAR(20);
