import { useState, useEffect } from 'react';
import { Navbar } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';
import { HomePage } from './pages/HomePage';
import { ExplorePage } from './pages/ExplorePage';
import { DashboardPage } from './pages/DashboardPage';
import { HowItWorksPage } from './pages/HowItWorksPage';
import { AnalyzeUrlModal } from './components/common/AnalyzeUrlModal';
import { restaurantService } from './services/restaurantService';
import type { Restaurant } from './types/restaurant';

type ViewType = 'home' | 'explore' | 'dashboard' | 'how-it-works';

export function App() {
  const [currentView, setCurrentView] = useState<ViewType>('home');
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<string>('pizza-4ps-trang-tien');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [allRestaurants, setAllRestaurants] = useState<Restaurant[]>([]);
  const [isAnalyzeModalOpen, setIsAnalyzeModalOpen] = useState(false);

  const loadRestaurants = async () => {
    const data = await restaurantService.getAllRestaurants();
    setAllRestaurants(data);
  };

  useEffect(() => {
    loadRestaurants();
  }, []);

  // Window history/hash listener for deep linking & browser back/forward support
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      if (!hash || hash === '' || hash === 'home') {
        setCurrentView('home');
      } else if (hash.startsWith('restaurant/')) {
        const id = hash.replace('restaurant/', '');
        setSelectedRestaurantId(id);
        setCurrentView('dashboard');
      } else if (hash.startsWith('explore')) {
        setCurrentView('explore');
      } else if (hash === 'how-it-works') {
        setCurrentView('how-it-works');
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    handleHashChange();
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const navigateTo = (view: ViewType, restaurantId?: string) => {
    setCurrentView(view);
    if (view === 'dashboard' && restaurantId) {
      setSelectedRestaurantId(restaurantId);
      window.location.hash = `restaurant/${restaurantId}`;
    } else if (view === 'explore') {
      window.location.hash = 'explore';
    } else if (view === 'how-it-works') {
      window.location.hash = 'how-it-works';
    } else {
      window.location.hash = 'home';
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleHeroSearch = (query: string) => {
    // Nếu người dùng dán link Foody vào ô tìm kiếm -> mở modal phân tích tự động!
    if (query.includes('foody.vn')) {
      setIsAnalyzeModalOpen(true);
      return;
    }
    setSearchQuery(query);
    setCurrentView('explore');
    window.location.hash = `explore?q=${encodeURIComponent(query)}`;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectRestaurant = (id: string) => {
    setSelectedRestaurantId(id);
    setCurrentView('dashboard');
    window.location.hash = `restaurant/${id}`;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAnalysisSuccess = async (restaurantId: string) => {
    await loadRestaurants();
    handleSelectRestaurant(restaurantId);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FAFAF8] text-[#18181B]">
      {/* Top Navigation */}
      <Navbar
        currentView={currentView}
        onNavigate={navigateTo}
        onOpenSearch={() => navigateTo('explore')}
        onOpenAnalyzeModal={() => setIsAnalyzeModalOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1">
        {currentView === 'home' && (
          <HomePage
            restaurants={allRestaurants}
            onSelectRestaurant={handleSelectRestaurant}
            onSearch={handleHeroSearch}
            onNavigateExplore={() => navigateTo('explore')}
            onNavigateHowItWorks={() => navigateTo('how-it-works')}
          />
        )}

        {currentView === 'explore' && (
          <ExplorePage
            initialQuery={searchQuery}
            onSelectRestaurant={handleSelectRestaurant}
            onOpenAnalyzeModal={() => setIsAnalyzeModalOpen(true)}
          />
        )}

        {currentView === 'dashboard' && (
          <DashboardPage
            restaurantId={selectedRestaurantId}
            onBackToExplore={() => navigateTo('explore')}
          />
        )}

        {currentView === 'how-it-works' && (
          <HowItWorksPage
            onNavigateExplore={() => navigateTo('explore')}
          />
        )}
      </main>

      {/* Modal Phân tích link Foody mới */}
      <AnalyzeUrlModal
        isOpen={isAnalyzeModalOpen}
        onClose={() => setIsAnalyzeModalOpen(false)}
        onSuccess={handleAnalysisSuccess}
      />

      {/* Footer */}
      <Footer onNavigate={navigateTo} />
    </div>
  );
}

export default App;
