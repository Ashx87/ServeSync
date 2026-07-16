import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import TableGuard from './components/TableGuard';
import RequireStaff from './components/RequireStaff';
import TableEntry from './pages/TableEntry';
import Menu from './pages/Menu';
import Cart from './pages/Cart';
import Receipt from './pages/Receipt';
import Kitchen from './pages/Kitchen';
import Admin from './pages/Admin';
import QrManager from './pages/admin/QrManager';
import MenuManager from './pages/admin/MenuManager';
import StaffLogin from './pages/StaffLogin';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/table/:tableId" element={<TableEntry />} />
        <Route path="/login" element={<StaffLogin />} />
        <Route
          path="/"
          element={
            <TableGuard>
              <Layout />
            </TableGuard>
          }
        >
          <Route index element={<Menu />} />
          <Route path="cart" element={<Cart />} />
          <Route path="receipt/:orderId" element={<Receipt />} />
        </Route>
        <Route
          path="/kitchen"
          element={
            <RequireStaff roles={['ADMIN', 'KITCHEN']}>
              <Kitchen />
            </RequireStaff>
          }
        />
        <Route
          path="/admin"
          element={
            <RequireStaff roles={['ADMIN']}>
              <Admin />
            </RequireStaff>
          }
        />
        <Route
          path="/admin/qr"
          element={
            <RequireStaff roles={['ADMIN']}>
              <QrManager />
            </RequireStaff>
          }
        />
        <Route
          path="/admin/menu"
          element={
            <RequireStaff roles={['ADMIN']}>
              <MenuManager />
            </RequireStaff>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
