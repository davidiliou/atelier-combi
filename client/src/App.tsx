import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { CombinationList } from './pages/CombinationList'
import { CombinationEditor } from './pages/CombinationEditor'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<CombinationList />} />
        <Route path="/combinations/:id" element={<CombinationEditor />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
