-- =====================================================================
-- OPTIONAL: Create a fresh PostgreSQL database.
-- Run this while connected to postgres/template1, NOT inside the target DB.
-- Example:
--   psql postgresql://user:password@host:5432/postgres -v db_name=pos_crm_new -f 00_CREATE_DATABASE_OPTIONAL.sql
-- =====================================================================
\set ON_ERROR_STOP on
\if :{?db_name}
\else
\set db_name pos_crm_new
\endif
CREATE DATABASE :"db_name" ENCODING 'UTF8' TEMPLATE template0;
