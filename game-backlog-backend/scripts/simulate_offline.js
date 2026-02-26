const axios = require('axios');
const fs = require('fs');
const path = require('path');

const SERVICE_PATH = path.join(__dirname, '../src/services/igdb.service.js');

async function simulateDowntimeBenchmark() {
    const username = 'Thiagok';
    const baseUrl = `http://localhost:3000/api/games/user/${username}`;

    console.log('🛑 --- SIMULADOR DE CAÍDA DE IGDB --- 🛑');

    // 1. Asegurarnos de que el perfil está en caché primero
    console.log('\nStep 1: Asegurando que el cache esté caliente...');
    await axios.get(baseUrl);
    console.log('✅ Cache caliente.');

    // 2. Modificar el service para inyectar un error manual en las peticiones de red
    console.log('\nStep 2: Inyectando error en igdb.service.js para simular caída...');
    const originalContent = fs.readFileSync(SERVICE_PATH, 'utf8');

    // Inyectamos un throw Error al principio de getAccessToken para bloquear cualquier salida a internet
    const brokenContent = originalContent.replace(
        'const getAccessToken = async () => {',
        'const getAccessToken = async () => { throw new Error("🔥 ERROR DE CONEXIÓN: IGDB API OFFLINE 🔥");'
    );
    fs.writeFileSync(SERVICE_PATH, brokenContent);

    // Esperar a que nodemon reinicie
    console.log('⏳ Esperando a que el servidor detecte el cambio y reinicie (5s)...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    try {
        // 3. Probar carga de perfil (Debería funcionar porque está en cache)
        console.log(`\nStep 3: Intentando cargar perfil de "${username}" SIN internet (IGDB "caído")...`);
        const start = Date.now();
        const res = await axios.get(baseUrl);
        const end = Date.now();

        console.log(`✅ ¡ÉXITO! El perfil cargó en ${end - start}ms usando exclusivamente el Cache.`);
        console.log(`🎮 Juegos recuperados de la DB local: ${res.data.games.length}`);

        // 4. Probar algo que NO esté en cache (Debería fallar)
        console.log('\nStep 4: Intentando cargar un juego NUEVO que no está en cache...');
        try {
            await axios.get('http://localhost:3000/api/games/igdb/99999999'); // Un ID que no existe
            console.log('❌ Error: La petición debería haber fallado pero funcionó.');
        } catch (err) {
            console.log(`✅ RESILIENCIA CONFIRMADA: La petición falló como se esperaba para datos nuevos: "${err.response?.data?.error || err.message}"`);
        }

    } catch (error) {
        console.error('❌ Error fatal en el simulador:', error.message);
    } finally {
        // 5. Restaurar el archivo original
        console.log('\nStep 5: Restaurando igdb.service.js...');
        fs.writeFileSync(SERVICE_PATH, originalContent);
        console.log('✅ Sistema restaurado.');
    }
}

simulateDowntimeBenchmark();
