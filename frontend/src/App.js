import { BrowserRouter, Routes, Route } from "react-router-dom";

import Navbar from "./components/Navbar";
import LoginPage from "./pages/LoginPage";
import CreateAccount from "./pages/CreateAccount";
import ComparePage from "./pages/ComparePage";
import LandingPage from "./pages/LandingPage";

function Home() {
   return (
    <div style={{ padding: "20px", textAlign: "center" }}>
      <h2>Welcome to BuyWise 🛒</h2>
      <p>Use the Compare section to find best prices</p>
    </div>
  );
}

// 🔥 MAIN APP
export default function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <Routes>
        {/* <Route path="/" element={<Home />} /> */}
         <Route path="/" element={<LandingPage />} />
        
        <Route path="/compare" element={<ComparePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<CreateAccount />} />
      </Routes>
    </BrowserRouter>
  );
}
