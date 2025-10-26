// src/components/VotingForm.tsx
'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebaseConfig';
import { doc, updateDoc, increment, getDoc, setDoc } from 'firebase/firestore';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const GROUPS_PHASE_1 = ['Payvo', 'MedSpark', 'TeachMeNow', 'Nouva'];
const GROUPS_PHASE_2 = ['Univan', 'HavenUp', 'Loqalli', 'Agrored'];
const TOTAL_BUDGET = 10000;
const NUM_SHARDS = 20;
const MAX_RETRIES = 5;

type VotingPhase = 'not-voted' | 'phase-1-complete' | 'phase-2-complete';

// Función para obtener un shard aleatorio
function getRandomShard() {
    return Math.floor( Math.random() * NUM_SHARDS );
}

// Función mejorada para registrar voto con reintentos y sin transacciones
async function registerVoteWithRetry( distribution: Record<string, number>, allGroups: string[] ) {
    let lastError: Error | null = null;

    for ( let attempt = 0; attempt < MAX_RETRIES; attempt++ ) {
        try {
            const shardId = getRandomShard();
            const shardDocRef = doc( db, 'groups', `shard_${shardId}` );

            // Verificar si el shard existe
            const shardSnap = await getDoc( shardDocRef );

            if ( !shardSnap.exists() ) {
                // Inicializar el shard si no existe
                const initialData: Record<string, number> = {};
                allGroups.forEach( group => {
                    initialData[group] = 0;
                } );

                try {
                    await setDoc( shardDocRef, initialData );
                } catch ( setError ) {
                    // Ignorar error si otro proceso ya lo creó
                    console.log( `Shard ${shardId} ya fue creado por otro proceso` );
                }
            }

            // Construir updates con increment - Fixed: tipo correcto para Firestore
            const updates: Record<string, ReturnType<typeof increment>> = {};
            Object.keys( distribution ).forEach( ( group ) => {
                if ( distribution[group] > 0 ) {
                    updates[group] = increment( distribution[group] );
                }
            } );

            // Usar updateDoc que es más rápido que runTransaction
            await updateDoc( shardDocRef, updates );

            console.log( `✓ Voto registrado en shard_${shardId} (intento ${attempt + 1})` );
            return { success: true, shardId };

        } catch ( error ) {
            lastError = error instanceof Error ? error : new Error( 'Error desconocido' );
            console.warn( `Intento ${attempt + 1} falló:`, lastError.message );

            // Esperar un tiempo aleatorio antes de reintentar (backoff exponencial)
            if ( attempt < MAX_RETRIES - 1 ) {
                const delay = Math.min( 1000 * Math.pow( 2, attempt ) + Math.random() * 1000, 5000 );
                await new Promise( resolve => setTimeout( resolve, delay ) );
            }
        }
    }

    throw lastError || new Error( 'Error desconocido al registrar voto' );
}

