const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const express = require('express');

const app = express();
app.use(express.json());

// WhatsApp client
const client = new Client({
    authStrategy: new LocalAuth() // saves session locally
});

// Generate QR
client.on('qr', (qr) => {
    console.log('Scan this QR with your WhatsApp:');
    qrcode.generate(qr, { small: true });
});

// Ready
client.on('ready', () => {
    console.log('✅ WhatsApp is ready!');
});

// Authenticated
client.on('authenticated', () => {
    console.log('🔐 Authenticated');
});

// Start client
client.initialize();


// API to send message
app.post('/send', async (req, res) => {
    try {
        let { phone, message } = req.body;

        if (!phone || !message) {
            return res.status(400).send('phone and message required');
        }

        // Remove spaces, + or dashes
        phone = phone.replace(/\D/g, '');

        // Format for WhatsApp
        const chatId = phone.includes('@c.us') ? phone : `${phone}@c.us`;

        // Optional: check if chat exists
        const chat = await client.getChatById(chatId).catch(() => null);
        if (!chat) {
            console.log('⚠️ Chat not found, creating new chat...');
        }

        await client.sendMessage(chatId, message);
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