'use client';

import { useEffect, useState } from 'react';
import { db } from '@/lib/firebaseConfig';
import { doc, onSnapshot } from 'firebase/firestore';
import Link from 'next/link';
import Image from 'next/image';

const GROUPS = ['Payvo', 'MedSpark', 'TeachMeNow', 'Nouva', 'Univan', 'HavenUp', 'Loqalli', 'Agrored'];

const DESCRIPTIONS: Record<string, string> = {
    'Agrored': 'Agrored es una plataforma que ayuda a los agricultores y vendedores mayoristas a conectar con clientes de forma digital. Ofrecemos acuerdos con respaldo legal y digital, además de servicios logísticos que transforman el caótico mercado en uno más eficiente y confiable. En Agrored, buscamos crear una plataforma donde todos se sientan apoyados y aceptados. ¡No solo te ayudamos en tu negocio, sino que nos convertimos en tu aliado para seguir creciendo!',
    'HavenUp': 'HavenUp! revoluciona el mercado inmobiliario en El Salvador al conectar compradores y vendedores de forma moderna, segura y directa. Nuestra plataforma combina tecnología 3D e inteligencia artificial para explorar, consultar y publicar propiedades con total confianza. Ofrecemos precios justos, procesos rápidos y transparencia en cada paso. Más que vender o comprar, HavenUp! te guía hacia la vivienda de tus sueños. HavenUp! — donde cada conexión puede ser el inicio de un nuevo hogar.',
    'Loqalli': 'Loqalli es una plataforma web que conecta a turistas con la auténtica cultura salvadoreña a través de micro-experiencias únicas. Más que tours, ofrece la oportunidad de aprender de los locales desde hacer tamales hasta crear artesanías y vivir El Salvador desde sus tradiciones. Nuestro objetivo es empoderar a las comunidades locales para compartir su talento, mientras los visitantes descubren el país de una manera más humana, real y significativa.',
    'Univan': 'UniVan es una plataforma digital creada para universitarios ofreciéndoles un servicio de transporte en horarios nocturnos, dándole al universitario la oportunidad de reservar su propio asiento en un viaje seguro, accesible y cómodo. Con UniVan, los estudiantes no son los únicos beneficiados, así mismo creamos un beneficio monetario para los conductores. UniVan smart rides, safe at night.',
    'TeachMeNow': 'TeachMeNow es una plataforma innovadora que impulsa la enseñanza en El Salvador con planes de clase personalizados mediante inteligencia artificial. Mejora la experiencia del docente, se adapta a su estilo y responde a los retos reales del aula. Incluye test adaptados a los diferentes tipos de aprendizaje, para evaluar de forma más precisa y significativa. TeachMeNow: la innovación que transforma la enseñanza y potencia los resultados educativos.',
    'Payvo': 'Payvo nació con la idea de ayudar a que manejar tu dinero sea más fácil y menos estresante. Muchas personas se sienten perdidas con sus gastos y hundidas en deudas y la misión de Payvo es ayudarte a salir de ese hueco y no caer en el mar de deudas. Por eso creamos una app con inteligencia artificial que será tu propio asistente personal, te guiara y te dirá que hacer y que no hacer para mantener un control efectivo de tus finanzas, encontrando la manera más sencilla de salir de deudas y ahorrar para cosas importantes, como el carro que tanto quieres. Además, podrás armar tu propio plan de ahorro, Payvo te indicara cuanto y cuando puedes ahorrar sin tener que dejar de pagar servicios esenciales. Payvo no es solo una app, es un paso más para sentirte seguro y tranquilo con tu dinero.',
    'Nouva': 'Nouva es un sitio web creado para guiar a jóvenes que aún no saben qué carrera universitaria elegir o si realmente poseen las habilidades necesarias para ejercerla. Ofrecemos información sobre universidades del país, sus carreras y los talentos que cada una requiere. Además, contamos con podcasts donde entrevistamos a estudiantes y graduados que comparten su experiencia universitaria. Los usuarios tienen la oportunidad de experimentar retos diseñados para ayudar a sus habilidades y descubrir su verdadera vocación. Nouva: el primer paso hacia tu futuro.',
    'MedSpark': 'MedSpark es una plataforma creada por jóvenes de Supérate Hilasal que transforma cada gasto médico en una oportunidad de ahorro. A través de un sistema de cashback, buscamos que cuidar la salud no sea una carga, sino una ayuda real para las familias salvadoreñas. Creemos que todos merecen acceder a la salud sin preocuparse por el costo, y queremos hacerlo posible juntos. Recuerda, ¡Cuida de tu salud!, ¡Cuida de tu bolsillo!'
};

