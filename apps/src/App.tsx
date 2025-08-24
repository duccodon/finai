import { BrowserRouter } from "react-router-dom";
import Router from "@/routes";
import "./App.css";

function App() {
    return (
        <BrowserRouter>
            <Router />
        </BrowserRouter>
    );
}

export default App;
// import './App.css';
// import router from './routes';
// import { RouterProvider } from 'react-router-dom';

// function App() {
//   return <RouterProvider router={router} />;
// }

// export default App;
