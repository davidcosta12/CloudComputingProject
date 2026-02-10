
import React from 'react';

const LatestDataTable = ({ data }) => {
    if (!data || data.length === 0) {
        return <p>Sem dados mais recentes para mostrar.</p>;
    }

    return (
        <div className="table-container">
            <h3>Estado Mais Recente dos Dispositivos</h3>
            <table>
                <thead>
                    <tr>
                        <th>Device ID</th>
                        <th>Último Registo</th>
                        <th>Ficheiro Histórico</th>
                    </tr>
                </thead>
                <tbody>
                    {data.map((item) => (
                        <tr key={item.id}>
                            <td>{item.deviceId}</td>
                            <td>{item.generationTimestamp}</td>
                            <td>{item.historicalFileName}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
            <style jsx>{`
                .table-container {
                    margin-bottom: 30px;
                    background: #fff;
                    padding: 20px;
                    border-radius: 8px;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.05);
                }
                table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-top: 15px;
                }
                th, td {
                    border: 1px solid #ddd;
                    padding: 8px;
                    text-align: left;
                }
                th {
                    background-color: #f2f2f2;
                }
            `}</style>
        </div>
    );
};

export default LatestDataTable;