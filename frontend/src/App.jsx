import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/layout/Layout'
import Dashboard from './pages/Dashboard'
import NoteView from './pages/NoteView'
import StudyMode from './pages/StudyMode'
import QuizPage from './pages/QuizPage'
import QuizHubPage from './pages/QuizHubPage'
import SummaryPage from './pages/SummaryPage'
import Login from './pages/Login'
import GroupsPage from './pages/GroupsPage'
import SettingsPage from './pages/SettingsPage'
import NotesPage from './pages/NotesPage'
import ThemeSync from './components/theme/ThemeSync'

function App() {
  return (
    <BrowserRouter>
      <ThemeSync />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="notes" element={<NotesPage />} />
          <Route path="summary" element={<SummaryPage />} />
          <Route path="quiz" element={<QuizHubPage />} />
          <Route path="note/:id" element={<NoteView />} />
          <Route path="note/:id/study" element={<StudyMode />} />
          <Route path="note/:id/quiz" element={<QuizPage />} />
          <Route path="groups" element={<GroupsPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
