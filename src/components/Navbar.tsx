
import React, { useState } from 'react';
import { MapPin, ChevronDown, Bell } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { buildFromState } from '@/utils/navigation';

interface NavbarProps {
  location?: string;
}

const Navbar: React.FC<NavbarProps> = ({ location: locationLabel = "深圳" }) => {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const routerLocation = useLocation();
  
  const handleLocationSelect = () => {
    setIsOpen(false);
    navigate('/city-selector', { state: buildFromState(routerLocation) });
  };
  
  return (
    <header
      className="fixed left-1/2 top-0 z-[90] w-full max-w-md -translate-x-1/2 shadow-sm"
      style={{
        paddingTop: 'env(safe-area-inset-top)',
        background: 'rgb(121, 213, 199)',
      }}
    >
      <div className="flex items-center justify-between h-12 px-4">
        <div className="text-white font-semibold text-[17px]">问问</div>
        
        <div className="flex items-center gap-2">
          <button
            className="relative p-1.5"
            onClick={() => navigate('/notifications', { state: buildFromState(routerLocation) })}
          >
            <Bell size={18} className="text-white" />
            <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 bg-destructive rounded-full"></span>
          </button>
          
          <button 
            className="flex items-center gap-1 text-white text-xs px-2 py-1 rounded-full bg-white/20"
            onClick={handleLocationSelect}
          >
            <MapPin size={12} className="text-white" />
            <span>{locationLabel}</span>
            <ChevronDown size={12} />
          </button>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
