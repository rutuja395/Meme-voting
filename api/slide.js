import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

export default async function handler(req, res) {
    if (req.method === 'POST') {
        const { slide } = req.body;
        if (slide == null || slide < 0) {
            return res.status(400).json({ error: 'Invalid slide' });
        }
        await redis.set('current_slide', slide);
        await redis.set('show_results', false);
        res.json({ ok: true, slide });
    } else {
        const slide = await redis.get('current_slide') || 0;
        res.json({ slide });
    }
}
