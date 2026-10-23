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

// १. Master Sheet Initialization (इथे 'dailyManage' कॉलम समाविष्ट केला आहे)
async function getMasterSheet() {
    await doc.loadInfo();
    let sheet = doc.sheetsByTitle['court_staff_master'];
    
    const requiredHeaders = [
        'id', 'employeeName', 'gender', 'employeeRole', 'designation', 'employeeId', 'underTaluka', 
        'underOfficeOrCourt', 'roomNumber', 'mobileNo', 'dob', 'status',
        'underJudicialOfficer', 'judicialOfficerGrade', 'contractExpiryDate', 
        'totalCL', 'totalEL', 'totalCOff', 'clLeaveCount', 'elLeaveCount', 
        'coffLeaveCount', 'balanceCL', 'balanceEL', 'balanceCOff', 
        'takenLeaves', 'clLeaveDates', 'elLeaveDates', 'coffLeaveDates', 
        'sectionName', 'panNumber', 'flowerNumber',
        'officeStation', 'joiningDate', 'officeJoiningDate', 'basicSalary',
        'transferHistory', 'officersDuration', 'leaveCreditsHistory', 'dailyManage' // 🌟 इथे 'dailyManage' जोडले आहे
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
            
            if (isMissing || !currentHeaders.includes('dailyManage')) {
                console.log("⚠️ Updating headers to include 'dailyManage' and missing fields...");
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
        console.log("⚠️ Creating 'court_users' sheet...");
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

// 🛠️ Sanitizer Function (dailyManage सपोर्टसह)
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

    // 🌟 शिल्लक रजेपेक्षा जास्त दिवस असल्यास सर्वर एरर पाठवेल
    if (clCount > calculatedTotalCL) {
        throw new Error(`अपुरी CL शिल्लक! एकूण कोटा ${calculatedTotalCL} पेक्षा जास्त रजा मंजूर होऊ शकत नाही.`);
    }
    if (elCount > calculatedTotalEL) {
        throw new Error(`अपुरी EL शिल्लक! एकूण कोटा ${calculatedTotalEL} पेक्षा जास्त रजा मंजूर होऊ शकत नाही.`);
    }
    if (coffCount > calculatedTotalCOff) {
        throw new Error(`अपुरी C-Off शिल्लक! एकूण कोटा ${calculatedTotalCOff} पेक्षा जास्त रजा मंजूर होऊ शकत नाही.`);
    }

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

    let dailyManageData = body.dailyManage ?? existingRowData.dailyManage ?? '[]';
    if (typeof dailyManageData !== 'string') {
        dailyManageData = JSON.stringify(dailyManageData);
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
        dob: body.dob || body.birthDate || existingRowData.dob || '',
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
        leaveCreditsHistory: JSON.stringify(leaveCreditsHist),
        dailyManage: dailyManageData // 🌟 इथे dailyManage जोडले आहे
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

app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password, loginType } = req.body;

    if (loginType === 'employee') {
      const masterSheet = await getMasterSheet();
      const staffRows = await masterSheet.getRows();

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

      if (employeeDob === password.trim()) {
        const token = jwt.sign(
          { id: staffData.id, role: 'employee', name: staffData.employeeName }, 
          SECRET_KEY, 
          { expiresIn: '24h' }
        );

        staffData.takenLeaves = parseLeaves(staffData.takenLeaves);
        staffData.clLeaveDates = parseLeaves(staffData.clLeaveDates);
        staffData.elLeaveDates = parseLeaves(staffData.elLeaveDates);
        staffData.coffLeaveDates = parseLeaves(staffData.coffLeaveDates);
        staffData.transferHistory = parseLeaves(staffData.transferHistory);
        staffData.officersDuration = parseLeaves(staffData.officersDuration);
        staffData.leaveCreditsHistory = parseLeaves(staffData.leaveCreditsHistory);
        staffData.dailyManage = parseLeaves(staffData.dailyManage);
        staffData.role = 'employee';

        return res.json({ message: 'कर्मचारी लॉगिन यशस्वी!', token, user: staffData });
      } else {
        return res.status(401).json({ error: 'चुकीची जन्मतारीख (Invalid Password/DOB).' });
      }
    }

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
      rowData.dailyManage = parseLeaves(rowData.dailyManage);
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

// 🌟 DAILY DUTY ALLOCATION API ROUTE
const handleAddDailyManage = async (req, res) => {
  try {
    const { id } = req.params;
    const { date, absentEmpName, status, relieverEmpName, relieverEmpRole, remark } = req.body;

    const sheet = await getMasterSheet();
    const rows = await sheet.getRows();

    const row = rows.find(r => String(r.get('id') || '').trim() === String(id).trim()) ||
                rows.find(r => String(r.get('employeeName') || '').trim().toLowerCase() === String(absentEmpName || '').trim().toLowerCase());

    if (!row) {
      return res.status(404).json({ success: false, error: "कर्मचारी रेकॉर्ड सापडला नाही." });
    }

    const existingRowData = row.toObject();
    let currentManageList = parseLeaves(existingRowData.dailyManage);

    const newEntry = {
      date: date || new Date().toISOString().split('T')[0],
      status: status || 'रजेवर (On Leave)',
      relieverEmpName: relieverEmpName || '',
      relieverEmpRole: relieverEmpRole || '',
      remark: remark || 'N/A'
    };

    currentManageList.push(newEntry);

    const updatePayload = {
      ...existingRowData,
      dailyManage: currentManageList
    };

    const cleanData = sanitizeStaffData(updatePayload, row.get('id'), existingRowData);

    Object.keys(cleanData).forEach(header => {
      if (header !== 'id') {
        row.set(header, String(cleanData[header] ?? ''));
      }
    });

    await row.save();
    res.json({ success: true, message: "✅ दैनिक काम वाटप यशस्वीरीत्या सेव्ह झाले!", dailyManage: currentManageList });
  } catch (err) {
    console.error("❌ Add Daily Manage Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};
app.post('/api/employees/:id/add-daily-manage', handleAddDailyManage);
app.post('/api/court-staff/:id/add-daily-manage', handleAddDailyManage);

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

// --- UPDATED LEAVE MANAGEMENT API ROUTE ---
const handleApplyLeave = async (req, res) => {
  try {
    const { employeeId, employeeName, leaveType, date, reason, clLeaveDates, elLeaveDates, coffLeaveDates } = req.body;
    
    const sheet = await getMasterSheet();
    const rows = await sheet.getRows();
    
    let row = rows.find(r => String(r.get('employeeId') || '').trim() === String(employeeId).trim());
    if (!row && employeeName) {
      row = rows.find(r => String(r.get('employeeName') || '').trim().toLowerCase() === String(employeeName).trim().toLowerCase());
    }

    if (!row) {
      return res.status(404).json({ success: false, error: "कर्मचारी रेकॉर्ड सापडला नाही." });
    }

    const existingRowData = row.toObject();

    let existingCL = parseLeaves(existingRowData.clLeaveDates);
    let existingEL = parseLeaves(existingRowData.elLeaveDates);
    let existingCOff = parseLeaves(existingRowData.coffLeaveDates);

    let incomingCL = parseLeaves(clLeaveDates || []);
    let incomingEL = parseLeaves(elLeaveDates || []);
    let incomingCOff = parseLeaves(coffLeaveDates || []);

    if (leaveType === 'CL' && date) incomingCL.push({ date, reason: reason || 'CL' });
    if (leaveType === 'EL' && date) incomingEL.push({ date, reason: reason || 'EL' });
    if (leaveType === 'COff' && date) incomingCOff.push({ date, reason: reason || 'COff' });

    const mergeUniqueLeaves = (oldArr, newArr) => {
      const map = new Map();
      oldArr.forEach(item => {
        const d = typeof item === 'string' ? item : item.date;
        const r = typeof item === 'string' ? (reason || 'N/A') : (item.reason || reason || 'N/A');
        if (d) map.set(d, { date: d, reason: r });
      });
      newArr.forEach(item => {
        const d = typeof item === 'string' ? item : item.date;
        const r = typeof item === 'string' ? (reason || 'N/A') : (item.reason || reason || 'N/A');
        if (d) map.set(d, { date: d, reason: r });
      });
      return Array.from(map.values());
    };

    const finalCL = mergeUniqueLeaves(existingCL, incomingCL);
    const finalEL = mergeUniqueLeaves(existingEL, incomingEL);
    const finalCOff = mergeUniqueLeaves(existingCOff, incomingCOff);

    const updatePayload = {
      ...existingRowData,
      ...req.body,
      clLeaveDates: finalCL,
      elLeaveDates: finalEL,
      coffLeaveDates: finalCOff,
      reason: reason || existingRowData.reason || 'N/A'
    };

    const cleanData = sanitizeStaffData(updatePayload, row.get('id'), existingRowData);

    Object.keys(cleanData).forEach(header => {
      if (header !== 'id') {
        row.set(header, String(cleanData[header] ?? ''));
      }
    });

    await row.save();
    res.json({ success: true, message: "✅ रजा अर्ज यशस्वीरित्या सबमिट आणि सेव्ह झाला!" });
  } catch (err) {
    console.error("❌ Leave Application Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};

app.post('/api/leaves', handleApplyLeave);
app.post('/api/court-staff/leaves', handleApplyLeave);

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

// 🌟 1. UPDATE DAILY MANAGE RECORD
app.put('/api/employees/:id/daily-manage/:index', async (req, res) => {
  try {
    const { id, index } = req.params;
    const { date, status, relieverEmpName, relieverEmpRole, remark } = req.body;

    const sheet = await getMasterSheet();
    const rows = await sheet.getRows();

    const row = rows.find(r => String(r.get('id') || '').trim() === String(id).trim());
    if (!row) {
      return res.status(404).json({ success: false, error: "Karmachari sapadla nahi." });
    }

    const existingRowData = row.toObject();
    let currentManageList = parseLeaves(existingRowData.dailyManage);

    const idx = parseInt(index);
    if (idx >= 0 && idx < currentManageList.length) {
      currentManageList[idx] = {
        ...currentManageList[idx],
        date: date || currentManageList[idx].date,
        status: status || currentManageList[idx].status,
        relieverEmpName: relieverEmpName || currentManageList[idx].relieverEmpName,
        relieverEmpRole: relieverEmpRole || currentManageList[idx].relieverEmpRole,
        remark: remark || currentManageList[idx].remark
      };
    } else {
      return res.status(400).json({ success: false, error: "Invalid record index." });
    }

    const updatePayload = {
      ...existingRowData,
      dailyManage: currentManageList
    };

    const cleanData = sanitizeStaffData(updatePayload, row.get('id'), existingRowData);

    Object.keys(cleanData).forEach(header => {
      if (header !== 'id') {
        row.set(header, String(cleanData[header] ?? ''));
      }
    });

    await row.save();
    res.json({ success: true, message: "✅ Record update zala!", dailyManage: currentManageList });
  } catch (err) {
    console.error("❌ Update Daily Manage Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 🌟 2. DELETE DAILY MANAGE RECORD
app.delete('/api/employees/:id/daily-manage/:index', async (req, res) => {
  try {
    const { id, index } = req.params;

    const sheet = await getMasterSheet();
    const rows = await sheet.getRows();

    const row = rows.find(r => String(r.get('id') || '').trim() === String(id).trim());
    if (!row) {
      return res.status(404).json({ success: false, error: "Karmachari sapadla nahi." });
    }

    const existingRowData = row.toObject();
    let currentManageList = parseLeaves(existingRowData.dailyManage);

    const idx = parseInt(index);
    if (idx >= 0 && idx < currentManageList.length) {
      currentManageList.splice(idx, 1); // Array madhun kadhun takne
    } else {
      return res.status(400).json({ success: false, error: "Invalid record index." });
    }

    const updatePayload = {
      ...existingRowData,
      dailyManage: currentManageList
    };

    const cleanData = sanitizeStaffData(updatePayload, row.get('id'), existingRowData);

    Object.keys(cleanData).forEach(header => {
      if (header !== 'id') {
        row.set(header, String(cleanData[header] ?? ''));
      }
    });

    await row.save();
    res.json({ success: true, message: "✅ Record delete zala!", dailyManage: currentManageList });
  } catch (err) {
    console.error("❌ Delete Daily Manage Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
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

// // १. Master Sheet Initialization (इथे 'dob' कॉलम समाविष्ट केला आहे)
// async function getMasterSheet() {
//     await doc.loadInfo();
//     let sheet = doc.sheetsByTitle['court_staff_master'];
    
//     const requiredHeaders = [
//         'id', 'employeeName', 'gender', 'employeeRole', 'designation', 'employeeId', 'underTaluka', 
//         'underOfficeOrCourt', 'roomNumber', 'mobileNo', 'dob', 'status', // 🌟 इथे 'dob' जोडले आहे
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
            
//             if (isMissing || !currentHeaders.includes('dob')) {
//                 console.log("⚠️ Updating headers to include 'dob' and missing fields...");
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
//         console.log("⚠️️ Creating 'court_users' sheet...");
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

// const parseLeaves = (data) => {
//     if (!data) return [];
//     if (Array.isArray(data)) return data;
//     if (typeof data === 'string') {
//         try { return JSON.parse(data); } catch (e) { return []; }
//     }
//     return [];
// };

// // 🛠️ Sanitizer Function (dob सपोर्टसह)
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

//     let leaveCreditsHist = parseLeaves(body.leaveCreditsHistory || existingRowData.leaveCreditsHistory);

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
//         employeeRole: body.employeeRole || body.designation || existingRowData.employeeRole || existingRowData.designation || 'Junior Clerk', 
//         designation: body.designation || body.employeeRole || existingRowData.designation || existingRowData.employeeRole || 'Junior Clerk', 
//         employeeId: body.employeeId || existingRowData.employeeId || '',
//         underTaluka: body.underTaluka || existingRowData.underTaluka || 'Nashik (HQ)',
//         underOfficeOrCourt: body.underOfficeOrCourt || existingRowData.underOfficeOrCourt || '',
//         roomNumber: body.roomNumber || existingRowData.roomNumber || '',
//         mobileNo: body.mobileNo || existingRowData.mobileNo || '',
//         dob: body.dob || body.birthDate || existingRowData.dob || '', // 🌟 जन्मतारीख (DOB) साठवण्यासाठी
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

// // 🌟 युनिफाइड लॉगिन API (Admin आणि Employee दोघांसाठी)
// app.post('/api/auth/login', async (req, res) => {
//   try {
//     const { username, password, loginType } = req.body;

//     // जर युझरने 'employee' लॉगिन निवडले असेल किंवा मोबाईल नंबरने लॉगिन करत असेल
//     if (loginType === 'employee') {
//       const masterSheet = await getMasterSheet();
//       const staffRows = await masterSheet.getRows();

//       // मोबाईल नंबर किंवा कर्मचारी आयडीने कर्मचाऱ्याला शोधा
//       const staffRow = staffRows.find(r => {
//         const mob = String(r.get('mobileNo') || '').trim();
//         const empId = String(r.get('employeeId') || '').trim();
//         return mob === username.trim() || empId.toLowerCase() === username.trim().toLowerCase();
//       });

//       if (!staffRow) {
//         return res.status(401).json({ error: 'कर्मचारी रेकॉर्ड सापडला नाही (चुकीचा मोबाईल नंबर/आयडी).' });
//       }

//       const staffData = staffRow.toObject();
//       const employeeDob = String(staffData.dob || '').trim();

//       // जन्मतारीख (DOB) पासवर्ड म्हणून मॅच करा
//       if (employeeDob === password.trim()) {
//         const token = jwt.sign(
//           { id: staffData.id, role: 'employee', name: staffData.employeeName }, 
//           SECRET_KEY, 
//           { expiresIn: '24h' }
//         );

//         // पार्स करून सर्व डेटा पाठवा जेणेकरून 'View Info' प्रमाणे संपूर्ण माहिती दिसेल
//         staffData.takenLeaves = parseLeaves(staffData.takenLeaves);
//         staffData.clLeaveDates = parseLeaves(staffData.clLeaveDates);
//         staffData.elLeaveDates = parseLeaves(staffData.elLeaveDates);
//         staffData.coffLeaveDates = parseLeaves(staffData.coffLeaveDates);
//         staffData.transferHistory = parseLeaves(staffData.transferHistory);
//         staffData.officersDuration = parseLeaves(staffData.officersDuration);
//         staffData.leaveCreditsHistory = parseLeaves(staffData.leaveCreditsHistory);
//         staffData.role = 'employee';

//         return res.json({ message: 'कर्मचारी लॉगिन यशस्वी!', token, user: staffData });
//       } else {
//         return res.status(401).json({ error: 'चुकीची जन्मतारीख (Invalid Password/DOB).' });
//       }
//     }

//     // मानक ॲडमिन (Admin) लॉगिन
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
//       { id: userData.id, role: userData.employeeRole || 'Admin', name: userData.employeeName }, 
//       SECRET_KEY, 
//       { expiresIn: '24h' }
//     );

//     const { password: _, ...userWithoutPassword } = userData;
//     userWithoutPassword.role = userData.employeeRole || 'Admin';
//     res.json({ message: 'लॉगिन यशस्वी!', token, user: userWithoutPassword });

//   } catch (err) {
//     console.error("Login Error:", err);
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
//       rowData.leaveCreditsHistory = parseLeaves(rowData.leaveCreditsHistory);
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

//     const newCreditEntry = {
//       leaveType: leaveType || 'COff',
//       daysAdded: parseFloat(daysAdded) || 1,
//       date: date || new Date().toISOString().split('T')[0],
//       reason: reason || 'सुट्टीच्या दिवशी काम'
//     };

//     currentHistory.push(newCreditEntry);

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
//       message: "✅ सेवा कालावधी डेटा यशस्वीरीत्या अपडेट झाला!", 
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



// // --- LEAVE MANAGEMENT API ROUTE ---
// const handleApplyLeave = async (req, res) => {
//   try {
//     const { employeeId, leaveType, date, reason, clLeaveDates, elLeaveDates, coffLeaveDates } = req.body;
    
//     const sheet = await getMasterSheet();
//     const rows = await sheet.getRows();
    
//     // employeeId किंवा employeeName ने कर्मचारी शोधा
//     let row = rows.find(r => String(r.get('employeeId') || '').trim() === String(employeeId).trim());
//     if (!row && req.body.employeeName) {
//       row = rows.find(r => String(r.get('employeeName') || '').trim().toLowerCase() === String(req.body.employeeName).trim().toLowerCase());
//     }

//     if (!row) {
//       return res.status(404).json({ success: false, error: "कर्मचारी रेकॉर्ड सापडला नाही." });
//     }

//     const existingRowData = row.toObject();
    
//     // जर फ्रंटएंडवरून थेट ॲरे येत असेल तर तो वापर, अन्यथा जुन्या डेटाबेस डेटासह नवीन तारीख मर्ज करा
//     let updatePayload = {
//       ...existingRowData,
//       reason: reason || 'N/A'
//     };

//     if (leaveType === 'CL' && date) {
//       let currentCL = parseLeaves(existingRowData.clLeaveDates);
//       currentCL.push({ date, reason: reason || 'CL' });
//       updatePayload.clLeaveDates = currentCL;
//     } else if (leaveType === 'EL' && date) {
//       let currentEL = parseLeaves(existingRowData.elLeaveDates);
//       currentEL.push({ date, reason: reason || 'EL' });
//       updatePayload.elLeaveDates = currentEL;
//     } else if (leaveType === 'COff' && date) {
//       let currentCOff = parseLeaves(existingRowData.coffLeaveDates);
//       currentCOff.push({ date, reason: reason || 'COff' });
//       updatePayload.coffLeaveDates = currentCOff;
//     }

//     // जर पूर्ण ॲरे पाठवला असेल तर तो हँडल करा
//     if (clLeaveDates) updatePayload.clLeaveDates = clLeaveDates;
//     if (elLeaveDates) updatePayload.elLeaveDates = elLeaveDates;
//     if (coffLeaveDates) updatePayload.coffLeaveDates = coffLeaveDates;

//     const cleanData = sanitizeStaffData(updatePayload, row.get('id'), existingRowData);

//     Object.keys(cleanData).forEach(header => {
//       if (header !== 'id') {
//         row.set(header, String(cleanData[header] ?? ''));
//       }
//     });

//     await row.save();
//     res.json({ success: true, message: "✅ रजा अर्ज यशस्वीरित्या सबमिट आणि सेव्ह झाला!" });
//   } catch (err) {
//     console.error("❌ Leave Application Error:", err);
//     res.status(500).json({ success: false, error: err.message });
//   }
// };

// app.post('/api/leaves', handleApplyLeave);
// app.post('/api/court-staff/leaves', handleApplyLeave);
