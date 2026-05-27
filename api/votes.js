import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

export default async function handler(req, res) {
    const allVotes = {};
    const keys = [];
    for (let i = 0; i < 30; i++) {
        keys.push(`meme_${i}`);
    }

    const pipeline = redis.pipeline();
    keys.forEach(k => pipeline.get(k));
    const results = await pipeline.exec();

    results.forEach((votes, i) => {
        if (votes) allVotes[`meme_${i}`] = votes;
    });

    res.json(allVotes);
}
