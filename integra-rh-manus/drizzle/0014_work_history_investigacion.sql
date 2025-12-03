ALTER TABLE workHistory ADD estatusInvestigacion enum('en_revision','revisado','terminado') NOT NULL DEFAULT 'en_revision';
--> statement-breakpoint
ALTER TABLE workHistory ADD comentarioInvestigacion text;

