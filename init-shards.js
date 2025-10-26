// init-shards.js
// Script para inicializar todos los shards ANTES de comenzar la votación
// Ejecutar con: node init-shards.js

const { initializeApp } = require('firebase/app');
const { getFirestore, doc, setDoc, getDoc } = require('firebase/firestore');

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

const ALL_GROUPS = [
    'Payvo',
    'MedSpark',
    'TeachMeNow',
    'Nouva',
    'Univan',
    'HavenUp',
    'Loqalli',
    'Agrored'
];

const NUM_SHARDS = 20;

async function initializeShards() {
    console.log('\n' + '='.repeat(60));
    console.log('INICIALIZANDO SHARDS PARA SISTEMA DE VOTACIÓN');
    console.log('='.repeat(60) + '\n');

    console.log(`Configuración:`);
    console.log(`  • Número de shards: ${NUM_SHARDS}`);
    console.log(`  • Grupos: ${ALL_GROUPS.length}`);
    console.log(`  • Grupos: ${ALL_GROUPS.join(', ')}\n`);

    const results = {
        created: 0,
        existing: 0,
        errors: 0
    };

    console.log('Procesando shards...\n');

    for (let i = 0; i < NUM_SHARDS; i++) {
        const shardId = `shard_${i}`;
        const shardDocRef = doc(db, 'groups', shardId);

        try {
            // Verificar si el shard ya existe
            const shardSnap = await getDoc(shardDocRef);

            if (shardSnap.exists()) {
                console.log(`  ℹ ${shardId} ya existe, manteniéndolo...`);
                results.existing++;
            } else {
                // Crear estructura inicial con todos los grupos en 0
                const initialData = {};
                ALL_GROUPS.forEach(group => {
                    initialData[group] = 0;
                });

                await setDoc(shardDocRef, initialData);
                console.log(`  ✓ ${shardId} creado exitosamente`);
                results.created++;
            }
        } catch (error) {
            console.error(`  ✗ Error en ${shardId}:`, error.message);
            results.errors++;
        }
    }

    console.log('\n' + '='.repeat(60));
    console.log('RESUMEN');
    console.log('='.repeat(60) + '\n');
    console.log(`  Shards creados: ${results.created}`);
    console.log(`  Shards existentes: ${results.existing}`);
    console.log(`  Errores: ${results.errors}`);
    console.log(`  Total procesados: ${results.created + results.existing + results.errors}/${NUM_SHARDS}\n`);

    if (results.errors === 0) {
        console.log('✓ Inicialización completada exitosamente!');
        console.log('✓ El sistema está listo para recibir votos.\n');
    } else {
        console.log('⚠ Inicialización completada con errores.');
        console.log('⚠ Revisa los mensajes de error anteriores.\n');
    }
}

// Función para resetear todos los shards a 0 (útil para pruebas)
async function resetShards() {
    console.log('\n' + '='.repeat(60));
    console.log('RESETEANDO TODOS LOS SHARDS A 0');
    console.log('='.repeat(60) + '\n');

    console.log('⚠ ADVERTENCIA: Esto eliminará todos los votos existentes!\n');

    for (let i = 0; i < NUM_SHARDS; i++) {
        const shardId = `shard_${i}`;
        const shardDocRef = doc(db, 'groups', shardId);

        try {
            const initialData = {};
            ALL_GROUPS.forEach(group => {
                initialData[group] = 0;
            });

            await setDoc(shardDocRef, initialData);
            console.log(`  ✓ ${shardId} reseteado`);
        } catch (error) {
            console.error(`  ✗ Error en ${shardId}:`, error.message);
        }
    }

    console.log('\n✓ Reset completado!\n');
}

// Verificar argumentos de línea de comandos
const args = process.argv.slice(2);

if (args.includes('--reset')) {
    resetShards()
        .then(() => {
            console.log('Operación completada.');
            process.exit(0);
        })
        .catch((error) => {
            console.error('Error:', error);
            process.exit(1);
        });
} else {
    initializeShards()
        .then(() => {
            console.log('Operación completada.');
            process.exit(0);
        })
        .catch((error) => {
            console.error('Error:', error);
            process.exit(1);
        });
}