-- Data-free enum baseline. ADMIN remains a legacy enum label only; membership CHECK allows OWNER/OPERATOR.
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;
DO $om_type$ BEGIN CREATE TYPE "public"."MembershipRole" AS ENUM ('OWNER','ADMIN','OPERATOR'); EXCEPTION WHEN duplicate_object THEN NULL; END $om_type$;
DO $om_type$ BEGIN CREATE TYPE "public"."MembershipStatus" AS ENUM ('ACTIVE','INVITED','SUSPENDED','REVOKED'); EXCEPTION WHEN duplicate_object THEN NULL; END $om_type$;
DO $om_type$ BEGIN CREATE TYPE "public"."ProductCategory" AS ENUM ('PASTELARIA','PADARIA','SALGADOS','ALMOÇO'); EXCEPTION WHEN duplicate_object THEN NULL; END $om_type$;
DO $om_type$ BEGIN CREATE TYPE "public"."QuantityUnit" AS ENUM ('UN','KG','G'); EXCEPTION WHEN duplicate_object THEN NULL; END $om_type$;
DO $om_type$ BEGIN CREATE TYPE "public"."TenantStatus" AS ENUM ('ACTIVE','SUSPENDED','ARCHIVED'); EXCEPTION WHEN duplicate_object THEN NULL; END $om_type$;
DO $om_type$ BEGIN CREATE TYPE "public"."UserStatus" AS ENUM ('ACTIVE','DISABLED'); EXCEPTION WHEN duplicate_object THEN NULL; END $om_type$;
ALTER TYPE public."MembershipRole" ADD VALUE IF NOT EXISTS 'ADMIN' BEFORE 'OPERATOR';
