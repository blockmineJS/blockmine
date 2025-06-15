import { toast } from '@/hooks/use-toast';

const apiCall = async (url, options = {}, successMessage) => {
    try {
        const response = await fetch(url, options);
        if (response.status === 204 || response.headers.get("content-length") === "0") {
            if (successMessage) toast({ title: "Успех!", description: successMessage });
            return true;
        }
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Ошибка сервера');
        if (successMessage) toast({ title: "Успех!", description: successMessage });
        return data;
    } catch (error) {
        toast({ variant: "destructive", title: "Ошибка", description: error.message });
        throw error;
    }
};

export const createTaskSlice = (set, get) => ({
    tasks: [],
    
    fetchTasks: async () => {
        try {
            const tasksData = await apiCall('/api/tasks');
            set({ tasks: tasksData || [] });
        } catch (error) {
            set({ tasks: [] });
        }
    },

    createTask: async (taskData) => {
        const newTask = await apiCall('/api/tasks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(taskData),
        }, "Задача успешно создана.");
        if (newTask) {
            set(state => {
                state.tasks.unshift(newTask);
            });
        }
        return newTask;
    },

    updateTask: async (taskId, dataToUpdate) => {
        const updatedTask = await apiCall(`/api/tasks/${taskId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dataToUpdate),
        }, "Задача успешно обновлена.");
        if (updatedTask) {
            set(state => {
                const taskIndex = state.tasks.findIndex(t => t.id === taskId);
                if (taskIndex !== -1) {
                    state.tasks[taskIndex] = { ...state.tasks[taskIndex], ...updatedTask };
                }
            });
        }
        return updatedTask;
    },

    deleteTask: async (taskId) => {
        await apiCall(`/api/tasks/${taskId}`, { method: 'DELETE' }, "Задача успешно удалена.");
        set(state => {
            state.tasks = state.tasks.filter(t => t.id !== taskId);
        });
    },
});