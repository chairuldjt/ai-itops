import assert from "node:assert/strict";
import test from "node:test";

import {
  knownToolNameSet,
  openAIToAnthropic,
  repairToolArguments,
  repairToolName,
  transformOpenAIStreamToAnthropic,
} from "./anthropic";
import { openAIToResponses, transformOpenAIStreamToResponses } from "./responses";

/* -------------------------------------------------------------------------- */
/*                                  Helpers                                   */
/* -------------------------------------------------------------------------- */

function sseStream(
  events: Array<Record<string, unknown> | "[DONE]">,
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  const text = events
    .map((e) => (e === "[DONE]" ? "data: [DONE]\n\n" : `data: ${JSON.stringify(e)}\n\n`))
    .join("");
  return new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(text));
      controller.close();
    },
  });
}

async function readAll(stream: ReadableStream<Uint8Array>): Promise<string> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let out = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    out += decoder.decode(value, { stream: true });
  }
  return out + decoder.decode();
}

const count = (haystack: string, needle: string): number =>
  haystack.split(needle).length - 1;

/* -------------------------------------------------------------------------- */
/*                               repairToolName                               */
/* -------------------------------------------------------------------------- */

test("repairToolName collapses exact repetitions of a known tool name", () => {
  const known = new Set(["Bash", "Read", "Agent"]);
  assert.equal(repairToolName("BashBash", known), "Bash");
  assert.equal(repairToolName("ReadRead", known), "Read");
  assert.equal(repairToolName("AgentAgentAgentAgentAgent", known), "Agent");
});

test("repairToolName leaves valid, unknown, or partial names untouched", () => {
  const known = new Set(["Bash", "Read"]);
  // Already valid.
  assert.equal(repairToolName("Bash", known), "Bash");
  // Not a repetition of any known name.
  assert.equal(repairToolName("BashEdit", known), "BashEdit");
  // Truncated repetition is not repaired.
  assert.equal(repairToolName("BashBas", known), "BashBas");
  // No known list -> passthrough.
  assert.equal(repairToolName("BashBash"), "BashBash");
  assert.equal(repairToolName("BashBash", new Set()), "BashBash");
  // Single-char tool names are never used as repair bases (too ambiguous).
  assert.equal(repairToolName("aa", new Set(["a"])), "aa");
});

test("knownToolNameSet keeps only non-empty string names", () => {
  assert.equal(knownToolNameSet(undefined), undefined);
  assert.equal(knownToolNameSet([]), undefined);
  assert.equal(knownToolNameSet([{ name: "" }, {}]), undefined);
  assert.deepEqual(
    knownToolNameSet([{ name: "Bash" }, { name: "Read" }, { name: 42 }]),
    new Set(["Bash", "Read"]),
  );
});

/* -------------------------------------------------------------------------- */
/*                             repairToolArguments                            */
/* -------------------------------------------------------------------------- */

test("repairToolArguments passes valid JSON through untouched", () => {
  assert.equal(repairToolArguments('{"command":"ls"}'), '{"command":"ls"}');
  assert.equal(repairToolArguments("{}"), "{}");
  // Braces inside strings must not confuse the scanner.
  assert.equal(repairToolArguments('{"a":"{}"}'), '{"a":"{}"}');
});

test("repairToolArguments collapses concatenated JSON documents to the last one", () => {
  // Identical re-emission (provider repeats the same cumulative state).
  assert.equal(
    repairToolArguments('{"command":"ls"}{"command":"ls"}'),
    '{"command":"ls"}',
  );
  // Growing cumulative re-emission: the last document is the complete state.
  assert.equal(
    repairToolArguments('{"command":"ls"}{"command":"ls -la"}'),
    '{"command":"ls -la"}',
  );
  // Triple repetition.
  assert.equal(
    repairToolArguments('{"a":1}{"a":1}{"a":1}'),
    '{"a":1}',
  );
});

test("repairToolArguments handles empty and unrecoverable input", () => {
  assert.equal(repairToolArguments(""), "{}");
  // No JSON document at all -> unchanged (let the client surface the error).
  assert.equal(repairToolArguments("not json"), "not json");
});

/* -------------------------------------------------------------------------- */
/*                    Anthropic non-streaming translation                     */
/* -------------------------------------------------------------------------- */

function anthropicNonStream(toolName: string) {
  return {
    id: "chatcmpl-1",
    model: "upstream-model",
    choices: [
      {
        index: 0,
        message: {
          role: "assistant",
          content: null,
          tool_calls: [
            { id: "call_1", type: "function", function: { name: toolName, arguments: "{}" } },
          ],
        },
        finish_reason: "tool_calls",
      },
    ],
    usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
  } as Parameters<typeof openAIToAnthropic>[0];
}

