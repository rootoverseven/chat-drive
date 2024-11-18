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
        {/* <img src="https://lh3.googleusercontent.com/d/1xfgIHaaFPkJxM3addEaGDQ3vts5etWHH=w800" alt="okok"/>
    <img class="MuiCardMedia-root MuiCardMedia-media MuiCardMedia-img css-umblch-MuiCardMedia-root" src="https://drive.google.com/thumbnail?id=1xfgIHaaFPkJxM3addEaGDQ3vts5etWHH&amp;sz=w1000" height="200" alt="WhatsApp Image 2024-11-18 at 12.57.16_e65d4971.jpg"/>
    <img src="https://drive.google.com/thumbnail?id=1xfgIHaaFPkJxM3addEaGDQ3vts5etWHH&amp;sz=w800" alt="WhatsApp Image 2024-11-18 at 12.57.16_e65d4971.jpg" loading="lazy" /> */}

        <Login />
        </div>
      </ChatProvider>
    </ThemeProvider>
  );
}

export default App;