-- Run this in pgAdmin (Query Tool) connected as the postgres superuser.
-- Creates the EasymatchBD database user and database for local PostgreSQL on port 5432.

CREATE USER easymatch WITH PASSWORD 'easymatch_dev';

CREATE DATABASE easymatch OWNER easymatch;

GRANT ALL PRIVILEGES ON DATABASE easymatch TO easymatch;

-- PostgreSQL 15+: allow schema access inside the database
\c easymatch
GRANT ALL ON SCHEMA public TO easymatch;
