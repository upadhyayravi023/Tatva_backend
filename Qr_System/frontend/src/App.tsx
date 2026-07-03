import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import ScannerPage from './pages/ScannerPage';
import AdminDashboard from './pages/AdminDashboard';
import { Toaster } from 'sonner';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/scanner" replace />} />
        <Route path="/scanner" element={<ScannerPage />} />
        <Route path="/admin" element={<AdminDashboard />} />
      </Routes>
      <Toaster position="top-center" richColors />
    </BrowserRouter>
  );
}

export default App;
