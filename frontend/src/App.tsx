import { Suspense, useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useNavigate,
} from "react-router-dom";
import "./App.css";
import { FullScreenLoader } from "@/components/loader";
import LoginScreen from "@/pages/auth/Login";
import SignupScreen from "@/pages/auth/Register";
import ForgotPasswordScreen from "@/pages/auth/ForgotPassword";
import { AppLayout } from "./pages/Layout";
import { useAuth } from "@/hooks/useAuth";
import Home from "./pages/Home";

const ProtectedRoute: React.FC = () => {
  const { user, loading } = useAuth();

  const navigate = useNavigate();

  useEffect(() => {
    if (!user && !loading) {
      navigate("/login");
    }
  }, [user, navigate, loading]);

  if (loading) {
    return <FullScreenLoader />;
  }

  return <AppLayout />;
};

function App() {
  return (
    <>
      <Suspense fallback={<FullScreenLoader />}>
        <Router>
          <Routes>
            <Route path="/" element={<ProtectedRoute />}>
              <Route index element={<Home />} />
            </Route>
            <Route path="/login" element={<LoginScreen />} />
            <Route path="/signup" element={<SignupScreen />} />
            <Route path="/forgot-password" element={<ForgotPasswordScreen />} />
            <Route path="*" element={<Navigate to={"/"} />} />
          </Routes>
        </Router>
      </Suspense>
    </>
  );
}

export default App;
