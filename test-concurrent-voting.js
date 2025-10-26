// test-concurrent-voting-optimized.js
// Ejecutar con: node test-concurrent-voting-optimized.js

const { initializeApp } = require('firebase/app');
const { getFirestore, doc, getDocs, collection, setDoc, increment, updateDoc, getDoc } = require('firebase/firestore');

const firebaseConfig = {
    apiKey: "AIzaSyD68dTYCBVXqQaXWpOoZoGE7Sn9ZVU0XXA",
    authDomain: "expo2025-13c1b.firebaseapp.com",
    projectId: "expo2025-13c1b",
    storageBucket: "expo2025-13c1b.firebasestorage.app",
    messagingSenderId: "815250068941",
    appId: "1:815250068941:web:c3728656ddbbe6dbeea084"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const GROUPS_PHASE_1 = ['Payvo', 'MedSpark', 'TeachMeNow', 'Nouva'];
const TOTAL_BUDGET = 10000;
const NUM_VOTERS = 200;
const NUM_SHARDS = 20;
const MAX_RETRIES = 5;

function getRandomShard() {
    return Math.floor(Math.random() * NUM_SHARDS);
}

// Función mejorada con reintentos y backoff exponencial
async function simulateVoteOptimized(voterId) {
    const startTime = Date.now();

    // Generar distribución aleatoria
    const distribution = {};
    let remaining = TOTAL_BUDGET;

    GROUPS_PHASE_1.forEach((group, index) => {
        if (index === GROUPS_PHASE_1.length - 1) {
            distribution[group] = remaining;
        } else {
            const amount = Math.floor(Math.random() * (remaining / (GROUPS_PHASE_1.length - index)));
            distribution[group] = amount;
            remaining -= amount;
        }
    });

    let lastError = null;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        try {
            const shardId = getRandomShard();
            const shardDocRef = doc(db, 'groups', `shard_${shardId}`);

            // Verificar si el shard existe
            const shardSnap = await getDoc(shardDocRef);

            if (!shardSnap.exists()) {
                // Inicializar el shard
                const initialData = {};
                GROUPS_PHASE_1.forEach(group => {
                    initialData[group] = 0;
                });

                try {
                    await setDoc(shardDocRef, initialData);
                } catch (setError) {
                    // Ignorar si otro proceso ya lo creó
                }
            }

            // Construir updates con increment
            const updates = {};
            Object.keys(distribution).forEach((group) => {
                if (distribution[group] > 0) {
                    updates[group] = increment(distribution[group]);
                }
            });

            // Usar updateDoc (más rápido que runTransaction)
            await updateDoc(shardDocRef, updates);

            const duration = Date.now() - startTime;
            return {
                success: true,
                duration,
                shardId,
                voterId,
                attempts: attempt + 1,
                distribution
            };

        } catch (error) {
            lastError = error;

            // Backoff exponencial con jitter
            if (attempt < MAX_RETRIES - 1) {
                const delay = Math.min(
                    1000 * Math.pow(2, attempt) + Math.random() * 1000,
                    5000
                );
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }

    const duration = Date.now() - startTime;
    return {
        success: false,
        error: lastError?.message || 'Unknown error',
        duration,
        voterId,
        attempts: MAX_RETRIES
    };
}

// Función para obtener totales
async function getTotals() {
    const querySnapshot = await getDocs(collection(db, 'groups'));
    const aggregatedTotals = {};

    GROUPS_PHASE_1.forEach(group => {
        aggregatedTotals[group] = 0;
    });

    querySnapshot.forEach((doc) => {
        const data = doc.data();
        GROUPS_PHASE_1.forEach(group => {
            if (data[group]) {
                aggregatedTotals[group] += data[group];
            }
        });
    });

    return aggregatedTotals;
}

// Función principal
async function runLoadTest() {
    console.log('\n' + '='.repeat(70));
    console.log('PRUEBA DE CARGA OPTIMIZADA');
    console.log('='.repeat(70));
    console.log(`\nConfiguración:`);
    console.log(`  • Votantes simultáneos: ${NUM_VOTERS}`);
    console.log(`  • Shards disponibles: ${NUM_SHARDS}`);
    console.log(`  • Reintentos por voto: ${MAX_RETRIES}`);
    console.log(`  • Budget por voto: $${TOTAL_BUDGET.toLocaleString()}\n`);

    // 1. Inicializar shards
    console.log('Inicializando shards...');
    try {
        const initPromises = [];
        for (let i = 0; i < NUM_SHARDS; i++) {
            const shardDocRef = doc(db, 'groups', `shard_${i}`);
            const initialData = {};
            GROUPS_PHASE_1.forEach(group => {
                initialData[group] = 0;
            });
            initPromises.push(setDoc(shardDocRef, initialData));
        }
        await Promise.all(initPromises);
        console.log(`✓ ${NUM_SHARDS} shards inicializados\n`);
    } catch (error) {
        console.log('Error al inicializar:', error.message);
    }

    // 2. Totales iniciales
    const beforeTotals = await getTotals();
    console.log('Totales ANTES de la prueba:');
    GROUPS_PHASE_1.forEach(group => {
        console.log(`  ${group}: $${beforeTotals[group].toLocaleString()}`);
    });

    // 3. Ejecutar votaciones
    console.log(`\n${'='.repeat(70)}`);
    console.log('EJECUTANDO VOTACIONES...\n');

    const startTime = Date.now();
    const promises = Array.from({ length: NUM_VOTERS }, (_, i) =>
        simulateVoteOptimized(i + 1)
    );
    const results = await Promise.all(promises);
    const totalTime = Date.now() - startTime;

    // 4. Análisis de resultados
    console.log('\n' + '='.repeat(70));
    console.log('ANÁLISIS DE RESULTADOS');
    console.log('='.repeat(70) + '\n');

    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);

    console.log(`Resumen General:`);
    console.log(`  ✓ Votos exitosos: ${successful.length}/${NUM_VOTERS} (${(successful.length / NUM_VOTERS * 100).toFixed(1)}%)`);
    console.log(`  ✗ Votos fallidos: ${failed.length}/${NUM_VOTERS} (${(failed.length / NUM_VOTERS * 100).toFixed(1)}%)`);
    console.log(`  ⏱  Tiempo total: ${(totalTime / 1000).toFixed(2)}s`);
    console.log(`  ⚡ Throughput: ${(NUM_VOTERS / (totalTime / 1000)).toFixed(2)} votos/segundo\n`);

    // Análisis de tiempos
    const durations = results.map(r => r.duration);
    const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
    const maxDuration = Math.max(...durations);
    const minDuration = Math.min(...durations);
    const sortedDurations = [...durations].sort((a, b) => a - b);
    const p50 = sortedDurations[Math.floor(sortedDurations.length * 0.5)];
    const p95 = sortedDurations[Math.floor(sortedDurations.length * 0.95)];
    const p99 = sortedDurations[Math.floor(sortedDurations.length * 0.99)];

    console.log(`Análisis de Tiempos:`);
    console.log(`  Promedio: ${avgDuration.toFixed(0)}ms`);
    console.log(`  Mediana (P50): ${p50.toFixed(0)}ms`);
    console.log(`  P95: ${p95.toFixed(0)}ms`);
    console.log(`  P99: ${p99.toFixed(0)}ms`);
    console.log(`  Mínimo: ${minDuration}ms`);
    console.log(`  Máximo: ${maxDuration}ms\n`);

    // Análisis de reintentos
    const attemptsData = successful.map(r => r.attempts);
    const avgAttempts = attemptsData.reduce((a, b) => a + b, 0) / attemptsData.length;
    const maxAttempts = Math.max(...attemptsData);
    const firstTrySuccess = attemptsData.filter(a => a === 1).length;

    console.log(`Análisis de Reintentos:`);
    console.log(`  Éxito en primer intento: ${firstTrySuccess}/${successful.length} (${(firstTrySuccess / successful.length * 100).toFixed(1)}%)`);
    console.log(`  Promedio de intentos: ${avgAttempts.toFixed(2)}`);
    console.log(`  Máximo de intentos: ${maxAttempts}\n`);

    // Distribución por shards
    const shardDistribution = {};
    successful.forEach(r => {
        if (r.shardId !== undefined) {
            shardDistribution[r.shardId] = (shardDistribution[r.shardId] || 0) + 1;
        }
    });

    console.log(`Distribución por Shards:`);
    const shardIds = Object.keys(shardDistribution).map(Number).sort((a, b) => a - b);
    const votesPerShard = successful.length / NUM_SHARDS;
    const stdDev = Math.sqrt(
        shardIds.reduce((sum, id) => {
            const diff = (shardDistribution[id] || 0) - votesPerShard;
            return sum + diff * diff;
        }, 0) / NUM_SHARDS
    );

    console.log(`  Ideal por shard: ${votesPerShard.toFixed(2)} votos`);
    console.log(`  Desviación estándar: ${stdDev.toFixed(2)}`);
    console.log(`  Distribución real:`);

    shardIds.forEach(id => {
        const count = shardDistribution[id];
        const bar = '█'.repeat(Math.round(count / 2));
        console.log(`    Shard ${id.toString().padStart(2)}: ${count.toString().padStart(3)} votos ${bar}`);
    });

    // Errores
    if (failed.length > 0) {
        console.log(`\nAnálisis de Errores:`);
        const errorTypes = {};
        failed.forEach(r => {
            const errorMsg = r.error || 'Unknown';
            errorTypes[errorMsg] = (errorTypes[errorMsg] || 0) + 1;
        });
        Object.entries(errorTypes).forEach(([error, count]) => {
            console.log(`  ${error}: ${count} ocurrencias`);
        });
    }

    // 5. Verificación de totales
    console.log(`\n${'='.repeat(70)}`);
    console.log('VERIFICACIÓN DE INTEGRIDAD');
    console.log('='.repeat(70) + '\n');

    const afterTotals = await getTotals();
    console.log('Totales DESPUÉS de la prueba:');
    GROUPS_PHASE_1.forEach(group => {
        console.log(`  ${group}: ${afterTotals[group].toLocaleString()}`);
    });

    const expectedTotal = TOTAL_BUDGET * successful.length;
    const actualTotal = Object.values(afterTotals).reduce((sum, val) => sum + val, 0);
    const difference = actualTotal - expectedTotal;

    console.log(`\nValidación:`);
    console.log(`  Total esperado: ${expectedTotal.toLocaleString()}`);
    console.log(`  Total actual: ${actualTotal.toLocaleString()}`);
    console.log(`  Diferencia: ${difference.toLocaleString()}`);

    // 6. Veredicto final
    console.log(`\n${'='.repeat(70)}`);
    if (difference === 0 && failed.length === 0) {
        console.log('✓✓✓ PRUEBA PERFECTA ✓✓✓');
        console.log('Todos los votos se registraron correctamente sin errores.');
    } else if (Math.abs(difference) < expectedTotal * 0.01 && successful.length >= NUM_VOTERS * 0.95) {
        console.log('✓ PRUEBA EXITOSA');
        console.log(`Sistema funciona correctamente con ${(successful.length / NUM_VOTERS * 100).toFixed(1)}% de éxito.`);
        if (difference !== 0) {
            console.log(`Pequeña discrepancia de ${Math.abs(difference).toLocaleString()} (${(Math.abs(difference) / expectedTotal * 100).toFixed(3)}%).`);
        }
    } else if (successful.length >= NUM_VOTERS * 0.80) {
        console.log('⚠ PRUEBA ACEPTABLE');
        console.log(`El sistema necesita optimización. Tasa de éxito: ${(successful.length / NUM_VOTERS * 100).toFixed(1)}%`);
    } else {
        console.log('✗ PRUEBA FALLIDA');
        console.log('El sistema necesita mejoras significativas.');
    }
    console.log('='.repeat(70) + '\n');

    // 7. Recomendaciones
    if (failed.length > 0 || avgDuration > 5000) {
        console.log('Recomendaciones:');
        if (failed.length > NUM_VOTERS * 0.1) {
            console.log(`  • Alta tasa de fallos (${(failed.length / NUM_VOTERS * 100).toFixed(1)}%)`);
            console.log(`    → Considera aumentar NUM_SHARDS a ${NUM_SHARDS * 2}`);
            console.log(`    → Revisa límites de Firestore (quotas)`);
        }
        if (avgDuration > 5000) {
            console.log(`  • Tiempos altos (promedio: ${(avgDuration / 1000).toFixed(2)}s)`);
            console.log(`    → Optimiza la lógica de reintentos`);
            console.log(`    → Revisa conexión a internet`);
        }
        if (avgAttempts > 2) {
            console.log(`  • Muchos reintentos necesarios (promedio: ${avgAttempts.toFixed(2)})`);
            console.log(`    → Aumenta NUM_SHARDS para reducir contención`);
        }
        if (stdDev > votesPerShard * 0.3) {
            console.log(`  • Distribución desigual entre shards`);
            console.log(`    → Verifica la función de selección de shard aleatorio`);
        }
        console.log();
    }

    // 8. Métricas clave para dashboard
    console.log('Métricas Clave:');
    console.log(`  • Tasa de éxito: ${(successful.length / NUM_VOTERS * 100).toFixed(2)}%`);
    console.log(`  • Throughput: ${(successful.length / (totalTime / 1000)).toFixed(2)} votos/seg`);
    console.log(`  • Latencia P95: ${p95}ms`);
    console.log(`  • Precisión: ${difference === 0 ? '100%' : (100 - Math.abs(difference) / expectedTotal * 100).toFixed(3) + '%'}`);
    console.log();
}

// Ejecutar
runLoadTest()
    .then(() => {
        console.log('Prueba completada exitosamente.\n');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\nError crítico en la prueba:', error);
        process.exit(1);
    });