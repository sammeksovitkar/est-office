import React, { useState } from 'react';
import { Eye, MapPin, Briefcase, Calendar } from 'lucide-react';

export default function StaffTable({ filteredData, onEdit, onDelete }) {
  // डेटा अजून लोड होत असेल किंवा अर्रे नसेल तर सेफ गार्ड
  const dataList = Array.isArray(filteredData) ? filteredData : [];
  
  // व्ह्यू पॉपअपसाठी स्टेट्स
  const [selectedItem, setSelectedItem] = useState(null);
  const [isViewOpen, setIsViewOpen] = useState(false);

  const handleOpenView = (item) => {
    setSelectedItem(item);
    setIsViewOpen(true);
  };

  // एडिट बटणावर क्लिक केल्यावर डेटा अचूक मॅप करून पाठवणारे फंक्शन
  const handleEditClick = (item) => {
    const standardizedData = {
      ...item,
      id: item.id,
      employeeName: item.employeeName || item.officerName || '',
      employeeRole: item.employeeRole || item.judgesDesignation || 'Junior Clerk',
      underTaluka: item.underTaluka || item.talukaName || 'Nashik (HQ)',
      underOfficeOrCourt: item.underOfficeOrCourt || item.courtEstablishment || item.roomName || '',
      roomNumber: item.roomNumber || item.roomName || '',
      employeeId: item.employeeId || item.id || '',
      mobileNo: item.mobileNo || '',
      status: item.status || 'Active',
      judicialOfficerGrade: item.judicialOfficerGrade || '',
      underJudicialOfficer: item.underJudicialOfficer || '',
      contractExpiryDate: item.contractExpiryDate || '',
      totalCL: item.totalCL || 8,
      totalEL: item.totalEL || 30,
      takenLeaves: item.takenLeaves || []
    };
    
    // मुख्य पेरेंट कम्पोनंटच्या onEdit फंक्शनला डेटा पाठवणे
    onEdit(standardizedData);
  };

  // रजांची स्ट्रिंग सुरक्षितपणे अर्रे मध्ये रूपांतरित करण्यासाठी हेल्पर फंक्शन (क्रॅश प्रूफ)
  const parseLeaves = (takenLeaves) => {
    if (Array.isArray(takenLeaves)) return takenLeaves;
    if (typeof takenLeaves === 'string' && takenLeaves.trim() !== '') {
      try {
        return JSON.parse(takenLeaves);
      } catch (e) {
        console.error("Leave history parse error:", e);
        return [];
      }
    }
    return [];
  };

  return (
    <div className="table-responsive" style={{ position: 'relative' }}>
      <table className="court-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th>ID</th>
            <th>कर्मचाऱ्याचे नाव व पद (Name & Designation)</th>
            <th>तालुका न्यायालय (Station / HQ)</th>
            <th>शाखा / कोर्ट हॉल</th>
            <th>हजेरी & रजा स्थिती</th>
            <th>ॲक्शन</th>
          </tr>
        </thead>
        <tbody>
          {dataList.length === 0 ? (
            <tr>
              <td colSpan="6" style={{ textAlign: 'center', padding: '20px' }}>
                कोणतीही नोंद सापडली नाही किंवा डेटा लोड होत आहे...
              </td>
            </tr>
          ) : (
            dataList.map((item) => {
              // सुरक्षिततेसाठी घेतलेल्या रजांचा डेटा हेल्पर फंक्शनद्वारे चेक करणे
              const leavesArray = parseLeaves(item.takenLeaves);

              // डिस्प्लेसाठी नावे ठरवणे (Fallback logic)
              const displayName = item.employeeName || item.officerName || '-';
              const displayRole = item.employeeRole || item.judgesDesignation || 'Staff';
              const displayTaluka = item.underTaluka || item.talukaName || '-';
              const displayOffice = item.underOfficeOrCourt || item.courtEstablishment || item.roomName || '-';

              return (
                <tr key={item.id}>
                  <td>{item.id}</td>
                  
                  {/* मुख्य नाव आणि पद */}
                  <td>
                    <strong style={{ color: '#1e293b', fontSize: '15px' }}>{displayName}</strong>
                    <br />
                    <small style={{ color: '#4f46e5', fontWeight: '600' }}>{displayRole}</small>
                    {(item.employeeId || item.id) && (
                      <span style={{ fontSize: '11px', color: '#64748b' }}> • ID: {item.employeeId || item.id}</span>
                    )}
                  </td>
                  
                  {/* स्टेशन / तालुका मुख्यालय */}
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '600', color: '#0f172a' }}>
                      <MapPin size={14} color="#ef4444"/>
                      {displayTaluka}
                    </div>
                  </td>
                  
                  {/* कोर्ट हॉल किंवा शाखा */}
                  <td>
                    <strong>{displayOffice}</strong>
                    {(item.roomNumber || item.roomName) && (
                      <span style={{ fontSize: '12px', color: '#64748b' }}> (खोली: {item.roomNumber || item.roomName})</span>
                    )}
                  </td>
                  
                  {/* हजेरी स्टेटस आणि लाइव्ह शिल्लक रजा */}
                  <td>
                    <span 
                      className={`status-badge ${item.status === 'Active' || item.status === '🟢 कार्यरत' ? 'active' : 'leave'}`} 
                      style={{ display: 'inline-block', padding: '4px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', background: (item.status === 'Active' || item.status === '🟢 कार्यरत') ? '#dcfce7' : '#fef2f2', color: (item.status === 'Active' || item.status === '🟢 कार्यरत') ? '#15803d' : '#b91c1c' }}
                    >
                      {(item.status === 'Active' || item.status === '🟢 कार्यरत') ? '🟢 कार्यरत' : '🔴 रजेवर'}
                    </span>
                    <br />
                    <small style={{ fontSize: '11px', color: '#475569', marginTop: '2px', display: 'block' }}>
                      CL शिल्लक: <strong>{item.balanceCL ?? (parseInt(item.totalCL || 8) - leavesArray.filter(l => l?.type && String(l.type).startsWith('CL')).length)}</strong> | 
                      EL शिल्लक: <strong>{item.balanceEL ?? (parseInt(item.totalEL || 30) - leavesArray.filter(l => l?.type && String(l.type).startsWith('EL')).length)}</strong>
                    </small>
                  </td>
                  
                  {/* ॲक्शन्स बटणे */}
                  <td>
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      {/* व्ह्यू बटण */}
                      <button 
                        type="button"
                        onClick={() => handleOpenView(item)}
                        style={{ padding: '6px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '6px', color: '#1e40af', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                        title="संपूर्ण माहिती पहा"
                      >
                        <Eye size={15} />
                      </button>
                      
                      {/* एडिट बटण */}
                      <button 
                        type="button"
                        className="btn-edit" 
                        onClick={() => handleEditClick(item)} 
                        style={{ padding: '6px 12px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold', color: '#1e293b' }}
                      >
                        ✏️ एडिट
                      </button>

                      {/* डिलीट बटण */}
                      <button 
                        type="button"
                        className="btn-delete" 
                        onClick={() => onDelete(item.id)} 
                        style={{ padding: '6px 12px', background: '#fee2e2', border: '1px solid #fca5a5', color: '#991b1b', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>

      {/* ==================== VIEW INFO POPUP MODEL ==================== */}
      {isViewOpen && selectedItem && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999, padding: '20px' }}>
          <div style={{ background: '#fff', padding: '25px', borderRadius: '16px', maxWidth: '550px', width: '100%', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', border: '1px solid #e2e8f0' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #f1f5f9', paddingBottom: '12px', marginBottom: '18px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', color: '#1e293b' }}>
                🪪 कर्मचारी संपूर्ण तपशील कार्ड
              </h3>
              <button onClick={() => setIsViewOpen(false)} style={{ background: '#f1f5f9', border: 'none', width: '28px', height: '28px', borderRadius: '50%', fontSize: '14px', cursor: 'pointer', fontWeight: 'bold', color: '#64748b' }}>✕</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontFamily: 'sans-serif' }}>
              
              <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '17px', fontWeight: 'bold', color: '#0f172a', marginBottom: '4px' }}>
                  {selectedItem.employeeName || selectedItem.officerName || '-'}
                </div>
                <div style={{ color: '#334155', fontSize: '14px' }}><b>पद (Designation):</b> {selectedItem.employeeRole || selectedItem.judgesDesignation || '-'}</div>
                <div style={{ color: '#334155', fontSize: '14px' }}><b>GPF / DCPS ID:</b> {selectedItem.employeeId || selectedItem.id || '-'}</div>
                {selectedItem.mobileNo && <div style={{ color: '#334155', fontSize: '14px' }}><b>📞 मोबाईल क्रमांक:</b> {selectedItem.mobileNo}</div>}
              </div>

              <div style={{ background: '#eff6ff', padding: '14px', borderRadius: '10px', border: '1px solid #bfdbfe' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#1e40af', fontWeight: '700', fontSize: '13px', marginBottom: '6px' }}>
                  <Briefcase size={14}/> कार्यालयीन आस्थापना (Court Room Details)
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '14px', color: '#1e3a8a' }}>
                  <div><b>📍 तालुका:</b> {selectedItem.underTaluka || selectedItem.talukaName || '-'}</div>
                  <div><b>शाखा / कोर्ट:</b> {selectedItem.underOfficeOrCourt || selectedItem.courtEstablishment || selectedItem.roomName || '-'}</div>
                  <div><b>खोली क्र:</b> {selectedItem.roomNumber || selectedItem.roomName || '-'}</div>
                  <div><b>मजला (Floor):</b> {selectedItem.floor || '---'}</div>
                </div>
                {selectedItem.roomType && <div style={{ fontSize: '14px', color: '#1e3a8a', marginTop: '4px' }}><b>शाखा प्रकार:</b> {selectedItem.roomType}</div>}
                {selectedItem.judgeName && <div style={{ fontSize: '14px', color: '#1e3a8a', marginTop: '4px' }}><b>👨‍⚖️ संबंधित न्यायाधीश:</b> मा. {selectedItem.judgeName} {selectedItem.judgesDesignation ? `(${selectedItem.judgesDesignation})` : ''}</div>}
                {selectedItem.stenoName && <div style={{ fontSize: '13px', color: '#64748b', marginTop: '2px' }}><b>Stenographer:</b> {selectedItem.stenoName}</div>}
                {selectedItem.underJudicialOfficer && <div style={{ fontSize: '14px', color: '#1e3a8a', marginTop: '4px' }}><b>नियंत्रक अधिकारी:</b> {selectedItem.underJudicialOfficer}</div>}
              </div>

              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#0f172a', fontWeight: '700', fontSize: '13px', marginBottom: '6px' }}>
                  <Calendar size={14}/> घेतलेल्या रजांचा इतिहास (Leave History)
                </div>
                <div style={{ maxHeight: '130px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '13px' }}>
                  {(() => {
                    const leaves = parseLeaves(selectedItem.takenLeaves);
                        
                    return leaves.length > 0 ? (
                      leaves.map((leave, i) => (
                        <div key={leave.date ? `${leave.date}-${i}` : i} style={{ padding: '8px 12px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span><b>📅 {leave.date || '-'}</b> - <small style={{ color: '#64748b' }}>{leave.reason || 'वैयक्तिक काम'}</small></span>
                          <span style={{ background: '#fee2e2', color: '#991b1b', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' }}>{leave.type || 'CL'}</span>
                        </div>
                      ))
                    ) : (
                      <div style={{ padding: '15px', color: '#94a3b8', fontStyle: 'italic', textAlign: 'center' }}>कोणतीही रजा घेतलेली नाही.</div>
                    );
                  })()}
                </div>
              </div>

            </div>

            <button 
              onClick={() => setIsViewOpen(false)} 
              style={{ width: '100%', marginTop: '20px', padding: '10px', background: '#1e293b', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '14px' }}
            >
              बंद करा
            </button>
          </div>
        </div>
      )}
    </div>
  );
}