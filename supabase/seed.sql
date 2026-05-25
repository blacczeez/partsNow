-- ============================================
-- SEED DATA: Clusters
-- ============================================

INSERT INTO clusters (id, name, city, state, latitude, longitude, delivery_radius_km) VALUES
  ('c1000000-0000-0000-0000-000000000001', 'Lagos-Ladipo', 'Lagos', 'Lagos', 6.5244, 3.3417, 15),
  ('c1000000-0000-0000-0000-000000000002', 'Lagos-ASPAMDA', 'Lagos', 'Lagos', 6.4541, 3.2815, 15);

-- ============================================
-- SEED DATA: Parts (60 across 10 categories)
-- ============================================

-- Brakes (6 parts)
INSERT INTO parts (name, category, subcategory, oem_code, average_price, weight_kg, compatible_vehicles) VALUES
  ('Front Brake Pad Set', 'Brakes', 'Pads', 'BP-TY-001', 12000, 1.2, '[{"make":"Toyota","model":"Camry","year_start":2012,"year_end":2024},{"make":"Toyota","model":"Corolla","year_start":2014,"year_end":2024}]'::jsonb),
  ('Rear Brake Pad Set', 'Brakes', 'Pads', 'BP-TY-002', 10000, 1.0, '[{"make":"Toyota","model":"Camry","year_start":2012,"year_end":2024}]'::jsonb),
  ('Front Brake Disc Rotor', 'Brakes', 'Rotors', 'BR-TY-001', 18000, 4.5, '[{"make":"Toyota","model":"Camry","year_start":2012,"year_end":2024}]'::jsonb),
  ('Brake Master Cylinder', 'Brakes', 'Cylinders', 'BM-HN-001', 25000, 2.0, '[{"make":"Honda","model":"Accord","year_start":2013,"year_end":2023}]'::jsonb),
  ('Brake Caliper Assembly', 'Brakes', 'Calipers', 'BC-HN-001', 35000, 3.5, '[{"make":"Honda","model":"Civic","year_start":2016,"year_end":2024}]'::jsonb),
  ('Brake Fluid DOT 4', 'Brakes', 'Fluids', 'BF-UNI-001', 3500, 0.5, '[{"make":"Toyota","model":"Camry","year_start":2000,"year_end":2024},{"make":"Honda","model":"Accord","year_start":2000,"year_end":2024}]'::jsonb);

-- Engine (7 parts)
INSERT INTO parts (name, category, subcategory, oem_code, average_price, weight_kg, compatible_vehicles) VALUES
  ('Engine Oil Filter', 'Engine', 'Filters', 'EF-TY-001', 3000, 0.3, '[{"make":"Toyota","model":"Camry","year_start":2012,"year_end":2024},{"make":"Toyota","model":"Corolla","year_start":2014,"year_end":2024}]'::jsonb),
  ('Air Filter Element', 'Engine', 'Filters', 'AF-TY-001', 5000, 0.4, '[{"make":"Toyota","model":"Camry","year_start":2012,"year_end":2024}]'::jsonb),
  ('Spark Plug Set (4pc)', 'Engine', 'Ignition', 'SP-TY-001', 8000, 0.2, '[{"make":"Toyota","model":"Corolla","year_start":2014,"year_end":2024}]'::jsonb),
  ('Timing Belt Kit', 'Engine', 'Belts', 'TB-HN-001', 22000, 1.5, '[{"make":"Honda","model":"Accord","year_start":2013,"year_end":2020}]'::jsonb),
  ('Valve Cover Gasket', 'Engine', 'Gaskets', 'VG-TY-001', 6500, 0.2, '[{"make":"Toyota","model":"Camry","year_start":2012,"year_end":2024}]'::jsonb),
  ('Engine Mount', 'Engine', 'Mounts', 'EM-HN-001', 15000, 2.0, '[{"make":"Honda","model":"Civic","year_start":2016,"year_end":2024}]'::jsonb),
  ('Serpentine Belt', 'Engine', 'Belts', 'SB-MB-001', 12000, 0.5, '[{"make":"Mercedes","model":"C-Class","year_start":2015,"year_end":2023}]'::jsonb);

