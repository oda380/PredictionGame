// src/components/ui/Input.jsx
import React from 'react';

/**
 * A styled input field component.
 * @param {object} props - The component's props.
 * @param {string} props.label - The label for the input field.
 * @param {string} props.id - The id for the input field (also used for htmlFor in label).
 * @param {string} [props.type="text"] - The type of the input (e.g., "text", "number", "datetime-local").
 * @param {string|number} [props.value] - The controlled value of the input.
 * @param {Function} [props.onChange] - Function to call when the input value changes.
 * @param {string} [props.placeholder] - Placeholder text for the input.
 * @param {boolean} [props.required] - Whether the input is required.
 * @param {string|number} [props.step] - Step attribute for number inputs.
 * @param {string|number} [props.min] - Min attribute for number inputs.
 * @param {string|number} [props.max] - Max attribute for number inputs.
 * @param {string} [props.name] - Name attribute for the input (defaults to id if not provided).
 * @param {string|number} [props.defaultValue] - The default value for uncontrolled inputs.
 * @returns {JSX.Element} The rendered input component.
 */
const Input = ({ 
    label, 
    id, 
    type = "text", 
    value, 
    onChange, 
    placeholder, 
    required, 
    step, 
    min, 
    max, 
    name, 
    defaultValue 
}) => (
    <div className="mb-4">
        <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">
            {label}
        </label>
        <input
            type={type}
            id={id}
            name={name || id}
            value={value}
            defaultValue={defaultValue}
            onChange={onChange}
            placeholder={placeholder}
            required={required}
            step={step}
            min={min}
            max={max}
            className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
        />
    </div>
);

export default Input;
