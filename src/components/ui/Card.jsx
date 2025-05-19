// src/components/ui/Card.jsx
import React from 'react';

/**
 * A card component for grouping content.
 * @param {object} props - The component's props.
 * @param {React.ReactNode} props.children - The content to display within the card.
 * @param {string} [props.title] - An optional title for the card.
 * @param {string} [props.titleColor="text-blue-600"] - Tailwind CSS class for the title color.
 * @param {string} [props.className=""] - Additional CSS classes to apply to the card container.
 * @returns {JSX.Element} The rendered card component.
 */
const Card = ({ children, title, titleColor = "text-blue-600", className = "" }) => (
    <div className={`bg-white p-6 rounded-lg shadow-md mb-6 ${className}`}>
        {title && <h2 className={`text-xl font-semibold mb-4 ${titleColor}`}>{title}</h2>}
        {children}
    </div>
);

export default Card;
