import React from 'react';
import { Bot } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { ToolCallCard } from './ToolCallCard';

export function ChatMessages({ messages, toolCalls, onFileClick, onViewDiff, messagesEndRef }) {
    return (
        <div className="flex-1 p-4 overflow-y-auto">
            <div className="space-y-4">
                {messages.length === 0 && (
                    <div className="text-center text-muted-foreground py-8">
                        <Bot className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p>Задайте вопрос о вашем плагине</p>
                        <p className="text-sm mt-1">Я помогу с кодом, отладкой и улучшениями</p>
                    </div>
                )}

                {messages.map((msg, idx) => (
                    <div key={idx}>
                        <div
                            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                            <div
                                className={`max-w-[80%] rounded-lg px-4 py-2 ${
                                    msg.role === 'user'
                                        ? 'bg-primary text-primary-foreground'
                                        : 'bg-muted'
                                }`}
                            >
                                {msg.role === 'user' ? (
                                    <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                                ) : (
                                    <div className="prose prose-invert prose-sm max-w-none">
                                        <ReactMarkdown
                                            components={{
                                                code({ node, inline, className, children, ...props }) {
                                                    const match = /language-(\w+)/.exec(className || '');
                                                    return !inline && match ? (
                                                        <SyntaxHighlighter
                                                            style={vscDarkPlus}
                                                            language={match[1]}
                                                            PreTag="div"
                                                            {...props}
                                                        >
                                                            {String(children).replace(/\n$/, '')}
                                                        </SyntaxHighlighter>
                                                    ) : (
                                                        <code className={className} {...props}>
                                                            {children}
                                                        </code>
                                                    );
                                                }
                                            }}
                                        >
                                            {msg.content}
                                        </ReactMarkdown>
                                    </div>
                                )}
                            </div>
                        </div>

                        {msg.role === 'assistant' && idx === messages.length - 1 && toolCalls.length > 0 && (
                            <div className="mt-2 space-y-2 ml-4">
                                {toolCalls.map((tc) => (
                                    <ToolCallCard
                                        key={tc.id}
                                        toolCall={tc}
                                        onFileClick={onFileClick}
                                        onViewDiff={onViewDiff}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>
        </div>
    );
}
