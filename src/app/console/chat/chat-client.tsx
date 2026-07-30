"use client";

import * as React from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  SendIcon,
  BotIcon,
  UserIcon,
  PaperclipIcon,
  CopyIcon,
  Loader2Icon,
} from "lucide-react";

type Message = {
  role: "user" | "assistant" | "system";
  content: string;
};

type ModelOption = {
  id: string;
  name: string;
  provider: string;
  description: string;
};

export function ChatClient({
  userApiKeyPrefix,
  models: modelOptions,
}: {
  userApiKeyPrefix: string | null;
  models: ModelOption[];
}) {
  const [selectedModel, setSelectedModel] = React.useState(
    modelOptions[0]?.id ?? ""
  );
  const [systemPrompt, setSystemPrompt] = React.useState(
    "You are a helpful AI assistant."
  );
  const [temperature, setTemperature] = React.useState(0.7);
  const [maxTokens, setMaxTokens] = React.useState(2048);
  const [stream, setStream] = React.useState(true);
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [input, setInput] = React.useState("");
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [rawJson, setRawJson] = React.useState<object | null>(null);
  const [tokenUsage, setTokenUsage] = React.useState({
    prompt: 0,
    completion: 0,
  });
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || isGenerating) return;

    const userMessage: Message = { role: "user", content: input.trim() };
    const allMessages: Message[] = [
      ...(systemPrompt
        ? [{ role: "system" as const, content: systemPrompt }]
        : []),
      ...messages,
      userMessage,
    ];

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsGenerating(true);

    try {
      if (stream) {
        const response = await fetch("/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${userApiKeyPrefix ?? "sk_live_demo"}`,
          },
          body: JSON.stringify({
            model: selectedModel,
            messages: allMessages,
            temperature,
            max_tokens: maxTokens,
            stream: true,
          }),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let assistantContent = "";
        let buffer = "";

        setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() ?? "";

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed || !trimmed.startsWith("data: ")) continue;
              const data = trimmed.slice(6);
              if (data === "[DONE]") continue;

              try {
                const parsed = JSON.parse(data);
                const delta = parsed.choices?.[0]?.delta?.content ?? "";
                if (delta) {
                  assistantContent += delta;
                  setMessages((prev) => {
                    const updated = [...prev];
                    const last = updated[updated.length - 1];
                    if (last?.role === "assistant") {
                      updated[updated.length - 1] = {
                        ...last,
                        content: assistantContent,
                      };
                    }
                    return updated;
                  });
                }
                if (parsed.usage) {
                  setTokenUsage({
                    prompt: parsed.usage.prompt_tokens ?? 0,
                    completion: parsed.usage.completion_tokens ?? 0,
                  });
                }
                setRawJson(parsed);
              } catch {
                // skip malformed lines
              }
            }
          }
        }
      } else {
        const response = await fetch("/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${userApiKeyPrefix ?? "sk_live_demo"}`,
          },
          body: JSON.stringify({
            model: selectedModel,
            messages: allMessages,
            temperature,
            max_tokens: maxTokens,
            stream: false,
          }),
        });

        const data = await response.json();
        setRawJson(data);
        const content = data.choices?.[0]?.message?.content ?? "No response.";
        setMessages((prev) => [...prev, { role: "assistant", content }]);
        setTokenUsage({
          prompt: data.usage?.prompt_tokens ?? 0,
          completion: data.usage?.completion_tokens ?? 0,
        });
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Request failed";
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `Error: ${errorMessage}` },
      ]);
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="flex flex-col gap-4 h-[calc(100vh-8rem)]">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Chat Playground
        </h1>
        <p className="text-sm text-muted-foreground">
          Test models with a chat interface.
        </p>
      </div>

      <div className="flex flex-1 gap-4 min-h-0">
        {/* Left config panel */}
        <Card className="w-80 shrink-0 flex flex-col">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Configuration</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 overflow-y-auto">
            <div className="space-y-2">
              <Label className="text-xs">Model</Label>
              <Select
                value={selectedModel}
                onValueChange={(v) => v && setSelectedModel(v)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select model" />
                </SelectTrigger>
                <SelectContent>
                  {modelOptions.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      <div className="flex flex-col">
                        <span>{m.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {m.provider}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs">System Prompt</Label>
              <textarea
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                className="w-full rounded-xl border border-transparent bg-input/50 px-3 py-2 text-sm resize-none h-24 outline-none focus:border-ring focus:ring-3 focus:ring-ring/30"
                placeholder="You are a helpful assistant..."
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Temperature</Label>
                <span className="text-xs text-muted-foreground font-mono">
                  {temperature}
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="2"
                step="0.1"
                value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value))}
                className="w-full accent-primary"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Max Tokens</Label>
              <Input
                type="number"
                value={maxTokens}
                onChange={(e) => setMaxTokens(parseInt(e.target.value) || 2048)}
                className="h-8"
              />
            </div>

            <div className="flex items-center justify-between">
              <Label className="text-xs">Stream</Label>
              <Switch
                checked={stream}
                onCheckedChange={setStream}
                size="sm"
              />
            </div>

            {userApiKeyPrefix && (
              <div className="pt-2">
                <Label className="text-xs">API Key</Label>
                <p className="text-xs text-muted-foreground font-mono mt-1">
                  {userApiKeyPrefix}…
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Center chat area */}
        <Card className="flex-1 flex flex-col min-w-0">
          <CardContent className="flex-1 flex flex-col p-0 min-h-0">
            <ScrollArea className="flex-1 p-4">
              <div className="flex flex-col gap-4">
                {messages.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-20 text-center">
                    <div className="mb-4 flex size-16 items-center justify-center rounded-2xl bg-muted/50 text-muted-foreground">
                      <BotIcon className="size-7" />
                    </div>
                    <h3 className="text-lg font-semibold">Start a conversation</h3>
                    <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                      Type a message below to begin chatting with the model.
                    </p>
                  </div>
                )}

                {messages.map((msg, i) => (
                  <div
                    key={i}
                    className={`flex gap-3 ${
                      msg.role === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    {msg.role !== "user" && (
                      <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                        <BotIcon className="size-4" />
                      </div>
                    )}
                    <div
                      className={`max-w-[70%] rounded-2xl px-4 py-2 text-sm ${
                        msg.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      }`}
                    >
                      <pre className="whitespace-pre-wrap font-sans">
                        {msg.content}
                      </pre>
                    </div>
                    {msg.role === "user" && (
                      <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                        <UserIcon className="size-4" />
                      </div>
                    )}
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            <div className="border-t p-4">
              <div className="flex gap-2">
                <Button variant="outline" size="icon-sm" className="shrink-0">
                  <PaperclipIcon className="size-4" />
                </Button>
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                  placeholder="Type a message..."
                  className="flex-1 resize-none rounded-xl border border-transparent bg-input/50 px-3 py-2 text-sm outline-none focus:border-ring focus:ring-3 focus:ring-ring/30 min-h-[40px] max-h-[120px]"
                  rows={1}
                  disabled={isGenerating}
                />
                <Button
                  size="icon-sm"
                  onClick={sendMessage}
                  disabled={!input.trim() || isGenerating}
                >
                  {isGenerating ? (
                    <Loader2Icon className="size-4 animate-spin" />
                  ) : (
                    <SendIcon className="size-4" />
                  )}
                </Button>
              </div>
              <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                <span>
                  Prompt tokens:{" "}
                  <span className="font-mono">{tokenUsage.prompt}</span>
                </span>
                <span>
                  Completion tokens:{" "}
                  <span className="font-mono">{tokenUsage.completion}</span>
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Right JSON inspector */}
        <Card className="w-60 shrink-0 flex flex-col">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Raw Response</CardTitle>
              {rawJson && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() =>
                    copyToClipboard(JSON.stringify(rawJson, null, 2))
                  }
                >
                  <CopyIcon className="size-3" />
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto p-0">
            <pre className="p-4 text-xs font-mono text-muted-foreground whitespace-pre-wrap break-all">
              {rawJson ? JSON.stringify(rawJson, null, 2) : "No response yet."}
            </pre>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
