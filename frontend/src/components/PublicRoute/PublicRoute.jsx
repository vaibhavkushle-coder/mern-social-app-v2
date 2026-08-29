import { Navigate } from "react-router-dom";
import { isValidJwt } from "../../utils/auth";

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
        console.log(error);
        return children;
    }
}

export default PublicRoute;
