import React, { useState } from 'react';
import axios from 'axios';

/* ---------------------------------------------------- */
/* १. EMPLOYEE DIRECTORY (कर्मचारी यादी व Bulk Update Feature) */
/* ---------------------------------------------------- */
export function EmployeeDirectory({ employees, onEditClick, onRefresh }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState('ALL'); // 👈 Dropdown filter sathi state
  const [selectedEmp, setSelectedEmp] = useState(null); // View Modal sathi
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);

  // 🔹 मल्टिपल सिलेक्शन आणि बल्क अपडेटसाठी नवीन स्टेट्स
  const [selectedIds, setSelectedIds] = useState([]);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [bulkData, setBulkData] = useState({
    roomNumber: '',
    flowerNumber: '',
    sectionName: '',
    underOfficeOrCourt: '',
    underJudicialOfficer: '',
    effectiveDate: new Date().toISOString().split('T')[0]
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://172.16.171.96:5000/api';

  // डिलीट करण्याची फंक्शनॅलिटी
  const handleDelete = async (id, name) => {
    if (window.confirm(`तुम्हाला खरोखर "${name}" यांची माहिती डिलीट करायची आहे का?`)) {
      try {
        await axios.delete(`${API_BASE_URL}/employees/${id}`);
        alert('✅ कर्मचारी यशस्वीरीत्या डिलीट करण्यात आला.');
        if (onRefresh) onRefresh();
      } catch (err) {
        console.error("Delete Error:", err);
        alert('🛑 डेटा डिलीट करताना एरर आला.');
      }
    }
  };

  const handleView = (emp) => {
    setSelectedEmp(emp);
    setIsViewModalOpen(true);
  };

  // 🔹 चेकबॉक्स हँडलर (एकल आणि सर्व)
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      const allFilteredIds = filteredEmployees.map(emp => emp.id || emp._id);
      setSelectedIds(allFilteredIds);
    } else {
      setSelectedIds([]);
    }
  };

  const handleCheckboxChange = (id) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(item => item !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  // 🔹 बल्क अपडेट सबमिट फंक्शन
  const handleBulkSubmit = async () => {
    if (selectedIds.length === 0) {
      alert('कृपया किमान एक कर्मचारी निवडा!');
      return;
    }

    if (!bulkData.roomNumber && !bulkData.flowerNumber && !bulkData.sectionName && !bulkData.underOfficeOrCourt && !bulkData.underJudicialOfficer) {
      alert('कृपया बदल करण्यासाठी किमान एक माहिती भरा.');
      return;
    }

    try {
      setIsSubmitting(true);
      const changeDate = bulkData.effectiveDate || new Date().toISOString().split('T')[0];

      await Promise.all(
        selectedIds.map(async (id) => {
          const empToUpdate = employees.find(e => (e.id === id || e._id === id));
          if (!empToUpdate) return;

          let updatedOfficersDuration = [];
          if (Array.isArray(empToUpdate.officersDuration)) {
            updatedOfficersDuration = [...empToUpdate.officersDuration];
          } else if (Array.isArray(empToUpdate.tenureHistory)) {
            updatedOfficersDuration = [...empToUpdate.tenureHistory];
          }

          if (bulkData.underJudicialOfficer && bulkData.underJudicialOfficer.trim() !== '') {
            updatedOfficersDuration = updatedOfficersDuration.map(tenure => {
              if (!tenure.toDate || tenure.toDate === '' || tenure.toDate === null) {
                return { ...tenure, toDate: changeDate };
              }
              return tenure;
            });

            updatedOfficersDuration.push({
              judgeName: bulkData.underJudicialOfficer,
              fromDate: changeDate,
              toDate: '', 
              stationName: bulkData.underOfficeOrCourt || empToUpdate.underOfficeOrCourt || '-'
            });
          }

          const updatedPayload = {
            ...empToUpdate,
            roomNumber: bulkData.roomNumber !== '' ? bulkData.roomNumber : empToUpdate.roomNumber,
            flowerNumber: bulkData.flowerNumber !== '' ? bulkData.flowerNumber : empToUpdate.flowerNumber,
            sectionName: bulkData.sectionName !== '' ? bulkData.sectionName : empToUpdate.sectionName,
            underOfficeOrCourt: bulkData.underOfficeOrCourt !== '' ? bulkData.underOfficeOrCourt : empToUpdate.underOfficeOrCourt,
            underJudicialOfficer: bulkData.underJudicialOfficer !== '' ? bulkData.underJudicialOfficer : empToUpdate.underJudicialOfficer,
            officersDuration: updatedOfficersDuration,
            tenureHistory: updatedOfficersDuration
          };

          const targetId = empToUpdate.id || empToUpdate._id;
          await axios.put(`${API_BASE_URL}/employees/${targetId}`, updatedPayload);
        })
      );

      alert(`✅ यशस्वीरीत्या ${selectedIds.length} कर्मचाऱ्यांची माहिती अपडेट करण्यात आली!`);
      setIsBulkModalOpen(false);
      setSelectedIds([]);
      setBulkData({ 
        roomNumber: '', 
        flowerNumber: '', 
        sectionName: '', 
        underOfficeOrCourt: '', 
        underJudicialOfficer: '',
        effectiveDate: new Date().toISOString().split('T')[0]
      });

      if (onRefresh) onRefresh();

      if (isViewModalOpen && selectedEmp) {
        setTimeout(() => {
          const freshEmp = employees.find(e => (e.id === (selectedEmp.id || selectedEmp._id) || e._id === (selectedEmp.id || selectedEmp._id)));
          if (freshEmp) setSelectedEmp(freshEmp);
        }, 500);
      }

    } catch (err) {
      console.error("Bulk Update Error:", err);
      alert('🛑 बल्क अपडेट करताना एरर आला.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 🔹 फिल्टरींग लॉजिक (ड्रॉपडाऊन पदे व सर्च बारसाठी)
  const filteredEmployees = employees.filter(emp => {
    const matchesRole = selectedRole === 'ALL' || 
      (emp.employeeRole && emp.employeeRole.toLowerCase() === selectedRole.toLowerCase()) ||
      (emp.designation && emp.designation.toLowerCase() === selectedRole.toLowerCase());

    const matchesSearch = 
      (emp.employeeName && emp.employeeName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (emp.mobileNo && emp.mobileNo.toString().includes(searchTerm));

    return matchesRole && matchesSearch;
  });

  const renderSafeValue = (val, fallback = '-') => {
    if (val === null || val === undefined) return fallback;
    if (typeof val === 'object') {
      try { return JSON.stringify(val); } catch (e) { return fallback; }
    }
    return val;
  };

  return (
    <div className="section-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', flexWrap: 'wrap', gap: '10px' }}>
        <h2 style={{ margin: 0 }}>👥 Employee Directory (कर्मचारी यादी)</h2>
        
        {selectedIds.length > 0 && (
          <button 
            onClick={() => setIsBulkModalOpen(true)}
            style={{ background: '#7c3aed', color: '#fff', border: 'none', padding: '8px 15px', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '5px' }}
          >
            🔄 निवडलेल्या ({selectedIds.length}) कर्मचाऱ्यांचे बदल करा
          </button>
        )}
      </div>

      {/* 🔹 डॅशबोर्डसारखाच ड्रॉपडाऊन फिल्टर व सर्च बार */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '15px', flexWrap: 'wrap', background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', alignItems: 'center' }}>
        
        {/* सर्च इनपुट */}
        <div style={{ flex: 1, minWidth: '220px' }}>
          <input 
            type="text" 
            placeholder="🔍 नाव किंवा मोबाईल नंबरने शोधा..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: '100%', padding: '8px 12px', borderRadius: '5px', border: '1px solid #ccc', boxSizing: 'border-box' }}
          />
        </div>

        {/* सर्व पदे (All Designations) ड्रॉपडाऊन फिल्टर */}
        <div style={{ minWidth: '220px' }}>
          <select 
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            style={{ width: '100%', padding: '8px 12px', borderRadius: '5px', border: '1px solid #ccc', background: '#fff', cursor: 'pointer', fontWeight: '500' }}
          >
            <option value="ALL">👔 सर्व पदे (All Designations)</option>
            {Array.from(new Set(employees.map(emp => emp.employeeRole || emp.designation).filter(Boolean))).map((role, idx) => (
              <option key={idx} value={role}>{role}</option>
            ))}
          </select>
        </div>

      </div>

      <div style={{ overflowX: 'auto', maxHeight: '700px', overflowY: 'auto' }}>
        <table className="custom-table" style={{ fontSize: '13px', width: '100%' }}>
          <thead style={{ position: 'sticky', top: 0, background: '#f8fafc', zIndex: 1 }}>
            <tr>
              <th style={{ width: '40px', textAlign: 'center' }}>
                <input 
                  type="checkbox" 
                  onChange={handleSelectAll}
                  checked={filteredEmployees.length > 0 && selectedIds.length === filteredEmployees.length}
                />
              </th>
              <th>Sr.</th>
              <th>कर्मचाऱ्याचे नाव (Name)</th>
              <th>ऑफिस / कोर्ट</th>
              <th>सेक्शन (Section)</th>
              <th>रूम / फ्लोअर (Room/Floor)</th>
              <th>मोबाईल (Mobile)</th>
              <th>न्यायाधीश / पद</th>
              <th style={{ textAlign: 'center' }}>कृती (Actions)</th>
            </tr>
          </thead>
          <tbody>
            {filteredEmployees.length > 0 ? (
              filteredEmployees.map((emp, index) => {
                const empId = emp.id || emp._id;
                const isSelected = selectedIds.includes(empId);
                return (
                  <tr key={empId || index} style={{ backgroundColor: isSelected ? '#eff6ff' : 'transparent' }}>
                    <td style={{ textAlign: 'center' }}>
                      <input 
                        type="checkbox" 
                        checked={isSelected}
                        onChange={() => handleCheckboxChange(empId)}
                      />
                    </td>
                    <td>{index + 1}</td>
                    <td><strong>{renderSafeValue(emp.employeeName)}</strong></td>
                    <td><span style={{ background: '#e2e8f0', padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' }}>{renderSafeValue(emp.underOfficeOrCourt, '-')}</span></td>
                    <td>{renderSafeValue(emp.sectionName, '-')}</td>
                    <td>{renderSafeValue(emp.roomNumber, '-')} (Fl: {renderSafeValue(emp.flowerNumber, '-')})</td>
                    <td>{renderSafeValue(emp.mobileNo, '-')}</td>
                    <td>{renderSafeValue(emp.underJudicialOfficer || emp.employeeRole, '-')}</td>
                    <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                      <button onClick={() => handleView(emp)} title="View Info" style={{ background: '#3b82f6', color: '#fff', border: 'none', padding: '5px 8px', borderRadius: '4px', cursor: 'pointer', marginRight: '5px' }}>👁️</button>
                      <button onClick={() => onEditClick(emp)} title="Edit" style={{ background: '#10b981', color: '#fff', border: 'none', padding: '5px 8px', borderRadius: '4px', cursor: 'pointer', marginRight: '5px' }}>✏️</button>
                      <button onClick={() => handleDelete(empId, emp.employeeName)} title="Delete" style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '5px 8px', borderRadius: '4px', cursor: 'pointer' }}>🗑️</button>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="9" style={{ textAlign: 'center', padding: '20px' }}>कोणताही डेटा आढळला नाही.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 🔹 BULK UPDATE MODAL */}
      {isBulkModalOpen && (
        <div style={modalOverlayStyle}>
          <div style={modalContentStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #0d233a', paddingBottom: '12px', marginBottom: '20px' }}>
              <h3 style={{ color: '#0d233a', margin: 0, fontSize: '18px' }}>
                🔄 एकाधिक कर्मचाऱ्यांचे बदल करा (Bulk Update - {selectedIds.length} Selected)
              </h3>
              <button onClick={() => setIsBulkModalOpen(false)} style={{ background: '#ef4444', color: '#fff', border: 'none', borderRadius: '50%', width: '30px', height: '30px', fontSize: '14px', cursor: 'pointer', fontWeight: 'bold' }}>✖</button>
            </div>

            <div style={modalGridStyle}>
              <div>
                <label style={labelStyle}>बदलाची तारीख (Effective Date):</label>
                <input 
                  type="date" 
                  value={bulkData.effectiveDate}
                  onChange={(e) => setBulkData({...bulkData, effectiveDate: e.target.value})}
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>न्यायाधीशांचे नाव (Under Judicial Officer):</label>
                <input 
                  type="text" 
                  value={bulkData.underJudicialOfficer}
                  onChange={(e) => setBulkData({...bulkData, underJudicialOfficer: e.target.value})}
                  placeholder="नवीन न्यायाधीशांचे नाव टाका"
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>रूम नंबर (Room Number):</label>
                <input 
                  type="text" 
                  value={bulkData.roomNumber}
                  onChange={(e) => setBulkData({...bulkData, roomNumber: e.target.value})}
                  placeholder="उदा. रूम नं. १०२"
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>फ्लोअर नंबर (Floor Number):</label>
                <input 
                  type="text" 
                  value={bulkData.flowerNumber}
                  onChange={(e) => setBulkData({...bulkData, flowerNumber: e.target.value})}
                  placeholder="उदा. १ ला मजला"
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>सेक्शनचे नाव (Section Name):</label>
                <input 
                  type="text" 
                  value={bulkData.sectionName}
                  onChange={(e) => setBulkData({...bulkData, sectionName: e.target.value})}
                  placeholder="उदा. सिविल विभाग"
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>ऑफिस / कोर्ट (Under Office/Court):</label>
                <input 
                  type="text" 
                  value={bulkData.underOfficeOrCourt}
                  onChange={(e) => setBulkData({...bulkData, underOfficeOrCourt: e.target.value})}
                  placeholder="ऑफिस किंवा कोर्ट नाव"
                  style={inputStyle}
                />
              </div>
            </div>

            <div style={{ textAlign: 'right', borderTop: '1px solid #ddd', paddingTop: '15px', marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button onClick={() => setIsBulkModalOpen(false)} style={{ padding: '8px 20px', background: '#cbd5e1', color: '#1e293b', border: 'none', borderRadius: '50px', cursor: 'pointer', fontWeight: 'bold' }}>
                रद्द करा (Cancel)
              </button>
              <button onClick={handleBulkSubmit} disabled={isSubmitting} style={{ padding: '8px 25px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>
                {isSubmitting ? 'अपडेट करत आहे...' : 'बदल सेव्ह करा (Save Changes)'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW INFO MODAL */}
      {isViewModalOpen && selectedEmp && (
        <div style={modalOverlayStyle}>
          <div style={modalContentStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #0d233a', paddingBottom: '12px', marginBottom: '20px', position: 'sticky', top: 0, background: '#fff', zIndex: 10 }}>
              <h3 style={{ color: '#0d233a', margin: 0, fontSize: '18px' }}>📋 कर्मचाऱ्याची संपूर्ण माहिती (Employee Details)</h3>
              <button onClick={() => setIsViewModalOpen(false)} style={{ background: '#ef4444', color: '#fff', border: 'none', borderRadius: '50%', width: '30px', height: '30px', fontSize: '14px', cursor: 'pointer', fontWeight: 'bold' }}>✖</button>
            </div>
            
            <h4 style={modalSectionTitleStyle}>👤 १. मूलभूत माहिती व ओळख (Basic & Personal Information)</h4>
            <div style={modalGridStyle}>
              <div style={infoBoxStyle}><strong>पूर्ण नाव:</strong> {selectedEmp.employeeName || '-'}</div>
              <div style={infoBoxStyle}><strong>लिंग:</strong> {selectedEmp.gender || '-'}</div>
              <div style={infoBoxStyle}><strong>कर्मचारी टाईप:</strong> {selectedEmp.employeeType || '-'}</div>
              <div style={infoBoxStyle}><strong>पद / रोल:</strong> {selectedEmp.employeeRole || selectedEmp.judgeDesignation || selectedEmp.stenoGrade || '-'}</div>
              <div style={infoBoxStyle}><strong>कर्मचारी आयडी:</strong> {selectedEmp.employeeId || '-'}</div>
              <div style={infoBoxStyle}><strong>मोबाईल नंबर:</strong> {selectedEmp.mobileNo || '-'}</div>
            </div>

            <h4 style={modalSectionTitleStyle}>🏛️ २. ऑफिस, लोकेशन व नियुक्ती माहिती (Office & Location Details)</h4>
            <div style={modalGridStyle}>
              <div style={infoBoxStyle}><strong>सेक्शन:</strong> {selectedEmp.sectionName || '-'}</div>
              <div style={infoBoxStyle}><strong>रूम नंबर:</strong> {selectedEmp.roomNumber || '-'}</div>
              <div style={infoBoxStyle}><strong>फ्लोअर नंबर:</strong> {selectedEmp.flowerNumber || '-'}</div>
              <div style={infoBoxStyle}><strong>ऑफिस/कोर्ट:</strong> {selectedEmp.underOfficeOrCourt || '-'}</div>
              <div style={infoBoxStyle}><strong>सध्याचे न्यायाधीश:</strong> {selectedEmp.underJudicialOfficer || '-'}</div>
            </div>

            <h4 style={modalSectionTitleStyle}>३. रजेचा इतिहास (Leave History)</h4>
            <div style={{ overflowX: 'auto', marginBottom: '20px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: '#f1f5f9', color: '#0d233a', textAlign: 'left' }}>
                    <th style={{ padding: '8px', border: '1px solid #cbd5e1' }}>अ.क्र.</th>
                    <th style={{ padding: '8px', border: '1px solid #cbd5e1' }}>रजेची तारीख (Date)</th>
                    <th style={{ padding: '8px', border: '1px solid #cbd5e1' }}>रजेचा प्रकार (Type)</th>
                    <th style={{ padding: '8px', border: '1px solid #cbd5e1' }}>कारण (Reason)</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const leaveRecords = selectedEmp.takenLeaves || selectedEmp.leaveHistory || selectedEmp.leaves || [];
                    if (Array.isArray(leaveRecords) && leaveRecords.length > 0) {
                      return leaveRecords.map((leave, lIndex) => (
                        <tr key={lIndex}>
                          <td style={{ padding: '8px', border: '1px solid #cbd5e1' }}>{lIndex + 1}</td>
                          <td style={{ padding: '8px', border: '1px solid #cbd5e1' }}>{leave.date || leave.leaveDate || leave.fromDate || '-'}</td>
                          <td style={{ padding: '8px', border: '1px solid #cbd5e1' }}>{leave.type || leave.leaveType || 'CL'}</td>
                          <td style={{ padding: '8px', border: '1px solid #cbd5e1' }}>{leave.reason || leave.leaveReason || '-'}</td>
                        </tr>
                      ));
                    } else {
                      return (
                        <tr>
                          <td colSpan="4" style={{ textAlign: 'center', padding: '12px', border: '1px solid #cbd5e1', color: '#64748b' }}>
                            कोणतीही रजा घेतलेली नाही.
                          </td>
                        </tr>
                      );
                    }
                  })()}
                </tbody>
              </table>
            </div>

            <h4 style={modalSectionTitleStyle}>🔄 ४. बदलीचा इतिहास (Transfer History)</h4>
            <div style={{ overflowX: 'auto', marginBottom: '20px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: '#f1f5f9', color: '#0d233a', textAlign: 'left' }}>
                    <th style={{ padding: '8px', border: '1px solid #cbd5e1' }}>अ.क्र.</th>
                    <th style={{ padding: '8px', border: '1px solid #cbd5e1' }}>पासून दिनांक (From)</th>
                    <th style={{ padding: '8px', border: '1px solid #cbd5e1' }}>पर्यंत दिनांक (To)</th>
                    <th style={{ padding: '8px', border: '1px solid #cbd5e1' }}>स्टेशनचे नाव (Station Name)</th>
                    <th style={{ padding: '8px', border: '1px solid #cbd5e1' }}>कारण (Reason)</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedEmp.transferHistory && selectedEmp.transferHistory.length > 0 ? (
                    selectedEmp.transferHistory.map((transfer, tIndex) => (
                      <tr key={tIndex}>
                        <td style={{ padding: '8px', border: '1px solid #cbd5e1' }}>{tIndex + 1}</td>
                        <td style={{ padding: '8px', border: '1px solid #cbd5e1' }}>{transfer.fromDate || '-'}</td>
                        <td style={{ padding: '8px', border: '1px solid #cbd5e1' }}>{transfer.toDate || '-'}</td>
                        <td style={{ padding: '8px', border: '1px solid #cbd5e1' }}>{transfer.stationName || '-'}</td>
                        <td style={{ padding: '8px', border: '1px solid #cbd5e1' }}>{transfer.reason || '-'}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" style={{ textAlign: 'center', padding: '12px', border: '1px solid #cbd5e1', color: '#64748b' }}>
                        कोणताही बदलीचा इतिहास उपलब्ध नाही.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <h4 style={modalSectionTitleStyle}>⏳ ५. न्यायाधीशांच्या अंतर्गत सेवा कालावधी (Tenure / Span History):</h4>
            <div style={{ overflowX: 'auto', marginBottom: '20px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: '#0d233a', color: '#fff', textAlign: 'left' }}>
                    <th style={{ padding: '8px', border: '1px solid #cbd5e1' }}>अ.क्र.</th>
                    <th style={{ padding: '8px', border: '1px solid #cbd5e1' }}>न्यायाधीशांचे नाव (Judge Name)</th>
                    <th style={{ padding: '8px', border: '1px solid #cbd5e1' }}>पासून दिनांक (From)</th>
                    <th style={{ padding: '8px', border: '1px solid #cbd5e1' }}>पर्यंत दिनांक (To)</th>
                    <th style={{ padding: '8px', border: '1px solid #cbd5e1' }}>कोर्ट / स्टेशन</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const tenureList = selectedEmp.officersDuration || selectedEmp.tenureHistory || [];
                    if (Array.isArray(tenureList) && tenureList.length > 0) {
                      return tenureList.map((t, tIdx) => (
                        <tr key={tIdx}>
                          <td style={{ padding: '8px', border: '1px solid #cbd5e1' }}>{tIdx + 1}</td>
                          <td style={{ padding: '8px', border: '1px solid #cbd5e1' }}><strong>{t.judgeName || '-'}</strong></td>
                          <td style={{ padding: '8px', border: '1px solid #cbd5e1' }}>{t.fromDate || '-'}</td>
                          <td style={{ padding: '8px', border: '1px solid #cbd5e1' }}>{t.toDate ? t.toDate : <span style={{ color: 'green', fontWeight: 'bold' }}>सध्या कार्यरत</span>}</td>
                          <td style={{ padding: '8px', border: '1px solid #cbd5e1' }}>{t.stationName || '-'}</td>
                        </tr>
                      ));
                    } else {
                      return (
                        <tr>
                          <td colSpan="5" style={{ textAlign: 'center', padding: '12px', border: '1px solid #cbd5e1', color: '#64748b' }}>
                            कोणताही सेवा कालावधी इतिहास उपलब्ध नाही.
                          </td>
                        </tr>
                      );
                    }
                  })()}
                </tbody>
              </table>
            </div>

            <div style={{ textAlign: 'right', borderTop: '1px solid #ddd', paddingTop: '15px', position: 'sticky', bottom: 0, background: '#fff' }}>
              <button onClick={() => setIsViewModalOpen(false)} style={{ padding: '10px 25px', background: '#0d233a', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>
                बंद करा (Close)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Styling Constants
const modalOverlayStyle = {
  position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
  backgroundColor: 'rgba(0, 0, 0, 0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
};

const modalContentStyle = {
  background: '#fff', padding: '30px', borderRadius: '10px', width: '750px', maxWidth: '95%', maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 8px 20px rgba(0,0,0,0.3)'
};

const modalSectionTitleStyle = {
  color: '#0d233a', fontSize: '15px', borderBottom: '1px solid #cbd5e1', paddingBottom: '6px', marginTop: '15px', marginBottom: '10px', fontWeight: 'bold'
};

const modalGridStyle = {
  display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '10px', fontSize: '14px', marginBottom: '15px'
};

const infoBoxStyle = {
  background: '#f8fafc', padding: '8px 12px', borderRadius: '6px', border: '1px solid #e2e8f0'
};

const labelStyle = {
  fontSize: '13px', fontWeight: '600', color: '#333', marginBottom: '4px', display: 'block'
};

const inputStyle = {
  width: '100%', padding: '8px 10px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box'
};