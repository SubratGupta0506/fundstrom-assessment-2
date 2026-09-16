import { FormEvent, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { user, login, loading } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("admin@supplyflow.com");
  const [password, setPassword] = useState("Admin@123");
  const [error, setError] = useState("");

  if (user) {
    return <Navigate to="/enquiries" replace />;
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");

    try {
      await login(email, password);
      navigate("/enquiries");
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          err.response?.data?.error ||
          "Invalid email or password"
      );
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-brand">
          <div className="brand-mark large">S</div>
          <div>
            <h1>SupplyFlow ERP</h1>
            <p>Industrial Sales Management</p>
          </div>
        </div>

        <div className="login-heading">
          <h2>Welcome back</h2>
          <p>Sign in to continue to your workspace.</p>
        </div>

        <form onSubmit={handleSubmit}>
          <label>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <label>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          {error && <div className="error-box">{error}</div>}

          <button
            className="primary-button full-width"
            type="submit"
            disabled={loading}
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <div className="demo-credentials">
          <strong>Demo Credentials</strong>
          <span>Admin: admin@supplyflow.com / Admin@123</span>
          <span>Sales: sales@supplyflow.com / Sales@123</span>
        </div>
      </div>
    </div>
  );
}