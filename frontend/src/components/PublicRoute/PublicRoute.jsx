import { Navigate } from "react-router-dom";
import { isValidJwt } from "../../utils/auth";
import logger from "../../utils/logger";

function PublicRoute({ children }){
    try{

        const token = localStorage.getItem("token");

        if(isValidJwt(token)){
            return <Navigate to="/profile" replace />;
        }

        if (token) {
            localStorage.removeItem("token");
        }

        return children;

    }catch(error){
        logger.error("route.public_auth_check.failed", error);
        return children;
    }
}

export default PublicRoute;
