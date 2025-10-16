import { Routes, Route, Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import Header from './components/Header'
import Dashboard from './pages/Dashboard'
import Upload from './pages/Upload'
import Review from './pages/Review'
import History from './pages/History'
import Settings from './pages/Settings'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Subscribe from './pages/Subscribe'
import { useDocStore } from './store/docStore'

function App() {
  const startSSE = useDocStore(s => s.startSSE)
  const loadDocuments = useDocStore(s => s.loadDocuments)

  useEffect(() => {
    startSSE()
    loadDocuments()
  }, [startSSE, loadDocuments])
  return (
    <div>
      <Header />
      <div style={{ padding: 16 }}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/upload" element={<Upload />} />
          <Route path="/review/:id" element={<Review />} />
          <Route path="/history" element={<History />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/subscribe" element={<Subscribe />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </div>
  )
}

export default App
