import React, { useState } from 'react';
import axios from 'axios';

export function DailyManage({ employees = [], onRefresh }) {
  const todayStr = new Date().toISOString().split('T')[0];

  const [allocationDate, setAllocationDate] = useState(todayStr);
  const [absentSearch, setAbsentSearch] = useState('');
  const [relieverSearch, setRelieverSearch] = useState('');

  const [selectedAbsentEmp, setSelectedAbsentEmp] = useState('');
  const [dutyStatus, setDutyStatus] = useState('रजेवर (On Leave)');
  const [selectedRelieverEmp, setSelectedRelieverEmp] = useState('');
  const [remark, setRemark] = useState('');

  // 🌟 एडिट (Edit) करण्यासाठी स्टेट्स
  const [isEditing, setIsEditing] = useState(false);
  const [editRecordIndex, setEditRecordIndex] = useState(null);
  const [targetEmpId, setTargetEmpId] = useState(null);

  const API_BASE_URL = process.env.REACT_APP_API_URL || '';

  const absentEmpObj = employees.find(e => e.employeeName === selectedAbsentEmp);
  const relieverEmpObj = employees.find(e => e.employeeName === selectedRelieverEmp);

  const filteredAbsentEmps = employees.filter(e =>
    e.employeeName?.toLowerCase().includes(absentSearch.toLowerCase())
  );

  const filteredRelieverEmps = employees.filter(e =>
    e.employeeName?.toLowerCase().includes(relieverSearch.toLowerCase()) &&
    e.employeeName !== selectedAbsentEmp
  );

  // सर्व कर्मचाऱ्यांमधून dailyManage रेकॉर्ड्स आणि कोर्ट/न्यायाधीश माहिती गोळा करणे
  const getAllocationsHistory = () => {
    let history = [];
    employees.forEach(emp => {
      let records = [];
      try {
        records = typeof emp.dailyManage === 'string' ? JSON.parse(emp.dailyManage || '[]') : (emp.dailyManage || []);
      } catch (e) {
        records = [];
      }

      records.forEach((rec, idx) => {
        history.push({
          ...rec,
          recordIndex: idx,
          empId: emp.id || emp._id || emp.rowNumber,
          absentEmpName: emp.employeeName,
          absentEmpRole: emp.employeeRole || emp.designation || 'पद नाही',
          // 🌟 कोर्ट व न्यायाधीशांची (साहेबांची) माहिती जोडली
          courtName: emp.underOfficeOrCourt || 'कोर्ट/ऑफिस नाही',
          judgeName: emp.underJudicialOfficer || 'न्यायाधीश निवडलेले नाहीत'
        });
      });
    });

    return history.sort((a, b) => new Date(b.date) - new Date(a.date));
  };

  const allocationList = getAllocationsHistory();

  // 🌟 रेकॉर्ड एडिट करण्यासाठी फॉर्ममध्ये लोड करणे
  const handleEditClick = (item) => {
    setIsEditing(true);
    setEditRecordIndex(item.recordIndex);
    setTargetEmpId(item.empId);

    setAllocationDate(item.date || todayStr);
    setSelectedAbsentEmp(item.absentEmpName || '');
    setDutyStatus(item.status || 'रजेवर (On Leave)');
    setSelectedRelieverEmp(item.relieverEmpName || '');
    setRemark(item.remark || '');
  };

  // 🌟 रेकॉर्ड डिलीट करणे
  const handleDeleteRecord = async (item) => {
    if (!window.confirm(`खरोखर ${item.absentEmpName} यांचा ${item.date} चा रेकॉर्ड डिलीट करायचा का?`)) return;

    try {
      const res = await axios.delete(`${API_BASE_URL}/employees/${item.empId}/daily-manage/${item.recordIndex}`);
      if (res.data.success || res.status === 200) {
        alert('✅ रेकॉर्ड यशस्वीरीत्या डिलीट झाला!');
        if (onRefresh) onRefresh();
      }
    } catch (err) {
      console.error("Delete Error:", err);
      alert('🛑 डिलीट करताना एरर आला.');
    }
  };

  // फॉर्म सबमिट (Add किंवा Update)
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedAbsentEmp || !selectedRelieverEmp) {
      alert('कृपया रजेवर/कामावर असणारा कर्मचारी आणि रिलीव्हर दोन्ही निवडा!');
      return;
    }

    try {
      const payload = {
        date: allocationDate,
        absentEmpName: selectedAbsentEmp,
        absentEmpRole: absentEmpObj?.employeeRole || absentEmpObj?.designation || '',
        status: dutyStatus,
        relieverEmpName: selectedRelieverEmp,
        relieverEmpRole: relieverEmpObj?.employeeRole || relieverEmpObj?.designation || '',
        remark: remark || 'N/A'
      };

      let empIdToUse = targetEmpId;
      if (!empIdToUse && absentEmpObj) {
        empIdToUse = absentEmpObj.id || absentEmpObj.rowNumber || absentEmpObj._id;
      }

      if (isEditing) {
        // अपडेट API कॉल
        const res = await axios.put(`${API_BASE_URL}/employees/${empIdToUse}/daily-manage/${editRecordIndex}`, payload);
        if (res.data.success || res.status === 200) {
          alert('✅ रेकॉर्ड यशस्वीरीत्या अपडेट झाला!');
          resetForm();
          if (onRefresh) onRefresh();
        }
      } else {
        // ॲड API कॉल
        const res = await axios.post(`${API_BASE_URL}/employees/${empIdToUse}/add-daily-manage`, payload);
        if (res.data.success || res.status === 200) {
          alert('✅ दैनिक काम वाटप यशस्वीरीत्या सेव्ह झाले!');
          resetForm();
          if (onRefresh) onRefresh();
        }
      }
    } catch (err) {
      console.error("Daily Manage Error:", err);
      alert(err.response?.data?.error || '🛑 प्रक्रिया करताना एरर आला.');
    }
  };

  const resetForm = () => {
    setIsEditing(false);
    setEditRecordIndex(null);
    setTargetEmpId(null);
    setSelectedAbsentEmp('');
    setSelectedRelieverEmp('');
    setRemark('');
    setAbsentSearch('');
    setRelieverSearch('');
    setAllocationDate(todayStr);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* १. फॉर्म सेक्शन */}
      <div style={cardStyle}>
        <h2>{isEditing ? '✏️ दैनिक काम वाटप रेकॉर्ड एडिट करा' : '📅 दैनिक काम व बदली व्यवस्थापन (Daily Duty Allocation)'}</h2>
        
        <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginTop: '10px' }}>
          
          <div>
            <label style={labelStyle}>दिनांक (Date):</label>
            <input type="date" value={allocationDate} onChange={(e) => setAllocationDate(e.target.value)} required style={inputStyle} />
          </div>

          <div>
            <label style={labelStyle}>स्थिती (Status):</label>
            <select value={dutyStatus} onChange={(e) => setDutyStatus(e.target.value)} style={inputStyle}>
              <option value="रजेवर (On Leave)">रजेवर (On Leave)</option>
              <option value="विशेष कामावर (On Duty / Deputation)">विशेष कामावर (On Duty / Deputation)</option>
              <option value="प्रशिक्षण (On Training)">प्रशिक्षण (On Training)</option>
              <option value="इतर (Other)">इतर (Other)</option>
            </select>
          </div>

          <div style={{ background: '#fef2f2', padding: '12px', borderRadius: '6px', border: '1px solid #fecaca' }}>
            <label style={{ ...labelStyle, color: '#991b1b' }}>🔴 रजेवर/इतर कामावर असणारा कर्मचारी:</label>
            <input type="text" placeholder="🔍 नाव टाईप करून शोधा..." value={absentSearch} onChange={(e) => setAbsentSearch(e.target.value)} style={{ ...inputStyle, marginBottom: '6px' }} />
            <select value={selectedAbsentEmp} onChange={(e) => setSelectedAbsentEmp(e.target.value)} required style={inputStyle} disabled={isEditing}>
              <option value="">-- मूळ कर्मचारी निवडा --</option>
              {filteredAbsentEmps.map((emp, i) => (
                <option key={i} value={emp.employeeName}>{emp.employeeName} ({emp.employeeRole || emp.designation || 'पद नाही'})</option>
              ))}
            </select>
          </div>

          <div style={{ background: '#f0fdf4', padding: '12px', borderRadius: '6px', border: '1px solid #bbf7d0' }}>
            <label style={{ ...labelStyle, color: '#166534' }}>🟢 त्याच्या जागी काम पाहणारा (Reliever):</label>
            <input type="text" placeholder="🔍 नाव टाईप करून शोधा..." value={relieverSearch} onChange={(e) => setRelieverSearch(e.target.value)} style={{ ...inputStyle, marginBottom: '6px' }} />
            <select value={selectedRelieverEmp} onChange={(e) => setSelectedRelieverEmp(e.target.value)} required style={inputStyle}>
              <option value="">-- रिलीव्हर निवडा --</option>
              {filteredRelieverEmps.map((emp, i) => (
                <option key={i} value={emp.employeeName}>{emp.employeeName} ({emp.employeeRole || emp.designation || 'पद नाही'})</option>
              ))}
            </select>
          </div>

          <div style={{ gridColumn: 'span 2' }}>
            <label style={labelStyle}>शेरा / आदेश तपशील (Remark):</label>
            <input type="text" value={remark} onChange={(e) => setRemark(e.target.value)} placeholder="उदा. मा. मुख्य न्यायदंडाधिकारी यांच्या तोंडी आदेशानुसार." style={inputStyle} />
          </div>

          <div style={{ gridColumn: 'span 2', marginTop: '10px', display: 'flex', gap: '10px' }}>
            <button type="submit" style={{ flex: 1, ...submitButtonStyle, background: isEditing ? '#f59e0b' : '#0d233a' }}>
              {isEditing ? '💾 बदल अपडेट करा' : '➕ दैनिक काम वाटप नोंदवा'}
            </button>
            {isEditing && (
              <button type="button" onClick={resetForm} style={{ padding: '12px 20px', background: '#64748b', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>रद्द करा</button>
            )}
          </div>

        </form>
      </div>

      {/* २. इतिहास टेबल (कोर्ट व न्यायाधीश माहितीसह) */}
      <div style={cardStyle}>
        <h2>📊 दैनिक काम व बदली वाटप इतिहास (Daily Duty Allocation History)</h2>

        <div style={{ maxHeight: '500px', overflowY: 'auto', marginTop: '15px', border: '1px solid #cbd5e1', borderRadius: '6px' }}>
          <table style={{ fontSize: '13px', width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ position: 'sticky', top: 0, background: '#f8fafc', zIndex: 1 }}>
              <tr style={{ borderBottom: '2px solid #cbd5e1', textAlign: 'left' }}>
                <th style={thStyle}>अ.क्र.</th>
                <th style={thStyle}>दिनांक</th>
                <th style={thStyle}>रजेवर/कामावर असणारा कर्मचारी & पद</th>
                {/* 🌟 नवीन कॉलम: कोर्ट व साहेबांचे नाव */}
                <th style={thStyle}>कोर्ट / ऑफिस व न्यायाधीश (साहेब)</th>
                <th style={thStyle}>स्थिती</th>
                <th style={thStyle}>कामावर हजर राहणारा (Reliever) & पद</th>
                <th style={thStyle}>शेरा</th>
                <th style={{ ...thStyle, textAlign: 'center' }}>कृती (Action)</th>
              </tr>
            </thead>
            <tbody>
              {allocationList.length > 0 ? (
                allocationList.map((item, index) => (
                  <tr key={index} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={tdStyle}>{index + 1}</td>
                    <td style={tdStyle}><strong>📅 {item.date}</strong></td>
                    <td style={tdStyle}>
                      <span style={{ color: '#dc2626', fontWeight: 'bold' }}>{item.absentEmpName}</span>
                      <br /><span style={{ fontSize: '11px', color: '#64748b' }}>({item.absentEmpRole})</span>
                    </td>

                    {/* 🌟 कोर्ट / ऑफिस व न्यायाधीशांचे (साहेबांचे) नाव */}
                    <td style={tdStyle}>
                      <span style={{ background: '#e2e8f0', color: '#0f172a', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' }}>
                        🏛️ {item.courtName}
                      </span>
                      <br />
                      <span style={{ color: '#2563eb', fontWeight: '600', fontSize: '12px' }}>
                        ⚖️ {item.judgeName}
                      </span>
                    </td>

                    <td style={tdStyle}>
                      <span style={{ background: '#fef3c7', color: '#92400e', padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' }}>
                        {item.status}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      <span style={{ color: '#16a34a', fontWeight: 'bold' }}>{item.relieverEmpName}</span>
                      <br /><span style={{ fontSize: '11px', color: '#64748b' }}>({item.relieverEmpRole})</span>
                    </td>
                    <td style={tdStyle}>{item.remark || '-'}</td>
                    <td style={{ ...tdStyle, textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                        <button onClick={() => handleEditClick(item)} style={editBtnStyle}>✏️ एडिट</button>
                        <button onClick={() => handleDeleteRecord(item)} style={deleteBtnStyle}>🗑️ डिलीट</button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>
                    कोणतीही दैनिक कामाची नोंद उपलब्ध नाही.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}

const cardStyle = { background: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' };
const labelStyle = { fontSize: '13px', fontWeight: '600', color: '#333', marginBottom: '4px', display: 'block' };
const inputStyle = { width: '100%', padding: '8px 10px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '14px', boxSizing: 'border-box' };
const submitButtonStyle = { padding: '12px', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' };
const thStyle = { padding: '10px', fontWeight: '600', color: '#334155' };
const tdStyle = { padding: '10px', color: '#334155', verticalAlign: 'top' };
const editBtnStyle = { padding: '5px 10px', background: '#f59e0b', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' };
const deleteBtnStyle = { padding: '5px 10px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' };
