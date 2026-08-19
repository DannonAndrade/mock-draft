import { Link, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import DraftBaseLogo from '../assets/DraftBase-Logo.svg';

export default function Layout() {
  const { user, loading } = useAuth();
  const location = useLocation();
  const activeDraftId = localStorage.getItem('activeDraftId');

  return (
    <div className="min-h-screen bg-[#f1f5f9] flex flex-col font-sans">
      <header className="sticky top-0 z-50 bg-[#0081C6] border-b border-[#00679e] shadow-md h-16 text-white">
        <div className="max-w-screen-2xl mx-auto px-6 h-full flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 hover:opacity-90 transition font-sans">
            <img src={DraftBaseLogo} alt="DraftBase Logo" className="h-8 w-auto object-contain" />
            <span className="text-xl font-extrabold tracking-tight text-white">DraftBase</span>
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
              to="/nfl-draft"
              className={`text-sm font-semibold transition py-5 border-b-2 h-full flex items-center ${
                location.pathname.startsWith('/nfl-draft')
                  ? 'text-white border-[#022A53]'
                  : 'text-blue-50 border-transparent hover:text-white hover:border-[#022A53]/55'
              }`}
            >
              NFL Draft
            </Link>
            <Link
              to="/fantasy"
              className={`text-sm font-semibold transition py-5 border-b-2 h-full flex items-center ${
                location.pathname.startsWith('/fantasy')
                  ? 'text-white border-[#022A53]'
                  : 'text-blue-50 border-transparent hover:text-white hover:border-[#022A53]/55'
              }`}
            >
              Fantasy
            </Link>
          </nav>

          <div className="flex items-center gap-4">
            <Link
              to="/nfl-draft"
              className="md:hidden bg-white/10 hover:bg-white/20 text-white text-xs font-bold px-3 py-2 rounded-lg transition-colors"
            >
              NFL Draft
            </Link>
            <Link
              to="/fantasy"
              className="md:hidden bg-white/10 hover:bg-white/20 text-white text-xs font-bold px-3 py-2 rounded-lg transition-colors"
            >
              Fantasy
            </Link>
            {user ? (
              <Link
                to="/account"
                aria-label="Open account"
                className={`flex items-center gap-2 rounded-full px-1.5 py-1 transition hover:bg-white/10 ${
                  location.pathname === '/account' ? 'bg-white/15' : ''
                }`}
              >
                {user.avatarUrl && (
                  <img src={user.avatarUrl} alt="" referrerPolicy="no-referrer" className="h-8 w-8 rounded-full border border-white/30" />
                )}
                {!user.avatarUrl && (
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#022A53] text-xs font-black text-white">
                    {user.displayName.slice(0, 1).toUpperCase()}
                  </span>
                )}
                <span className="hidden max-w-32 truncate text-xs font-semibold lg:inline">{user.displayName}</span>
              </Link>
            ) : !loading ? (
              <Link to="/signin" className="bg-white text-[#022A53] text-xs sm:text-sm font-bold px-3.5 py-2 rounded-lg hover:bg-blue-50 transition-colors">
                Sign in
              </Link>
            ) : null}
            {user && activeDraftId && !location.pathname.includes(`/draft/${activeDraftId}`) && (
              <Link
              to={`/nfl-draft/draft/${activeDraftId}`}
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
