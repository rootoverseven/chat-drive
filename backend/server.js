// server.js
require('dotenv').config();
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const { google } = require('googleapis');
const cors = require('cors');
const fs = require('fs').promises;

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Define valid users at the top level
const validUsers = ['pui', 'loze'];
const connectedUsers = new Map();

// Chat history constants
const CHAT_HISTORY_FILENAME = 'chat-history.json';
let chatHistoryFileId = null;

// Load the service account credentials
const serviceAccount = require('./chat-442109-d4f177100f2a.json');

// Initialize Google Drive API with service account
const auth = new google.auth.GoogleAuth({
    credentials: serviceAccount,
    scopes: ['https://www.googleapis.com/auth/drive.file']
});

const drive = google.drive({ version: 'v3', auth });


const getDriveDirectLink = (fileId) => {
    // Use the final URL format directly
    return `https://lh3.googleusercontent.com/d/${fileId}=w800`;
};

// Function to get or create chat history file in Google Drive
async function initializeChatHistoryFile() {
    try {
        // Search for existing chat history file
        const response = await drive.files.list({
            q: `name='${CHAT_HISTORY_FILENAME}' and '${process.env.GOOGLE_DRIVE_FOLDER_ID}' in parents`,
            fields: 'files(id)',
        });

        if (response.data.files.length > 0) {
            chatHistoryFileId = response.data.files[0].id;
            console.log('Found existing chat history file:', chatHistoryFileId);
        } else {
            // Create new chat history file
            const fileMetadata = {
                name: CHAT_HISTORY_FILENAME,
                parents: [process.env.GOOGLE_DRIVE_FOLDER_ID],
                mimeType: 'application/json'
            };

            const media = {
                mimeType: 'application/json',
                body: JSON.stringify([])
            };

            const file = await drive.files.create({
                resource: fileMetadata,
                media: media,
                fields: 'id'
            });

            chatHistoryFileId = file.data.id;
            console.log('Created new chat history file:', chatHistoryFileId);
        }
    } catch (error) {
        console.error('Error initializing chat history file:', error);
    }
}

// Function to load chat history from Google Drive
// server.js
async function loadChatHistory() {
    try {
        if (!chatHistoryFileId) {
            console.log('No chat history file ID found');
            return [];
        }

        console.log('Loading chat history from file:', chatHistoryFileId);
        const response = await drive.files.get({
            fileId: chatHistoryFileId,
            alt: 'media'
        });

        const history = response.data || [];
        console.log(`Loaded ${history.length} messages from chat history`);
        return history;
    } catch (error) {
        console.error('Error loading chat history:', error);
        return [];
    }
}

// Function to save chat history to Google Drive
async function saveChatHistory(message) {
    try {
        if (!chatHistoryFileId) {
            await initializeChatHistoryFile();
        }

        let history = await loadChatHistory();

        // Keep only last 100 messages
        if (history.length >= 100) {
            history = history.slice(-99);
        }

        history.push(message);

        await drive.files.update({
            fileId: chatHistoryFileId,
            media: {
                mimeType: 'application/json',
                body: JSON.stringify(history)
            }
        });
    } catch (error) {
        console.error('Error saving chat history:', error);
    }
}

// Broadcast message to all connected users
const broadcastMessage = async (message) => {
    const messageString = JSON.stringify(message);

    // Save message to Google Drive
    await saveChatHistory(message);

    connectedUsers.forEach((ws) => {
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(messageString);
        }
    });
};

