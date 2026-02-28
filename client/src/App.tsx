import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Menu from './pages/Menu';
import Cart from './pages/Cart';
import Kitchen from './pages/Kitchen';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Menu />} />
          <Route path="cart" element={<Cart />} />
        </Route>
        <Route path="/kitchen" element={<Kitchen />} />
      </Routes>
    </Router>
  );
}

export default App;
