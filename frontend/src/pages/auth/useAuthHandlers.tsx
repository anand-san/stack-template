import { AuthError } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export default function useAuthHandlers() {
  const navigate = useNavigate();

  const handleAuthError = (error: AuthError) => {
    switch (error.code) {
      case "auth/user-not-found":
      case "auth/wrong-password":
      case "auth/invalid-email":
      case "auth/invalid-credential":
        toast.error("Uh oh! Something went wrong.", {
          description: "Invalid email or password",
        });
        break;
      case "auth/too-many-requests":
        toast.error("Uh oh! Something went wrong.", {
          description: "Too many login attempts. Please try again later.",
        });
        break;
      default:
        toast.error("Uh oh! Something went wrong.", {
          description: "An error occurred. Please try again.",
        });
    }
  };

  const handleSuccessfulAuth = () => {
    navigate("/");
  };

  return {
    handleSuccessfulAuth,
    handleAuthError,
  };
}
