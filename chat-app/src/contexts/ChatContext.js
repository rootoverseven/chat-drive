// src/contexts/ChatContext.js
import React, { createContext, useState, useContext, useEffect } from 'react';

const ChatContext = createContext();

export const useChat = () => useContext(ChatContext);

export const ChatProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [ws, setWs] = useState(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (user && !ws) {
      const websocket = new WebSocket('ws://localhost:3001');
      
      websocket.onopen = () => {
        console.log('Connected to server');
        websocket.send(JSON.stringify({
          type: 'auth',
          userId: user
        }));
      };

      websocket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        if (data.type === 'auth_success') {
          setConnected(true);
        } else if (data.type === 'message') {
          setMessages(prev => [...prev, data]);
        }
      };

      websocket.onclose = () => {
        setConnected(false);
        setWs(null);
      };

      setWs(websocket);
    }

    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, [user]);

  const sendMessage = (content, type = 'text', file = null) => {
    if (!ws || !connected) return;

    if (type === 'text') {
      ws.send(JSON.stringify({
        type: 'message',
        messageType: 'text',
        content
      }));
    } else if (type === 'media' && file) {
      const reader = new FileReader();
      reader.onload = () => {
        const base64Content = reader.result.split(',')[1];
        ws.send(JSON.stringify({
          type: 'message',
          messageType: 'media',
          fileName: file.name,
          mimeType: file.type,
          content: base64Content
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <ChatContext.Provider value={{
      user,
      setUser,
      messages,
      sendMessage,
      connected
    }}>
      {children}
    </ChatContext.Provider>
  );
};