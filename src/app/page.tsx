'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebaseConfig';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import Link from 'next/link';

const GROUPS = ['Grupo1', 'Grupo2', 'Grupo3', 'Grupo4', 'Grupo5', 'Grupo6', 'Grupo7', 'Grupo8'];
const TOTAL_BUDGET = 10000;

export default function Home() {
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
  const remaining = TOTAL_BUDGET - total;

  const handleChange = ( group: string, value: string ) => {
    const num = Math.max( 0, Math.min( TOTAL_BUDGET, parseInt( value ) || 0 ) );
    setDistribution( ( prev ) => ( { ...prev, [group]: num } ) );
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-lg p-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Inversión Virtual</h1>
            <p className="text-gray-600">Distribuye $10,000 entre 8 grupos</p>
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
            {GROUPS.map( ( group ) => (
              <div key={group} className="flex items-center gap-4 bg-gray-50 p-4 rounded-lg">
                <label className="w-24 font-semibold text-gray-700">{group}</label>
                <input
                  type="number"
                  min="0"
                  max={TOTAL_BUDGET}
                  value={distribution[group]}
                  onChange={( e ) => handleChange( group, e.target.value )}
                  disabled={hasVoted}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-200 disabled:cursor-not-allowed"
                />
                <span className="w-24 text-right text-indigo-600 font-bold" suppressHydrationWarning>${distribution[group].toLocaleString()}</span>
              </div>
            ) )}
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
          <p className="text-center text-gray-500 text-sm mt-4">
            Has asignado ${total.toLocaleString()} de ${TOTAL_BUDGET.toLocaleString()}
          </p>
        )}
      </div>
    </div>
  );
}