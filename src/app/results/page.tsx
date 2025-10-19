'use client';

import { useEffect, useState } from 'react';
import { db } from '@/lib/firebaseConfig';
import { doc, onSnapshot } from 'firebase/firestore';
import Link from 'next/link';
import Image from 'next/image';

const GROUPS = ['Payvo', 'Univan', 'Loqalli', 'TeachmeNow', 'Nouva', 'HavenUp', 'MedSpark', 'Agrored'];

export default function ResultsPage() {
    const [totals, setTotals] = useState<Record<string, number>>( {} );
    const [loading, setLoading] = useState( true );
    const [lastUpdate, setLastUpdate] = useState<string>( '' );

    useEffect( () => {
        const docRef = doc( db, 'groups', 'totales' );

        const unsubscribe = onSnapshot( docRef, ( docSnap ) => {
            if ( docSnap.exists() ) {
                setTotals( docSnap.data() as Record<string, number> );
                setLastUpdate( new Date().toLocaleTimeString( 'es-ES' ) );
            }
            setLoading( false );
        } );

        return () => unsubscribe();
    }, [] );

    const totalInvested = Object.values( totals ).reduce( ( a, b ) => a + b, 0 );
    const maxAmount = Math.max( ...Object.values( totals ), 1 );

    if ( loading ) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 flex items-center justify-center">
                <p className="text-xl text-gray-700">Cargando resultados...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-100 to-purple-100 p-8">
            <div className='w-full flex justify-center'>
                <Image
                    src="/LogoExpoT.svg"
                    alt="Logo"
                    width={150}
                    height={150}
                />
            </div>

            <div className="max-w-4xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-4xl font-bold text-black">Resultados en Tiempo Real</h1>
                    <Link href="/" className="bg-white hover:bg-gray-100 text-black px-6 py-2 rounded-lg font-semibold">
                        Ir a Votar
                    </Link>
                </div>

                <div className="bg-white rounded-lg shadow-xl p-8 mb-8">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                        <div className="bg-indigo-50 p-6 rounded-lg">
                            <p className="text-gray-600 text-sm font-semibold">Total Invertido</p>
                            <p className="text-3xl font-bold text-indigo-600 mt-2">${totalInvested.toLocaleString()}</p>
                        </div>
                        <div className="bg-green-50 p-6 rounded-lg">
                            <p className="text-gray-600 text-sm font-semibold">Grupos Activos</p>
                            <p className="text-3xl font-bold text-green-600 mt-2">
                                {Object.values( totals ).filter( v => v > 0 ).length}
                            </p>
                        </div>
                        <div className="bg-purple-50 p-6 rounded-lg">
                            <p className="text-gray-600 text-sm font-semibold">Última Actualización</p>
                            <p className="text-lg font-semibold text-purple-600 mt-2">{lastUpdate || 'Cargando...'}</p>
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    {GROUPS.map( ( group ) => {
                        const amount = totals[group] || 0;
                        const percentage = maxAmount > 0 ? ( amount / maxAmount ) * 100 : 0;
                        const totalPercentage = totalInvested > 0 ? ( amount / totalInvested ) * 100 : 0;

                        return (
                            <div key={group} className="bg-white rounded-lg shadow-lg overflow-hidden">
                                <div className="p-6">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="font-bold text-lg text-gray-800">{group}</span>
                                        <span className="text-2xl font-bold text-indigo-600">${amount.toLocaleString()}</span>
                                    </div>

                                    <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden mb-2">
                                        <div
                                            className="bg-gradient-to-r from-indigo-500 to-purple-600 h-4 rounded-full transition-all duration-500 ease-out"
                                            style={{ width: `${percentage}%` }}
                                        />
                                    </div>

                                    <div className="flex justify-between text-sm text-gray-600">
                                        <span>Porcentaje del total: {totalPercentage.toFixed( 1 )}%</span>
                                        <span>Participación: {( ( amount / 10000 ) * 100 ).toFixed( 2 )}%</span>
                                    </div>
                                </div>
                            </div>
                        );
                    } )}
                </div>

                <div className="mt-8 bg-gray-50 rounded-lg p-6 text-center text-gray-600 text-sm">
                    <p>Los resultados se actualizan automáticamente cada vez que alguien vota</p>
                </div>
            </div>
        </div>
    );
}