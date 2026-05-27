import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const pipeline = redis.pipeline();
    for (let i = 0; i < 30; i++) {
        pipeline.del(`meme_${i}`);
    }
    pipeline.set('current_slide', 0);
    pipeline.set('show_results', false);
    await pipeline.exec();

    res.json({ ok: true });
}