test("openAIToAnthropic repairs duplicated tool names using the request tool list", () => {
  const resp = openAIToAnthropic(anthropicNonStream("BashBash"), new Set(["Bash"]));
  const toolUse = resp.content.find((c) => c.type === "tool_use");
  assert.ok(toolUse && toolUse.type === "tool_use");
  assert.equal(toolUse.name, "Bash");
  assert.equal(resp.stop_reason, "tool_use");
});

test("openAIToAnthropic passes names through without a known tool list", () => {
  const resp = openAIToAnthropic(anthropicNonStream("BashBash"));
  const toolUse = resp.content.find((c) => c.type === "tool_use");
  assert.ok(toolUse && toolUse.type === "tool_use");
  assert.equal(toolUse.name, "BashBash");
});

/* -------------------------------------------------------------------------- */
/*                      Anthropic streaming translation                       */
/* -------------------------------------------------------------------------- */

test("anthropic streaming repairs duplicated tool names (BashBash regression)", async () => {
  // Simulates the upstream failure: a tool name duplicated by upstream
  // SSE->JSON-style aggregation reaching the translator.
  const stream = sseStream([
    {
      choices: [
        {
          index: 0,
          delta: {
            role: "assistant",
            tool_calls: [
              { index: 0, id: "call_1", type: "function", function: { name: "BashBash", arguments: "" } },
            ],
          },
        },
      ],
    },
    {
      choices: [
        {
          index: 0,
          delta: { tool_calls: [{ index: 0, function: { arguments: "{\"command\":\"ls\"}" } }] },
          finish_reason: "tool_calls",
        },
      ],
    },
    "[DONE]",
  ]);

  const out = await readAll(
    transformOpenAIStreamToAnthropic(stream, "test-model", undefined, new Set(["Bash"])),
  );

  assert.ok(!out.includes("BashBash"), "duplicated name must be repaired");
  assert.match(out, /"name":"Bash"/);
  assert.equal(count(out, "event: content_block_start"), 1);
  // Arguments survive intact inside the JSON-escaped input_json_delta.
  assert.ok(out.includes("{\\\"command\\\":\\\"ls\\\"}"), "tool arguments must be preserved");
  assert.match(out, /event: message_stop/);
});

test("anthropic streaming keeps correct names intact and emits one block per tool", async () => {
  const stream = sseStream([
    {
      choices: [
        {
          index: 0,
          delta: {
            role: "assistant",
            tool_calls: [
              { index: 0, id: "call_a", type: "function", function: { name: "Read", arguments: "" } },
              { index: 1, id: "call_b", type: "function", function: { name: "Bash", arguments: "" } },
            ],
          },
        },
      ],
    },
    {
      choices: [
        {
          index: 0,
          delta: {
            tool_calls: [
              { index: 0, function: { arguments: "{\"path\":\"a\"}" } },
              { index: 1, function: { arguments: "{\"command\":\"b\"}" } },
            ],
          },
          finish_reason: "tool_calls",
        },
      ],
    },
    "[DONE]",
  ]);

  const out = await readAll(
    transformOpenAIStreamToAnthropic(stream, "test-model", undefined, new Set(["Read", "Bash"])),
  );

  assert.equal(count(out, "event: content_block_start"), 2);
  assert.match(out, /"name":"Read"/);
  assert.match(out, /"name":"Bash"/);
  assert.ok(!out.includes("ReadRead"));
  assert.ok(!out.includes("BashBash"));
});

test("anthropic streaming repairs concatenated cumulative arguments", async () => {
  // Cumulative providers re-emit the FULL arguments state on every delta;
  // routers that append deltas produce `{"a":1}{"a":12}`-style corruption
  // which surfaces client-side as "Invalid tool parameters".
  const stream = sseStream([
    {
      choices: [
        {
          index: 0,
          delta: {
            role: "assistant",
            tool_calls: [
              { index: 0, id: "call_1", type: "function", function: { name: "Bash", arguments: '{"command":"ls"}' } },
            ],
          },
        },
      ],
    },
    {
      choices: [
        {
          index: 0,
          delta: { tool_calls: [{ index: 0, function: { arguments: '{"command":"ls -la"}' } }] },
          finish_reason: "tool_calls",
        },
      ],
    },
    "[DONE]",
  ]);

  const out = await readAll(
    transformOpenAIStreamToAnthropic(stream, "test-model", undefined, new Set(["Bash"])),
  );

  // Exactly one repaired input_json_delta carrying the complete state.
  assert.equal(count(out, "input_json_delta"), 1);
  assert.ok(out.includes("{\\\"command\\\":\\\"ls -la\\\"}"), "last cumulative document must win");
  assert.ok(!out.includes("ls\\\"} {"), "no concatenated garbage");
});

