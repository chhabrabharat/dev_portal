import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // Match crm_frontend and patient_portal: expose REACT_APP_* vars to the client.
  envPrefix: ['VITE_', 'REACT_APP_'],
  plugins: [react()],
  server: {
    // 3000 is the CRM and 3001 the patient portal, so this takes the next one.
    port: 3002,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
});
