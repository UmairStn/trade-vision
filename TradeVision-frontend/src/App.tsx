import { useEffect } from 'react';
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { StockProvider } from './context/StockContext';
import { ChatProvider } from './context/ChatContext';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/Auth/ProtectedRoute';

import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { ChatWidget } from './components/ChatWidget';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Toaster } from './components/ui/Toaster';
import { TooltipProvider } from './components/ui/Tooltip';
import { IconContext } from '@phosphor-icons/react';

import { Home } from './pages/Home';
import { StockAnalyzer } from './pages/StockAnalyzer';
import { TopStocks } from './pages/TopStocks';
import { NewsHub } from './pages/NewsHub';
import { Dashboard } from './pages/Dashboard';
import { Chat } from './pages/Chat';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { NotFound } from './pages/NotFound';

/** Scrolls to the top on page-level navigation. Without this, a new page opens
 *  at whatever scroll offset the previous page was left at — the single biggest
 *  contributor to a route change feeling "broken". Nested-route changes (the
 *  dashboard's section tabs) keep the current scroll position, because the
 *  sidebar and header the user is working against stay put. */
const ScrollToTop = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    const pageKey = pathname.split('/').filter(Boolean)[0] ?? 'home';
    if (pageKey !== ScrollToTop.lastPageKey) {
      window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
      ScrollToTop.lastPageKey = pageKey;
    }
  }, [pathname]);
  return null;
};
// Module-level so it survives re-renders of this tiny component.
ScrollToTop.lastPageKey = '';

/** Keys <main> by the top-level route segment, so each *page* navigation
 *  replays the transition — but a nested-route change inside a page (the
 *  dashboard's Overview/Holdings/Watchlist/Alerts tabs) swaps only the
 *  section content. Keying by the full pathname remounted the whole page
 *  on every tab click: sidebar, header, data fetch and all. */
const AnimatedRoutes = () => {
  const location = useLocation();
  const pageKey = location.pathname.split('/').filter(Boolean)[0] ?? 'home';
  return (
    <main
      id="main"
      className="flex-1 animate-page-transition"
      key={pageKey}
    >
      {/* Inside <main> so a render crash keeps the navbar and footer
          usable — the user can still navigate away from it. */}
      <ErrorBoundary>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/analyzer" element={<StockAnalyzer />} />
          <Route path="/top-stocks" element={<TopStocks />} />
          <Route path="/news" element={<NewsHub />} />
          <Route
            path="/dashboard/*"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/chat"
            element={
              <ProtectedRoute>
                <Chat />
              </ProtectedRoute>
            }
          />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </ErrorBoundary>
    </main>
  );
};

const App = () => (
  <ThemeProvider>
    <AuthProvider>
      <StockProvider>
        {/* Inside StockProvider: chat surfaces sit alongside market data, and the
            widget lives inside the router so it can read the current route. */}
        <ChatProvider>
          <TooltipProvider>
            <IconContext.Provider value={{ weight: 'light' }}>
              <BrowserRouter>
                <ScrollToTop />
                <div className="flex min-h-dvh flex-col bg-page font-sans text-ink">
                {/* First tab stop on every page. Five nav links plus a theme
                    toggle is a lot to tab past to reach the content. */}
                <a
                  href="#main"
                  className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50
                             focus:rounded-md focus:bg-brand focus:px-4 focus:py-2
                             focus:text-sm focus:font-medium focus:text-on-brand"
                >
                  Skip to content
                </a>

                <Navbar />

                <AnimatedRoutes />

                <Footer />
                <ChatWidget />
                <Toaster />
              </div>
              </BrowserRouter>
            </IconContext.Provider>
          </TooltipProvider>
        </ChatProvider>
      </StockProvider>
    </AuthProvider>
  </ThemeProvider>
);

export default App;
