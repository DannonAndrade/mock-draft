import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import DraftRoom from './pages/DraftRoom';
import Layout from './components/Layout';
import DraftBoard from './pages/DraftBoard';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/board" element={<DraftBoard />} />
          <Route path="/draft/:draftId" element={<DraftRoom />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
