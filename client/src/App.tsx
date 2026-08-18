import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import DraftRoom from './pages/DraftRoom';
import Layout from './components/Layout';
import DraftBoard from './pages/DraftBoard';
import SignIn from './pages/SignIn';
import Simulator from './pages/Simulator';
import Account from './pages/Account';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/signin" element={<SignIn />} />
          <Route path="/simulator" element={<Simulator />} />
          <Route path="/account" element={<Account />} />
          <Route path="/board" element={<DraftBoard />} />
          <Route path="/draft/:draftId" element={<DraftRoom />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
