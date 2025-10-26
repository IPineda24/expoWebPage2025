// src/app/page.tsx
import VotingForm from "./components/VotingForm";
import Image from 'next/image';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#031b2e] via-[#085883] to-[#93134c] p-4 sm:p-6 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Logo o título del evento (opcional) */}
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-2 tracking-tight">
            <div className='w-full flex justify-center'>
              {/* Logo */}
              <div className='w-full flex justify-center mb-8 md:mb-12'>
                <Image
                  src="/public/LogoExpoWw.svg"
                  alt="Logo"
                  width={120}
                  height={120}
                  className="md:w-[160px] md:h-[160px]"
                />
              </div>
            </div>
          </h1>

          <p className="text-cyan-200 text-sm sm:text-base">Expo de Logros 2025</p>
        </div>

        <VotingForm />

        {/* Aquí puedes agregar más componentes a futuro */}
      </div>
    </div>
  );
}