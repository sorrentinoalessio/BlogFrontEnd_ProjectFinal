import { useNavigate } from 'react-router-dom';
import { useContext } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Card from '../Card/Card';
import { ThemeContext } from '../../contexts/ThemeProvider';
import { clearUser, userSelectors } from '../../reducers/user.slice'; // adatta il path

const Home = () => {
  const { theme, switchTheme } = useContext(ThemeContext);
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const user = useSelector(userSelectors.selectUser);

  const handleLogout = () => {
    dispatch(clearUser());
    navigate("/login");
  };

  return (
    <Card title="Home">
      <h4>Post Publicati</h4>
    </Card>
  );
};

export default Home;