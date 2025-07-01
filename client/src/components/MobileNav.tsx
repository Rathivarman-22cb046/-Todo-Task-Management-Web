import { CheckCircle, Share2, Users, User } from "lucide-react";

export function MobileNav() {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-4 py-2 z-40">
      <div className="flex justify-around">
        <button className="flex flex-col items-center py-2 px-3 text-primary-600">
          <CheckCircle className="w-5 h-5 mb-1" />
          <span className="text-xs font-medium">Tasks</span>
        </button>
        <button className="flex flex-col items-center py-2 px-3 text-slate-600">
          <Share2 className="w-5 h-5 mb-1" />
          <span className="text-xs font-medium">Shared</span>
        </button>
        <button className="flex flex-col items-center py-2 px-3 text-slate-600">
          <Users className="w-5 h-5 mb-1" />
          <span className="text-xs font-medium">Teams</span>
        </button>
        <button className="flex flex-col items-center py-2 px-3 text-slate-600">
          <User className="w-5 h-5 mb-1" />
          <span className="text-xs font-medium">Profile</span>
        </button>
      </div>
    </nav>
  );
}
