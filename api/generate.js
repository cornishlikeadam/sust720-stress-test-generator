// Vercel serverless function: builds the stress-test prompt and calls the
// OpenCode Zen API. The API key stays on the server (OPENCODE_API_KEY env var).

const ZEN_URL = 'https://opencode.ai/zen/v1/chat/completions';
const DEFAULT_MODEL = 'deepseek-v4-flash';
const MAX_FIELD = 4000;

function buildPrompt({ bioregion, systemDescription, horizon }) {
    return `You are a deep-time resilience modeling system for SUST 720, a graduate sustainability design course at SCAD. Your role is to generate CONTRADICTORY, COMPOUND ecological shocks that will stress-test students' regenerative system designs.

**INPUT:**
Bioregion: ${bioregion}
System Description: ${systemDescription}
Stress-Test Horizon: ${horizon}

**YOUR TASK:**
Generate exactly THREE contradictory compound ecological shocks. Each shock must:
1. Combine multiple biophysical stressors (NOT just one variable)
2. Show non-linear cascade effects across centuries
3. Contradict or tension the other two shocks (force design diversity)
4. Be grounded in plausible climate science (students will verify against 2 peer-reviewed papers)
5. Affect the system's core assumptions in different ways

**OUTPUT FORMAT:**
For each shock, provide a JSON object with:
{
  "shockNumber": 1 | 2 | 3,
  "title": "A provocative, compound name (e.g., 'Permafrost-Acidification Cascade')",
  "timeline": "When this begins and cascades (e.g., 'Year +80: permafrost thaw begins; Year +250: biome collapse accelerates')",
  "coreShock": "The primary perturbation in 1-2 sentences",
  "cascadeEffects": "How this triggers secondary shocks across the system (2-3 sentences)",
  "affectedSystems": ["system1", "system2", "system3"],
  "implications": "How this specifically challenges the student's system design (2 sentences)",
  "severity": "CRITICAL | HIGH | MODERATE",
  "verificationHint": "One or two keywords a student might search for peer-reviewed papers (e.g., 'permafrost carbon feedback', 'biome migration lag')"
}

Return ONLY a JSON array with three objects—no preamble, no markdown fences. Ensure the three shocks are genuinely contradictory and force the students to make hard design tradeoffs.`;
}

// Models sometimes wrap JSON in fences or add prose; pull out the array.
function extractArray(text) {
    const cleaned = text.replace(/```(?:json)?/gi, '').trim();
    try {
        const parsed = JSON.parse(cleaned);
        if (Array.isArray(parsed)) return parsed;
        if (parsed && Array.isArray(parsed.shocks)) return parsed.shocks;
    } catch (_) { /* fall through */ }
    const start = cleaned.indexOf('[');
    const end = cleaned.lastIndexOf(']');
    if (start !== -1 && end > start) return JSON.parse(cleaned.slice(start, end + 1));
    throw new Error('Model did not return a JSON array');
}

module.exports = async function handler(req, res) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const apiKey = process.env.OPENCODE_API_KEY;
    if (!apiKey) {
        return res.status(500).json({ error: 'Server is missing OPENCODE_API_KEY. Add it in Vercel → Settings → Environment Variables and redeploy.' });
    }

    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const fields = {};
    for (const key of ['bioregion', 'systemDescription', 'horizon']) {
        const value = typeof body[key] === 'string' ? body[key].trim() : '';
        if (!value) return res.status(400).json({ error: `Missing field: ${key}` });
        fields[key] = value.slice(0, MAX_FIELD);
    }

    try {
        const upstream = await fetch(ZEN_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model: process.env.OPENCODE_MODEL || DEFAULT_MODEL,
                messages: [{ role: 'user', content: buildPrompt(fields) }],
            }),
        });

        const data = await upstream.json().catch(() => ({}));
        if (!upstream.ok) {
            const message = data?.error?.message || data?.error || `OpenCode API returned ${upstream.status}`;
            return res.status(502).json({ error: String(message) });
        }

        const text = data?.choices?.[0]?.message?.content || '';
        return res.status(200).json({ shocks: extractArray(text) });
    } catch (error) {
        return res.status(502).json({ error: error.message || 'Failed to reach OpenCode API' });
    }
};