test("anthropic streaming emits {} for tool calls without arguments", async () => {
  const stream = sseStream([
    {
      choices: [
        {
          index: 0,
          delta: {
            role: "assistant",
            tool_calls: [
              { index: 0, id: "call_1", type: "function", function: { name: "Bash", arguments: "" } },
            ],
          },
        },
      ],
    },
    { choices: [{ index: 0, delta: {}, finish_reason: "tool_calls" }] },
    "[DONE]",
  ]);

  const out = await readAll(
    transformOpenAIStreamToAnthropic(stream, "test-model", undefined, new Set(["Bash"])),
  );

  // A tool_use block with no input_json_delta assembles into unparseable
  // input; we must emit at least "{}".
  assert.equal(count(out, "input_json_delta"), 1);
  assert.ok(out.includes('"partial_json":"{}"'));
});

test("openAIToAnthropic repairs concatenated arguments from aggregated JSON", () => {
  const resp = openAIToAnthropic(
    {
      id: "chatcmpl-3",
      model: "m",
      choices: [
        {
          index: 0,
          message: {
            role: "assistant",
            content: null,
            tool_calls: [
              {
                id: "call_2",
                type: "function",
                function: { name: "Bash", arguments: '{"command":"ls"}{"command":"ls -la"}' },
              },
            ],
          },
          finish_reason: "tool_calls",
        },
      ],
    } as Parameters<typeof openAIToAnthropic>[0],
    new Set(["Bash"]),
  );
  const toolUse = resp.content.find((c) => c.type === "tool_use");
  assert.ok(toolUse && toolUse.type === "tool_use");
  assert.deepEqual(toolUse.input, { command: "ls -la" });
});

/* -------------------------------------------------------------------------- */
/*                     Responses translation (same upstream)                  */
/* -------------------------------------------------------------------------- */

test("openAIToResponses repairs duplicated function names", () => {
  const resp = openAIToResponses(
    {
      id: "chatcmpl-2",
      model: "upstream-model",
      choices: [
        {
          message: {
            role: "assistant",
            content: null,
            tool_calls: [
              { id: "call_9", function: { name: "shellshell", arguments: "{}" } },
            ],
          },
          finish_reason: "tool_calls",
        },
      ],
    },
    new Set(["shell"]),
  );
  const output = resp.output as Array<{ name?: string; type?: string }>;
  const fn = output.find((o) => o.type === "function_call");
  assert.ok(fn);
  assert.equal(fn.name, "shell");
});

test("responses streaming repairs duplicated function names", async () => {
  const stream = sseStream([
    {
      choices: [
        {
          index: 0,
          delta: {
            role: "assistant",
            tool_calls: [
              { index: 0, id: "call_x", type: "function", function: { name: "BashBash", arguments: "{}" } },
            ],
          },
        },
      ],
    },
    { choices: [{ index: 0, delta: {}, finish_reason: "tool_calls" }] },
    "[DONE]",
  ]);

  const out = await readAll(
    transformOpenAIStreamToResponses(stream, "test-model", new Set(["Bash"])),
  );

  assert.ok(!out.includes("BashBash"), "duplicated name must be repaired");
  assert.match(out, /"name":"Bash"/);
  assert.match(out, /event: response\.completed/);
});

test("responses translation repairs concatenated function arguments", async () => {
  const stream = sseStream([
    {
      choices: [
        {
          index: 0,
          delta: {
            role: "assistant",
            tool_calls: [
              { index: 0, id: "call_y", type: "function", function: { name: "shell", arguments: '{"cmd":"a"}' } },
            ],
          },
        },
      ],
    },
    {
      choices: [
        {
          index: 0,
          delta: { tool_calls: [{ index: 0, function: { arguments: '{"cmd":"ab"}' } }] },
          finish_reason: "tool_calls",
        },
      ],
    },
    "[DONE]",
  ]);

  const out = await readAll(
    transformOpenAIStreamToResponses(stream, "test-model", new Set(["shell"])),
  );

  // The arguments.done event carries the repaired single JSON document.
  assert.match(out, /"arguments":"\{\\"cmd\\":\\"ab\\"\}"/);
});
