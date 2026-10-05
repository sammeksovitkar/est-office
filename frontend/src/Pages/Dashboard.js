import React, { useState } from 'react';

export function Dashboard({ 
  employees, 
  leaveListToday, 
  sahebOnLeave, 
  staffOnLeave, 
  filteredEmployees, 
  searchTerm, 
  setSearchTerm, 
  selectedRoom, 
  setSelectedRoom, 
  selectedSaheb, 
  setSelectedSaheb, 
  selectedSection, 
  setSelectedSection, 
  selectedDesignation, 
  setSelectedDesignation, 
  uniqueRooms, 
  uniqueSahebs, 
  uniqueSections, 
  uniqueDesignations,
  setActiveTab, // <--- पेज स्विच करण्यासाठी हे प्रॉप्स जोडले आहे
  defaultCourts = [
    "Principal District and Sessions Court, Nashik",
    "Civil Court Senior Division, Nashik",
    "Civil Court Junior Division, Nashik",
    "Chief Judicial Magistrate Court, Nashik",
    "Civil Court Senior Division, Malegaon",
    "Civil Court Junior Division, Malegaon",
    "Civil Court Senior Division, Niphad",
    "Civil Court Junior Division, Niphad",
    "Civil Court Senior Division, Sinnar",
    "Civil Court Junior Division, Sinnar",
    "Civil Court Senior Division, Yeola",
    "Civil Court Junior Division, Yeola",
    "Civil Court Senior Division, Chandwad",
    "Civil Court Junior Division, Chandwad",
    "Civil Court Senior Division, Kalwan",
    "Civil Court Junior Division, Kalwan",
    "Civil Court Senior Division, Dindori",
    "Civil Court Junior Division, Dindori",
    "Civil Court Senior Division, Igatpuri",
    "Civil Court Junior Division, Igatpuri",
    "Civil Court Senior Division, Trimbakeshwar",
    "Civil Court Junior Division, Trimbakeshwar",
    "Civil Court Senior Division, Peth",
    "Civil Court Junior Division, Peth",
    "Civil Court Senior Division, Surgana",
    "Civil Court Junior Division, Surgana",
    "Labour Court, Nashik",
    "Industrial Court, Nashik",
    "Cooperative Court, Nashik"
  ] 
}) {
  // ऑफिस / कोर्ट (Under Office / Court) स्टेट
  const [selectedOffice, setSelectedOffice] = useState('All');

  // अंतिम फिल्टर केलेले कर्मचारी (ज्यामध्ये ऑफिस/कोर्ट फिल्टर अचूक समाविष्ट आहे)
  const finalFilteredEmployees = filteredEmployees.filter(emp => {
    const empOffice = (emp.underOfficeOrCourt || emp.officeName || emp.courtName || emp.officeCourt || '').trim();
    const matchOffice = selectedOffice === 'All' || empOffice.toLowerCase() === selectedOffice.toLowerCase();
    return matchOffice;
  });

  return (
    <div className="dashboard-view">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 className="dashboard-title" style={{ margin: 0 }}>🏛️ न्यायालय प्रशासकीय डॅशबोर्ड (Court Dashboard)</h2>
        <span style={{ background: '#e0f2fe', color: '#0369a1', padding: '6px 12px', borderRadius: '6px', fontSize: '14px', fontWeight: 'bold' }}>
          📅 आजची तारीख: {new Date().toLocaleDateString('mr-IN')}
        </span>
      </div>

      {/* 📑 CR रिपोर्ट शॉर्टकट कार्ड (नवीन जोडले) */}
      {/* {setActiveTab && (
        <div 
          onClick={() => setActiveTab('cr-report')} 
          style={{ 
            background: 'linear-gradient(135deg, #0d233a 0%, #1e3a8a 100%)', 
            color: '#fff', 
            cursor: 'pointer', 
            padding: '18px 22px', 
            borderRadius: '10px', 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            marginBottom: '20px',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
          }}
        >
          <div>
            <h3 style={{ margin: '0 0 5px 0', fontSize: '18px' }}>📑 CR रिपोर्ट व न्यायाधीश कालावधी (Judge-wise Service Span)</h3>
            <p style={{ margin: 0, fontSize: '13px', opacity: 0.85 }}>कर्मचाऱ्यांच्या न्यायाधीशनिहाय सेवा कालावधीचा रेकॉर्ड तपासा व प्रिंट करा</p>
          </div>
          <span style={{ fontSize: '32px' }}>📂</span>
        </div>
      )} */}

      {/* STATS CARDS GRID */}
      <div className="stats-grid">
        <div className="stat-card card-navy" onClick={() => { setSelectedRoom('All'); setSelectedSaheb('All'); setSelectedSection('All'); setSelectedDesignation('All'); setSelectedOffice('All'); setSearchTerm(''); }}>
          <div>
            <h2>{employees.length}</h2>
            <p>एकूण स्टाफ (Total Staff)</p>
          </div>
          <span style={{ fontSize: '30px' }}>👥</span>
        </div>

        <div className="stat-card card-green">
          <div>
            <h2>{employees.length - leaveListToday.length}</h2>
            <p>आज हजर (Present Today)</p>
          </div>
          <span style={{ fontSize: '30px' }}>✅</span>
        </div>

        <div className="stat-card card-gold">
          <div>
            <h2>{staffOnLeave.length}</h2>
            <p>आज रजेवर (On Leave)</p>
          </div>
          <span style={{ fontSize: '30px' }}>📅</span>
        </div>

        <div className="stat-card card-blue">
          <div>
            <h2>{sahebOnLeave.length}</h2>
            <p>साहेब रजेवर (Judge on Leave)</p>
          </div>
          <span style={{ fontSize: '30px' }}>⚖️</span>
        </div>
      </div>

      {/* 🚨 JUDGE / SAHEB ON LEAVE HIGHLIGHT ALERT BOX */}
      {sahebOnLeave.length > 0 && (
        <div style={{ background: '#fef2f2', borderLeft: '5px solid #dc2626', padding: '15px', borderRadius: '8px', marginBottom: '20px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
          <h3 style={{ color: '#991b1b', margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>⚠️</span> माननीय न्यायमूर्ती / साहेब आज रजेवर आहेत (Judicial Officers on Leave)
          </h3>
          {sahebOnLeave.map((saheb, idx) => (
            <div key={idx} style={{ fontSize: '15px', color: '#7f1d1d', fontWeight: '500' }}>
              • <strong>{saheb.employeeName}</strong> ({saheb.employeeRole}) - रूम नंबर: {saheb.roomNumber || 'N/A'}
            </div>
          ))}
        </div>
      )}

      {/* 🎛️ ADVANCED FILTER & SEARCH BAR FOR DASHBOARD */}
      <div className="section-card" style={{ padding: '15px', background: '#f8fafc', marginBottom: '20px' }}>
        <h4 style={{ margin: '0 0 10px 0', color: '#334155' }}>🔍 ऑफिस/कोर्ट, रूम, साहेब, विभाग व पदानुसार स्टाफ शोधा (Quick Filters & Search)</h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
          
          {/* सर्च इनपुट */}
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <input 
              type="text" 
              placeholder="🔍 नाव किंवा मोबाईलने शोधा..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', background: '#fff' }}
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')}
                style={{ position: 'absolute', right: '8px', background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                ✖
              </button>
            )}
          </div>

          {/* 🏛️ कोर्टनुसार फिल्टर (Dropdown) */}
          <select 
            value={selectedOffice} 
            onChange={(e) => setSelectedOffice(e.target.value)} 
            style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', fontWeight: '500' }}
          >
            <option value="All">🏛️ सर्व कोर्ट आणि कार्यालये (All Courts & Offices)</option>
            {defaultCourts.map((court, idx) => (
              <option key={idx} value={court}>{court}</option>
            ))}
          </select>

          {/* रूम फिल्टर */}
          <select value={selectedRoom} onChange={(e) => setSelectedRoom(e.target.value)} style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff' }}>
            <option value="All">🏢 सर्व रूम्स (All Rooms)</option>
            {uniqueRooms.map((room, idx) => (
              <option key={idx} value={room}>Room No: {room}</option>
            ))}
          </select>

          {/* साहेब फिल्टर */}
          <select value={selectedSaheb} onChange={(e) => setSelectedSaheb(e.target.value)} style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff' }}>
            <option value="All">⚖️ सर्व साहेब (All Judicial Officers)</option>
            {uniqueSahebs.map((saheb, idx) => (
              <option key={idx} value={saheb}>{saheb}</option>
            ))}
          </select>

          {/* विभाग फिल्टर */}
          <select value={selectedSection} onChange={(e) => setSelectedSection(e.target.value)} style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff' }}>
            <option value="All">📂 सर्व विभाग (All Sections)</option>
            {uniqueSections.map((sec, idx) => (
              <option key={idx} value={sec}>{sec}</option>
            ))}
          </select>

          {/* पद फिल्टर */}
          <select value={selectedDesignation} onChange={(e) => setSelectedDesignation(e.target.value)} style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff' }}>
            <option value="All">👔 सर्व पदे (All Designations)</option>
            {uniqueDesignations.map((desig, idx) => (
              <option key={idx} value={desig}>{desig}</option>
            ))}
          </select>

        </div>
      </div>

      {/* 👥 FILTERED STAFF DIRECTORY TABLE ON DASHBOARD */}
      <div className="section-card">
        <div className="section-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <span>👥 स्टाफ मॅट्रिक्स व सद्यस्थिती (Staff Directory & Filtering View)</span>
          <span style={{ fontSize: '13px', background: '#e2e8f0', padding: '2px 8px', borderRadius: '4px' }}>एकूण निकाल: {finalFilteredEmployees.length}</span>
        </div>
        
        <div style={{ maxHeight: '400px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
          <table className="custom-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ position: 'sticky', top: 0, background: '#f8fafc', zIndex: 1 }}>
              <tr>
                <th style={{ padding: '10px' }}>नावा व आयडी</th>
                <th style={{ padding: '10px' }}>ऑफिस / कोर्ट</th>
                <th style={{ padding: '10px' }}>पद (Designation)</th>
                <th style={{ padding: '10px' }}>रूम नं.</th>
                <th style={{ padding: '10px' }}>विभाग (Section)</th>
                <th style={{ padding: '10px' }}>कोणत्या साहेबांतर्गत?</th>
                <th style={{ padding: '10px' }}>मोबाईल नंबर</th>
                <th style={{ padding: '10px' }}>सद्यस्थिती (Status)</th>
              </tr>
            </thead>
            <tbody>
              {finalFilteredEmployees.length > 0 ? (
                finalFilteredEmployees.map(emp => {
                  const isOnLeave = leaveListToday.some(l => l.employeeName === emp.employeeName);
                  return (
                    <tr key={emp.id || emp.employeeId} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '10px' }}>
                        <strong>{emp.employeeName}</strong>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>ID: {emp.employeeId || 'N/A'}</div>
                      </td>
                      <td style={{ padding: '10px' }}>{emp.underOfficeOrCourt || emp.officeName || emp.courtName || emp.officeCourt || '-'}</td>
                      <td style={{ padding: '10px' }}>{emp.employeeRole}</td>
                      <td style={{ padding: '10px' }}>{emp.roomNumber || '-'}</td>
                      <td style={{ padding: '10px' }}>{emp.sectionName || '-'}</td>
                      <td style={{ padding: '10px' }}>{emp.underJudicialOfficer || '-'}</td>
                      <td style={{ padding: '10px' }}>{emp.mobileNo || '-'}</td>
                      <td style={{ padding: '10px' }}>
                        {isOnLeave ? (
                          <span style={{ background: '#fee2e2', color: '#b91c1c', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' }}>
                            🔴 आज रजेवर
                          </span>
                        ) : (
                          <span style={{ background: '#dcfce7', color: '#166534', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' }}>
                            🟢 हजर / ड्युटीवर
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>
                    निवडलेल्या कोर्ट/कार्यालयानुसार कोणताही कर्मचारी सापडला नाही.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 🔴 ON LEAVE TODAY DETAILS TABLE */}
      <div className="section-card">
        <div className="section-title" style={{ marginBottom: '12px' }}>
          <span style={{ color: 'red' }}>🔴</span> आज रजेवर असलेले इतर कर्मचारी (Staff On Leave Today)
        </div>
        
        <div style={{ maxHeight: '300px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
          <table className="custom-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ position: 'sticky', top: 0, background: '#f8fafc', zIndex: 1 }}>
              <tr>
                <th style={{ padding: '10px' }}>Name</th>
                <th style={{ padding: '10px' }}>Post</th>
                <th style={{ padding: '10px' }}>Room</th>
                <th style={{ padding: '10px' }}>Saheb</th>
                <th style={{ padding: '10px' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {staffOnLeave.length > 0 ? (
                staffOnLeave.map((item, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '10px' }}><strong>{item.employeeName}</strong></td>
                    <td style={{ padding: '10px' }}>{item.employeeRole}</td>
                    <td style={{ padding: '10px' }}>{item.roomNumber || '-'}</td>
                    <td style={{ padding: '10px' }}>{item.underJudicialOfficer || '-'}</td>
                    <td style={{ padding: '10px' }}><span style={{ background: '#fef3c7', color: '#92400e', padding: '4px 8px', borderRadius: '4px' }}>आज रजेवर</span></td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', color: '#64748b', padding: '15px' }}>
                    आज कोणताही कर्मचारी रजेवर नाही. सर्व कर्मचारी हजर आहेत! 👍
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