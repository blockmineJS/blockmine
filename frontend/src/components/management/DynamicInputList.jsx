import React from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { X, PlusCircle } from 'lucide-react';

export default function DynamicInputList({ value = [], onChange, placeholder = "Добавить элемент..." }) {

    const handleItemChange = (index, newValue) => {
        const updatedItems = [...value];
        updatedItems[index] = newValue;
        onChange(updatedItems);
    };

    const handleAddItem = () => {
        onChange([...value, '']);
    };

    const handleRemoveItem = (index) => {
        const updatedItems = [...value];
        updatedItems.splice(index, 1);
        onChange(updatedItems);
    };

    return (
        <div className="space-y-2">
            {value.map((item, index) => (
                <div key={index} className="flex items-center gap-2">
                    <Input
                        value={item}
                        onChange={(e) => handleItemChange(index, e.target.value)}
                        placeholder={placeholder}
                    />
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveItem(index)}
                        className="text-muted-foreground hover:text-destructive shrink-0"
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </div>
            ))}
            <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full mt-2"
                onClick={handleAddItem}
            >
                <PlusCircle className="mr-2 h-4 w-4" />
                Добавить
            </Button>
        </div>
    );
}
