// src/components/LineChartComponent.jsx
import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const LineChartComponent = ({ data, title }) => {
    if (!data || data.length === 0) {
        return <p>Sem dados históricos para o gráfico de linha.</p>;
    }

    // Se o user for admin, pode haver várias linhas (uma por dispositivo)
    const deviceIds = [...new Set(data.map(item => item.deviceId))];
    const colors = ['#8884d8', '#82ca9d', '#ffc658', '#d0ed57', '#a4de6c', '#83a6ed', '#8dd1e1']; // Cores para as linhas

    return (
        <div className="chart-container">
            <h3>{title}</h3>
            <ResponsiveContainer width="100%" height={400}>
                <LineChart
                    data={data}
                    margin={{
                        top: 5,
                        right: 30,
                        left: 20,
                        bottom: 5,
                    }}
                >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="timestamp" />
                    <YAxis label={{ value: 'kWh', angle: -90, position: 'insideLeft' }} />
                    <Tooltip />
                    <Legend />
                    {deviceIds.map((id, index) => (
                        <Line
                            key={id}
                            type="monotone"
                            dataKey="kwh"
                            stroke={colors[index % colors.length]}
                            name={`Dispositivo ${id}`}
                            connectNulls
                            // Filtrar os dados para cada linha
                            data={data.filter(item => item.deviceId === id)}
                        />
                    ))}
                </LineChart>
            </ResponsiveContainer>
            <style jsx>{`
                .chart-container {
                    margin-bottom: 30px;
                    background: #fff;
                    padding: 20px;
                    border-radius: 8px;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.05);
                }
            `}</style>
        </div>
    );
};

export default LineChartComponent;