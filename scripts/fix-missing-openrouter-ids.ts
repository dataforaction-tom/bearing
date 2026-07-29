// One-off data-correction script: sets openrouter_id for registry models that
// are genuinely available on OpenRouter today but were never mapped, so
// routeAndRun/runTrio/runChallenger/runComparison can actually reach them.
// IDs confirmed live against https://openrouter.ai/api/v1/models before
// running this — see the "which models can't run" investigation.
//
// Usage: npx tsx scripts/fix-missing-openrouter-ids.ts

import { config } from 'dotenv'
config({ path: '.env.local' })

import { neon } from '@neondatabase/serverless'

const MAPPING: Record<string, string> = {
  'claude-opus-4.8': 'anthropic/claude-opus-4.8',
  'claude-opus-4.7': 'anthropic/claude-opus-4.7',
  'claude-opus-5': 'anthropic/claude-opus-5',
  'deepseek-v4-pro': 'deepseek/deepseek-v4-pro',
  'gemini-3-flash': 'google/gemini-3-flash-preview',
  'gemini-3.6-flash': 'google/gemini-3.6-flash',
  'llama-3.3-70b-instruct': 'meta-llama/llama-3.3-70b-instruct',
  'minimax-m3': 'minimax/minimax-m3',
  'kimi-k2.7-code': 'moonshotai/kimi-k2.7-code',
  'kimi-k3': 'moonshotai/kimi-k3',
  'hermes-3-llama-3.1-70b': 'nousresearch/hermes-3-llama-3.1-70b',
  'gpt-5.5-pro': 'openai/gpt-5.5-pro',
  'qwen3.5-9b': 'qwen/qwen3.5-9b',
  'qwen3.6-plus': 'qwen/qwen3.6-plus',
  'glm-5.2': 'z-ai/glm-5.2',
  // lfm-2-24b-a2b intentionally omitted — not on OpenRouter as of this check.
}

async function main() {
  const databaseUrl = process.env.NEON_DATABASE_URL
  if (!databaseUrl) {
    console.error('NEON_DATABASE_URL not set')
    process.exit(1)
  }
  const sql = neon(databaseUrl)

  for (const [slug, openrouterId] of Object.entries(MAPPING)) {
    const rows = await sql`
      UPDATE models SET openrouter_id = ${openrouterId}, updated_at = now()
      WHERE slug = ${slug}
      RETURNING slug
    `
    console.log(rows.length > 0 ? `  ${slug} -> ${openrouterId}` : `  ${slug} NOT FOUND (no row updated)`)
  }
  console.log(`\nDone: ${Object.keys(MAPPING).length} mappings applied.`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
