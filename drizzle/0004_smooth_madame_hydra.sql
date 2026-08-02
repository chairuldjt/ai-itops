CREATE TABLE "api_rate_limit_window" (
	"api_key_id" text NOT NULL,
	"window_start" timestamp with time zone NOT NULL,
	"request_count" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "api_rate_limit_window_count_positive" CHECK ("api_rate_limit_window"."request_count" > 0)
);
--> statement-breakpoint
ALTER TABLE "api_rate_limit_window" ADD CONSTRAINT "api_rate_limit_window_api_key_id_api_key_id_fk" FOREIGN KEY ("api_key_id") REFERENCES "public"."api_key"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "api_rate_limit_window_key_start_idx" ON "api_rate_limit_window" USING btree ("api_key_id","window_start");--> statement-breakpoint
CREATE INDEX "api_rate_limit_window_start_idx" ON "api_rate_limit_window" USING btree ("window_start");