import { Check, Play, ShoppingCart, Trash2, HelpCircle, Archive } from 'lucide-react';

const StatusMenu = ({ currentStatus, onSelect, onClose }) => {
  const statuses = [
    {
      id: null,
      label: 'Not in Library',
      icon: HelpCircle,
      iconColor: 'bg-gray-600',
      activeBg: 'bg-gray-500/20 border-gray-500/40 text-gray-200',
      checkColor: 'text-gray-300',
    },
    {
      id: 'completed',
      label: 'Completed',
      icon: Check,
      iconColor: 'bg-emerald-600',
      activeBg: 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300',
      checkColor: 'text-emerald-400',
    },
    {
      id: 'playing',
      label: 'Playing',
      icon: Play,
      iconColor: 'bg-blue-600',
      activeBg: 'bg-blue-500/20 border-blue-500/40 text-blue-300',
      checkColor: 'text-blue-400',
    },
    {
      id: 'wishlist',
      label: 'Wishlist',
      icon: ShoppingCart,
      iconColor: 'bg-cyan-600',
      activeBg: 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300',
      checkColor: 'text-cyan-400',
    },
    {
      id: 'backlog',
      label: 'Backlog',
      icon: Archive,
      iconColor: 'bg-purple-600',
      activeBg: 'bg-purple-500/20 border-purple-500/40 text-purple-300',
      checkColor: 'text-purple-400',
    },
    {
      id: 'dropped',
      label: 'Dropped',
      icon: Trash2,
      iconColor: 'bg-red-600',
      activeBg: 'bg-red-500/20 border-red-500/40 text-red-300',
      checkColor: 'text-red-400',
    },
  ];

  return (
    <>
      {/* Overlay para cerrar al hacer click fuera */}
      <div
        className="fixed inset-0 z-40 pointer-events-auto"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
      />

      {/* Menu flotante sobre la tarjeta */}
      <div className="absolute left-0 top-0 mt-2 z-50 bg-primary-navy-dark rounded-xl shadow-2xl p-1.5 w-52 border border-white/10 backdrop-blur-md">
        <div className="px-2.5 py-1.5 mb-1 border-b border-white/5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
            Estado
          </p>
        </div>

        <div className="space-y-0.5">
          {statuses.map((status) => {
            const Icon = status.icon;
            const isSelected = currentStatus === status.id;

            return (
              <button
                key={status.id || 'none'}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect(status.id);
                  onClose();
                }}
                className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer border ${
                  isSelected
                    ? `${status.activeBg} font-bold shadow-sm`
                    : 'border-transparent text-gray-300 hover:text-white hover:bg-white/[0.08]'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={`p-1.5 rounded-md ${status.iconColor} text-white shrink-0 shadow-sm`}>
                    <Icon size={14} className="text-white" />
                  </div>
                  <span className="truncate">{status.label}</span>
                </div>

                {isSelected && (
                  <Check size={14} className={`shrink-0 ml-2 ${status.checkColor}`} />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
};

export default StatusMenu;
