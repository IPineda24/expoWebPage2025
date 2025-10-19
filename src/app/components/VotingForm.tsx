// src/components/VotingForm.tsx
'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebaseConfig';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import Link from 'next/link';

const GROUPS = ['Payvo', 'Univan', 'Loqalli', 'TeachmeNow', 'Nouva', 'HavenUp', 'MedSpark', 'Agrored'];
const TOTAL_BUDGET = 10000;

export default function VotingForm() {
    const [distribution, setDistribution] = useState<Record<string, number>>(
        GROUPS.reduce( ( acc, group ) => ( { ...acc, [group]: 0 } ), {} )
    );

    const [hasVoted, setHasVoted] = useState( false );
    const [loading, setLoading] = useState( false );
    const [error, setError] = useState<string | null>( null );
    const [success, setSuccess] = useState( false );

    // Verificar si ya votó desde localStorage
    useEffect( () => {
        const voted = localStorage.getItem( 'hasVoted' );
        if ( voted ) {
            setHasVoted( true );
        }
    }, [] );

    const total = Object.values( distribution ).reduce( ( a, b ) => a + b, 0 );

    const handleChange = ( group: string, value: string ) => {
        const num = parseInt( value ) || 0;
        const currentGroupValue = distribution[group];
        const otherGroupsTotal = total - currentGroupValue;
        const maxAllowed = TOTAL_BUDGET - otherGroupsTotal;

        if ( num > maxAllowed ) {
            return; // No permitir exceder el presupuesto
        }

        setDistribution( ( prev ) => ( { ...prev, [group]: Math.max( 0, num ) } ) );
    };

    const handleSubmit = async ( e: React.FormEvent ) => {
        e.preventDefault();
        setError( null );

        setLoading( true );
        try {
            const groupsDocRef = doc( db, 'groups', 'totales' );
            const groupsDoc = await getDoc( groupsDocRef );

            if ( groupsDoc.exists() ) {
                const currentTotals = groupsDoc.data();
                const updatedTotals = { ...currentTotals };

                GROUPS.forEach( ( group ) => {
                    updatedTotals[group] = ( updatedTotals[group] || 0 ) + distribution[group];
                } );

                await updateDoc( groupsDocRef, updatedTotals );

                // Marcar como votado en localStorage
                localStorage.setItem( 'hasVoted', 'true' );
                setSuccess( true );
                setHasVoted( true );
            }
        } catch ( err ) {
            setError( err instanceof Error ? err.message : 'Error al registrar el voto' );
        } finally {
            setLoading( false );
        }
    };

    return (
        <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800">Inversión Virtual</h1>
                    <p className="text-gray-600">Distribuye tu inversión entre 8 grupos</p>
                </div>
                <Link href="/results" className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-semibold">
                    Ver Resultados
                </Link>
            </div>

            {hasVoted && (
                <div className="bg-green-100 border-l-4 border-green-500 p-4 mb-6 rounded">
                    <p className="text-green-700 font-semibold">✓ Ya has votado</p>
                    <p className="text-green-600 text-sm">Solo se permite un voto por dispositivo.</p>
                </div>
            )}

            {success && (
                <div className="bg-green-100 border-l-4 border-green-500 p-4 mb-6 rounded">
                    <p className="text-green-700 font-semibold">✓ Voto registrado correctamente</p>
                </div>
            )}

            {error && (
                <div className="bg-red-100 border-l-4 border-red-500 p-4 mb-6 rounded">
                    <p className="text-red-700">{error}</p>
                </div>
            )}

            <form onSubmit={handleSubmit}>
                <div className="space-y-4 mb-6">
                    {GROUPS.map( ( group ) => {
                        const maxAllowed = TOTAL_BUDGET - ( total - distribution[group] );
                        return (
                            <div key={group} className="flex items-center gap-4 bg-gray-50 p-4 rounded-lg">
                                <label className="w-24 font-semibold text-gray-700">{group}</label>
                                <input
                                    type="number"
                                    min="0"
                                    max={maxAllowed}
                                    value={distribution[group]}
                                    onChange={( e ) => handleChange( group, e.target.value )}
                                    disabled={hasVoted}
                                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-200 disabled:cursor-not-allowed"
                                />
                                <span className="w-24 text-right text-indigo-600 font-bold" suppressHydrationWarning>
                                    ${distribution[group].toLocaleString()}
                                </span>
                            </div>
                        );
                    } )}
                </div>

                <div className="bg-indigo-50 p-4 rounded-lg mb-6 border-2 border-indigo-200" suppressHydrationWarning>
                    <div className="flex justify-between mb-2">
                        <span className="font-semibold text-gray-700">Total a invertir:</span>
                        <span className="font-bold text-lg text-indigo-600">
                            ${total.toLocaleString()}
                        </span>
                    </div>
                    <div className="flex justify-between text-sm text-gray-600">
                        <span>Disponible para distribuir:</span>
                        <span suppressHydrationWarning>${( TOTAL_BUDGET - total ).toLocaleString()}</span>
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={hasVoted || loading}
                    className={`w-full py-3 rounded-lg font-bold text-white transition ${hasVoted || loading
                        ? 'bg-gray-400 cursor-not-allowed'
                        : 'bg-indigo-600 hover:bg-indigo-700'
                        }`}
                >
                    {loading ? 'Registrando...' : hasVoted ? 'Ya has votado' : 'Registrar Voto'}
                </button>
            </form>

            {total > 0 && total < TOTAL_BUDGET && (
                <p className="text-center text-gray-500 text-sm mt-4" suppressHydrationWarning>
                    Has asignado ${total.toLocaleString()} de ${TOTAL_BUDGET.toLocaleString()}
                </p>
            )}
        </div>
    );
}