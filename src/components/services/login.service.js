export const signIn = async (signUpData) => {
    try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/user/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(signUpData),
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || 'Failed to sign in');
        }
        return data;
    } catch (error) {
        console.error('Error signing in:', error);
        throw error;
    }
};