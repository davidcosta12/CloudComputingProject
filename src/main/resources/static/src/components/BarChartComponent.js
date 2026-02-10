// src/components/BarChartComponent.jsx
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const BarChartComponent = ({ data, title }) => {
    if (!data || data.length === 0) {
        return <p>Sem dados históricos para o gráfico de barras.</p>;
    }

    return (
        <div className="chart-container">
            <h3>{title}</h3>
            <ResponsiveContainer width="100%" height={400}>
                <BarChart
                    data={data}
                    margin={{
                        top: 20,
                        right: 30,
                        left: 20,
                        bottom: 5,
                    }}
                >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis label={{ value: 'Total kWh', angle: -90, position: 'insideLeft' }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="kwhTotal" fill="#8884d8" name="Total de Consumo (kWh)" />
                </BarChart>
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

export default BarChartComponent;