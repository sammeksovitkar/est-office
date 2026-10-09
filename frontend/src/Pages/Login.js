import React, { useState } from 'react';
import { Gavel, Lock, User, ShieldCheck, Eye, EyeOff, Calendar } from 'lucide-react';

const Login = ({ onLoginSuccess }) => {
  const [loginType, setLoginType] = useState('admin'); 
  const [creds, setCreds] = useState({ user: '', pass: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://172.16.171.96:5000/api';

  const handleLogin = async (e) => {
    e.preventDefault();
    
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: creds.user,
          password: creds.pass,
          loginType: loginType 
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // लोकल स्टोरेजमध्ये युजरचा डेटा आणि रोल अचूक सेव्ह करणे
        localStorage.setItem('isAuthenticated', 'true');
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        localStorage.setItem('userRole', data.user.role || loginType);
        
        if (onLoginSuccess) {
          onLoginSuccess(data.user);
        }
      } else {
        alert(data.error || "अवैध क्रेडेंशियल! कृपया तपासा.");
      }
    } catch (err) {
      console.error("Login Network Error:", err);
      alert("सर्व्हरशी कनेक्ट करताना एरर आला. कृपया बॅकएंड सर्व्हर सुरू आहे का तपासा.");
    }
  };

  return (
    <div style={loginStyles.container}>
      <div style={loginStyles.card}>
        <div style={loginStyles.header}>
          <div style={loginStyles.iconCircle}>
            <Gavel size={32} color="#2dd4bf" />
          </div>
          <h2 style={loginStyles.title}>जिल्हा व सत्र न्यायालय</h2>
          <p style={loginStyles.subtitle}>District & Sessions Court, Asthapana</p>
        </div>

        <div style={loginStyles.tabContainer}>
          <button 
            type="button"
            style={{
              ...loginStyles.tabBtn,
              background: loginType === 'admin' ? '#2c3e50' : '#f1f5f9',
              color: loginType === 'admin' ? '#fff' : '#64748b'
            }}
            onClick={() => { setLoginType('admin'); setCreds({ user: '', pass: '' }); }}
          >
            Admin Login
          </button>
          <button 
            type="button"
            style={{
              ...loginStyles.tabBtn,
              background: loginType === 'employee' ? '#2c3e50' : '#f1f5f9',
              color: loginType === 'employee' ? '#fff' : '#64748b'
            }}
            onClick={() => { setLoginType('employee'); setCreds({ user: '', pass: '' }); }}
          >
            Employee Login
          </button>
        </div>

        <form onSubmit={handleLogin} style={loginStyles.form}>
          <div style={loginStyles.inputGroup}>
            <label style={loginStyles.label}>
              {loginType === 'admin' ? 'Username' : 'Mobile Number / Employee ID'}
            </label>
            <div style={loginStyles.inputWrapper}>
              <User size={18} style={loginStyles.fieldIcon} />
              <input 
                type={loginType === 'employee' ? 'tel' : 'text'} 
                placeholder={loginType === 'admin' ? 'Enter Username' : 'Enter Mobile Number'} 
                value={creds.user} 
                onChange={e => setCreds({...creds, user: e.target.value})} 
                style={loginStyles.input} 
                required
              />
            </div>
          </div>

          <div style={loginStyles.inputGroup}>
            <label style={loginStyles.label}>
              {loginType === 'admin' ? 'Password' : 'Date of Birth (Password) [YYYY-MM-DD]'}
            </label>
            <div style={loginStyles.inputWrapper}>
              {loginType === 'admin' ? <Lock size={18} style={loginStyles.fieldIcon} /> : <Calendar size={18} style={loginStyles.fieldIcon} />}
              <input 
                type={loginType === 'admin' && !showPassword ? "password" : "text"} 
                placeholder={loginType === 'admin' ? 'Enter Password' : 'e.g. 1995-08-15'} 
                value={creds.pass} 
                onChange={e => setCreds({...creds, pass: e.target.value})} 
                style={loginStyles.input} 
                required
              />
              {loginType === 'admin' && (
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={loginStyles.eyeBtn}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              )}
            </div>
          </div>

          <button 
            type="submit" 
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            style={{
              ...loginStyles.button,
              backgroundColor: isHovered ? '#1e293b' : '#2c3e50',
              transform: isHovered ? 'translateY(-2px)' : 'translateY(0)'
            }}
          >
            <ShieldCheck size={20} style={{marginRight: '8px'}} />
            {loginType === 'admin' ? 'Admin Login' : 'Employee Login'}
          </button>
        </form>

        <div style={loginStyles.footer}>
          <p>© 2026 e-Court Digital Portal</p>
        </div>
      </div>
    </div>
  );
};

