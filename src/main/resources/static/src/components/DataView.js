import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

// Certifique-se de que a porta 8080 é onde o Spring Boot está a correr
const BASE_URL = process.env.REACT_APP_API_URL;

const DataView = () => {
    const [data, setData] = useState([]);
    const [profile, setProfile] = useState(null);
    const { token, logout } = useAuth();

    const fetchData = async () => {
        try {
            // Chamada para o novo endpoint de dados protegidos
            const response = await fetch(`${BASE_URL}/data`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                const result = await response.json();
                // O Spring Boot devolve um objeto com { role, device_id, data }
                setData(result.data || []);
                setProfile({ role: result.role, deviceId: result.device_id });

            } else if (response.status === 401 || response.status === 403) {
                console.warn("Acesso negado ou token expirado.");
                logout();
            }
        } catch (err) {
            console.error("Erro ao buscar dados do Spring Boot:", err);
        }
    };

    useEffect(() => {
        if (token) fetchData();
    }, [token]);

    return (
        <section>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2>Área de Dados</h2>
                <div>
                    {profile && (
                        <span style={{ marginRight: '15px', fontSize: '0.9em', color: '#666' }}>
                            Logado como: <strong>{profile.role}</strong>
                            {profile.deviceId && ` (Device: ${profile.deviceId})`}
                        </span>
                    )}
                    <button onClick={logout}>Logout</button>
                </div>
            </div>

            <hr />

            {/* Tabela de Dados filtrados pelo Backend */}
            <table>
                <thead>
                    <tr>
                        <th>Device ID</th>
                        <th>Valor / Status</th>
                    </tr>
                </thead>
                <tbody>
                    {data.length > 0 ? (
                        data.map((item, index) => (
                            <tr key={index}>
                                <td>{item.device_id}</td>
                                <td>{item.value || item.status || 'N/A'}</td>
                            </tr>
                        ))
                    ) : (
                        <tr><td colSpan="2">Nenhum dado disponível para o seu perfil.</td></tr>
                    )}
                </tbody>
            </table>
        </section>
    );
};

export default DataView;