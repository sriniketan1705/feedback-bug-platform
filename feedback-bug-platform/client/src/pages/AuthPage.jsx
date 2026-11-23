import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { authenticate, clearAuthError } from '../features/authSlice';

export default function AuthPage({ mode }) {
  const isRegister = mode === 'register';
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const { token, loading, error } = useSelector((s) => s.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  useEffect(() => {
    dispatch(clearAuthError());
  }, [mode, dispatch]);

  useEffect(() => {
    if (token) navigate('/');
  }, [token, navigate]);

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const onSubmit = (e) => {
    e.preventDefault();
    dispatch(authenticate({ mode, ...form }));
  };

  return (
    <div className="card auth-card">
      <h2>{isRegister ? 'Create account' : 'Welcome back'}</h2>
      {isRegister && (
        <p className="muted small-text">The first account created becomes the admin.</p>
      )}
      <form onSubmit={onSubmit}>
        {isRegister && (
          <>
            <label>Name</label>
            <input name="name" value={form.name} onChange={onChange} required />
          </>
        )}
        <label>Email</label>
        <input name="email" type="email" value={form.email} onChange={onChange} required />
        <label>Password</label>
        <input name="password" type="password" minLength={6} value={form.password} onChange={onChange} required />

        {error && <div className="alert error">{error}</div>}

        <button className="btn full" disabled={loading}>
          {loading ? 'Please wait...' : isRegister ? 'Register' : 'Login'}
        </button>
      </form>
      <p className="muted small-text center">
        {isRegister ? (
          <>Already have an account? <Link to="/login">Login</Link></>
        ) : (
          <>New here? <Link to="/register">Create an account</Link></>
        )}
      </p>
    </div>
  );
}
