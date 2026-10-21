import { Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';

import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import NewRequest from './pages/NewRequest';
import MyRequests from './pages/MyRequests';
import MyAttendance from './pages/MyAttendance';
import Approvals from './pages/Approvals';
import AllRequests from './pages/AllRequests';
import MarkAttendance from './pages/MarkAttendance';
import Reports from './pages/Reports';
import People from './pages/People';
import Classes from './pages/Classes';
import Audit from './pages/Audit';
import Notifications from './pages/Notifications';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />

        <Route
          path="new-request"
          element={
            <ProtectedRoute roles={['student']}>
              <NewRequest />
            </ProtectedRoute>
          }
        />
        <Route
          path="my-requests"
          element={
            <ProtectedRoute roles={['student']}>
              <MyRequests />
            </ProtectedRoute>
          }
        />
        <Route
          path="my-attendance"
          element={
            <ProtectedRoute roles={['student']}>
              <MyAttendance />
            </ProtectedRoute>
          }
        />

        <Route
          path="approvals"
          element={
            <ProtectedRoute roles={['tutor', 'hod']}>
              <Approvals />
            </ProtectedRoute>
          }
        />
        <Route
          path="requests"
          element={
            <ProtectedRoute roles={['tutor', 'hod', 'admin']}>
              <AllRequests />
            </ProtectedRoute>
          }
        />
        <Route
          path="attendance"
          element={
            <ProtectedRoute roles={['tutor', 'hod', 'admin']}>
              <MarkAttendance />
            </ProtectedRoute>
          }
        />
        <Route
          path="reports"
          element={
            <ProtectedRoute roles={['tutor', 'hod', 'admin']}>
              <Reports />
            </ProtectedRoute>
          }
        />
        <Route
          path="people"
          element={
            <ProtectedRoute roles={['admin']}>
              <People />
            </ProtectedRoute>
          }
        />
        <Route
          path="classes"
          element={
            <ProtectedRoute roles={['admin']}>
              <Classes />
            </ProtectedRoute>
          }
        />
        <Route
          path="audit"
          element={
            <ProtectedRoute roles={['admin']}>
              <Audit />
            </ProtectedRoute>
          }
        />
        <Route path="notifications" element={<Notifications />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
