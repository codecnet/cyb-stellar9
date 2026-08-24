export function Footer() {
  return (
    <footer className="w-full">
      <div className="border-t border-slate-200/80 bg-white">
        <div className="relative flex items-center justify-center py-3">
          <div className="absolute left-4 sm:left-6 lg:left-8">
            <p className="text-sm text-slate-500">
              © {new Date().getFullYear()} All rights reserved
            </p>
          </div>
          <p className="text-sm text-slate-600 whitespace-nowrap">
            Powered by{' '}
            <span className="font-semibold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
              Stellar9
            </span>
          </p>
        </div>
      </div>
    </footer>
  )
} 