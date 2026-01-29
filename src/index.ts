import { Hono } from 'hono';
import { serveStatic } from 'hono/bun';
import { cors } from 'hono/cors';

const app = new Hono();

// Enable CORS so other membranes can use this mirror as a signal relay
app.use('/*', cors());

// --- SIGNALING MEMORY (Ephemeral) ---
// In production, use Redis. For the reference node, RAM is sufficient.
const signals = new Map<string, any[]>();

/**
 * SIGNALING API
 * Allows two Sovereign Nodes to exchange WebRTC handshakes (Offers/Answers)
 * without a central database.
 */

// 1. Post a signal (Offer/Answer/Candidate) to a target Peer ID
app.post('/api/signal/:targetId', async (c) => {
    const targetId = c.req.param('targetId');
    const body = await c.req.json();
    
    if (!signals.has(targetId)) {
        signals.set(targetId, []);
    }
    
    // Store signal in the target's mailbox
    signals.get(targetId)?.push({
        sender: body.sender,
        type: body.type,
        data: body.data,
        timestamp: Date.now()
    });

    return c.json({ success: true });
});

// 2. Poll for signals (The client checks this periodically)
app.get('/api/signal/:myId', (c) => {
    const myId = c.req.param('myId');
    const mySignals = signals.get(myId) || [];
    
    // Clear mailbox after reading (Ephemeral)
    signals.delete(myId);
    
    return c.json(mySignals);
});

// --- STATIC MEMBRANE HOSTING ---
app.use('/*', serveStatic({ root: './public' }));

console.log("🪞 Sovereign Mirror Active on port 3000");
console.log("🌊 Waiting for Flow...");

export default {
    port: 3000,
    fetch: app.fetch,
};
