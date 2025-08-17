import { Suspense, lazy } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom';
import { FullScreenLoader } from './components/loader';
import { AppLayout } from './pages/Layout';

const Home = lazy(() => import('./pages/Home'));

function App() {
  return (
    <>
      <Suspense fallback={<FullScreenLoader />}>
        <Router>
          <Routes>
            <Route path="/" element={<AppLayout />}>
              <Route index element={<Home />} />
            </Route>
            <Route path="*" element={<Navigate to={'/'} />} />
          </Routes>
        </Router>
      </Suspense>
    </>
  );
}

export default App;
