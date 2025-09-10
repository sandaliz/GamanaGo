SET search_path TO fare_optimizer;

TRUNCATE TABLE fares_train RESTART IDENTITY;

INSERT INTO fares_train (from_station, to_station, distance_km, fare_rs) VALUES
  ('Colombo', 'Kandy', 115, 230),
  ('Colombo', 'Galle', 116, 220),
  ('Colombo', 'Matara', 160, 320),
  ('Kandy', 'Badulla', 160, 340);