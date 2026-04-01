import { Routes, Route } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { HomePage } from './pages/HomePage';
import { ProjectPage } from './pages/ProjectPage';
import { TemplatesPage } from './pages/TemplatesPage';
import { SettingsPage } from './pages/SettingsPage';

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/project/:id" element={<ProjectPage />} />
        <Route path="/templates" element={<TemplatesPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>
    </Routes>
  );
}
