import { Outlet } from "react-router-dom";
import Header from "./components/Header/Header.jsx";
import Footer from "./components/Footer/Footer.jsx";
import { SocketProvider } from "./socket/SocketProvider.jsx";
import "./App.css";

function App() {
  return (
    <SocketProvider>
      <Header />
      <main>
        <Outlet />
      </main>
      <Footer />
    </SocketProvider>
  );
}

export default App;