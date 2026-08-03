import { useSelector, useDispatch } from 'react-redux';
import { userSelectors, setUser, clearUser } from '../reducers/user.slice';

export const useAuth = () => {
  const dispatch = useDispatch();
  const user = useSelector(userSelectors.selectUser);

  const isAuthenticated = Boolean(user?.accessToken);

  const login = (userData) => {
    dispatch(setUser(userData)); // { name, accessToken, refreshToken }
  };

  const logout = () => {
    dispatch(clearUser());
  };

  return {
    user,
    isAuthenticated,
    login,
    logout,
  };
};