-- Schema for Foresight CDSS MVP
-- run this in Supabase SQL editor once

create extension if not exists "pgcrypto";

create table if not exists public.patients (
  id uuid primary key default gen_random_uuid(),
  patient_id text unique not null,
  name text,
  gender text,
  dob date,
  photo_url text,
  extra_data jsonb,
  created_at timestamp with time zone default now()
);

-- visits/admissions per patient
create table if not exists public.visits (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid references public.patients(id) on delete cascade,
  admission_id text unique,
  admission_type text,
  started_at timestamp with time zone,
  discharge_time timestamp with time zone,
  transcript text,
  extra_data jsonb,
  created_at timestamp with time zone default now()
);

-- transcripts table (optional, separate from visits.transcript field)
create table if not exists public.transcripts (
  id uuid primary key default gen_random_uuid(),
  visit_id uuid references public.visits(id) on delete cascade,
  text text,
  language text,
  created_at timestamp with time zone default now()
); 