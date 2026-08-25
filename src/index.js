import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import App from './App';
import { PlatformAuthProvider } from './context/PlatformAuthContext';
import { muiTheme } from './styles/js/muiTheme';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <ThemeProvider theme={muiTheme}>
    <CssBaseline />
    <BrowserRouter>
      <PlatformAuthProvider>
        <App />
      </PlatformAuthProvider>
    </BrowserRouter>
  </ThemeProvider>
);
