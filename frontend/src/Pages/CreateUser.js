import React, { useState } from 'react';
import axios from 'axios';

export function CreateUser() {
  const [formData, setFormData] = useState({
    employeeId: '',
    employeeName: '',
    username: '',
    password: '',
    role: 'Junior Clerk',
    roomNumber: '',
    sectionName: '',
    underJudicialOfficer: ''
  });
  const [message, setMessage] = useState('');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://172.16.171.96:5000/api';
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(`${API_BASE_URL}/auth/create-user`, formData);
      setMessage(res.data.message);
      setFormData({ employeeId: '', employeeName: '', username: '', password: '', role: 'Junior Clerk', roomNumber: '', sectionName: '', underJudicialOfficer: '' });
    } catch (err) {
      setMessage(err.response?.data?.error || 'युजर तयार करताना एरर आला.');
    }
  };

  return (
    <div className="section-card" style={{ maxWidth: '600px', margin: '0 auto' }}>
      <h3>➕ नवीन युजर / कर्मचारी तयार करा (Create New User)</h3>
      {message && <div style={{ padding: '10px', background: '#e0f2fe', color: '#0369a1', borderRadius: '4px', margin: '10px 0' }}>{message}</div>}
      
      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '12px', marginTop: '15px' }}>
        <div>
          <label>कर्मचाऱ्याचे नाव (Employee Name):</label>
          <input type="text" name="employeeName" value={formData.employeeName} onChange={handleChange} required style={{ width: '100%', padding: '8px' }} />
        </div>
        <div>
          <label>युजर आयडी / नंबर (Employee ID):</label>
          <input type="text" name="employeeId" value={formData.employeeId} onChange={handleChange} required style={{ width: '100%', padding: '8px' }} />
        </div>
        <div>
          <label>युजरनेम (Login Username):</label>
          <input type="text" name="username" value={formData.username} onChange={handleChange} required style={{ width: '100%', padding: '8px' }} />
        </div>
        <div>
          <label>पासवर्ड (Password):</label>
          <input type="password" name="password" value={formData.password} onChange={handleChange} required style={{ width: '100%', padding: '8px' }} />
        </div>
        <div>
          <label>पद / रोल (Role):</label>
          <select name="role" value={formData.role} onChange={handleChange} style={{ width: '100%', padding: '8px' }}>
            <option value="Establishment Admin">Establishment Admin (पूर्ण अधिकार)</option>
            <option value="Junior Clerk">Junior Clerk</option>
            <option value="Senior Clerk">Senior Clerk</option>
            <option value="Stenographer">Stenographer</option>
            <option value="Judicial Officer">Judicial Officer / साहेब</option>
          </select>
        </div>
        <div>
          <label>रूम नंबर (Room No):</label>
          <input type="text" name="roomNumber" value={formData.roomNumber} onChange={handleChange} style={{ width: '100%', padding: '8px' }} />
        </div>
        <div>
          <label>विभाग (Section Name):</label>
          <input type="text" name="sectionName" value={formData.sectionName} onChange={handleChange} style={{ width: '100%', padding: '8px' }} />
        </div>
        <button type="submit" style={{ background: '#16a34a', color: '#fff', padding: '10px', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', marginTop: '10px' }}>
          युजर सेव्ह करा (Save User)
        </button>
      </form>
    </div>
  );
}