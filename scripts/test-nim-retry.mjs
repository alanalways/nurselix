// 重測之前失敗或卡住的模型
import fs from 'node:fs';

const envFile = '.env.local';
if (fs.existsSync(envFile)) {
  const content = fs.readFileSync(envFile, 'utf8');
  content.split('\n').forEach(line => {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m) process.env[m[1]] = m[2];
  });
}

const apiKey = process.env.NVIDIA_NIM_API_KEY;

const models = [
  { id: 'z-ai/glm-5.1', label: 'GLM-5.1' },
  { id: 'z-ai/glm4.7', label: 'GLM-4.7 (修正 id)' },
  { id: 'deepseek-ai/deepseek-v4-flash', label: 'DeepSeek-V4-Flash' },
];

async function test(model, timeoutMs = 30000) {
  const start = Date.now();
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: model.id,
        messages: [{ role: 'user', content: '請用 1 句話回答：1+1=?' }],
        max_tokens: 50,
        temperature: 0.1,
      }),
      signal: controller.signal,
    });
    clearTimeout(t);
    const elapsed = Date.now() - start;
    if (!res.ok) {
      const errText = await res.text();
      return { ...model, status: 'FAIL', code: res.status, error: errText.slice(0, 150), elapsed };
    }
    const json = await res.json();
    return { ...model, status: 'OK', elapsed, reply: json.choices?.[0]?.message?.content?.slice(0, 60) };
  } catch (e) {
    clearTimeout(t);
    return { ...model, status: e.name === 'AbortError' ? 'TIMEOUT' : 'ERROR', error: e.message, elapsed: Date.now() - start };
  }
}

console.log('Retry test...\n');
for (const m of models) {
  process.stdout.write(`${m.id}... `);
  const r = await test(m);
  if (r.status === 'OK') console.log(`OK ${r.elapsed}ms - ${r.reply}`);
  else console.log(`${r.status} ${r.code || ''} ${r.error?.slice(0, 100) || ''} (${r.elapsed}ms)`);
}
