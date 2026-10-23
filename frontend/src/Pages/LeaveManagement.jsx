import React, { useState, useEffect } from 'react';
import axios from 'axios';

export function LeaveManagement({ employees, onLeaveActionComplete, editingEmployee, onCancelEdit }) {
  const [activeTab, setActiveTab] = useState('form');
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState(null);

  const [formData, setFormData] = useState({
    employeeName: '',
    designation: '',
    leaveType: 'CL',
    reason: ''
  });

  const [creditForm, setCreditForm] = useState({
    employeeName: '',
    leaveType: 'COff',
    daysAdded: 1,
    date: '',
    reason: ''
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [creditSearchTerm, setCreditSearchTerm] = useState('');
  const [recordSearchTerm, setRecordSearchTerm] = useState('');
  
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const [clLeaveDates, setClLeaveDates] = useState([]);
  const [elLeaveDates, setElLeaveDates] = useState([]);
  const [coffLeaveDates, setCoffLeaveDates] = useState([]);

  const API_BASE_URL = process.env.REACT_APP_API_URL || '';

  useEffect(() => {
    if (editingEmployee) {
      loadEmployeeToForm(editingEmployee);
    }
  }, [editingEmployee]);

  const loadEmployeeToForm = (emp) => {
    setIsEditing(true);
    setEditId(emp.id || emp.rowNumber || emp._id);

    const extractObjects = (dates) => {
      if (!Array.isArray(dates)) return [];
      return dates.map(l => {
        if (typeof l === 'string') {
          return { date: l, reason: emp.reason || 'N/A' };
        }
        return l;
      });
    };

    setClLeaveDates(extractObjects(emp.clLeaveDates || []));
    setElLeaveDates(extractObjects(emp.elLeaveDates || []));
    setCoffLeaveDates(extractObjects(emp.coffLeaveDates || []));

    setFormData({
      employeeName: emp.employeeName || '',
      designation: emp.employeeRole || emp.designation || '',
      leaveType: 'CL',
      reason: ''
    });
    
    setActiveTab('form');
  };

  const handleEmployeeSelect = (e) => {
    const selectedName = e.target.value;
    const foundEmp = employees.find(emp => emp.employeeName === selectedName);
    if (foundEmp) {
      setFormData(prev => ({ 
        ...prev, 
        employeeName: selectedName, 
        designation: foundEmp.employeeRole || foundEmp.designation || '' 
      }));
    } else {
      setFormData(prev => ({ ...prev, employeeName: selectedName, designation: '' }));
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleCreditChange = (e) => {
    setCreditForm({ ...creditForm, [e.target.name]: e.target.value });
  };

  const handleAddDateRange = () => {
    if (!fromDate) {
      alert('कृपया सुरुवातीची तारीख (From Date) निवडा!');
      return;
    }

    const start = new Date(fromDate);
    const end = toDate ? new Date(toDate) : new Date(fromDate);

    if (start > end) {
      alert('सुरुवातीची तारीख शेवटच्या तारखेपेक्षा पुढे असू शकत नाही!');
      return;
    }

    const leaveReason = formData.reason || 'N/A';
    let datesToAdd = [];
    let currentDate = new Date(start);

    while (currentDate <= end) {
      const dateString = currentDate.toISOString().split('T')[0];
      datesToAdd.push({
        date: dateString,
        reason: leaveReason
      });
      currentDate.setDate(currentDate.getDate() + 1);
    }

    const currentEmp = employees.find(emp => emp.employeeName === formData.employeeName);
    if (currentEmp && !isEditing) {
      const tCL = parseInt(currentEmp.totalCL ?? 15);
      const tEL = parseInt(currentEmp.totalEL ?? 30);
      const tCOff = parseInt(currentEmp.totalCOff ?? 0);

      const bCL = parseInt(currentEmp.balanceCL ?? tCL);
      const bEL = parseInt(currentEmp.balanceEL ?? tEL);
      const bCOff = parseInt(currentEmp.balanceCOff ?? tCOff);

      const requestedCount = datesToAdd.length;

      if (formData.leaveType === 'CL' && (clLeaveDates.length + requestedCount) > bCL) {
        alert(`❌ अपुरी शिल्लक! तुमच्याकडे फक्त ${bCL} CL शिल्लक आहेत.`);
        return;
      }
      if (formData.leaveType === 'EL' && (elLeaveDates.length + requestedCount) > bEL) {
        alert(`❌ अपुरी शिल्लक! तुमच्याकडे फक्त ${bEL} EL शिल्लक आहेत.`);
        return;
      }
      if (formData.leaveType === 'COff' && (coffLeaveDates.length + requestedCount) > bCOff) {
        alert(`❌ अपुरी शिल्लक! तुमच्याकडे फक्त ${bCOff} C-Off शिल्लक आहेत.`);
        return;
      }
    }

    if (formData.leaveType === 'CL') {
      setClLeaveDates(prev => {
        const merged = [...prev];
        datesToAdd.forEach(d => { if (!merged.some(m => m.date === d.date)) merged.push(d); });
        return merged;
      });
    } else if (formData.leaveType === 'EL') {
      setElLeaveDates(prev => {
        const merged = [...prev];
        datesToAdd.forEach(d => { if (!merged.some(m => m.date === d.date)) merged.push(d); });
        return merged;
      });
    } else if (formData.leaveType === 'COff') {
      setCoffLeaveDates(prev => {
        const merged = [...prev];
        datesToAdd.forEach(d => { if (!merged.some(m => m.date === d.date)) merged.push(d); });
        return merged;
      });
    }

    setFromDate('');
    setToDate('');
  };

  const handleRemoveDate = (dateToRemove, type) => {
    if (type === 'CL') setClLeaveDates(clLeaveDates.filter(d => d.date !== dateToRemove));
    if (type === 'EL') setElLeaveDates(elLeaveDates.filter(d => d.date !== dateToRemove));
    if (type === 'COff') setCoffLeaveDates(coffLeaveDates.filter(d => d.date !== dateToRemove));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.employeeName) {
      alert('कृपया कर्मचाऱ्याचे नाव निवडा!');
      return;
    }

    const totalDaysCount = clLeaveDates.length + elLeaveDates.length + coffLeaveDates.length;
    if (totalDaysCount === 0) {
      alert('कृपया किमान एक तारीख जोडा!');
      return;
    }

    try {
      const payload = {
        ...formData,
        employeeRole: formData.designation,
        clLeaveDates: clLeaveDates,
        elLeaveDates: elLeaveDates,
        coffLeaveDates: coffLeaveDates,
        clLeaveCount: clLeaveDates.length,
        elLeaveCount: elLeaveDates.length,
        coffLeaveCount: coffLeaveDates.length,
        totalDays: totalDaysCount
      };

      if (isEditing) {
        const res = await axios.put(`${API_BASE_URL}/court-staff/${editId}`, payload);
        if (res.data.success || res.status === 200) {
          alert('✅ डेटा यशस्वीरीत्या अपडेट झाला!');
          resetForm();
        }
      } else {
        const res = await axios.post(`${API_BASE_URL}/leaves`, payload);
        if (res.data.success || res.status === 200) {
          alert('✅ रजेचा अर्ज यशस्वीरीत्या सबमिट झाला!');
          resetForm();
        }
      }
    } catch (err) {
      console.error("Submit Error:", err);
      alert(err.response?.data?.error || '🛑 प्रक्रिया करताना एरर आला.');
    }
  };

  const handleCreditSubmit = async (e) => {
    e.preventDefault();
    if (!creditForm.employeeName || !creditForm.date || !creditForm.reason) {
      alert('कृपया सर्व माहिती भरा!');
      return;
    }

    const foundEmp = employees.find(emp => emp.employeeName === creditForm.employeeName);
    if (!foundEmp) return;
    const empId = foundEmp.id || foundEmp.rowNumber || foundEmp._id;

    try {
      const res = await axios.post(`${API_BASE_URL}/employees/${empId}/add-credit-leave`, creditForm);
      if (res.data.success || res.status === 200) {
        alert(`✅ यशस्वीरीत्या ${creditForm.daysAdded} ${creditForm.leaveType} जमा करण्यात आले!`);
        setCreditForm({ employeeName: '', leaveType: 'COff', daysAdded: 1, date: '', reason: '' });
        if (onLeaveActionComplete) onLeaveActionComplete();
      }
    } catch (err) {
      alert('🛑 रजा जमा करताना एरर आला.');
    }
  };

  const resetForm = () => {
    setIsEditing(false);
    setEditId(null);
    setFormData({ employeeName: '', designation: '', leaveType: 'CL', reason: '' });
    setClLeaveDates([]);
    setElLeaveDates([]);
    setCoffLeaveDates([]);
    setSearchTerm('');
    setFromDate('');
    setToDate('');
    setActiveTab('records');
    if (onCancelEdit) onCancelEdit();
    if (onLeaveActionComplete) onLeaveActionComplete();
  };

  const filteredEmployees = employees ? employees.filter(emp => emp.employeeName?.toLowerCase().includes(searchTerm.toLowerCase())) : [];
  const filteredCreditEmployees = employees ? employees.filter(emp => emp.employeeName?.toLowerCase().includes(creditSearchTerm.toLowerCase())) : [];
  const filteredRecords = employees ? employees.filter(emp => emp.employeeName?.toLowerCase().includes(recordSearchTerm.toLowerCase())) : [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* टॅब बटन्स */}
      <div style={{ display: 'flex', gap: '10px', borderBottom: '2px solid #e2e8f0', paddingBottom: '10px', flexWrap: 'wrap' }}>
        <button onClick={() => setActiveTab('form')} style={{ ...tabButtonStyle, background: activeTab === 'form' ? '#0d233a' : '#f1f5f9', color: activeTab === 'form' ? '#fff' : '#334155' }}>
          {isEditing ? '✏️ एडिट मोड' : '📋 रजेचा अर्ज (Leave Application)'}
        </button>
        <button onClick={() => setActiveTab('credit')} style={{ ...tabButtonStyle, background: activeTab === 'credit' ? '#0d233a' : '#f1f5f9', color: activeTab === 'credit' ? '#fff' : '#334155' }}>
          ➕ रजा जमा करा (Add C-Off / EL)
        </button>
        <button onClick={() => setActiveTab('records')} style={{ ...tabButtonStyle, background: activeTab === 'records' ? '#0d233a' : '#f1f5f9', color: activeTab === 'records' ? '#fff' : '#334155' }}>
          📊 रजा शिल्लक यादी व इतिहास
        </button>
      </div>

      {/* १. फॉर्म सेक्शन */}
      {activeTab === 'form' && (
        <div style={cardStyle}>
          <h2>{isEditing ? '✏️ कर्मचाऱ्याचा रजा रेकॉर्ड एडिट करा' : '📋 रजेचा अर्ज फॉर्म'}</h2>
          <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginTop: '15px' }}>
            
            <div style={{ gridColumn: 'span 2' }}>
              <label style={labelStyle}>कर्मचाऱ्याचे नाव (Employee Name):</label>
              {!isEditing && (
                <input type="text" placeholder="🔍 नाव टाईप करून शोधा..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ ...inputStyle, marginBottom: '8px' }} />
              )}
              <select name="employeeName" value={formData.employeeName} onChange={handleEmployeeSelect} required style={inputStyle} disabled={isEditing}>
                <option value="">-- कर्मचारी निवडा --</option>
                {filteredEmployees.map((emp, index) => (
                  <option key={index} value={emp.employeeName}>
                    {emp.employeeName} ({emp.employeeRole || emp.designation || 'पद नाही'}) [शिल्लक CL: {emp.balanceCL ?? 15}, EL: {emp.balanceEL ?? 30}]
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={labelStyle}>पद (Designation):</label>
              <input type="text" name="designation" value={formData.designation} onChange={handleChange} required placeholder="पद लिहा" style={inputStyle} />
            </div>

            <div>
              <label style={labelStyle}>रजेचा प्रकार (Leave Type):</label>
              <select name="leaveType" value={formData.leaveType} onChange={handleChange} style={inputStyle}>
                <option value="CL">कॅज्युअल लीव्ह (CL)</option>
                <option value="EL">अर्न लीव्ह (EL)</option>
                <option value="COff">कॅज्युअल ऑफ (C-Off)</option>
              </select>
            </div>

            <div style={{ gridColumn: 'span 2' }}>
              <label style={labelStyle}>रजेचे कारण (Reason):</label>
              <textarea name="reason" value={formData.reason} onChange={handleChange} rows="2" placeholder="रजेचे कारण लिहा..." style={{ ...inputStyle, width: '100%' }}></textarea>
            </div>

            {/* तारीख श्रेणी निवड (Date Range Selection) */}
            <div style={{ gridColumn: 'span 2', background: '#f8fafc', padding: '12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
              <label style={{ ...labelStyle, color: '#1e293b', marginBottom: '8px' }}>📅 रजेच्या तारखा निवडा (Date Range):</label>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: '140px' }}>
                  <span style={{ fontSize: '11px', color: '#64748b' }}>पासून (From Date):</span>
                  <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} style={inputStyle} />
                </div>
                <div style={{ flex: 1, minWidth: '140px' }}>
                  <span style={{ fontSize: '11px', color: '#64748b' }}>पर्यंत (To Date):</span>
                  <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} style={inputStyle} />
                </div>
                <div style={{ alignSelf: 'flex-end' }}>
                  <button type="button" onClick={handleAddDateRange} style={addButtonStyle}>+ तारखा जोडा (Add)</button>
                </div>
              </div>
            </div>

            {/* CL तारखा */}
            <div style={{ gridColumn: 'span 2' }}>
              <label style={labelStyle}>CL तारखा व कारणे (एकूण: {clLeaveDates.length}):</label>
              <div style={dateListStyle}>
                {clLeaveDates.length > 0 ? clLeaveDates.map((item, index) => (
                  <span key={index} style={{ ...dateBadgeStyle, flexDirection: 'column', alignItems: 'flex-start', padding: '6px 10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', gap: '15px' }}>
                      <strong>📅 {item.date}</strong>
                      <button type="button" onClick={() => handleRemoveDate(item.date, 'CL')} style={removeBtnStyle}>×</button>
                    </div>
                    <span style={{ fontSize: '11px', color: '#475569', fontStyle: 'italic' }}>कारण: {item.reason}</span>
                  </span>
                )) : <span style={{ color: '#777', fontSize: '13px' }}>कोणतीही CL तारीख जोडलेली नाही.</span>}
              </div>
            </div>

            {/* EL तारखा */}
            <div style={{ gridColumn: 'span 2' }}>
              <label style={labelStyle}>EL तारखा व कारणे (एकूण: {elLeaveDates.length}):</label>
              <div style={dateListStyle}>
                {elLeaveDates.length > 0 ? elLeaveDates.map((item, index) => (
                  <span key={index} style={{ ...dateBadgeStyle, flexDirection: 'column', alignItems: 'flex-start', padding: '6px 10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', gap: '15px' }}>
                      <strong>📅 {item.date}</strong>
                      <button type="button" onClick={() => handleRemoveDate(item.date, 'EL')} style={removeBtnStyle}>×</button>
                    </div>
                    <span style={{ fontSize: '11px', color: '#475569', fontStyle: 'italic' }}>कारण: {item.reason}</span>
                  </span>
                )) : <span style={{ color: '#777', fontSize: '13px' }}>कोणतीही EL तारीख जोडलेली नाही.</span>}
              </div>
            </div>

            {/* C-Off तारखा */}
            <div style={{ gridColumn: 'span 2' }}>
              <label style={labelStyle}>C-Off तारखा व कारणे (एकूण: {coffLeaveDates.length}):</label>
              <div style={dateListStyle}>
                {coffLeaveDates.length > 0 ? coffLeaveDates.map((item, index) => (
                  <span key={index} style={{ ...dateBadgeStyle, flexDirection: 'column', alignItems: 'flex-start', padding: '6px 10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', gap: '15px' }}>
                      <strong>📅 {item.date}</strong>
                      <button type="button" onClick={() => handleRemoveDate(item.date, 'COff')} style={removeBtnStyle}>×</button>
                    </div>
                    <span style={{ fontSize: '11px', color: '#475569', fontStyle: 'italic' }}>कारण: {item.reason}</span>
                  </span>
                )) : <span style={{ color: '#777', fontSize: '13px' }}>कोणतीही C-Off तारीख जोडलेली नाही.</span>}
              </div>
            </div>

            <div style={{ gridColumn: 'span 2', marginTop: '10px', display: 'flex', gap: '10px' }}>
              <button type="submit" style={{ flex: 1, padding: '12px', background: '#0d233a', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>
                {isEditing ? '💾 अपडेट सेव्ह करा' : '📩 रजा अर्ज सबमिट करा'}
              </button>
              {isEditing && (
                <button type="button" onClick={resetForm} style={{ padding: '12px 20px', background: '#64748b', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>रद्द करा</button>
              )}
            </div>

          </form>
        </div>
      )}

      {/* २. क्रेडिट रजा टॅब */}
      {activeTab === 'credit' && (
        <div style={cardStyle}>
          <h2>➕ सुट्टीच्या दिवशी काम केल्यामुळे रजा जमा करा (Credit Leave)</h2>
          <form onSubmit={handleCreditSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginTop: '15px' }}>
            <div style={{ gridColumn: 'span 2' }}>
              <label style={labelStyle}>कर्मचाऱ्याचे नाव:</label>
              <input type="text" placeholder="🔍 नाव टाईप करून शोधा..." value={creditSearchTerm} onChange={(e) => setCreditSearchTerm(e.target.value)} style={{ ...inputStyle, marginBottom: '8px' }} />
              <select name="employeeName" value={creditForm.employeeName} onChange={handleCreditChange} required style={inputStyle}>
                <option value="">-- कर्मचारी निवडा --</option>
                {filteredCreditEmployees.map((emp, index) => (
                  <option key={index} value={emp.employeeName}>{emp.employeeName} ({emp.employeeRole || emp.designation || 'पद नाही'})</option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>रजेचा प्रकार:</label>
              <select name="leaveType" value={creditForm.leaveType} onChange={handleCreditChange} style={inputStyle}>
                <option value="COff">C-Off (कॅज्युअल ऑफ)</option>
                <option value="EL">EL (अर्न लीव्ह)</option>
                <option value="CL">CL (कॅज्युअल लीव्ह)</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>किती दिवस वाढवायचे आहेत?</label>
              <input type="number" name="daysAdded" value={creditForm.daysAdded} onChange={handleCreditChange} min="0.5" step="0.5" required style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>कधी काम केले (तारीख):</label>
              <input type="date" name="date" value={creditForm.date} onChange={handleCreditChange} required style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>कारण / तपशील:</label>
              <input type="text" name="reason" value={creditForm.reason} onChange={handleCreditChange} placeholder="उदा. रविवारी कोर्ट काम" required style={inputStyle} />
            </div>
            <div style={{ gridColumn: 'span 2', marginTop: '10px' }}>
              <button type="submit" style={{ width: '100%', padding: '12px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>➕ रजा खात्यात जमा करा</button>
            </div>
          </form>
        </div>
      )}

      {/* ३. रेकॉर्ड्स टेबल सेक्शन (फक्त एडिट बटणासह) */}
      {activeTab === 'records' && (
        <div style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
            <h2>📊 कर्मचाऱ्यांची रजा शिल्लक व इतिहास</h2>
            <input type="text" placeholder="🔍 नाव किंवा पदाने शोधा..." value={recordSearchTerm} onChange={(e) => setRecordSearchTerm(e.target.value)} style={{ padding: '8px 12px', borderRadius: '4px', border: '1px solid #cbd5e1', width: '250px' }} />
          </div>

          <div style={{ maxHeight: '700px', overflowY: 'auto', overflowX: 'auto', marginTop: '15px', border: '1px solid #cbd5e1', borderRadius: '6px' }}>
            <table style={{ fontSize: '13px', width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ position: 'sticky', top: 0, zIndex: 1, background: '#f8fafc' }}>
                <tr style={{ borderBottom: '2px solid #cbd5e1' }}>
                  <th style={thStyle}>अ.क्र.</th>
                  <th style={thStyle}>कर्मचाऱ्याचे नाव</th>
                  <th style={thStyle}>पद (Designation)</th>
                  <th style={thStyle}>एकूण कोटा (CL/EL/COff)</th>
                  <th style={thStyle}>वापरलेल्या रजा</th>
                  <th style={thStyle}>शिल्लक रजा</th>
                  <th style={{ ...thStyle, textAlign: 'center' }}>कृती (Action)</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.length > 0 ? filteredRecords.map((emp, index) => {
                  const tCL = emp.totalCL ?? 15;
                  const tEL = emp.totalEL ?? 30;
                  const tCOff = emp.totalCOff ?? 0;
                  const uCL = emp.clLeaveCount ?? (Array.isArray(emp.clLeaveDates) ? emp.clLeaveDates.length : 0);
                  const uEL = emp.elLeaveCount ?? (Array.isArray(emp.elLeaveDates) ? emp.elLeaveDates.length : 0);
                  const uCOff = emp.coffLeaveCount ?? (Array.isArray(emp.coffLeaveDates) ? emp.coffLeaveDates.length : 0);
                  const bCL = emp.balanceCL ?? (tCL - uCL);
                  const bEL = emp.balanceEL ?? (tEL - uEL);
                  const bCOff = emp.balanceCOff ?? (tCOff - uCOff);

                  return (
                    <tr key={index} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={tdStyle}>{index + 1}</td>
                      <td style={tdStyle}><strong>{emp.employeeName}</strong></td>
                      <td style={tdStyle}>{emp.employeeRole || emp.designation || '-'}</td>
                      <td style={tdStyle}>CL: {tCL} | EL: {tEL} | COff: {tCOff}</td>
                      <td style={tdStyle}>CL: {uCL} | EL: {uEL} | COff: {uCOff}</td>
                      <td style={tdStyle}>
                        <span style={{ background: '#e0f2fe', color: '#0369a1', padding: '4px 8px', borderRadius: '4px', fontWeight: 'bold' }}>
                          CL: {bCL} | EL: {bEL} | COff: {bCOff}
                        </span>
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                          <button onClick={() => loadEmployeeToForm(emp)} style={editBtnStyle}>✏️ एडिट</button>
                        </div>
                      </td>
                    </tr>
                  );
                }) : <tr><td colSpan="7" style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>कोणताही डेटा उपलब्ध नाही.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

const cardStyle = { background: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' };
const tabButtonStyle = { padding: '10px 20px', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '14px' };
const labelStyle = { fontSize: '13px', fontWeight: '600', color: '#333', marginBottom: '4px', display: 'block' };
const inputStyle = { width: '100%', padding: '8px 10px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '14px', boxSizing: 'border-box' };
const addButtonStyle = { padding: '9px 15px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', whiteSpace: 'nowrap' };
const dateListStyle = { display: 'flex', flexWrap: 'wrap', gap: '8px', padding: '10px', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '5px', minHeight: '45px', alignItems: 'center' };
const dateBadgeStyle = { background: '#e2e8f0', color: '#0f172a', padding: '4px 10px', borderRadius: '4px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' };
const removeBtnStyle = { background: 'transparent', border: 'none', color: '#ef4444', fontWeight: 'bold', cursor: 'pointer', fontSize: '15px' };
const thStyle = { padding: '10px', textAlign: 'left', fontWeight: '600', color: '#334155' };
const tdStyle = { padding: '10px', color: '#334155', verticalAlign: 'top' };
const editBtnStyle = { padding: '5px 10px', background: '#f59e0b', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' };
// import React, { useState, useEffect } from 'react';
