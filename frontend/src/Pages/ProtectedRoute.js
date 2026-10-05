import React, { useState } from 'react';
import axios from 'axios';

export function Login({ onLoginSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://172.16.171.96:5000/api';
  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(`${API_BASE_URL}/auth/login`, { username, password });
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      onLoginSuccess(res.data.user);
    } catch (err) {
      setError(err.response?.data?.error || 'लॉगिन करताना त्रुटी आली.');
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#f1f5f9' }}>
      <form onSubmit={handleLogin} style={{ background: '#fff', padding: '30px', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', width: '350px' }}>
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <span style={{ fontSize: '32px' }}>🏛️</span>
          <h3 style={{ margin: '10px 0 0 0', color: '#1e293b' }}>Court Establishment</h3>
          <p style={{ fontSize: '13px', color: '#64748b' }}>प्रशासन व युजर लॉगिन</p>
        </div>

        {error && <div style={{ background: '#fee2e2', color: '#991b1b', padding: '8px', borderRadius: '4px', fontSize: '13px', marginBottom: '15px' }}>{error}</div>}

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '5px' }}>युजरनेम (Username)</label>
          <input 
            type="text" 
            value={username} 
            onChange={(e) => setUsername(e.target.value)} 
            required
            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
          />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '5px' }}>पासवर्ड (Password)</label>
          <input 
            type="password" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            required
            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
          />
        </div>

        <button type="submit" style={{ width: '100%', background: '#2563eb', color: '#fff', padding: '10px', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}>
          लॉगिन करा (Login)
        </button>
      </form>
    </div>
  );
}