export default function VotingForm() {
    const router = useRouter();
    const [votingPhase, setVotingPhase] = useState<VotingPhase>( 'not-voted' );
    const [currentGroups, setCurrentGroups] = useState<string[]>( GROUPS_PHASE_1 );

    const [distribution, setDistribution] = useState<Record<string, number>>(
        [...GROUPS_PHASE_1, ...GROUPS_PHASE_2].reduce( ( acc, group ) => ( { ...acc, [group]: 0 } ), {} )
    );

    const [loading, setLoading] = useState( false );
    const [error, setError] = useState<string | null>( null );
    const [success, setSuccess] = useState( false );

    // Verificar estado de votación desde localStorage
    useEffect( () => {
        const phase = localStorage.getItem( 'votingPhase' ) as VotingPhase;
        if ( phase ) {
            setVotingPhase( phase );

            const savedDistribution = localStorage.getItem( 'phase1Distribution' );
            if ( savedDistribution && phase === 'phase-1-complete' ) {
                const parsed = JSON.parse( savedDistribution );
                setDistribution( prev => ( { ...prev, ...parsed } ) );
                setCurrentGroups( GROUPS_PHASE_2 );
            } else if ( phase === 'phase-2-complete' ) {
                setCurrentGroups( GROUPS_PHASE_2 );
            }
        }
    }, [] );

    const total = currentGroups.reduce( ( sum, group ) => sum + distribution[group], 0 );

    const handleChange = ( group: string, value: string ) => {
        const num = parseInt( value ) || 0;
        const currentGroupValue = distribution[group];
        const otherGroupsTotal = total - currentGroupValue;
        const maxAllowed = TOTAL_BUDGET - otherGroupsTotal;

        if ( num > maxAllowed ) {
            return;
        }

        setDistribution( ( prev ) => ( { ...prev, [group]: Math.max( 0, num ) } ) );
    };

    const handleSubmit = async ( e: React.FormEvent ) => {
        e.preventDefault();
        setError( null ); // Ahora SÍ se usa
        setSuccess( false );

        // Validar que hay algo que votar
        const voteAmount = currentGroups.reduce( ( sum, group ) => sum + distribution[group], 0 );
        if ( voteAmount === 0 ) {
            setError( 'Debes asignar al menos algo de presupuesto antes de votar' );
            return;
        }

        setLoading( true );
        try {
            // Obtener solo los valores de los grupos actuales
            const currentDistribution: Record<string, number> = {};
            currentGroups.forEach( group => {
                currentDistribution[group] = distribution[group];
            } );

            // Registrar voto con reintentos
            await registerVoteWithRetry(
                currentDistribution,
                [...GROUPS_PHASE_1, ...GROUPS_PHASE_2]
            );

            if ( votingPhase === 'not-voted' ) {
                localStorage.setItem( 'votingPhase', 'phase-1-complete' );
                localStorage.setItem( 'phase1Distribution', JSON.stringify( currentDistribution ) );
                setVotingPhase( 'phase-1-complete' );
                setSuccess( true );

                setTimeout( () => {
                    router.push( '/results' );
                }, 1500 );
            } else if ( votingPhase === 'phase-1-complete' ) {
                localStorage.setItem( 'votingPhase', 'phase-2-complete' );
                setVotingPhase( 'phase-2-complete' );
                setSuccess( true );
            }
        } catch ( err ) {
            console.error( 'Error al registrar voto:', err );
            setError(
                err instanceof Error
                    ? `Error: ${err.message}`
                    : 'Error al registrar el voto. Por favor intenta de nuevo.'
            );
        } finally {
            setLoading( false );
        }
    };

    useEffect( () => {
        if ( votingPhase === 'phase-1-complete' ) {
            setCurrentGroups( GROUPS_PHASE_2 );
        }
    }, [votingPhase] );

    const isPhase2Complete = votingPhase === 'phase-2-complete';
    const isPhase1Complete = votingPhase === 'phase-1-complete';
    const canVote = votingPhase !== 'phase-2-complete';

    return (
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-4 sm:p-6 md:p-8 border border-cyan-500/20">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6 sm:mb-8">
                <div>
                    <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-[#0B5F8C] via-[#00A8E8] to-[#00E5A0] bg-clip-text text-transparent">
                        Inversión Virtual
                    </h1>
                    <p className="text-gray-600 text-sm sm:text-base mt-1">
                        {votingPhase === 'not-voted' && 'Fase 1: Distribuye tu inversión en los primeros 4 grupos'}
                        {isPhase1Complete && !isPhase2Complete && 'Fase 2: Distribuye tu inversión en los siguientes 4 grupos'}
                        {isPhase2Complete && 'Votación completada - Gracias por participar'}
                    </p>
                </div>
                <Link
                    href="/results"
                    className="bg-gradient-to-r from-[#00A8E8] to-[#00E5A0] hover:from-[#0B5F8C] hover:to-[#00A8E8] text-white px-4 sm:px-6 py-2 sm:py-3 rounded-xl font-semibold transition-all duration-300 shadow-lg hover:shadow-xl text-center text-sm sm:text-base"
                >
                    Ver Resultados
                </Link>
            </div>

            {/* Alerts */}
            {isPhase2Complete && (
                <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border-l-4 border-[#00E5A0] p-3 sm:p-4 mb-4 sm:mb-6 rounded-lg">
                    <p className="text-emerald-700 font-semibold text-sm sm:text-base">✓ Has completado ambas fases de votación</p>
                    <p className="text-emerald-600 text-xs sm:text-sm mt-1">Ya no puedes modificar tus votos.</p>
                </div>
            )}

            {isPhase1Complete && !isPhase2Complete && !success && (
                <div className="bg-gradient-to-r from-blue-50 to-cyan-50 border-l-4 border-[#00A8E8] p-3 sm:p-4 mb-4 sm:mb-6 rounded-lg">
                    <p className="text-blue-700 font-semibold text-sm sm:text-base">✓ Fase 1 completada</p>
                    <p className="text-blue-600 text-xs sm:text-sm mt-1">Ahora puedes votar por los siguientes 4 grupos.</p>
                </div>
            )}

            {success && (
                <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border-l-4 border-[#00E5A0] p-3 sm:p-4 mb-4 sm:mb-6 rounded-lg">
                    <p className="text-emerald-700 font-semibold text-sm sm:text-base">
                        ✓ {votingPhase === 'phase-1-complete' && !isPhase2Complete ? 'Fase 1 registrada - Redirigiendo a resultados...' : 'Voto registrado correctamente'}
                    </p>
                </div>
            )}

            {error && (
                <div className="bg-red-50 border-l-4 border-red-500 p-3 sm:p-4 mb-4 sm:mb-6 rounded-lg">
                    <p className="text-red-700 text-sm sm:text-base">{error}</p>
                </div>
            )}

            {/* Progress Indicator */}
            <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                    <div className={`flex items-center gap-2 ${votingPhase !== 'not-voted' ? 'text-emerald-600' : 'text-[#00A8E8]'}`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${votingPhase !== 'not-voted' ? 'bg-emerald-500 text-white' : 'bg-[#00A8E8] text-white'}`}>
                            {votingPhase !== 'not-voted' ? '✓' : '1'}
                        </div>
                        <span className="text-sm font-semibold">Fase 1</span>
                    </div>
                    <div className={`flex-1 h-1 mx-4 rounded ${votingPhase !== 'not-voted' ? 'bg-emerald-500' : 'bg-gray-300'}`}></div>
                    <div className={`flex items-center gap-2 ${isPhase2Complete ? 'text-emerald-600' : isPhase1Complete ? 'text-[#00A8E8]' : 'text-gray-400'}`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${isPhase2Complete ? 'bg-emerald-500 text-white' : isPhase1Complete ? 'bg-[#00A8E8] text-white' : 'bg-gray-300 text-white'}`}>
                            {isPhase2Complete ? '✓' : '2'}
                        </div>
                        <span className="text-sm font-semibold">Fase 2</span>
                    </div>
                </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit}>
                <div className="space-y-3 sm:space-y-4 mb-6">
                    {currentGroups.map( ( group ) => {
                        const maxAllowed = TOTAL_BUDGET - ( total - distribution[group] );
                        return (
                            <div
                                key={group}
                                className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 bg-gradient-to-r from-gray-50 to-cyan-50/30 p-3 sm:p-4 rounded-xl border border-cyan-200/50 hover:border-cyan-400/50 transition-all"
                            >
                                <label className="font-semibold text-gray-800 text-sm sm:text-base sm:w-32">{group}</label>
                                <input
                                    type="number"
                                    min="0"
                                    max={maxAllowed}
                                    value={distribution[group] === 0 ? '' : distribution[group]}
                                    onChange={( e ) => handleChange( group, e.target.value )}
                                    disabled={!canVote}
                                    className="flex-1 px-3 sm:px-4 py-2 sm:py-3 border-2 border-cyan-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00A8E8] focus:border-transparent disabled:bg-gray-200 disabled:cursor-not-allowed text-sm sm:text-base transition-all text-gray-800"
                                    placeholder="0"
                                />
                                <span className="text-right sm:w-24 font-bold bg-gradient-to-r from-[#0B5F8C] to-[#00A8E8] bg-clip-text text-transparent text-sm sm:text-base" suppressHydrationWarning>
                                    ${distribution[group].toLocaleString()}
                                </span>
                            </div>
                        );
                    } )}
                </div>

                {/* Summary */}
                <div className="bg-gradient-to-br from-[#0B5F8C]/10 via-[#00A8E8]/10 to-[#00E5A0]/10 p-4 sm:p-6 rounded-xl mb-6 border-2 border-[#00A8E8]/30 backdrop-blur-sm" suppressHydrationWarning>
                    <div className="flex justify-between items-center mb-3">
                        <span className="font-semibold text-gray-800 text-sm sm:text-base">Total a invertir:</span>
                        <span className="font-bold text-xl sm:text-2xl bg-gradient-to-r from-[#0B5F8C] to-[#00A8E8] bg-clip-text text-transparent">
                            ${total.toLocaleString()}
                        </span>
                    </div>
                    <div className="flex justify-between items-center text-xs sm:text-sm text-gray-600">
                        <span>Disponible para distribuir:</span>
                        <span className="font-semibold" suppressHydrationWarning>${( TOTAL_BUDGET - total ).toLocaleString()}</span>
                    </div>

                    <div className="mt-4">
                        <div className="w-full bg-gray-200 rounded-full h-2 sm:h-3 overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-[#00A8E8] via-[#00E5A0] to-[#00E5A0] transition-all duration-500 ease-out rounded-full"
                                style={{ width: `${( total / TOTAL_BUDGET ) * 100}%` }}
                            />
                        </div>
                        <p className="text-xs text-gray-500 mt-2 text-center" suppressHydrationWarning>
                            {( ( total / TOTAL_BUDGET ) * 100 ).toFixed( 1 )}% distribuido
                        </p>
                    </div>
                </div>

                {/* Submit Button */}
                <button
                    type="submit"
                    disabled={!canVote || loading}
                    className={`w-full py-3 sm:py-4 rounded-xl font-bold text-white transition-all duration-300 text-sm sm:text-base shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 ${!canVote || loading
                        ? 'bg-gray-400 cursor-not-allowed'
                        : 'bg-gradient-to-r from-[#0B5F8C] via-[#00A8E8] to-[#00E5A0] hover:from-[#00A8E8] hover:to-[#00E5A0]'
                        }`}
                >
                    {loading ? (
                        <span className="flex items-center justify-center gap-2">
                            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                            Registrando...
                        </span>
                    ) : isPhase2Complete ? (
                        '✓ Votación completada'
                    ) : (
                        `Registrar Voto - ${votingPhase === 'not-voted' ? 'Fase 1' : 'Fase 2'}`
                    )}
                </button>
            </form>

            {total > 0 && total < TOTAL_BUDGET && canVote && (
                <p className="text-center text-gray-500 text-xs sm:text-sm mt-4 sm:mt-6" suppressHydrationWarning>
                    Has asignado ${total.toLocaleString()} de ${TOTAL_BUDGET.toLocaleString()}
                </p>
            )}
        </div>
    );
}