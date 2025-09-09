-- db/schemas/fare_optimizer/fares.sql
CREATE SCHEMA IF NOT EXISTS fare_optimizer;
SET search_path TO fare_optimizer;

-- Bus fare slabs
CREATE TABLE IF NOT EXISTS fares_bus (
  id SERIAL PRIMARY KEY,
  min_km INT NOT NULL,
  max_km INT NOT NULL,
  fare_rs INT NOT NULL
);

-- Train fare station pairs
CREATE TABLE IF NOT EXISTS fares_train (
  id SERIAL PRIMARY KEY,
  from_station TEXT NOT NULL,
  to_station TEXT NOT NULL,
  distance_km INT,
  fare_rs INT NOT NULL
);