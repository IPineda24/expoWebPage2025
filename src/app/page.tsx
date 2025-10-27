
'use client';
// src/app/page.tsx
import VotingForm from "./components/VotingForm";
import Carrousel from "./components/Carousel";
import Image from "next/image";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#031b2e] via-[#085883] to-[#2d9313] p-4 sm:p-6 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Logo o título del evento (opcional) */ }
        <div className="text-center">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white  tracking-tight">
            <div className='w-full flex justify-center'>
              {/* Logo */ }
              <div className='w-full flex justify-center'>
                <Image
                  src="/LogoW.svg"
                  alt="LogoW"
                  width={ 200 }
                  height={ 150 }
                  className="md:w-[200px] md:h-[100px]"
                />
              </div>
            </div>
          </h1>

          <div>
            <Carrousel />
          </div>

          <p className="text-cyan-200 mt-8 text-sm sm:text-base">Expo de Logros 2025</p>
        </div>


        <VotingForm />

      </div>
    </div>
  );
}