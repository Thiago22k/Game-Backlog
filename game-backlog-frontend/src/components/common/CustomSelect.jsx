import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

/**
 * A custom, styled select component to replace the native <select>.
 * 
 * Props:
 * - options: Array of { value, label }
 * - value: Selected value
 * - onChange: Function called with new value
 * - className: Additional classes for the trigger button
 * - align: 'left' | 'right' (default: 'left') for the dropdown menu
 */
const CustomSelect = ({
    options,
    value,
    onChange,
    className = '',
    containerClassName = 'inline-block',
    align = 'left',
    disabled = false
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef(null);

    const selectedOption = options.find(opt => opt.value === value) || options[0];

    // Close when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleToggle = () => {
        if (!disabled) {
            setIsOpen(!isOpen);
        }
    };

    return (
        <div className={`relative ${containerClassName}`} ref={containerRef}>
            {/* Trigger Button */}
            <button
                type="button"
                onClick={handleToggle}
                disabled={disabled}
                className={`flex items-center justify-between gap-3 px-4 py-2 bg-primary-navy-dark text-white rounded-xl text-sm transition-all focus:outline-none ${disabled ? 'opacity-40 cursor-not-allowed' : 'active:scale-95'
                    } ${className}`}
            >
                <span className="font-medium">{selectedOption?.label}</span>
                <ChevronDown
                    size={16}
                    className={`text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                />
            </button>

            {/* Dropdown Menu */}
            {isOpen && !disabled && (
                <div
                    className={`absolute z-50 mt-2 w-max min-w-[160px] bg-primary-navy-dark border border-white/10 rounded-xl shadow-2xl py-1.5 animate-in fade-in zoom-in duration-200 origin-top ${align === 'right' ? 'right-0' : 'left-0'
                        }`}
                >
                    {options.map((option) => (
                        <button
                            key={option.value}
                            type="button"
                            onClick={() => {
                                onChange(option.value);
                                setIsOpen(false);
                            }}
                            className={`w-full text-left px-4 py-2 text-sm transition-colors flex items-center justify-between group ${value === option.value
                                ? 'text-primary-yellow bg-primary-yellow/5 font-semibold'
                                : 'text-gray-300 hover:text-white hover:bg-white/5'
                                }`}
                        >
                            {option.label}
                            {value === option.value && (
                                <div className="w-1.5 h-1.5 rounded-full bg-primary-yellow animate-pulse" />
                            )}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

export default CustomSelect;
