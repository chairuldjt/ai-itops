"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { adminTopUp } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";

const Schema = z.object({
  userId: z.string().min(1, "Select a user"),
  amountUsd: z.coerce.number().positive("Amount must be > 0"),
  note: z.string().optional(),
});

export function TopUpForm({
  users,
}: {
  users: { id: string; name: string; email: string }[];
}) {
  const form = useForm<z.infer<typeof Schema>>({
    resolver: zodResolver(Schema) as never,
    defaultValues: { userId: "", amountUsd: 10, note: "" },
  });

  const onSubmit = async (v: z.infer<typeof Schema>) => {
    const res = await adminTopUp(v);
    if (res.ok) {
      toast.success(`Top-up successful. New balance: $${res.newBalance?.toFixed(2)}`);
      form.reset({ amountUsd: 10, note: "" });
    } else {
      toast.error("Failed: " + JSON.stringify((res as { error?: unknown }).error));
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Manual top-up</CardTitle>
        <CardDescription>
          Add credit to a user. The transaction is logged for audit.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <FieldGroup>
            <Field>
              <FieldLabel>User</FieldLabel>
              <Select
                value={form.watch("userId") || ""}
                onValueChange={(v) => form.setValue("userId", v ?? "")}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pick a user…" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name} ({u.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel>Amount (USD)</FieldLabel>
              <Input type="number" step="0.01" {...form.register("amountUsd")} />
            </Field>
            <Field>
              <FieldLabel>Note (optional)</FieldLabel>
              <Textarea {...form.register("note")} placeholder="Top-up for…" />
            </Field>
          </FieldGroup>
          <Button type="submit" className="w-full">Top up</Button>
        </form>
      </CardContent>
    </Card>
  );
}
