require('dotenv').config();
const express = require('express');
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
const cors = require('cors');
const dns = require('dns');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

dns.setDefaultResultOrder('ipv4first');

const app = express();

app.use(cors({
    origin: '*', 
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

const SPREADSHEET_ID = process.env.SPREADSHEET_ID;
const SECRET_KEY = process.env.JWT_SECRET || 'YOUR_SECRET_KEY';

let auth;
try {
  let creds;
  if (process.env.GOOGLE_CREDENTIALS_JSON) {
    creds = JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON);
  } else {
    creds = require('./google-credentials.json');
  }

  auth = new JWT({
    email: creds.client_email,
    key: creds.private_key, 
    scopes: [
      'https://www.googleapis.com/auth/spreadsheets', 
      'https://www.googleapis.com/auth/drive'
    ],
  });
  console.log("✅ Google Credentials Loaded Successfully!");
} catch (e) {
  console.error("❌ CRITICAL ERROR: Google Credentials are missing or invalid!", e.message);
  process.exit(1);
}

const doc = new GoogleSpreadsheet(SPREADSHEET_ID, auth);

// १. Master Sheet Initialization (इथे 'dob' कॉलम समाविष्ट केला आहे)
async function getMasterSheet() {
    await doc.loadInfo();
    let sheet = doc.sheetsByTitle['court_staff_master'];
    
    const requiredHeaders = [
        'id', 'employeeName', 'gender', 'employeeRole', 'designation', 'employeeId', 'underTaluka', 
        'underOfficeOrCourt', 'roomNumber', 'mobileNo', 'dob', 'status', // 🌟 इथे 'dob' जोडले आहे
        'underJudicialOfficer', 'judicialOfficerGrade', 'contractExpiryDate', 
        'totalCL', 'totalEL', 'totalCOff', 'clLeaveCount', 'elLeaveCount', 
        'coffLeaveCount', 'balanceCL', 'balanceEL', 'balanceCOff', 
        'takenLeaves', 'clLeaveDates', 'elLeaveDates', 'coffLeaveDates', 
        'sectionName', 'panNumber', 'flowerNumber',
        'officeStation', 'joiningDate', 'officeJoiningDate', 'basicSalary',
        'transferHistory', 'officersDuration', 'leaveCreditsHistory'
    ];

    if (!sheet) {
        console.log("⚠️ Creating 'court_staff_master' sheet...");
        sheet = await doc.addSheet({ 
            title: 'court_staff_master', 
            headerValues: requiredHeaders,
            gridProperties: { rowCount: 1000, columnCount: requiredHeaders.length + 5 }
        });
    } else {
        try {
            await sheet.loadHeaderRow();
            const currentHeaders = sheet.headerValues || [];
            const isMissing = requiredHeaders.some(h => !currentHeaders.includes(h));
            
            if (isMissing || !currentHeaders.includes('dob')) {
                console.log("⚠️ Updating headers to include 'dob' and missing fields...");
                await sheet.setHeaderRow(requiredHeaders);
                await sheet.loadHeaderRow();
            }
        } catch (e) {
            await sheet.setHeaderRow(requiredHeaders);
        }
    }
    return sheet;
}

// २. Users Sheet Initialization
async function getUsersSheet() {
    await doc.loadInfo();
    let sheet = doc.sheetsByTitle['court_users'];
    
    const requiredHeaders = [
        'id', 'employeeId', 'employeeName', 'username', 
        'password', 'employeeRole', 'roomNumber', 'sectionName', 'underJudicialOfficer'
    ];

    if (!sheet) {
        console.log("⚠️️ Creating 'court_users' sheet...");
        sheet = await doc.addSheet({ 
            title: 'court_users', 
            headerValues: requiredHeaders,
            gridProperties: { rowCount: 100, columnCount: requiredHeaders.length + 2 }
        });
    } else {
        try {
            await sheet.loadHeaderRow();
            const currentHeaders = sheet.headerValues || [];
            const isMissing = requiredHeaders.some(h => !currentHeaders.includes(h));
            
            if (isMissing) {
                await sheet.setHeaderRow(requiredHeaders);
                await sheet.loadHeaderRow();
            }
        } catch (e) {
            await sheet.setHeaderRow(requiredHeaders);
        }
    }
    return sheet;
}

const parseLeaves = (data) => {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    if (typeof data === 'string') {
        try { return JSON.parse(data); } catch (e) { return []; }
    }
    return [];
};

// 🛠️ Sanitizer Function (dob सपोर्टसह)
const sanitizeStaffData = (body, newId = null, existingRowData = {}) => {
    let clDates = parseLeaves(body.clLeaveDates || existingRowData.clLeaveDates);
    let elDates = parseLeaves(body.elLeaveDates || existingRowData.elLeaveDates);
    let coffDates = parseLeaves(body.coffLeaveDates || existingRowData.coffLeaveDates);

    const formatToObjects = (arr, defaultReason) => {
        return arr.map(item => {
            if (typeof item === 'string') {
                return { date: item, reason: defaultReason || 'N/A' };
            }
            return item; 
        });
    };

    clDates = formatToObjects(clDates, body.reason);
    elDates = formatToObjects(elDates, body.reason);
    coffDates = formatToObjects(coffDates, body.reason);

    const removeDuplicates = (arr) => {
        const uniqueMap = new Map();
        arr.forEach(item => {
            if (item && item.date) {
                uniqueMap.set(item.date, item);
            }
        });
        return Array.from(uniqueMap.values());
    };

    clDates = removeDuplicates(clDates);
    elDates = removeDuplicates(elDates);
    coffDates = removeDuplicates(coffDates);

    const clCount = clDates.length;
    const elCount = elDates.length;
    const coffCount = coffDates.length;

    let leaveCreditsHist = parseLeaves(body.leaveCreditsHistory || existingRowData.leaveCreditsHistory);

    let additionalCOff = 0;
    let additionalEL = 0;
    let additionalCL = 0;

    leaveCreditsHist.forEach(cr => {
        const days = parseFloat(cr.daysAdded) || 0;
        if (cr.leaveType === 'COff') additionalCOff += days;
        if (cr.leaveType === 'EL') additionalEL += days;
        if (cr.leaveType === 'CL') additionalCL += days;
    });

    const baseTotalCL = parseInt(body.totalCL ?? existingRowData.totalCL ?? 15);
    const baseTotalEL = parseInt(body.totalEL ?? existingRowData.totalEL ?? 30);
    const baseTotalCOff = parseInt(body.totalCOff ?? existingRowData.totalCOff ?? 0);

    const calculatedTotalCL = baseTotalCL + additionalCL;
    const calculatedTotalEL = baseTotalEL + additionalEL;
    const calculatedTotalCOff = baseTotalCOff + additionalCOff;

    const allTakenLeaves = [
        ...clDates.map(item => ({ date: item.date, type: 'CL', reason: item.reason })),
        ...elDates.map(item => ({ date: item.date, type: 'EL', reason: item.reason })),
        ...coffDates.map(item => ({ date: item.date, type: 'COff', reason: item.reason }))
    ];

    let transferHist = body.transferHistory ?? existingRowData.transferHistory ?? '[]';
    if (typeof transferHist !== 'string') {
        transferHist = JSON.stringify(transferHist);
    }

    let officersDur = body.officersDuration ?? existingRowData.officersDuration ?? '[]';
    if (typeof officersDur !== 'string') {
        officersDur = JSON.stringify(officersDur);
    }

    const data = {
        employeeName: body.employeeName || existingRowData.employeeName || '',
        gender: body.gender || existingRowData.gender || '', 
        employeeRole: body.employeeRole || body.designation || existingRowData.employeeRole || existingRowData.designation || 'Junior Clerk', 
        designation: body.designation || body.employeeRole || existingRowData.designation || existingRowData.employeeRole || 'Junior Clerk', 
        employeeId: body.employeeId || existingRowData.employeeId || '',
        underTaluka: body.underTaluka || existingRowData.underTaluka || 'Nashik (HQ)',
        underOfficeOrCourt: body.underOfficeOrCourt || existingRowData.underOfficeOrCourt || '',
        roomNumber: body.roomNumber || existingRowData.roomNumber || '',
        mobileNo: body.mobileNo || existingRowData.mobileNo || '',
        dob: body.dob || body.birthDate || existingRowData.dob || '', // 🌟 जन्मतारीख (DOB) साठवण्यासाठी
        status: body.status || existingRowData.status || 'Active',
        
        underJudicialOfficer: body.underJudicialOfficer || existingRowData.underJudicialOfficer || '',
        judicialOfficerGrade: body.judicialOfficerGrade || existingRowData.judicialOfficerGrade || '',
        contractExpiryDate: body.contractExpiryDate || existingRowData.contractExpiryDate || '',

        sectionName: body.sectionName || existingRowData.sectionName || '',
        panNumber: body.panNumber || existingRowData.panNumber || '',
        flowerNumber: body.flowerNumber || existingRowData.flowerNumber || '',

        officeStation: body.officeStation || existingRowData.officeStation || '',
        joiningDate: body.joiningDate || existingRowData.joiningDate || '',
        officeJoiningDate: body.officeJoiningDate || existingRowData.officeJoiningDate || '',
        basicSalary: body.basicSalary || existingRowData.basicSalary || '',

        totalCL: String(calculatedTotalCL),
        totalEL: String(calculatedTotalEL),
        totalCOff: String(calculatedTotalCOff),
        clLeaveCount: String(clCount),
        elLeaveCount: String(elCount),
        coffLeaveCount: String(coffCount),
        balanceCL: String(Math.max(0, calculatedTotalCL - clCount)),
        balanceEL: String(Math.max(0, calculatedTotalEL - elCount)),
        balanceCOff: String(Math.max(0, calculatedTotalCOff - coffCount)),
        
        takenLeaves: JSON.stringify(allTakenLeaves),
        clLeaveDates: JSON.stringify(clDates),
        elLeaveDates: JSON.stringify(elDates),
        coffLeaveDates: JSON.stringify(coffDates),
        transferHistory: transferHist,
        officersDuration: officersDur,
        leaveCreditsHistory: JSON.stringify(leaveCreditsHist)
    };

    if (newId) data.id = String(newId);
    return data;
};

// --- AUTH API ROUTES ---
app.post('/api/auth/create-user', async (req, res) => {
  try {
    const { employeeId, employeeName, username, password, role, roomNumber, sectionName, underJudicialOfficer } = req.body;
    const sheet = await getUsersSheet();
    const rows = await sheet.getRows();
    
    const existingUser = rows.find(r => r.get('username')?.trim().toLowerCase() === username?.trim().toLowerCase());
    if (existingUser) {
      return res.status(400).json({ error: 'हा युजरनेम आधीपासून अस्तित्वात आहे!' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const nextId = rows.length > 0 ? Math.max(...rows.map(r => parseInt(r.get('id') || 0))) + 1 : 1;

    const newUserRow = {
      id: String(nextId),
      employeeId: employeeId || '',
      employeeName: employeeName || '',
      username: username || '',
      password: hashedPassword,
      employeeRole: role || 'Junior Clerk',
      roomNumber: roomNumber || '',
      sectionName: sectionName || '',
      underJudicialOfficer: underJudicialOfficer || ''
    };

    await sheet.addRow(newUserRow);
    const { password: _, ...userWithoutPassword } = newUserRow;
    res.status(201).json({ message: 'युजर यशस्वीरित्या तयार केला!', user: userWithoutPassword });
  } catch (err) {
    res.status(500).json({ error: 'सर्व्हर एरर आला आहे.' });
  }
});

// 🌟 युनिफाइड लॉगिन API (Admin आणि Employee दोघांसाठी)
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password, loginType } = req.body;

    // जर युझरने 'employee' लॉगिन निवडले असेल किंवा मोबाईल नंबरने लॉगिन करत असेल
    if (loginType === 'employee') {
      const masterSheet = await getMasterSheet();
      const staffRows = await masterSheet.getRows();

      // मोबाईल नंबर किंवा कर्मचारी आयडीने कर्मचाऱ्याला शोधा
      const staffRow = staffRows.find(r => {
        const mob = String(r.get('mobileNo') || '').trim();
        const empId = String(r.get('employeeId') || '').trim();
        return mob === username.trim() || empId.toLowerCase() === username.trim().toLowerCase();
      });

      if (!staffRow) {
        return res.status(401).json({ error: 'कर्मचारी रेकॉर्ड सापडला नाही (चुकीचा मोबाईल नंबर/आयडी).' });
      }

      const staffData = staffRow.toObject();
      const employeeDob = String(staffData.dob || '').trim();

      // जन्मतारीख (DOB) पासवर्ड म्हणून मॅच करा
      if (employeeDob === password.trim()) {
        const token = jwt.sign(
          { id: staffData.id, role: 'employee', name: staffData.employeeName }, 
          SECRET_KEY, 
          { expiresIn: '24h' }
        );

        // पार्स करून सर्व डेटा पाठवा जेणेकरून 'View Info' प्रमाणे संपूर्ण माहिती दिसेल
        staffData.takenLeaves = parseLeaves(staffData.takenLeaves);
        staffData.clLeaveDates = parseLeaves(staffData.clLeaveDates);
        staffData.elLeaveDates = parseLeaves(staffData.elLeaveDates);
        staffData.coffLeaveDates = parseLeaves(staffData.coffLeaveDates);
        staffData.transferHistory = parseLeaves(staffData.transferHistory);
        staffData.officersDuration = parseLeaves(staffData.officersDuration);
        staffData.leaveCreditsHistory = parseLeaves(staffData.leaveCreditsHistory);
        staffData.role = 'employee';

        return res.json({ message: 'कर्मचारी लॉगिन यशस्वी!', token, user: staffData });
      } else {
        return res.status(401).json({ error: 'चुकीची जन्मतारीख (Invalid Password/DOB).' });
      }
    }

    // मानक ॲडमिन (Admin) लॉगिन
    const sheet = await getUsersSheet();
    const rows = await sheet.getRows();

    const userRow = rows.find(r => r.get('username')?.trim().toLowerCase() === username?.trim().toLowerCase());
    if (!userRow) {
      return res.status(401).json({ error: 'चुकीचा युजरनेम किंवा पासवर्ड!' });
    }

    const userData = userRow.toObject();
    const isMatch = await bcrypt.compare(password, userData.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'चुकीचा युजरनेम किंवा पासवर्ड!' });
    }

    const token = jwt.sign(
      { id: userData.id, role: userData.employeeRole || 'Admin', name: userData.employeeName }, 
      SECRET_KEY, 
      { expiresIn: '24h' }
    );

    const { password: _, ...userWithoutPassword } = userData;
    userWithoutPassword.role = userData.employeeRole || 'Admin';
    res.json({ message: 'लॉगिन यशस्वी!', token, user: userWithoutPassword });

  } catch (err) {
    console.error("Login Error:", err);
    res.status(500).json({ error: 'सर्व्हर एरर आला आहे.' });
  }
});

