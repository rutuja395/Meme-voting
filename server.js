const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const VOTES_FILE = path.join(__dirname, 'votes.json');

app.use(express.json());
app.use(express.static(__dirname));

// Initialize votes file if it doesn't exist
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

// Current slide index (controlled by admin)
let currentSlide = 0;
let showingResults = false;

// SSE clients
let clients = [];

// Keep SSE connections alive through proxies/load balancers
setInterval(() => {
    clients.forEach(res => res.write(': ping\n\n'));
}, 25000);

function broadcast(data) {
    clients.forEach(res => {
        res.write(`data: ${JSON.stringify(data)}\n\n`);
    });
}

// SSE endpoint for live updates
app.get('/api/stream', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    clients.push(res);
    // Send current state immediately
    res.write(`data: ${JSON.stringify({ type: 'init', votes: loadVotes(), slide: currentSlide, showResults: showingResults })}\n\n`);

    req.on('close', () => {
        clients = clients.filter(c => c !== res);
    });
});

// Cast a vote
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
    if (!votes[key]) votes[key] = { "🙂": [], "😂": [] };

    // Remove previous vote by this voter
    votes[key]["🙂"] = votes[key]["🙂"].filter(v => v !== voterId);
    votes[key]["😂"] = votes[key]["😂"].filter(v => v !== voterId);
    // Add new vote
    votes[key][emoji].push(voterId);

    saveVotes(votes);
    broadcast({ type: 'update', votes });
    res.json({ ok: true });
});

// Get all votes
app.get('/api/votes', (req, res) => {
    res.json(loadVotes());
});

// Admin: change slide
app.post('/api/slide', (req, res) => {
    const { slide } = req.body;
    if (slide == null || slide < 0) {
        return res.status(400).json({ error: 'Invalid slide' });
    }
    currentSlide = slide;
    showingResults = false;
    broadcast({ type: 'slide', slide: currentSlide });
    res.json({ ok: true, slide: currentSlide });
});

// Admin: show top 5 results to everyone
app.post('/api/show-results', (req, res) => {
    showingResults = true;
    broadcast({ type: 'showResults', votes: loadVotes() });
    res.json({ ok: true });
});

// Get current slide
app.get('/api/slide', (req, res) => {
    res.json({ slide: currentSlide });
});

// Serve admin page
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🎉 Meme Voting Game running at http://localhost:${PORT}`);
});
