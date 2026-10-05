import React, { useState } from 'react';
import axios from 'axios';

export function TransferManagement({ employees, onRefresh }) {
  const [selectedEmpId, setSelectedEmpId] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  
  // Station & Custom Input States (Add Form)
  const [stationName, setStationName] = useState('');
  const [isCustomStation, setIsCustomStation] = useState(false);
  const [customStationInput, setCustomStationInput] = useState('');

  // Current Station States
  const [currentStation, setCurrentStation] = useState('');
  const [isCustomCurrent, setIsCustomCurrent] = useState(false);
  const [customCurrentInput, setCustomCurrentInput] = useState('');

  const [transferReason, setTransferReason] = useState('');
  const [loading, setLoading] = useState(false);

  // Edit Transfer Modal States
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);
  const [editFromDate, setEditFromDate] = useState('');
  const [editToDate, setEditToDate] = useState('');
  const [editStationName, setEditStationName] = useState('');
  const [isEditCustom, setIsEditCustom] = useState(false);
  const [editCustomInput, setEditCustomInput] = useState('');
  const [editTransferReason, setEditTransferReason] = useState('');
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://172.16.171.96:5000/api';
  // 📁 .env मधून किंवा डीफॉल्टमधून कोर्ट्सची यादी घेणे
  const envCourtsString = process.env.REACT_APP_NASHIK_COURTS || "";
  const defaultCourts = [
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
  ];

  const nashikCourtsList = envCourtsString.trim() 
    ? envCourtsString.split(',').map(c => c.trim()) 
    : defaultCourts;

  // निवडलेल्या कर्मचाऱ्याची माहिती काढणे
  const selectedEmployee = employees.find(emp => 
    String(emp.id) === String(selectedEmpId) || String(emp.employeeId) === String(selectedEmpId)
  );

  // हिस्ट्री पार्स सुरक्षितपणे करणे
  const getHistoryList = (emp) => {
    try {
      if (!emp || !emp.transferHistory) return [];
      if (Array.isArray(emp.transferHistory)) return emp.transferHistory;
      return typeof emp.transferHistory === 'string' 
        ? JSON.parse(emp.transferHistory) 
        : [];
    } catch (e) {
      return [];
    }
  };

  // नवीन ट्रान्सफर रेकॉर्ड सेव्ह करणे
  const handleAddTransfer = async (e) => {
    e.preventDefault();
    
    const finalStation = isCustomStation ? customStationInput : stationName;
    const finalCurrent = isCustomCurrent ? customCurrentInput : (currentStation || finalStation);

    if (!selectedEmpId || !fromDate || !finalStation) {
      alert('कृपया कर्मचारी, सुरुवातीची तारीख आणि नवीन कोर्ट/स्टेशन भरा!');
      return;
    }

    try {
      setLoading(true);
      
      let currentHistory = getHistoryList(selectedEmployee);

      const newRecord = {
        fromDate,
        toDate: toDate || 'Present (सध्या कार्यरत)',
        stationName: finalStation,
        reason: transferReason || 'Regular Transfer'
      };

      const updatedHistory = [newRecord, ...currentHistory];
      const empIdToSend = selectedEmployee?.id || selectedEmpId;

      await axios.put(`${API_BASE_URL}/employees/${empIdToSend}/transfer`, {
        transferHistory: JSON.stringify(updatedHistory), 
        currentStation: finalCurrent     
      });

      alert('बदलीची माहिती यशस्वीरित्या जतन केली!');
      setFromDate('');
      setToDate('');
      setStationName('');
      setCustomStationInput('');
      setIsCustomStation(false);
      setCurrentStation('');
      setCustomCurrentInput('');
      setIsCustomCurrent(false);
      setTransferReason('');
      setLoading(false);
      if (onRefresh) onRefresh();

    } catch (err) {
      console.error("Error saving transfer info:", err);
      alert('ट्रान्सफर सेव्ह करताना एरर आला. कृपया सर्व्हर तपासा.');
      setLoading(false);
    }
  };

  // 🗑️ ट्रान्सफर रेकॉर्ड डिलीट करणे
  const handleDeleteTransfer = async (indexToDelete) => {
    if (!window.confirm('तुम्हाला खरोखर हा ट्रान्सफर रेकॉर्ड डिलीट करायचा आहे का?')) return;

    try {
      let currentHistory = getHistoryList(selectedEmployee);
      const updatedHistory = currentHistory.filter((_, idx) => idx !== indexToDelete);
      const empIdToSend = selectedEmployee?.id || selectedEmpId;

      await axios.put(`${API_BASE_URL}/employees/${empIdToSend}/transfer`, {
        transferHistory: JSON.stringify(updatedHistory)
      });

      alert('✅ ट्रान्सफर रेकॉर्ड यशस्वीरीत्या डिलीट करण्यात आला.');
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error("Delete Transfer Error:", err);
      alert('🛑 ट्रान्सफर डिलीट करताना एरर आला.');
    }
  };

  // एडिट मॉडेल ओपन करणे
  const handleOpenEditModal = (index, hist) => {
    setEditingIndex(index);
    setEditFromDate(hist.fromDate || '');
    setEditToDate(hist.toDate === 'Present (सध्या कार्यरत)' ? '' : (hist.toDate || ''));
    
    // चेक करणे की कोर्ट लिस्टमध्ये आहे की कस्टम आहे
    if (nashikCourtsList.includes(hist.stationName)) {
      setEditStationName(hist.stationName || '');
      setIsEditCustom(false);
      setEditCustomInput('');
    } else {
      setEditStationName('CUSTOM');
      setIsEditCustom(true);
      setEditCustomInput(hist.stationName || '');
    }

    setEditTransferReason(hist.reason || '');
    setIsEditModalOpen(true);
  };

  // एडिट केलेले ट्रान्सफर सेव्ह करणे
  const handleUpdateTransfer = async (e) => {
    e.preventDefault();
    const finalEditStation = isEditCustom ? editCustomInput : editStationName;

    try {
      let currentHistory = [...getHistoryList(selectedEmployee)];
      
      currentHistory[editingIndex] = {
        fromDate: editFromDate,
        toDate: editToDate || 'Present (सध्या कार्यरत)',
        stationName: finalEditStation,
        reason: editTransferReason || 'Regular Transfer'
      };

      const empIdToSend = selectedEmployee?.id || selectedEmpId;

      await axios.put(`${API_BASE_URL}/employees/${empIdToSend}/transfer`, {
        transferHistory: JSON.stringify(currentHistory),
        // जर पहिली (लेटेस्ट) एंट्री एडिट केली असेल तर सध्याचे स्टेशन देखील अपडेट होईल
        currentStation: editingIndex === 0 ? finalEditStation : undefined
      });

      alert('✅ ट्रान्सफर रेकॉर्ड यशस्वीरीत्या अपडेट झाला!');
      setIsEditModalOpen(false);
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error("Update Transfer Error:", err);
      alert('🛑 ट्रान्सफर अपडेट करताना एरर आला.');
    }
  };

  return (
    <div className="section-card">
      <div className="section-title">
        <span>🔄</span> कर्मचारी बदली आणि सेवा इतिहास व्यवस्थापन (Transfer & Service History)
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '20px' }}>
        
        {/* FORM: नवीन ट्रान्सफर ॲड करण्यासाठी */}
        <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <h3 style={{ margin: '0 0 15px 0', color: '#1e293b' }}>📝 नवीन बदली नोंदवा (Add Transfer Entry)</h3>
          
          <form onSubmit={handleAddTransfer} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '5px' }}>कर्मचारी निवडा (Select Employee):</label>
              <select 
                value={selectedEmpId} 
                onChange={(e) => setSelectedEmpId(e.target.value)}
                style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                required
              >
                <option value="">-- कर्मचारी निवडा --</option>
                {employees.map(emp => (
                  <option key={emp.id || emp.employeeId} value={emp.id || emp.employeeId}>
                    {emp.employeeName} ({emp.employeeRole})
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '5px' }}>कधीपासून (From Date):</label>
                <input 
                  type="date" 
                  value={fromDate} 
                  onChange={(e) => setFromDate(e.target.value)} 
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  required
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '5px' }}>कधीपर्यंत (To Date):</label>
                <input 
                  type="date" 
                  value={toDate} 
                  onChange={(e) => setToDate(e.target.value)} 
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                />
                <span style={{ fontSize: '10px', color: '#64748b' }}>रिक्त असल्यास 'सध्या कार्यरत' मानले जाईल</span>
              </div>
            </div>

            {/* नवीन कार्यस्थान / कोर्ट निवडण्यासाठी (Dropdown + Manual Input Support) */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '5px' }}>कोर्ट ( Station / Court):</label>
              {!isCustomStation ? (
                <div style={{ display: 'flex', gap: '5px' }}>
                  <select 
                    value={stationName} 
                    onChange={(e) => {
                      if (e.target.value === 'CUSTOM_OPTION') {
                        setIsCustomStation(true);
                        setStationName('');
                      } else {
                        setStationName(e.target.value);
                        setCurrentStation(e.target.value); // ऑटोमॅटिक सध्याचे स्टेशन सेट होईल
                      }
                    }}
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                    required={!isCustomStation}
                  >
                    <option value="">-- कोर्ट निवडा किंवा मॅन्युअली टाका --</option>
                    {nashikCourtsList.map((court, index) => (
                      <option key={index} value={court}>{court}</option>
                    ))}
                    <option value="CUSTOM_OPTION" style={{ fontWeight: 'bold', color: '#2563eb' }}>➕ इतर कोर्ट / नवीन नाव स्वतः टाईप करा...</option>
                  </select>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: '5px' }}>
                  <input 
                    type="text" 
                    placeholder="नवीन कोर्ट किंवा स्टेशनचे नाव मॅन्युअली लिहा" 
                    value={customStationInput} 
                    onChange={(e) => {
                      setCustomStationInput(e.target.value);
                      setCurrentStation(e.target.value);
                    }}
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                    required={isCustomStation}
                  />
                  <button 
                    type="button" 
                    onClick={() => { setIsCustomStation(false); setCustomStationInput(''); }} 
                    style={{ background: '#64748b', color: '#fff', border: 'none', padding: '0 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}
                    title="लिस्टवर परत जा"
                  >
                    ⬅️ यादी पहा
                  </button>
                </div>
              )}
            </div>

            {/* सध्याचे स्टेशन अपडेट करण्यासाठी फील्ड */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '5px' }}>कर्मचाऱ्याचे सध्याचे कार्यस्थान (Current Working Station):</label>
              {!isCustomCurrent ? (
                <select 
                  value={currentStation} 
                  onChange={(e) => {
                    if (e.target.value === 'CUSTOM_OPTION') {
                      setIsCustomCurrent(true);
                      setCurrentStation('');
                    } else {
                      setCurrentStation(e.target.value);
                    }
                  }}
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                >
                  <option value="">-- सध्याचे कार्यस्थान निवडा (पर्यायी) --</option>
                  {nashikCourtsList.map((court, index) => (
                    <option key={index} value={court}>{court}</option>
                  ))}
                  <option value="CUSTOM_OPTION" style={{ fontWeight: 'bold', color: '#2563eb' }}>➕ मॅन्युअली नाव टाईप करा...</option>
                </select>
              ) : (
                <div style={{ display: 'flex', gap: '5px' }}>
                  <input 
                    type="text" 
                    placeholder="सध्याच्या स्टेशनचे नाव मॅन्युअली लिहा" 
                    value={customCurrentInput} 
                    onChange={(e) => setCustomCurrentInput(e.target.value)}
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  />
                  <button 
                    type="button" 
                    onClick={() => { setIsCustomCurrent(false); setCustomCurrentInput(''); }} 
                    style={{ background: '#64748b', color: '#fff', border: 'none', padding: '0 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}
                  >
                    ⬅️ यादी पहा
                  </button>
                </div>
              )}
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '5px' }}>बदलीचे कारण / ऑर्डर क्रमांक (Reason / Order No):</label>
              <input 
                type="text" 
                placeholder="उदा. प्रशासकीय कारण / विनंती बदली" 
                value={transferReason} 
                onChange={(e) => setTransferReason(e.target.value)}
                style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
              />
            </div>

            <button 
              type="submit" 
              style={{ background: '#2563eb', color: 'white', padding: '10px', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', marginTop: '10px' }}
              disabled={loading}
            >
              {loading ? 'जतन होत आहे...' : '💾 ट्रान्सफर रेकॉर्ड सेव्ह करा'}
            </button>
          </form>
        </div>

        {/* VIEW: निवडलेल्या कर्मचाऱ्याची ट्रान्सफर हिस्ट्री */}
        <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <h3 style={{ margin: '0 0 15px 0', color: '#1e293b' }}>📊 सेवा व बदलीचा इतिहास (Service History)</h3>
          
          {selectedEmployee ? (
            <div>
              <div style={{ background: '#e2e8f0', padding: '10px', borderRadius: '6px', marginBottom: '15px' }}>
                <strong>कर्मचारी:</strong> {selectedEmployee.employeeName} <br/>
                <span style={{ fontSize: '13px', color: '#475569' }}>पद: {selectedEmployee.employeeRole} | सध्याचे स्टेशन: {selectedEmployee.officeStation || selectedEmployee.currentStation || selectedEmployee.underOfficeOrCourt || 'Nashik (HQ)'}</span>
              </div>

              <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#334155' }}>मागील कार्यस्थानांची नोंद:</h4>
              
              <div style={{ maxHeight: '250px', overflowY: 'auto' }}>
                <table className="custom-table" style={{ fontSize: '13px', width: '100%' }}>
                  <thead>
                    <tr>
                      <th>कालावधी (Period)</th>
                      <th>स्टेशन / कोर्ट</th>
                      <th>कारण / टीप</th>
                      <th style={{ textAlign: 'center' }}>कृती (Actions)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getHistoryList(selectedEmployee).length > 0 ? (
                      getHistoryList(selectedEmployee).map((hist, idx) => (
                        <tr key={idx}>
                          <td>{hist.fromDate} ते {hist.toDate}</td>
                          <td><strong>{hist.stationName}</strong></td>
                          <td>{hist.reason || '-'}</td>
                          <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                            {/* Edit Button */}
                            <button 
                              onClick={() => handleOpenEditModal(idx, hist)}
                              title="Edit Transfer"
                              style={{ background: '#10b981', color: '#fff', border: 'none', padding: '4px 7px', borderRadius: '4px', cursor: 'pointer', marginRight: '5px' }}
                            >
                              ✏️
                            </button>
                            {/* Delete Button */}
                            <button 
                              onClick={() => handleDeleteTransfer(idx)}
                              title="Delete Transfer"
                              style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '4px 7px', borderRadius: '4px', cursor: 'pointer' }}
                            >
                              🗑️
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="4" style={{ textAlign: 'center', color: '#64748b', padding: '10px' }}>
                          कोणतीही जुनी ट्रान्सफर नोंद उपलब्ध नाही.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', color: '#64748b', marginTop: '50px' }}>
              <span style={{ fontSize: '40px' }}>👈</span>
              <p>इतिहास पाहण्यासाठी डावीकडील फॉर्ममधून कर्मचारी निवडा.</p>
            </div>
          )}
        </div>

      </div>

      {/* EDIT TRANSFER MODAL */}
      {isEditModalOpen && (
        <div style={modalOverlayStyle}>
          <div style={modalContentStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #0d233a', paddingBottom: '10px', marginBottom: '15px' }}>
              <h3 style={{ color: '#0d233a', margin: 0, fontSize: '16px' }}>✏️ ट्रान्सफर रेकॉर्ड एडिट करा (Edit Transfer)</h3>
              <button onClick={() => setIsEditModalOpen(false)} style={{ background: '#ef4444', color: '#fff', border: 'none', borderRadius: '50%', width: '28px', height: '28px', cursor: 'pointer', fontWeight: 'bold' }}>✖</button>
            </div>

            <form onSubmit={handleUpdateTransfer} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>कधीपासून (From Date):</label>
                  <input type="date" value={editFromDate} onChange={(e) => setEditFromDate(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} required />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>कधीपर्यंत (To Date):</label>
                  <input type="date" value={editToDate} onChange={(e) => setEditToDate(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>स्टेशन / कोर्ट (Station Name):</label>
                {!isEditCustom ? (
                  <select 
                    value={editStationName} 
                    onChange={(e) => {
                      if (e.target.value === 'CUSTOM_OPTION') {
                        setIsEditCustom(true);
                        setEditStationName('');
                      } else {
                        setEditStationName(e.target.value);
                      }
                    }} 
                    style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} 
                    required={!isEditCustom}
                  >
                    <option value="">-- कोर्ट निवडा --</option>
                    {nashikCourtsList.map((court, index) => (
                      <option key={index} value={court}>{court}</option>
                    ))}
                    <option value="CUSTOM_OPTION" style={{ fontWeight: 'bold', color: '#2563eb' }}>➕ इतर कोर्ट / नवीन नाव स्वतः टाईप करा...</option>
                  </select>
                ) : (
                  <div style={{ display: 'flex', gap: '5px' }}>
                    <input 
                      type="text" 
                      placeholder="नवीन नाव मॅन्युअली लिहा" 
                      value={editCustomInput} 
                      onChange={(e) => setEditCustomInput(e.target.value)} 
                      style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} 
                      required={isEditCustom}
                    />
                    <button 
                      type="button" 
                      onClick={() => { setIsEditCustom(false); setEditCustomInput(''); }} 
                      style={{ background: '#64748b', color: '#fff', border: 'none', padding: '0 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
                    >
                      ⬅️ यादी
                    </button>
                  </div>
                )}
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>कारण / टीप (Reason):</label>
                <input type="text" value={editTransferReason} onChange={(e) => setEditTransferReason(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} />
              </div>

              <div style={{ textAlign: 'right', marginTop: '10px' }}>
                <button type="button" onClick={() => setIsEditModalOpen(false)} style={{ padding: '8px 15px', background: '#64748b', color: '#fff', border: 'none', borderRadius: '4px', marginRight: '8px', cursor: 'pointer' }}>रद्द करा</button>
                <button type="submit" style={{ padding: '8px 20px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}>अपडेट करा</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// Modal Styling Constants
const modalOverlayStyle = {
  position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
  backgroundColor: 'rgba(0, 0, 0, 0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
};

const modalContentStyle = {
  background: '#fff', padding: '25px', borderRadius: '8px', width: '450px', maxWidth: '90%', boxShadow: '0 5px 15px rgba(0,0,0,0.3)'
};