// src/components/Chat.js
import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Paper,
  TextField,
  IconButton,
  Typography,
  List,
  ListItem,
  ListItemText,
  Container,
  Button
} from '@mui/material';
import { Send, AttachFile } from '@mui/icons-material';
import { useChat } from '../contexts/ChatContext';
import moment from 'moment';

function Chat() {
  const { user, messages, sendMessage, connected } = useChat();
  const [newMessage, setNewMessage] = useState('');
  const fileInputRef = useRef();
  const messagesEndRef = useRef();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = (e) => {
    e.preventDefault();
    if (newMessage.trim()) {
      sendMessage(newMessage);
      setNewMessage('');
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      sendMessage(null, 'media', file);
    }
  };

  return (
    <Container maxWidth="md">
      <Paper
        elevation={3}
        sx={{
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <Box sx={{ p: 2, backgroundColor: 'primary.main', color: 'white' }}>
          <Typography variant="h6">
            Chat as {user} {connected ? '(Connected)' : '(Disconnected)'}
          </Typography>
        </Box>

        <Box sx={{ flexGrow: 1, overflow: 'auto', p: 2 }}>
          <List>
            {messages.map((message, index) => (
              <ListItem
                key={index}
                sx={{
                  flexDirection: 'column',
                  alignItems: message.userId === user ? 'flex-end' : 'flex-start',
                }}
              >
                <Typography variant="caption" color="textSecondary">
                  {message.userId} - {moment(message.timestamp).format('HH:mm')}
                </Typography>
                {message.messageType === 'text' ? (
                  <Paper
                    sx={{
                      p: 1,
                      backgroundColor: message.userId === user ? 'primary.light' : 'grey.200',
                      color: message.userId === user ? 'white' : 'black',
                      maxWidth: '70%',
                    }}
                  >
                    <Typography>{message.content}</Typography>
                  </Paper>
                ) : (
                  <Box>
                    <Button
                      variant="text"
                      href={message.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {message.fileName}
                    </Button>
                  </Box>
                )}
              </ListItem>
            ))}
            <div ref={messagesEndRef} />
          </List>
        </Box>

        <Box
          component="form"
          onSubmit={handleSend}
          sx={{
            p: 2,
            backgroundColor: 'background.default',
            display: 'flex',
            gap: 1,
          }}
        >
          <input
            type="file"
            ref={fileInputRef}
            style={{ display: 'none' }}
            onChange={handleFileSelect}
          />
          <IconButton
            onClick={() => fileInputRef.current.click()}
            disabled={!connected}
          >
            <AttachFile />
          </IconButton>
          <TextField
            fullWidth
            variant="outlined"
            placeholder="Type a message"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            disabled={!connected}
            size="small"
          />
          <IconButton
            type="submit"
            color="primary"
            disabled={!connected || !newMessage.trim()}
          >
            <Send />
          </IconButton>
        </Box>
      </Paper>
    </Container>
  );
}

export default Chat;