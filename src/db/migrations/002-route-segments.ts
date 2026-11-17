export const routeSegments = `
ALTER TABLE gps_points ADD COLUMN starts_segment INTEGER NOT NULL DEFAULT 0
  CHECK (starts_segment IN (0, 1));
`;
