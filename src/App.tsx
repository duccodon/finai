import './App.css'
import CryptoChart from './components/chart/CryptoChart'
import Layout from "@/layouts/mainLayout"
import ChatPanel from "@/components/chat/ChatPanel"

function App() {
  return (
      <Layout>
        <CryptoChart />
        <ChatPanel />
      </Layout>
  )
}

export default App
