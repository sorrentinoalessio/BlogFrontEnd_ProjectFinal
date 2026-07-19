import { useSelector } from "react-redux";
import { Navigate, Outlet } from "react-router-dom";
import { userSelectors } from "../../reducers/user.slice";

const ProtectedRoutes = () => {
    const user = useSelector(userSelectors.selectUser);

    if (!user?.accessToken) {
        return <Navigate to="/login" replace />;
    }

    return <Outlet />;
};

export default ProtectedRoutes;