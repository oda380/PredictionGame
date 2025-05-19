// src/components/ui/Button.jsx
import React from 'react';

/**
 * A general-purpose button component with variants.
 * @param {object} props - The component's props.
 * @param {React.ReactNode} props.children - The content of the button.
 * @param {Function} props.onClick - Function to call when the button is clicked.
 * @param {string} [props.type="button"] - The type of the button (e.g., "button", "submit").
 * @param {string} [props.variant="primary"] - The visual style of the button ("primary", "secondary", "danger", "warning").
 * @param {string} [props.className=""] - Additional CSS classes to apply to the button.
 * @param {boolean} [props.disabled=false] - Whether the button is disabled.
 * @returns {JSX.Element} The rendered button component.
 */
const Button = ({ children, onClick, type = "button", variant = "primary", className = "", disabled = false }) => {
    // Base styles for all buttons
    const baseStyle = "px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors duration-150 ease-in-out";
    
    // Variant-specific styles
    let variantStyle = "";
    switch (variant) {
        case "secondary":
            variantStyle = "text-white bg-gray-600 hover:bg-gray-700 focus:ring-gray-500";
            break;
        case "danger":
            variantStyle = "text-white bg-red-600 hover:bg-red-700 focus:ring-red-500";
            break;
        case "warning":
            variantStyle = "text-white bg-amber-500 hover:bg-amber-600 focus:ring-amber-400";
            break;
        case "primary": // Default case
        default:
            variantStyle = "text-white bg-blue-600 hover:bg-blue-700 focus:ring-blue-500";
    }

    return (
        <button 
            type={type} 
            onClick={onClick} 
            disabled={disabled}
            className={`${baseStyle} ${variantStyle} ${className} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
            {children}
        </button>
    );
};

export default Button;
