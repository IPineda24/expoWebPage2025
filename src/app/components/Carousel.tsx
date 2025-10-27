'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

export default function Carrousel() {
    const [currentIndex, setCurrentIndex] = useState( 0 );

    // Las 8 marcas de tu proyecto
    const brands = [
        { src: '/Agrored.png', name: 'Agrored' },
        { src: '/HavenUP.png', name: 'HavenUP' },
        { src: '/Loqalli.jpg', name: 'Loqalli' },
        { src: '/MedSpark.jpeg', name: 'MedSpark' },
        { src: '/NoUva.jpg', name: 'NoUva' },
        { src: '/Payvo.png', name: 'Payvo' },
        { src: '/TeachMeNow.png', name: 'TeachMeNow' },
        { src: '/UniVan.jpg', name: 'UniVan' }
    ];

    // Carrusel automático que cambia cada 3 segundos
    useEffect( () => {
        const interval = setInterval( () => {
            setCurrentIndex( ( prev ) => ( prev + 1 ) % brands.length );
        }, 3000 );

        return () => clearInterval( interval );
    }, [brands.length] );

    return (
        <div className="w-full max-w-2xl mx-auto ">
            <div className="relative h-40 sm:h-48 bg-white backdrop-blur-sm rounded-xl overflow-hidden shadow-lg">
                {/* Logos animados */ }
                { brands.map( ( brand, index ) => (
                    <div
                        key={ brand.name }
                        className={ `absolute inset-0 flex items-center justify-center p-6 transition-all duration-700 ${index === currentIndex
                            ? 'opacity-100 scale-100'
                            : 'opacity-0 scale-95'
                            }` }
                    >
                        <div className="relative w-full h-full flex items-center justify-center">
                            <Image
                                src={ brand.src }
                                alt={ brand.name }
                                fill
                                className="object-contain"
                                sizes="(max-width: 768px) 280px, 320px"
                                priority={ index === 0 }
                            />
                        </div>
                    </div>
                ) ) }

                {/* Indicadores de puntos */ }
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                    { brands.map( ( brand, index ) => (
                        <div
                            key={ brand.name }
                            className={ `h-1.5 rounded-full transition-all duration-300 ${index === currentIndex
                                ? 'w-6 bg-cyan-400'
                                : 'w-1.5 bg-white/40'
                                }` }
                        />
                    ) ) }
                </div>
            </div>
        </div>
    );
}