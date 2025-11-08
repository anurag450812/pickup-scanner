import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { useEffect, useState } from 'react';

// Import pages
import Home from './pages/Home';
import Scan from './pages/Scan';
import List from './pages/List';
import Search from './pages/Search';
import { BottomNav } from './components/BottomNav';

// Create React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  const [isDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved === 'true' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only handle shortcuts when not typing in an input
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (event.key.toLowerCase()) {
        case 's':
          if (!event.ctrlKey && !event.metaKey) {
            event.preventDefault();
            window.location.href = '/scan';
          }
          break;
        case '/':
          event.preventDefault();
          window.location.href = '/search';
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-transparent">
        <Router>
          <AppFrame />
        </Router>
        <Toaster position="top-center" richColors theme={isDarkMode ? 'dark' : 'light'} />
      </div>
    </QueryClientProvider>
  );
}

function AppFrame() {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-xl flex-col overflow-hidden border-x border-slate-200 dark:border-slate-800">
      <div className="flex-1 overflow-y-auto bg-white dark:bg-slate-900">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/scan" element={<Scan />} />
          <Route path="/list" element={<List />} />
          <Route path="/search" element={<Search />} />
        </Routes>
      </div>
      <BottomNav />
    </div>
  );
}

export default App;
