import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';
import Login from './Pages/Login';
import { CreateUser } from './Pages/CreateUser';
import { Dashboard } from './Pages/Dashboard';
import { EmployeeDirectory } from './Pages/EmployeeManagement';
import { AddEmployeeForm } from './Pages/AddEmployeeForm';
import { LeaveManagement } from './Pages/LeaveManagement';
import { TransferManagement } from './Pages/TransferManagement';
import CRReportModule from './Pages/CRReportModule'; 
import EmployeeProfile from './Pages/EmployeeProfile'; // 🌟 कर्मचाऱ्याचे स्वतःचे प्रोफाइल पेज इम्पोर्ट केले

function App() {
  const [user, setUser] = useState(null); // लॉगिन युजरची माहिती साठवण्यासाठी
  const [activeTab, setActiveTab] = useState('dashboard');
  const [employees, setEmployees] = useState([]);
  const [editingEmployee, setEditingEmployee] = useState(null);

  // Dashboard Search & Filters State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRoom, setSelectedRoom] = useState('All');
  const [selectedSaheb, setSelectedSaheb] = useState('All');
  const [selectedSection, setSelectedSection] = useState('All');
  const [selectedDesignation, setSelectedDesignation] = useState('All');
  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://172.16.171.96:5000/api';

  // 1. पेज लोड झाल्यावर localStorage मधून युजर चेक करणे
  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        console.error("Error parsing user from localStorage:", e);
      }
    }
  }, []);

  // Backend कडून कर्मचाऱ्यांची लिस्ट Fetch करणे (फक्त ॲडमिनसाठी)
  const fetchEmployees = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/employees`);
      if (res.data) setEmployees(res.data);
    } catch (err) {
      console.error("Error fetching employees:", err);
    }
  };

  useEffect(() => {
    if (user && user.role !== 'employee') {
      fetchEmployees();
    }
  }, [user]);

  const handleLogout = () => {
    localStorage.clear();
    setUser(null);
  };

  const handleEditClick = (emp) => {
    setEditingEmployee(emp);
    setActiveTab('add'); 
  };

  const handleSaveComplete = () => {
    setEditingEmployee(null); 
    fetchEmployees();         
    setActiveTab('directory');
  };

  const handleCancelEdit = () => {
    setEditingEmployee(null);
    setActiveTab('directory');
  };

  // --- डॅशबोर्डसाठी लागणारे मोजमाप व फिल्टर्स ---
  const todayStr = new Date().toISOString().split('T')[0];

  const getTodayLeaves = () => {
    return employees.filter(emp => {
      try {
        const cl = typeof emp.clLeaveDates === 'string' ? JSON.parse(emp.clLeaveDates || '[]') : (emp.clLeaveDates || []);
        const el = typeof emp.elLeaveDates === 'string' ? JSON.parse(emp.elLeaveDates || '[]') : (emp.elLeaveDates || []);
        const coff = typeof emp.coffLeaveDates === 'string' ? JSON.parse(emp.coffLeaveDates || '[]') : (emp.coffLeaveDates || []);
        
        const allDates = [...cl, ...el, ...coff].map(item => typeof item === 'object' ? item.date : item);
        return allDates.includes(todayStr);
      } catch (e) {
        return false;
      }
    });
  };

  const leaveListToday = getTodayLeaves();
  
  const sahebOnLeave = leaveListToday.filter(emp => {
    const role = emp.employeeRole?.toLowerCase() || '';
    return (
      role.includes('judge') || 
      role.includes('magistrate') || 
      role.includes('sahib') ||
      role.includes('judicial officer')
    );
  });

  const staffOnLeave = leaveListToday.filter(emp => !sahebOnLeave.includes(emp));
  const uniqueRooms = [...new Set(employees.map(e => e.roomNumber).filter(Boolean))];
  const uniqueSahebs = [...new Set(employees.map(e => e.underJudicialOfficer).filter(Boolean))];
  const uniqueSections = [...new Set(employees.map(e => e.sectionName).filter(Boolean))];
  const uniqueDesignations = [...new Set(employees.map(e => e.employeeRole).filter(Boolean))];

  const filteredEmployees = employees.filter(emp => {
    const matchSearch = Object.values(emp).some(val => 
      String(val).toLowerCase().includes(searchTerm.toLowerCase())
    );
    const matchRoom = selectedRoom === 'All' || emp.roomNumber === selectedRoom;
    const matchSaheb = selectedSaheb === 'All' || emp.underJudicialOfficer === selectedSaheb;
    const matchSection = selectedSection === 'All' || emp.sectionName === selectedSection;
    const matchDesig = selectedDesignation === 'All' || emp.employeeRole === selectedDesignation;

    return matchSearch && matchRoom && matchSaheb && matchSection && matchDesig;
  });

  // जर युजर लॉगिन नसेल, तर पहिले लॉगिन पेज दाखवा
  if (!user) {
    return <Login onLoginSuccess={(loggedInUser) => setUser(loggedInUser)} />;
  }

  // 🌟 जर लॉगिन झालेला युजर 'employee' असेल, तर त्याला डॅशबोर्ड किंवा इतर ॲडमिन मेनूऐवजी थेट त्याचे स्वतःचे प्रोफाइल पेज दिसेल
  if (user.role === 'employee') {
    return <EmployeeProfile />;
  }

  return (
    <div className="app-container">
      
      {/* 1. LEFT SIDEBAR NAVIGATION */}
      <div className="sidebar">
        <div className="sidebar-header">
          <span style={{ fontSize: '24px' }}>🏛️</span>
          <h3>Court Establishment</h3>
        </div>

        <ul className="sidebar-menu">
          <li className={activeTab === 'dashboard' ? 'active' : ''} onClick={() => setActiveTab('dashboard')}>
            🏠 Dashboard
          </li>
          <li className={activeTab === 'directory' ? 'active' : ''} onClick={() => setActiveTab('directory')}>
            👥 Employee Directory
          </li>
          <li className={activeTab === 'add' ? 'active' : ''} onClick={() => { setEditingEmployee(null); setActiveTab('add'); }}>
            ➕ Add New Employee
          </li>
          <li className={activeTab === 'cr-report' ? 'active' : ''} onClick={() => setActiveTab('cr-report')}>
            📑 CR Report (Tenure)
          </li>
          
          {user.employeeRole === 'Establishment Admin' && (
            <li className={activeTab === 'createUser' ? 'active' : ''} onClick={() => setActiveTab('createUser')}>
              ➕ Create New User
            </li>
          )}

          <li className={activeTab === 'leave' ? 'active' : ''} onClick={() => setActiveTab('leave')}>
            📋 Leave Management
          </li>
          <li className={activeTab === 'transfer' ? 'active' : ''} onClick={() => setActiveTab('transfer')}>
            🔄 Transfer Management
          </li>
          <li className={activeTab === 'settings' ? 'active' : ''} onClick={() => setActiveTab('settings')}>
            ⚙️ Settings
          </li>

          {/* 🚪 LOGOUT BUTTON */}
          <li 
            style={{ marginTop: 'auto', background: '#dc2626', color: '#fff', textAlign: 'center', cursor: 'pointer', borderRadius: '6px', padding: '10px' }} 
            onClick={handleLogout}
          >
            🚪 Logout ({user.employeeName})
          </li>
        </ul>
      </div>

      {/* 2. MAIN CONTENT AREA */}
      <div className="main-content">
        
        {activeTab === 'dashboard' && (
          <Dashboard 
            employees={employees}
            leaveListToday={leaveListToday}
            sahebOnLeave={sahebOnLeave}
            staffOnLeave={staffOnLeave}
            filteredEmployees={filteredEmployees}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            selectedRoom={selectedRoom}
            setSelectedRoom={setSelectedRoom}
            selectedSaheb={selectedSaheb}
            setSelectedSaheb={setSelectedSaheb}
            selectedSection={selectedSection}
            setSelectedSection={setSelectedSection}
            selectedDesignation={selectedDesignation}
            setSelectedDesignation={setSelectedDesignation}
            uniqueRooms={uniqueRooms}
            uniqueSahebs={uniqueSahebs}
            uniqueSections={uniqueSections}
            uniqueDesignations={uniqueDesignations}
            setActiveTab={setActiveTab}
          />
        )}

        {activeTab === 'cr-report' && (
          <div className="dashboard-view">
            <CRReportModule />
          </div>
        )}

        {activeTab === 'createUser' && user.employeeRole === 'Establishment Admin' && (
          <div className="dashboard-view">
            <CreateUser />
          </div>
        )}

        {activeTab === 'directory' && (
          <div className="dashboard-view">
             <EmployeeDirectory 
              employees={employees} 
              onEditClick={handleEditClick} 
              onRefresh={fetchEmployees} 
            />
          </div>
        )}

        {activeTab === 'add' && (
          <div className="dashboard-view">
            <AddEmployeeForm 
              editingData={editingEmployee}
              onSaveComplete={handleSaveComplete}
              onCancelEdit={handleCancelEdit}
            />
          </div>
        )}

        {activeTab === 'leave' && (
          <div className="dashboard-view">
            <LeaveManagement 
              employees={employees} 
              onLeaveActionComplete={() => {
                fetchEmployees();
              }} 
            />
          </div>
        )}

        {activeTab === 'transfer' && (
          <div className="dashboard-view">
            <TransferManagement 
              employees={employees} 
              onRefresh={fetchEmployees} 
            />
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="dashboard-view">
            <div className="section-card">
              <h2>⚙️ Settings</h2>
              <p style={{ marginTop: '10px', color: '#666' }}>सिस्टीम कॉन्फिगरेशन आणि प्रोफाइल सेटिंग्ज पर्याय येथे उपलब्ध आहेत.</p>
              <div style={{ marginTop: '15px' }}>
                <p><strong>लॉगिन युजर:</strong> {user.employeeName}</p>
                <p><strong>रोल:</strong> {user.employeeRole}</p>
                <p><strong>विभाग:</strong> {user.sectionName || 'N/A'}</p>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

export default App;

// import React, { useState, useEffect } from 'react';
// import axios from 'axios';
// import './App.css';
// import Login from './Pages/Login';
// import { CreateUser } from './Pages/CreateUser';
// import { Dashboard } from './Pages/Dashboard';
// import { EmployeeDirectory,  } from './Pages/EmployeeManagement';
// import { AddEmployeeForm } from './Pages/AddEmployeeForm';
// import { LeaveManagement } from './Pages/LeaveManagement';
// import { TransferManagement } from './Pages/TransferManagement';
// import CRReportModule from './Pages/CRReportModule'; // <--- नवीन CR रिपोर्ट मॉड्यूल इम्पोर्ट केले

// function App() {
//   const [user, setUser] = useState(null); // लॉगिन युजरची माहिती साठवण्यासाठी
//   const [activeTab, setActiveTab] = useState('dashboard');
//   const [employees, setEmployees] = useState([]);
//   const [editingEmployee, setEditingEmployee] = useState(null);

//   // Dashboard Search & Filters State
//   const [searchTerm, setSearchTerm] = useState('');
//   const [selectedRoom, setSelectedRoom] = useState('All');
//   const [selectedSaheb, setSelectedSaheb] = useState('All');
//   const [selectedSection, setSelectedSection] = useState('All');
//   const [selectedDesignation, setSelectedDesignation] = useState('All');
//   const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

//   // 1. पेज लोड झाल्यावर localStorage मधून युजर चेक करणे
//   useEffect(() => {
//     const savedUser = localStorage.getItem('user');
//     if (savedUser) {
//       setUser(JSON.parse(savedUser));
//     }
//   }, []);

//   // Backend कडून कर्मचाऱ्यांची लिस्ट Fetch करणे
//   const fetchEmployees = async () => {
//     try {
//       const res = await axios.get(`${API_BASE_URL}/employees`);
//       if (res.data) setEmployees(res.data);
//     } catch (err) {
//       console.error("Error fetching employees:", err);
//     }
//   };

//   useEffect(() => {
//     if (user) {
//       fetchEmployees();
//     }
//   }, [user]);

//   const handleLogout = () => {
//     localStorage.removeItem('token');
//     localStorage.removeItem('user');
//     setUser(null);
//   };

//   const handleEditClick = (emp) => {
//     setEditingEmployee(emp);
//     setActiveTab('add'); 
//   };

//   const handleSaveComplete = () => {
//     setEditingEmployee(null); 
//     fetchEmployees();         
//     setActiveTab('directory');
//   };

//   const handleCancelEdit = () => {
//     setEditingEmployee(null);
//     setActiveTab('directory');
//   };

//   // --- डॅशबोर्डसाठी लागणारे मोजमाप व फिल्टर्स ---
//   const todayStr = new Date().toISOString().split('T')[0];

//   const getTodayLeaves = () => {
//     return employees.filter(emp => {
//       try {
//         const cl = typeof emp.clLeaveDates === 'string' ? JSON.parse(emp.clLeaveDates || '[]') : (emp.clLeaveDates || []);
//         const el = typeof emp.elLeaveDates === 'string' ? JSON.parse(emp.elLeaveDates || '[]') : (emp.elLeaveDates || []);
//         const coff = typeof emp.coffLeaveDates === 'string' ? JSON.parse(emp.coffLeaveDates || '[]') : (emp.coffLeaveDates || []);
        
//         const allDates = [...cl, ...el, ...coff].map(item => typeof item === 'object' ? item.date : item);
//         return allDates.includes(todayStr);
//       } catch (e) {
//         return false;
//       }
//     });
//   };

//   const leaveListToday = getTodayLeaves();
  
//   const sahebOnLeave = leaveListToday.filter(emp => {
//     const role = emp.employeeRole?.toLowerCase() || '';
//     return (
//       role.includes('judge') || 
//       role.includes('magistrate') || 
//       role.includes('sahib') ||
//       role.includes('judicial officer')
//     );
//   });

//   const staffOnLeave = leaveListToday.filter(emp => !sahebOnLeave.includes(emp));
//   const uniqueRooms = [...new Set(employees.map(e => e.roomNumber).filter(Boolean))];
//   const uniqueSahebs = [...new Set(employees.map(e => e.underJudicialOfficer).filter(Boolean))];
//   const uniqueSections = [...new Set(employees.map(e => e.sectionName).filter(Boolean))];
//   const uniqueDesignations = [...new Set(employees.map(e => e.employeeRole).filter(Boolean))];

//   const filteredEmployees = employees.filter(emp => {
//     const matchSearch = Object.values(emp).some(val => 
//       String(val).toLowerCase().includes(searchTerm.toLowerCase())
//     );
//     const matchRoom = selectedRoom === 'All' || emp.roomNumber === selectedRoom;
//     const matchSaheb = selectedSaheb === 'All' || emp.underJudicialOfficer === selectedSaheb;
//     const matchSection = selectedSection === 'All' || emp.sectionName === selectedSection;
//     const matchDesig = selectedDesignation === 'All' || emp.employeeRole === selectedDesignation;

//     return matchSearch && matchRoom && matchSaheb && matchSection && matchDesig;
//   });

//   // जर युजर लॉगिन नसेल, तर पहिले लॉगिन पेज दाखवा
//   if (!user) {
//     return <Login onLoginSuccess={(loggedInUser) => setUser(loggedInUser)} />;
//   }

//   return (
//     <div className="app-container">
      
//       {/* 1. LEFT SIDEBAR NAVIGATION */}
//       <div className="sidebar">
//         <div className="sidebar-header">
//           <span style={{ fontSize: '24px' }}>🏛️</span>
//           <h3>Court Establishment</h3>
//         </div>

//         <ul className="sidebar-menu">
//           <li className={activeTab === 'dashboard' ? 'active' : ''} onClick={() => setActiveTab('dashboard')}>
//             🏠 Dashboard
//           </li>
//           <li className={activeTab === 'directory' ? 'active' : ''} onClick={() => setActiveTab('directory')}>
//             👥 Employee Directory
//           </li>
//    <li className={activeTab === 'add' ? 'active' : ''} onClick={() => { setEditingEmployee(null); setActiveTab('add'); }}>
//             ➕ Add New Employee
//           </li>
//           {/* 📑 CR रिपोर्ट नवीन मेनू ऑप्शन */}
//           <li className={activeTab === 'cr-report' ? 'active' : ''} onClick={() => setActiveTab('cr-report')}>
//             📑 CR Report (Tenure)
//           </li>
          
//           {/* फक्त Establishment Admin असेल तरच हा ऑप्शन दिसेल */}
//           {user.employeeRole === 'Establishment Admin' && (
//             <li className={activeTab === 'createUser' ? 'active' : ''} onClick={() => setActiveTab('createUser')}>
//               ➕ Create New User
//             </li>
//           )}

       
//           <li className={activeTab === 'leave' ? 'active' : ''} onClick={() => setActiveTab('leave')}>
//             📋 Leave Management
//           </li>
//           <li className={activeTab === 'transfer' ? 'active' : ''} onClick={() => setActiveTab('transfer')}>
//             🔄 Transfer Management
//           </li>
//           <li className={activeTab === 'settings' ? 'active' : ''} onClick={() => setActiveTab('settings')}>
//             ⚙️ Settings
//           </li>

//           {/* 🚪 LOGOUT BUTTON */}
//           <li 
//             style={{ marginTop: 'auto', background: '#dc2626', color: '#fff', textAlign: 'center', cursor: 'pointer', borderRadius: '6px' }} 
//             onClick={handleLogout}
//           >
//             🚪 Logout ({user.employeeName})
//           </li>
//         </ul>
//       </div>

//       {/* 2. MAIN CONTENT AREA */}
//       <div className="main-content">
        
//         {activeTab === 'dashboard' && (
//           <Dashboard 
//             employees={employees}
//             leaveListToday={leaveListToday}
//             sahebOnLeave={sahebOnLeave}
//             staffOnLeave={staffOnLeave}
//             filteredEmployees={filteredEmployees}
//             searchTerm={searchTerm}
//             setSearchTerm={setSearchTerm}
//             selectedRoom={selectedRoom}
//             setSelectedRoom={setSelectedRoom}
//             selectedSaheb={selectedSaheb}
//             setSelectedSaheb={setSelectedSaheb}
//             selectedSection={selectedSection}
//             setSelectedSection={setSelectedSection}
//             selectedDesignation={selectedDesignation}
//             setSelectedDesignation={setSelectedDesignation}
//             uniqueRooms={uniqueRooms}
//             uniqueSahebs={uniqueSahebs}
//             uniqueSections={uniqueSections}
//             uniqueDesignations={uniqueDesignations}
//             setActiveTab={setActiveTab} // <--- डॅशबोर्ड कार्डवरून नेव्हिगेट करण्यासाठी पास केले
//           />
//         )}

//         {/* 📑 CR रिपोर्ट पेज कंपोनंट */}
//         {activeTab === 'cr-report' && (
//           <div className="dashboard-view">
//             <CRReportModule />
//           </div>
//         )}

//         {/* Create New User View (फक्त Admin साठी) */}
//         {activeTab === 'createUser' && user.employeeRole === 'Establishment Admin' && (
//           <div className="dashboard-view">
//             <CreateUser />
//           </div>
//         )}

//         {activeTab === 'directory' && (
//           <div className="dashboard-view">
//              <EmployeeDirectory 
//               employees={employees} 
//               onEditClick={handleEditClick} 
//               onRefresh={fetchEmployees} 
//             />
//           </div>
//         )}

//         {activeTab === 'add' && (
//           <div className="dashboard-view">
//             <AddEmployeeForm 
//               editingData={editingEmployee}
//               onSaveComplete={handleSaveComplete}
//               onCancelEdit={handleCancelEdit}
//             />
//           </div>
//         )}

//         {activeTab === 'leave' && (
//           <div className="dashboard-view">
//             <LeaveManagement 
//               employees={employees} 
//               onLeaveActionComplete={() => {
//                 fetchEmployees();
//               }} 
//             />
//           </div>
//         )}

//         {activeTab === 'transfer' && (
//           <div className="dashboard-view">
//             <TransferManagement 
//               employees={employees} 
//               onRefresh={fetchEmployees} 
//             />
//           </div>
//         )}

//         {activeTab === 'settings' && (
//           <div className="dashboard-view">
//             <div className="section-card">
//               <h2>⚙️ Settings</h2>
//               <p style={{ marginTop: '10px', color: '#666' }}>सिस्टीम कॉन्फिगरेशन आणि प्रोफाइल सेटिंग्ज पर्याय येथे उपलब्ध आहेत.</p>
//               <div style={{ marginTop: '15px' }}>
//                 <p><strong>लॉगिन युजर:</strong> {user.employeeName}</p>
//                 <p><strong>रोल:</strong> {user.employeeRole}</p>
//                 <p><strong>विभाग:</strong> {user.sectionName || 'N/A'}</p>
//               </div>
//             </div>
//           </div>
//         )}

//       </div>
//     </div>
//   );
// }

// export default App;


// // import React, { useState, useEffect } from 'react';
// // import axios from 'axios';

// // const CourtDocumentViewer = () => {
// //   const [blobUrl, setBlobUrl] = useState('');
// //   const [loading, setLoading] = useState(true);

// //   useEffect(() => {
// //     const fetchCourtDocument = async () => {
// //       try {
// //         setLoading(true);

// //         const response = await axios.post('http://localhost:5000/api/get-cases', {
// //           court_no: 'MHNS01*1',
// //           tod: '1',
// //           state_code: '1',
// //           dist_code: '15'
// //         });

// //         // HTML चा Blob तयार करून URL जनरेट करा
// //         const blob = new Blob([response.data], { type: 'text/html' });
// //         const url = URL.createObjectURL(blob);
// //         setBlobUrl(url);

// //       } catch (err) {
// //         console.error('Fetch Error:', err);
// //       } finally {
// //         setLoading(false);
// //       }
// //     };

// //     fetchCourtDocument();
// //   }, []);

// //   return (
// //     <div style={{ padding: '15px', fontFamily: 'Arial, sans-serif' }}>
// //       <h2>Court Document Response:</h2>

// //       {loading ? (
// //         <p>डेटा लोड होत आहे...</p>
// //       ) : (
// //         <iframe
// //           src={blobUrl}
// //           title="Court Document"
// //           style={{
// //             width: '100%',
// //             height: '800px',
// //             border: '1px solid #ccc',
// //             borderRadius: '6px'
// //           }}
// //         />
// //       )}
// //     </div>
// //   );
// // };

// // export default CourtDocumentViewer;
