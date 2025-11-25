import React, { useState, useEffect, useRef } from 'react';

const MinecraftChat = ({ messages, isOpen, onClose, onSend, alwaysShowMessages = false }) => {
    const [inputValue, setInputValue] = useState('');
    const inputRef = useRef(null);
    const messagesEndRef = useRef(null);

    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isOpen]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (inputValue.trim()) {
            onSend(inputValue.trim());
            setInputValue('');
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
            e.preventDefault();
            onClose();
        }
    };

    const shouldShowMessages = alwaysShowMessages || isOpen;

    if (!shouldShowMessages && messages.length === 0) return null;

    return (
        <div className="absolute bottom-4 left-4 w-96">
            {shouldShowMessages && messages.length > 0 && (
                <div className="bg-black bg-opacity-50 text-white p-2 rounded mb-2 max-h-48 overflow-y-auto">
                    {messages.slice(-15).map((msg, index) => (
                        <div key={index} className="mb-1 text-sm text-white" style={{ textShadow: '1px 1px 2px #000' }}>
                            {msg.text}
                        </div>
                    ))}
                    <div ref={messagesEndRef} />
                </div>
            )}

            {isOpen && (
                <form onSubmit={handleSubmit} className="flex">
                    <input
                        ref={inputRef}
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={handleKeyDown}
                        className="flex-1 bg-black bg-opacity-70 text-white p-2 rounded-l focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Type a message..."
                        maxLength={256}
                    />
                    <button
                        type="submit"
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 rounded-r"
                    >
                        Send
                    </button>
                </form>
            )}
        </div>
    );
};

export default MinecraftChat;
