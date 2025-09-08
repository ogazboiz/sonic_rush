import SonicRushDashboard from '@/components/Dashboard';
import ClientOnly from '@/components/ClientOnly';

export default function Home() {
  return (
    <ClientOnly fallback={
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading SonicRush...</p>
        </div>
      </div>
    }>
      <SonicRushDashboard />
    </ClientOnly>
  );
}
