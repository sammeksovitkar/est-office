import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function CRReportModule() {
  const [employees, setEmployees] = useState([]);
  const [selectedEmpId, setSelectedEmpId] = useState('');
  const [empDetails, setEmpDetails] = useState(null);
  
  // फॉर्म स्टेट्स
  const [judgeName, setJudgeName] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [station, setStation] = useState('');

  // ✏️ एडिट करण्यासाठी स्टेट
  const [editIndex, setEditIndex] = useState(null);

  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/employees`);
      setEmployees(res.data);
      
      // जर एखाਦਾ कर्मचारी आधीच निवडलेला असेल, तर बॅकएंडवरून नवीन डेटा आल्यावर त्याचे तपशील देखील रिफ्रेश करा
      if (selectedEmpId) {
        const found = res.data.find(emp => String(emp.id || emp._id) === String(selectedEmpId));
        if (found) setEmpDetails(found);
      }
    } catch (err) {
      console.error('Error fetching employees', err);
    }
  };

  const handleEmployeeChange = (e) => {
    const empId = e.target.value;
    setSelectedEmpId(empId);
    const found = employees.find(emp => String(emp.id || emp._id) === String(empId));
    setEmpDetails(found || null);
    setEditIndex(null); 
    clearForm();
  };

  const clearForm = () => {
    setJudgeName('');
    setFromDate('');
    setToDate('');
    setStation('');
    setEditIndex(null);
  };

  // 💾 कालावधी ॲड किंवा अपडेट करणे
  const handleSaveDuration = async (e) => {
    e.preventDefault();
    if (!judgeName || !fromDate) {
      alert('कृपया न्यायाधीशाचे नाव आणि सुरू तारीख भरा!');
      return;
    }

    const currentList = [...(empDetails.officersDuration || [])];

    const entryData = {
      judgeName,
      fromDate,
      toDate: toDate || 'सध्या कार्यरत (Present)',
      stationName: station || empDetails.underOfficeOrCourt || '-'
    };

    if (editIndex !== null) {
      currentList[editIndex] = entryData;
    } else {
      currentList.push(entryData);
    }

    const empId = empDetails.id || empDetails._id;

    try {
      const res = await axios.put(`${API_BASE_URL}/employees/${empId}/officers-duration`, {
        officersDuration: currentList,
        employeeName: empDetails.employeeName
      });

      if (res.data.success || res.status === 200) {
        alert(editIndex !== null ? '✅ सेवा कालावधी यशस्वीरीत्या अपडेट झाला!' : '✅ न्यायाधीशांचा सेवा कालावधी यशस्वीरीत्या जतन झाला!');
        
        clearForm();
        // 🔄 मुख्य कर्मचाऱ्यांची लिस्ट आणि सध्याच्या कर्मचाऱ्याचा डेटा बॅकएंडवरून रीफ्रेश करा
        await fetchEmployees();
      }
    } catch (err) {
      alert('🛑 सेव्ह करताना एरर आला.');
      console.error(err);
    }
  };

  // ✏️ एडिट करण्यासाठी डेटा फॉर्ममध्ये भरणे
  const handleEditClick = (index) => {
    const item = empDetails.officersDuration[index];
    setJudgeName(item.judgeName || '');
    setFromDate(item.fromDate || '');
    setToDate(item.toDate === 'सध्या कार्यरत (Present)' ? '' : item.toDate);
    setStation(item.stationName || '');
    setEditIndex(index);
  };

  // ❌ कालावधी डिलीट करणे
  const handleDeleteDuration = async (index) => {
    if (!window.confirm('खात्री आहे का? तुम्ही हा सेवा कालावधी रेकॉर्ड डिलीट करू इच्छिता?')) {
      return;
    }

    const currentList = [...empDetails.officersDuration];
    currentList.splice(index, 1); 

    const empId = empDetails.id || empDetails._id;

    try {
      const res = await axios.put(`${API_BASE_URL}/employees/${empId}/officers-duration`, {
        officersDuration: currentList,
        employeeName: empDetails.employeeName
      });

      if (res.data.success || res.status === 200) {
        alert('🗑️ सेवा कालावधी यशस्वीरीत्या डिलीट केला!');
        clearForm();
        // 🔄 मुख्य कर्मचाऱ्यांची लिस्ट आणि सध्याच्या कर्मचाऱ्याचा डेटा बॅकएंडवरून रीफ्रेश करा
        await fetchEmployees();
      }
    } catch (err) {
      alert('🛑 डिलीट करताना एरर आला.');
      console.error(err);
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif', background: '#f8fafc', minHeight: '100vh' }}>
      <div style={{ background: '#fff', padding: '25px', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', maxWidth: '1000px', margin: '0 auto' }}>
        
        <h2 style={{ color: '#0d233a', borderBottom: '2px solid #0d233a', paddingBottom: '10px', fontSize: '22px', marginBottom: '20px' }}>
          📑 CR रिपोर्ट: न्यायाधीशांच्या अंतर्गत सेवा कालावधी (Judge-wise Service Span)
        </h2>

        {/* कर्मचारी निवडण्याचा ड्रॉपडाऊन */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px', color: '#334155' }}>
            कर्मचारी निवडा (Select Employee):
          </label>
          <select 
            value={selectedEmpId} 
            onChange={handleEmployeeChange}
            style={{ width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '15px' }}
          >
            <option value="">-- कर्मचारी निवडा --</option>
            {employees.map((emp, idx) => (
              <option key={idx} value={emp.id || emp._id}>
                {emp.employeeName} ({emp.employeeRole || emp.designation || 'Staff'})
              </option>
            ))}
          </select>
        </div>

        {/* जर कर्मचारी निवडला असेल तर माहिती आणि टेबल दिसेल */}
        {empDetails && (
          <div>
            <div style={{ background: '#f1f5f9', padding: '15px', borderRadius: '6px', border: '1px solid #e2e8f0', marginBottom: '20px' }}>
              <h3 style={{ color: '#1e293b', fontSize: '16px', marginBottom: '10px' }}>👤 कर्मचारी तपशील</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '14px', color: '#334155' }}>
                <div><strong>पूर्ण नाव:</strong> {empDetails.employeeName}</div>
                <div><strong>पद (Designation):</strong> {empDetails.employeeRole || '-'}</div>
                <div><strong>सध्याचे कोर्ट/ऑफिस:</strong> {empDetails.underOfficeOrCourt || '-'}</div>
                <div><strong>सध्याचे माननीय न्यायाधीश:</strong> <span style={{ color: '#2563eb', fontWeight: 'bold' }}>{empDetails.underJudicialOfficer || '-'}</span></div>
              </div>
            </div>

            <h4 style={{ color: '#0d233a', fontSize: '16px', marginBottom: '10px' }}>⏳ न्यायाधीशांच्या अंतर्गत सेवा कालावधी (Tenure / Span History):</h4>
            
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: '#0d233a', color: '#fff', textAlign: 'left' }}>
                  <th style={{ padding: '10px', border: '1px solid #cbd5e1' }}>अ.क्र.</th>
                  <th style={{ padding: '10px', border: '1px solid #cbd5e1' }}>न्यायाधीशांचे नाव (Judge Name)</th>
                  <th style={{ padding: '10px', border: '1px solid #cbd5e1' }}>पासून दिनांक (From)</th>
                  <th style={{ padding: '10px', border: '1px solid #cbd5e1' }}>पर्यंत दिनांक (To)</th>
                  <th style={{ padding: '10px', border: '1px solid #cbd5e1' }}>कोर्ट / स्टेशन</th>
                  <th style={{ padding: '10px', border: '1px solid #cbd5e1', textAlign: 'center' }}>कृती (Actions)</th>
                </tr>
              </thead>
              <tbody>
                {empDetails.officersDuration && empDetails.officersDuration.length > 0 ? (
                  empDetails.officersDuration.map((item, index) => (
                    <tr key={index} style={{ background: index % 2 === 0 ? '#fff' : '#f8fafc' }}>
                      <td style={{ padding: '10px', border: '1px solid #cbd5e1' }}>{index + 1}</td>
                      <td style={{ padding: '10px', border: '1px solid #cbd5e1', fontWeight: 'bold' }}>{item.judgeName}</td>
                      <td style={{ padding: '10px', border: '1px solid #cbd5e1' }}>{item.fromDate}</td>
                      <td style={{ padding: '10px', border: '1px solid #cbd5e1' }}>{item.toDate}</td>
                      <td style={{ padding: '10px', border: '1px solid #cbd5e1' }}>{item.stationName}</td>
                      <td style={{ padding: '10px', border: '1px solid #cbd5e1', textAlign: 'center' }}>
                        <button 
                          onClick={() => handleEditClick(index)}
                          style={{ background: '#d97706', color: '#fff', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer', marginRight: '5px', fontSize: '11px' }}
                        >
                          ✏️ एडिट
                        </button>
                        <button 
                          onClick={() => handleDeleteDuration(index)}
                          style={{ background: '#dc2626', color: '#fff', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}
                        >
                          🗑️ डिलीट
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '15px', border: '1px solid #cbd5e1', color: '#64748b' }}>
                      कोणताही न्यायाधीश सेवा कालावधी रेकॉर्ड उपलब्ध नाही. खालील फॉर्म वापरून ॲड करा.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* नवीन किंवा अपडेट कालावधी जोडण्यासाठी फॉर्म */}
            <form onSubmit={handleSaveDuration} style={{ background: '#f8fafc', padding: '15px', borderRadius: '6px', border: '1px solid #cbd5e1', marginBottom: '20px' }}>
              <h4 style={{ color: '#0d233a', fontSize: '15px', marginBottom: '12px' }}>
                {editIndex !== null ? '✏️ कालावधी एडिट करा (Edit Tenure)' : '➕ नवीन न्यायाधीश कालावधी जोडा (Add Tenure)'}
              </h4>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>न्यायाधीशांचे नाव:</label>
                  <input 
                    type="text" 
                    value={judgeName} 
                    onChange={(e) => setJudgeName(e.target.value)} 
                    placeholder="उदा. Hon. Justice A. B. Shinde" 
                    style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1' }} 
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>कोर्ट / स्टेशन:</label>
                  <input 
                    type="text" 
                    value={station} 
                    onChange={(e) => setStation(e.target.value)} 
                    placeholder="उदा. District Court Nashik" 
                    style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1' }} 
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>पासून दिनांक (From Date):</label>
                  <input 
                    type="date" 
                    value={fromDate} 
                    onChange={(e) => setFromDate(e.target.value)} 
                    style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1' }} 
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>पर्यंत दिनांक (To Date - मोकळे सोडल्यास 'सध्या कार्यरत'):</label>
                  <input 
                    type="date" 
                    value={toDate} 
                    onChange={(e) => setToDate(e.target.value)} 
                    style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1' }} 
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button 
                  type="submit" 
                  style={{ background: editIndex !== null ? '#d97706' : '#059669', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}
                >
                  {editIndex !== null ? '💾 अपडेट करा (Update Span)' : '💾 कालावधी सेव्ह करा (Save Span)'}
                </button>

                {editIndex !== null && (
                  <button 
                    type="button" 
                    onClick={clearForm}
                    style={{ background: '#64748b', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}
                  >
                    ❌ कॅन्सल (Cancel)
                  </button>
                )}
              </div>
            </form>

            {/* प्रिंट बटण */}
            <div style={{ textAlign: 'right' }}>
              <button 
                onClick={() => window.print()} 
                style={{ background: '#0d233a', color: '#fff', border: 'none', padding: '10px 25px', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}
              >
                🖨️ CR रिपोर्ट प्रिंट करा (Print Report)
              </button>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
