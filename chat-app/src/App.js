// src/App.js
import React from 'react';
import { ThemeProvider, createTheme } from '@mui/material';
import Chat from './components/Chat';
import Login from './components/Login';
import { ChatProvider } from './contexts/ChatContext';

const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <ChatProvider>
        <div style={{ height: '100vh' }}>
          <Login />
        </div>
      </ChatProvider>
    </ThemeProvider>
  );
}

export default App;