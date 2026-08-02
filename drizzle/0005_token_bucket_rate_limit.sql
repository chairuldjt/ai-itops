CREATE TABLE "api_rate_limit_bucket" (
	"api_key_id" text PRIMARY KEY NOT NULL,
	"tokens" integer NOT NULL,
	"refill_remainder" bigint DEFAULT 0 NOT NULL,
	"refilled_at" timestamp with time zone NOT NULL,
	CONSTRAINT "api_rate_limit_bucket_tokens_nonnegative" CHECK ("api_rate_limit_bucket"."tokens" >= 0)
);
--> statement-breakpoint
ALTER TABLE "api_rate_limit_bucket" ADD CONSTRAINT "api_rate_limit_bucket_api_key_id_api_key_id_fk" FOREIGN KEY ("api_key_id") REFERENCES "public"."api_key"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
DROP TABLE "api_rate_limit_window";
