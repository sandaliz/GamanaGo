SET search_path TO fare_optimizer;

TRUNCATE TABLE fares_bus RESTART IDENTITY;

INSERT INTO fares_bus (min_km, max_km, fare_rs) VALUES
  (0,4,30),
  (5,10,40),
  (11,20,60),
  (21,30,80),
  (31,50,120),
  (51,100,200),
  (101,9999,300);