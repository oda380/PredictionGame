// src/components/ui/Notification.jsx
import React from 'react';

/**
 * A notification component to display messages.
 * @param {object} props - The component's props.
 * @param {string} props.message - The message to display. If empty, the component is not rendered.
 * @param {string} props.type - The type of notification ('error' or 'success'), affects background color.
 * @param {Function} props.onDismiss - Function to call when the dismiss button is clicked.
 * @returns {JSX.Element|null} The rendered notification or null.
 */
const Notification = ({ message, type, onDismiss }) => {
    if (!message) return null;

    // Determine background color based on notification type
    const bgColor = type === 'error' ? 'bg-red-500' : 'bg-green-500';

    return (
        <div className={`fixed bottom-5 right-5 text-white p-4 rounded-lg shadow-lg ${bgColor} z-50 transition-opacity duration-300 ease-in-out`}>
            {message}
            <button 
                onClick={onDismiss} 
                className="ml-4 font-bold hover:text-gray-200"
                aria-label="Dismiss notification" // Accessibility improvement
            >
                X
            </button>
        </div>
    );
};

export default Notification;
