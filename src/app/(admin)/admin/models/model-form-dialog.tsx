"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import type { Model } from "@/lib/db/schema";
import {
  createModel,
  updateModel,
  type ModelFormInput,
} from "./actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { PlusIcon } from "lucide-react";

const Schema = z.object({
  publicId: z.string().min(1),
  upstreamId: z.string().min(1),
  type: z.enum(["chat", "image", "tts", "stt", "embedding", "rerank"]),
  description: z.string().optional(),
  provider: z.string().optional(),
  pricing: z.object({
    per1MInput: z.coerce.number().min(0).optional(),
    per1MOutput: z.coerce.number().min(0).optional(),
    per1MCached: z.coerce.number().min(0).optional(),
    perUnit: z.coerce.number().min(0).optional(),
  }),
  capabilities: z.object({
    supportsImageInput: z.boolean(),
    supportsAudioInput: z.boolean(),
    supportsTools: z.boolean(),
    supportsJson: z.boolean(),
    supportsStreaming: z.boolean(),
    maxContextTokens: z.coerce.number().int().min(0).optional(),
  }),
  imagePolicy: z.enum(["strip_and_instruct", "canned_response", "reject_error"]),
  cannedResponseText: z.string().optional(),
  stripInstruction: z.string().optional(),
  enabled: z.boolean(),
  sortOrder: z.coerce.number().int().min(0),
  tags: z.array(z.string()),
});

