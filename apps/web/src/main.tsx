import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { MatchPage } from './presentation/pages/MatchPage.js';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MatchPage />
  </StrictMode>
);
