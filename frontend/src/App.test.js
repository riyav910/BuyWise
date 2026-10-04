import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import { useAuth } from "./auth/AuthContext";

jest.mock("./auth/AuthContext", () => ({
  useAuth: jest.fn()
}));

function renderProtectedRoute(initialEntry = "/compare") {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route element={<ProtectedRoute />}>
          <Route path="/compare" element={<div>Compare page</div>} />
        </Route>
        <Route path="/login" element={<div>Login page</div>} />
      </Routes>
    </MemoryRouter>
  );
}

test("shows loading state while authentication is checked", () => {
  useAuth.mockReturnValue({ user: null, loading: true });
  renderProtectedRoute();
  expect(screen.getByText(/checking your session/i)).toBeInTheDocument();
});

test("redirects unauthenticated users to login", () => {
  useAuth.mockReturnValue({ user: null, loading: false });
  renderProtectedRoute();
  expect(screen.getByText("Login page")).toBeInTheDocument();
});

test("allows authenticated users to access protected pages", () => {
  useAuth.mockReturnValue({
    user: { id: "user-1", name: "Test User", email: "test@example.com" },
    loading: false
  });
  renderProtectedRoute();
  expect(screen.getByText("Compare page")).toBeInTheDocument();
});
