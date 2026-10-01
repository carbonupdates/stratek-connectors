// ai_employee -- an AI "employee" that runs INSIDE this connector (the shop's
// own Cloudflare), with the shop's own AI provider key (bring your own key).
//
// It works like a staff member: the owner gives it tasks on Telegram (v0.25.0;
// Stratek's card only switches it on/off and shows token use); it uses Stratek's tools (the same ones MCP agents get:
// menu, sales, reports, expenses, online orders, integrations...) through a
// Stratek identity that Stratek gives this connector when the owner switches
// it on. Every Stratek rule for agents applies to it: no cash, no settling,
// and anything that moves money out of the shop (refunds, a Pathao rider, a
// 3D print) becomes an approval request a person approves.
//
// Providers: Anthropic (Claude), OpenAI, Google Gemini (its OpenAI-compatible
// endpoint) or any OpenAI-compatible address (e.g. your own model).
// Keys stay here; Stratek never sees them. Live keys only (AI providers have
// no test environment). A daily token limit stops runaway bills.

import { testModel, loadHistory, usageToday, dailyLimit, agentKey } from '../agent.js';

export default {
  id: 'ai_employee',
  name: 'AI employee',
  category: 'ai',
  status: 'available',
  color: '#4f46e5',
  description: 'An AI staff member that runs in your own Cloudflare with your own AI key, uses Stratek and your integrations, and asks a person before anything that moves money.',
  docsUrl: 'https://github.com/carbonupdates/stratek-connectors#ai-employee',
  test: { support: 'none', note: 'AI providers have no test environment -- the AI employee uses your live key and follows the shop mode in Stratek.' },
  secrets: [
    { name: 'AI_PROVIDER', label: 'AI provider', hint: 'Type one of: anthropic, openai, gemini, custom (custom = any OpenAI-compatible address, e.g. your own model).' },
    { name: 'AI_API_KEY', label: 'AI provider API key', hint: 'From your AI provider\'s console (Anthropic, OpenAI, Google AI Studio...). You pay the provider directly.' },
    { name: 'AI_MODEL', label: 'Model', hint: 'The model name from your provider, e.g. a Claude Sonnet model, gpt-4.1-mini or gemini-2.5-flash. It must support tool use (function calling).' },
    { name: 'AI_BASE_URL', label: 'Base URL (custom only)', hint: 'Only for provider "custom": the OpenAI-compatible address ending in /v1.', optional: true },
    { name: 'AI_DAILY_TOKENS', label: 'Daily token limit', hint: 'The AI employee stops for the day after this many tokens (default 300000). Keeps your AI bill in check.', optional: true },
  ],
  actions: [
    {
      id: 'test',
      label: 'Test AI employee',
      placement: ['settings'],
      fields: [],
      async run({ env, store }) {
        const r = await testModel(env, store);
        return { type: 'message', title: r.ok ? 'AI employee is ready' : 'AI employee needs attention', text: r.text };
      },
    },
    {
      // Hidden: Stratek's AI employee card (on/off, token use). Tasks come from
      // Telegram (v0.25.0: the chat box in the dashboard was removed).
      id: 'status',
      label: 'AI employee status',
      placement: ['agent'],
      fields: [],
      async run({ env, store, claims }) {
        if (claims?.src !== 'session' && claims?.src !== 'server') throw Object.assign(new Error('Dashboard only.'), { status: 403 });
        return { type: 'agent', usage: { today: await usageToday(store), limit: dailyLimit(env) }, linked: !!(await agentKey(store)), messages: (await loadHistory(store)).length };
      },
    },
  ],
};
