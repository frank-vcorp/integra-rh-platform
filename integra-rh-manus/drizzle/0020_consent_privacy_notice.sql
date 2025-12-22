-- Add consent tracking fields to candidates table
-- Tracks whether candidate accepted privacy notice and when
ALTER TABLE `candidates`
ADD COLUMN `aceptoAvisoPrivacidad` boolean DEFAULT false NOT NULL AFTER `selfFilledReviewedAt`,
ADD COLUMN `aceptoAvisoPrivacidadAt` timestamp NULL AFTER `aceptoAvisoPrivacidad`;
