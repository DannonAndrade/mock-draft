import { Link, Outlet, useLocation } from 'react-router-dom';
import { useUserId } from '../hooks/useUserId';
import DraftBaseLogo from '../assets/DraftBase-Logo.svg';

export default function Layout() {
  const userId = useUserId();
  const location = useLocation();
  const activeDraftId = localStorage.getItem('activeDraftId');

  return (
    <div className="min-h-screen bg-[#f1f5f9] flex flex-col font-sans">
      <header className="sticky top-0 z-50 bg-[#0081C6] border-b border-[#00679e] shadow-md h-16 text-white">
        <div className="max-w-screen-2xl mx-auto px-6 h-full flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 hover:opacity-90 transition font-sans">
            <img src={DraftBaseLogo} alt="DraftBase Logo" className="h-8 w-auto object-contain" />
            <span className="text-xl font-extrabold tracking-tight text-white">
              DraftBase <span className="text-[#022A53] font-black">Simulator</span>
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-6 h-full">
            <Link
              to="/"
              className={`text-sm font-semibold transition py-5 border-b-2 h-full flex items-center ${
                location.pathname === '/'
                  ? 'text-white border-[#022A53]'
                  : 'text-blue-50 border-transparent hover:text-white hover:border-[#022A53]/55'
              }`}
            >
              Home
            </Link>
            <Link
              to="/board"
              className={`text-sm font-semibold transition py-5 border-b-2 h-full flex items-center ${
                location.pathname === '/board'
                  ? 'text-white border-[#022A53]'
                  : 'text-blue-50 border-transparent hover:text-white hover:border-[#022A53]/55'
              }`}
            >
              Draft Board
            </Link>
          </nav>

          <div className="flex items-center gap-4">
            <Link
              to="/board"
              className="md:hidden bg-white/10 hover:bg-white/20 text-white text-xs font-bold px-3 py-2 rounded-lg transition-colors"
            >
              Board
            </Link>
            {userId && (
              <div className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#022A53]/80 text-blue-100 text-xs font-semibold rounded-full border border-blue-200/20">
                <span className="w-1.5 h-1.5 bg-blue-300 rounded-full animate-pulse" />
                <span className="opacity-75 font-mono">{userId.slice(0, 8)}...</span>
              </div>
            )}
            {activeDraftId && !location.pathname.includes(`/draft/${activeDraftId}`) && (
              <Link
                to={`/draft/${activeDraftId}`}
                className="bg-[#022A53] hover:bg-[#011f40] text-white text-xs sm:text-sm font-semibold px-3.5 py-2 rounded-lg transition-colors"
              >
                Resume Draft
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col">
        <Outlet />
      </main>
    </div>
  );
}