const loginStyles = {
  container: { height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)', fontFamily: "'Segoe UI', Roboto, sans-serif" },
  card: { padding: '40px', background: 'rgba(255, 255, 255, 0.95)', borderRadius: '20px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)', width: '420px', border: '1px solid #fff' },
  header: { textAlign: 'center', marginBottom: '20px' },
  iconCircle: { width: '60px', height: '60px', background: '#f1f5f9', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center', margin: '0 auto 15px auto' },
  title: { fontSize: '22px', color: '#1e293b', margin: '0', fontWeight: '700' },
  subtitle: { fontSize: '14px', color: '#64748b', margin: '5px 0 0 0' },
  tabContainer: { display: 'flex', marginBottom: '20px', background: '#f1f5f9', borderRadius: '8px', padding: '4px' },
  tabBtn: { flex: 1, padding: '10px', border: 'none', borderRadius: '6px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s' },
  form: { display: 'flex', flexDirection: 'column', gap: '20px' },
  inputGroup: { display: 'flex', flexDirection: 'column', gap: '8px' },
  label: { fontSize: '13px', fontWeight: '600', color: '#475569', marginLeft: '4px' },
  inputWrapper: { position: 'relative', display: 'flex', alignItems: 'center' },
  fieldIcon: { position: 'absolute', left: '12px', color: '#94a3b8' },
  eyeBtn: { position: 'absolute', right: '12px', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex', alignItems: 'center' },
  input: { width: '100%', padding: '12px 40px 12px 40px', border: '1.5px solid #e2e8f0', borderRadius: '10px', fontSize: '15px', outline: 'none', backgroundColor: '#f8fafc' },
  button: { width: '100%', padding: '14px', color: 'white', border: 'none', cursor: 'pointer', borderRadius: '10px', fontSize: '16px', fontWeight: '600', display: 'flex', justifyContent: 'center', alignItems: 'center', transition: 'all 0.3s ease' },
  footer: { marginTop: '25px', textAlign: 'center', fontSize: '12px', color: '#94a3b8' }
};

export default Login;
// import React, { useState } from 'react';
// import { useNavigate } from 'react-router-dom';
// import { Gavel, Lock, User, ShieldCheck, Eye, EyeOff } from 'lucide-react';

// const Login = ({ onLoginSuccess }) => {  // <--- इथे prop स्वीकारली
//   const [creds, setCreds] = useState({ user: '', pass: '' });
//   const [showPassword, setShowPassword] = useState(false);
//   const [isHovered, setIsHovered] = useState(false);
//   const navigate = useNavigate();
// const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://172.16.171.96:5000/api';
//   const handleLogin = async (e) => {
//     e.preventDefault();
    
//     try {
//       const response = await fetch(`${API_BASE_URL}/auth/login`, {
//         method: 'POST',
//         headers: {
//           'Content-Type': 'application/json',
//         },
//         body: JSON.stringify({
//           username: creds.user,
//           password: creds.pass
//         }),
//       });

//       const data = await response.json();

//       if (response.ok) {
//         localStorage.setItem('isAuthenticated', 'true');
//         localStorage.setItem('token', data.token);
//         localStorage.setItem('user', JSON.stringify(data.user));
        
//         // जर App.js मधील onLoginSuccess उपलब्ध असेल तर स्टेट अपडेट करा
//         if (onLoginSuccess) {
//           onLoginSuccess(data.user);
//         }
        
//         navigate('/dashboard', { replace: true });
//       } else {
//         alert(data.error || "अवैध क्रेडेंशियल! (Invalid Credentials)");
//       }
//     } catch (err) {
//       console.error("Login Network Error:", err);
//       alert("सर्व्हरशी कनेक्ट करताना एरर आला. कृपया बॅकएंड सर्व्हर सुरू आहे का तपासा.");
//     }
//   };

//   return (
//     <div style={loginStyles.container}>
//       <div style={loginStyles.card}>
//         <div style={loginStyles.header}>
//           <div style={loginStyles.iconCircle}>
//             <Gavel size={32} color="#2dd4bf" />
//           </div>
//           <h2 style={loginStyles.title}>जिल्हा व सत्र न्यायालय</h2>
//           <p style={loginStyles.subtitle}>District & Sessions Court, Asthapana</p>
//         </div>

//         <form onSubmit={handleLogin} style={loginStyles.form}>
//           {/* USERNAME INPUT */}
//           <div style={loginStyles.inputGroup}>
//             <label style={loginStyles.label}>Username</label>
//             <div style={loginStyles.inputWrapper}>
//               <User size={18} style={loginStyles.fieldIcon} />
//               <input 
//                 type="text" 
//                 placeholder="Enter Username" 
//                 value={creds.user} 
//                 onChange={e => setCreds({...creds, user: e.target.value})} 
//                 style={loginStyles.input} 
//                 required
//               />
//             </div>
//           </div>

//           {/* PASSWORD INPUT */}
//           <div style={loginStyles.inputGroup}>
//             <label style={loginStyles.label}>Password</label>
//             <div style={loginStyles.inputWrapper}>
//               <Lock size={18} style={loginStyles.fieldIcon} />
//               <input 
//                 type={showPassword ? "text" : "password"} 
//                 placeholder="Enter Password" 
//                 value={creds.pass} 
//                 onChange={e => setCreds({...creds, pass: e.target.value})} 
//                 style={loginStyles.input} 
//                 required
//               />
//               <button 
//                 type="button"
//                 onClick={() => setShowPassword(!showPassword)}
//                 style={loginStyles.eyeBtn}
//               >
//                 {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
//               </button>
//             </div>
//           </div>

//           <button 
//             type="submit" 
//             onMouseEnter={() => setIsHovered(true)}
//             onMouseLeave={() => setIsHovered(false)}
//             style={{
//               ...loginStyles.button,
//               backgroundColor: isHovered ? '#1e293b' : '#2c3e50',
//               transform: isHovered ? 'translateY(-2px)' : 'translateY(0)'
//             }}
//           >
//             <ShieldCheck size={20} style={{marginRight: '8px'}} />
//             लॉगिन करा (Login)
//           </button>
//         </form>

//         <div style={loginStyles.footer}>
//           <p>© 2026 e-Court Digital Portal</p>
//         </div>
//       </div>
//     </div>
//   );
// };

// const loginStyles = {
//   container: { height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)', fontFamily: "'Segoe UI', Roboto, sans-serif" },
//   card: { padding: '40px', background: 'rgba(255, 255, 255, 0.95)', borderRadius: '20px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)', width: '400px', border: '1px solid #fff' },
//   header: { textAlign: 'center', marginBottom: '30px' },
//   iconCircle: { width: '60px', height: '60px', background: '#f1f5f9', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center', margin: '0 auto 15px auto' },
//   title: { fontSize: '22px', color: '#1e293b', margin: '0', fontWeight: '700' },
//   subtitle: { fontSize: '14px', color: '#64748b', margin: '5px 0 0 0' },
//   form: { display: 'flex', flexDirection: 'column', gap: '20px' },
//   inputGroup: { display: 'flex', flexDirection: 'column', gap: '8px' },
//   label: { fontSize: '13px', fontWeight: '600', color: '#475569', marginLeft: '4px' },
//   inputWrapper: { position: 'relative', display: 'flex', alignItems: 'center' },
//   fieldIcon: { position: 'absolute', left: '12px', color: '#94a3b8' },
//   eyeBtn: { position: 'absolute', right: '12px', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex', alignItems: 'center' },
//   input: { width: '100%', padding: '12px 40px 12px 40px', border: '1.5px solid #e2e8f0', borderRadius: '10px', fontSize: '15px', outline: 'none', backgroundColor: '#f8fafc' },
//   button: { width: '100%', padding: '14px', color: 'white', border: 'none', cursor: 'pointer', borderRadius: '10px', fontSize: '16px', fontWeight: '600', display: 'flex', justifyContent: 'center', alignItems: 'center', transition: 'all 0.3s ease' },
//   footer: { marginTop: '30px', textAlign: 'center', fontSize: '12px', color: '#94a3b8' }
// };

// export default Login;
