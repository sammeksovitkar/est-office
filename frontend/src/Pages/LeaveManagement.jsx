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

  // ➕ रजा जमा करण्यासाठी (Credit Leave Form States)
  const [creditForm, setCreditForm] = useState({
    employeeName: '',
    leaveType: 'COff', // COff किंवा EL
    daysAdded: 1,
    date: '',
    reason: ''
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [creditSearchTerm, setCreditSearchTerm] = useState('');
  const [recordSearchTerm, setRecordSearchTerm] = useState('');
  const [selectedDate, setSelectedDate] = useState('');

  // वेगवगेल्या रजांच्या तारखा आणि कारणांसाठी स्वतंत्र ॲरे
  const [clLeaveDates, setClLeaveDates] = useState([]);
  const [elLeaveDates, setElLeaveDates] = useState([]);
  const [coffLeaveDates, setCoffLeaveDates] = useState([]);

  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://172.16.171.96:5000/api';

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

  // ➕ रजा अर्ज भरताना तारीख जोडणे
  const handleAddDate = () => {
    if (!selectedDate) {
      alert('कृपया तारीख निवडा!');
      return;
    }

    const newDateObj = {
      date: selectedDate,
      reason: formData.reason || 'N/A'
    };

    if (formData.leaveType === 'CL') {
      if (!clLeaveDates.some(item => item.date === selectedDate)) {
        setClLeaveDates([...clLeaveDates, newDateObj]);
      }
    } else if (formData.leaveType === 'EL') {
      if (!elLeaveDates.some(item => item.date === selectedDate)) {
        setElLeaveDates([...elLeaveDates, newDateObj]);
      }
    } else if (formData.leaveType === 'COff') {
      if (!coffLeaveDates.some(item => item.date === selectedDate)) {
        setCoffLeaveDates([...coffLeaveDates, newDateObj]);
      }
    }
    
    setSelectedDate('');
  };

  const handleRemoveDate = (dateToRemove, type) => {
    if (type === 'CL') setClLeaveDates(clLeaveDates.filter(d => d.date !== dateToRemove));
    if (type === 'EL') setElLeaveDates(elLeaveDates.filter(d => d.date !== dateToRemove));
    if (type === 'COff') setCoffLeaveDates(coffLeaveDates.filter(d => d.date !== dateToRemove));
  };

  // 💾 रजा अर्ज सबमिट किंवा अपडेट करणे
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.employeeName) {
      alert('कृपया कर्मचाऱ्याचे नाव निवडा!');
      return;
    }

    const totalDaysCount = clLeaveDates.length + elLeaveDates.length + coffLeaveDates.length;
    if (totalDaysCount === 0) {
      alert('कृपया कोणत्याही एका रजेसाठी किमान एक तारीख जोडा!');
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
      alert('🛑 प्रक्रिया करताना एरर आला. बॅकएंड चेक करा.');
    }
  };

  // 🌟 सुट्टीच्या दिवशी काम केल्यामुळे रजा (C-Off / EL) जमा करणे (Credit Leave Submit)
  const handleCreditSubmit = async (e) => {
    e.preventDefault();
    if (!creditForm.employeeName || !creditForm.date || !creditForm.reason) {
      alert('कृपया कर्मचारी, तारीख आणि कारण पूर्ण भरा!');
      return;
    }

    const foundEmp = employees.find(emp => emp.employeeName === creditForm.employeeName);
    if (!foundEmp) {
      alert('कर्मचारी सापडला नाही!');
      return;
    }

    const empId = foundEmp.id || foundEmp.rowNumber || foundEmp._id;

    try {
      const res = await axios.post(`${API_BASE_URL}/employees/${empId}/add-credit-leave`, creditForm);
      if (res.data.success || res.status === 200) {
        alert(`✅ यशस्वीरीत्या ${creditForm.daysAdded} ${creditForm.leaveType} जमा करण्यात आले!`);
        setCreditForm({ employeeName: '', leaveType: 'COff', daysAdded: 1, date: '', reason: '' });
        if (onLeaveActionComplete) onLeaveActionComplete();
      }
    } catch (err) {
      console.error("Credit Leave Error:", err);
      alert('🛑 रजा जमा करताना एरर आला. बॅकएंड राऊटर तपासा.');
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
    setActiveTab('records');
    if (onCancelEdit) onCancelEdit();
    if (onLeaveActionComplete) onLeaveActionComplete();
  };

  const filteredEmployees = employees ? employees.filter(emp => 
    emp.employeeName && emp.employeeName.toLowerCase().includes(searchTerm.toLowerCase())
  ) : [];

  const filteredCreditEmployees = employees ? employees.filter(emp => 
    emp.employeeName && emp.employeeName.toLowerCase().includes(creditSearchTerm.toLowerCase())
  ) : [];

  const filteredRecords = employees ? employees.filter(emp => 
    (emp.employeeName && emp.employeeName.toLowerCase().includes(recordSearchTerm.toLowerCase())) ||
    (emp.employeeRole && emp.employeeRole.toLowerCase().includes(recordSearchTerm.toLowerCase()))
  ) : [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* टॅब बटन्स */}
      <div style={{ display: 'flex', gap: '10px', borderBottom: '2px solid #e2e8f0', paddingBottom: '10px', flexWrap: 'wrap' }}>
        <button 
          onClick={() => setActiveTab('form')} 
          style={{
            ...tabButtonStyle,
            background: activeTab === 'form' ? '#0d233a' : '#f1f5f9',
            color: activeTab === 'form' ? '#fff' : '#334155'
          }}
        >
          {isEditing ? '✏️ Edit Mode' : '📋 रजेचा अर्ज (Leave Application)'}
        </button>

        <button 
          onClick={() => setActiveTab('credit')} 
          style={{
            ...tabButtonStyle,
            background: activeTab === 'credit' ? '#0d233a' : '#f1f5f9',
            color: activeTab === 'credit' ? '#fff' : '#334155'
          }}
        >
          ➕ रजा जमा करा (Add C-Off / EL)
        </button>

        <button 
          onClick={() => setActiveTab('records')} 
          style={{
            ...tabButtonStyle,
            background: activeTab === 'records' ? '#0d233a' : '#f1f5f9',
            color: activeTab === 'records' ? '#fff' : '#334155'
          }}
        >
          📊 रजा शिल्लक यादी व इतिहास
        </button>
      </div>

      {/* १. फॉर्म सेक्शन (रजा अर्ज) */}
      {activeTab === 'form' && (
        <div className="section-card" style={cardStyle}>
          <h2>{isEditing ? '✏️ Edit Employee Leave Record' : '📋 Leave Application Form (रजेचा अर्ज)'}</h2>
          <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginTop: '15px' }}>
            
            <div style={{ gridColumn: 'span 2' }}>
              <label style={labelStyle}>Employee Name (कर्मचाऱ्याचे नाव):</label>
              {!isEditing && (
                <input 
                  type="text" 
                  placeholder="🔍 नाव टाईप करून शोधा..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{ ...inputStyle, marginBottom: '8px' }}
                />
              )}
              <select 
                name="employeeName" 
                value={formData.employeeName} 
                onChange={handleEmployeeSelect} 
                required 
                style={inputStyle}
                disabled={isEditing}
              >
                <option value="">-- कर्मचारी निवडा --</option>
                {filteredEmployees.map((emp, index) => (
                  <option key={index} value={emp.employeeName}>
                    {emp.employeeName} ({emp.employeeRole || emp.designation || 'पद नाही'})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={labelStyle}>Designation (पद):</label>
              <input type="text" name="designation" value={formData.designation} onChange={handleChange} required placeholder="पद लिहा" style={inputStyle} />
            </div>

            <div>
              <label style={labelStyle}>Leave Type (रजेचा प्रकार):</label>
              <select name="leaveType" value={formData.leaveType} onChange={handleChange} style={inputStyle}>
                <option value="CL">Casual Leave (CL)</option>
                <option value="EL">Earned Leave (EL)</option>
                <option value="COff">C-Off</option>
              </select>
            </div>

            <div style={{ gridColumn: 'span 2' }}>
              <label style={labelStyle}>Reason (रजेचे कारण):</label>
              <textarea name="reason" value={formData.reason} onChange={handleChange} rows="2" placeholder="कारण लिहा..." style={{ ...inputStyle, width: '100%' }}></textarea>
            </div>

            <div style={{ gridColumn: 'span 2' }}>
              <label style={labelStyle}>Select Leave Date for [{formData.leaveType}] (रजेची तारीख निवडा):</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} style={inputStyle} />
                <button type="button" onClick={handleAddDate} style={addButtonStyle}>+ Add Date</button>
              </div>
            </div>

            {/* CL तारखा */}
            <div style={{ gridColumn: 'span 2' }}>
              <label style={labelStyle}>CL Dates & Reasons (एकूण: {clLeaveDates.length}):</label>
              <div style={dateListStyle}>
                {clLeaveDates.length > 0 ? (
                  clLeaveDates.map((item, index) => (
                    <span key={index} style={{ ...dateBadgeStyle, flexDirection: 'column', alignItems: 'flex-start', padding: '6px 10px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', gap: '15px' }}>
                        <strong>📅 {item.date}</strong>
                        <button type="button" onClick={() => handleRemoveDate(item.date, 'CL')} style={removeBtnStyle}>×</button>
                      </div>
                      <span style={{ fontSize: '11px', color: '#475569', fontStyle: 'italic' }}>कारण: {item.reason}</span>
                    </span>
                  ))
                ) : <span style={{ color: '#777', fontSize: '13px' }}>कोणतीही CL तारीख जोडलेली नाही.</span>}
              </div>
            </div>

            {/* EL तारखा */}
            <div style={{ gridColumn: 'span 2' }}>
              <label style={labelStyle}>EL Dates & Reasons (एकूण: {elLeaveDates.length}):</label>
              <div style={dateListStyle}>
                {elLeaveDates.length > 0 ? (
                  elLeaveDates.map((item, index) => (
                    <span key={index} style={{ ...dateBadgeStyle, flexDirection: 'column', alignItems: 'flex-start', padding: '6px 10px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', gap: '15px' }}>
                        <strong>📅 {item.date}</strong>
                        <button type="button" onClick={() => handleRemoveDate(item.date, 'EL')} style={removeBtnStyle}>×</button>
                      </div>
                      <span style={{ fontSize: '11px', color: '#475569', fontStyle: 'italic' }}>कारण: {item.reason}</span>
                    </span>
                  ))
                ) : <span style={{ color: '#777', fontSize: '13px' }}>कोणतीही EL तारीख जोडलेली नाही.</span>}
              </div>
            </div>

            {/* C-Off तारखा */}
            <div style={{ gridColumn: 'span 2' }}>
              <label style={labelStyle}>C-Off Dates & Reasons (एकूण: {coffLeaveDates.length}):</label>
              <div style={dateListStyle}>
                {coffLeaveDates.length > 0 ? (
                  coffLeaveDates.map((item, index) => (
                    <span key={index} style={{ ...dateBadgeStyle, flexDirection: 'column', alignItems: 'flex-start', padding: '6px 10px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', gap: '15px' }}>
                        <strong>📅 {item.date}</strong>
                        <button type="button" onClick={() => handleRemoveDate(item.date, 'COff')} style={removeBtnStyle}>×</button>
                      </div>
                      <span style={{ fontSize: '11px', color: '#475569', fontStyle: 'italic' }}>कारण: {item.reason}</span>
                    </span>
                  ))
                ) : <span style={{ color: '#777', fontSize: '13px' }}>कोणतीही C-Off तारीख जोडलेली नाही.</span>}
              </div>
            </div>

            <div style={{ gridColumn: 'span 2', marginTop: '10px', display: 'flex', gap: '10px' }}>
              <button type="submit" style={{ flex: 1, padding: '12px', background: '#0d233a', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>
                {isEditing ? '💾 Update Changes' : '📩 Apply for Leave'}
              </button>
              {isEditing && (
                <button type="button" onClick={resetForm} style={{ padding: '12px 20px', background: '#64748b', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
                  रद्द करा
                </button>
              )}
            </div>

          </form>
        </div>
      )}

      {/* २. नवीन टॅब: रजा जमा करा (Credit Leave Tab - सुट्टीच्या दिवशी काम केल्यास C-Off / EL वाढवणे) */}
      {activeTab === 'credit' && (
        <div className="section-card" style={cardStyle}>
          <h2>➕ सुट्टीच्या दिवशी काम केल्यामुळे रजा जमा करा (Add C-Off / EL Credit)</h2>
          <form onSubmit={handleCreditSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginTop: '15px' }}>
            
            <div style={{ gridColumn: 'span 2' }}>
              <label style={labelStyle}>Employee Name (कर्मचाऱ्याचे नाव):</label>
              <input 
                type="text" 
                placeholder="🔍 नाव टाईप करून शोधा..." 
                value={creditSearchTerm}
                onChange={(e) => setCreditSearchTerm(e.target.value)}
                style={{ ...inputStyle, marginBottom: '8px' }}
              />
              <select 
                name="employeeName" 
                value={creditForm.employeeName} 
                onChange={handleCreditChange} 
                required 
                style={inputStyle}
              >
                <option value="">-- कर्मचारी निवडा --</option>
                {filteredCreditEmployees.map((emp, index) => (
                  <option key={index} value={emp.employeeName}>
                    {emp.employeeName} ({emp.employeeRole || emp.designation || 'पद नाही'})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={labelStyle}>कोणती रजा वाढवायची आहे? (Leave Type):</label>
              <select name="leaveType" value={creditForm.leaveType} onChange={handleCreditChange} style={inputStyle}>
                <option value="COff">C-Off (कॅज्युअल ऑफ - सुट्टीच्या दिवशी काम)</option>
                <option value="EL">EL (Earned Leave - बदली / विशेष काम)</option>
                <option value="CL">CL (Casual Leave)</option>
              </select>
            </div>

            <div>
              <label style={labelStyle}>किती दिवस वाढवायचे आहेत? (Days Added):</label>
              <input 
                type="number" 
                name="daysAdded" 
                value={creditForm.daysAdded} 
                onChange={handleCreditChange} 
                min="0.5" 
                step="0.5" 
                required 
                style={inputStyle} 
              />
            </div>

            <div>
              <label style={labelStyle}>कधी काम केले तारीख (Work Date):</label>
              <input 
                type="date" 
                name="date" 
                value={creditForm.date} 
                onChange={handleCreditChange} 
                required 
                style={inputStyle} 
              />
            </div>

            <div>
              <label style={labelStyle}>कारण / तपशील (Reason e.g., रविवारी कोर्ट काम):</label>
              <input 
                type="text" 
                name="reason" 
                value={creditForm.reason} 
                onChange={handleCreditChange} 
                placeholder="उदा. रविवारी सुट्टीच्या दिवशी हजर राहून काम केले." 
                required 
                style={inputStyle} 
              />
            </div>

            <div style={{ gridColumn: 'span 2', marginTop: '10px' }}>
              <button type="submit" style={{ width: '100%', padding: '12px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold', fontSize: '15px' }}>
                ➕ रजा खात्यात जमा करा (Credit Leave)
              </button>
            </div>

          </form>
        </div>
      )}

      {/* ३. रेकॉर्ड्स टेबल सेक्शन (रजा शिल्लक व इतिहास) */}
      {activeTab === 'records' && (
        <div className="section-card" style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
            <h2>📊 Employee Leave Balance & Credit History</h2>
            <input 
              type="text" 
              placeholder="🔍 नाव किंवा पदाने शोधा..." 
              value={recordSearchTerm}
              onChange={(e) => setRecordSearchTerm(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: '4px', border: '1px solid #cbd5e1', width: '250px', fontSize: '13px' }}
            />
          </div>

         <div style={{ maxHeight: '700px', overflowY: 'auto', overflowX: 'auto', marginTop: '15px', border: '1px solid #cbd5e1', borderRadius: '6px' }}>
          <table className="custom-table" style={{ fontSize: '13px', width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ position: 'sticky', top: 0, zIndex: 1, background: '#f8fafc' }}>
              <tr style={{ borderBottom: '2px solid #cbd5e1' }}>
                <th style={thStyle}>Sr.</th>
                <th style={thStyle}>कर्मचाऱ्याचे नाव</th>
                <th style={thStyle}>पद (Designation)</th>
                <th style={thStyle}>एकूण कोटा (CL/EL/COff)</th>
                <th style={thStyle}>वापरलेल्या रजा</th>
                <th style={thStyle}>शिल्लक रजा</th>
                <th style={thStyle}>जमा रजा इतिहास (Credit History)</th>
                <th style={{ ...thStyle, textAlign: 'center' }}>कृती</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords && filteredRecords.length > 0 ? (
                filteredRecords.map((emp, index) => {
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
                      <td style={tdStyle}>
                        {emp.leaveCreditsHistory && emp.leaveCreditsHistory.length > 0 ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', maxHeight: '80px', overflowY: 'auto' }}>
                            {emp.leaveCreditsHistory.map((cr, i) => (
                              <span key={i} style={{ fontSize: '11px', background: '#f0fdf4', color: '#166534', padding: '2px 6px', borderRadius: '4px' }}>
                                <b>+{cr.daysAdded} {cr.leaveType}</b> ({cr.date}) - {cr.reason}
                              </span>
                            ))}
                          </div>
                        ) : <span style={{ color: '#94a3b8', fontSize: '12px' }}>इतिहास नाही</span>}
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                          <button onClick={() => loadEmployeeToForm(emp)} style={editBtnStyle}>✏️ Edit</button>
                          <button onClick={async () => {
                            if(window.confirm(`खरोखर ${emp.employeeName} चा रेकॉर्ड डिलीट करायचा का?`)) {
                              try {
                                await axios.delete(`${API_BASE_URL}/court-staff/${emp.id || emp.rowNumber || emp._id}`);
                                alert('✅ यशस्वीरीत्या डिलीट झाले!');
                                if (onLeaveActionComplete) onLeaveActionComplete();
                              } catch (err) {
                                alert('🛑 डिलीट करताना एरर आला.');
                              }
                            }
                          }} style={deleteBtnStyle}>🗑️ Delete</button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>कोणताही डेटा उपलब्ध नाही.</td>
                </tr>
              )}
            </tbody>
          </table>
         </div>
        </div>
      )}

    </div>
  );
}

// Styles
const cardStyle = { background: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' };
const tabButtonStyle = { padding: '10px 20px', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '14px' };
const labelStyle = { fontSize: '13px', fontWeight: '600', color: '#333', marginBottom: '4px', display: 'block' };
const inputStyle = { width: '100%', padding: '8px 10px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '14px', boxSizing: 'border-box' };
const addButtonStyle = { padding: '0 15px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' };
const dateListStyle = { display: 'flex', flexWrap: 'wrap', gap: '8px', padding: '10px', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '5px', minHeight: '45px', alignItems: 'center' };
const dateBadgeStyle = { background: '#e2e8f0', color: '#0f172a', padding: '4px 10px', borderRadius: '4px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' };
const removeBtnStyle = { background: 'transparent', border: 'none', color: '#ef4444', fontWeight: 'bold', cursor: 'pointer', fontSize: '15px' };
const thStyle = { padding: '10px', textAlign: 'left', fontWeight: '600', color: '#334155' };
const tdStyle = { padding: '10px', color: '#334155', verticalAlign: 'top' };
const editBtnStyle = { padding: '5px 10px', background: '#f59e0b', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' };
const deleteBtnStyle = { padding: '5px 10px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' };