-- Battery (5 parts)
INSERT INTO parts (name, category, subcategory, oem_code, average_price, weight_kg, compatible_vehicles) VALUES
  ('Car Battery 75Ah', 'Battery', 'Batteries', 'BT-UNI-001', 45000, 18.0, '[{"make":"Toyota","model":"Camry","year_start":2012,"year_end":2024},{"make":"Honda","model":"Accord","year_start":2013,"year_end":2023}]'::jsonb),
  ('Car Battery 60Ah', 'Battery', 'Batteries', 'BT-UNI-002', 35000, 15.0, '[{"make":"Toyota","model":"Corolla","year_start":2014,"year_end":2024},{"make":"Honda","model":"Civic","year_start":2016,"year_end":2024}]'::jsonb),
  ('Battery Terminal Connector', 'Battery', 'Accessories', 'BTC-UNI-001', 2000, 0.1, '[{"make":"Toyota","model":"Camry","year_start":2000,"year_end":2024}]'::jsonb),
  ('Battery Hold Down Clamp', 'Battery', 'Accessories', 'BHD-UNI-001', 1500, 0.3, '[{"make":"Toyota","model":"Camry","year_start":2000,"year_end":2024}]'::jsonb),
  ('Car Battery 100Ah (SUV)', 'Battery', 'Batteries', 'BT-UNI-003', 65000, 25.0, '[{"make":"Mercedes","model":"GLE","year_start":2015,"year_end":2023}]'::jsonb);

-- Suspension (6 parts)
INSERT INTO parts (name, category, subcategory, oem_code, average_price, weight_kg, compatible_vehicles) VALUES
  ('Front Shock Absorber', 'Suspension', 'Shocks', 'SA-TY-001', 18000, 3.0, '[{"make":"Toyota","model":"Camry","year_start":2012,"year_end":2024}]'::jsonb),
  ('Rear Shock Absorber', 'Suspension', 'Shocks', 'SA-TY-002', 15000, 2.5, '[{"make":"Toyota","model":"Camry","year_start":2012,"year_end":2024}]'::jsonb),
  ('Front Coil Spring', 'Suspension', 'Springs', 'CS-HN-001', 12000, 3.5, '[{"make":"Honda","model":"Accord","year_start":2013,"year_end":2023}]'::jsonb),
  ('Stabilizer Link', 'Suspension', 'Links', 'SL-TY-001', 8000, 0.8, '[{"make":"Toyota","model":"Corolla","year_start":2014,"year_end":2024}]'::jsonb),
  ('Ball Joint (Lower)', 'Suspension', 'Joints', 'BJ-HN-001', 10000, 1.0, '[{"make":"Honda","model":"Civic","year_start":2016,"year_end":2024}]'::jsonb),
  ('Tie Rod End', 'Suspension', 'Steering', 'TR-MB-001', 14000, 0.8, '[{"make":"Mercedes","model":"C-Class","year_start":2015,"year_end":2023}]'::jsonb);

-- Electrical (6 parts)
INSERT INTO parts (name, category, subcategory, oem_code, average_price, weight_kg, compatible_vehicles) VALUES
  ('Alternator', 'Electrical', 'Charging', 'AL-TY-001', 45000, 5.0, '[{"make":"Toyota","model":"Camry","year_start":2012,"year_end":2024}]'::jsonb),
  ('Starter Motor', 'Electrical', 'Starting', 'SM-HN-001', 38000, 4.0, '[{"make":"Honda","model":"Accord","year_start":2013,"year_end":2023}]'::jsonb),
  ('Headlight Bulb H7', 'Electrical', 'Lighting', 'HB-UNI-001', 2500, 0.1, '[{"make":"Toyota","model":"Camry","year_start":2012,"year_end":2024},{"make":"Honda","model":"Accord","year_start":2013,"year_end":2023}]'::jsonb),
  ('Ignition Coil', 'Electrical', 'Ignition', 'IC-TY-001', 12000, 0.5, '[{"make":"Toyota","model":"Corolla","year_start":2014,"year_end":2024}]'::jsonb),
  ('Oxygen Sensor', 'Electrical', 'Sensors', 'OS-HN-001', 18000, 0.3, '[{"make":"Honda","model":"Civic","year_start":2016,"year_end":2024}]'::jsonb),
  ('Fuse Box Assembly', 'Electrical', 'Fuses', 'FB-MB-001', 25000, 0.5, '[{"make":"Mercedes","model":"C-Class","year_start":2015,"year_end":2023}]'::jsonb);

