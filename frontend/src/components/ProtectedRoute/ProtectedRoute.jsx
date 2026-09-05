import { Navigate } from "react-router-dom";
import { isValidJwt } from "../../utils/auth";
import logger from "../../utils/logger";

function ProtectedRoute({ children }) {
  try {
    const token = localStorage.getItem("token");

    if (!isValidJwt(token)) {
      localStorage.removeItem("token");
      return <Navigate to="/login" replace />;
    }

    return children;
  } catch (error) {
    logger.error("route.protected_auth_check.failed", error);
    return <Navigate to="/login" replace />;
  }
}

export default ProtectedRoute;
