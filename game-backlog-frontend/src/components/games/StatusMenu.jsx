import { Check, Play, ShoppingCart, Trash2, HelpCircle } from 'lucide-react';

const StatusMenu = ({ currentStatus, onSelect, onClose }) => {
  const statuses = [
    { 
      id: null, 
      label: 'Not Played', 
      icon: HelpCircle, 
      color: 'bg-gray-600 hover:bg-gray-500' 
    },
    { 
      id: 'completed', 
      label: 'Completed', 
      icon: Check, 
      color: 'bg-green-600 hover:bg-green-500' 
    },
    { 
      id: 'playing', 
      label: 'Playing', 
      icon: Play, 
      color: 'bg-blue-600 hover:bg-blue-500' 
    },
    { 
      id: 'wishlist', 
      label: 'Wishlist', 
      icon: ShoppingCart, 
      color: 'bg-cyan-600 hover:bg-cyan-500' 
    },
    { 
      id: 'dropped', 
      label: 'Dropped', 
      icon: Trash2, 
      color: 'bg-red-600 hover:bg-red-500' 
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

      {/* Menu - Ahora con posición relativa al contenedor */}
      <div className="absolute left-0 top-0 mt-2 z-50 bg-primary-navy-dark rounded-lg shadow-2xl p-2 w-48 border border-gray-700">
        {statuses.map((status) => {
          const Icon = status.icon;
          const isSelected = currentStatus === status.id;

          return (
            <button
              key={status.id || 'none'}
              onClick={() => {
                onSelect(status.id);
                onClose();
              }}
              className={`w-full flex items-center space-x-3 px-3 py-2 rounded transition-all ${
                isSelected 
                  ? 'bg-white bg-opacity-20' 
                  : 'hover:bg-white hover:bg-opacity-10'
              }`}
            >
              <div className={`p-1.5 rounded ${status.color}`}>
                <Icon size={16} className="text-white" />
              </div>
              <span className="text-white text-sm font-medium">{status.label}</span>
            </button>
          );
        })}
      </div>
    </>
  );
};

export default StatusMenu;