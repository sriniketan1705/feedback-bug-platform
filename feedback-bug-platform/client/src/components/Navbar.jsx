import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '../features/authSlice';

export default function Navbar() {
  const { user } = useSelector((s) => s.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  return (
    <header className="navbar">
      <Link to="/" className="brand">🐞 Feedback &amp; Bug Platform</Link>
      <div className="nav-right">
        {user ? (
          <>
            <span className="muted">
              {user.name} <span className="badge role">{user.role}</span>
            </span>
            <button className="btn small ghost" onClick={handleLogout}>Logout</button>
          </>
        ) : (
          <>
            <Link to="/login" className="btn small ghost">Login</Link>
            <Link to="/register" className="btn small">Register</Link>
          </>
        )}
      </div>
    </header>
  );
}
