const { Client, LocalAuth } = require('whatsapp-web.js');
const express = require('express');
const QRCode = require('qrcode');

const app = express();
app.use(express.json());

// Store latest QR
let latestQR = null;

// WhatsApp client
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
});

// Generate QR (store as image)
client.on('qr', async (qr) => {
    console.log('📱 QR received');

    try {
        latestQR = await QRCode.toDataURL(qr);
    } catch (err) {
        console.error('QR generation failed:', err);
    }
});

// Ready
client.on('ready', () => {
    console.log('✅ WhatsApp is ready!');
    latestQR = null; // clear QR after login
});

// Authenticated
client.on('authenticated', () => {
    console.log('🔐 Authenticated');
});

// Start client
client.initialize();


// 👉 NEW: Route to view QR in browser
app.get('/qr', (req, res) => {
    if (!latestQR) {
        return res.send('⏳ QR not available yet or already scanned. Refresh.');
    }

    res.send(`
        <html>
            <body style="text-align:center; font-family:sans-serif;">
                <h2>Scan QR with WhatsApp</h2>
                <img src="${latestQR}" />
                <p>Open WhatsApp → Linked Devices → Link a Device</p>
            </body>
        </html>
    `);
});


// API to send message
app.post('/send', async (req, res) => {
    try {
        let { phone, message } = req.body;

        if (!phone || !message) {
            return res.status(400).send('phone and message required');
        }

        // Clean number
        phone = phone.replace(/\D/g, '');

        // Format
        const chatId = `${phone}@c.us`;

        await client.sendMessage(chatId, message);

        console.log(`✅ Sent to ${chatId}`);
        res.send('✅ Message sent');
    } catch (err) {
        console.error('❌ Error sending message:', err);
        res.status(500).send('Failed to send message');
    }
});

// Start server
app.listen(3000, () => {
    console.log('🚀 Server running on http://localhost:3000');
});