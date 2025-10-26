// test-phase-2.js
// Prueba específica para verificar que Fase 2 funciona correctamente
// Ejecutar con: node test-phase-2.js

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
const GROUPS_PHASE_2 = ['Univan', 'HavenUp', 'Loqalli', 'Agrored'];
const ALL_GROUPS = [...GROUPS_PHASE_1, ...GROUPS_PHASE_2];
const TOTAL_BUDGET = 10000;
const NUM_VOTERS = 100; // 100 usuarios para cada fase
const NUM_SHARDS = 20;
const MAX_RETRIES = 5;

function getRandomShard() {
    return Math.floor(Math.random() * NUM_SHARDS);
}

// Función optimizada de votación (igual que en VotingForm.tsx)
async function registerVote(distribution, voterId, phase) {
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        try {
            const shardId = getRandomShard();
            const shardDocRef = doc(db, 'groups', `shard_${shardId}`);

            const shardSnap = await getDoc(shardDocRef);

            if (!shardSnap.exists()) {
                const initialData = {};
                ALL_GROUPS.forEach(group => {
                    initialData[group] = 0;
                });
                try {
                    await setDoc(shardDocRef, initialData);
                } catch (setError) {
                    // Ignorar si otro proceso ya lo creó
                }
            }

            const updates = {};
            Object.keys(distribution).forEach((group) => {
                if (distribution[group] > 0) {
                    updates[group] = increment(distribution[group]);
                }
            });

            await updateDoc(shardDocRef, updates);

            return {
                success: true,
                shardId,
                voterId,
                phase,
                attempts: attempt + 1
            };

        } catch (error) {
            if (attempt < MAX_RETRIES - 1) {
                const delay = Math.min(
                    1000 * Math.pow(2, attempt) + Math.random() * 1000,
                    5000
                );
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }

    return {
        success: false,
        voterId,
        phase,
        attempts: MAX_RETRIES
    };
}

// Generar distribución aleatoria para un grupo de fases
function generateDistribution(groups) {
    const distribution = {};
    let remaining = TOTAL_BUDGET;

    groups.forEach((group, index) => {
        if (index === groups.length - 1) {
            distribution[group] = remaining;
        } else {
            const amount = Math.floor(Math.random() * (remaining / (groups.length - index)));
            distribution[group] = amount;
            remaining -= amount;
        }
    });

    return distribution;
}

// Obtener totales
async function getTotals() {
    const querySnapshot = await getDocs(collection(db, 'groups'));
    const aggregatedTotals = {};

    ALL_GROUPS.forEach(group => {
        aggregatedTotals[group] = 0;
    });

    querySnapshot.forEach((doc) => {
        const data = doc.data();
        ALL_GROUPS.forEach(group => {
            if (data[group]) {
                aggregatedTotals[group] += data[group];
            }
        });
    });

    return aggregatedTotals;
}

// Prueba completa: Fase 1 + Fase 2
async function runTwoPhaseTest() {
    console.log('\n' + '='.repeat(70));
    console.log('PRUEBA COMPLETA: FASE 1 + FASE 2');
    console.log('='.repeat(70) + '\n');

    console.log(`Configuración:`);
    console.log(`  • Votantes por fase: ${NUM_VOTERS}`);
    console.log(`  • Total de votantes: ${NUM_VOTERS * 2}`);
    console.log(`  • Shards: ${NUM_SHARDS}`);
    console.log(`  • Reintentos máximos: ${MAX_RETRIES}\n`);

    // =====================================================
    // FASE 1: Votar por primeros 4 grupos
    // =====================================================
    console.log('='.repeat(70));
    console.log('FASE 1: ' + GROUPS_PHASE_1.join(', '));
    console.log('='.repeat(70) + '\n');

    const totalsBeforePhase1 = await getTotals();
    console.log('Totales ANTES de Fase 1:');
    GROUPS_PHASE_1.forEach(group => {
        console.log(`  ${group}: $${totalsBeforePhase1[group].toLocaleString()}`);
    });
    console.log();

    console.log(`Ejecutando ${NUM_VOTERS} votos para Fase 1...`);
    const startPhase1 = Date.now();

    const phase1Promises = Array.from({ length: NUM_VOTERS }, (_, i) => {
        const distribution = generateDistribution(GROUPS_PHASE_1);
        return registerVote(distribution, i + 1, 'phase-1');
    });

    const phase1Results = await Promise.all(phase1Promises);
    const timePhase1 = Date.now() - startPhase1;

    const phase1Success = phase1Results.filter(r => r.success).length;
    const phase1Failed = phase1Results.filter(r => !r.success).length;

    console.log(`\nResultados Fase 1:`);
    console.log(`  ✓ Exitosos: ${phase1Success}/${NUM_VOTERS} (${(phase1Success / NUM_VOTERS * 100).toFixed(1)}%)`);
    console.log(`  ✗ Fallidos: ${phase1Failed}/${NUM_VOTERS}`);
    console.log(`  ⏱  Tiempo: ${(timePhase1 / 1000).toFixed(2)}s`);
    console.log(`  ⚡ Throughput: ${(NUM_VOTERS / (timePhase1 / 1000)).toFixed(2)} votos/s\n`);

    const totalsAfterPhase1 = await getTotals();
    console.log('Totales DESPUÉS de Fase 1:');
    GROUPS_PHASE_1.forEach(group => {
        const diff = totalsAfterPhase1[group] - totalsBeforePhase1[group];
        console.log(`  ${group}: $${totalsAfterPhase1[group].toLocaleString()} (+$${diff.toLocaleString()})`);
    });

    const expectedPhase1 = TOTAL_BUDGET * phase1Success;
    const actualPhase1 = GROUPS_PHASE_1.reduce((sum, group) =>
        sum + (totalsAfterPhase1[group] - totalsBeforePhase1[group]), 0
    );

    console.log(`\nValidación Fase 1:`);
    console.log(`  Esperado: $${expectedPhase1.toLocaleString()}`);
    console.log(`  Actual: $${actualPhase1.toLocaleString()}`);
    console.log(`  Diferencia: $${(actualPhase1 - expectedPhase1).toLocaleString()}`);

    const phase1Perfect = actualPhase1 === expectedPhase1;
    if (phase1Perfect) {
        console.log(`  ✓ FASE 1 PERFECTA\n`);
    } else {
        console.log(`  ⚠ Discrepancia en Fase 1\n`);
    }

    // =====================================================
    // FASE 2: Votar por siguientes 4 grupos
    // =====================================================
    console.log('='.repeat(70));
    console.log('FASE 2: ' + GROUPS_PHASE_2.join(', '));
    console.log('='.repeat(70) + '\n');

    // Simulamos que los mismos usuarios ahora votan en Fase 2
    console.log('🔄 Los mismos usuarios ahora votan en Fase 2...\n');

    const totalsBeforePhase2 = await getTotals();
    console.log('Totales ANTES de Fase 2:');
    GROUPS_PHASE_2.forEach(group => {
        console.log(`  ${group}: $${totalsBeforePhase2[group].toLocaleString()}`);
    });
    console.log();

    console.log(`Ejecutando ${NUM_VOTERS} votos para Fase 2...`);
    const startPhase2 = Date.now();

    const phase2Promises = Array.from({ length: NUM_VOTERS }, (_, i) => {
        const distribution = generateDistribution(GROUPS_PHASE_2);
        return registerVote(distribution, i + 1, 'phase-2');
    });

    const phase2Results = await Promise.all(phase2Promises);
    const timePhase2 = Date.now() - startPhase2;

    const phase2Success = phase2Results.filter(r => r.success).length;
    const phase2Failed = phase2Results.filter(r => !r.success).length;

    console.log(`\nResultados Fase 2:`);
    console.log(`  ✓ Exitosos: ${phase2Success}/${NUM_VOTERS} (${(phase2Success / NUM_VOTERS * 100).toFixed(1)}%)`);
    console.log(`  ✗ Fallidos: ${phase2Failed}/${NUM_VOTERS}`);
    console.log(`  ⏱  Tiempo: ${(timePhase2 / 1000).toFixed(2)}s`);
    console.log(`  ⚡ Throughput: ${(NUM_VOTERS / (timePhase2 / 1000)).toFixed(2)} votos/s\n`);

    const totalsAfterPhase2 = await getTotals();
    console.log('Totales DESPUÉS de Fase 2:');
    GROUPS_PHASE_2.forEach(group => {
        const diff = totalsAfterPhase2[group] - totalsBeforePhase2[group];
        console.log(`  ${group}: $${totalsAfterPhase2[group].toLocaleString()} (+$${diff.toLocaleString()})`);
    });

    const expectedPhase2 = TOTAL_BUDGET * phase2Success;
    const actualPhase2 = GROUPS_PHASE_2.reduce((sum, group) =>
        sum + (totalsAfterPhase2[group] - totalsBeforePhase2[group]), 0
    );

    console.log(`\nValidación Fase 2:`);
    console.log(`  Esperado: $${expectedPhase2.toLocaleString()}`);
    console.log(`  Actual: $${actualPhase2.toLocaleString()}`);
    console.log(`  Diferencia: $${(actualPhase2 - expectedPhase2).toLocaleString()}`);

    const phase2Perfect = actualPhase2 === expectedPhase2;
    if (phase2Perfect) {
        console.log(`  ✓ FASE 2 PERFECTA\n`);
    } else {
        console.log(`  ⚠ Discrepancia en Fase 2\n`);
    }

    // =====================================================
    // RESUMEN FINAL
    // =====================================================
    console.log('='.repeat(70));
    console.log('RESUMEN FINAL - AMBAS FASES');
    console.log('='.repeat(70) + '\n');

    const totalSuccess = phase1Success + phase2Success;
    const totalFailed = phase1Failed + phase2Failed;
    const totalTime = timePhase1 + timePhase2;
    const totalVotes = NUM_VOTERS * 2;

    console.log(`Estadísticas Generales:`);
    console.log(`  Total de votos: ${totalVotes}`);
    console.log(`  ✓ Exitosos: ${totalSuccess}/${totalVotes} (${(totalSuccess / totalVotes * 100).toFixed(1)}%)`);
    console.log(`  ✗ Fallidos: ${totalFailed}/${totalVotes} (${(totalFailed / totalVotes * 100).toFixed(1)}%)`);
    console.log(`  ⏱  Tiempo total: ${(totalTime / 1000).toFixed(2)}s`);
    console.log(`  ⚡ Throughput promedio: ${(totalVotes / (totalTime / 1000)).toFixed(2)} votos/s\n`);

    console.log(`Comparación Fase 1 vs Fase 2:`);
    console.log(`  Fase 1:`);
    console.log(`    • Éxito: ${(phase1Success / NUM_VOTERS * 100).toFixed(1)}%`);
    console.log(`    • Tiempo: ${(timePhase1 / 1000).toFixed(2)}s`);
    console.log(`    • Throughput: ${(NUM_VOTERS / (timePhase1 / 1000)).toFixed(2)} votos/s`);
    console.log(`  Fase 2:`);
    console.log(`    • Éxito: ${(phase2Success / NUM_VOTERS * 100).toFixed(1)}%`);
    console.log(`    • Tiempo: ${(timePhase2 / 1000).toFixed(2)}s`);
    console.log(`    • Throughput: ${(NUM_VOTERS / (timePhase2 / 1000)).toFixed(2)} votos/s\n`);

    // Totales finales por grupo
    console.log('Totales Finales por Grupo:');
    console.log('\n  Fase 1:');
    GROUPS_PHASE_1.forEach(group => {
        console.log(`    ${group}: $${totalsAfterPhase2[group].toLocaleString()}`);
    });
    console.log('\n  Fase 2:');
    GROUPS_PHASE_2.forEach(group => {
        console.log(`    ${group}: $${totalsAfterPhase2[group].toLocaleString()}`);
    });

    const grandTotal = Object.values(totalsAfterPhase2).reduce((a, b) => a + b, 0);
    const expectedGrandTotal = TOTAL_BUDGET * totalSuccess;

    console.log(`\n  Gran Total: $${grandTotal.toLocaleString()}`);
    console.log(`  Esperado: $${expectedGrandTotal.toLocaleString()}`);
    console.log(`  Diferencia: $${(grandTotal - expectedGrandTotal).toLocaleString()}\n`);

    // Veredicto final
    console.log('='.repeat(70));
    if (phase1Perfect && phase2Perfect && totalFailed === 0) {
        console.log('🎉 ¡PRUEBA PERFECTA! 🎉');
        console.log('Ambas fases funcionan sin errores.');
        console.log('Sistema 100% listo para producción.');
    } else if (totalSuccess >= totalVotes * 0.95 && Math.abs(grandTotal - expectedGrandTotal) < expectedGrandTotal * 0.01) {
        console.log('✅ PRUEBA EXITOSA');
        console.log('Ambas fases funcionan correctamente.');
        console.log(`Tasa de éxito combinada: ${(totalSuccess / totalVotes * 100).toFixed(1)}%`);
    } else {
        console.log('⚠️ NECESITA ATENCIÓN');
        console.log('Revisa los resultados anteriores para identificar problemas.');
    }
    console.log('='.repeat(70) + '\n');
}

// Ejecutar
runTwoPhaseTest()
    .then(() => {
        console.log('Prueba completada.\n');
        process.exit(0);
    })
    .catch((error) => {
        console.error('Error en la prueba:', error);
        process.exit(1);
    });