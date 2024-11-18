// getRefreshToken.js
const express = require('express');
const { google } = require('googleapis');

const app = express();

// Replace these with your credentials
const CLIENT_ID = 'your_client_id';
const CLIENT_SECRET = 'your_client_secret';
const REDIRECT_URI = 'http://localhost:3000/oauth2callback';

const oauth2Client = new google.auth.OAuth2(
    CLIENT_ID,
    CLIENT_SECRET,
    REDIRECT_URI
);

// Generate authentication URL
const scopes = [
    'https://www.googleapis.com/auth/drive.file',
    'https://www.googleapis.com/auth/drive.appdata',
    'https://www.googleapis.com/auth/drive.metadata',
];

const authorizationUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    include_granted_scopes: true
});

// Route to start auth flow
app.get('/', (req, res) => {
    res.redirect(authorizationUrl);
});

// OAuth2 callback route
app.get('/oauth2callback', async (req, res) => {
    const { code } = req.query;

    try {
        const { tokens } = await oauth2Client.getToken(code);
        console.log('Refresh Token:', tokens.refresh_token);
        console.log('Access Token:', tokens.access_token);
        res.send('Success! Check console for tokens.');
    } catch (error) {
        console.error('Error getting tokens:', error);
        res.send('Error getting tokens');
    }
});

app.listen(3000, () => {
    console.log('Server running on port 3000');
    console.log('Visit http://localhost:3000 to start authentication');
});