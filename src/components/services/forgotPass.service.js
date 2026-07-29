export const forgotPassword = async (resetData) => {
    try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/user/reset_password`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(resetData),
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || 'Failed to reset password');
        }
        return data;
    } catch (error) {
        console.error('Error resetting password:', error);
        throw error;
    }
};