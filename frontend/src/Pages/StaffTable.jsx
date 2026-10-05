export function StaffTable({ filteredData, handleEditInit, handleDelete, setSelectedItem, setIsViewOpen }) {
  return (
    <div style={{ backgroundColor: '#fff', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.02)', overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '800px' }}>
        <thead>
          <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
            <th style={{ padding: '12px 15px', color: '#475569', fontSize: '13px' }}>ID</th>
            <th style={{ padding: '12px 15px', color: '#475569', fontSize: '13px' }}>कर्मचाऱ्याचे नाव व पद</th>
            <th style={{ padding: '12px 15px', color: '#475569', fontSize: '13px' }}>तालुका न्यायालय</th>
            <th style={{ padding: '12px 15px', color: '#475569', fontSize: '13px' }}>शाखा / कोर्ट हॉल</th>
            <th style={{ padding: '12px 15px', color: '#475569', fontSize: '13px' }}>हजेरी & रजा स्थिती</th>
            <th style={{ padding: '12px 15px', color: '#475569', fontSize: '13px' }}>ॲक्शन</th>
          </tr>
        </thead>
        <tbody>
          {filteredData.length === 0 ? (
            <tr>
              <td colSpan="6" style={{ textAlign: 'center', padding: '30px', color: '#94a3b8', fontStyle: 'italic' }}>
                दिलेल्या फिल्टरनुसार कोणतीही नोंद कोर्ट रेकॉर्डमध्ये सापडली नाही...
              </td>
            </tr>
          ) : (
            filteredData.map((item) => {
              const isWorking = item.status === 'Active';
              return (
                <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '12px 15px', fontWeight: 'bold', color: '#64748b' }}>{item.id}</td>
                  <td style={{ padding: '12px 15px' }}>
                    <strong style={{ color: '#1e293b', fontSize: '14px' }}>{item.employeeName}</strong>
                    {item.judicialOfficerGrade && <span style={{ background: '#f3e8ff', color: '#6b21a8', fontSize: '11px', padding: '1px 5px', borderRadius: '4px', marginLeft: '6px', fontWeight: 'bold' }}>{item.judicialOfficerGrade}</span>}
                    <br />
                    <small style={{ color: '#4f46e5', fontWeight: '600' }}>{item.employeeRole}</small>
                  </td>
                  <td style={{ padding: '12px 15px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '600', color: '#0f172a', fontSize: '13px' }}>
                      <MapPin size={13} color="#ef4444"/>{item.underTaluka}
                    </div>
                  </td>
                  <td style={{ padding: '12px 15px', fontSize: '13px' }}>
                    <strong>{item.underOfficeOrCourt || '-'}</strong>
                  </td>
                  <td style={{ padding: '12px 15px' }}>
                    <span style={{ display: 'inline-block', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', background: isWorking ? '#dcfce7' : '#fef2f2', color: isWorking ? '#15803d' : '#b91c1c' }}>
                      {isWorking ? '🟢 कार्यरत' : '🔴 रजेवर'}
                    </span>
                    <br />
                    <small style={{ fontSize: '11px', color: '#475569', display: 'block', marginTop: '2px' }}>
                      CL शिल्लक: <b>{item.balanceCL}</b> | EL शिल्लक: <b>{item.balanceEL}</b>
                    </small>
                  </td>
                  <td style={{ padding: '12px 15px' }}>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button 
                        onClick={() => { setSelectedItem(item); setIsViewOpen(true); }}
                        style={{ padding: '6px', background: '#2563eb', border: 'none', borderRadius: '6px', color: '#fff', cursor: 'pointer' }}
                      >
                        <Eye size={14}/>
                      </button>
                      <button 
                        onClick={() => handleEditInit(item)}
                        style={{ padding: '6px', background: '#eab308', border: 'none', borderRadius: '6px', color: '#fff', cursor: 'pointer' }}
                      >
                        ✏️
                      </button>
                      <button 
                        onClick={() => handleDelete(item.id)}
                        style={{ padding: '6px', background: '#dc2626', border: 'none', borderRadius: '6px', color: '#fff', cursor: 'pointer' }}
                      >
                        <Trash2 size={14}/>
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}