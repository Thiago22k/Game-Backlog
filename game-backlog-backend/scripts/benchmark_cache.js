const axios = require('axios');

async function benchmark() {
    const baseUrl = 'http://localhost:3000/api/games';
    const testGameSlug = 'ghost-town--4'; // O cualquier otro slug válido en tu DB/IGDB

    console.log('🚀 Iniciando Benchmark de Performance...');

    try {
        // 1. Primera consulta (Cache Miss / Primera vez)
        console.log(`\n📡 Consulta 1 (Cache Miss - Debería ir a IGDB):`);
        const start1 = Date.now();
        await axios.get(`${baseUrl}/igdb/${testGameSlug}`);
        const end1 = Date.now();
        console.log(`⏱️ Tiempo: ${end1 - start1}ms`);

        // 2. Segunda consulta (Cache Hit - Debería venir de la DB)
        console.log(`\n📦 Consulta 2 (Cache Hit - Debería venir de PostgreSQL):`);
        const start2 = Date.now();
        await axios.get(`${baseUrl}/igdb/${testGameSlug}`);
        const end2 = Date.now();
        console.log(`⏱️ Tiempo: ${end2 - start2}ms`);

        // 3. Resultados
        const speedup = (end1 - start1) / (end2 - start2);
        console.log(`\n✅ Mejora de rendimiento: ${speedup.toFixed(2)}x más rápido`);

    } catch (error) {
        console.error('\n❌ Error en el benchmark:', error.message);
        if (error.response) {
            console.error('Data:', error.response.data);
        }
    }
}

benchmark();
