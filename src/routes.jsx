import App from './App.jsx'
import LoginForm from './components/LoginForm/LoginForm.component.jsx'
import RegistrationForm from './components/RegistrationForm/RegistrationForm.jsx'
import Home from './components/Home/Home.jsx'
import ProtectedRoutes from './components/ProtectedRoutes/ProtectedRoutes.jsx'
import PostPage from './components/Posts/PostPage/PostPage.jsx'
import AddEditPost from './components/Posts/AddEditPost/AddEditPost.jsx'
import ForgotPasswordForm from './components/ForgotPassForm/ForgotPassForm.jsx'
import ResetPasswordForm from './components/ResetPassForm/ResetPassForm.jsx'

export const routes = [
  {
    path: "/",
    element: <App />,
    children: [

      { index: true, element: <Home /> },
      {
        element: <ProtectedRoutes />,
        children: [
          { path: 'posts', element: <PostPage /> },
          { path: 'posts/addEditPost', element: <AddEditPost /> }
        ]
      },
      { path: "login", element: <LoginForm /> },
      { path: "forgot-password", element: <ForgotPasswordForm /> },
      { path: "registration", element: <RegistrationForm /> },
      { path: "reset-password/:token", element: <ResetPasswordForm /> }
    ]
  }
]