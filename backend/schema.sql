-- MicroVault Database Schema (Updated for Real Data)
-- PostgreSQL

-- Drop existing tables (if updating)
DROP TABLE IF EXISTS growth_data CASCADE;
DROP TABLE IF EXISTS experiments CASCADE;
DROP TABLE IF EXISTS strains CASCADE;
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Users table (unchanged)
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'researcher', 'technician')),
  biosafety_clearance INT CHECK (biosafety_clearance BETWEEN 1 AND 4),
  lab_affiliation VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE users ADD COLUMN deleted_at TIMESTAMP NULL;
-- Strains table (UPDATED to match Excel structure)
CREATE TABLE strains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Basic identification
  strain_code VARCHAR(100) UNIQUE NOT NULL,
  microorganism_type VARCHAR(50) NOT NULL CHECK (microorganism_type IN ('BAKTERI', 'YEAST', 'KAPANG', 'ACTINOMYCETES')),
  genus_species VARCHAR(255),
  genus VARCHAR(100),
  species VARCHAR(100),
  
  -- Sample information
  sample_type VARCHAR(100),
  origin_location TEXT,
  isolation_date DATE,
  
  -- Characteristics (from Excel)
  characteristics_macroscopic TEXT,
  characteristics_microscopic TEXT,
  characteristics_biochemical TEXT,
  
  -- Potential/Activities (from Excel "Potensi")
  potential_nitrogen_fixer BOOLEAN DEFAULT FALSE,
  potential_phosphate_solubilizer BOOLEAN DEFAULT FALSE,
  potential_proteolytic BOOLEAN DEFAULT FALSE,
  potential_lipolytic BOOLEAN DEFAULT FALSE,
  potential_amylolytic BOOLEAN DEFAULT FALSE,
  potential_cellulolytic BOOLEAN DEFAULT FALSE,
  potential_antimicrobial BOOLEAN DEFAULT FALSE,
  potential_iaa_hormone BOOLEAN DEFAULT FALSE,
  
  -- Storage information
  storage_technique TEXT,
  culture_stock TEXT,
  storage_location VARCHAR(100),
  
  -- Optional advanced info
  biosafety_level INT DEFAULT 1 CHECK (biosafety_level BETWEEN 1 AND 4),
  genome_sequenced BOOLEAN DEFAULT FALSE,
  genbank_accession VARCHAR(50),
  
  -- JSONB for flexible additional data
  additional_notes JSONB,
  
  -- System fields
  created_by INT REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP
);

-- Experiments table
CREATE TABLE experiments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  strain_id UUID REFERENCES strains(id) ON DELETE CASCADE,
  experiment_type VARCHAR(100) NOT NULL,
  description TEXT,
  conditions JSONB,
  start_date TIMESTAMP,
  end_date TIMESTAMP,
  researcher_id INT REFERENCES users(id),
  status VARCHAR(50) CHECK (status IN ('ongoing', 'completed', 'contaminated', 'failed')),
  results JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Growth data table
CREATE TABLE growth_data (
  id SERIAL PRIMARY KEY,
  experiment_id UUID REFERENCES experiments(id) ON DELETE CASCADE,
  time_hours DECIMAL(10,2),
  od600 DECIMAL(10,4),
  cfu_ml BIGINT,
  temperature DECIMAL(5,2),
  ph DECIMAL(4,2),
  notes TEXT,
  measured_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Audit logs
CREATE TABLE audit_logs (
  id SERIAL PRIMARY KEY,
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(50),
  resource_id VARCHAR(255),
  user_id INT REFERENCES users(id),
  ip_address VARCHAR(45),
  user_agent TEXT,
  details JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_strains_code ON strains(strain_code);
CREATE INDEX idx_strains_type ON strains(microorganism_type);
CREATE INDEX idx_strains_genus ON strains(genus);
CREATE INDEX idx_strains_sample_type ON strains(sample_type);
CREATE INDEX idx_strains_biosafety ON strains(biosafety_level);
CREATE INDEX idx_strains_deleted ON strains(deleted_at);
CREATE INDEX idx_strains_nitrogen ON strains(potential_nitrogen_fixer) WHERE potential_nitrogen_fixer = TRUE;
CREATE INDEX idx_strains_phosphate ON strains(potential_phosphate_solubilizer) WHERE potential_phosphate_solubilizer = TRUE;
CREATE INDEX idx_strains_proteolytic ON strains(potential_proteolytic) WHERE potential_proteolytic = TRUE;
CREATE INDEX idx_strains_cellulolytic ON strains(potential_cellulolytic) WHERE potential_cellulolytic = TRUE;

CREATE INDEX idx_experiments_strain ON experiments(strain_id);
CREATE INDEX idx_experiments_researcher ON experiments(researcher_id);
CREATE INDEX idx_growth_experiment ON growth_data(experiment_id);

CREATE INDEX idx_audit_user ON audit_logs(user_id);
CREATE INDEX idx_audit_time ON audit_logs(created_at);

-- Sample users
INSERT INTO users (email, password_hash, full_name, role, biosafety_clearance) VALUES
('admin@lab.com', '$2b$10$dummy.hash.for.now', 'Admin User', 'admin', 4),
('researcher@lab.com', '$2b$10$dummy.hash.for.now', 'Dr. Sarah Chen', 'researcher', 3),
('tech@lab.com', '$2b$10$dummy.hash.for.now', 'Lab Technician Budi', 'technician', 2);