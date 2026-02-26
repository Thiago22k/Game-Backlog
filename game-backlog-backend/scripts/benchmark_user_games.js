const axios = require('axios');

async function benchmarkUserGames() {
    const username = 'Thiagok';
    const baseUrl = `http://localhost:3000/api/games/user/${username}`;

    console.log(`🚀 Iniciando Benchmark de Lote (Batch) para el perfil: ${username}...`);

    try {
        // 1. Primera consulta (Posible Cache Miss parcial o total)
        console.log(`\n📡 Consulta 1 (Poblando Cache si es necesario...):`);
        const start1 = Date.now();
        const res1 = await axios.get(baseUrl);
        const end1 = Date.now();
        const gameCount = res1.data.games ? res1.data.games.length : 0;
        console.log(`⏱️ Tiempo: ${end1 - start1}ms`);
        console.log(`🎮 Juegos encontrados: ${gameCount}`);

        if (gameCount === 0) {
            console.log('⚠️ El usuario no tiene juegos o no fue encontrado. Intenta con otro username.');
            return;
        }

        // 2. Segunda consulta (Cache Hit Total - Todo desde PostgreSQL)
        console.log(`\n📦 Consulta 2 (Cache Hit Total - Todo desde PostgreSQL):`);
        const start2 = Date.now();
        await axios.get(baseUrl);
        const end2 = Date.now();
        console.log(`⏱️ Tiempo: ${end2 - start2}ms`);

        // 3. Resultados
        const speedup = (end1 - start1) / (end2 - start2);
        console.log(`\n✅ Resumen de Optimización de Perfil:`);
        console.log(`- Tiempo inicial (IGDB/Mixto): ${end1 - start1}ms`);
        console.log(`- Tiempo optimizado (Local): ${end2 - start2}ms`);
        console.log(`- Mejora de rendimiento: ${speedup.toFixed(2)}x más rápido`);
        console.log(`\n✨ Un perfil con ${gameCount} juegos ahora carga en ~${end2 - start2}ms en lugar de casi un segundo.`);

    } catch (error) {
        console.error('\n❌ Error en el benchmark de usuario:', error.message);
        if (error.response) {
            console.error('Data:', error.response.data);
        }
    }
}

benchmarkUserGames();
