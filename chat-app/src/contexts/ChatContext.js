// src/contexts/ChatContext.js
import React, { createContext, useState, useContext, useEffect } from 'react';

const ChatContext = createContext();

export const useChat = () => useContext(ChatContext);

export const ChatProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [ws, setWs] = useState(null);
  const [connected, setConnected] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

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
              console.log('Received websocket message:', data.type);
              
              if (data.type === 'auth_success') {
                  setConnected(true);
                  console.log('Authentication successful');
              } 
              else if (data.type === 'chat_history') {
                  console.log('Received chat history:', data.messages.length, 'messages');
                  setMessages(data.messages);
              } 
              else if (data.type === 'message') {
                  setMessages(prev => [...prev, data]);
                  console.log('New message added');
              }
          };

          websocket.onclose = () => {
              console.log('WebSocket disconnected');
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

  // src/contexts/ChatContext.js

// src/contexts/ChatContext.js
// src/contexts/ChatContext.js

const sendMessage = async (content, type = 'text', fileData = null) => {
  if (!ws || !connected) {
      console.error('No connection available');
      return;
  }

  try {
      if (type === 'text') {
          ws.send(JSON.stringify({
              type: 'message',
              messageType: 'text',
              content
          }));
      } else if (type === 'media' && fileData) {
          console.log('Sending file data to server...');
          setIsUploading(true);

          ws.send(JSON.stringify({
              type: 'message',
              messageType: 'media',
              fileName: fileData.fileName,
              mimeType: fileData.mimeType,
              content: fileData.content
          }));
      }
  } catch (error) {
      console.error('Error in sendMessage:', error);
      alert('Error sending message: ' + error.message);
  } finally {
      setIsUploading(false);
  }
};

  return (
    <ChatContext.Provider value={{
      user,
      setUser,
      messages,
      sendMessage,
      connected,
      isUploading
    }}>
      {children}
    </ChatContext.Provider>
  );
};