import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import TableGuard from './components/TableGuard';
import TableEntry from './pages/TableEntry';
import Menu from './pages/Menu';
import Cart from './pages/Cart';
import Receipt from './pages/Receipt';
import Kitchen from './pages/Kitchen';
import Admin from './pages/Admin';
import QrManager from './pages/admin/QrManager';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/table/:tableId" element={<TableEntry />} />
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
        <Route path="/kitchen" element={<Kitchen />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/admin/qr" element={<QrManager />} />
      </Routes>
    </Router>
  );
}

export default App;
