const { Client, LocalAuth } = require('whatsapp-web.js');
const express = require('express');
const QRCode = require('qrcode');
const puppeteer = require('puppeteer'); // <-- add this

const app = express();
app.use(express.json());

let latestQR = null; // store QR for web

// Initialize WhatsApp client with Render-compatible Puppeteer
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true,
        executablePath: puppeteer.executablePath(), // use Puppeteer's Chromium
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
});

// Rate-limited message queue
let messageQueue = [];
let sending = false;

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function processQueue() {
    if (sending || messageQueue.length === 0) return;
    sending = true;

    while (messageQueue.length > 0) {
        const { chatId, message } = messageQueue.shift();
        try {
            await client.sendMessage(chatId, message);
            console.log(`✅ Message sent to ${chatId}`);

            // Random delay 3–8 seconds to avoid ban
            await sleep(3000 + Math.floor(Math.random() * 5000));
        } catch (err) {
            console.error(`❌ Failed to send message to ${chatId}:`, err);
        }
    }

    sending = false;
}

// QR event
client.on('qr', async (qr) => {
    console.log('📱 QR received');
    latestQR = await QRCode.toDataURL(qr);
});

// Ready
client.on('ready', () => {
    console.log('✅ WhatsApp ready!');
    latestQR = null; // QR no longer needed
});

// Authenticated
client.on('authenticated', () => {
    console.log('🔐 Authenticated');
});

// Start client
client.initialize();

// QR page
app.get('/qr', (req, res) => {
    if (!latestQR) return res.send('⏳ QR not ready or already scanned.');
    res.send(`
        <html>
            <body style="text-align:center; font-family:sans-serif;">
                <h2>Scan QR with WhatsApp</h2>
                <img src="${latestQR}" />
                <p>WhatsApp → Linked Devices → Link a Device</p>
            </body>
        </html>
    `);
});

// API to send message
app.post('/send', async (req, res) => {
    try {
        let { phone, message } = req.body;
        if (!phone || !message) return res.status(400).send('phone and message required');

        phone = phone.replace(/\D/g, '');
        const chatId = `${phone}@c.us`;

        // Add to queue
        messageQueue.push({ chatId, message });
        processQueue();

        res.send('✅ Message queued');
    } catch (err) {
        console.error('❌ Failed to queue message:', err);
        res.status(500).send('Failed to queue message');
    }
});

// Start server
app.listen(3000, () => {
    console.log('🚀 Server running on http://localhost:3000');
});