// --- EMPLOYEE & TENURE API ROUTES ---

const handleGetEmployees = async (req, res) => {
  try {
    const sheet = await getMasterSheet();
    const rows = await sheet.getRows();
    
    const formattedRows = rows.map(r => {
      const rowData = r.toObject();
      rowData.takenLeaves = parseLeaves(rowData.takenLeaves);
      rowData.clLeaveDates = parseLeaves(rowData.clLeaveDates);
      rowData.elLeaveDates = parseLeaves(rowData.elLeaveDates);
      rowData.coffLeaveDates = parseLeaves(rowData.coffLeaveDates);
      rowData.transferHistory = parseLeaves(rowData.transferHistory);
      rowData.officersDuration = parseLeaves(rowData.officersDuration);
      rowData.leaveCreditsHistory = parseLeaves(rowData.leaveCreditsHistory);
      return rowData;
    });

    res.json(formattedRows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
app.get('/api/court-staff', handleGetEmployees);
app.get('/api/employees', handleGetEmployees);

const handleAddEmployee = async (req, res) => {
  try {
    const sheet = await getMasterSheet();
    const rows = await sheet.getRows();
    const nextId = rows.length > 0 ? Math.max(...rows.map(r => parseInt(r.get('id') || 0))) + 1 : 1;
    const cleanData = sanitizeStaffData(req.body, nextId);
    
    await sheet.addRow(cleanData);
    res.status(201).json({ success: true, message: "Employee Added Successfully", id: nextId });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
app.post('/api/court-staff', handleAddEmployee);
app.post('/api/employees', handleAddEmployee);

const handleAddCreditLeave = async (req, res) => {
  try {
    const { id } = req.params;
    const { leaveType, daysAdded, date, reason } = req.body;

    const sheet = await getMasterSheet();
    const rows = await sheet.getRows();
    
    const row = rows.find(r => String(r.get('id') || '').trim() === String(id).trim());
    if (!row) {
      return res.status(404).json({ success: false, error: "कर्मचारी रेकॉर्ड सापडला नाही." });
    }

    const existingRowData = row.toObject();
    let currentHistory = parseLeaves(existingRowData.leaveCreditsHistory);

    const newCreditEntry = {
      leaveType: leaveType || 'COff',
      daysAdded: parseFloat(daysAdded) || 1,
      date: date || new Date().toISOString().split('T')[0],
      reason: reason || 'सुट्टीच्या दिवशी काम'
    };

    currentHistory.push(newCreditEntry);

    const updatePayload = {
      ...existingRowData,
      leaveCreditsHistory: currentHistory
    };

    const cleanData = sanitizeStaffData(updatePayload, id, existingRowData);

    Object.keys(cleanData).forEach(header => {
      if (header !== 'id') {
        row.set(header, String(cleanData[header] ?? ''));
      }
    });

    await row.save();
    res.json({ success: true, message: `✅ यशस्वीरीत्या ${daysAdded} ${leaveType} जमा करण्यात आले!`, leaveCreditsHistory: currentHistory });
  } catch (err) {
    console.error("❌ Add Credit Leave Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};
app.post('/api/employees/:id/add-credit-leave', handleAddCreditLeave);
app.post('/api/court-staff/:id/add-credit-leave', handleAddCreditLeave);

const handleOfficersDurationUpdate = async (req, res) => {
  try {
    const { id } = req.params;
    const { officersDuration, employeeName } = req.body;

    const sheet = await getMasterSheet();
    await sheet.loadHeaderRow();
    const rows = await sheet.getRows();
    
    let row = rows.find(r => String(r.get('id') || '').trim() === String(id).trim());
    if (!row && employeeName) {
      row = rows.find(r => String(r.get('employeeName') || '').trim().toLowerCase() === String(employeeName).trim().toLowerCase());
    }

    if (!row) {
      return res.status(404).json({ success: false, error: "कर्मचारी रेकॉर्ड गुगल शीटमध्ये सापडला नाही." });
    }

    let durationToSave = officersDuration;
    if (typeof durationToSave !== 'string') {
      durationToSave = JSON.stringify(durationToSave || []);
    }

    const headers = sheet.headerValues;
    const durationIndex = headers.indexOf('officersDuration');

    if (durationIndex !== -1) {
      await sheet.loadCells();
      const rowIndex = row.rowNumber - 1;
      const durationCell = sheet.getCell(rowIndex, durationIndex);
      durationCell.value = durationToSave;
      await sheet.saveUpdatedCells();
    }

    res.json({ 
      success: true, 
      message: "✅ सेवा कालावधी डेटा यशस्वीरीत्या अपडेट झाला!", 
      officersDuration: JSON.parse(durationToSave) 
    });
  } catch (err) {
    console.error("❌ Officers Duration Update Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};
app.put('/api/employees/:id/officers-duration', handleOfficersDurationUpdate);
app.put('/api/court-staff/:id/officers-duration', handleOfficersDurationUpdate);

const handleUpdateEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    const sheet = await getMasterSheet();
    const rows = await sheet.getRows();
    
    const row = rows.find(r => String(r.get('id') || '').trim() === String(id).trim());
    if (!row) {
      return res.status(404).json({ success: false, error: "रेकॉर्ड सापडला नाही." });
    }

    const existingRowData = row.toObject();
    const cleanData = sanitizeStaffData(req.body, id, existingRowData);

    Object.keys(cleanData).forEach(header => {
      if (header !== 'id') {
        row.set(header, String(cleanData[header] ?? ''));
      }
    });

    await row.save();
    res.json({ success: true, message: "✅ माहिती अचूकपणे अपडेट झाली!" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
app.put('/api/court-staff/:id', handleUpdateEmployee);
app.put('/api/employees/:id', handleUpdateEmployee);

const handleDeleteEmployee = async (req, res) => {
  try {
    const sheet = await getMasterSheet();
    const rows = await sheet.getRows();
    const row = rows.find(r => r.get('id') == req.params.id);
    
    if (row) {
      await row.delete();
      res.json({ success: true, message: "✅ डिलीट यशस्वी झाले" });
    } else {
      res.status(404).json({ success: false, error: "कर्मचारी सापडला नाही" });
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
app.delete('/api/court-staff/:id', handleDeleteEmployee);
app.delete('/api/employees/:id', handleDeleteEmployee);

async function createDefaultAdminIfNeeded() {
    try {
        const sheet = await getUsersSheet();
        const rows = await sheet.getRows();

        if (rows.length === 0) {
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash('admin123', salt);

            const defaultAdminRow = {
                id: '1',
                employeeId: 'EMP001',
                employeeName: 'System Administrator',
                username: 'admin',
                password: hashedPassword,
                employeeRole: 'Admin',
                roomNumber: '101',
                sectionName: 'Computer Section',
                underJudicialOfficer: 'N/A'
            };

            await sheet.addRow(defaultAdminRow);
        }
    } catch (err) {
        console.error("❌ Error creating default admin:", err);
    }
}

const PORT = process.env.PORT || 5000;
app.listen(PORT, async () => {
    console.log(`🚀 Server running on port ${PORT}`);
    await createDefaultAdminIfNeeded();
});


// require('dotenv').config();
// const express = require('express');
// const { GoogleSpreadsheet } = require('google-spreadsheet');
// const { JWT } = require('google-auth-library');
// const cors = require('cors');
// const dns = require('dns');
// const jwt = require('jsonwebtoken');
// const bcrypt = require('bcryptjs');

// dns.setDefaultResultOrder('ipv4first');

// const app = express();

// app.use(cors({
//     origin: '*', 
//     methods: ['GET', 'POST', 'PUT', 'DELETE'],
//     allowedHeaders: ['Content-Type', 'Authorization']
// }));
// app.use(express.json());

// const SPREADSHEET_ID = process.env.SPREADSHEET_ID;
// const SECRET_KEY = process.env.JWT_SECRET || 'YOUR_SECRET_KEY';

// let auth;
// try {
//   let creds;
//   // जर Vercel वरील Environment Variable उपलब्ध असेल तर तिथून वाच, अन्यथा लोकल फाईल वापर
//   if (process.env.GOOGLE_CREDENTIALS_JSON) {
//     creds = JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON);
//   } else {
//     creds = require('./google-credentials.json');
//   }

//   auth = new JWT({
//     email: creds.client_email,
//     key: creds.private_key, 
//     scopes: [
//       'https://www.googleapis.com/auth/spreadsheets', 
//       'https://www.googleapis.com/auth/drive'
//     ],
//   });
//   console.log("✅ Google Credentials Loaded Successfully!");
// } catch (e) {
//   console.error("❌ CRITICAL ERROR: Google Credentials are missing or invalid!", e.message);
//   process.exit(1);
// }
// const doc = new GoogleSpreadsheet(SPREADSHEET_ID, auth);

// // १. Master Sheet Initialization (नवीन leaveCreditsHistory कॉलमसह)
// async function getMasterSheet() {
//     await doc.loadInfo();
//     let sheet = doc.sheetsByTitle['court_staff_master'];
    
//     const requiredHeaders = [
//         'id', 'employeeName', 'gender', 'employeeRole', 'designation', 'employeeId', 'underTaluka', // 🌟 इथे 'designation' जोडले आहे
//         'underOfficeOrCourt', 'roomNumber', 'mobileNo', 'status', 
//         'underJudicialOfficer', 'judicialOfficerGrade', 'contractExpiryDate', 
//         'totalCL', 'totalEL', 'totalCOff', 'clLeaveCount', 'elLeaveCount', 
//         'coffLeaveCount', 'balanceCL', 'balanceEL', 'balanceCOff', 
//         'takenLeaves', 'clLeaveDates', 'elLeaveDates', 'coffLeaveDates', 
//         'sectionName', 'panNumber', 'flowerNumber',
//         'officeStation', 'joiningDate', 'officeJoiningDate', 'basicSalary',
//         'transferHistory', 'officersDuration', 'leaveCreditsHistory'
//     ];

//     if (!sheet) {
//         console.log("⚠️ Creating 'court_staff_master' sheet...");
//         sheet = await doc.addSheet({ 
//             title: 'court_staff_master', 
//             headerValues: requiredHeaders,
//             gridProperties: { rowCount: 1000, columnCount: requiredHeaders.length + 5 }
//         });
//     } else {
//         try {
//             await sheet.loadHeaderRow();
//             const currentHeaders = sheet.headerValues || [];
//             const isMissing = requiredHeaders.some(h => !currentHeaders.includes(h));
            
//             if (isMissing || !currentHeaders.includes('leaveCreditsHistory')) {
//                 console.log("⚠️ Updating headers to include 'leaveCreditsHistory' and missing fields...");
//                 await sheet.setHeaderRow(requiredHeaders);
//                 await sheet.loadHeaderRow();
//             }
//         } catch (e) {
//             await sheet.setHeaderRow(requiredHeaders);
//         }
//     }
//     return sheet;
// }

// // २. Users Sheet Initialization
// async function getUsersSheet() {
//     await doc.loadInfo();
//     let sheet = doc.sheetsByTitle['court_users'];
    
//     const requiredHeaders = [
//         'id', 'employeeId', 'employeeName', 'username', 
//         'password', 'employeeRole', 'roomNumber', 'sectionName', 'underJudicialOfficer'
//     ];

//     if (!sheet) {
//         console.log("⚠️ Creating 'court_users' sheet...");
//         sheet = await doc.addSheet({ 
//             title: 'court_users', 
//             headerValues: requiredHeaders,
//             gridProperties: { rowCount: 100, columnCount: requiredHeaders.length + 2 }
//         });
//     } else {
//         try {
//             await sheet.loadHeaderRow();
//             const currentHeaders = sheet.headerValues || [];
//             const isMissing = requiredHeaders.some(h => !currentHeaders.includes(h));
            
//             if (isMissing) {
//                 await sheet.setHeaderRow(requiredHeaders);
//                 await sheet.loadHeaderRow();
//             }
//         } catch (e) {
//             await sheet.setHeaderRow(requiredHeaders);
//         }
//     }
//     return sheet;
// }

// // 🛠️ सुरक्षितरीत्या Parse करण्यासाठी
// const parseLeaves = (data) => {
//     if (!data) return [];
//     if (Array.isArray(data)) return data;
//     if (typeof data === 'string') {
//         try { return JSON.parse(data); } catch (e) { return []; }
//     }
//     return [];
// };

// // 🛠️ Sanitizer Function (नवीन leaveCreditsHistory सपोर्टसह)
// const sanitizeStaffData = (body, newId = null, existingRowData = {}) => {
//     let clDates = parseLeaves(body.clLeaveDates || existingRowData.clLeaveDates);
//     let elDates = parseLeaves(body.elLeaveDates || existingRowData.elLeaveDates);
//     let coffDates = parseLeaves(body.coffLeaveDates || existingRowData.coffLeaveDates);

//     const formatToObjects = (arr, defaultReason) => {
//         return arr.map(item => {
//             if (typeof item === 'string') {
//                 return { date: item, reason: defaultReason || 'N/A' };
//             }
//             return item; 
//         });
//     };

//     clDates = formatToObjects(clDates, body.reason);
//     elDates = formatToObjects(elDates, body.reason);
//     coffDates = formatToObjects(coffDates, body.reason);

//     const removeDuplicates = (arr) => {
//         const uniqueMap = new Map();
//         arr.forEach(item => {
//             if (item && item.date) {
//                 uniqueMap.set(item.date, item);
//             }
//         });
//         return Array.from(uniqueMap.values());
//     };

//     clDates = removeDuplicates(clDates);
//     elDates = removeDuplicates(elDates);
//     coffDates = removeDuplicates(coffDates);

//     const clCount = clDates.length;
//     const elCount = elDates.length;
//     const coffCount = coffDates.length;

//     // 🌟 क्रेडिट लीव्ह हिस्टरी पार्स करणे
//     let leaveCreditsHist = parseLeaves(body.leaveCreditsHistory || existingRowData.leaveCreditsHistory);

//     // 🌟 एकूण रजांमध्ये जमा झालेल्या (Credit झालेल्या) दिवसांची बेरीज करणे
//     let additionalCOff = 0;
//     let additionalEL = 0;
//     let additionalCL = 0;

//     leaveCreditsHist.forEach(cr => {
//         const days = parseFloat(cr.daysAdded) || 0;
//         if (cr.leaveType === 'COff') additionalCOff += days;
//         if (cr.leaveType === 'EL') additionalEL += days;
//         if (cr.leaveType === 'CL') additionalCL += days;
//     });

//     const baseTotalCL = parseInt(body.totalCL ?? existingRowData.totalCL ?? 15);
//     const baseTotalEL = parseInt(body.totalEL ?? existingRowData.totalEL ?? 30);
//     const baseTotalCOff = parseInt(body.totalCOff ?? existingRowData.totalCOff ?? 0);

//     const calculatedTotalCL = baseTotalCL + additionalCL;
//     const calculatedTotalEL = baseTotalEL + additionalEL;
//     const calculatedTotalCOff = baseTotalCOff + additionalCOff;

//     const allTakenLeaves = [
//         ...clDates.map(item => ({ date: item.date, type: 'CL', reason: item.reason })),
//         ...elDates.map(item => ({ date: item.date, type: 'EL', reason: item.reason })),
//         ...coffDates.map(item => ({ date: item.date, type: 'COff', reason: item.reason }))
//     ];

//     let transferHist = body.transferHistory ?? existingRowData.transferHistory ?? '[]';
//     if (typeof transferHist !== 'string') {
//         transferHist = JSON.stringify(transferHist);
//     }

//     let officersDur = body.officersDuration ?? existingRowData.officersDuration ?? '[]';
//     if (typeof officersDur !== 'string') {
//         officersDur = JSON.stringify(officersDur);
//     }

//     const data = {
//         employeeName: body.employeeName || existingRowData.employeeName || '',
//         gender: body.gender || existingRowData.gender || '', 
//        employeeRole: body.employeeRole || body.designation || existingRowData.employeeRole || existingRowData.designation || 'Junior Clerk', 
//         designation: body.designation || body.employeeRole || existingRowData.designation || existingRowData.employeeRole || 'Junior Clerk', // 🌟 इथे designation ऍड केले
//         employeeId: body.employeeId || existingRowData.employeeId || '',
//         underTaluka: body.underTaluka || existingRowData.underTaluka || 'Nashik (HQ)',
//         underOfficeOrCourt: body.underOfficeOrCourt || existingRowData.underOfficeOrCourt || '',
//         roomNumber: body.roomNumber || existingRowData.roomNumber || '',
//         mobileNo: body.mobileNo || existingRowData.mobileNo || '',
//         status: body.status || existingRowData.status || 'Active',
        
//         underJudicialOfficer: body.underJudicialOfficer || existingRowData.underJudicialOfficer || '',
//         judicialOfficerGrade: body.judicialOfficerGrade || existingRowData.judicialOfficerGrade || '',
//         contractExpiryDate: body.contractExpiryDate || existingRowData.contractExpiryDate || '',

//         sectionName: body.sectionName || existingRowData.sectionName || '',
//         panNumber: body.panNumber || existingRowData.panNumber || '',
//         flowerNumber: body.flowerNumber || existingRowData.flowerNumber || '',

//         officeStation: body.officeStation || existingRowData.officeStation || '',
//         joiningDate: body.joiningDate || existingRowData.joiningDate || '',
//         officeJoiningDate: body.officeJoiningDate || existingRowData.officeJoiningDate || '',
//         basicSalary: body.basicSalary || existingRowData.basicSalary || '',

//         totalCL: String(calculatedTotalCL),
//         totalEL: String(calculatedTotalEL),
//         totalCOff: String(calculatedTotalCOff),
//         clLeaveCount: String(clCount),
//         elLeaveCount: String(elCount),
//         coffLeaveCount: String(coffCount),
//         balanceCL: String(Math.max(0, calculatedTotalCL - clCount)),
//         balanceEL: String(Math.max(0, calculatedTotalEL - elCount)),
//         balanceCOff: String(Math.max(0, calculatedTotalCOff - coffCount)),
        
//         takenLeaves: JSON.stringify(allTakenLeaves),
//         clLeaveDates: JSON.stringify(clDates),
//         elLeaveDates: JSON.stringify(elDates),
//         coffLeaveDates: JSON.stringify(coffDates),
//         transferHistory: transferHist,
//         officersDuration: officersDur,
//         leaveCreditsHistory: JSON.stringify(leaveCreditsHist)
//     };

//     if (newId) data.id = String(newId);
//     return data;
// };

// // --- AUTH API ROUTES ---
// app.post('/api/auth/create-user', async (req, res) => {
//   try {
//     const { employeeId, employeeName, username, password, role, roomNumber, sectionName, underJudicialOfficer } = req.body;
//     const sheet = await getUsersSheet();
//     const rows = await sheet.getRows();
    
//     const existingUser = rows.find(r => r.get('username')?.trim().toLowerCase() === username?.trim().toLowerCase());
//     if (existingUser) {
//       return res.status(400).json({ error: 'हा युजरनेम आधीपासून अस्तित्वात आहे!' });
//     }

//     const salt = await bcrypt.genSalt(10);
//     const hashedPassword = await bcrypt.hash(password, salt);
//     const nextId = rows.length > 0 ? Math.max(...rows.map(r => parseInt(r.get('id') || 0))) + 1 : 1;

//     const newUserRow = {
//       id: String(nextId),
//       employeeId: employeeId || '',
//       employeeName: employeeName || '',
//       username: username || '',
//       password: hashedPassword,
//       employeeRole: role || 'Junior Clerk',
//       roomNumber: roomNumber || '',
//       sectionName: sectionName || '',
//       underJudicialOfficer: underJudicialOfficer || ''
//     };

//     await sheet.addRow(newUserRow);
//     const { password: _, ...userWithoutPassword } = newUserRow;
//     res.status(201).json({ message: 'युजर यशस्वीरित्या तयार केला!', user: userWithoutPassword });
//   } catch (err) {
//     res.status(500).json({ error: 'सर्व्हर एरर आला आहे.' });
//   }
// });

// app.post('/api/auth/login', async (req, res) => {
//   try {
//     const { username, password } = req.body;
//     const sheet = await getUsersSheet();
//     const rows = await sheet.getRows();

//     const userRow = rows.find(r => r.get('username')?.trim().toLowerCase() === username?.trim().toLowerCase());
//     if (!userRow) {
//       return res.status(401).json({ error: 'चुकीचा युजरनेम किंवा पासवर्ड!' });
//     }

//     const userData = userRow.toObject();
//     const isMatch = await bcrypt.compare(password, userData.password);
//     if (!isMatch) {
//       return res.status(401).json({ error: 'चुकीचा युजरनेम किंवा पासवर्ड!' });
//     }

//     const token = jwt.sign(
//       { id: userData.id, role: userData.employeeRole, name: userData.employeeName }, 
//       SECRET_KEY, 
//       { expiresIn: '24h' }
//     );

//     const { password: _, ...userWithoutPassword } = userData;
//     res.json({ message: 'लॉगिन यशस्वी!', token, user: userWithoutPassword });
//   } catch (err) {
//     res.status(500).json({ error: 'सर्व्हर एरर आला आहे.' });
//   }
// });

// // --- EMPLOYEE & TENURE API ROUTES ---

// const handleGetEmployees = async (req, res) => {
//   try {
//     const sheet = await getMasterSheet();
//     const rows = await sheet.getRows();
    
//     const formattedRows = rows.map(r => {
//       const rowData = r.toObject();
//       rowData.takenLeaves = parseLeaves(rowData.takenLeaves);
//       rowData.clLeaveDates = parseLeaves(rowData.clLeaveDates);
//       rowData.elLeaveDates = parseLeaves(rowData.elLeaveDates);
//       rowData.coffLeaveDates = parseLeaves(rowData.coffLeaveDates);
//       rowData.transferHistory = parseLeaves(rowData.transferHistory);
//       rowData.officersDuration = parseLeaves(rowData.officersDuration);
//       rowData.leaveCreditsHistory = parseLeaves(rowData.leaveCreditsHistory); // 🌟 पार्स केले
//       return rowData;
//     });

//     res.json(formattedRows);
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// };
// app.get('/api/court-staff', handleGetEmployees);
// app.get('/api/employees', handleGetEmployees);

// const handleAddEmployee = async (req, res) => {
//   try {
//     const sheet = await getMasterSheet();
//     const rows = await sheet.getRows();
//     const nextId = rows.length > 0 ? Math.max(...rows.map(r => parseInt(r.get('id') || 0))) + 1 : 1;
//     const cleanData = sanitizeStaffData(req.body, nextId);
    
//     await sheet.addRow(cleanData);
//     res.status(201).json({ success: true, message: "Employee Added Successfully", id: nextId });
//   } catch (err) {
//     res.status(500).json({ success: false, error: err.message });
//   }
// };
// app.post('/api/court-staff', handleAddEmployee);
// app.post('/api/employees', handleAddEmployee);

// // 🌟 नवीन API: सुट्टीच्या दिवशी काम केल्यामुळे C-Off किंवा EL जमा करण्यासाठी (Add Credit Leave API)
// const handleAddCreditLeave = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const { leaveType, daysAdded, date, reason } = req.body;

//     const sheet = await getMasterSheet();
//     const rows = await sheet.getRows();
    
//     const row = rows.find(r => String(r.get('id') || '').trim() === String(id).trim());
//     if (!row) {
//       return res.status(404).json({ success: false, error: "कर्मचारी रेकॉर्ड सापडला नाही." });
//     }

//     const existingRowData = row.toObject();
//     let currentHistory = parseLeaves(existingRowData.leaveCreditsHistory);

//     // नवीन क्रेडिट रेकॉर्ड जोडणे
//     const newCreditEntry = {
//       leaveType: leaveType || 'COff',
//       daysAdded: parseFloat(daysAdded) || 1,
//       date: date || new Date().toISOString().split('T')[0],
//       reason: reason || 'सुट्टीच्या दिवशी काम'
//     };

//     currentHistory.push(newCreditEntry);

//     // डेटा अपडेटसाठी तयार करणे
//     const updatePayload = {
//       ...existingRowData,
//       leaveCreditsHistory: currentHistory
//     };

//     const cleanData = sanitizeStaffData(updatePayload, id, existingRowData);

//     Object.keys(cleanData).forEach(header => {
//       if (header !== 'id') {
//         row.set(header, String(cleanData[header] ?? ''));
//       }
//     });

//     await row.save();
//     res.json({ success: true, message: `✅ यशस्वीरीत्या ${daysAdded} ${leaveType} जमा करण्यात आले!`, leaveCreditsHistory: currentHistory });
//   } catch (err) {
//     console.error("❌ Add Credit Leave Error:", err);
//     res.status(500).json({ success: false, error: err.message });
//   }
// };
// app.post('/api/employees/:id/add-credit-leave', handleAddCreditLeave);
// app.post('/api/court-staff/:id/add-credit-leave', handleAddCreditLeave);

// // 🔄 न्यायाधीशांच्या अंतर्गत सेवा कालावधी (Officers Duration) ॲड, एडिट व डिलीट करण्यासाठी मुख्य API
// const handleOfficersDurationUpdate = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const { officersDuration, employeeName } = req.body;

//     const sheet = await getMasterSheet();
//     await sheet.loadHeaderRow();
//     const rows = await sheet.getRows();
    
//     let row = rows.find(r => String(r.get('id') || '').trim() === String(id).trim());
//     if (!row && employeeName) {
//       row = rows.find(r => String(r.get('employeeName') || '').trim().toLowerCase() === String(employeeName).trim().toLowerCase());
//     }

//     if (!row) {
//       return res.status(404).json({ success: false, error: "कर्मचारी रेकॉर्ड गुगल शीटमध्ये सापडला नाही." });
//     }

//     let durationToSave = officersDuration;
//     if (typeof durationToSave !== 'string') {
//       durationToSave = JSON.stringify(durationToSave || []);
//     }

//     const headers = sheet.headerValues;
//     const durationIndex = headers.indexOf('officersDuration');

//     if (durationIndex !== -1) {
//       await sheet.loadCells();
//       const rowIndex = row.rowNumber - 1;
//       const durationCell = sheet.getCell(rowIndex, durationIndex);
//       durationCell.value = durationToSave;
//       await sheet.saveUpdatedCells();
//     }

//     res.json({ 
//       success: true, 
//       message: "✅ सेवा कालावधी डेटा यशस्वीरीत्या अपडेट (Edit/Delete/Add) झाला!", 
//       officersDuration: JSON.parse(durationToSave) 
//     });
//   } catch (err) {
//     console.error("❌ Officers Duration Update Error:", err);
//     res.status(500).json({ success: false, error: err.message });
//   }
// };
// app.put('/api/employees/:id/officers-duration', handleOfficersDurationUpdate);
// app.put('/api/court-staff/:id/officers-duration', handleOfficersDurationUpdate);

// const handleUpdateEmployee = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const sheet = await getMasterSheet();
//     const rows = await sheet.getRows();
    
//     const row = rows.find(r => String(r.get('id') || '').trim() === String(id).trim());
//     if (!row) {
//       return res.status(404).json({ success: false, error: "रेकॉर्ड सापडला नाही." });
//     }

//     const existingRowData = row.toObject();
//     const cleanData = sanitizeStaffData(req.body, id, existingRowData);

//     Object.keys(cleanData).forEach(header => {
//       if (header !== 'id') {
//         row.set(header, String(cleanData[header] ?? ''));
//       }
//     });

//     await row.save();
//     res.json({ success: true, message: "✅ माहिती अचूकपणे अपडेट झाली!" });
//   } catch (err) {
//     res.status(500).json({ success: false, error: err.message });
//   }
// };
// app.put('/api/court-staff/:id', handleUpdateEmployee);
// app.put('/api/employees/:id', handleUpdateEmployee);

// const handleDeleteEmployee = async (req, res) => {
//   try {
//     const sheet = await getMasterSheet();
//     const rows = await sheet.getRows();
//     const row = rows.find(r => r.get('id') == req.params.id);
    
//     if (row) {
//       await row.delete();
//       res.json({ success: true, message: "✅ डिलीट यशस्वी झाले" });
//     } else {
//       res.status(404).json({ success: false, error: "कर्मचारी सापडला नाही" });
//     }
//   } catch (err) {
//     res.status(500).json({ success: false, error: err.message });
//   }
// };
// app.delete('/api/court-staff/:id', handleDeleteEmployee);
// app.delete('/api/employees/:id', handleDeleteEmployee);

// async function createDefaultAdminIfNeeded() {
//     try {
//         const sheet = await getUsersSheet();
//         const rows = await sheet.getRows();

//         if (rows.length === 0) {
//             const salt = await bcrypt.genSalt(10);
//             const hashedPassword = await bcrypt.hash('admin123', salt);

//             const defaultAdminRow = {
//                 id: '1',
//                 employeeId: 'EMP001',
//                 employeeName: 'System Administrator',
//                 username: 'admin',
//                 password: hashedPassword,
//                 employeeRole: 'Admin',
//                 roomNumber: '101',
//                 sectionName: 'Computer Section',
//                 underJudicialOfficer: 'N/A'
//             };

//             await sheet.addRow(defaultAdminRow);
//         }
//     } catch (err) {
//         console.error("❌ Error creating default admin:", err);
//     }
// }

// const PORT = process.env.PORT || 5000;
// app.listen(PORT, async () => {
//     console.log(`🚀 Server running on port ${PORT}`);
//     await createDefaultAdminIfNeeded();
// });


// const handleApplyLeave = async (req, res) => {
//   try {
//     const { employeeId, id, employeeName, leaveType, startDate, endDate, reason } = req.body;
//     const searchKey = String(employeeId || id || employeeName || '').trim().toLowerCase();

//     const sheet = await getMasterSheet();
//     const rows = await sheet.getRows();
    
//     const row = rows.find(r => {
//       const rId = String(r.get('id') || '').trim().toLowerCase();
//       const rEmpId = String(r.get('employeeId') || '').trim().toLowerCase();
//       const rName = String(r.get('employeeName') || '').trim().toLowerCase();
      
//       return (rId && rId === searchKey) || 
//              (rEmpId && rEmpId === searchKey) || 
//              (rName && rName === searchKey);
//     });

//     if (!row) {
//       return res.status(404).json({ success: false, error: "कर्मचारी रेकॉर्ड सापडला नाही." });
//     }

//     const existingRowData = row.toObject();

//     let clDates = parseLeaves(existingRowData.clLeaveDates);
//     let elDates = parseLeaves(existingRowData.elLeaveDates);
//     let coffDates = parseLeaves(existingRowData.coffLeaveDates);

//     const newLeaveEntry = { 
//       date: startDate || new Date().toISOString().split('T')[0], 
//       reason: reason || 'N/A', 
//       endDate: endDate || startDate 
//     };

//     if (leaveType === 'CL') {
//       clDates.push(newLeaveEntry);
//     } else if (leaveType === 'EL') {
//       elDates.push(newLeaveEntry);
//     } else if (leaveType === 'COff' || leaveType === 'C-Off') {
//       coffDates.push(newLeaveEntry);
//     }

//     // 🌟 अत्यंत सुरक्षित अपडेट पेलोड
//     const updatePayload = {
//       ...existingRowData,
//       clLeaveDates: JSON.stringify(clDates),
//       elLeaveDates: JSON.stringify(elDates),
//       coffLeaveDates: JSON.stringify(coffDates),
//       clLeaveCount: String(clDates.length),
//       elLeaveCount: String(elDates.length),
//       coffLeaveCount: String(coffDates.length),
//       balanceCL: String(Math.max(0, parseInt(existingRowData.totalCL || 15) - clDates.length)),
//       balanceEL: String(Math.max(0, parseInt(existingRowData.totalEL || 30) - elDates.length)),
//       balanceCOff: String(Math.max(0, parseInt(existingRowData.totalCOff || 0) - coffDates.length)),
//       takenLeaves: JSON.stringify([
//         ...clDates.map(item => ({ date: item.date, type: 'CL', reason: item.reason })),
//         ...elDates.map(item => ({ date: item.date, type: 'EL', reason: item.reason })),
//         ...coffDates.map(item => ({ date: item.date, type: 'COff', reason: item.reason }))
//       ])
//     };

//     Object.keys(updatePayload).forEach(header => {
//       if (header !== 'id' && updatePayload[header] !== undefined) {
//         row.set(header, String(updatePayload[header] ?? ''));
//       }
//     });

//     await row.save();
//     res.json({ success: true, message: "✅ रजा यशस्वीरीत्या सबमिट झाली!" });
//   } catch (err) {
//     console.error("❌ Apply Leave Detailed Error:", err);
//     res.status(500).json({ success: false, error: err.message });
//   }
// };

// app.post('/api/leaves', handleApplyLeave);
// app.post('/api/court-staff/leaves', handleApplyLeave);


// // 🌟 नवीन API: कर्मचाऱ्याची ट्रान्सफर हिस्ट्री अपडेट करण्यासाठी (Transfer Management API)
// const handleTransferUpdate = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const { transferHistory, officeStation, underOfficeOrCourt } = req.body;

//     const sheet = await getMasterSheet();
//     const rows = await sheet.getRows();
    
//     const row = rows.find(r => String(r.get('id') || '').trim() === String(id).trim());
//     if (!row) {
//       return res.status(404).json({ success: false, error: "कर्मचारी रेकॉर्ड सापडला नाही." });
//     }

//     const existingRowData = row.toObject();

//     let transferHistToSave = transferHistory;
//     if (typeof transferHistToSave !== 'string') {
//       transferHistToSave = JSON.stringify(transferHistToSave || []);
//     }

//     const updatePayload = {
//       ...existingRowData,
//       transferHistory: transferHistToSave,
//       officeStation: officeStation || existingRowData.officeStation || '',
//       underOfficeOrCourt: underOfficeOrCourt || existingRowData.underOfficeOrCourt || ''
//     };

//     const cleanData = sanitizeStaffData(updatePayload, id, existingRowData);

//     Object.keys(cleanData).forEach(header => {
//       if (header !== 'id') {
//         row.set(header, String(cleanData[header] ?? ''));
//       }
//     });

//     await row.save();
//     res.json({ success: true, message: "✅ ट्रान्सफर रेकॉर्ड यशस्वीरीत्या अपडेट झाला!", transferHistory: JSON.parse(transferHistToSave) });
//   } catch (err) {
//     console.error("❌ Transfer Update Error:", err);
//     res.status(500).json({ success: false, error: err.message });
//   }
// };

// // दोन्ही फॉरमॅटसाठी राऊट रजिस्टर करणे
// app.put('/api/employees/:id/transfer', handleTransferUpdate);
// app.put('/api/court-staff/:id/transfer', handleTransferUpdate);
