import React from 'react';
import * as Icons from 'lucide-react';

const IconComponent = ({ name, ...props }) => {
    const DefaultIcon = Icons.Puzzle;
    if (!name) return <DefaultIcon {...props} />;

    if (name.startsWith('/') || name.startsWith('http')) {
        return <img src={name} alt="plugin icon" {...props} />;
    }
    
    const iconName = name.split('-').map(part => part.charAt(0).toUpperCase() + part.slice(1)).join('');
    const LucideIcon = Icons[iconName] || DefaultIcon;
    
    return <LucideIcon {...props} />;
};

export default IconComponent;