-- Body (6 parts)
INSERT INTO parts (name, category, subcategory, oem_code, average_price, weight_kg, compatible_vehicles) VALUES
  ('Side Mirror (Left)', 'Body', 'Mirrors', 'ML-TY-001', 22000, 1.5, '[{"make":"Toyota","model":"Camry","year_start":2012,"year_end":2024}]'::jsonb),
  ('Side Mirror (Right)', 'Body', 'Mirrors', 'MR-TY-001', 22000, 1.5, '[{"make":"Toyota","model":"Camry","year_start":2012,"year_end":2024}]'::jsonb),
  ('Front Bumper Cover', 'Body', 'Bumpers', 'FBC-HN-001', 45000, 4.0, '[{"make":"Honda","model":"Civic","year_start":2016,"year_end":2024}]'::jsonb),
  ('Door Handle (Exterior)', 'Body', 'Handles', 'DH-TY-001', 8000, 0.3, '[{"make":"Toyota","model":"Corolla","year_start":2014,"year_end":2024}]'::jsonb),
  ('Windshield Wiper Blade Set', 'Body', 'Wipers', 'WB-UNI-001', 4500, 0.4, '[{"make":"Toyota","model":"Camry","year_start":2000,"year_end":2024},{"make":"Honda","model":"Accord","year_start":2000,"year_end":2024}]'::jsonb),
  ('Headlight Assembly', 'Body', 'Lighting', 'HA-MB-001', 85000, 3.0, '[{"make":"Mercedes","model":"C-Class","year_start":2015,"year_end":2023}]'::jsonb);

-- Transmission (6 parts)
INSERT INTO parts (name, category, subcategory, oem_code, average_price, weight_kg, compatible_vehicles) VALUES
  ('Transmission Filter Kit', 'Transmission', 'Filters', 'TF-TY-001', 8000, 0.5, '[{"make":"Toyota","model":"Camry","year_start":2012,"year_end":2024}]'::jsonb),
  ('ATF Transmission Fluid 4L', 'Transmission', 'Fluids', 'TFL-UNI-001', 12000, 4.0, '[{"make":"Toyota","model":"Camry","year_start":2012,"year_end":2024},{"make":"Honda","model":"Accord","year_start":2013,"year_end":2023}]'::jsonb),
  ('CV Axle Shaft (Left)', 'Transmission', 'Axles', 'CVL-HN-001', 28000, 3.5, '[{"make":"Honda","model":"Accord","year_start":2013,"year_end":2023}]'::jsonb),
  ('CV Axle Shaft (Right)', 'Transmission', 'Axles', 'CVR-HN-001', 28000, 3.5, '[{"make":"Honda","model":"Accord","year_start":2013,"year_end":2023}]'::jsonb),
  ('Clutch Kit (Manual)', 'Transmission', 'Clutch', 'CK-TY-001', 35000, 5.0, '[{"make":"Toyota","model":"Corolla","year_start":2014,"year_end":2024}]'::jsonb),
  ('Gear Shift Cable', 'Transmission', 'Cables', 'GS-MB-001', 18000, 0.8, '[{"make":"Mercedes","model":"C-Class","year_start":2015,"year_end":2023}]'::jsonb);

-- Cooling (6 parts)
INSERT INTO parts (name, category, subcategory, oem_code, average_price, weight_kg, compatible_vehicles) VALUES
  ('Radiator Assembly', 'Cooling', 'Radiators', 'RA-TY-001', 35000, 6.0, '[{"make":"Toyota","model":"Camry","year_start":2012,"year_end":2024}]'::jsonb),
  ('Thermostat', 'Cooling', 'Thermostats', 'TH-HN-001', 5000, 0.2, '[{"make":"Honda","model":"Accord","year_start":2013,"year_end":2023}]'::jsonb),
  ('Water Pump', 'Cooling', 'Pumps', 'WP-TY-001', 15000, 2.0, '[{"make":"Toyota","model":"Corolla","year_start":2014,"year_end":2024}]'::jsonb),
  ('Coolant Hose (Upper)', 'Cooling', 'Hoses', 'CH-TY-001', 4000, 0.5, '[{"make":"Toyota","model":"Camry","year_start":2012,"year_end":2024}]'::jsonb),
  ('Radiator Fan Motor', 'Cooling', 'Fans', 'RF-HN-001', 22000, 2.5, '[{"make":"Honda","model":"Civic","year_start":2016,"year_end":2024}]'::jsonb),
  ('Coolant Reservoir Tank', 'Cooling', 'Tanks', 'CRT-MB-001', 12000, 0.8, '[{"make":"Mercedes","model":"C-Class","year_start":2015,"year_end":2023}]'::jsonb);

