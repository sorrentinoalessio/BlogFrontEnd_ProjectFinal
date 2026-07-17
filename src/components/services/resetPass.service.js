export const resetPassword = async ({ passwordNew, token }) => {
    try {
        const response = await fetch(`http://127.0.0.1:3001/user/new_password/${token}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ passwordNew }),
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

export const verifyResetToken = async (token) => {
    try {
        const response = await fetch(`http://127.0.0.1:3001/user/reset/${token}`);
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || 'Token non valido');
        }
        return data;
    } catch (error) {
        console.error('Error verifying reset token:', error);
        throw error;
    }
};