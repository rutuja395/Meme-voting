const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const VOTES_FILE = path.join(__dirname, 'votes.json');

app.use(express.json());
app.use(express.static(__dirname));

function loadVotes() {
    try {
        if (fs.existsSync(VOTES_FILE)) {
            return JSON.parse(fs.readFileSync(VOTES_FILE, 'utf8'));
        }
    } catch (e) {}
    return {};
}

function saveVotes(votes) {
    fs.writeFileSync(VOTES_FILE, JSON.stringify(votes, null, 2));
}

let clients = [];

setInterval(() => {
    clients.forEach(res => res.write(': ping\n\n'));
}, 25000);

function broadcast(data) {
    clients.forEach(res => res.write(`data: ${JSON.stringify(data)}\n\n`));
}

// SSE for live vote count updates
app.get('/api/stream', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    clients.push(res);
    res.write(`data: ${JSON.stringify({ type: 'init', votes: loadVotes() })}\n\n`);

    req.on('close', () => {
        clients = clients.filter(c => c !== res);
    });
});

// Cast a vote — one per voter per meme, no changing
app.post('/api/vote', (req, res) => {
    const { memeIndex, emoji, voterId } = req.body;
    if (memeIndex == null || !emoji || !voterId) {
        return res.status(400).json({ error: 'Missing fields' });
    }
    if (!['🙂', '😂'].includes(emoji)) {
        return res.status(400).json({ error: 'Invalid emoji' });
    }

    const votes = loadVotes();
    const key = `meme_${memeIndex}`;
    if (!votes[key]) votes[key] = { '🙂': [], '😂': [] };

    // Reject if already voted
    if (votes[key]['🙂'].includes(voterId) || votes[key]['😂'].includes(voterId)) {
        return res.json({ ok: true });
    }

    votes[key][emoji].push(voterId);
    saveVotes(votes);
    broadcast({ type: 'update', votes });
    res.json({ ok: true });
});

app.get('/api/votes', (req, res) => {
    res.json(loadVotes());
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Meme Voting running at http://localhost:${PORT}`);
});
