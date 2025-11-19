import React from 'react';
import {
    File,
    FileCode2,
    FileJson,
    FileType,
    FileImage,
    FileText,
    Folder,
    FolderOpen
} from 'lucide-react';

const getIconColor = (extension) => {
    switch (extension) {
        case 'js':
        case 'jsx':
            return 'text-yellow-400';
        case 'ts':
        case 'tsx':
            return 'text-blue-400';
        case 'css':
        case 'scss':
        case 'less':
            return 'text-blue-300';
        case 'html':
        case 'xml':
            return 'text-orange-400';
        case 'json':
            return 'text-yellow-200';
        case 'md':
        case 'txt':
            return 'text-gray-300';
        case 'png':
        case 'jpg':
        case 'jpeg':
        case 'gif':
        case 'svg':
            return 'text-purple-400';
        default:
            return 'text-muted-foreground';
    }
};

const getFileIcon = (name) => {
    if (!name) return File;

    const extension = name.split('.').pop().toLowerCase();

    switch (extension) {
        case 'js':
        case 'jsx':
        case 'ts':
        case 'tsx':
            return FileCode2;
        case 'css':
        case 'scss':
        case 'less':
        case 'html':
        case 'xml':
            return FileCode2;
        case 'json':
            return FileJson;
        case 'md':
        case 'txt':
            return FileText;
        case 'png':
        case 'jpg':
        case 'jpeg':
        case 'gif':
        case 'svg':
            return FileImage;
        default:
            return File;
    }
};

export const FileIcon = ({ name, isOpen, isFolder, className = "h-4 w-4" }) => {
    if (isFolder) {
        return isOpen ? (
            <FolderOpen className={`${className} text-blue-400`} />
        ) : (
            <Folder className={`${className} text-blue-400`} />
        );
    }

    const IconComponent = getFileIcon(name);
    const extension = name ? name.split('.').pop().toLowerCase() : '';
    const colorClass = getIconColor(extension);

    return <IconComponent className={`${className} ${colorClass}`} />;
};

export default FileIcon;
