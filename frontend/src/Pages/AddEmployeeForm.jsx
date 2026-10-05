/* ---------------------------------------------------- */
/* २. फॉर्म (नवीन नोंदणी किंवा एडिट करण्यासाठी एकच फॉर्म) */
/* ---------------------------------------------------- */
import React, { useState, useEffect } from 'react';
import axios from 'axios';

export function AddEmployeeForm({ editingData, allEmployees = [], onSaveComplete, onCancelEdit }) {
  const [formData, setFormData] = useState({
    id: '',
    employeeName: '',
    employeeType: 'Clerk', 
    employeeRole: '',
    clerkSubtype: '', 
    employeeId: '',
    gender: 'Male',
    panNumber: '',
    basicSalary: '',
    flowerNumber: '',
    roomNumber: '',
    roomType: 'General',
    sectionName: '',
    officeStation: '',
    judgeDesignation: '',
    designation: '', // 🌟 'designation' फील्ड इथे यशस्वीरीत्या समाविष्ट केले आहे
    mobileNo: '',
    underTaluka: 'Nashik (HQ)',
    underOfficeOrCourt: '',
    underJudicialOfficer: '',
    joiningDate: '',
    officeJoiningDate: '',
    transferHistory: [],
    takenLeaves: [],
    officersDuration: []
  });

  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://172.16.171.96:5000/api';

  const [isCustomCourt, setIsCustomCourt] = useState(false);
  const [customCourtInput, setCustomCourtInput] = useState('');
  const [isCustomSection, setIsCustomSection] = useState(false);
  const [customSectionInput, setCustomSectionInput] = useState('');
  const [isCustomFloor, setIsCustomFloor] = useState(false);
  const [customFloorInput, setCustomFloorInput] = useState('');
  const [isCustomRole, setIsCustomRole] = useState(false);
  const [customRoleInput, setCustomRoleInput] = useState('');

  const defaultRoles = [
    "Clerk", "Peon", "Bailiff", "Driver", "Judge", 
    "Stenographer", "Assistant Superintendent", "Superintendent", "Judicial Officer"
  ];

  const defaultSections = [
    "General", "Court Hall", "Chamber", "Record Room", 
    "Computer", "Paybill", "Inward Outward", "EST Room", 
    "Building", "Muddemal", "Stationary"
  ];

  const defaultFloors = ["1", "2", "3", "4", "5", "6", "7", "Ground Floor"];

  const envCourtsString = process.env.REACT_APP_NASHIK_COURTS || "";
  const defaultCourts = [
    "District and Sessions Court, Nashik",
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

  const uniqueJudges = [...new Set(
    allEmployees
      .filter(emp => {
        const role = (emp.employeeRole || '').trim().toLowerCase();
        const type = (emp.employeeType || '').trim().toLowerCase();
        return role === 'judge' || role === 'judicial officer' || type === 'judge' || type === 'judicial officer' || emp.underJudicialOfficer;
      })
      .map(emp => emp.underJudicialOfficer || (['judge', 'judicial officer'].includes((emp.employeeRole || '').toLowerCase()) ? emp.employeeName : ''))
      .filter(Boolean)
  )];

  useEffect(() => {
    if (editingData) {
      setFormData(editingData);
      
      if (editingData.employeeRole && !defaultRoles.includes(editingData.employeeRole)) {
        setIsCustomRole(true);
        setCustomRoleInput(editingData.employeeRole);
      } else {
        setIsCustomRole(false);
        setCustomRoleInput('');
      }

      if (editingData.underOfficeOrCourt && !nashikCourtsList.includes(editingData.underOfficeOrCourt)) {
        setIsCustomCourt(true);
        setCustomCourtInput(editingData.underOfficeOrCourt);
      } else {
        setIsCustomCourt(false);
        setCustomCourtInput('');
      }

      if (editingData.sectionName && !defaultSections.includes(editingData.sectionName)) {
        setIsCustomSection(true);
        setCustomSectionInput(editingData.sectionName);
      } else {
        setIsCustomSection(false);
        setCustomSectionInput('');
      }

      if (editingData.flowerNumber && !defaultFloors.includes(editingData.flowerNumber)) {
        setIsCustomFloor(true);
        setCustomFloorInput(editingData.flowerNumber);
      } else {
        setIsCustomFloor(false);
        setCustomFloorInput('');
      }
    }
  }, [editingData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const finalEmployeeRole = isCustomRole ? customRoleInput : formData.employeeRole;
    const finalOfficeOrCourt = isCustomCourt ? customCourtInput : formData.underOfficeOrCourt;
    const finalSectionName = isCustomSection ? customSectionInput : formData.sectionName;
    const finalFlowerNumber = isCustomFloor ? customFloorInput : formData.flowerNumber;

    let updatedOfficersDuration = formData.officersDuration || formData.tenureHistory || [];
    const changeDate = formData.officeJoiningDate || new Date().toISOString().split('T')[0];

    if (formData.underJudicialOfficer && formData.underJudicialOfficer.trim() !== '') {
      const lastTenure = updatedOfficersDuration[updatedOfficersDuration.length - 1];
      if (!lastTenure || lastTenure.judgeName !== formData.underJudicialOfficer) {
        updatedOfficersDuration = updatedOfficersDuration.map(tenure => {
          if (!tenure.toDate || tenure.toDate === '') {
            return { ...tenure, toDate: changeDate };
          }
          return tenure;
        });

        updatedOfficersDuration.push({
          judgeName: formData.underJudicialOfficer,
          fromDate: changeDate,
          toDate: '',
          stationName: finalOfficeOrCourt || '-'
        });
      }
    }

    const dataToSend = { 
      ...formData, 
      employeeRole: finalEmployeeRole,
      underOfficeOrCourt: finalOfficeOrCourt,
      sectionName: finalSectionName,
      flowerNumber: finalFlowerNumber,
      officersDuration: updatedOfficersDuration,
      tenureHistory: updatedOfficersDuration
    };

    try {
      if (formData.id || formData._id) {
        const targetId = formData.id || formData._id;
        await axios.put(`${API_BASE_URL}/employees/${targetId}`, dataToSend);
        alert('✅ कर्मचाऱ्याची माहिती यशस्वीरीत्या अपडेट झाली!');
      } else {
        await axios.post(`${API_BASE_URL}/employees`, dataToSend);
        alert('✅ नवीन कर्मचाऱ्याची माहिती यशस्वीरीत्या सेव्ह झाली!');
      }
      if (onSaveComplete) onSaveComplete();
    } catch (err) {
      console.error("Save/Update Error:", err);
      alert('🛑 डेटा सेव्ह/अपडेट करताना एरर आला.');
    }
  };

  return (
    <div className="section-card" style={{ border: (formData.id || formData._id) ? '2px solid #10b981' : '1px solid #ccc' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>{(formData.id || formData._id) ? '✏️ Edit Employee Record (कर्मचारी माहिती बदल करा)' : '➕ Add New Employee Record (नवीन कर्मचारी नोंदणी)'}</h2>
        {(formData.id || formData._id) && (
          <button 
            type="button" 
            onClick={onCancelEdit}
            style={{ background: '#64748b', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer' }}
          >
            ✖ Cancel Edit
          </button>
        )}
      </div>
      
      <form onSubmit={handleSubmit} style={{ marginTop: '20px', maxHeight: '75vh', overflowY: 'auto', paddingRight: '10px' }}>
        <h3 style={sectionHeadingStyle}>👤 १. मूलभूत माहिती (Basic Details)</h3>
        <div style={gridStyle}>
          <div>
            <label style={labelStyle}>कर्मचाऱ्याचे पूर्ण नाव (Employee Name):</label>
            <input type="text" name="employeeName" value={formData.employeeName || ''} onChange={handleChange} required placeholder="उदा. राहुल अशोक पाटील" style={inputStyle} />
          </div>

          <div>
            <label style={labelStyle}>लिंग (Gender):</label>
            <select name="gender" value={formData.gender || 'Male'} onChange={handleChange} style={inputStyle}>
              <option value="Male">Male (पुरुष)</option>
              <option value="Female">Female (स्त्री)</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div>
            <label style={labelStyle}>कर्मचारी पद (Employee Role):</label>
            {!isCustomRole ? (
              <div style={{ display: 'flex', gap: '5px' }}>
                <select 
                  name="employeeRole"
                  value={formData.employeeRole || ''} 
                  onChange={(e) => {
                    const selectedRole = e.target.value;
                    if (selectedRole === 'CUSTOM_ROLE') {
                      setIsCustomRole(true);
                      setFormData(prev => ({ ...prev, employeeRole: '', clerkSubtype: '', designation: '' }));
                    } else {
                      setFormData(prev => ({ 
                        ...prev, 
                        employeeRole: selectedRole, 
                        clerkSubtype: selectedRole !== 'Clerk' ? '' : prev.clerkSubtype,
                        designation: (selectedRole === 'Judge' || selectedRole === 'Stenographer') ? prev.designation : '' 
                      }));
                    }
                  }}
                  style={inputStyle}
                  required
                >
                  <option value="">-- पद निवडा --</option>
                  <option value="Clerk">Clerk (लिपिक)</option>
                  <option value="Peon">Peon (शिपाई)</option>
                  <option value="Bailiff">Bailiff (बिफ / समन्स वाहक)</option>
                  <option value="Driver">Driver (वाहनचालक)</option>
                  <option value="Judge">Judicial Officer (न्यायिक अधिकारी)</option>
                  <option value="Stenographer">Stenographer (लघुलेखक)</option>
                  <option value="Assistant Superintendent">Assistant Superintendent (सहा. अधीक्षक)</option>
                  <option value="Superintendent">Superintendent (अधीक्षक)</option>
                  {/* <option value="Judicial Officer">Judicial Officer (न्यायिक अधिकारी)</option> */}
                  <option value="CUSTOM_ROLE" style={{ fontWeight: 'bold', color: '#2563eb' }}>➕ इतर पद / स्वतः टाईप करा...</option>
                </select>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: '5px' }}>
                <input 
                  type="text" 
                  placeholder="पदाचे नाव मॅन्युअली लिहा" 
                  value={customRoleInput} 
                  onChange={(e) => setCustomRoleInput(e.target.value)}
                  style={inputStyle}
                  required={isCustomRole}
                />
                <button 
                  type="button" 
                  onClick={() => { setIsCustomRole(false); setCustomRoleInput(''); }} 
                  style={{ background: '#64748b', color: '#fff', border: 'none', padding: '0 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
                >
                  ⬅️ यादी
                </button>
              </div>
            )}
          </div>

          {formData.employeeRole === 'Clerk' && (
            <div>
              <label style={labelStyle}>लिपिक प्रकार (Clerk Type):</label>
              <select name="clerkSubtype" value={formData.clerkSubtype || ''} onChange={handleChange} style={inputStyle} required>
                <option value="">-- सीनियर की जुनियर निवडा --</option>
                <option value="Senior Clerk">Senior Clerk (वरिष्ठ लिपिक)</option>
                <option value="Junior Clerk">Junior Clerk (कनिष्ठ लिपिक)</option>
              </select>
            </div>
          )}

          {formData.employeeRole === 'Judge' && (
            <div>
              <label style={labelStyle}>न्यायाधीश पद (Judge Designation):</label>
              <select 
                name="designation" 
                value={formData.designation || ''} 
                onChange={handleChange} 
                style={inputStyle}
              >
                <option value="">-- निवडा --</option>
                <option value="Principal District Judge">Principal District Judge</option>
                <option value="Additional Sessions Judge">Additional Sessions Judge</option>
                <option value="Civil Judge Senior Division">Civil Judge Senior Division</option>
                <option value="Civil Judge Junior Division">Civil Judge Junior Division</option>
                <option value="Chief Judicial Magistrate">Chief Judicial Magistrate</option>
              </select>
            </div>
          )}

          {formData.employeeRole === 'Stenographer' && (
            <div>
              <label style={labelStyle}>स्टेनो ग्रेड (Steno Grade):</label>
              <select 
                name="designation" 
                value={formData.designation || ''} 
                onChange={handleChange} 
                style={inputStyle}
              >
                <option value="">-- ग्रेड निवडा --</option>
                <option value="Steno Grade-I">Steno Grade-I</option>
                <option value="Steno Grade-II">Steno Grade-II</option>
                <option value="Steno Grade-III">Steno Grade-III</option>
              </select>
            </div>
          )}

          <div>
            <label style={labelStyle}>कर्मचारी आयडी (Employee ID):</label>
            <input type="text" name="employeeId" value={formData.employeeId || ''} onChange={handleChange} placeholder="EMP-001" style={inputStyle} />
          </div>

          <div>
            <label style={labelStyle}>पॅन नंबर (PAN Number):</label>
            <input type="text" name="panNumber" value={formData.panNumber || ''} onChange={handleChange} maxLength="10" placeholder="ABCDE1234F" style={inputStyle} />
          </div>

          <div>
            <label style={labelStyle}>मूळ वेतन (Basic Salary):</label>
            <input type="number" name="basicSalary" value={formData.basicSalary || ''} onChange={handleChange} placeholder="उदा. 125000" style={inputStyle} />
          </div>

          <div>
            <label style={labelStyle}>मोबाईल नंबर (Mobile No):</label>
            <input type="text" name="mobileNo" value={formData.mobileNo || ''} onChange={handleChange} placeholder="9876543210" style={inputStyle} />
          </div>
        </div>

        <h3 style={sectionHeadingStyle}>🏛️ २. ऑफिस, लोकेशन व तारीख माहिती (Office & Location Details)</h3>
        <div style={gridStyle}>
          <div>
            <label style={labelStyle}>रूम नंबर (Room Number):</label>
            <input type="text" name="roomNumber" value={formData.roomNumber || ''} onChange={handleChange} placeholder="Room No 105" style={inputStyle} />
          </div>

          <div>
            <label style={labelStyle}>फ्लोअर नंबर (Floor Number):</label>
            {!isCustomFloor ? (
              <div style={{ display: 'flex', gap: '5px' }}>
                <select 
                  name="flowerNumber"
                  value={formData.flowerNumber || ''} 
                  onChange={(e) => {
                    if (e.target.value === 'CUSTOM_FLOOR') {
                      setIsCustomFloor(true);
                      setFormData(prev => ({ ...prev, flowerNumber: '' }));
                    } else {
                      handleChange(e);
                    }
                  }}
                  style={inputStyle}
                >
                  <option value="">-- फ्लोअर निवडा --</option>
                  <option value="1">1 (पहिला मजला)</option>
                  <option value="2">2 (दुसरा मजला)</option>
                  <option value="3">3 (तिसरा मजला)</option>
                  <option value="4">4 (चौथा मजला)</option>
                  <option value="5">5 (पाचवा मजला)</option>
                  <option value="6">6 (साहावा मजला)</option>
                  <option value="7">7 (सातवा मजला)</option>
                  <option value="Ground Floor">Ground Floor (ग्राउंड फ्लोर)</option>
                  <option value="CUSTOM_FLOOR" style={{ fontWeight: 'bold', color: '#2563eb' }}>➕ इतर फ्लोर / टाईप करा...</option>
                </select>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: '5px' }}>
                <input 
                  type="text" 
                  placeholder="फ्लॉवर नंबर मॅन्युअली लिहा" 
                  value={customFloorInput} 
                  onChange={(e) => setCustomFloorInput(e.target.value)}
                  style={inputStyle}
                  required={isCustomFloor}
                />
                <button 
                  type="button" 
                  onClick={() => { setIsCustomFloor(false); setCustomFloorInput(''); }} 
                  style={{ background: '#64748b', color: '#fff', border: 'none', padding: '0 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
                >
                  ⬅️ यादी
                </button>
              </div>
            )}
          </div>

          <div>
            <label style={labelStyle}>सेक्शनचे नाव (Section Name):</label>
            {!isCustomSection ? (
              <div style={{ display: 'flex', gap: '5px' }}>
                <select 
                  name="sectionName"
                  value={formData.sectionName || ''} 
                  onChange={(e) => {
                    if (e.target.value === 'CUSTOM_SECTION') {
                      setIsCustomSection(true);
                      setFormData(prev => ({ ...prev, sectionName: '' }));
                    } else {
                      handleChange(e);
                    }
                  }}
                  style={inputStyle}
                >
                  <option value="">-- सेक्शन निवडा --</option>
                  {defaultSections.map((sec, index) => (
                    <option key={index} value={sec}>{sec}</option>
                  ))}
                  <option value="CUSTOM_SECTION" style={{ fontWeight: 'bold', color: '#2563eb' }}>➕ इतर सेक्शन / टाईप करा...</option>
                </select>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: '5px' }}>
                <input 
                  type="text" 
                  placeholder="सेक्शनचे नाव मॅन्युअली लिहा" 
                  value={customSectionInput} 
                  onChange={(e) => setCustomSectionInput(e.target.value)}
                  style={inputStyle}
                  required={isCustomSection}
                />
                <button 
                  type="button" 
                  onClick={() => { setIsCustomSection(false); setCustomSectionInput(''); }} 
                  style={{ background: '#64748b', color: '#fff', border: 'none', padding: '0 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
                >
                  ⬅️ यादी
                </button>
              </div>
            )}
          </div>

          <div>
            <label style={labelStyle}>ऑफिस / कोर्ट (Under Office/Court):</label>
            {!isCustomCourt ? (
              <div style={{ display: 'flex', gap: '5px' }}>
                <select 
                  name="underOfficeOrCourt"
                  value={formData.underOfficeOrCourt || ''} 
                  onChange={(e) => {
                    if (e.target.value === 'CUSTOM_OPTION') {
                      setIsCustomCourt(true);
                      setFormData(prev => ({ ...prev, underOfficeOrCourt: '' }));
                    } else {
                      handleChange(e);
                    }
                  }}
                  style={inputStyle}
                >
                  <option value="">-- कोर्ट / ऑफिस निवडा --</option>
                  {nashikCourtsList.map((court, index) => (
                    <option key={index} value={court}>{court}</option>
                  ))}
                  <option value="CUSTOM_OPTION" style={{ fontWeight: 'bold', color: '#2563eb' }}>➕ इतर कोर्ट / टाईप करा...</option>
                </select>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: '5px' }}>
                <input 
                  type="text" 
                  placeholder="कोर्ट किंवा ऑफिसचे नाव मॅन्युअली लिहा" 
                  value={customCourtInput} 
                  onChange={(e) => setCustomCourtInput(e.target.value)}
                  style={inputStyle}
                  required={isCustomCourt}
                />
                <button 
                  type="button" 
                  onClick={() => { setIsCustomCourt(false); setCustomCourtInput(''); }} 
                  style={{ background: '#64748b', color: '#fff', border: 'none', padding: '0 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
                >
                  ⬅️ यादी
                </button>
              </div>
            )}
          </div>

          <div>
            <label style={labelStyle}>न्यायाधीशांचे नाव (Under Judicial Officer):</label>
            <input 
              type="text" 
              list="form-judges-list"
              name="underJudicialOfficer"
              value={formData.underJudicialOfficer || ''} 
              onChange={handleChange}
              placeholder="नाव निवडा किंवा नवीन टाईप करा..."
              style={inputStyle}
            />
            <datalist id="form-judges-list">
              {uniqueJudges.map((judge, idx) => (
                <option key={idx} value={judge} />
              ))}
            </datalist>
          </div>

          <div>
            <label style={labelStyle}>सेवेत रुजू दिनांक (Joining Date):</label>
            <input type="date" name="joiningDate" value={formData.joiningDate || ''} onChange={handleChange} style={inputStyle} />
          </div>

          <div>
            <label style={labelStyle}>सध्याच्या ऑफिसमध्ये रुजू दिनांक (Office Joining Date):</label>
            <input type="date" name="officeJoiningDate" value={formData.officeJoiningDate || ''} onChange={handleChange} style={inputStyle} />
          </div>
        </div>

        <div style={{ marginTop: '25px', textAlign: 'right' }}>
          {(formData.id || formData._id) && (
            <button 
              type="button" 
              onClick={onCancelEdit}
              style={{ padding: '12px 20px', background: '#64748b', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold', fontSize: '15px', marginRight: '10px' }}
            >
              Cancel
            </button>
          )}
          <button type="submit" style={{ padding: '12px 30px', background: (formData.id || formData._id) ? '#10b981' : '#0d233a', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold', fontSize: '15px' }}>
            {(formData.id || formData._id) ? '💾 Update Record' : '💾 Save Complete Record'}
          </button>
        </div>
      </form>
    </div>
  );
}

const sectionHeadingStyle = {
  color: '#0d233a', fontSize: '15px', marginBottom: '10px', borderBottom: '1px solid #ddd', paddingBottom: '5px', marginTop: '15px'
};

const gridStyle = {
  display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '15px', marginBottom: '15px'
};

const labelStyle = {
  fontSize: '13px', fontWeight: '600', color: '#333', marginBottom: '4px', display: 'block'
};

const inputStyle = {
  width: '100%', padding: '8px 10px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box', background: '#fff'
};