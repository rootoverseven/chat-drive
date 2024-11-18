import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
    Box,
    Paper,
    TextField,
    IconButton,
    Typography,
    List,
    ListItem,
    Container,
    Card,
    CardContent,
    CircularProgress,
    Button,
    Dialog
} from '@mui/material';
import { Send, AttachFile } from '@mui/icons-material';
import { useChat } from '../contexts/ChatContext';
import moment from 'moment';

const ImagePreview = ({ directUrl, fileUrl, fileName, shouldLoad }) => {
    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);
    const [isZoomed, setIsZoomed] = useState(false);

    const imageUrl = useMemo(() => {
        try {
            const fileId = directUrl.includes('lh3.googleusercontent.com')
                ? directUrl.split('/d/')[1].split('=')[0]
                : directUrl.split('id=')[1].split('&')[0];
            return `https://lh3.googleusercontent.com/d/${fileId}=w800`;
        } catch (error) {
            console.error('Error creating image URL:', error);
            return directUrl;
        }
    }, [directUrl]);

    return (
        <Card sx={{ maxWidth: 300, m: 1 }}>
            <Box sx={{ height: 200, position: 'relative' }}>
                {isLoading && shouldLoad && (
                    <Box sx={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor: 'background.default'
                    }}>
                        <CircularProgress />
                    </Box>
                )}
                {shouldLoad && (
                    <img
                        src={imageUrl}
                        alt={fileName}
                        onLoad={() => setIsLoading(false)}
                        onError={() => {
                            setIsLoading(false);
                            setHasError(true);
                        }}
                        style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            cursor: 'pointer',
                            display: isLoading ? 'none' : (hasError ? 'none' : 'block')
                        }}
                        onClick={() => setIsZoomed(true)}
                    />
                )}
                {(!shouldLoad || hasError) && (
                    <Box sx={{
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 1,
                        p: 2
                    }}>
                        <Typography color="error" variant="body2">
                            {!shouldLoad ? 'Loading...' : 'Failed to load preview'}
                        </Typography>
                        <Button
                            variant="outlined"
                            size="small"
                            href={fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            Open original
                        </Button>
                    </Box>
                )}
            </Box>
            <CardContent>
                <Typography variant="caption">
                    {fileName}
                </Typography>
            </CardContent>

            <Dialog
                open={isZoomed}
                onClose={() => setIsZoomed(false)}
                maxWidth="xl"
            >
                <Box sx={{
                    position: 'relative',
                    maxWidth: '90vw',
                    maxHeight: '90vh',
                    overflow: 'auto'
                }}>
                    <img
                        src={imageUrl}
                        alt={fileName}
                        style={{
                            maxWidth: '100%',
                            maxHeight: '90vh',
                            objectFit: 'contain'
                        }}
                        onClick={() => setIsZoomed(false)}
                    />
                </Box>
            </Dialog>
        </Card>
    );
};

const MessageList = ({ messages, user }) => {
    const [loadIndex, setLoadIndex] = useState(0);
    const mediaMessages = useMemo(() =>
        messages.filter(msg => msg.messageType === 'media'),
        [messages]
    );

    useEffect(() => {
        if (loadIndex < mediaMessages.length) {
            const timer = setTimeout(() => {
                setLoadIndex(prev => prev + 1);
            }, 1000); // Load next image after 1 second

            return () => clearTimeout(timer);
        }
    }, [loadIndex, mediaMessages.length]);

    return (
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
                        <ImagePreview
                            directUrl={message.directUrl}
                            fileUrl={message.fileUrl}
                            fileName={message.fileName}
                            shouldLoad={mediaMessages.indexOf(message) < loadIndex}
                        />
                    )}
                </ListItem>
            ))}
        </List>
    );
};

function Chat() {
    const { user, messages, sendMessage, connected, isUploading } = useChat();
    const [newMessage, setNewMessage] = useState('');
    const fileInputRef = useRef();
    const messagesEndRef = useRef();

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = (e) => {
        e.preventDefault();
        if (newMessage.trim()) {
            sendMessage(newMessage);
            setNewMessage('');
        }
    };

    const handleFileSelect = async (e) => {
        const file = e.target.files[0];
        if (file) {
            try {
                if (file.size > 10 * 1024 * 1024) {
                    alert('File size should be less than 10MB');
                    return;
                }

                const allowedTypes = [
                    'image/jpeg',
                    'image/png',
                    'image/gif',
                    'image/webp',
                    'application/pdf',
                    'application/msword',
                    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
                ];

                if (!allowedTypes.includes(file.type)) {
                    alert('File type not supported. Please upload images, PDFs, or Word documents.');
                    return;
                }

                const base64Content = await new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = () => {
                        try {
                            const base64 = reader.result.split(',')[1];
                            resolve(base64);
                        } catch (error) {
                            reject(error);
                        }
                    };
                    reader.onerror = reject;
                    reader.readAsDataURL(file);
                });

                await sendMessage(null, 'media', {
                    fileName: file.name,
                    mimeType: file.type,
                    content: base64Content
                });

            } catch (error) {
                console.error('File handling error:', error);
                alert('Error processing file: ' + error.message);
            } finally {
                if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                }
            }
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
                    <MessageList messages={messages} user={user} />
                    <div ref={messagesEndRef} />
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
                        accept=".jpg,.jpeg,.png,.gif,.pdf,.doc,.docx"
                    />
                    <IconButton
                        onClick={() => fileInputRef.current.click()}
                        disabled={!connected || isUploading}
                    >
                        {isUploading ? <CircularProgress size={24} /> : <AttachFile />}
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