-- Exhaust (6 parts)
INSERT INTO parts (name, category, subcategory, oem_code, average_price, weight_kg, compatible_vehicles) VALUES
  ('Catalytic Converter', 'Exhaust', 'Converters', 'CC-TY-001', 65000, 5.0, '[{"make":"Toyota","model":"Camry","year_start":2012,"year_end":2024}]'::jsonb),
  ('Exhaust Muffler', 'Exhaust', 'Mufflers', 'EM-HN-001', 28000, 4.0, '[{"make":"Honda","model":"Accord","year_start":2013,"year_end":2023}]'::jsonb),
  ('Exhaust Manifold Gasket', 'Exhaust', 'Gaskets', 'EG-TY-001', 4500, 0.2, '[{"make":"Toyota","model":"Corolla","year_start":2014,"year_end":2024}]'::jsonb),
  ('Exhaust Pipe', 'Exhaust', 'Pipes', 'EP-TY-001', 15000, 3.0, '[{"make":"Toyota","model":"Camry","year_start":2012,"year_end":2024}]'::jsonb),
  ('EGR Valve', 'Exhaust', 'Valves', 'EV-HN-001', 32000, 1.0, '[{"make":"Honda","model":"Civic","year_start":2016,"year_end":2024}]'::jsonb),
  ('Exhaust Clamp Set', 'Exhaust', 'Clamps', 'EC-UNI-001', 2000, 0.3, '[{"make":"Toyota","model":"Camry","year_start":2000,"year_end":2024}]'::jsonb);

-- Interior (6 parts)
INSERT INTO parts (name, category, subcategory, oem_code, average_price, weight_kg, compatible_vehicles) VALUES
  ('Cabin Air Filter', 'Interior', 'Filters', 'CF-TY-001', 4000, 0.2, '[{"make":"Toyota","model":"Camry","year_start":2012,"year_end":2024},{"make":"Toyota","model":"Corolla","year_start":2014,"year_end":2024}]'::jsonb),
  ('Blower Motor', 'Interior', 'HVAC', 'BM-HN-001', 18000, 1.5, '[{"make":"Honda","model":"Accord","year_start":2013,"year_end":2023}]'::jsonb),
  ('Power Window Motor', 'Interior', 'Windows', 'PW-TY-001', 15000, 1.0, '[{"make":"Toyota","model":"Camry","year_start":2012,"year_end":2024}]'::jsonb),
  ('Door Lock Actuator', 'Interior', 'Locks', 'DL-HN-001', 12000, 0.5, '[{"make":"Honda","model":"Civic","year_start":2016,"year_end":2024}]'::jsonb),
  ('Dashboard Light Bulb Set', 'Interior', 'Lighting', 'DB-UNI-001', 2500, 0.1, '[{"make":"Toyota","model":"Camry","year_start":2000,"year_end":2024}]'::jsonb),
  ('Steering Wheel Cover', 'Interior', 'Accessories', 'SW-UNI-001', 5000, 0.3, '[{"make":"Toyota","model":"Camry","year_start":2000,"year_end":2024},{"make":"Honda","model":"Accord","year_start":2000,"year_end":2024}]'::jsonb);

-- ============================================
-- SEED DATA: Vendors
-- ============================================

INSERT INTO vendors (cluster_id, name, contact_phone, contact_name, location_in_market, specializations, payment_terms) VALUES
  ('c1000000-0000-0000-0000-000000000001', 'Ade Auto Parts', '2348012345678', 'Ade', 'Line 3, Shop 15', ARRAY['Toyota', 'Honda'], 'cash'),
  ('c1000000-0000-0000-0000-000000000001', 'Chidi German Parts', '2348023456789', 'Chidi', 'Line 7, Shop 42', ARRAY['Mercedes', 'BMW', 'Audi'], 'cash'),
  ('c1000000-0000-0000-0000-000000000001', 'Emeka General Auto', '2348034567890', 'Emeka', 'Line 1, Shop 8', ARRAY['Toyota', 'Honda', 'Nissan'], 'float'),
  ('c1000000-0000-0000-0000-000000000002', 'Bola Car Parts', '2348045678901', 'Bola', 'Block A, Shop 5', ARRAY['Toyota', 'Honda'], 'cash'),
  ('c1000000-0000-0000-0000-000000000002', 'Hassan Motors', '2348056789012', 'Hassan', 'Block C, Shop 22', ARRAY['Mercedes', 'Toyota'], 'cash');
