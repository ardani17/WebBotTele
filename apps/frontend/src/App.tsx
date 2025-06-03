import { Routes, Route } from 'react-router-dom'
import { Layout } from '@/components/Layout'
import { Dashboard } from '@/pages/Dashboard'
import { Users } from '@/pages/Users'
import { BotSettings } from '@/pages/BotSettings'
import BotFeatures from './pages/BotFeatures'
import { Login } from '@/pages/Login'
import { useAuthStore } from '@/store/authStore'

function App() {
  const { isAuthenticated } = useAuthStore()

  if (!isAuthenticated) {
    return <Login />
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/users" element={<Users />} />
        <Route path="/bot-settings" element={<BotSettings />} />
        <Route path="/bot-features" element={<BotFeatures />} />
      </Routes>
    </Layout>
  )
}

export default App
