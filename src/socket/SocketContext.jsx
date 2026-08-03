import {createContext,useContext} from 'react'; // Create a context for the socket connection

export const SocketContext = createContext(null); // Create a custom hook to use the socket context

export const useSocket = () => useContext(SocketContext); // Export the custom hook for use in other components
