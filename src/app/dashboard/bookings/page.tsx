import BookingsCalendar from '@/components/dashboard/BookingsCalendar'

export default function BookingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Bookings Calendar</h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          View and manage scheduled demos and calls.
        </p>
      </div>

      <div className="bg-white dark:bg-[#1A1A1A] border border-gray-200 dark:border-[#262626] shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <BookingsCalendar />
        </div>
      </div>
    </div>
  )
}


