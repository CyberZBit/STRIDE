export const initialSchema = `
CREATE TABLE sessions (
  id TEXT PRIMARY KEY NOT NULL,
  started_at INTEGER NOT NULL,
  ended_at INTEGER CHECK (ended_at >= started_at),
  elapsed_duration INTEGER NOT NULL DEFAULT 0 CHECK (elapsed_duration >= 0),
  moving_duration INTEGER NOT NULL DEFAULT 0 CHECK (moving_duration BETWEEN 0 AND elapsed_duration),
  distance_meters REAL NOT NULL DEFAULT 0 CHECK (distance_meters >= 0),
  walking_distance_meters REAL NOT NULL DEFAULT 0 CHECK (walking_distance_meters BETWEEN 0 AND distance_meters),
  steps INTEGER CHECK (steps >= 0),
  average_speed REAL NOT NULL DEFAULT 0 CHECK (average_speed >= 0),
  maximum_speed REAL NOT NULL DEFAULT 0 CHECK (maximum_speed >= 0),
  status TEXT NOT NULL CHECK (status IN ('active', 'paused_manual', 'paused_auto', 'completed')),
  CHECK ((status = 'completed') = (ended_at IS NOT NULL))
);

CREATE INDEX sessions_by_status_and_start ON sessions (status, started_at DESC, id);
CREATE UNIQUE INDEX sessions_one_open ON sessions ((1)) WHERE status <> 'completed';

CREATE TABLE gps_points (
  id INTEGER PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES sessions (id) ON DELETE CASCADE,
  latitude REAL NOT NULL CHECK (latitude BETWEEN -90 AND 90),
  longitude REAL NOT NULL CHECK (longitude BETWEEN -180 AND 180),
  timestamp INTEGER NOT NULL,
  accuracy REAL CHECK (accuracy >= 0),
  speed REAL CHECK (speed >= 0),
  transportation_flag INTEGER NOT NULL DEFAULT 0 CHECK (transportation_flag IN (0, 1))
);

CREATE INDEX gps_points_by_session_and_time ON gps_points (session_id, timestamp, id);

CREATE TABLE transport_flags (
  id INTEGER PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES sessions (id) ON DELETE CASCADE,
  start_timestamp INTEGER NOT NULL,
  end_timestamp INTEGER NOT NULL CHECK (end_timestamp >= start_timestamp),
  distance_meters REAL NOT NULL CHECK (distance_meters >= 0),
  classification TEXT NOT NULL DEFAULT 'suspected'
    CHECK (classification IN ('suspected', 'walking', 'transportation')),
  reviewed INTEGER NOT NULL DEFAULT 0 CHECK (reviewed IN (0, 1)),
  CHECK ((classification = 'suspected') = (reviewed = 0))
);

CREATE INDEX transport_flags_by_session_and_start
  ON transport_flags (session_id, start_timestamp, id);

CREATE TABLE settings (
  key TEXT PRIMARY KEY NOT NULL,
  value TEXT NOT NULL
);

INSERT INTO settings (key, value) VALUES ('distance_unit', 'km');
`;
