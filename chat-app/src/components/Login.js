// src/components/Login.js
import React, { useState } from 'react';
import {
  Box,
  Button,
  Container,
  Paper,
  Typography,
  RadioGroup,
  FormControlLabel,
  Radio
} from '@mui/material';
import { useChat } from '../contexts/ChatContext';
import Chat from './Chat';

function Login() {
  const { user, setUser } = useChat();
  const [selectedUser, setSelectedUser] = useState('');

  const handleLogin = () => {
    setUser(selectedUser);
  };

  if (user) {
    return <Chat />;
  }

  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <Paper elevation={3} sx={{ p: 4, width: '100%' }}>
          <Typography variant="h5" gutterBottom>
            Select User
          </Typography>
          <RadioGroup
            value={selectedUser}
            onChange={(e) => setSelectedUser(e.target.value)}
          >
            <FormControlLabel value="pui" control={<Radio />} label="Pui" />
            <FormControlLabel value="loze" control={<Radio />} label="Loze" />
          </RadioGroup>
          <Button
            variant="contained"
            fullWidth
            onClick={handleLogin}
            disabled={!selectedUser}
            sx={{ mt: 2 }}
          >
            Enter Chat
          </Button>
        </Paper>
      </Box>
    </Container>
  );
}

export default Login;