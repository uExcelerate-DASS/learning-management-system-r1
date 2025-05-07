import React, { useState } from "react";
import { Menu, Search } from "lucide-react";

interface HeaderProps {
  user: any;
  isSidebarOpen: boolean;
  setIsSidebarOpen: (isOpen: boolean) => void;
  handleLogout: () => void;
  showSearch?: boolean;
  onSearch?: (searchTerm: string) => void;
}

const Header: React.FC<HeaderProps> = ({
  user,
  isSidebarOpen,
  setIsSidebarOpen,
  handleLogout,
  showSearch = true,
  onSearch
}) => {
  const [searchTerm, setSearchTerm] = useState("");

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    if (onSearch) {
      onSearch(value);
    }
  };

  return (
    <header className="h-[65px] bg-white border-b flex items-center justify-between px-8">
      <div className="flex items-center gap-4">
        {!isSidebarOpen && (
          <button 
            onClick={() => setIsSidebarOpen(true)} 
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <Menu size={20} />
          </button>
        )}
        
        {showSearch && (
          <div className="flex items-center bg-[#F6E5FD] border rounded-lg px-4 py-2 w-[767px]">
            <Search size={18} className="text-gray-500 mr-2" />
            <input 
              type="text" 
              placeholder="Search courses, interests, and content..." 
              className="bg-transparent outline-none w-full"
              value={searchTerm}
              onChange={handleSearchChange}
            />
            {searchTerm && (
              <button 
                onClick={() => {
                  setSearchTerm("");
                  if (onSearch) onSearch("");
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            )}
          </div>
        )}
      </div>
      
      <div className="flex items-center gap-4">
        <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
          {user?.name?.[0] || "U"}
        </div>
        <span className="text-sm font-medium">{user?.name || "User"}</span>
        <button 
          onClick={handleLogout} 
          className="text-sm text-[#8C5AFF] hover:underline"
        >
          Logout
        </button>
      </div>
    </header>
  );
};

export default Header;