// src/utils/dataProcessor.js

export const processHistoricalDataForLineChart = (historicalData, deviceId = null) => {
    const allRecords = [];
    console.log("Dados Brutos Recebidos do Backend:", historicalData); // DEBUG

    if (!Array.isArray(historicalData) || historicalData.length === 0) return [];

    historicalData.forEach(h => {
        try {
            // O campo records no Postgres pode vir como string ou objeto dependendo do driver
            let recordsArray = h.records;

            if (typeof h.records === 'string') {
                // Remove aspas simples se existirem (comum no ADF) e faz parse
                const cleanedJson = h.records.replace(/'/g, '"');
                recordsArray = JSON.parse(cleanedJson);
            }

            if (Array.isArray(recordsArray)) {
                recordsArray.forEach(r => {
                    // Cada item do array também pode vir como string JSON
                    const parsed = typeof r === 'string' ? JSON.parse(r) : r;

                    // Normalização: aceita 'kwh', 'kWh' ou 'value'
                    const energy = parsed.kwh || parsed.kWh || parsed.value;
                    const time = parsed.timestamp || parsed.date;

                    if (time && energy !== undefined) {
                        allRecords.push({
                            timestamp: new Date(time).toLocaleString('pt-PT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }),
                            kwh: parseFloat(energy),
                            deviceId: h.deviceId,
                            rawDate: new Date(time)
                        });
                    }
                });
            }
        } catch (e) {
            console.error("Erro ao processar campo 'records':", e, h.records);
        }
    });

    console.log("Registos Processados para o Gráfico:", allRecords); // DEBUG
    return allRecords.sort((a, b) => a.rawDate - b.rawDate);
};

export const processHistoricalDataForBarChart = (historicalData) => {
    const totals = {};
    if (!Array.isArray(historicalData)) return [];

    historicalData.forEach(h => {
        try {
            let recordsArray = typeof h.records === 'string' ? JSON.parse(h.records.replace(/'/g, '"')) : h.records;
            if (Array.isArray(recordsArray)) {
                recordsArray.forEach(r => {
                    const parsed = typeof r === 'string' ? JSON.parse(r) : r;
                    const val = parseFloat(parsed.kwh || parsed.kWh || 0);
                    totals[h.deviceId] = (totals[h.deviceId] || 0) + val;
                });
            }
        } catch (e) {}
    });

    return Object.keys(totals).map(id => ({
        name: id,
        kwhTotal: parseFloat(totals[id].toFixed(2))
    }));
};

export const processLatestDataForTable = (latestData) => {
    if (!latestData) return [];
    const dataArray = Array.isArray(latestData) ? latestData : [latestData];

    return dataArray.map(d => ({
        id: d.deviceId,
        deviceId: d.deviceId,
        generationTimestamp: new Date(d.generationTimestamp).toLocaleString('pt-PT'),
        historicalFileName: d.historicalFileName
    }));
};
export const processHistoricalDataForAverages = (historicalData) => {
    const deviceStats = {};

    if (!Array.isArray(historicalData)) return [];

    historicalData.forEach(h => {
        try {
            const recordsArray = typeof h.records === 'string' ? JSON.parse(h.records.replace(/'/g, '"')) : h.records;

            if (Array.isArray(recordsArray)) {
                if (!deviceStats[h.deviceId]) {
                    deviceStats[h.deviceId] = { totalKwh: 0, count: 0 };
                }

                recordsArray.forEach(r => {
                    const parsed = typeof r === 'string' ? JSON.parse(r) : r;
                    const val = parseFloat(parsed.kwh || parsed.kWh || 0);
                    deviceStats[h.deviceId].totalKwh += val;
                    deviceStats[h.deviceId].count += 1;
                });
            }
        } catch (e) {
            console.error("Erro ao calcular médias:", e);
        }
    });

    return Object.keys(deviceStats).map(id => ({
        name: id,
        mediaKwh: parseFloat((deviceStats[id].totalKwh / deviceStats[id].count).toFixed(4)),
        totalRegistos: deviceStats[id].count
    }));
};