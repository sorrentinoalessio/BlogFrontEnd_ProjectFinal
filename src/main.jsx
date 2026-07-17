import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { routes } from './routes.jsx';
import { ThemeProvider } from './contexts/ThemeProvider.jsx';
import { Provider } from 'react-redux';
import { store, persistor } from './store/store.js';
import { PersistGate } from 'redux-persist/integration/react';
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const router = createBrowserRouter(routes);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider>
      <Provider store={store}>
        <PersistGate persistor={persistor}>
          <>
            <RouterProvider router={router} />
            <ToastContainer
              position="bottom-center"
              autoClose={2500}
              newestOnTop
              closeOnClick
              pauseOnHover
              theme="light"
              style={{ zIndex: 99999 }}
            />
          </>
        </PersistGate>
      </Provider>
    </ThemeProvider>
  </StrictMode>
);