export function ModelFormDialog({
  model,
  trigger,
}: {
  model?: Model;
  trigger?: React.ReactElement;
}) {
  const [open, setOpen] = React.useState(false);
  const isEdit = Boolean(model);

  const form = useForm<z.infer<typeof Schema>>({
    resolver: zodResolver(Schema) as never,
    defaultValues: model
      ? {
          publicId: model.publicId,
          upstreamId: model.upstreamId,
          type: model.type,
          description: model.description ?? "",
          provider: model.provider ?? "",
          pricing: {
            per1MInput: model.pricing?.per1MInput ?? 0,
            per1MOutput: model.pricing?.per1MOutput ?? 0,
            // Legacy rows stored split cache read/write rates — migrate them
            // into the single cached rate (read rate first, write as fallback).
            per1MCached:
              model.pricing?.per1MCached ??
              model.pricing?.per1MCacheRead ??
              model.pricing?.per1MCacheWrite ??
              0,
            perUnit: model.pricing?.perUnit ?? 0,
          },
          capabilities: {
            supportsImageInput: Boolean(model.capabilities?.supportsImageInput),
            supportsAudioInput: Boolean(model.capabilities?.supportsAudioInput),
            supportsTools: Boolean(model.capabilities?.supportsTools),
            supportsJson: Boolean(model.capabilities?.supportsJson),
            supportsStreaming: model.capabilities?.supportsStreaming ?? true,
            maxContextTokens: model.capabilities?.maxContextTokens ?? 0,
          },
          imagePolicy: model.imagePolicy,
          cannedResponseText: model.cannedResponseText ?? "",
          stripInstruction: model.stripInstruction ?? "",
          enabled: model.enabled,
          sortOrder: model.sortOrder,
          tags: model.tags ?? [],
        }
      : {
          publicId: "",
          upstreamId: "",
          type: "chat",
          description: "",
          provider: "",
          pricing: { per1MInput: 0, per1MOutput: 0, perUnit: 0 },
          capabilities: {
            supportsImageInput: false,
            supportsAudioInput: false,
            supportsTools: true,
            supportsJson: false,
            supportsStreaming: true,
          },
          imagePolicy: "strip_and_instruct",
          cannedResponseText: "",
          stripInstruction: "",
          enabled: true,
          sortOrder: 0,
          tags: [],
        },
  });

  const onSubmit = async (values: z.infer<typeof Schema>) => {
    const payload: ModelFormInput = {
      ...values,
      description: values.description || undefined,
      provider: values.provider || undefined,
      cannedResponseText: values.cannedResponseText || undefined,
      stripInstruction: values.stripInstruction || undefined,
    };
    const res = isEdit
      ? await updateModel(model!.id, payload)
      : await createModel(payload);
    if (res.ok) {
      toast.success(isEdit ? "Model updated" : "Model created");
      setOpen(false);
      form.reset();
    } else {
      toast.error(
        "Validation failed: " + JSON.stringify((res as { error?: unknown }).error),
      );
    }
  };

  const modelType = form.watch("type");
  const isTokenModel = modelType === "chat";
  const tagsStr = form.watch("tags").join(", ");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          trigger ?? (
            <Button>
              <PlusIcon className="size-4 mr-1" /> Add Model
            </Button>
          )
        }
      />
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Model" : "Add Model"}</DialogTitle>
          <DialogDescription>
            Configure the public model, pricing, capabilities, and how to
            handle unsupported inputs.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)}>
          <Tabs defaultValue="basic" className="mt-2">
            <TabsList className="max-w-full overflow-x-auto">
              <TabsTrigger value="basic">Basic</TabsTrigger>
              <TabsTrigger value="pricing">Pricing</TabsTrigger>
              <TabsTrigger value="capabilities">Capabilities</TabsTrigger>
              <TabsTrigger value="policy">Image Policy</TabsTrigger>
            </TabsList>

            <TabsContent value="basic">
              <FieldGroup className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                <Field>
                  <FieldLabel>Public ID (what users see)</FieldLabel>
                  <Input {...form.register("publicId")} placeholder="my-gpt-4o" />
                  <FieldDescription>e.g. my-gpt-4o, anthropic/claude-3.5-sonnet</FieldDescription>
                </Field>
                <Field>
                  <FieldLabel>Upstream model ID</FieldLabel>
                  <Input {...form.register("upstreamId")} placeholder="gpt-4o" />
                </Field>
                <Field>
                  <FieldLabel>Type</FieldLabel>
                  <Select
                    value={form.watch("type")}
                    onValueChange={(v) => form.setValue("type", v as ModelFormInput["type"])}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["chat", "image", "tts", "stt", "embedding", "rerank"].map((t) => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field>
                  <FieldLabel>Provider label</FieldLabel>
                  <Input {...form.register("provider")} placeholder="OpenAI" />
                </Field>
                <Field className="col-span-2">
                  <FieldLabel>Description</FieldLabel>
                  <Textarea {...form.register("description")} />
                </Field>
                <Field>
                  <FieldLabel>Sort order</FieldLabel>
                  <Input type="number" {...form.register("sortOrder")} />
                </Field>
                <Field>
                  <FieldLabel>Tags (comma-separated)</FieldLabel>
                  <Input
                    value={tagsStr}
                    onChange={(e) =>
                      form.setValue(
                        "tags",
                        e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                      )
                    }
                    placeholder="flagship, vision, fast"
                  />
                </Field>
                <Field className="flex flex-row items-center gap-3 col-span-2">
                  <Switch
                    checked={form.watch("enabled")}
                    onCheckedChange={(v) => form.setValue("enabled", v)}
                  />
                  <FieldLabel>Enabled (visible in /v1/models)</FieldLabel>
                </Field>
              </FieldGroup>
            </TabsContent>

            <TabsContent value="pricing">
              <FieldGroup className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                {isTokenModel ? (
                  <>
                    <Field>
                      <FieldLabel>Input ($/1M tokens)</FieldLabel>
                      <Input type="number" step="0.0001" {...form.register("pricing.per1MInput")} />
                    </Field>
                    <Field>
                      <FieldLabel>Output ($/1M tokens)</FieldLabel>
                      <Input type="number" step="0.0001" {...form.register("pricing.per1MOutput")} />
                    </Field>
                    <Field>
                      <FieldLabel>Cached tokens ($/1M tokens)</FieldLabel>
                      <Input type="number" step="0.0001" {...form.register("pricing.per1MCached")} />
                      <FieldDescription>
                        Prompt-cache hits (read &amp; write cache are billed together
                        as cached tokens).
                      </FieldDescription>
                    </Field>
                  </>
                ) : (
                  <Field className="col-span-2">
                    <FieldLabel>Per-unit price (per image/request/second)</FieldLabel>
                    <Input type="number" step="0.0001" {...form.register("pricing.perUnit")} />
                  </Field>
                )}
              </FieldGroup>
            </TabsContent>

            <TabsContent value="capabilities">
              <FieldGroup className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                {[
                  ["supportsImageInput", "Vision (image input)"],
                  ["supportsAudioInput", "Audio input"],
                  ["supportsTools", "Tools / Function calling"],
                  ["supportsJson", "JSON mode"],
                  ["supportsStreaming", "Streaming"],
                ].map(([k, label]) => (
                  <Field key={k} className="flex flex-row items-center gap-3">
                    <Switch
                      checked={Boolean(
                        form.watch(`capabilities.${k as "supportsImageInput"}`),
                      )}
                      onCheckedChange={(v) =>
                        form.setValue(
                          `capabilities.${k as "supportsImageInput"}`,
                          v as never,
                        )
                      }
                    />
                    <FieldLabel>{label}</FieldLabel>
                  </Field>
                ))}
                <Field className="col-span-2">
                  <FieldLabel>Max context tokens</FieldLabel>
                  <Select
                    value={String(form.watch("capabilities.maxContextTokens") ?? 0)}
                    onValueChange={(v) =>
                      form.setValue("capabilities.maxContextTokens", Number(v))
                    }
                  >
                    <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                    <SelectContent>
                      {[
                        { value: "0", label: "Not set" },
                        { value: "8192", label: "8K" },
                        { value: "16384", label: "16K" },
                        { value: "32768", label: "32K" },
                        { value: "65536", label: "64K" },
                        { value: "131072", label: "128K" },
                        { value: "200000", label: "200K" },
                        { value: "500000", label: "500K" },
                        { value: "1000000", label: "1M" },
                        { value: "2000000", label: "2M" },
                      ].map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </FieldGroup>
            </TabsContent>

            <TabsContent value="policy">
              <FieldGroup className="grid gap-4 mt-4">
                <Field>
                  <FieldLabel>
                    Image-input policy (for non-vision models)
                  </FieldLabel>
                  <Select
                    value={form.watch("imagePolicy")}
                    onValueChange={(v) =>
                      form.setValue("imagePolicy", v as ModelFormInput["imagePolicy"])
                    }
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="strip_and_instruct">
                        Strip & instruct (graceful, human-like reply)
                      </SelectItem>
                      <SelectItem value="canned_response">
                        Canned response (no upstream call)
                      </SelectItem>
                      <SelectItem value="reject_error">
                        Reject with error
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FieldDescription>
                    Controls what happens when a non-vision model receives an
                    image. &ldquo;Strip & instruct&rdquo; silently removes the image
                    and tells the model to respond naturally — no error, no
                    hallucination.
                  </FieldDescription>
                </Field>

                {form.watch("imagePolicy") === "canned_response" && (
                  <Field>
                    <FieldLabel>Canned response text</FieldLabel>
                    <Textarea
                      {...form.register("cannedResponseText")}
                      placeholder="I'm sorry — this model doesn't support images…"
                    />
                  </Field>
                )}

                {form.watch("imagePolicy") === "strip_and_instruct" && (
                  <Field>
                    <FieldLabel>Custom strip instruction (optional)</FieldLabel>
                    <Textarea
                      {...form.register("stripInstruction")}
                      placeholder="Leave blank to use the default human-like instruction"
                    />
                    <FieldDescription>
                      Injected as a system message when images are stripped.
                    </FieldDescription>
                  </Field>
                )}
              </FieldGroup>
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">{isEdit ? "Save changes" : "Create model"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
