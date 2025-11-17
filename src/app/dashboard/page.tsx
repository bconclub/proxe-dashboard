import { createClient } from '@/lib/supabase/server'
import MetricsDashboard from '@/components/dashboard/MetricsDashboard'
import LeadsTable from '@/components/dashboard/LeadsTable'
import BookingsCalendar from '@/components/dashboard/BookingsCalendar'
import { 
  MdLanguage,
  MdWhatsapp,
  MdPhone,
  MdVideoLibrary,
} from 'react-icons/md'

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Dashboard Overview</h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Welcome back! Here's what's happening with your leads and bookings.
        </p>
      </div>

      {/* Metrics Cards */}
      <MetricsDashboard />

      {/* Channel Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <a href="/dashboard/channels/web" className="bg-white dark:bg-[#1A1A1A] border border-gray-200 dark:border-[#262626] shadow rounded-lg p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Web PROXe</h3>
            </div>
            <MdLanguage className="w-12 h-12 text-gray-600 dark:text-gray-400" />
          </div>
        </a>
        <a href="/dashboard/channels/whatsapp" className="bg-white dark:bg-[#1A1A1A] border border-gray-200 dark:border-[#262626] shadow rounded-lg p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">WhatsApp PROXe</h3>
            </div>
            <MdWhatsapp className="w-12 h-12 text-gray-600 dark:text-gray-400" />
          </div>
        </a>
        <a href="/dashboard/channels/voice" className="bg-white dark:bg-[#1A1A1A] border border-gray-200 dark:border-[#262626] shadow rounded-lg p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Voice PROXe</h3>
            </div>
            <MdPhone className="w-12 h-12 text-gray-600 dark:text-gray-400" />
          </div>
        </a>
        <a href="/dashboard/channels/social" className="bg-white dark:bg-[#1A1A1A] border border-gray-200 dark:border-[#262626] shadow rounded-lg p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Social PROXe</h3>
            </div>
            <MdVideoLibrary className="w-12 h-12 text-gray-600 dark:text-gray-400" />
          </div>
        </a>
      </div>

      {/* Recent Leads */}
      <div className="bg-white dark:bg-[#1A1A1A] border border-gray-200 dark:border-[#262626] shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Recent Leads</h2>
          <LeadsTable limit={10} />
        </div>
      </div>

      {/* Upcoming Bookings */}
      <div className="bg-white dark:bg-[#1A1A1A] border border-gray-200 dark:border-[#262626] shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Upcoming Bookings</h2>
          <BookingsCalendar view="upcoming" />
        </div>
      </div>
    </div>
  )
}