// WebSocket message handler function
const handleWebSocketMessage = async (ws, message, userId) => {
    try {
        const data = JSON.parse(message);
        console.log('Received message type:', data.type);

        switch (data.type) {
            case 'auth':
                if (validUsers.includes(data.userId)) {
                    userId = data.userId;
                    connectedUsers.set(userId, ws);
                    ws.send(JSON.stringify({
                        type: 'auth_success',
                        message: 'Authentication successful'
                    }));
                    console.log(`User ${userId} authenticated`);
                    return userId;
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
                    return userId;
                }

                if (data.messageType === 'text') {
                    broadcastMessage({
                        type: 'message',
                        userId: userId,
                        messageType: 'text',
                        content: data.content,
                        timestamp: new Date().toISOString()
                    });
                } else if (data.messageType === 'media') {
                    try {
                        if (!process.env.GOOGLE_DRIVE_FOLDER_ID) {
                            throw new Error('Folder ID not configured');
                        }

                        const fileMetadata = {
                            name: `${Date.now()}_${data.fileName}`,
                            parents: [process.env.GOOGLE_DRIVE_FOLDER_ID]
                        };

                        // Create buffer from base64
                        const buffer = Buffer.from(data.content, 'base64');

                        // Create a readable stream
                        const { Readable } = require('stream');
                        const streamBuffer = new Readable();
                        streamBuffer._read = () => { };
                        streamBuffer.push(buffer);
                        streamBuffer.push(null);

                        const res = await new Promise((resolve, reject) => {
                            drive.files.create({
                                requestBody: fileMetadata,
                                media: {
                                    mimeType: data.mimeType,
                                    body: streamBuffer
                                },
                                fields: 'id, webViewLink'
                            }, (err, response) => {
                                if (err) reject(err);
                                else resolve(response);
                            });
                        });

                        await drive.permissions.create({
                            fileId: res.data.id,
                            requestBody: {
                                role: 'reader',
                                type: 'anyone'
                            }
                        });

                        const fileId = res.data.id;
                        const directLink = getDriveDirectLink(fileId);
                        console.log('Generated image URLs:', {
                            fileId,
                            directLink,
                            webViewLink: res.data.webViewLink
                        });
                        await new Promise(resolve => setTimeout(resolve, 1000));

                        broadcastMessage({
                            type: 'message',
                            userId: userId,
                            messageType: 'media',
                            fileName: data.fileName,
                            fileUrl: res.data.webViewLink,
                            directUrl: directLink,
                            mimeType: data.mimeType,
                            timestamp: new Date().toISOString()
                        });

                    } catch (error) {
                        console.error('File upload error:', error);
                        ws.send(JSON.stringify({
                            type: 'error',
                            message: `Upload failed: ${error.message}`,
                            details: JSON.stringify(error.response?.data || error)
                        }));
                    }
                }
                break;
        }
        return userId;
    } catch (error) {
        console.error('Message processing error:', error);
        ws.send(JSON.stringify({
            type: 'error',
            message: 'Failed to process message: ' + error.message
        }));
        return userId;
    }
};

// WebSocket connection handler
wss.on('connection', async (ws) => {
    console.log('New client connected');
    let userId = null;

    const sendChatHistory = async () => {
        try {
            const history = await loadChatHistory();
            ws.send(JSON.stringify({
                type: 'chat_history',
                messages: history
            }));
        } catch (error) {
            console.error('Error sending chat history:', error);
        }
    };

    ws.on('message', async (message) => {
        try {
            const data = JSON.parse(message);

            if (data.type === 'auth') {
                if (validUsers.includes(data.userId)) {
                    userId = data.userId;
                    connectedUsers.set(userId, ws);
                    ws.send(JSON.stringify({
                        type: 'auth_success',
                        message: 'Authentication successful'
                    }));
                    await sendChatHistory();
                    console.log(`User ${userId} authenticated`);
                } else {
                    ws.send(JSON.stringify({
                        type: 'auth_error',
                        message: 'Invalid user'
                    }));
                }
            } else {
                userId = await handleWebSocketMessage(ws, message, userId);
            }
        } catch (error) {
            console.error('Error processing message:', error);
        }
    });

    ws.on('close', () => {
        if (userId) {
            connectedUsers.delete(userId);
            console.log(`User ${userId} disconnected`);
        }
    });
});

// Chat management endpoints
app.get('/chat-history/clear', async (req, res) => {
    try {
        if (chatHistoryFileId) {
            await drive.files.update({
                fileId: chatHistoryFileId,
                media: {
                    mimeType: 'application/json',
                    body: JSON.stringify([])
                }
            });
        }
        res.json({ message: 'Chat history cleared' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to clear chat history' });
    }
});

app.get('/chat-history/status', async (req, res) => {
    try {
        const history = await loadChatHistory();
        res.json({
            messageCount: history.length,
            fileId: chatHistoryFileId,
            status: chatHistoryFileId ? 'active' : 'not initialized'
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to get chat history status' });
    }
});

// Test endpoints
app.get('/test-folder-access', async (req, res) => {
    try {
        const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
        console.log('Testing access to folder:', folderId);

        const folder = await drive.files.get({
            fileId: folderId,
            fields: 'id, name, capabilities'
        });

        res.json({
            success: true,
            folderDetails: folder.data,
            serviceAccountEmail: serviceAccount.client_email
        });
    } catch (error) {
        res.status(500).json({
            error: error.message,
            serviceAccountEmail: serviceAccount.client_email,
            details: error.response?.data
        });
    }
});

app.get('/debug/chat-history', async (req, res) => {
    try {
        const history = await loadChatHistory();
        res.json({
            historyFileId: chatHistoryFileId,
            messageCount: history.length,
            messages: history
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Initialize chat history when server starts
initializeChatHistoryFile().catch(console.error);

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log('Valid users:', validUsers);
    console.log('Folder ID:', process.env.GOOGLE_DRIVE_FOLDER_ID);
});