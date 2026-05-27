import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { memeIndex, emoji, voterId } = req.body;
    if (memeIndex == null || !emoji || !voterId) {
        return res.status(400).json({ error: 'Missing fields' });
    }
    if (!['🙂', '😂'].includes(emoji)) {
        return res.status(400).json({ error: 'Invalid emoji' });
    }

    const key = `meme_${memeIndex}`;
    let votes = await redis.get(key) || { "🙂": [], "😂": [] };

    votes["🙂"] = votes["🙂"].filter(v => v !== voterId);
    votes["😂"] = votes["😂"].filter(v => v !== voterId);
    votes[emoji].push(voterId);

    await redis.set(key, votes);
    res.json({ ok: true });
}
