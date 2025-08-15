import { Suspense, useEffect, lazy } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useNavigate,
} from 'react-router-dom';
import './App.css';
import { FullScreenLoader } from './components/loader';
import { AppLayout } from './pages/Layout';
import { useAuth } from './hooks/useAuth';
import { getApiStatus } from './lib/api/health';

// Lazy load route components
const LoginScreen = lazy(() => import('./pages/auth/Login'));
const Home = lazy(() => import('./pages/Home'));

const ProtectedRoute: React.FC = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user && !loading) {
      navigate('/login');
    }
  }, [user, navigate, loading]);

  if (loading) {
    return <FullScreenLoader />;
  }

  return <AppLayout />;
};

function App() {
  useEffect(() => {
    getApiStatus().then(res => {
      console.log('App is running, Status', res);
    });
  }, []);
  return (
    <>
      <Suspense fallback={<FullScreenLoader />}>
        <Router>
          <Routes>
            <Route path="/" element={<ProtectedRoute />}>
              <Route index element={<Home />} />
            </Route>
            <Route path="/login" element={<LoginScreen />} />
            <Route path="*" element={<Navigate to={'/'} />} />
          </Routes>
        </Router>
      </Suspense>
    </>
  );
}

export default App;
