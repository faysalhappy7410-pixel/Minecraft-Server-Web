/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { ScrollToTop } from './components/ScrollToTop';
import { Layout } from './components/Layout';
import { HomePage } from './pages/HomePage';
import { InformationPage } from './pages/InformationPage';
import { CommunityPage } from './pages/CommunityPage';
import { LinksPage } from './pages/LinksPage';
import { LoginPage, RegisterPage } from './pages/AuthPages';
import { ProfilePage } from './pages/ProfilePage';
import { AdminPage } from './pages/AdminPage';
import { NotFoundPage } from './pages/NotFoundPage';

export default function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <AppProvider>
        <Layout>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/information" element={<InformationPage />} />
            <Route path="/community" element={<CommunityPage />} />
            <Route path="/links" element={<LinksPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/admin" element={<AdminPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Layout>
      </AppProvider>
    </BrowserRouter>
  );
}
