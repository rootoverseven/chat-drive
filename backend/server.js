// server.js
require('dotenv').config();
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Google Drive API setup
const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
);

oauth2Client.setCredentials({
    refresh_token: process.env.GOOGLE_REFRESH_TOKEN
});

const drive = google.drive({ version: 'v3', auth: oauth2Client });

// Store connected users
const connectedUsers = new Map();
const validUsers = ['pui', 'loze'];

// WebSocket connection handler
wss.on('connection', (ws) => {
    let userId = null;

    ws.on('message', async (message) => {
        const data = JSON.parse(message);

        switch (data.type) {
            case 'auth':
                if (validUsers.includes(data.userId)) {
                    userId = data.userId;
                    connectedUsers.set(userId, ws);
                    ws.send(JSON.stringify({
                        type: 'auth_success',
                        message: 'Authentication successful'
                    }));
                } else {
                    ws.send(JSON.stringify({
                        type: 'auth_error',
                        message: 'Invalid user'
                    }));
                }
                break;

            case 'message':
                if (!userId) {
                    ws.send(JSON.stringify({
                        type: 'error',
                        message: 'Not authenticated'
                    }));
                    return;
                }

                // Handle text message
                if (data.messageType === 'text') {
                    broadcastMessage({
                        type: 'message',
                        userId: userId,
                        messageType: 'text',
                        content: data.content,
                        timestamp: new Date().toISOString()
                    });
                }
                // Handle media message
                else if (data.messageType === 'media') {
                    try {
                        // Upload to Google Drive
                        const fileMetadata = {
                            name: `${Date.now()}_${data.fileName}`,
                            parents: [process.env.GOOGLE_DRIVE_FOLDER_ID]
                        };

                        const media = {
                            mimeType: data.mimeType,
                            body: Buffer.from(data.content, 'base64')
                        };

                        const file = await drive.files.create({
                            resource: fileMetadata,
                            media: media,
                            fields: 'id, webViewLink'
                        });

                        broadcastMessage({
                            type: 'message',
                            userId: userId,
                            messageType: 'media',
                            fileName: data.fileName,
                            fileUrl: file.data.webViewLink,
                            timestamp: new Date().toISOString()
                        });
                    } catch (error) {
                        ws.send(JSON.stringify({
                            type: 'error',
                            message: 'Failed to upload file'
                        }));
                    }
                }
                break;
        }
    });

    ws.on('close', () => {
        if (userId) {
            connectedUsers.delete(userId);
        }
    });
});

// Broadcast message to all connected users
function broadcastMessage(message) {
    const messageString = JSON.stringify(message);
    connectedUsers.forEach((ws) => {
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(messageString);
        }
    });
}

// REST endpoints
app.get('/users/online', (req, res) => {
    res.json({
        online: Array.from(connectedUsers.keys())
    });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});