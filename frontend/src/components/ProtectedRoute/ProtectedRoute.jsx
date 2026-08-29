import { Navigate } from "react-router-dom";
import { isValidJwt } from "../../utils/auth";

function ProtectedRoute({ children }) {
  try {
    const token = localStorage.getItem("token");

    if (!isValidJwt(token)) {
      localStorage.removeItem("token");
      return <Navigate to="/login" replace />;
    }

    return children;
  } catch (error) {
    console.log(error);
    return <Navigate to="/login" replace />;
  }
}

export default ProtectedRoute;
