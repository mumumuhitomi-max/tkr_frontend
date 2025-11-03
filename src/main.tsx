import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'   // 这行必须存在

console.log('MAIN LOADED')  // 方便在 Console 验证入口已加载

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
