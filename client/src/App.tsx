import { BrowserRouter, Navigate, Routes, Route, useParams } from 'react-router-dom';
import Home from './pages/Home';
import DraftRoom from './pages/DraftRoom';
import Layout from './components/Layout';
import DraftBoard from './pages/DraftBoard';
import SignIn from './pages/SignIn';
import Simulator from './pages/Simulator';
import Account from './pages/Account';
import NflDraft from './pages/NflDraft';
import Fantasy from './pages/Fantasy';
import NewFantasyBoard from './pages/NewFantasyBoard';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/signin" element={<SignIn />} />
          <Route path="/account" element={<Account />} />
          <Route path="/nfl-draft" element={<NflDraft />} />
          <Route path="/nfl-draft/simulator" element={<Simulator />} />
          <Route path="/nfl-draft/draft/:draftId" element={<DraftRoom />} />
          <Route path="/fantasy" element={<Fantasy />} />
          <Route path="/fantasy/draft-boards/new" element={<NewFantasyBoard />} />
          <Route path="/fantasy/draft-boards/:boardId" element={<DraftBoard />} />
          <Route path="/fantasy/draft-board" element={<Navigate to="/fantasy" replace />} />
          <Route path="/simulator" element={<Navigate to="/nfl-draft/simulator" replace />} />
          <Route path="/board" element={<Navigate to="/fantasy" replace />} />
          <Route path="/draft/:draftId" element={<LegacyDraftRedirect />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

function LegacyDraftRedirect() {
  const { draftId } = useParams();
  return <Navigate to={`/nfl-draft/draft/${draftId ?? ''}`} replace />;
}

export default App;
