import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

export default async function handler(req, res) {
    if (req.method === 'POST') {
        await redis.set('show_results', true);
        res.json({ ok: true });
    } else {
        const showing = await redis.get('show_results') || false;
        res.json({ showResults: showing });
    }
}
