// src/app/page.tsx
import VotingForm from "./components/VotingForm";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-2xl mx-auto">
        <VotingForm />

        {/* Aquí puedes agregar más componentes y contenido a futuro */}
      </div>
    </div>
  );
}