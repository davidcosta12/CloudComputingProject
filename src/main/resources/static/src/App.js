// src/App.js (Exemplo simples)
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import Dashboard from './components/Dashboard';
// Assumindo que tens um componente Login
import Login from './components/Login'; // Cria este se ainda não tiveres

function App() {
    return (
        <Router>
            <nav style={{ padding: '10px', background: '#f0f0f0' }}>
                <Link to="/">Dashboard</Link> | <Link to="/login">Login</Link>
            </nav>
            <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/login" element={<Login />} />
                {/* ... outras rotas ... */}
            </Routes>
        </Router>
    );
}

export default App;