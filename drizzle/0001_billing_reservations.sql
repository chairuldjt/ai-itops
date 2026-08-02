CREATE TABLE "billing_reservation" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"api_key_id" text NOT NULL,
	"reserved_micro_usd" bigint NOT NULL,
	"actual_micro_usd" bigint,
	"usage_log_id" text,
	"finalized_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "billing_reservation" ADD CONSTRAINT "billing_reservation_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_reservation" ADD CONSTRAINT "billing_reservation_api_key_id_api_key_id_fk" FOREIGN KEY ("api_key_id") REFERENCES "public"."api_key"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_reservation" ADD CONSTRAINT "billing_reservation_usage_log_id_usage_log_id_fk" FOREIGN KEY ("usage_log_id") REFERENCES "public"."usage_log"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "billing_reservation_user_idx" ON "billing_reservation" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "billing_reservation_api_key_idx" ON "billing_reservation" USING btree ("api_key_id");