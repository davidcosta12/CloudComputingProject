import React, { useEffect, useState } from 'react';
import { useAuth } from 'react-oidc-context';
import {
    processLatestDataForTable,
    processHistoricalDataForLineChart,
    processHistoricalDataForBarChart,
    processHistoricalDataForAverages
} from '../utils/dataProcessor';

import LatestDataTable from './LatestDataTable';
import LinearChartComponent from './LinearChartComponent';
import BarChartComponent from './BarChartComponent';

const API_BASE_URL = window.location.hostname === "localhost"
    ? "http://localhost:8080"
    : process.env.REACT_APP_API_URL;

console.log("Fetching data from:", `${API_BASE_URL}/api/dashboard-data`);

const Dashboard = () => {
    const auth = useAuth();
    const [latestData, setLatestData] = useState([]);
    const [historicalLineChartData, setHistoricalLineChartData] = useState([]);
    const [barChartData, setBarChartData] = useState([]);
    const [avgData, setAvgData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [userRole, setUserRole] = useState('user');

    // --- FUNÇÃO DE LOGOUT CORRIGIDA ---
    const handleLogout = () => {
        // 1. Limpa o utilizador do estado local imediatamente
        auth.removeUser();

        // 2. Redireciona para o endpoint de logout do Cognito
        // Garante que este URL é EXATAMENTE igual ao que tens na consola AWS
        auth.signoutRedirect({
            post_logout_redirect_uri: "http://localhost:3000"
        });
    };

    useEffect(() => {
        const fetchDashboardData = async () => {
            if (!auth.isAuthenticated) return;
            const token = auth.user?.id_token;

            try {
               const response = await fetch(`${API_BASE_URL}/api/dashboard-data`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });

                if (!response.ok) throw new Error(`Erro HTTP: ${response.status}`);

                const data = await response.json();
                setUserRole(data.role);

                if (data.latest) {
                    const latestArray = Array.isArray(data.latest) ? data.latest : [data.latest];
                    setLatestData(processLatestDataForTable(latestArray));
                }

                if (data.historical) {
                    const deviceIdFilter = data.role === 'user' ? data.device_id : null;
                    setHistoricalLineChartData(processHistoricalDataForLineChart(data.historical, deviceIdFilter));
                    setBarChartData(processHistoricalDataForBarChart(data.historical));
                    setAvgData(processHistoricalDataForAverages(data.historical));
                }

            } catch (e) {
                console.error("Erro ao carregar dados:", e);
                setError("Não foi possível ligar à base de dados.");
            } finally {
                setLoading(false);
            }
        };

        if (!auth.isLoading) fetchDashboardData();
    }, [auth.isAuthenticated, auth.isLoading, auth.user]);

    if (auth.isLoading) return <div style={{ padding: '20px' }}>A verificar credenciais AWS...</div>;
    if (!auth.isAuthenticated) return <div style={{ padding: '20px' }}>Acesso Negado. Faça Login.</div>;
    if (error) return <div style={{ padding: '20px', color: 'red' }}>{error}</div>;

    return (
        <div style={{ padding: '30px', backgroundColor: '#f9f9f9', minHeight: '100vh' }}>
            <header style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '30px', alignItems: 'center' }}>
                <h1>Energy Analytics Dashboard</h1>
                {/* BOTÃO DE LOGOUT ATUALIZADO */}
                <button
                    onClick={handleLogout}
                    style={{
                        backgroundColor: '#ff4d4d',
                        color: 'white',
                        border: 'none',
                        padding: '10px 20px',
                        borderRadius: '5px',
                        cursor: 'pointer',
                        fontWeight: 'bold'
                    }}
                >
                    Sair
                </button>
            </header>

            <section style={{ marginBottom: '40px' }}>
                <LatestDataTable data={latestData} />
            </section>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))', gap: '25px' }}>
                <div style={{ background: '#fff', padding: '20px', borderRadius: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                    <LinearChartComponent data={historicalLineChartData} title="Tendência de Consumo Temporal (kWh)" />
                </div>

                <div style={{ background: '#fff', padding: '20px', borderRadius: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                    <BarChartComponent data={barChartData} title={userRole === 'admin' ? "Total kWh por Dispositivo" : "O Seu Consumo Acumulado"} />
                </div>

                <div style={{ background: '#fff', padding: '20px', borderRadius: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                    <BarChartComponent data={avgData.map(d => ({ name: d.name, kwhTotal: d.mediaKwh }))} title="Consumo Médio por Leitura (kWh)" />
                </div>

                <div style={{ background: '#fff', padding: '20px', borderRadius: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                    <BarChartComponent data={avgData.map(d => ({ name: d.name, kwhTotal: d.totalRegistos }))} title="Nº Total de Registos Processados" />
                </div>
            </div>
        </div>
    );
};

export default Dashboard;