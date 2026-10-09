import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, LogOut, Shield } from 'lucide-react';

const EmployeeProfile = () => {
  const [employeeData, setEmployeeData] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    // लॉगिन करताना सेव्ह केलेला युझर डेटा वाचणे
    const storedUser = localStorage.getItem('user');
    const isAuthenticated = localStorage.getItem('isAuthenticated');

    if (!isAuthenticated || !storedUser) {
      navigate('/login', { replace: true });
      return;
    }

    setEmployeeData(JSON.parse(storedUser));
  }, [navigate]);

  // const handleLogout = () => {
  //   localStorage.clear();
  //   navigate('/login', { replace: true });
  // };

  const handleLogout = () => {
    localStorage.clear(); // सर्व लोकल स्टोरेज डेटा साफ करा
    
    // युजरचा डेटा आणि स्टेट रीसेट करण्यासाठी पेज पूर्ण रिफ्रेश करा
    window.location.href = '/'; 
  };

  if (!employeeData) {
    return <div style={{ textAlign: 'center', marginTop: '50px', fontSize: '18px' }}>लोड होत आहे... (Loading...)</div>;
  }

  // इथे तुम्ही पाठवलेला डिझाईन आणि टेबलचा कोड वापरला आहे (फक्त selectedEmp ऐवजी employeeData वापरले आहे)
  return (
    <div style={{ background: '#f8fafc', minHeight: '100vh', padding: '20px', fontFamily: "'Segoe UI', Roboto, sans-serif" }}>
      {/* टॉप बार / लॉगआउट बटन */}
      <div style={{ maxWidth: '850px', margin: '0 auto 20px auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', padding: '15px 25px', borderRadius: '10px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
        <div>
          <h2 style={{ color: '#0d233a', margin: 0, fontSize: '20px' }}>🏛️ जिल्हा व सत्र न्यायालय, नाशिक</h2>
          <p style={{ color: '#64748b', margin: '3px 0 0 0', fontSize: '13px' }}>कर्मचारी माहिती पोर्टल (Employee Portal)</p>
        </div>
        <button 
          onClick={handleLogout}
          style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <LogOut size={16} /> बाहेर पडा (Logout)
        </button>
      </div>

      {/* मुख्य माहिती कार्ड (View Info Modal सारखाच हुबेहूब लुक) */}
      <div style={{ background: '#fff', padding: '30px', borderRadius: '10px', width: '850px', maxWidth: '100%', margin: '0 auto', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #0d233a', paddingBottom: '12px', marginBottom: '20px' }}>
          <h3 style={{ color: '#0d233a', margin: 0, fontSize: '18px' }}>📋 कर्मचाऱ्याची संपूर्ण माहिती (Employee Details)</h3>
          <span style={{ background: '#d1fae5', color: '#065f46', padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold' }}>
            सक्रिय कर्मचारी (Active)
          </span>
        </div>
        
        <h4 style={modalSectionTitleStyle}>👤 १. मूलभूत माहिती व ओळख (Basic & Personal Information)</h4>
        <div style={modalGridStyle}>
          <div style={infoBoxStyle}><strong>पूर्ण नाव:</strong> {employeeData.employeeName || '-'}</div>
          <div style={infoBoxStyle}><strong>लिंग:</strong> {employeeData.gender || '-'}</div>
          <div style={infoBoxStyle}><strong>जन्मतारीख (DOB):</strong> {employeeData.dob || '-'}</div>
          <div style={infoBoxStyle}><strong>पद / रोल:</strong> {employeeData.employeeRole || employeeData.designation || '-'}</div>
          <div style={infoBoxStyle}><strong>कर्मचारी आयडी:</strong> {employeeData.employeeId || '-'}</div>
          <div style={infoBoxStyle}><strong>मोबाईल नंबर:</strong> {employeeData.mobileNo || '-'}</div>
        </div>

        <h4 style={modalSectionTitleStyle}>🏛️ २. ऑफिस, लोकेशन व नियुक्ती माहिती (Office & Location Details)</h4>
        <div style={modalGridStyle}>
          <div style={infoBoxStyle}><strong>सेक्शन:</strong> {employeeData.sectionName || '-'}</div>
          <div style={infoBoxStyle}><strong>रूम नंबर:</strong> {employeeData.roomNumber || '-'}</div>
          <div style={infoBoxStyle}><strong>फ्लोअर नंबर:</strong> {employeeData.flowerNumber || '-'}</div>
          <div style={infoBoxStyle}><strong>ऑफिस/कोर्ट:</strong> {employeeData.underOfficeOrCourt || '-'}</div>
          <div style={infoBoxStyle}><strong>सध्याचे न्यायाधीश:</strong> {employeeData.underJudicialOfficer || '-'}</div>
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
                const leaveRecords = employeeData.takenLeaves || employeeData.leaveHistory || employeeData.leaves || [];
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
              {employeeData.transferHistory && employeeData.transferHistory.length > 0 ? (
                employeeData.transferHistory.map((transfer, tIndex) => (
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
                const tenureList = employeeData.officersDuration || employeeData.tenureHistory || [];
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
      </div>
    </div>
  );
};

const modalSectionTitleStyle = {
  color: '#0d233a', fontSize: '15px', borderBottom: '1px solid #cbd5e1', paddingBottom: '6px', marginTop: '20px', marginBottom: '10px', fontWeight: 'bold'
};

const modalGridStyle = {
  display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '10px', fontSize: '14px', marginBottom: '15px'
};

const infoBoxStyle = {
  background: '#f8fafc', padding: '10px 14px', borderRadius: '6px', border: '1px solid #e2e8f0'
};

export default EmployeeProfile;