export default function ResultsPage() {
    const [totals, setTotals] = useState<Record<string, number>>( {} );
    const [loading, setLoading] = useState( true );
    const [lastUpdate, setLastUpdate] = useState<string>( '' );
    const [votingPhase, setVotingPhase] = useState<string | null>( null );
    const [expandedCard, setExpandedCard] = useState<string | null>( null );

    useEffect( () => {
        const phase = localStorage.getItem( 'votingPhase' );
        setVotingPhase( phase );

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

    const getVotingButton = () => {
        if ( votingPhase === 'phase-2-complete' ) {
            return null;
        }

        const buttonText = votingPhase === 'phase-1-complete' ? 'Votar Segunda Fase' : 'Ir a Votar';

        return (
            <Link
                href="/"
                className="bg-gradient-to-r from-green-400 to-cyan-400 text-white px-6 py-2.5 rounded-lg font-semibold hover:from-green-500 hover:to-cyan-500 transition-all duration-200"
            >
                {buttonText}
            </Link>
        );
    };

    if ( loading ) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-lg text-gray-600">Cargando resultados...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white p-6 md:p-12">
            <div className="max-w-5xl mx-auto">
                {/* Logo */}
                <div className='w-full flex justify-center mb-8 md:mb-12'>
                    <Image
                        src="/LogoExpoT.svg"
                        alt="Logo"
                        width={120}
                        height={120}
                        className="md:w-[160px] md:h-[160px]"
                    />
                </div>

                {/* Header */}
                <div className="flex flex-col items-center text-center md:flex-row md:justify-between md:items-center md:text-left mb-8 md:mb-12 gap-4 md:gap-6">
                    <div>
                        <h1 className="text-3xl md:text-5xl font-bold text-gray-900 mb-1">
                            Resultados
                        </h1>
                        <p className="text-cyan-500 text-sm font-medium flex items-center justify-center md:justify-start gap-2">
                            <span className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-pulse"></span>
                            En tiempo real
                        </p>
                    </div>
                    {getVotingButton()}
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 gap-3 mb-8 md:grid-cols-3 md:gap-4 md:mb-12">
                    <div className="bg-gray-50 p-5 md:p-6 rounded-xl border border-gray-200">
                        <p className="text-gray-500 text-xs uppercase tracking-wider mb-1.5 md:mb-2">Total Invertido</p>
                        <p className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-green-500 to-cyan-500 bg-clip-text text-transparent">
                            ${totalInvested.toLocaleString()}
                        </p>
                    </div>

                    <div className="bg-gray-50 p-5 md:p-6 rounded-xl border border-gray-200">
                        <p className="text-gray-500 text-xs uppercase tracking-wider mb-1.5 md:mb-2">Grupos Activos</p>
                        <p className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent">
                            {Object.values( totals ).filter( v => v > 0 ).length}
                        </p>
                    </div>

                    <div className="bg-gray-50 p-5 md:p-6 rounded-xl border border-gray-200">
                        <p className="text-gray-500 text-xs uppercase tracking-wider mb-1.5 md:mb-2">Última Actualización</p>
                        <p className="text-lg md:text-xl font-semibold text-gray-900">
                            {lastUpdate || 'Cargando...'}
                        </p>
                    </div>
                </div>

                {/* Rankings */}
                <div className="space-y-2.5 md:space-y-3">
                    {GROUPS.map( ( group, index ) => {
                        const amount = totals[group] || 0;
                        const percentage = maxAmount > 0 ? ( amount / maxAmount ) * 100 : 0;
                        const totalPercentage = totalInvested > 0 ? ( amount / totalInvested ) * 100 : 0;
                        const isExpanded = expandedCard === group;

                        return (
                            <div
                                key={group}
                                className="group bg-white rounded-xl overflow-hidden border border-gray-200 hover:border-cyan-400 hover:shadow-md transition-all duration-300 cursor-pointer"
                                onClick={() => setExpandedCard( isExpanded ? null : group )}
                            >
                                <div className="p-4 md:p-5">
                                    <div className="flex justify-between items-center mb-3 md:mb-4">
                                        <div className="flex items-center gap-2.5 md:gap-3">
                                            <span className="text-gray-400 text-sm font-medium w-5 md:w-6">
                                                {index + 1}
                                            </span>
                                            <span className="font-semibold text-base md:text-lg text-gray-900">{group}</span>
                                        </div>
                                        <span className="text-xl md:text-2xl font-bold text-gray-900">
                                            ${amount.toLocaleString()}
                                        </span>
                                    </div>

                                    {/* Barra de progreso */}
                                    <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden mb-2.5 md:mb-3">
                                        <div
                                            className="bg-gradient-to-r from-green-400 to-cyan-400 h-full rounded-full transition-all duration-500"
                                            style={{ width: `${percentage}%` }}
                                        />
                                    </div>

                                    {/* Estadísticas */}
                                    <div className="flex justify-between text-xs text-gray-500 gap-2">
                                        <span className="truncate">Del total: {totalPercentage.toFixed( 1 )}%</span>
                                        <span className="whitespace-nowrap">Participación: {( ( amount / 10000 ) * 100 ).toFixed( 2 )}%</span>
                                    </div>

                                    {/* Descripción expandible */}
                                    <div
                                        className={`overflow-hidden transition-all duration-500 ease-in-out ${isExpanded ? 'max-h-96 opacity-100 mt-4' : 'max-h-0 opacity-0'
                                            }`}
                                    >
                                        <div className="pt-4 border-t border-gray-200">
                                            <div className="bg-gradient-to-r from-green-50 to-cyan-50 p-4 rounded-lg">
                                                <p className="text-sm md:text-base text-gray-700 leading-relaxed">
                                                    {DESCRIPTIONS[group]}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Indicador de expandir/contraer */}
                                <div className="px-4 pb-3 flex justify-center">
                                    <div className={`text-xs text-cyan-500 font-medium flex items-center gap-1 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''
                                        }`}>
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </div>
                                </div>
                            </div>
                        );
                    } )}
                </div>

                {/* Footer Info */}
                <div className="mt-8 md:mt-10 text-center">
                    <p className="text-gray-500 text-xs md:text-sm flex items-center justify-center gap-2 px-4">
                        <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse flex-shrink-0"></span>
                        <span>Actualización automática en tiempo real</span>
                    </p>
                    <p className="text-gray-400 text-xs mt-3 md:mt-4 uppercase tracking-widest">
                        Expo de Logros • Next Mile
                    </p>
                </div>
            </div>
        </div>
    );
}