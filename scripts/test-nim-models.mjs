// Test NIM models stability and latency
// Usage: node scripts/test-nim-models.mjs

import fs from 'node:fs';

// 手動載入 .env.local（避免 dotenv 依賴）
const envFile = '.env.local';
if (fs.existsSync(envFile)) {
  const content = fs.readFileSync(envFile, 'utf8');
  content.split('\n').forEach(line => {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m) process.env[m[1]] = m[2];
  });
}

const apiKey = process.env.NVIDIA_NIM_API_KEY;
if (!apiKey) {
  console.error('Missing NVIDIA_NIM_API_KEY in env');
  process.exit(1);
}

const models = [
  // GLM 系列
  { id: 'z-ai/glm-5.1', label: 'GLM-5.1 (754B, 重推理)' },
  { id: 'z-ai/glm-4.7', label: 'GLM-4.7 (備援)' },
  // Kimi 系列
  { id: 'moonshotai/kimi-k2.6', label: 'Kimi-K2.6 (多模態 1T)' },
  { id: 'moonshotai/kimi-k2.5', label: 'Kimi-K2.5 (備援)' },
  // MiniMax 系列
  { id: 'minimaxai/minimax-m2.7', label: 'MiniMax-M2.7 (10B, 快)' },
  // DeepSeek 系列（最新 V4）
  { id: 'deepseek-ai/deepseek-v4-pro', label: 'DeepSeek-V4-Pro (1.6T, 最強)' },
  { id: 'deepseek-ai/deepseek-v4-flash', label: 'DeepSeek-V4-Flash (284B, 快)' },
];

const testPrompt = '請用一句話回答：NCLEX 護理考試最高頻的 domain 是什麼？';

async function test(model) {
  const start = Date.now();
  try {
    const res = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model.id,
        messages: [{ role: 'user', content: testPrompt }],
        max_tokens: 100,
        temperature: 0.3,
      }),
    });
    const elapsed = Date.now() - start;
    if (!res.ok) {
      const errText = await res.text();
      return { model: model.id, label: model.label, status: 'FAIL', code: res.status, error: errText.slice(0, 150), elapsed };
    }
    const json = await res.json();
    const reply = json.choices?.[0]?.message?.content || '(empty)';
    return { model: model.id, label: model.label, status: 'OK', elapsed, reply: reply.slice(0, 80), tokens: json.usage };
  } catch (e) {
    return { model: model.id, label: model.label, status: 'ERROR', error: e.message, elapsed: Date.now() - start };
  }
}

console.log('Testing NIM models...\n');
const results = [];
for (const m of models) {
  process.stdout.write(`Testing ${m.id}... `);
  const r = await test(m);
  results.push(r);
  if (r.status === 'OK') {
    console.log(`OK ${r.elapsed}ms ${r.tokens?.total_tokens || 0}tok`);
  } else {
    console.log(`${r.status} ${r.code || ''} ${r.error?.slice(0, 80) || ''}`);
  }
}

console.log('\n=== Summary ===');
results.forEach(r => {
  if (r.status === 'OK') {
    console.log(`✓ ${r.label.padEnd(40)} ${r.elapsed}ms - ${r.reply}`);
  } else {
    console.log(`✗ ${r.label.padEnd(40)} ${r.status} ${r.error?.slice(0, 60) || ''}`);
  }
});

// 寫入結果
fs.writeFileSync('scripts/nim-test-results.json', JSON.stringify(results, null, 2));
console.log('\nResults saved to scripts/nim-test-results.json');
