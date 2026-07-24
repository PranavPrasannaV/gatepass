CREATE TYPE "public"."compliance_domain" AS ENUM('wcag', 'ccpa', 'app_store', 'google_play', 'eu_ai_act');--> statement-breakpoint
CREATE TYPE "public"."compliance_fix_kind" AS ENUM('diff', 'file_create', 'config_change', 'code_change');--> statement-breakpoint
CREATE TYPE "public"."compliance_severity" AS ENUM('critical', 'warning', 'info');--> statement-breakpoint
CREATE TYPE "public"."compliance_status" AS ENUM('pass', 'fail', 'not_applicable', 'manual_review');--> statement-breakpoint
CREATE TABLE "compliance_checks" (
	"id" text PRIMARY KEY NOT NULL,
	"compliance_scan_id" text NOT NULL,
	"rule_id" text NOT NULL,
	"domain" "compliance_domain" NOT NULL,
	"status" "compliance_status" NOT NULL,
	"severity" "compliance_severity" NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"locations" text,
	"fix_kind" "compliance_fix_kind",
	"fix_description" text,
	"fix_diff" text,
	"fix_file_path" text,
	"fix_new_content" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "compliance_scans" (
	"id" text PRIMARY KEY NOT NULL,
	"scan_id" text NOT NULL,
	"org_id" text NOT NULL,
	"score" integer NOT NULL,
	"total_checks" integer NOT NULL,
	"pass_count" integer NOT NULL,
	"fail_count" integer NOT NULL,
	"by_domain" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "compliance_checks" ADD CONSTRAINT "compliance_checks_compliance_scan_id_compliance_scans_id_fk" FOREIGN KEY ("compliance_scan_id") REFERENCES "public"."compliance_scans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "compliance_scans" ADD CONSTRAINT "compliance_scans_scan_id_scans_id_fk" FOREIGN KEY ("scan_id") REFERENCES "public"."scans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "compliance_scans" ADD CONSTRAINT "compliance_scans_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;